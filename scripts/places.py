"""places.geojson: cool places, drinking water and benches from OpenStreetMap.

Cool places are public indoor places (library, culture centre, museum, gallery) whose opening hours
fit the SPEC 5 subset, so "open now" works. The same kinds of places without usable hours, plus city
offices, are candidates for new cool places (panel.py reads them with public_buildings()).
"""
import re

from common import BBOX, ox, write

COOL = {"amenity": ["library", "arts_centre"], "tourism": ["museum", "gallery"]}
OFFICES = {"amenity": ["townhall", "community_centre"], "office": ["government"]}
# Addresses OSM lacks for these places (no addr:street or addr:housenumber), added by hand in OSM's "Street 12" style.
# The EC1 buildings have no separate addresses, so they all get the complex's.
ADDRESS_FIXES = {
    "Planetarium EC1": "Targowa 1/3",
    "Narodowe Centrum Kultury Filmowej EC1": "Targowa 1/3",
    "Centrum Komiksu i Narracji Interaktywnej EC1": "Targowa 1/3",
    "Ulica Żywiołów EC1": "Targowa 1/3",
    "Galeria Re:Medium": "Piotrkowska 113",
    "Galerie Miejskie w Łodzi": "Piotrkowska 113",
    "Galeria Odlot": "Eliasza Chaima Majzela 8",
    "Muzeum dzieci polskich": "Piotrkowska 90",
    "Muzeum Kanału „Dętka”": "Plac Wolności 10",
    "Muzeum Sportu i Turystyki": "Księdza Ignacego Skorupki 21",
}
# Simulated always-open cool places in the centre, so the "open now" filter can be tried at any hour. They are not in OSM,
# and the file is rebuilt from OSM, so they are added here (name, address, lon, lat).
SIMULATED = [
    ("Miejsce testowe 1", "Piotrkowska 12", 19.456, 51.7745),
    ("Miejsce testowe 2", "Piotrkowska 74", 19.4573, 51.769),
    ("Miejsce testowe 3", "Piotrkowska 138", 19.459, 51.762),
    ("Miejsce testowe 4", "Piotrkowska 203", 19.4602, 51.7565),
    ("Miejsce testowe 5", "Zielona 8", 19.4495, 51.771),
    ("Miejsce testowe 6", "Narutowicza 40", 19.465, 51.7712),
    ("Miejsce testowe 7", "Kościuszki 50", 19.4525, 51.764),
    ("Miejsce testowe 8", "Sienkiewicza 60", 19.464, 51.7655),
    ("Miejsce testowe 9", "Traugutta 10", 19.461, 51.768),
    ("Miejsce testowe 10", "Struga 22", 19.452, 51.76),
]
DAY = r"(Mo|Tu|We|Th|Fr|Sa|Su)(-(Mo|Tu|We|Th|Fr|Sa|Su))?"
RULE = re.compile(rf"{DAY}(,{DAY})* \d\d:\d\d-\d\d:\d\d")
OFF = re.compile(rf"{DAY}(,{DAY})* off")


def hours(raw) -> str | None:
    """OSM opening_hours reduced to the subset 'Mo-Fr 10:00-18:00; Sa 10:00-14:00', else None.
    'Xx off' rules are dropped (closed is the default); anything else unknown drops the whole value."""
    if not isinstance(raw, str):
        return None
    rules = [r.strip() for r in raw.split(";") if r.strip() and not OFF.fullmatch(r.strip())]
    return "; ".join(rules) if rules and all(RULE.fullmatch(r) for r in rules) else None


assert hours("Mo-Fr 08:30-19:00; Sa 10:00-18:00") == "Mo-Fr 08:30-19:00; Sa 10:00-18:00"
assert hours("Mo off; Tu-Su 10:00-19:00") == "Tu-Su 10:00-19:00"
assert hours("Mo,We-Th 10:30-18:00; Tu,Fr 08:30-16:00; Sa-Su off") == "Mo,We-Th 10:30-18:00; Tu,Fr 08:30-16:00"
assert hours("Mo-Tu 12:00-19:00, We 12:00-16:00, SH Mo off") is None
assert hours("Mo-Fr 10:00-14:00,15:00-18:00") is None
assert hours(None) is None


def address(row) -> str | None:
    street, number = row.get("addr:street"), row.get("addr:housenumber")
    return f"{street} {number}" if isinstance(street, str) and isinstance(number, str) else None


def fetch(tags: dict):
    """OSM features as points (polygons become their centroid)."""
    gdf = ox.features_from_bbox(BBOX, tags)
    gdf["geometry"] = gdf.geometry.to_crs(2180).centroid.to_crs(4326)
    return gdf


def public_buildings():
    """(cool places, candidates): rows with name, address, hours and a point geometry."""
    gdf = fetch(COOL)
    gdf = gdf[gdf["name"].notna()].copy()
    gdf["hours"] = gdf["opening_hours"].map(hours) if "opening_hours" in gdf else None
    gdf["address"] = gdf.apply(address, axis=1).fillna(gdf["name"].map(ADDRESS_FIXES))
    offices = fetch(OFFICES)
    # Spec 7.2 asks for "urzędy": skip courts, prosecutors, police and similar government offices
    office = offices["amenity"].isna() if "amenity" in offices else True
    offices = offices[offices["name"].notna() & ~(office & ~offices["name"].str.contains("Urz[aą]d", na=False))].copy()
    offices["hours"] = offices["opening_hours"].map(hours) if "opening_hours" in offices else None
    offices["address"] = offices.apply(address, axis=1)
    cool = gdf[gdf["hours"].notna()]
    return cool, [gdf[gdf["hours"].isna()], offices]


def feature(type_: str, name: str, row) -> dict:
    text = lambda v: v if isinstance(v, str) else None  # pandas gives NaN for missing values
    p = row.geometry
    return {
        "type": "Feature",
        "properties": {"type": type_, "name": name, "address": text(row.get("address")), "hours": text(row.get("hours")),
                       "source": "OpenStreetMap", "verified": False},
        "geometry": {"type": "Point", "coordinates": [round(p.x, 6), round(p.y, 6)]},
    }


def main():
    cool, _ = public_buildings()
    features = [feature("cool", row["name"], row) for _, row in cool.iterrows()]
    features += [
        {
            "type": "Feature",
            "properties": {"type": "cool", "name": name, "address": address, "hours": "Mo-Su 00:00-24:00", "source": "dane symulowane", "verified": False},
            "geometry": {"type": "Point", "coordinates": [lon, lat]},
        }
        for name, address, lon, lat in SIMULATED
    ]
    misc = fetch({"amenity": ["drinking_water", "bench"]})
    for _, row in misc.iterrows():
        if row["amenity"] == "drinking_water":
            features.append(feature("water", row.get("name") if isinstance(row.get("name"), str) else "Woda pitna", row))
        else:
            features.append(feature("bench", "Ławka", row))
    write("places.geojson", {"type": "FeatureCollection", "features": features}, accuracy="szacunek")


if __name__ == "__main__":
    main()

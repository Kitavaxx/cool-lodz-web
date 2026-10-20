"""lodz.geojson: Łódź city boundary from OpenStreetMap. Maps stay inside it and dim everything outside."""
import numpy as np
import shapely

from common import ox, write


def main():
    city = ox.geocode_to_gdf("Łódź, Poland").to_crs(2180).geometry.iloc[0]
    city = shapely.simplify(city, 20).buffer(0)  # ~20 m is plenty for a mask
    geo = ox.projection.project_geometry(city, crs=2180, to_latlong=True)[0]
    coords = np.round(shapely.get_coordinates(geo.exterior), 5).tolist()
    print(f"{len(coords)} points")
    write("lodz.geojson", {"type": "FeatureCollection", "features": [
        {"type": "Feature", "properties": {"name": "Łódź"}, "geometry": {"type": "Polygon", "coordinates": [coords]}},
    ]}, accuracy="model")


if __name__ == "__main__":
    main()

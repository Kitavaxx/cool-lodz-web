// Opening hours in the SPEC 5 subset of OSM opening_hours: "Mo-Fr 10:00-18:00; Sa,Su 10:00-14:00"

const codes = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
const polish: Record<string, string> = { Mo: 'pn', Tu: 'wt', We: 'śr', Th: 'czw', Fr: 'pt', Sa: 'sob', Su: 'nd' }

export const polishDays = (hours: string) => hours.replace(/Mo|Tu|We|Th|Fr|Sa|Su/g, (d) => polish[d])

const minutes = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

// day: 0 = Monday … 6 = Sunday, time: minutes since midnight. No hours = never open (SPEC 5).
export function isOpen(hours: string | null | undefined, day: number, time: number): boolean {
  if (!hours) return false
  return hours.split(';').some((rule) => {
    const [days, range] = rule.trim().split(' ')
    if (!range) return false
    const onDay = days.split(',').some((part) => {
      const [a, b = a] = part.split('-').map((d) => codes.indexOf(d))
      return a <= b ? day >= a && day <= b : day >= a || day <= b // ranges like Sa-Mo wrap around
    })
    const [from, to] = range.split('-').map(minutes)
    // ponytail: "18:00-02:00" counts as open until midnight only; no venue in our data opens past it
    return onDay && time >= from && time < (to <= from ? 24 * 60 : to)
  })
}

// Day and time in Łódź, whatever the viewer's timezone (grill Q7)
export function warsawNow(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Warsaw', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date)
  const get = (type: string) => parts.find((p) => p.type === type)!.value
  return { day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(get('weekday')), time: Number(get('hour')) * 60 + Number(get('minute')) }
}

// Runnable check for the "open now" logic: npm run check
import assert from 'node:assert/strict'
import { isOpen, polishDays, rangesOn, warsawNow } from './hours.ts'

const at = (h: number, m = 0) => h * 60 + m
const [Mon, Wed, Sat, Sun] = [0, 2, 5, 6]

// weekday range
assert.equal(isOpen('Mo-Fr 10:00-18:00', Wed, at(12)), true)
assert.equal(isOpen('Mo-Fr 10:00-18:00', Wed, at(18)), false) // closing time is exclusive
assert.equal(isOpen('Mo-Fr 10:00-18:00', Wed, at(9, 59)), false)
// Saturday-only rule next to a weekday rule
assert.equal(isOpen('Mo-Fr 10:00-18:00; Sa 10:00-14:00', Sat, at(13)), true)
assert.equal(isOpen('Mo-Fr 10:00-18:00; Sa 10:00-14:00', Sat, at(15)), false)
// closed day
assert.equal(isOpen('Mo-Fr 10:00-18:00; Sa 10:00-14:00', Sun, at(12)), false)
assert.equal(isOpen('Tu-Su 10:00-19:00', Mon, at(12)), false)
// day lists and closing at midnight
assert.equal(isOpen('Mo,We-Th 10:30-18:00; Tu,Fr 08:30-16:00', Wed, at(17)), true)
assert.equal(isOpen('Fr 18:00-00:00', 4, at(23, 30)), true)
// missing hours are never open
assert.equal(isOpen(null, Wed, at(12)), false)
assert.equal(isOpen('', Wed, at(12)), false)

// ranges per day, for the week strip on /miejsca-chlodu
assert.deepEqual(rangesOn('Mo-Fr 10:00-18:00; Sa 10:00-14:00', Sat), [[at(10), at(14)]])
assert.deepEqual(rangesOn('Mo-Fr 10:00-18:00; Sa 10:00-14:00', Sun), [])
assert.deepEqual(rangesOn('Fr 18:00-00:00', 4), [[at(18), at(24)]])

assert.equal(polishDays('Mo-Fr 10:00-18:00; Sa,Su 10:00-14:00'), 'pn-pt 10:00-18:00; sob,nd 10:00-14:00')
// 12:00 UTC on Wednesday 15.07.2026 is 14:00 in Łódź (CEST)
assert.deepEqual(warsawNow(new Date('2026-07-15T12:00:00Z')), { day: Wed, time: at(14) })

console.log('hours: all checks passed')

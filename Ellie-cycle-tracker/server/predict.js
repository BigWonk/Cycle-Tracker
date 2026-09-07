// server/predict.js
//
// Turns a user's logged flow days into: period-start dates, average cycle
// length, average period length, the current phase, and predictions for
// the next period, ovulation day, and fertile window.
//
// This is a straightforward historical-average model, the same approach
// used by most consumer cycle-tracking apps. It is not a medical device
// and should not be relied on for contraception or fertility decisions —
// the README and UI both say this explicitly.

function parseIsoDate(dateStr) {
  const [year, month, day] = (dateStr || '').split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day));
}

function daysBetween(a, b) {
  const first = parseIsoDate(a);
  const second = parseIsoDate(b);
  if (!first || !second) return 0;
  return Math.round((second.getTime() - first.getTime()) / 86400000);
}

function addDays(dateStr, n) {
  const d = parseIsoDate(dateStr);
  if (!d) return null;
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function hasPeriodFlow(entry) {
  const flow = entry && entry.flow;
  return flow !== null && flow !== undefined && flow !== false && flow !== 'none' && flow !== '';
}

function periodStarts(entries, today = new Date().toISOString().slice(0, 10)) {
  const flowDates = Object.keys(entries)
    .filter(d => hasPeriodFlow(entries[d]) && d <= today)
    .sort();
  const starts = [];
  let prev = null;
  for (const d of flowDates) {
    if (!prev || daysBetween(prev, d) > 1) starts.push(d);
    prev = d;
  }
  return starts;
}

function computeStats(entries, profile, today = new Date().toISOString().slice(0, 10)) {
  const starts = periodStarts(entries, today);

  let cycleLengths = [];
  for (let i = 1; i < starts.length; i++) {
    const gap = daysBetween(starts[i - 1], starts[i]);
    if (gap >= 21 && gap <= 45) cycleLengths.push(gap);
  }
  cycleLengths = cycleLengths.slice(-6); // recent cycles weigh more
  const avgCycle = cycleLengths.length
    ? Math.round(cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length)
    : (profile.avgCycleLength || 28);

  const flowDates = Object.keys(entries)
    .filter(d => hasPeriodFlow(entries[d]) && d <= today)
    .sort();
  let runs = [], cur = 0, prev = null;
  for (const d of flowDates) {
    if (prev && daysBetween(prev, d) === 1) cur++;
    else { if (cur > 0) runs.push(cur); cur = 1; }
    prev = d;
  }
  if (cur > 0) runs.push(cur);
  const avgPeriod = runs.length
    ? Math.round(runs.reduce((a, b) => a + b, 0) / runs.length)
    : (profile.avgPeriodLength || 5);

  const candidateLastStart = starts[starts.length - 1] || profile.lastPeriodStart || null;
  const lastStart = candidateLastStart && candidateLastStart <= today ? candidateLastStart : null;
  const predictedNext = lastStart ? addDays(lastStart, avgCycle) : null;

  let dayInCycle = null, phase = null;
  if (lastStart) {
    const diff = Math.max(0, daysBetween(lastStart, today));
    dayInCycle = ((diff % avgCycle) + avgCycle) % avgCycle + 1;
    if (dayInCycle <= avgPeriod) phase = 'menstrual';
    else if (dayInCycle <= Math.round(avgCycle / 2) - 1) phase = 'follicular';
    else if (dayInCycle <= Math.round(avgCycle / 2) + 1) phase = 'ovulation';
    else phase = 'luteal';
  }

  let ovulationDate = null, fertileStart = null, fertileEnd = null;
  if (predictedNext) {
    ovulationDate = addDays(lastStart, avgCycle - 14);
    fertileStart = addDays(ovulationDate, -5);
    fertileEnd = addDays(ovulationDate, 1);
  }

  return { starts, avgCycle, avgPeriod, lastStart, predictedNext, dayInCycle, phase, ovulationDate, fertileStart, fertileEnd };
}

module.exports = { computeStats, periodStarts, addDays, daysBetween };

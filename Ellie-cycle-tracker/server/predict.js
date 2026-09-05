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

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function periodStarts(entries) {
  const flowDates = Object.keys(entries)
    .filter(d => entries[d] && entries[d].flow)
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
  const starts = periodStarts(entries);

  let cycleLengths = [];
  for (let i = 1; i < starts.length; i++) cycleLengths.push(daysBetween(starts[i - 1], starts[i]));
  cycleLengths = cycleLengths.slice(-6); // recent cycles weigh more
  const avgCycle = cycleLengths.length
    ? Math.round(cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length)
    : (profile.avgCycleLength || 28);

  const flowDates = Object.keys(entries).filter(d => entries[d] && entries[d].flow).sort();
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

  const lastStart = starts[starts.length - 1] || profile.lastPeriodStart || null;
  const predictedNext = lastStart ? addDays(lastStart, avgCycle) : null;

  let dayInCycle = null, phase = null;
  if (lastStart) {
    const diff = daysBetween(lastStart, today);
    dayInCycle = ((diff % avgCycle) + avgCycle) % avgCycle + 1;
    if (dayInCycle <= avgPeriod) phase = 'menstrual';
    else if (dayInCycle <= Math.round(avgCycle / 2) - 1) phase = 'follicular';
    else if (dayInCycle <= Math.round(avgCycle / 2) + 1) phase = 'ovulation';
    else phase = 'luteal';
  }

  let ovulationDate = null, fertileStart = null, fertileEnd = null;
  if (predictedNext) {
    ovulationDate = addDays(predictedNext, -14);
    fertileStart = addDays(ovulationDate, -5);
    fertileEnd = addDays(ovulationDate, 1);
  }

  return { starts, avgCycle, avgPeriod, lastStart, predictedNext, dayInCycle, phase, ovulationDate, fertileStart, fertileEnd };
}

module.exports = { computeStats, periodStarts, addDays, daysBetween };

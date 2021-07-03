import axios from 'axios';
import fs from 'fs';

const BASE = 'https://www.thrustcurve.org/api/v1';
const MAX_RESULTS = 9999;

/**
 * Easy-to-read name for a motor
 */
function motorName(motor) {
  return `${motor.manufacturerAbbrev} ${motor.designation}`;
}

/**
 * Round number to X significant digits
 */
function sig(val, digits = 3) {
  if (val === 0 || !isFinite(val)) return val;

  const isNegative = val < 0;
  if (isNegative) val = -val;
  const man = digits - Math.ceil(Math.log10(val));
  if (man > 0) {
    val = Math.round(val * 10 ** man) / 10 ** man;
  } else {
    val = Math.round(val);
  }

  return isNegative ? -val : val;
}

/**
 * log to stderr (so stdout can redirect to file)
 */
function log(...args) {
  process.stderr.write(args.join(' '));
  process.stderr.write('\n');
}

// Normalize the motor delay values.  These values are all over the map in
// thrustcurve.org, so we play some games to try to make some sense of them here
function normalizeDelays(delays) {
  if (typeof(delays) != 'string') return delays;

  // Remove whitespace
  delays = delays.replace(/\s/g, '');

  // Kosdon J975F has "23/P" delay.  Not really sure what this means, but we
  // map it to "23,P" for now.
  delays = delays.replace(/\//g, ',');

  // Fix cases where hyphen is obviously used instead of comma.  :-p
  // "#-#-#..." -> "#,#,#..."
  if (/\d+-\d+-/.test(delays)) {
    delays = delays.replace(/-/g, ',');
  }

  let vals = new Set();
  for (let v of delays.split(',')) {
    switch (true) {
      case !v:
        continue;

      // Basic value
      case /^\d+$/.test(v):
        vals.add(parseInt(v));
        continue;

      // Convert aerotech letter-delays to ranges
      case v === 'S': v = '0-6'; break;
      case v === 'M': v = '0-10'; break;
      case v === 'L': v = '0-14'; break;
      case v === 'X': v = '0-18'; break;
    }

    if (/^(\d+)-(\d+)$/.test(v)) {
      const {$1: min, $2: max} = RegExp;
      if (max - min > 20) throw Error(`'Unexpectedly large delay range: ${delays}`);
      for (let d = parseInt(min); d <= max; d++) vals.add(d);
    } else {
      vals.add(v);
    }
  }

  vals = [...vals].sort((a, b) => a - b);

  // Tack on an ending value (flushes whatever the last actual value is in our
  // range aggregator, below
  vals.push(Symbol());

  // Build list of delay values, aggregating adjacent values together into a
  // range
  const delayValues = [];
  let min, max;
  for (const i of vals) {
    if (min === undefined) {
      // Do nothing
    } else if (i === max + 1) {
      max = i;
      continue;
    } else if (min === max) {
      delayValues.push(min);
    } else if (min === max - 1) {
      delayValues.push(`${min},${max}`);
    } else {
      delayValues.push(`${min}-${max}`);
    }

    min = max = i;
  }

  return delayValues.join(',');
}

(async function main(lite = false) {
  // Fetch motor data
  const {data: {results : motorResults}} = await axios.get(`${BASE}/search.json?maxResults=${MAX_RESULTS}`);
  log(`Received ${motorResults.length} motors`);

  // Normalize motor data
  const motors = {};

  for (const motor of motorResults) {
    if (typeof(motor.delays) == 'string') {
      const delays = normalizeDelays(motor.delays);
      if (delays != motor.delays) log(`Mapped "${motor.delays}" to "${delays}"`);
      motor.delays = delays;
    }

    // Remove non-essential properties (disabled for the time being)
    if (lite) {
      for (const k of [
        // 'avgThrustN',
        // 'burnTimeS',
        'caseInfo',
        'certOrg',
        'commonName',
        'dataFiles',
        // 'delays',
        // 'designation',
        'diameter',
        // 'impulseClass',
        'infoUrl',
        'length',
        'manufacturer',
        // 'manufacturerAbbrev',
        'maxThrustN',
        // 'motorId',
        'propInfo',
        'propWeightG',
        // 'sparky',
        // 'totImpulseNs',
        'totalWeightG',
        'type',
        'updatedOn',
      ]) {
        delete motor[k];
      }
    }

    // Map of motorId -> motor
    motors[motor.motorId] = {...motor};
  }

  // Fetch thrust samples
  const motorIds = motorResults.map(m => m.motorId);
  const {data: {results : sampleResults}} = await axios.post(`${BASE}/download.json`, {
    motorIds,
    data: 'samples'
  });

  log(`Received ${sampleResults.length} thrust sample sets`);

  // Normalize thrust data
  for (const {motorId, samples, source, format, data} of sampleResults) {
    const motor = motors[motorId];

    const _samples = samples.map(({time, thrust}) => [sig(time, 4), sig(thrust, 4)]);

    // Include [0,0] point if not present
    if (_samples[0][0] !== 0) _samples.unshift([0, 0]);

    // Remember source ('cert' | 'user'), as it's useful in selecting which
    // samples to retain
    _samples.source = source;

    // Decide which sample is "better".  This logic is pretty crude at the
    // moment.  Basically the first "cert"(ification) sample wins, otherwise we
    // use whichever one is last encountered.
    if (motor.samples?.source !== 'cert') {
      motor.samples = _samples;
    }
  }

  const thrustless = Object.values(motors).filter(m => !m.samples);
  if (thrustless.length) {
    const names = thrustless.map(motorName).sort();
    log(`Motors missing thrust data:`);
    names.forEach(name => log('  - ', name));
  }

  process.stdout.write(JSON.stringify(Object.values(motors), null, 2));
  process.stdout.write('\n');
}())
  .catch(err => {
    log(err.message);
    log(err.stack);
    process.exit(1);
  })

import axios from 'axios';
import fs from 'fs';
import util from 'util';
import {parseDelays, unparseDelays} from '../util.js';

const BASE = 'https://www.thrustcurve.org/api/v1';
const MAX_RESULTS = 9999;

const CESARONI_CACHE = '_cesaroni_delays.json';

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

/**
 * Clean up a scraped Cesaroni delay value such that it can be parsed by parseDelays()
 */
function _cleanupDelay(delay) {
  return delay
    .replace(/, adjustable/, '')
    .replace(/s.*/, '') // "seconds"
    .replace(/[^\x20-\x7E]+/g, '-') // Sometimes there's a garbage char instead of "-"
    .replace(/^[\s",]|[\s",]$/g, ''); // Trim whitespace and quotes
}



(async function main(lite = false) {
  // Pull in scraped Cesaroni delays, if available
  let cesaroniDelays;
  try {
    cesaroniDelays = JSON.parse(fs.readFileSync(CACHE_FILE));
  } catch (err) {
    cesaroniDelays = {};
  }

  let [allResults, availableResults] = await Promise.all([
    axios.get(`${BASE}/search.json?maxResults=${MAX_RESULTS}`),
    axios.get(`${BASE}/search.json?availability=available&maxResults=${MAX_RESULTS}`)
  ]);

  allResults = allResults.data.results;
  availableResults = availableResults.data.results;
  log(`Received ${availableResults.length} motors, ${availableResults.length} available motors`);

  // Normalize motor data
  const motors = {};

  for (const motor of allResults) {
    if (motor.manufacturerAbbrev === 'Cesaroni') {
      // Cesaroni designation includes the maximum delay time. "A" suffix motors
      // are adjustable with either the PRO38 DAT or the PRO54 DAT tool.
      let delay = /-(\d+)A$/.test(motor.designation) && RegExp.$1;
      if (delay) {
        const adjustments = motor.diameter <= 38
          ?  [0, 3, 5, 7, 9]                     // Allowed by PRO-38 DAT tool
          :  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; // Allowed by PRO-54 DAT too

        // PRO38 delays appear to have a minimum of 2 seconds.
        // PRO 54 delays
        const times = adjustments
          .map(v => delay - v)
          .filter(d => d > (motor.diameter <= 38 ? 2 : 0));

        const newDelays = unparseDelays({times});

        if (motor.delays !== newDelays) {
          log(`Delay adjustment for ${motor.designation} (${motor.diameter}mm): ${motor.delays} --> ${newDelays}`);
          motor.delays = newDelays;
        }
      }
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

    // Temporarily mark all motors as discontinued (we'll remove this later if the motor is available)
    motor.discontinued = true;

    // Map of motorId -> motor
    motors[motor.motorId] = {...motor};
  }

  // Remove `discontinued` state for available motors
  for (const motor of availableResults) {
    delete motors[motor.motorId]?.discontinued;
  }

  // Fetch thrust samples
  const motorIds = allResults.map(m => m.motorId);
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

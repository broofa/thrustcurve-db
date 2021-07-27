import axios from 'axios';
import fs from 'fs';
import {parseDelays, unparseDelays} from '../util.js';
import { fileURLToPath } from 'url';

const BASE = 'https://www.thrustcurve.org/api/v1';
const MAX_RESULTS = 9999;

const CESARONI_CACHE = new URL('./_cesaroni_delays.json', import.meta.url);

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

(async function main(lite = false) {
  // Pull in scraped Cesaroni delays, if available
  let cesaroniDelays;
  try {
    cesaroniDelays = JSON.parse(fs.readFileSync(CESARONI_CACHE));
  } catch (err) {
console.error(err);
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
    let newDelays = motor.delays;
    if (motor.manufacturerAbbrev === 'Cesaroni') {
      // Cesaroni designation includes the maximum delay time. "A" suffix motors
      // are adjustable with either the PRO38 DAT or the PRO54 DAT tool.  "P"
      // motors are plugged.
      if (/-P$/.test(motor.designation)) {
        // Plugged motors
        newDelays = "P";
      } else if (/-(\d+)A$/.test(motor.designation)) {
        // Adjustable delay motors
        let delay = parseInt(RegExp.$1);

        // Default to 2 sec minimum
        let minDelay = 2;

        // If we have scraped data from pro38.com, use that to determine the
        // minimum (tested) delay
        let scrapedDelays = cesaroniDelays[motor.designation];
        if (scrapedDelays) {
          scrapedDelays = scrapedDelays
            .replace(/, adjustable/, '')
            .replace(/s.*/, '') // "seconds"
            .replace(/[^\x20-\x7E]+/g, '-') // "-" is garbled on some values
            .replace(/\./g, ',') // 108G68-13A has '.'s instead of ','s
            .replace(/\bto\b/g, '-') // 502I120-15A has "to" instead of "-"
            .replace(/"/g, ''); // Trim whitespace and quotes
          const parsed = parseDelays(scrapedDelays);
          minDelay = parsed.times[0];
        }

        const adjustments = motor.diameter <= 38
          ?  [0, 3, 5, 7, 9]                     // Allowed by PRO-38 DAT tool
          :  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; // Allowed by PRO-54 DAT too

        const times = adjustments
          .map(v => delay - v)
          .filter(d => d >= minDelay);

        newDelays = unparseDelays({times});
if (scrapedDelays) log('XXXXX', delay, 'X', scrapedDelays, newDelays ?? 'N/A');
      } else if (/-(\d+)$/.test(motor.designation)) {
        // Fixed delay motors (just the 1526K160-6 at this time)
        newDelays = RegExp.$1;
      }

      if (motor.delays !== newDelays) {
        log(`Delay adjustment for ${motor.designation} (${motor.diameter}mm): ${motor.delays} --> ${newDelays}`);
        motor.delays = newDelays;
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

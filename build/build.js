#!/usr/bin/env node
import axios from "axios";

const BASE = "https://www.thrustcurve.org/api/v1";
const MAX_RESULTS = 9999;

/**
 * Replacer for sorting keys alphabetically
 */
function alphabetize(k, v) {
  if (v.constructor === Object) {
    return Object.fromEntries(
      Object.entries(v).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    );
  }

  return v;
}
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
  process.stderr.write(args.join(" "));
  process.stderr.write("\n");
}

(async function main(lite = false) {
  let [allResults, availableResults] = await Promise.all([
    axios.get(`${BASE}/search.json?maxResults=${MAX_RESULTS}`),
    axios.get(
      `${BASE}/search.json?availability=available&maxResults=${MAX_RESULTS}`
    ),
  ]);

  allResults = allResults.data.results;
  availableResults = availableResults.data.results;
  log(
    `Received ${availableResults.length} motors, ${availableResults.length} available motors`
  );

  // Normalize motor data
  const motors = {};

  for (const motor of allResults) {
    // Remove non-essential properties (disabled for the time being)
    if (lite) {
      for (const k of [
        // 'availability',
        // 'avgThrustN',
        // 'burnTimeS',
        "caseInfo",
        "certOrg",
        "commonName",
        "dataFiles",
        // 'delays',
        // 'designation',
        "diameter",
        // 'impulseClass',
        "infoUrl",
        "length",
        "manufacturer",
        // 'manufacturerAbbrev',
        "maxThrustN",
        // 'motorId',
        "propInfo",
        "propWeightG",
        // 'sparky',
        // 'totImpulseNs',
        "totalWeightG",
        "type",
        "updatedOn",
      ]) {
        delete motor[k];
      }
    }

    // Map of motorId -> motor
    motors[motor.motorId] = { ...motor };
  }

  // Fetch thrust samples
  const motorIds = allResults.map(m => m.motorId);
  const {
    data: { results: sampleResults },
  } = await axios.post(`${BASE}/download.json`, {
    motorIds,
    data: "samples",
  });

  log(`Received ${sampleResults.length} thrust sample sets`);

  // Normalize thrust data
  for (const { motorId, samples, source, format, data } of sampleResults) {
    const motor = motors[motorId];

    const _samples = samples.map(({ time, thrust }) => [
      sig(time, 4),
      sig(thrust, 4),
    ]);

    // Include [0,0] point if not present
    if (_samples[0][0] !== 0) _samples.unshift([0, 0]);

    // Remember source ('cert' | 'user'), as it's useful in selecting which
    // samples to retain
    _samples.source = source;

    // Decide which sample is "better".  This logic is pretty crude at the
    // moment.  Basically the first "cert"(ification) sample wins, otherwise we
    // use whichever one is last encountered.
    if (motor.samples?.source !== "cert") {
      motor.samples = _samples;
    }
  }

  const thrustless = Object.values(motors).filter(m => !m.samples);
  if (thrustless.length) {
    const names = thrustless.map(motorName).sort();
    log(`Motors missing thrust data:`);
    names.forEach(name => log("  - ", name));
  }

  const sortedMotors = Object.values(motors).sort((a, b) =>
    a.motorId < b.motorId ? -1 : a.motorId > b.motorId ? 1 : 0
  );

  process.stdout.write(JSON.stringify(sortedMotors, alphabetize, 2));
  process.stdout.write("\n");
})().catch(err => {
  log(err.message);
  log(err.stack);
  process.exit(1);
});

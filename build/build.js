#!/usr/bin/env node
import axios from "axios";

const BASE = "https://www.thrustcurve.org/api/v1";
const MAX_RESULTS = 9999;

/**
 * Replacer for sorting keys alphabetically
 */
function motorReducer(k, v) {
  if (v.constructor === Object) {
    // Object keys get sorted alphabetically
    return Object.fromEntries(
      Object.entries(v).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    );
  } else if (typeof(v) === 'number') {
    // Numbers get rounded to 4 significant digits
    return parseFloat(v.toPrecision(4));
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
  let allMotors = (await axios.get(`${BASE}/search.json?maxResults=${MAX_RESULTS}`)).data.results;

  // Normalize motor data
  const motors = allMotors.reduce(
    (map, motor) => map.set(motor.motorId, { ...motor }),
    new Map()
  );

  // Fetch thrust samples
  const motorIds = allMotors.map(m => m.motorId);
  const {
    data: { results: sampleResults },
  } = await axios.post(`${BASE}/download.json`, {
    motorIds,
    data: "samples",
  });

  log(`Received ${sampleResults.length} thrust sample sets`);

  // Normalize thrust data
  for (const { motorId, samples, source, format, data } of sampleResults) {
    const motor = motors.get(motorId);

    const _samples = samples.map(({ time, thrust }) => [
      sig(time, 4),
      sig(thrust, 4),
    ]);


    // Thrust must be zero at t=0
    if (_samples[0][0] === 0 && _samples[0][1] !== 0) {
      log(`${motorId} has non-zero thrust at t=0 (patching)`);
      _samples[0][0] = 0.0001;
    }

    // Include [0,0] point if first point is not at t=0
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

  const thrustless = [...motors.values()].filter(m => !m.samples);
  if (thrustless.length) {
    const names = thrustless.map(motorName).sort();
    log(`Motors missing thrust data:`);
    names.forEach(name => log("  - ", name));
  }

  const sortedMotors = [...motors.values()].sort((a, b) =>
    a.motorId < b.motorId ? -1 : a.motorId > b.motorId ? 1 : 0
  );

  process.stdout.write(JSON.stringify(sortedMotors, motorReducer, 2));
  process.stdout.write("\n");
})().catch(err => {
  log(err.message);
  log(err.stack);
  process.exit(1);
});

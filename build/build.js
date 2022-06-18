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
  } else if (typeof (v) === 'number') {
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
  for (const sampleResult of sampleResults) {
    const motor = motors.get(sampleResult.motorId);

    const samples = sampleResult.samples.map(({ time, thrust }) => [time, thrust]);

    let ignitionTime = 0;

    // Clean up pre-ignition sample data
    while (samples.length) {
      // Zero out insignificant thrust samples at start (thrust < 0.1% average thrust)
      if (samples[0][1] < motor.avgThrustN * 0.001) {
        samples[0][1] = 0;
      }

      // Stop at first significant sample;
      if (samples[0][1] > 0) break;

      // Ignition starts at the last non-significant sample
      ignitionTime = samples[0][0];

      // Drop sample
      samples.shift();
    }

    const sampleUrl = `https://thrustcurve.org${sampleResult.infoUrl} (${sampleResult.source})`;

    // 'Need at least two samples for a meaningful curve... right???
    if (samples.length < 2) {
      log(sampleUrl, ': Not enough valid samples(?)');
      continue;
    }

    if (samples[0][0] === 0 && samples[0][1] !== 0) {
      log(sampleUrl, ': Non-zero thrust at T = 0');
      ignitionTime = -0.001; // shift samples ever-so-slightly to the right
    } else if (ignitionTime !== 0) {
      log(sampleUrl, ': Ignition at T > 0');
    }

    // Adjust time of first sample to match ignition
    if (ignitionTime !== 0) {
      for (const sample of samples) {
        sample[0] -= ignitionTime;
      }
    }

    // Put [0, 0] point back
    samples.unshift([0, 0]);

    // Remember source ('cert' | 'user'), as it's useful in selecting which
    // samples to retain
    samples.source = sampleResult.source;

    // Decide which sample is "better".  This logic is pretty crude at the
    // moment.  Basically the first "cert"(ification) sample wins, otherwise we
    // use whichever one is last encountered.
    if (motor.samples?.source !== "cert") {
      motor.samples = samples;
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

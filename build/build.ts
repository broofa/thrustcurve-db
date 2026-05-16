#!/usr/bin/env node
/// <reference types="node" />

import axios from 'axios';
import stringify from './compactStringify.ts';

type TCSample = [number, number];

type TCSamples = TCSample[] & {
  source?: string;
};

type TCMotor = {
  motorId: string;
  avgThrustN: number;
  manufacturerAbbrev: string;
  designation: string;
  commonName: string;
  samples?: TCSamples;
} & Record<string, unknown>;

type DownloadSampleResult = {
  motorId: string;
  infoUrl: string;
  source: string;
  samples: Array<{
    time: number;
    thrust: number;
  }>;
};

const BASE = 'https://www.thrustcurve.org/api/v1';
const MAX_RESULTS = 9999;

/**
 * Replacer for sorting keys alphabetically
 */
function motorReducer(_k: string, v: unknown): unknown {
  if (v === false) {
    // Remove `false` values
    return undefined;
  } else if (v && typeof v === 'object' && v.constructor === Object) {
    // Object keys get sorted alphabetically
    return Object.fromEntries(
      Object.entries(v).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    );
  } else if (typeof v === 'number') {
    // Numbers get rounded to 4 significant digits
    return parseFloat(v.toPrecision(4));
  }

  return v;
}
/**
 * Easy-to-read name for a motor
 */
function motorName(motor: TCMotor): string {
  return `${motor.manufacturerAbbrev} ${motor.designation}`;
}

/**
 * log to stderr (so stdout can redirect to file)
 */
function log(...args: unknown[]): void {
  process.stderr.write(args.join(' '));
  process.stderr.write('\n');
}

(async function main(_lite = false) {
  const allMotors = (
    await axios.get<{ results: TCMotor[] }>(
      `${BASE}/search.json?maxResults=${MAX_RESULTS}`
    )
  ).data.results;

  // Normalize motor data
  const motors = allMotors.reduce(
    (map, motor) => map.set(motor.motorId, { ...motor }),
    new Map<string, TCMotor>()
  );

  // Fetch thrust samples
  const motorIds = allMotors.map(m => m.motorId);
  const {
    data: { results: sampleResults },
  } = await axios.post<{ results: DownloadSampleResult[] }>(
    `${BASE}/download.json`,
    {
      motorIds,
      data: 'samples',
    }
  );

  log(`Received ${sampleResults.length} thrust sample sets`);

  // Normalize thrust data
  for (const sampleResult of sampleResults) {
    const motor = motors.get(sampleResult.motorId);
    if (!motor) continue;

    const samples = sampleResult.samples.map(({ time, thrust }) => [
      time,
      thrust,
    ]) as TCSamples;

    let ignitionTime = 0;

    // Clean up pre-ignition sample data
    const MIN_THRUST = motor.avgThrustN * 0.001;
    while (samples[0] !== undefined) {
      // Zero out insignificant thrust samples at start (thrust < 0.1% average thrust)
      if (samples[0][1] < MIN_THRUST) {
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
    const firstSample = samples[0];
    if (samples.length < 2 || !firstSample) {
      log(sampleUrl, ': Not enough valid samples(?)');
      continue;
    }

    if (firstSample[0] === 0 && firstSample[1] !== 0) {
      // Non-zero thrust at T=0, so we need to shift the samples to start at T=0
      ignitionTime = -0.001; // shift samples ever-so-slightly to the right

      // ... But we don't complain unless the thrust is significant
      if (firstSample[1] > 4 * MIN_THRUST) {
        log(sampleUrl, ': Non-zero thrust at T = 0');
      }
    } else if (ignitionTime !== 0) {
      log(
        sampleUrl,
        `: Ignition at T=${parseFloat(ignitionTime.toPrecision(4))}`
      );
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
    if (motor.samples?.source !== 'cert') {
      motor.samples = samples;
    }
  }

  // Check for motors with names & designations that don't match
  const mismatchedNames = [...motors.values()].filter((m: TCMotor) => {
    return !m.designation
      ?.toLowerCase()
      .replace(/\W/g, '')
      .includes(m.commonName.replace(/\W/g, '').toLowerCase());
  });
  if (mismatchedNames.length) {
    log(`Mismatched commonName <-> designation:`);
    mismatchedNames.forEach(motor =>
      log(
        `${motor.manufacturerAbbrev} "${motor.commonName}".vs. "${motor.designation}"`
      )
    );
  }

  const thrustless = [...motors.values()].filter((m: TCMotor) => !m.samples);
  if (thrustless.length) {
    const names = thrustless.map(motorName).sort();
    log(`Motors missing thrust data:`);
    names.forEach(name => log('  - ', name));
  }

  const sortedMotors = [...motors.values()].sort((a, b) =>
    a.motorId < b.motorId ? -1 : a.motorId > b.motorId ? 1 : 0
  );

  process.stdout.write(stringify(sortedMotors, { replacer: motorReducer }));
  process.stdout.write('\n');
})().catch((err: unknown) => {
  if (err instanceof Error) {
    log(err.message);
    log(err.stack);
  } else {
    log(String(err));
  }
  process.exit(1);
});

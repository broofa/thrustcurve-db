/**
 * Parse a thrustcurve `delays` value to determine all possible motor delay
 * configurations.  This is a "loose" parser (will accept some atypical values),
 * but delay strings are generally expected to be formatted as follows:
 *
 * - Delay strings are comma-separated list of values and/or ranges.
 * - Values are non-zero integers, or an Aerotech letter designation of "S",
 *   "M", "L", or "X"
 * - Ranges are the numeric min and max value (inclusive), separated by a dash("-")
 *
 * Examples:
 *
 *     "4,6,9" = 4, 6, or 9 second delays
 *      "5-13" = all delays from 5 to 13 seconds (inclusive)
 * "5-9,11-14" = all delays from 5 to 14 seconds, except 10
 *
 * @param {String} delays
 * @return {Object} with the following properties:
 * - {Number[]} times (seconds)
 * - {Boolean} plugged true if motor can be plugged
 */
export function parseDelays(delays) {
  if (typeof(delays) != 'string') throw TypeError('`delays` must be a string');

  // Remove whitespace
  delays = delays.replace(/\s/g, '');

  // Kosdon J975F has "23/P" delay.  Not really sure what this means, but we
  // map it to "23,P" for now.
  delays = delays.replace(/\//g, ',');

  // Convert hyphens to commas where it makes sense to do so...
  // "#-#-#..." -> "#,#,#..."
  if (/\d+-\d+-/.test(delays)) {
    delays = delays.replace(/-/g, ',');
  }

  // For each item in comma-separated list ...
  let times = new Set();
  let plugged = false;
  for (let v of delays.split(',')) {
    switch (true) {
      // Ignore empty string
      case !v:
        continue;

      // Single numeric value
      case /^\d+$/.test(v):
        times.add(parseInt(v));
        continue;

      // Aerotech letter-delays.  The Aerotech delay drill tools can remove up
      // to 8 seconds of delay in 2-second increments. There are recommended
      // minimum delay times for the tools, however.  Aerotech says to not set
      // delays of less than 6 seconds with the DMS tool, while Sirius
      // Rocketery says no less than 4 seconds for the RMS tool.  We don't
      // have access to the motor case info here to determine which tool is
      // involved, but 207 of the 211 AeroTech motors in the TC db are RMS
      // motors at the time I wrote this, so I'm enforcing a 4 second minimum
      // here.
      case v === 'S': [4, 6].forEach(times.add, times); continue;
      case v === 'M': [4, 6, 8, 10].forEach(times.add, times); continue;
      case v === 'L': [6, 8, 10, 12, 14].forEach(times.add, times); continue;
      case v === 'X': [10, 12, 14, 16, 18].forEach(times.add, times); continue;
    }

    if (/^(\d+)-(\d+)$/.test(v)) {
      let min = parseInt(RegExp.$1);
      let max = parseInt(RegExp.$2);
      if (min > max) [min, max] = [max, min];

      if (max - min > 20) throw Error(`'Unexpectedly large delay range: ${delays}`);
      for (let d = min; d <= max; d++) times.add(d);
    } else if (v == 'P') {
      plugged = true;
    } else {
      throw Error(`Unrecognized delay value: "${v}"`);
    }
  }

  times = [...times].sort((a, b) => a - b);

  return {times, plugged};
}

/**
 * Convert a `delays` structure returned from parseDelays() into a delays
 * string.
 */
export function unparseDelays(parsed) {
  const times = [...parsed.times].sort((a, b) => a - b);

  // Tack on an ending value (to flush last value in range aggregator loop,
  // below)
  times.push(Symbol());

  // Build list of delay values, aggregating adjacent values together into a
  // range
  const vals = [];
  let min, max;
  for (const i of times) {
    if (min === undefined) {
      // Do nothing
    } else if (i === max + 1) {
      max = i;
      continue;
    } else if (min === max) {
      vals.push(min);
    } else if (min === max - 1) {
      vals.push(`${min},${max}`);
    } else {
      vals.push(`${min}-${max}`);
    }

    min = max = i;
  }

  if (parsed.plugged) vals.push('P');

  return vals.join(',');
}

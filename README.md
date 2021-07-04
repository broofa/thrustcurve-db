# thrustcurve-db

ThrustCurve.org model rocket motor data as a static data structure (plus misc.
utility functions).

This module is a rebundling of the rocket motor data available on John Coker's
[thrustcurve.org](https://thrustcurve.org) website ("TC").  The dataset includes data for all motors in the [ThrustCurve API](https://www.thrustcurve.org/info/api.html) ("search" endpoint), and is a field-by-field translation of what is found in the "search" endpoint, with the following changes:
* Motor "availability" is exposed as the `discontinued` field (see https://github.com/JohnCoker/thrustcurve3/issues/35)
* Where available, thrust curve data (from the 'download' endpoint) is included as a `samples` array.  These are normalized to always have `[0, 0]` as the first data point.  In cases where a motor has more than one thrust sample file the first "cert"(ified) file found is used, otherwise the samples are from whichever file the API returned first.  (This typically isn't an issue since most thrust curves are very similar, but there are some cases where they differ significantly).

**License & Support**

* Please read and understand [the ThrustCurve.org license](https://www.thrustcurve.org/info/contribute.html#license)
* This is a *snapshot* of the TC data.  It may be out of date.  File an issue here if you think it needs to be updated.
* Issues with how motor data is translated into JSON should be filed here.
* Issues with incorrect motor data should be directed to the TC site.

## Installation

You know the drill ...

```
npm i thrustcurve-db
```

## Usage

```js
import MOTORS, {parseDelays, unparseDelays} from 'thrustcurve-db';

// `MOTORS` is a Motor[] array.

for (const motor of MOTORS) {
  // See `thrustcurve-db.d.ts` for Motor structure details.
  console.log(motor); // Spew data for ~1,100 motors to console
}

// parseDelays() parses a motor `delays` value to determine the
// delay options. The returned Object has the following properties:
//
//    times: Number[] array of possible delay times (seconds)
//  plugged: true if motor has a "Plugged" configuration
//
// Aerotech delays (S, M, L, X) are transformed as follows:
// S -> 0-6
// M -> 0-10
// L -> 0-14
// X -> 0-18
//
// Note: `times` are guaranteed to be unique and in ascending order.
// E.g.  `parseDelays('L, S')` and `parseDelays('1, 5, M, L')` will
// produce the same result.

parseDelays('S, 16, P'); // -> {
                         //   times: [0,1,2,3,4,5,6,16],
                         //   plugged: true
                         // }

// unparseDelays(parsed) is the inverse operation of parseDelays() (sort of).

unparseDelays({
  times: [0,1,2,3,4,5,6,16],
  plugged: true
}); // -> "0-6,16,P"
```

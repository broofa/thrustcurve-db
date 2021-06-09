# thrustcurve-db

ThrustCurve.org model rocket motor and thrust curve data as a single JSON file.

This module is a thin-and-naive adaptation of the data available on John Coker's
exceptional [thrustcurve.org](https://thrustcurve.org) website ("TC").  Specifically,
it scrapes the [ThrustCurve API](https://www.thrustcurve.org/info/api.html),
does a small amount of data normalization, and generates the data structure
presented here.  That's it.

**What This Means**

* Read and understand [how the TC site licenses motor
data](https://www.thrustcurve.org/info/contribute.html#license)
* This is a *snapshot* of the TC data.  It may be out of date.  File an issue
here if you think it needs to be updated.
* Issues with how motor data is translated into JSON should be filed as an issue here.
* Issues with incorrect motor data should be directed to the TC site.

## Installation

You know the drill ...

```
npm i thrustcurve-db
```

## Usage

```
import thrustcurve from 'thrustcurve-db';

// `thrustcurve` is a Motor[] array. See `thrustcurve-db.d.ts` for the structure of Motor objects
for (const motor of thrustcurve) {
  console.log(motor); // Spew data for ~1,100 motors to console
}
```

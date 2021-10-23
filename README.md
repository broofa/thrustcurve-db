# thrustcurve-db

ThrustCurve.org model rocket motor data as a static data structure (plus misc.
utility functions).

This module is a rebundling of the rocket motor data available on John Coker's
[thrustcurve.org](https://thrustcurve.org) website ("TC").  The dataset includes data for all motors in the [ThrustCurve API](https://www.thrustcurve.org/info/api.html) ("search" endpoint), and is a field-by-field translation of what is found in the "search" endpoint, with the following changes:
* Motor "availability" is exposed as the `discontinued` field (see https://github.com/JohnCoker/thrustcurve3/issues/35)
* Where available, thrust curve data (from the "download" endpoint) is included as a `samples` array.  These are normalized to always have `[0, 0]` as the first data point.  In cases where more than one sample file is available for a motor, the first "cert"(ified) file found is used.  Otherwise the samples are from whichever file the API return first.

**License & Support**

* Please read and understand [the ThrustCurve.org license](https://www.thrustcurve.org/info/contribute.html#license)
* This is a *snapshot* of the TC data.  It may be out of date.  File an issue here if you think it needs to be updated.
* Issues with how motor data is translated into JSON should be filed here.
* Issues with incorrect motor data should be directed to the TC site.

## Installation

### NPM

```
npm i thrustcurve-db
```

### Yarn
```
yarn add thrustcurve-db
```

## Usage

### ES Modules

```js
import MOTORS from 'thrustcurve-db';
```

### CommonJS
```js
const MOTORS = require('thrustcurve-db');
```

### CommonJS w/ `import()` (NodeJS)

Note: At present this requires you run `node` with the  `--experimental-json-modules` flag

```js
const MOTORS = await import('thrustcurve-db');
```

## Example

After importing (above)...

```js
// Find all J motors currently in production
MOTORS.filter(m => m.availability === 'regular' && m.impulseClass === 'J');
```

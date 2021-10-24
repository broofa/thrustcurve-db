# thrustcurve-db

ThrustCurve.org model rocket motor data as a static data structure (plus misc.
utility functions).

This module is a rebundling of the model rocket motor data found at John Coker's
[thrustcurve.org](https://thrustcurve.org) website ("TC").  It is available here
in JSON format, or as an ESM or CommonJS module.

The format of this data is identical to that of the TC [/api/v1/search response](https://github.com/JohnCoker/thrustcurve3/blob/8bd8571fe0791fb9a68a6a96eb36c276d58c339b/config/api_v1.yml#L428-L526), with one additional field (where available):

* `samples`: `Array[[number, number]]` of thrust`samples`. This is the `samples` data from the TC "/api/vi/download" endpoint normalized to always have `[0, 0]` as the first data point.  in cases where more than one sample file is available for a motor, the first "cert"(ified) data file is used.  Otherwise it will be whichever data file the API returns first.

See also, the included [TypeScript definition`](./thrustcurve.d.ts).


## Installation

```
npm i thrustcurve-db
```

... or with `yarn`:
```
yarn add thrustcurve-db
```

## Usage

ES Modules

```js
import MOTORS from 'thrustcurve-db';
```

... or for CommonJS:
```js
const MOTORS = require('thrustcurve-db');
```

... or for CommonJS w/ `import()` (NodeJS):

Note: At present this requires you run `node` with the  `--experimental-json-modules` flag

```js
const MOTORS = await import('thrustcurve-db');
```

... or to fetch from jsDelvr CDN:

```js
const MOTORS = await fetch('https://cdn.jsdelivr.net/npm/thrustcurve-db@latest/thrustcurve-db.json')
  .then(res => res.json());
```

## Example

After importing (above)...

```js
// Find all J motors currently in production
MOTORS.filter(m => m.availability === 'regular' && m.impulseClass === 'J');
```

### Issues & Contributions

The data provided here is sourced from thrustcurve.org.  Omissions and errors in
rocket data should be directed there.  Any systematic problems or suggestions
for how the data here is presented may be [reported
here](https://github.com/broofa/thrustcurve-db/issues).


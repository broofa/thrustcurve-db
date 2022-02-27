# thrustcurve-db

ThrustCurve.org model rocket motor data as a single JSON file.

This module is a rebundling of the model rocket motor data found at John Coker's [thrustcurve.org](https://thrustcurve.org) website ("TC"). It is available here in JSON format, or as an ESM or CommonJS module.

Data is pulled from the TC [/api/v1/search response](https://github.com/JohnCoker/thrustcurve3/blob/8bd8571fe0791fb9a68a6a96eb36c276d58c339b/config/api_v1.yml#L428-L526) API.  For brevity, not all fields are included in the dataset here, however they can be added if requested. (Just file an issue).

There is one additional field, `samples`, which is the actual thrust data as provided by the TC "/api/vi/download" endpoint. This is normalized to always have `[0, 0]` as the first data point.  In cases where more than one sample file is available for a motor, the first "cert"(ified) data file is used. Otherwise it will be whichever data file the API returns first.

See also, the included [TypeScript definition](./thrustcurve.d.ts).

## Installation

```
npm i thrustcurve-db
yarn add thrustcurve-db
```

## Usage

### Import with ESM or CommonJS:

```js
import MOTORS from "thrustcurve-db"; // ESM
const MOTORS = require("thrustcurve-db"); // CommonJS
```

Note: At present this requires you run `node` with the `--experimental-json-modules` flag

### Fetch from JSDelivr CDN:

```js
const MOTORS = await fetch(
  "https://cdn.jsdelivr.net/npm/thrustcurve-db@latest/thrustcurve-db.json"
).then(res => res.json());
```

## Example

```js
// Find all J motors currently in production
MOTORS.filter(m => m.availability === "regular" && m.impulseClass === "J");
```

## Issues & Contributions

The data provided here is sourced from thrustcurve.org. Omissions and errors in rocket data should be directed there. Any systematic problems or suggestions for how the data here is presented may be [reported
here](https://github.com/broofa/thrustcurve-db/issues).

# thrustcurve-db

This module is a rebundling of the model rocket motor data available on John Coker's excellent [thrustcurve.org](https://thrustcurve.org) website ("TC") as a stand-alone ES module and/or JSON file.

The data shape mirrors TC's [`SearchResponse#results` structure](https://app.swaggerhub.com/apis/JCSW7/thrust-curve_org_api/1.0.3#/SearchResponse), with the following alterations. (The canonical form is in [the TypeScript definitions](https://github.com/broofa/thrustcurve-db/blob/main/thrustcurve-db.d.ts)).

- All `number`s are rounded to a precision of 4 digits.
- Includes a `samples` field that, when present, provides motor thrust data from the TC `/api/v1/download` endpoint, normalized so the first data point starts at `[0, 0]`

**Changes to data on the thrustcurve.org website are automatically synched to this project (weekly)**

## Installation

```
npm i thrustcurve-db
```

## Usage

```js
import TC_MOTORS from 'thrustcurve-db';
```

## Example

```js
// Find all J motors currently in production
TC_MOTORS.filter((m) => m.availability === 'regular' && m.impulseClass === 'J');
```

## Issues & Contributions

The data provided here is sourced from thrustcurve.org. Omissions and errors in rocket data should be directed there. Any systematic problems or suggestions for how the data here is presented may be [reported
here](https://github.com/broofa/thrustcurve-db/issues).

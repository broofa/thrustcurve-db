import MOTORS, {parseDelays, unparseDelays} from '../index.js';
import assert from 'assert';

function motorName(motor) {
  return `${motor.manufacturerAbbrev} ${motor.commonName}`;
}

for (const motor of MOTORS) {
  if (motor.delays) {
    assert.doesNotThrow(() => parseDelays(motor.delays), motorName(motor));
  }
}

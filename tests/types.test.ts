import test from 'node:test'
import assert from 'node:assert/strict'

import { advanceDifficulty, clampDifficulty } from '../src/types.js'

test('advanceDifficulty caps at five', () => {
  assert.equal(advanceDifficulty(1), 2)
  assert.equal(advanceDifficulty(4), 5)
  assert.equal(advanceDifficulty(5), 5)
})

test('clampDifficulty keeps range bounded', () => {
  assert.equal(clampDifficulty(0), 1)
  assert.equal(clampDifficulty(3.4), 3)
  assert.equal(clampDifficulty(9), 5)
})

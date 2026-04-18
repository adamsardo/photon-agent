import test from 'node:test'
import assert from 'node:assert/strict'

import { formatHelpText, parseCommand } from '../src/commands.js'

test('parses /new with explicit goal and stakes', () => {
  const command = parseCommand('/new boss | ask for a raise | leave with a number | worried about timing')
  assert.deepEqual(command, {
    type: 'new',
    person: 'boss',
    situation: 'ask for a raise',
    goal: 'leave with a number',
    stakes: 'worried about timing',
  })
})

test('defaults /new goal when omitted', () => {
  const command = parseCommand('/new landlord | ask for one more week')
  assert.deepEqual(command, {
    type: 'new',
    person: 'landlord',
    situation: 'ask for one more week',
    goal: 'leave with clarity and a concrete next step',
    stakes: undefined,
  })
})

test('returns null for non-command text', () => {
  assert.equal(parseCommand('hello there'), null)
})

test('parses conversational aliases without slashes', () => {
  assert.deepEqual(parseCommand('help'), { type: 'help' })
  assert.deepEqual(parseCommand('setup'), { type: 'setup' })
  assert.deepEqual(parseCommand('status'), { type: 'status' })
  assert.deepEqual(parseCommand('reset'), { type: 'reset' })
  assert.deepEqual(parseCommand('debrief'), { type: 'done' })
  assert.deepEqual(parseCommand('harder'), { type: 'harder' })
  assert.deepEqual(parseCommand('ready'), { type: 'ready' })
})

test('help text references primary commands', () => {
  const help = formatHelpText()
  assert.match(help, /Just text the situation/)
  assert.match(help, /debrief/)
  assert.match(help, /harder/)
  assert.match(help, /ready/)
})

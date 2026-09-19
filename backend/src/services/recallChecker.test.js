import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkRecall } from './recallChecker.js';

test('missing batch number returns not_checked', () => assert.equal(checkRecall(null).status, 'not_checked'));
test('fixture recalled batch returns warning', () => assert.equal(checkRecall('DEMO-RECALL-001', 'GN-DRINK-0002').status, 'warning'));
test('unknown batch returns not_checked, not a safety claim', () => assert.equal(checkRecall('NOT-LISTED', 'GN-FOOD-0001').status, 'not_checked'));

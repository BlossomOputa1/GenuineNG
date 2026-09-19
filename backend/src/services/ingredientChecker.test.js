import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkIngredients } from './ingredientChecker.js';

test('missing ingredients returns not_checked', () => assert.equal(checkIngredients(null).status, 'not_checked'));
test('empty ingredients array returns not_checked', () => assert.equal(checkIngredients([]).status, 'not_checked'));
test('clean ingredient list returns match', () => assert.equal(checkIngredients(['sugar', 'water', 'citric acid']).status, 'match'));
test('fixture flagged ingredient returns warning', () => assert.equal(checkIngredients(['water', 'demo flagged ingredient']).status, 'warning'));

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildIdentityPrompt, IDENTITY_MATCH_PROMPT_VERSION } from './geminiMatcher.js';

test('identity prompt carries the authorization-holder rule and Lonart example', () => {
  const prompt = buildIdentityPrompt(
    { productName: 'LONART - DS', manufacturer: 'BLISS GVS PHARMA LTD.' },
    { productName: 'Lonart-DS Tablets**', manufacturer: 'Greenlife Pharmaceutical Limited' }
  );
  assert.match(prompt, /authorization-holder rule/i);
  assert.match(prompt, /BLISS GVS PHARMA/i);
  assert.match(prompt, /matches:true when the core brand tokens agree/i);
  assert.match(prompt, /matches:false ONLY when the core product names genuinely conflict/i);
});

test('identity request is deterministic (temperature 0)', () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const source = fs.readFileSync(path.join(here, 'geminiMatcher.js'), 'utf-8');
  assert.match(source, /temperature:\s*0\b/);
  assert.match(source, /responseMimeType:\s*'application\/json'/);
  assert.match(IDENTITY_MATCH_PROMPT_VERSION, /^\d{4}-\d{2}-\d{2}-ma-holder-v1$/);
});

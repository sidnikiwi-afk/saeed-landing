import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

test('a clicked hero channel replays its steps instead of freezing them done', () => {
  const hero = readFileSync(join(root, 'src/components/brand/Hero.astro'), 'utf8');
  const style = hero.slice(hero.indexOf('<style>'));

  const checkedAt = style.indexOf('.hero:has(input[value="email"]:checked)');
  assert.ok(checkedAt > 0, 'the selected email channel has no animation rule');
  const checkedBlock = style.slice(checkedAt, checkedAt + 3200);
  assert.match(checkedBlock, /\.step/, 'the selected channel does not target the steps');
  assert.match(
    checkedBlock,
    /animation-duration:\s*15s/,
    'the selected channel does not replay on its own timeline',
  );
  assert.match(style, /@keyframes step-live-1\s*\{\s*0%,\s*7%\s*\{\s*opacity:\s*0\.38/);

  const uncheckedOnly = /:not\(:has\(input:checked\)\)[^{]*\.step[^{]*\{[^}]*animation-name:\s*step-live/;
  assert.doesNotMatch(
    style,
    uncheckedOnly,
    'step motion is still limited to the state where no channel is clicked',
  );
});

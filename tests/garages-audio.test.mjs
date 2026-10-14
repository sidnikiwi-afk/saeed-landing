import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const recording = join(root, 'public', 'audio', 'garage-demo-call.mp3');

test('garage call recording exists and is under 1 MB', () => {
  assert.ok(existsSync(recording), 'public/audio/garage-demo-call.mp3 is missing');
  assert.ok(statSync(recording).size < 1024 * 1024, 'garage call recording is 1 MB or more');
});

test('garages page plays the call recording', () => {
  // Build to a separate outDir so this file and built-site.test.mjs can run
  // their builds in parallel without clobbering each other's dist.
  const outDir = join(root, 'dist-garages-audio');
  execFileSync('npx', ['astro', 'build', '--outDir', outDir], {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      PUBLIC_TURNSTILE_SITE_KEY: process.env.PUBLIC_TURNSTILE_SITE_KEY || 'test-site-key',
    },
  });

  const html = readFileSync(join(outDir, 'garages', 'index.html'), 'utf8');
  const audio = html.match(/<audio\b[^>]*>/g) ?? [];
  assert.equal(audio.length, 1, 'garages page should have one audio element');
  assert.match(audio[0], /\bcontrols\b/, 'garage audio has no controls');
  assert.match(audio[0], /preload="none"/, 'garage audio must not preload');
  assert.match(audio[0], /src="\/audio\/garage-demo-call\.mp3"/, 'garage audio points at the wrong file');
  assert.ok(existsSync(join(outDir, 'audio', 'garage-demo-call.mp3')), 'recording is not in the build');

  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  assert.match(text, /Hear it answer a garage call/, 'garage audio heading is missing');
  assert.match(
    text,
    /Illustrative\. AI voices\. Registration and details made up\./,
    'garage audio caption is missing',
  );
  // The transcript on the page is the same call as the recording.
  for (const line of [
    'you&#39;re through to the workshop',
    'LM21 XRT',
    'silver 2021 Ford Focus',
    'MOT runs out in 14 days',
    'Tuesday at half eight or Thursday at nine',
    'Tue 08:30',
  ]) {
    assert.ok(text.includes(line) || text.includes(line.replace('&#39;', "'")), `garage transcript is missing "${line}"`);
  }
});

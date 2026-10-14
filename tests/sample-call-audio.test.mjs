import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { before, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
// Build to a separate outDir so this file and the other build tests can run
// their builds in parallel without clobbering each other's dist.
const outDir = join(root, 'dist-sample-call-audio');
const garageSize = statSync(join(root, 'public', 'audio', 'garage-demo-call.mp3')).size;

const pages = [
  {
    slug: 'ai-receptionist',
    file: 'ai-receptionist-demo-call.mp3',
    heading: 'Hear it take an evening call',
    // The transcript on the page is the same call as the recording.
    lines: [
      'Good evening, thanks for calling. How can I help?',
      'Are you open on Saturdays?',
      'from nine until one',
      'Ravi Sharma',
      'first thing tomorrow morning',
      'Callback booked',
    ],
  },
  {
    slug: 'estate-agents',
    file: 'estate-agents-demo-call.mp3',
    heading: 'Hear it answer a viewing request',
    lines: [
      'through to the branch',
      'three bed on Victoria Road',
      'Daniel Rowe',
      'Is Saturday morning or afternoon better for you?',
      'passed it to Priya, who looks after Victoria Road',
      'Saturday morning',
    ],
  },
];

before(() => {
  execFileSync('npx', ['astro', 'build', '--outDir', outDir], {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      PUBLIC_TURNSTILE_SITE_KEY: process.env.PUBLIC_TURNSTILE_SITE_KEY || 'test-site-key',
    },
  });
});

const decode = (s) => s.replace(/&#39;/g, "'").replace(/&amp;/g, '&');

for (const page of pages) {
  test(`${page.slug} page plays its sample call, readable without JavaScript`, () => {
    const recording = join(root, 'public', 'audio', page.file);
    assert.ok(existsSync(recording), `public/audio/${page.file} is missing`);
    assert.ok(
      statSync(recording).size <= garageSize * 1.5,
      `${page.file} is more than half as big again as the garage recording`,
    );
    assert.ok(existsSync(join(outDir, 'audio', page.file)), 'recording is not in the build');

    const html = readFileSync(join(outDir, page.slug, 'index.html'), 'utf8');
    const audio = html.match(/<audio\b[^>]*>/g) ?? [];
    assert.equal(audio.length, 1, `${page.slug} page should have one audio element`);
    assert.match(audio[0], /\bcontrols\b/, 'audio has no controls');
    assert.match(audio[0], /preload="none"/, 'audio must not preload');
    assert.ok(audio[0].includes(`src="/audio/${page.file}"`), 'audio points at the wrong file');
    // Without JavaScript or audio support there is still a plain download link.
    assert.ok(html.includes(`<a href="/audio/${page.file}"`), 'fallback download link is missing');

    // Heading, caption and transcript are in the static HTML, not added by a script.
    const text = decode(html.replace(/<script\b[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
    assert.ok(text.includes(page.heading), 'audio heading is missing');
    assert.match(text, /Illustrative\. AI voices\. Names and details made up\./, 'audio caption is missing');
    for (const line of page.lines) {
      assert.ok(text.includes(line), `${page.slug} transcript is missing "${line}"`);
    }
  });
}

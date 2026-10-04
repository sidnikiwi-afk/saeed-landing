import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';
import { test } from 'node:test';

// Portable regression for the Marlow & Pike mobile nav close race: the
// 320ms hide callback from a previous close must never hide a menu that was
// reopened inside that window, including after an Escape press while the
// menu was already closed. Executes the ACTUAL inline Nav script in a Node
// vm with synthetic timers. No browser, no network.
const here = dirname(fileURLToPath(import.meta.url));
const astroSource = readFileSync(join(here, '..', 'src', 'components', 'marlow-pike', 'Nav.astro'), 'utf8');

function extractNavScript(source) {
  const open = source.lastIndexOf('<script>');
  const close = source.lastIndexOf('</script>');
  assert.ok(open !== -1 && close > open, 'inline nav script not found');
  return source.slice(open + '<script>'.length, close);
}

function makeNavElement(overrides = {}) {
  const classes = new Set();
  const attrs = new Map();
  const elementListeners = {};
  const el = {
    hidden: false,
    offsetWidth: 0,
    classList: {
      add(...cls) { cls.forEach((c) => classes.add(c)); },
      remove(...cls) { cls.forEach((c) => classes.delete(c)); },
      contains(cls) { return classes.has(cls); },
      toggle(cls, force) {
        if (force === undefined) { if (classes.has(cls)) classes.delete(cls); else classes.add(cls); }
        else if (force) classes.add(cls); else classes.delete(cls);
      },
    },
    setAttribute(name, value) { attrs.set(name, value); },
    getAttribute(name) { return attrs.has(name) ? attrs.get(name) : null; },
    addEventListener(type, fn) { (elementListeners[type] = elementListeners[type] || []).push(fn); },
    querySelectorAll() { return []; },
    querySelector() { return null; },
    __listeners: elementListeners,
    ...overrides,
  };
  return el;
}

function makeEnv(scriptSource) {
  const scheduled = [];
  const listeners = {};
  const nav = makeNavElement();
  const burger = makeNavElement({ tagName: 'BUTTON' });
  const mobile = makeNavElement();
  const bodyStyle = {};
  let tick = 0;

  const sandbox = {
    document: {
      getElementById: (id) => ({ bmNav: nav, bmBurger: burger, bmMobile: mobile }[id] || null),
      body: { style: bodyStyle },
    },
    window: {
      addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
      matchMedia() {
        return { addEventListener(_type, fn) { (listeners.change = listeners.change || []).push(fn); } };
      },
    },
    setTimeout(fn, ms) { scheduled.push({ id: ++tick, fn, ms }); return tick; },
    clearTimeout(id) {
      const index = scheduled.findIndex((t) => t.id === id);
      if (index !== -1) scheduled.splice(index, 1);
    },
  };

  vm.createContext(sandbox);
  vm.runInContext(scriptSource, sandbox);

  return {
    nav, burger, mobile, bodyStyle,
    click() {
      // The toggle handler lives on the burger button itself.
      (burger.__listeners.click || []).forEach((fn) => fn({}));
    },
    pressEscape() { (listeners.keydown || []).forEach((fn) => fn({ key: 'Escape' })); },
    fireTimers(ms) {
      for (const timer of scheduled.splice(0).filter((t) => t.ms === ms)) timer.fn();
    },
  };
}

const OPEN_LABEL = 'Open menu';
const CLOSE_LABEL = 'Close menu';

test('normal open then close hides after 320ms with correct label and scroll restore', () => {
  const env = makeEnv(extractNavScript(astroSource));
  env.click();
  assert.equal(env.mobile.hidden, false);
  assert.equal(env.mobile.classList.contains('is-open'), true);
  assert.equal(env.nav.classList.contains('is-open'), true);
  assert.equal(env.burger.getAttribute('aria-expanded'), 'true');
  assert.equal(env.burger.getAttribute('aria-label'), CLOSE_LABEL);
  assert.equal(env.bodyStyle.overflow, 'hidden');

  env.click();
  assert.equal(env.mobile.hidden, false, 'still visible during the 320ms transition');
  assert.equal(env.burger.getAttribute('aria-expanded'), 'false');
  assert.equal(env.burger.getAttribute('aria-label'), OPEN_LABEL);
  assert.equal(env.bodyStyle.overflow, '');
  env.fireTimers(320);
  assert.equal(env.mobile.hidden, true, 'hidden after 320ms');
});

test('reopening inside the 320ms close window keeps the menu visible, expanded and scroll locked', () => {
  const env = makeEnv(extractNavScript(astroSource));
  env.click();   // open
  env.click();   // close, schedules the 320ms hide
  env.click();   // reopen before 320ms
  assert.equal(env.bodyStyle.overflow, 'hidden', 'reopened menu locks scroll again');
  env.fireTimers(320);
  assert.equal(env.mobile.hidden, false, 'stale 320ms hide must not hide the reopened menu');
  assert.equal(env.mobile.classList.contains('is-open'), true);
  assert.equal(env.nav.classList.contains('is-open'), true);
  assert.equal(env.burger.getAttribute('aria-expanded'), 'true');
  assert.equal(env.burger.getAttribute('aria-label'), CLOSE_LABEL);

  env.click();   // final close
  env.fireTimers(320);
  assert.equal(env.mobile.hidden, true, 'final close hides after 320ms');
  assert.equal(env.burger.getAttribute('aria-expanded'), 'false');
  assert.equal(env.burger.getAttribute('aria-label'), OPEN_LABEL);
  assert.equal(env.bodyStyle.overflow, '');
});

test('Escape while closed, then open: a stale hide timer must not close the reopened menu', () => {
  const env = makeEnv(extractNavScript(astroSource));
  env.click();        // open
  env.click();        // close -> schedules the 320ms hide
  env.pressEscape();  // Escape while already closed; must still invalidate the pending hide
  env.click();        // reopen
  env.fireTimers(320);
  assert.equal(env.mobile.hidden, false, 'menu reopened after Escape must not be hidden by the stale timer');
  assert.equal(env.mobile.classList.contains('is-open'), true);
  assert.equal(env.burger.getAttribute('aria-expanded'), 'true');

  env.pressEscape();  // close via Escape
  assert.equal(env.burger.getAttribute('aria-expanded'), 'false');
  assert.equal(env.bodyStyle.overflow, '');
  env.fireTimers(320);
  assert.equal(env.mobile.hidden, true);
});

test('rapid toggle bursts never leave a stale hide pending over an open menu', () => {
  const env = makeEnv(extractNavScript(astroSource));
  for (let i = 0; i < 6; i += 1) env.click();
  env.fireTimers(320);
  assert.equal(env.mobile.hidden, true, 'burst ends closed, so it must be hidden');
  env.click(); // open again
  env.fireTimers(320);
  assert.equal(env.mobile.hidden, false, 'no stale timer from the burst may hide the open menu');
  assert.equal(env.burger.getAttribute('aria-expanded'), 'true');
  assert.equal(env.bodyStyle.overflow, 'hidden');
});

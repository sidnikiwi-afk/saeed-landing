import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';
import { test } from 'node:test';
import { onRequestPost } from '../functions/api/marlow-pike-enquire.js';

// Portable regression for the modal session-identity bug in the Marlow &
// Pike enquiry modal: a submission left pending when the modal is closed and
// a different property opened must not apply its old success/error/finally
// to the new session, and a reopen inside the 300ms close timer must not be
// hidden. Executes the ACTUAL inline script from EnquireModal.astro in a
// Node vm with deferred fake fetch promises and the real handlers and timer
// callbacks. No network, no provider calls.
const here = dirname(fileURLToPath(import.meta.url));
const astroSource = readFileSync(join(here, '..', 'src', 'components', 'marlow-pike', 'EnquireModal.astro'), 'utf8');

function extractModalScript(source) {
  const open = source.lastIndexOf('<script>');
  const close = source.lastIndexOf('</script>');
  assert.ok(open !== -1 && close > open, 'inline modal script not found');
  return source.slice(open + '<script>'.length, close);
}

function makeElement(overrides = {}) {
  const el = {
    tagName: 'DIV',
    hidden: false,
    offsetWidth: 0,
    focused: false,
    __inModal: false,
    textContent: '',
    value: '',
    name: '',
    disabled: false,
    resetCalls: 0,
    classList: {
      _set: new Set(),
      add(...cls) { cls.forEach((c) => this._set.add(c)); },
      remove(...cls) { cls.forEach((c) => this._set.delete(c)); },
      contains(cls) { return this._set.has(cls); },
      toggle() {},
    },
    addEventListener() {},
    setAttribute() {},
    getAttribute() { return null; },
    querySelector() { return makeElement(); },
    querySelectorAll() { return []; },
    focus() { el.focused = true; },
    blur() {},
    contains(node) { return Boolean(node && node.__inModal); },
    closest() { return null; },
    reset() { el.resetCalls += 1; },
    ...overrides,
  };
  return el;
}

function makeEnv(scriptSource) {
  const scheduled = [];
  const documentListeners = {};
  const windowListeners = {};
  const formListeners = {};
  const fetchCalls = [];
  // Deferred fake fetch: the test installs a function returning a promise it
  // controls; every call is recorded with its parsed payload.
  let fetchImpl = () => Promise.reject(new Error('no fetch configured'));

  const modal = makeElement({ tagName: 'DIV', getAttribute() { return '/api/marlow-pike-enquire'; } });
  modal.__inModal = true;

  const makeField = (name, tagName = 'INPUT') => {
    const field = makeElement({ tagName, name });
    field.__inModal = true;
    return field;
  };
  const fields = {
    name: makeField('name'),
    phone: makeField('phone'),
    email: makeField('email'),
    message: makeField('message', 'TEXTAREA'),
    company: makeField('company'),
  };

  const submitLabel = makeElement({ tagName: 'SPAN', textContent: 'Send demo enquiry' });
  const submitBtn = makeElement({
    tagName: 'BUTTON',
    querySelector() { return submitLabel; },
  });
  const form = makeElement({ tagName: 'FORM', elements: fields });
  form.querySelector = () => submitBtn;
  form.addEventListener = (type, fn) => { formListeners[type] = fn; };
  form.__inModal = true;
  // Truthful constraint-validity model of the actual markup: name, phone and
  // email are required and email must look like an address. Message is NOT a
  // required field in the modal, so a blank message stays valid (the worker
  // substitutes a default). Never a blanket always-valid mock.
  form.reportValidityCalls = 0;
  form.checkValidity = () =>
    fields.name.value.trim() !== '' &&
    fields.phone.value.trim() !== '' &&
    /.+@.+/.test(fields.email.value.trim());
  form.reportValidity = () => { form.reportValidityCalls += 1; };

  const errEl = makeElement({ textContent: 'Sorry, something went wrong and the enquiry was not sent. Please try again later.' });
  const propField = makeElement();
  const byId = {
    bmEnq: modal,
    bmEnqForm: form,
    bmEnqProp: makeElement(),
    bmEnqPropField: propField,
    bmEnqRefField: makeElement(),
    bmEnqUrlField: makeElement(),
    bmEnqErr: errEl,
  };

  const sandbox = {
    document: {
      getElementById: (id) => byId[id] || null,
      addEventListener(type, fn) { documentListeners[type] = fn; },
      activeElement: null,
      body: { style: {} },
    },
    window: { addEventListener(type, fn) { windowListeners[type] = fn; } },
    setTimeout: (fn, ms) => { scheduled.push({ fn, ms }); return scheduled.length; },
    fetch: (url, opts) => { fetchCalls.push({ url, opts, body: JSON.parse(opts.body) }); return fetchImpl(url, opts); },
  };
  // The script resolves its two [data-enq-view] panels with modal
  //.querySelector at load; hand back stable views in lookup order.
  const formView = makeElement({ __inModal: true });
  const successView = makeElement({ __inModal: true });
  const viewQueue = [formView, successView];
  modal.querySelector = () => viewQueue.shift() ?? makeElement();

  vm.createContext(sandbox);
  vm.runInContext(scriptSource, sandbox);

  let counter = 0;
  return {
    modal, form, fields, propField, submitBtn, submitLabel, errEl, formView, successView,
    fetchCalls,
    get submitHandler() { return formListeners.submit; },
    setFetch(impl) { fetchImpl = impl; },
    open(ref) {
      ref = ref || `MP00${(counter += 1) || 1}`;
      const trigger = makeElement({
        getAttribute(attr) {
          if (attr === 'data-property') return `Property ${ref}, Example Street, Marlow`;
          if (attr === 'data-property-ref') return ref;
          return null;
        },
      });
      documentListeners.click({
        target: { closest: (sel) => (sel === '[data-enquire]' ? trigger : null) },
        preventDefault() {},
      });
    },
    close() {
      documentListeners.click({
        target: { closest: (sel) => (sel === '[data-enq-close]' ? makeElement() : null) },
        preventDefault() {},
      });
    },
    pressEscape() { windowListeners.keydown({ key: 'Escape' }); },
    fireTimers(ms) { for (const timer of scheduled.splice(0).filter((t) => t.ms === ms)) timer.fn(); },
  };
}

function fillValid(env) {
  env.fields.name.value = 'Demo Viewer';
  env.fields.phone.value = '01632960000';
  env.fields.email.value = 'demo-viewer@example.test';
}

function deferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

// --- Current behaviour ------------------------------------------------------

test('submit succeeds, resets form, shows success, re-enables the button', async () => {
  const env = makeEnv(extractModalScript(astroSource));
  env.open('MP001');
  fillValid(env);
  const d = deferred();
  env.setFetch(() => d.promise);
  const done = env.submitHandler({ preventDefault() {} });
  assert.equal(env.submitBtn.disabled, true);
  assert.equal(env.submitLabel.textContent, 'Sending...');
  d.resolve({ ok: true });
  await done;
  assert.equal(env.form.resetCalls, 1);
  assert.equal(env.formView.hidden, true);
  assert.equal(env.successView.hidden, false);
  assert.equal(env.submitBtn.disabled, false);
  assert.equal(env.submitLabel.textContent, 'Send demo enquiry');
  assert.equal(env.fetchCalls.length, 1);
  assert.equal(env.fetchCalls[0].body.property_ref, 'MP001');
});

test('failed retry within the SAME session keeps the same submission id', async () => {
  const env = makeEnv(extractModalScript(astroSource));
  env.open('MP001');
  fillValid(env);
  const d1 = deferred();
  env.setFetch(() => d1.promise);
  const first = env.submitHandler({ preventDefault() {} });
  d1.reject(new Error('network down'));
  await first;
  assert.equal(env.errEl.hidden, false, 'error shown after rejection');
  assert.equal(env.submitBtn.disabled, false, 'button re-enabled for retry');
  const d2 = deferred();
  env.setFetch(() => d2.promise);
  const second = env.submitHandler({ preventDefault() {} });
  d2.resolve({ ok: true });
  await second;
  assert.equal(env.fetchCalls.length, 2);
  assert.ok(env.fetchCalls[0].body.submission_id, 'first submission has an id');
  assert.equal(env.fetchCalls[1].body.submission_id, env.fetchCalls[0].body.submission_id, 'same session retry reuses the id');
});

test('a NEW session after a failed attempt gets a different submission id', async () => {
  const env = makeEnv(extractModalScript(astroSource));
  env.open('MP001');
  fillValid(env);
  const d1 = deferred();
  env.setFetch(() => d1.promise);
  const first = env.submitHandler({ preventDefault() {} });
  d1.reject(new Error('network down'));
  await first;
  env.close();
  env.open('MP002');
  fillValid(env);
  const d2 = deferred();
  env.setFetch(() => d2.promise);
  const second = env.submitHandler({ preventDefault() {} });
  d2.resolve({ ok: true });
  await second;
  assert.equal(env.fetchCalls.length, 2);
  assert.notEqual(env.fetchCalls[1].body.submission_id, env.fetchCalls[0].body.submission_id, 'new session gets a new id');
  assert.equal(env.fetchCalls[1].body.property_ref, 'MP002');
});

// --- Stale-session regressions ----------------------------------------------

test('stale success after close + MP002 reopen leaves the new session untouched', async () => {
  const env = makeEnv(extractModalScript(astroSource));
  env.open('MP001');
  fillValid(env);
  const d1 = deferred();
  env.setFetch(() => d1.promise);
  const pending = env.submitHandler({ preventDefault() {} });
  env.close();
  env.open('MP002');
  const messageBefore = env.fields.message.value;
  const labelBefore = env.submitLabel.textContent;
  const viewBefore = { form: env.formView.hidden, success: env.successView.hidden };
  d1.resolve({ ok: true });
  await pending;
  assert.equal(env.form.resetCalls, 0, 'old success must not reset the new session form');
  assert.equal(env.formView.hidden, viewBefore.form, 'form view unchanged');
  assert.equal(env.successView.hidden, viewBefore.success, 'previous success not shown over the new property');
  assert.equal(env.fields.message.value, messageBefore, 'new session message untouched');
  assert.equal(env.submitLabel.textContent, labelBefore, 'new session button label untouched');
  assert.equal(env.fetchCalls[0].body.property_ref, 'MP001', 'old payload kept its captured property');
});

test('stale rejection after close + reopen leaves the new form error hidden', async () => {
  const env = makeEnv(extractModalScript(astroSource));
  env.open('MP001');
  fillValid(env);
  const d1 = deferred();
  env.setFetch(() => d1.promise);
  const pending = env.submitHandler({ preventDefault() {} });
  env.close();
  env.open('MP002');
  const errBefore = env.errEl.hidden;
  d1.reject(new Error('network down'));
  await pending;
  assert.equal(env.errEl.hidden, errBefore, 'old rejection must not surface an error on the new session');
});

test('old finally cannot re-enable or relabel a newer pending request', async () => {
  const env = makeEnv(extractModalScript(astroSource));
  env.open('MP001');
  fillValid(env);
  const d1 = deferred();
  env.setFetch(() => d1.promise);
  const first = env.submitHandler({ preventDefault() {} });
  env.close();
  env.open('MP002');
  fillValid(env);
  const d2 = deferred();
  env.setFetch(() => d2.promise);
  const second = env.submitHandler({ preventDefault() {} });
  assert.equal(env.submitBtn.disabled, true, 'newer request owns the pending state');
  assert.equal(env.submitLabel.textContent, 'Sending...');
  d1.resolve({ ok: true });
  await first;
  assert.equal(env.submitBtn.disabled, true, 'old completion must not re-enable the newer pending request');
  assert.equal(env.submitLabel.textContent, 'Sending...', 'old completion must not reset the newer label');
  assert.equal(env.successView.hidden, true, 'old success must not replace the newer pending form');
  d2.resolve({ ok: true });
  await second;
  assert.equal(env.submitBtn.disabled, false, 'current completion re-enables normally');
  assert.equal(env.submitLabel.textContent, 'Send demo enquiry');
});

test('reopening inside the 300ms close timer stays visible; plain close still hides', () => {
  const plain = makeEnv(extractModalScript(astroSource));
  plain.open('MP001');
  plain.close();
  plain.fireTimers(300);
  assert.equal(plain.modal.hidden, true, 'normal close hides after 300ms');

  const raced = makeEnv(extractModalScript(astroSource));
  raced.open('MP001');
  raced.close();
  raced.open('MP002');
  raced.fireTimers(300);
  assert.equal(raced.modal.hidden, false, 'stale 300ms hide must not close the reopened session');
  assert.equal(raced.modal.classList.contains('is-open'), true, 'reopened modal is still open');
});

test('reopening while an old request is pending re-enables submit with the default label', async () => {
  const env = makeEnv(extractModalScript(astroSource));
  env.open('MP001');
  fillValid(env);
  const d1 = deferred();
  env.setFetch(() => d1.promise);
  const pending = env.submitHandler({ preventDefault() {} });
  assert.equal(env.submitBtn.disabled, true);
  env.close();
  env.open('MP002');
  assert.equal(env.submitBtn.disabled, false, 'new session usable while the old network request is pending');
  assert.equal(env.submitLabel.textContent, 'Send demo enquiry', 'label reset for the new enquiry');
  d1.resolve({ ok: true });
  await pending;
  assert.equal(env.successView.hidden, true, 'stale success still must not replace the fresh session');
  assert.equal(env.form.resetCalls, 0);
});

// --- Native constraint validation --------------------------------------------

test('the modal form keeps native constraint validation in the markup', () => {
  const formTag = astroSource.match(/<form class="bm-enq__form"[^>]*>/);
  assert.ok(formTag, 'modal form tag not found');
  assert.equal(/novalidate/.test(formTag[0]), false, 'form must not bypass native validation');
  for (const field of ['name="name" required', 'name="phone" required', 'name="email" required']) {
    assert.ok(astroSource.includes(field), `markup must keep required constraint: ${field}`);
  }
  assert.ok(/type="email" name="email" required/.test(astroSource), 'email keeps its type constraint');
});

test('invalid blank required fields send nothing, set no pending state and show native feedback', async () => {
  for (const [label, clear] of [
    ['name', (env) => { env.fields.name.value = ''; }],
    ['phone', (env) => { env.fields.phone.value = ''; }],
    ['email', (env) => { env.fields.email.value = ''; }],
    ['malformed email', (env) => { env.fields.email.value = 'not-an-email'; }],
  ]) {
    const env = makeEnv(extractModalScript(astroSource));
    env.open('MP001');
    fillValid(env);
    clear(env);
    await env.submitHandler({ preventDefault() {} });
    assert.equal(env.fetchCalls.length, 0, `${label}: zero fetch`);
    assert.equal(env.submitBtn.disabled, false, `${label}: no pending state`);
    assert.equal(env.submitLabel.textContent, 'Send demo enquiry', `${label}: label untouched`);
    assert.equal(env.successView.hidden, true, `${label}: no success view`);
    assert.equal(env.formView.hidden, false, `${label}: still on the form view`);
    assert.equal(env.form.reportValidityCalls >= 1, true, `${label}: native feedback requested`);
    assert.equal(env.errEl.hidden, true, `${label}: no network error shown for a validation stop`);
  }
});

test('correcting the invalid fields then submits exactly once with success', async () => {
  const env = makeEnv(extractModalScript(astroSource));
  env.open('MP001');
  fillValid(env);
  env.fields.email.value = 'not-an-email';
  await env.submitHandler({ preventDefault() {} });
  assert.equal(env.fetchCalls.length, 0, 'blocked while the email is malformed');
  env.fields.email.value = 'demo-viewer@example.test';
  const d = deferred();
  env.setFetch(() => d.promise);
  const done = env.submitHandler({ preventDefault() {} });
  d.resolve({ ok: true });
  await done;
  assert.equal(env.fetchCalls.length, 1, 'exactly one submission after correction');
  assert.equal(env.successView.hidden, false, 'success shown for the corrected form');
  assert.equal(env.form.resetCalls, 1);
});

// --- Field-contract: client validation equivalent to the API -----------------
//
// The endpoint (functions/api/marlow-pike-enquire.js) rejects values the
// browser's native constraints happily accept: a tel input takes letters,
// a 1-character name passes `required`, and type=email permits a dotless
// host. Those submissions currently pay a round trip and surface a generic
// service error. The modal must instead apply the endpoint's own normalised
// rules client-side, show the endpoint's field-specific wording in the
// existing error element and focus the offending field, before any pending
// state, submission id or fetch.

const DEFAULT_ERROR_TEXT = 'Sorry, something went wrong and the enquiry was not sent. Please try again later.';

// Runs the actual inline script's submit handler against a fixture and
// reports the observed client decision: whether it fetched, which feedback
// it surfaced and which field it focused.
async function clientDecision(fields, { resolve = true } = {}) {
  const env = makeEnv(extractModalScript(astroSource));
  env.open('MP001');
  fillValid(env);
  for (const [name, value] of Object.entries(fields)) env.fields[name].value = value;
  for (const field of Object.values(env.fields)) field.focused = false;
  const d = deferred();
  env.setFetch(() => d.promise);
  if (resolve) d.resolve({ ok: true });
  await env.submitHandler({ preventDefault() {} });
  const focusedField = Object.keys(env.fields).find((n) => env.fields[n].focused) || '';
  return {
    env,
    fetched: env.fetchCalls.length,
    pending: env.submitBtn.disabled,
    errorShown: !env.errEl.hidden,
    errorText: env.errEl.hidden ? '' : env.errEl.textContent,
    focusedField,
  };
}

// The actual endpoint on this worktree: a POST with a valid Origin but the
// deliberately missing MP_* configuration. Valid data must stop at the
// fail-closed 503 without forwarding anywhere; invalid data must return the
// specific 400 field error. Used to prove the client rules and the server
// rules agree fixture by fixture.
async function endpointDecision(fields) {
  const origin = 'https://marlow-pike.localhost.test';
  const forwards = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = (url, opts) => { forwards.push({ url, body: opts && opts.body }); return Promise.resolve(new Response('{"ok":true}', { status: 200 })); };
  try {
    const request = new Request(`${origin}/api/marlow-pike-enquire`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: origin },
      body: JSON.stringify({ ...fields, property: 'x', property_ref: 'MP001', listing_url: '', submission_id: 'test_submission_id' }),
    });
    const res = await onRequestPost({ request, env: { MP_ALLOWED_ORIGINS: origin } });
    return { status: res.status, body: await res.json(), forwarded: forwards.length };
  } finally {
    globalThis.fetch = realFetch;
  }
}

// Fixtures private to this run. Addresses are illustrative demo values only
// and are never printed; every assertion below works on statuses and wording.
const fixture = {
  valid: { name: 'Demo Viewer', phone: '01632960000', email: ['demo-viewer', 'example.test'].join('@') },
  shortName: { name: 'D', phone: '01632960000', email: ['demo-viewer', 'example.test'].join('@') },
  phoneLetters: { name: 'Demo Viewer', phone: '01632 960x1', email: ['demo-viewer', 'example.test'].join('@') },
  dotlessEmail: { name: 'Demo Viewer', phone: '01632960000', email: 'viewer@example' },
};

test('API-invalid but native-accepted values are blocked client-side with the endpoint wording and focused field', async () => {
  const expectations = [
    ['single-character name', fixture.shortName, 'name', 'Name is required'],
    ['phone containing letters', fixture.phoneLetters, 'phone', 'Valid phone is required'],
    ['dotless email host', fixture.dotlessEmail, 'email', 'Valid email is required'],
  ];
  const server = await endpointDecision(fixture.shortName);
  assert.equal(server.status, 400, 'endpoint really rejects the short name');
  assert.equal(server.forwarded, 0, 'no forward for invalid data');
  for (const [label, fields, field, wording] of expectations) {
    const decision = await clientDecision(fields);
    assert.equal(decision.fetched, 0, `${label}: zero fetch`);
    assert.equal(decision.pending, false, `${label}: no pending state`);
    assert.equal(decision.errorShown, true, `${label}: feedback shown`);
    assert.equal(decision.errorText, wording, `${label}: endpoint wording in the existing error element`);
    assert.equal(decision.focusedField, field, `${label}: invalid field focused`);
    assert.equal(decision.env.submitLabel.textContent, 'Send demo enquiry', `${label}: label untouched`);
    assert.equal(decision.env.successView.hidden, true, `${label}: no success view`);
    assert.equal(decision.env.formView.hidden, false, `${label}: still on the form view`);
  }
});

test('endpoint 400 wording matches the client feedback word for word', async () => {
  for (const fields of [fixture.shortName, fixture.phoneLetters, fixture.dotlessEmail]) {
    const server = await endpointDecision(fields);
    const decision = await clientDecision(fields);
    assert.equal(server.status, 400);
    assert.equal(decision.errorText, server.body.error, 'same wording client and server');
  }
});

test('correcting each native-accepted invalid class then submits exactly once', async () => {
  for (const [label, fields, fix] of [
    ['short name', fixture.shortName, (env) => { env.fields.name.value = 'Demo Viewer'; }],
    ['phone letters', fixture.phoneLetters, (env) => { env.fields.phone.value = '01632960000'; }],
    ['dotless email', fixture.dotlessEmail, (env) => { env.fields.email.value = ['demo-viewer', 'example.test'].join('@'); }],
  ]) {
    const env = makeEnv(extractModalScript(astroSource));
    env.open('MP001');
    fillValid(env);
    for (const [name, value] of Object.entries(fields)) env.fields[name].value = value;
    await env.submitHandler({ preventDefault() {} });
    assert.equal(env.fetchCalls.length, 0, `${label}: blocked before the fix`);
    fix(env);
    const d = deferred();
    env.setFetch(() => d.promise);
    const done = env.submitHandler({ preventDefault() {} });
    d.resolve({ ok: true });
    await done;
    assert.equal(env.fetchCalls.length, 1, `${label}: exactly one mocked submission after correction`);
    assert.equal(env.successView.hidden, false, `${label}: success shown`);
  }
});

test('normalised boundary fixtures agree between client and endpoint', async () => {
  const cases = [
    // whitespace and tabs collapse exactly as the server's clean() does
    [{ name: '  Demo   Viewer ', phone: ' 01632\t960 001 ', email: ' Viewer@Example.TEST ' }, true],
    // one character after collapsing is still too short
    [{ name: ' A ', phone: '01632960000', email: ['demo-viewer', 'example.test'].join('@') }, false],
    // a real formatted phone is accepted
    [{ name: 'Demo Viewer', phone: '+44 (1632) 960-001', email: ['demo-viewer', 'example.test'].join('@') }, true],
    // too short and over-long phones are not
    [{ name: 'Demo Viewer', phone: '123', email: ['demo-viewer', 'example.test'].join('@') }, false],
    [{ name: 'Demo Viewer', phone: '+44 (1632) 960-001 02345 6789 01', email: ['demo-viewer', 'example.test'].join('@') }, false],
    // a space inside the local part survives clean() and must fail both sides
    [{ name: 'Demo Viewer', phone: '01632960000', email: 'de mo@example.test' }, false],
  ];
  for (const [fields, shouldPass] of cases) {
    const client = await clientDecision(fields);
    const server = await endpointDecision(fields);
    if (shouldPass) {
      assert.equal(client.fetched, 1, `client accepts: ${JSON.stringify(fields.name.length)}`);
      assert.equal(server.status, 503, 'valid data reaches the fail-closed not-configured stop');
      assert.equal(server.forwarded, 0, 'valid data still forwards nowhere without config');
      assert.equal(client.errorShown, false, 'no field error for accepted data');
    } else {
      assert.equal(client.fetched, 0, 'client blocks');
      assert.equal(client.errorShown, true, 'client shows field feedback');
      assert.equal(server.status, 400, 'server rejects');
      assert.equal(client.errorText, server.body.error, 'wording agrees');
    }
  }
});

test('opening and reattempting restore the generic default error text', async () => {
  const env = makeEnv(extractModalScript(astroSource));
  env.open('MP001');
  fillValid(env);
  env.fields.name.value = 'D';
  await env.submitHandler({ preventDefault() {} });
  assert.equal(env.errEl.textContent, 'Name is required');
  // a new attempt clears the field error before anything else happens
  env.fields.name.value = 'Demo Viewer';
  const d1 = deferred();
  env.setFetch(() => d1.promise);
  const first = env.submitHandler({ preventDefault() {} });
  assert.equal(env.errEl.hidden, true, 'field error cleared at the start of the retry');
  d1.resolve({ ok: true });
  await first;
  env.close();
  env.open('MP002');
  assert.equal(env.errEl.hidden, true, 'error hidden on open');
  assert.equal(env.errEl.textContent, DEFAULT_ERROR_TEXT, 'generic default text restored on open');
});

test('a real server failure in the current session shows the generic default text', async () => {
  const env = makeEnv(extractModalScript(astroSource));
  env.open('MP001');
  fillValid(env);
  const d = deferred();
  env.setFetch(() => d.promise);
  const done = env.submitHandler({ preventDefault() {} });
  d.reject(new Error('503 from origin'));
  await done;
  assert.equal(env.errEl.hidden, false, 'failure surfaced');
  assert.equal(env.errEl.textContent, DEFAULT_ERROR_TEXT, 'generic default error text preserved for real failures');
});

test('a late server 400/503 rejection must not mutate a reopened session', async () => {
  const env = makeEnv(extractModalScript(astroSource));
  env.open('MP001');
  fillValid(env);
  const d1 = deferred();
  env.setFetch(() => d1.promise);
  const pending = env.submitHandler({ preventDefault() {} });
  env.close();
  env.open('MP002');
  fillValid(env);
  const errBefore = { hidden: env.errEl.hidden, text: env.errEl.textContent };
  d1.reject(new Error('bad status 503'));
  await pending;
  assert.equal(env.errEl.hidden, errBefore.hidden, 'late 503 must not surface the old session error');
  assert.equal(env.errEl.textContent, errBefore.text, 'late 503 must not rewrite the new session error text');
  assert.equal(env.submitBtn.disabled, false, 'new session button stays usable');
});

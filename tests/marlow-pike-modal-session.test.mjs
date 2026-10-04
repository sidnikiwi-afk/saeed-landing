import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';
import { test } from 'node:test';

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

  const errEl = makeElement();
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

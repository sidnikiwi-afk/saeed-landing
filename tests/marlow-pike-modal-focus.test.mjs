import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';
import { test } from 'node:test';

// Portable regression for the demonstrated delayed-autofocus bug in the
// Marlow & Pike enquiry modal. Executes the ACTUAL inline script extracted
// from src/components/marlow-pike-EnquireModal.astro inside a Node vm with
// minimal DOM/timer fixtures: real handlers and the real scheduled callback
// run, only the DOM surface is modelled. No submit, fetch or network.
const here = dirname(fileURLToPath(import.meta.url));
const astroSource = readFileSync(join(here, '..', 'src', 'components', 'marlow-pike', 'EnquireModal.astro'), 'utf8');

function extractModalScript(source) {
  const open = source.lastIndexOf('<script>');
  const close = source.lastIndexOf('</script>');
  assert.ok(open !== -1 && close > open, 'inline modal script not found');
  return source.slice(open + '<script>'.length, close);
}

// Minimal element fixture. `focused` records focus() calls; `__inModal`
// marks membership for modal.contains(). classList models the single
// is-open class the script toggles.
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
    ...overrides,
  };
  return el;
}

function runScript(scriptSource) {
  const scheduled = [];
  const documentListeners = {};
  const windowListeners = {};

  const modal = makeElement({
    tagName: 'DIV',
    getAttribute() { return '/api/marlow-pike-enquire'; },
  });
  modal.__inModal = true;

  const nameField = makeElement({ tagName: 'INPUT', name: 'name' });
  const phoneField = makeElement({ tagName: 'INPUT', name: 'phone' });
  const emailField = makeElement({ tagName: 'INPUT', name: 'email', value: '' });
  const messageField = makeElement({ tagName: 'TEXTAREA', name: 'message' });
  for (const field of [nameField, phoneField, emailField, messageField]) field.__inModal = true;

  const form = makeElement({
    tagName: 'FORM',
    elements: {
      name: nameField,
      phone: phoneField,
      email: emailField,
      message: messageField,
      company: makeElement({ name: 'company', value: '' }),
    },
    reset() {},
  });
  form.__inModal = true;

  const byId = {
    bmEnq: modal,
    bmEnqForm: form,
    bmEnqProp: makeElement(),
    bmEnqPropField: makeElement(),
    bmEnqRefField: makeElement(),
    bmEnqUrlField: makeElement(),
    bmEnqErr: makeElement(),
  };

  const sandbox = {
    document: {
      getElementById: (id) => byId[id] || null,
      addEventListener(type, fn) { documentListeners[type] = fn; },
      activeElement: null,
      body: { style: {} },
    },
    window: {
      addEventListener(type, fn) { windowListeners[type] = fn; },
    },
    setTimeout: (fn, ms) => { scheduled.push({ fn, ms }); return scheduled.length; },
  };
  vm.createContext(sandbox);
  vm.runInContext(scriptSource, sandbox);

  return {
    document: sandbox.document,
    modal,
    form,
    nameField,
    phoneField,
    messageField,
    scheduled,
    documentListeners,
    windowListeners,
    open(trigger) {
      documentListeners.click({
        target: { closest: (sel) => (sel === '[data-enquire]' ? trigger : null) },
        preventDefault() {},
      });
    },
    pressEscape() {
      windowListeners.keydown({ key: 'Escape' });
    },
    fireTimers(ms) {
      for (const timer of scheduled.splice(0).filter((t) => t.ms === ms)) timer.fn();
    },
  };
}

function makeTrigger() {
  return makeElement({
    getAttribute(attr) {
      if (attr === 'data-property') return 'Flat, Example Street, Marlow';
      if (attr === 'data-property-ref') return 'MP001';
      return null;
    },
  });
}

// Reconstruct the pre-fix behaviour for red evidence by swapping ONLY the
// delayed-focus callback back to the old unconditional call in a temporary
// copy of the actual script text. Application source is never modified.
function oldUnconditionalVariant(scriptSource) {
  const guarded = /setTimeout\(\(\) => \{[\s\S]*?form\.elements\['name'\]\?\.focus\(\);[\s\S]*?\}, 60\);/;
  assert.match(scriptSource, guarded, 'guarded delayed focus not found in current script');
  return scriptSource.replace(guarded, 'setTimeout(() => form.elements[\'name\']?.focus(), 60);');
}

function scenarioDefaultOpener(scriptSource) {
  const env = runScript(scriptSource);
  env.open(makeTrigger());
  env.fireTimers(60);
  return { nameFocused: env.nameField.focused, modalOpen: !env.modal.hidden };
}

function scenarioClosedBefore60ms(scriptSource) {
  const env = runScript(scriptSource);
  env.open(makeTrigger());
  env.pressEscape();
  env.fireTimers(60);
  return { nameFocused: env.nameField.focused };
}

test('opener with no field selected still focuses name at the 60ms timer', () => {
  const outcome = scenarioDefaultOpener(extractModalScript(astroSource));
  assert.equal(outcome.nameFocused, true);
  assert.equal(outcome.modalOpen, true);
});

test('choosing the message textarea before 60ms keeps focus there; name is not stolen', () => {
  const env = runScript(extractModalScript(astroSource));
  env.open(makeTrigger());
  env.messageField.focus();
  env.document.activeElement = env.messageField;
  env.fireTimers(60);
  assert.equal(env.messageField.focused, true);
  assert.equal(env.nameField.focused, false);
});

test('choosing the phone field before 60ms keeps focus there; name is not stolen', () => {
  const env = runScript(extractModalScript(astroSource));
  env.open(makeTrigger());
  env.phoneField.focus();
  env.document.activeElement = env.phoneField;
  env.fireTimers(60);
  assert.equal(env.phoneField.focused, true);
  assert.equal(env.nameField.focused, false);
});

test('closing the modal before 60ms prevents any delayed focus despite the pending 300ms hidden timer', () => {
  const env = runScript(extractModalScript(astroSource));
  env.open(makeTrigger());
  env.pressEscape();
  assert.equal(env.modal.classList.contains('is-open'), false, 'close removes is-open synchronously');
  env.fireTimers(60);
  assert.equal(env.nameField.focused, false);
  assert.equal(env.modal.hidden, false, '300ms hidden timer must not have fired yet');
});

test('RED evidence: the reconstructed pre-fix unconditional callback steals focus in both scenarios', () => {
  const oldScript = oldUnconditionalVariant(extractModalScript(astroSource));

  const chosen = runScript(oldScript);
  chosen.open(makeTrigger());
  chosen.messageField.focus();
  chosen.document.activeElement = chosen.messageField;
  chosen.fireTimers(60);
  // The fixture records that focus() was called, so the theft is proved by
  // the name field also receiving focus despite the visitor's choice.
  assert.equal(chosen.nameField.focused, true, 'pre-fix: name took focus anyway');

  const closed = runScript(oldScript);
  closed.open(makeTrigger());
  closed.pressEscape();
  closed.fireTimers(60);
  assert.equal(closed.nameField.focused, true, 'pre-fix: name focused even after close');
});

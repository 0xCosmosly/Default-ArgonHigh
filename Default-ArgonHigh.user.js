// ==UserScript==
// @name         Default-ArgonHigh
// @namespace    http://tampermonkey.net/
// @version      2.5
// @description  Automatically switches Gemini to 4 Argon at High thinking level on launch, and respects manual changes.
// @author       0xCosmosly
// @license       MIT
// @homepageURL  https://github.com/0xCosmosly/Default-ArgonHigh
// @supportURL   https://github.com/0xCosmosly/Default-ArgonHigh/issues
// @match        https://gemini.google.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=google.com
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // ---- Verified against the live Gemini UI (Nov 2026) --------------------
  // Picker button:   button[aria-label="Open mode picker, currently <Mode> <Level>"]
  // Mode rows:       gem-menu-item[data-mode-id]  with .label text ("4 Argon")
  // Thinking level:  gem-menu-item.expandable whose text contains "Thinking level"
  // Level rows:      gem-menu-item whose text starts with Low / Medium / High
  // Ground truth:    the picker button's aria-label, e.g. "currently Argon High"
  // -----------------------------------------------------------------------

  const RETRY_MS = 400;
  const STEP_SETTLE_MS = 450;
  const MAX_ATTEMPTS = 8;
  const SUCCESS = /currently\s+argon\s+high/i;
  const HAS_ARGON = /argon/i;
  const HAS_HIGH = /\bhigh\b/i;

  let inFlight = false;
  let autoDone = false;
  let manualOverride = false;
  let timer = null;
  let attempts = 0;

  const textOf = (el) => (el?.innerText || el?.textContent || '').replace(/\s+/g, ' ').trim();

  function isVisible(el) {
    if (!(el instanceof HTMLElement)) return false;
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // Poll instead of sleeping a fixed amount: the menu usually renders in well
  // under 100 ms, so a fixed 450 ms wait just makes the user watch it open.
  async function waitFor(fn, timeout = 900, interval = 40) {
    const end = Date.now() + timeout;
    for (;;) {
      try {
        const v = fn();
        if (v) return v;
      } catch (e) { /* keep polling */ }
      if (Date.now() >= end) return null;
      await sleep(interval);
    }
  }

  function pickerButton() {
    return [...document.querySelectorAll('button')]
      .find((b) => (b.getAttribute('aria-label') || '').startsWith('Open mode picker'));
  }

  function currentLabel() {
    const b = pickerButton();
    return b ? (b.getAttribute('aria-label') || '') : '';
  }

  const isDone = () => SUCCESS.test(currentLabel());
  const menuOpen = () => !!document.querySelector('[role="menu"]');

  function modeItems() {
    return [...document.querySelectorAll('gem-menu-item[data-mode-id]')].filter(isVisible);
  }

  function argonItem() {
    return modeItems().find((el) => HAS_ARGON.test(textOf(el.querySelector('.label') || el)));
  }

  // "Thinking level" is NOT reliably classed `expandable` — the class comes and
  // goes between renders. Match it by its label text instead.
  function thinkingItem() {
    return [...document.querySelectorAll('gem-menu-item')]
      .filter((el) => !el.hasAttribute('data-mode-id') && isVisible(el))
      .find((el) => /^thinking level\b/i.test(textOf(el)));
  }

  function levelItems() {
    return [...document.querySelectorAll('gem-menu-item')]
      .filter((el) => !el.hasAttribute('data-mode-id') && isVisible(el))
      .filter((el) => /^(low|medium|high)\b/i.test(textOf(el)));
  }

  function highItem() {
    return levelItems().find((el) => /^high\b/i.test(textOf(el)));
  }

  // The Low/Medium/High rows only exist once "Thinking level" is opened. If they
  // are missing, open it and wait for the rows to render (poll, not sleep).
  async function ensureLevelRows() {
    if (levelItems().length) return true;
    const tl = thinkingItem();
    if (!tl) return false;
    tl.click();
    return !!(await waitFor(() => levelItems().length, 900));
  }

  async function openMenu() {
    if (menuOpen()) return true;
    const b = pickerButton();
    if (!isVisible(b)) return false;
    b.click();
    return !!(await waitFor(menuOpen, 900));
  }

  async function apply() {
    if (manualOverride || autoDone || inFlight) return;
    if (isDone()) {
      autoDone = true;
      stop();
      return;
    }
    if (!pickerButton()) return;

    inFlight = true;
    try {
      // Step 1 — make sure the Argon mode is selected.
      if (!HAS_ARGON.test(currentLabel())) {
        if (!(await openMenu())) return;
        const argon = await waitFor(argonItem, 900);
        if (argon) {
          argon.click();
          await waitFor(() => HAS_ARGON.test(currentLabel()), 900);
        }
        if (!HAS_ARGON.test(currentLabel())) return; // let the next tick retry
      }

      // Step 2 — force the thinking level to High.
      if (!HAS_HIGH.test(currentLabel())) {
        if (!(await openMenu())) return;
        if (!(await ensureLevelRows())) return; // let the next tick retry
        const hi = await waitFor(highItem, 900);
        if (hi) {
          hi.click();
          await waitFor(() => SUCCESS.test(currentLabel()), 900);
        }
      }

      if (isDone()) {
        autoDone = true;
        stop();
        return;
      }

      // Give up cleanly rather than thrashing: close the menu and stand down
      // after a few failed rounds, so the page is never left stuck open.
      if (++attempts >= MAX_ATTEMPTS) {
        closeMenu();
        autoDone = true;
        stop();
      }
    } finally {
      inFlight = false;
    }
  }

  function closeMenu() {
    if (!menuOpen()) return;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    document.body.click();
  }

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function schedule() {
    if (manualOverride || autoDone) {
      stop();
      return;
    }
    if (!timer) timer = setInterval(apply, RETRY_MS);
    apply();
  }

  // If the user picks a mode or a thinking level themselves, stand down for this page.
  function noteManualOverride(event) {
    if (!event.isTrusted) return;
    const t = event.target;
    if (!(t instanceof Element)) return;
    const item = t.closest('gem-menu-item');
    if (!item || !isVisible(item)) return;
    const txt = textOf(item);
    const isMode = item.hasAttribute('data-mode-id');
    const isLevel = /^(low|medium|high)\b/i.test(txt);
    if (isMode || isLevel) {
      manualOverride = true;
      stop();
    }
  }

  function start() {
    document.addEventListener('pointerdown', noteManualOverride, true);
    document.addEventListener('click', noteManualOverride, true);

    const wrap = (fn) => function (...args) {
      const r = fn.apply(this, args);
      setTimeout(schedule, 0);
      return r;
    };
    history.pushState = wrap(history.pushState);
    history.replaceState = wrap(history.replaceState);
    window.addEventListener('popstate', schedule);
    window.addEventListener('focus', schedule);

    // Angular re-renders the picker after load; keep watching until it settles.
    const obs = new MutationObserver(() => {
      if (!autoDone && !manualOverride) schedule();
    });
    obs.observe(document.body, { childList: true, subtree: true });

    schedule();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();

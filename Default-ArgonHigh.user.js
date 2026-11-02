// ==UserScript==
// @name         Default-ArgonHigh
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Automatically switches Gemini to 4 Argon at High thinking level on launch, and respects manual changes.
// @author       0xCosmosly
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

  const RETRY_MS = 800;
  const STEP_SETTLE_MS = 350;
  const SUCCESS = /currently\s+argon\s+high/i;
  const HAS_ARGON = /argon/i;
  const HAS_HIGH = /\bhigh\b/i;

  let inFlight = false;
  let autoDone = false;
  let manualOverride = false;
  let timer = null;

  const textOf = (el) => (el?.innerText || el?.textContent || '').replace(/\s+/g, ' ').trim();

  function isVisible(el) {
    if (!(el instanceof HTMLElement)) return false;
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

  function thinkingItem() {
    return [...document.querySelectorAll('gem-menu-item.expandable')]
      .filter(isVisible)
      .find((el) => /thinking level/i.test(textOf(el)));
  }

  function levelItems() {
    return [...document.querySelectorAll('gem-menu-item')]
      .filter((el) => !el.hasAttribute('data-mode-id') && isVisible(el))
      .filter((el) => /^(low|medium|high)\b/i.test(textOf(el)));
  }

  function highItem() {
    return levelItems().find((el) => /^high\b/i.test(textOf(el)));
  }

  async function openMenu() {
    if (menuOpen()) return true;
    const b = pickerButton();
    if (!isVisible(b)) return false;
    b.click();
    await sleep(STEP_SETTLE_MS);
    return menuOpen();
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
        const argon = argonItem();
        if (argon) {
          argon.click();
          await sleep(STEP_SETTLE_MS);
        }
        if (!HAS_ARGON.test(currentLabel())) return; // let the next tick retry
      }

      // Step 2 — force the thinking level to High.
      if (!HAS_HIGH.test(currentLabel())) {
        if (!(await openMenu())) return;
        const tl = thinkingItem();
        if (tl && !tl.classList.contains('expanded')) {
          tl.click();
          await sleep(STEP_SETTLE_MS);
        }
        const hi = highItem();
        if (hi) {
          hi.click();
          await sleep(STEP_SETTLE_MS);
        }
      }

      if (isDone()) {
        autoDone = true;
        stop();
      }
    } finally {
      inFlight = false;
    }
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

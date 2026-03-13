// ==UserScript==
// @name         Gemini Auto-Select Pro
// @namespace    gemini-auto-pro
// @version      0.9
// @description  Default Gemini web to Pro, then stop after your first manual mode change.
// @match        https://gemini.google.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const PICKER_SELECTOR = 'button[aria-label="Open mode picker"]';
  const MENUITEM_SELECTOR = 'button[role="menuitem"], [role="menuitem"]';
  const RETRY_MS = 1000;
  const ACTION_COOLDOWN_MS = 800;

  let inFlight = false;
  let lastActionAt = 0;
  let timer = null;
  let hasReachedPro = false;
  let manualControlTaken = false;

  function textOf(el) {
    return (el?.innerText || el?.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function isVisible(el) {
    if (!(el instanceof HTMLElement)) {
      return false;
    }
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') {
      return false;
    }
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function currentModeIsPro() {
    const picker = document.querySelector(PICKER_SELECTOR);
    return isVisible(picker) && /^pro\b/i.test(textOf(picker));
  }

  function isProMenuItem(el) {
    const text = textOf(el);
    return /^pro\b/i.test(text) && (
      /\b3\.1\s*pro\b/i.test(text) ||
      /advanced math and code/i.test(text)
    );
  }

  function findProItem() {
    return Array.from(document.querySelectorAll(MENUITEM_SELECTOR))
      .filter(isVisible)
      .find(isProMenuItem);
  }

  function stopSelection() {
    if (timer) {
      window.clearInterval(timer);
      timer = null;
    }
  }

  function resetSelection() {
    hasReachedPro = false;
    manualControlTaken = false;
  }

  async function attemptSelection() {
    if (manualControlTaken || inFlight) {
      return;
    }

    if (currentModeIsPro()) {
      hasReachedPro = true;
      return;
    }

    if (Date.now() - lastActionAt < ACTION_COOLDOWN_MS) {
      return;
    }

    inFlight = true;

    try {
      let proItem = findProItem();
      if (!proItem) {
        const picker = document.querySelector(PICKER_SELECTOR);
        if (isVisible(picker)) {
          picker.click();
          lastActionAt = Date.now();
          await new Promise((resolve) => window.setTimeout(resolve, 250));
        }
      }

      proItem = findProItem();
      if (proItem) {
        proItem.click();
        lastActionAt = Date.now();
      }
    } finally {
      inFlight = false;
    }
  }

  function schedule() {
    resetSelection();
    if (timer) {
      window.clearInterval(timer);
    }
    timer = window.setInterval(attemptSelection, RETRY_MS);
    attemptSelection();
  }

  function noteManualOverride(event) {
    if (!hasReachedPro || !event.isTrusted) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const control = target.closest(`${PICKER_SELECTOR}, ${MENUITEM_SELECTOR}`);
    if (control) {
      manualControlTaken = true;
      stopSelection();
    }
  }

  function handleRouteChange() {
    schedule();
  }

  function start() {
    const observer = new MutationObserver(() => {
      attemptSelection();
    });

    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['aria-expanded', 'aria-label'],
    });

    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
      const result = originalPushState.apply(this, args);
      window.setTimeout(handleRouteChange, 0);
      return result;
    };

    history.replaceState = function (...args) {
      const result = originalReplaceState.apply(this, args);
      window.setTimeout(handleRouteChange, 0);
      return result;
    };

    document.addEventListener('pointerdown', noteManualOverride, true);
    document.addEventListener('click', noteManualOverride, true);
    window.addEventListener('popstate', handleRouteChange);
    window.addEventListener('focus', attemptSelection);

    schedule();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();

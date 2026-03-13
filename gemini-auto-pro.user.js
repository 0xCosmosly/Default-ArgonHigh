// ==UserScript==
// @name         Gemini Auto-Select Pro
// @namespace    gemini-auto-pro
// @version      1.0
// @description  Default Gemini web to Pro on page load, then stop after the first successful cutover or any manual mode change.
// @match        https://gemini.google.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const PICKER_SELECTOR = 'button[aria-label="Open mode picker"]';
  const MENUITEM_SELECTOR = 'button[role="menuitem"], [role="menuitem"], [role="option"]';
  const RETRY_MS = 1000;
  const ACTION_COOLDOWN_MS = 800;
  let inFlight = false;
  let lastActionAt = 0;
  let timer = null;
  let autoDone = false;
  let manualOverride = false;

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

  function findPicker() {
    const exactPicker = document.querySelector(PICKER_SELECTOR);
    if (isVisible(exactPicker)) {
      return exactPicker;
    }

    return Array.from(document.querySelectorAll('button, [role="button"]'))
      .filter(isVisible)
      .find((el) => {
        const text = textOf(el);
        const hasPopup = el.getAttribute('aria-haspopup') === 'menu' || el.hasAttribute('aria-expanded');
        return (hasPopup || /^(fast|pro)\b/i.test(text)) && /^(fast|pro)\b/i.test(text);
      });
  }

  function currentModeIsPro() {
    const picker = findPicker();
    return isVisible(picker) && /^pro\b/i.test(textOf(picker));
  }

  function isProMenuItem(el) {
    const text = textOf(el);
    return /^pro\b/i.test(text);
  }

  function findProItem() {
    return Array.from(document.querySelectorAll(`${MENUITEM_SELECTOR}, button`))
      .filter(isVisible)
      .find(isProMenuItem);
  }

  function stopSelection() {
    if (timer) {
      window.clearInterval(timer);
      timer = null;
    }
  }

  async function attemptSelection() {
    if (manualOverride || autoDone || inFlight) {
      return;
    }

    if (currentModeIsPro()) {
      autoDone = true;
      stopSelection();
      return;
    }

    if (Date.now() - lastActionAt < ACTION_COOLDOWN_MS) {
      return;
    }

    inFlight = true;

    try {
      let proItem = findProItem();
      if (!proItem) {
        const picker = findPicker();
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
        await new Promise((resolve) => window.setTimeout(resolve, 250));
        if (currentModeIsPro()) {
          autoDone = true;
          stopSelection();
        }
      }
    } finally {
      inFlight = false;
    }
  }

  function schedule() {
    if (manualOverride || autoDone) {
      stopSelection();
      return;
    }

    if (!timer) {
      timer = window.setInterval(attemptSelection, RETRY_MS);
    }

    attemptSelection();
  }

  function noteManualOverride(event) {
    if (!event.isTrusted) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const modeItem = target.closest(MENUITEM_SELECTOR);
    if (!(modeItem instanceof Element) || !isVisible(modeItem)) {
      return;
    }

    const text = textOf(modeItem);
    if (!/^(fast|pro)\b/i.test(text)) {
      return;
    }

    manualOverride = true;
    stopSelection();
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
    window.addEventListener('focus', schedule);

    schedule();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();

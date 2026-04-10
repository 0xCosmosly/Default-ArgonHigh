// ==UserScript==
// @name         Default-GeminiPro
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Automatically switches Gemini to Pro/Advanced mode on launch, respects manual changes.
// @author       0xCosmosly
// @match        https://gemini.google.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=google.com
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

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
    if (!(el instanceof HTMLElement)) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function isTargetMode(text) {
    text = text.toLowerCase();
    // Match "Advanced" or "Pro", but explicitly exclude "Flash", "Fast", and "Thinking"
    return (text.includes('advanced') || text.includes('pro')) && 
           !text.includes('flash') && 
           !text.includes('fast') && 
           !text.includes('thinking');
  }

  function isAnyMode(text) {
    text = text.toLowerCase();
    return text.includes('advanced') || 
           text.includes('pro') || 
           text.includes('fast') || 
           text.includes('flash') || 
           text.includes('gemini') || 
           text.includes('thinking');
  }

  function findPicker() {
    // 1. Check known robust selectors
    const selectors = [
      'button[aria-label="Open mode picker"]',
      'button[aria-label*="mode picker"]',
      '[data-test-id="model-selector"]',
      'model-selector'
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (isVisible(el)) return el;
    }

    // 2. Fallback: find a visible button with a popup and mode text
    return Array.from(document.querySelectorAll('button, [role="button"], div[role="button"]'))
      .filter(isVisible)
      .find((el) => {
        const text = textOf(el).toLowerCase();
        const hasPopup = el.getAttribute('aria-haspopup') || el.hasAttribute('aria-expanded');
        
        // Exclude common false positives
        if (text.includes('share') || text.includes('conversation') || text.includes('history')) return false;
        
        return hasPopup && isAnyMode(text);
      });
  }

  function currentModeIsTarget() {
    const picker = findPicker();
    if (!isVisible(picker)) return false;
    return isTargetMode(textOf(picker));
  }

  function findTargetItem() {
    // Only look at menu items or options
    const items = Array.from(document.querySelectorAll('[role="menuitem"], [role="option"]'));
    return items.filter(isVisible).find(el => {
      const text = textOf(el);
      // Ensure the text is reasonably short so we don't accidentally click a previous conversation
      if (text.length > 50) return false;
      return isTargetMode(text);
    });
  }

  function stopSelection() {
    if (timer) {
      window.clearInterval(timer);
      timer = null;
    }
  }

  async function attemptSelection() {
    if (manualOverride || autoDone || inFlight) return;

    if (currentModeIsTarget()) {
      autoDone = true;
      stopSelection();
      return;
    }

    if (Date.now() - lastActionAt < ACTION_COOLDOWN_MS) return;

    inFlight = true;

    try {
      let targetItem = findTargetItem();
      if (!targetItem) {
        const picker = findPicker();
        if (isVisible(picker)) {
          picker.click();
          lastActionAt = Date.now();
          await new Promise((resolve) => window.setTimeout(resolve, 300));
        }
      }

      targetItem = findTargetItem();
      if (targetItem) {
        targetItem.click();
        lastActionAt = Date.now();
        await new Promise((resolve) => window.setTimeout(resolve, 300));
        
        // Verify success
        if (currentModeIsTarget()) {
          autoDone = true;
          stopSelection();
        } else {
          // If menu is still open but selection failed, close it
          if (document.activeElement) document.body.click();
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
      // Use setInterval so it continually attempts until it succeeds or user overrides
      timer = window.setInterval(attemptSelection, RETRY_MS);
    }
    attemptSelection();
  }

  function noteManualOverride(event) {
    if (!event.isTrusted) return;
    const target = event.target;
    if (!(target instanceof Element)) return;

    // Detect if the user clicks a mode in the menu
    const modeItem = target.closest('[role="menuitem"], [role="option"]');
    if (modeItem && isVisible(modeItem)) {
      const text = textOf(modeItem);
      if (text.length <= 50 && isAnyMode(text)) {
        manualOverride = true;
        stopSelection();
      }
    }
  }

  function start() {
    // Listeners for manual override
    document.addEventListener('pointerdown', noteManualOverride, true);
    document.addEventListener('click', noteManualOverride, true);
    
    // SPA routing listeners so it works when navigating within the same tab session
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    history.pushState = function (...args) {
      const result = originalPushState.apply(this, args);
      window.setTimeout(schedule, 0);
      return result;
    };
    history.replaceState = function (...args) {
      const result = originalReplaceState.apply(this, args);
      window.setTimeout(schedule, 0);
      return result;
    };
    window.addEventListener('popstate', schedule);
    window.addEventListener('focus', schedule);

    // Initial run
    schedule();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
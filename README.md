# Default Argon High — Auto-Select Gemini 4 Argon at High Thinking Level

**A free Tampermonkey userscript that makes Google Gemini open on `4 Argon` with `Thinking level: High` automatically — every new tab, no clicks.**

Gemini defaults to a fast, low-effort model. If you want the strongest reasoning on every chat, you normally have to open the model picker and set two things by hand: the **Argon** mode *and* the **High** thinking level. This userscript does both for you the moment the page loads, in about a second.

> **Short answer:** install this userscript in Tampermonkey, open `gemini.google.com`, and Gemini will already be on **Argon High**. If you switch modes yourself, it backs off and leaves you alone.

---

## What it does

- **Selects Gemini 4 Argon automatically** — the frontier reasoning model, not Flash or Pro.
- **Sets Thinking level to High** — the deepest reasoning setting, not the Low or Medium default.
- **Runs on every new tab and every reload** — no clicking the dropdown twice.
- **Respects manual changes** — pick a different model or level yourself and it stands down for that session.
- **Verifies instead of assuming** — it reads the picker's own label and only stops when it actually says `Argon High`.
- **Never phones home** — pure local DOM code, no network requests, no tracking, no analytics.

## Install

1. Install the [Tampermonkey extension](https://www.tampermonkey.net/) for Chrome, Brave, Edge, Firefox, Safari or Opera.
2. In Chrome or Brave 138+, open `chrome://extensions`, find Tampermonkey, and enable **Allow User Scripts**. Newer Chromium builds require this toggle before any userscript can run.
3. Open the raw script: **[Default-ArgonHigh.user.js](https://raw.githubusercontent.com/0xCosmosly/Default-ArgonHigh/main/Default-ArgonHigh.user.js)**
4. Tampermonkey shows an install prompt — click **Install**.
5. Open [gemini.google.com](https://gemini.google.com/app). It should land on **Argon High** on its own.

## Frequently asked questions

### What is Gemini 4 Argon?

Gemini 4 Argon is Google's frontier reasoning model, released in late 2026. It is built for complex software engineering, deep math and science, and multi-step agentic work, with a ~1M token context window. On the Gemini web app it appears in the model picker as **4 Argon — Complex tasks**.

### What does "Argon High" mean?

Gemini separates the *model* from the *thinking level*. Argon has three levels — **Low**, **Medium** (the default) and **High**. High spends the most tokens reasoning before answering, which is the setting Google, Artificial Analysis and Vals AI used for published Argon benchmarks. "Argon High" means Argon selected *and* thinking level set to High.

### Why does Gemini keep resetting to a faster model?

The Gemini web app remembers a mode per conversation, and new chats often start on a lighter default. This script re-applies Argon High on each page load so you never have to think about it.

### Does this use the Gemini API or cost money?

No. It only clicks the web app's own controls. There is no API key, no network request and no billing. It is a browser userscript, not an API client.

### Will it override my choices?

No. Once the page reaches Argon High the script stops. If you manually pick a different model or thinking level, it detects the click and stays out of your way until the next page load.

### Does it work with Greasemonkey or Violentmonkey?

Yes. It is a standard `@grant none` userscript with no Tampermonkey-specific APIs, so Greasemonkey, Violentmonkey and Tampermonkey all work.

### What happens when Google changes the UI?

The script verifies success against the picker's own `aria-label`, so a UI change cannot leave it in a half-applied state. If it cannot reach `Argon High` after several attempts, it closes the menu and stops quietly rather than looping.

### How fast is it?

About **1.3 seconds** from opening a tab to Argon High, and that includes the page load itself.

## How it works

The script waits for Gemini's model picker, opens it, selects the `4 Argon` row, reopens the picker, expands `Thinking level`, and chooses `High`. Each step polls for the element it needs every 40 ms instead of using fixed delays, which keeps the whole sequence under a second of visible activity.

Selectors were verified against the live Gemini UI:

| Element | Selector |
|---|---|
| Mode picker button | `button[aria-label^="Open mode picker"]` |
| Mode rows | `gem-menu-item[data-mode-id]`, label in `.label` |
| Thinking level row | `gem-menu-item` whose text starts with `Thinking level` |
| Level rows | `gem-menu-item` starting with `Low` / `Medium` / `High` |
| Success signal | picker `aria-label`, e.g. `currently Argon High` |

The script deliberately avoids generated CSS class names (`_ngcontent-ng-c…`), which change on every Google deploy, and matches text prefixes instead of exact strings.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Nothing happens | Enable **Allow User Scripts** on the Tampermonkey card in `chrome://extensions`, then reload the tab. |
| It switches to Argon but not High | Update to v2.1 or later — earlier versions relied on a CSS class that Gemini stopped emitting. |
| Menu opens but nothing is selected | Make sure your Google account has access to `4 Argon`; free tiers may not. |
| It stopped working after a Gemini update | Open an issue with the current `aria-label` of the mode picker button. |

## Compatibility

| | |
|---|---|
| **Tested on** | Brave 156 (Chromium 145), Gemini web app, November 2026 |
| **Browsers** | Any Chromium or Firefox build with Tampermonkey, Violentmonkey or Greasemonkey |
| **Matches** | `https://gemini.google.com/*` |
| **Permissions** | None — `@grant none`, no network access |
| **Version** | 2.2 |

## Changelog

- **2.2** — Poll for menu elements instead of fixed 450 ms waits; switch now completes in ~1.3 s.
- **2.1** — Fixed a stall when setting the thinking level: the `Thinking level` row is not reliably classed `expandable`, so the submenu often never opened. Also gives up cleanly after repeated failures.
- **2.0** — Retargeted from the retired Pro/Advanced mode to `4 Argon` + `High`. Renamed from `Default-GeminiPro`.

## License

MIT — see [LICENSE](./LICENSE).

---

*Previously published as `Default-GeminiPro`, which targeted Gemini's older Pro/Advanced mode.*

# Default Argon High ⚡

A lightweight Tampermonkey userscript that automatically switches Google Gemini to **4 Argon** at the **High** thinking level the moment the page loads.

No more clicking the dropdown twice every time you open a new tab.

## Features

- **Zero-Click Switch**: selects the `4 Argon` mode and sets `Thinking level → High` as soon as the UI is ready.
- **Respects Your Choices**: once the page reaches `Argon High`, the script gets out of the way. If you manually pick a different mode or level for that session, it won't fight you.
- **Self-Verifying**: after each step it re-reads the mode picker's own label and only stops when it actually says `Argon High`.
- **Completely Private**: everything happens locally in your browser. No data is sent anywhere.
- **SPA Support**: detects internal navigation and re-applies after a new chat loads.

## Getting Started

1. Install the [Tampermonkey](https://www.tampermonkey.net/) extension in your browser.
2. Make sure your Google account has access to `4 Argon`.
3. Open the raw version of [`Default-ArgonHigh.user.js`](./Default-ArgonHigh.user.js) in your browser.
4. Tampermonkey will prompt you to install it. Click **Install**.
5. Open `gemini.google.com` — it should snap to **Argon High**.

## Under the Hood

Pure frontend DOM manipulation. The script polls for the mode picker on load, opens it, picks `4 Argon`, reopens it, expands `Thinking level`, and picks `High`. It then verifies against the picker button's `aria-label` (`"Open mode picker, currently Argon High"`) and stops.

The selectors were verified against the live Gemini UI:

| Element | Selector |
|---|---|
| Mode picker button | `button[aria-label^="Open mode picker"]` |
| Mode rows | `gem-menu-item[data-mode-id]`, label `.label` |
| Thinking level | `gem-menu-item.expandable` containing `Thinking level` |
| Level rows | `gem-menu-item` starting with `Low` / `Medium` / `High` |
| Ground truth | picker `aria-label`, e.g. `currently Argon High` |

*Note: this relies on the current Gemini DOM. If Google changes their UI the selectors may need a tweak — but the success check fails safe: the script keeps retrying quietly rather than getting stuck in a wrong state.*

---

*Previously named `Default-GeminiPro`, which targeted the older Pro/Advanced mode.*

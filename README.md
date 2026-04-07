# Default Gemini Pro 🤖

A lightweight Tampermonkey userscript that automatically switches Google Gemini's mode picker to `Pro` the moment the page loads. 

No more clicking the dropdown every time you open a new tab!

## Features that make it great

- **Zero-Click Switch**: Automatically selects `Pro` mode as soon as the UI is ready.
- **Respects Your Choices**: Once the page reaches `Pro`, the script gets out of the way. If you manually switch back to `Fast` for that session, it won't fight you.
- **Completely Private**: Everything happens locally in your browser. No data is sent anywhere, and it only interacts with the visible page elements.

## Getting Started

1. Make sure you have the [Tampermonkey](https://www.tampermonkey.net/) extension installed in your browser.
2. Ensure your Google account actually has access to Gemini `Pro`.
3. Open the raw version of [`gemini-auto-pro.user.js`](./gemini-auto-pro.user.js) in your browser.
4. Tampermonkey will automatically prompt you to install it. Click **Install**.
5. Open `gemini.google.com` and watch it snap to Pro!

## Under the Hood

This is a pure frontend DOM-manipulation script. It aggressively polls for the mode picker on initial load, makes the switch, and then immediately disconnects itself to save resources. 

*Note: This script relies on the current CSS selectors of the Gemini web app. If Google updates their UI, the script may need a quick tweak to catch the new button names!*

---
*Created to save you one click, thousands of times.*

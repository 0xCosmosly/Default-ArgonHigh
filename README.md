# Gemini Auto-Select Pro

A Tampermonkey userscript for `gemini.google.com` that switches the mode picker to `Pro` when Gemini loads.

After the page reaches `Pro`, the script stops enforcing the setting so you can manually switch to `Fast` for the current page session.

## What it does

- Opens Gemini's mode picker after page load
- Selects the `Pro` option when it is available
- Stops interfering after it reaches `Pro` or after you manually change the mode

## What it does not do

- It does not bypass Gemini plan limits or access controls
- It does not persist a server-side account setting
- It does not support Gemini loaded inside sidebar or panel browser extensions
- It may break if Google changes Gemini's web UI

## Requirements

- A browser with the Tampermonkey extension installed
- Access to Gemini's `Pro` mode on your Google account
- A normal top-level Gemini tab at `https://gemini.google.com/*`

## Installation

### Option 1: Install from a local file

1. Open Tampermonkey in your browser.
2. Create a new script.
3. Replace the default contents with the contents of [`gemini-auto-pro.user.js`](./gemini-auto-pro.user.js).
4. Save the script.

### Option 2: Install from GitHub after publishing

1. Open the raw version of `gemini-auto-pro.user.js` from this repository in your browser.
2. Let Tampermonkey prompt you to install it.

## Behavior

- On a fresh Gemini load, the script retries until it can select `Pro`.
- Once `Pro` is active, the script stays idle.
- If you manually switch to another mode such as `Fast`, that manual choice is respected for the current page session.
- A new Gemini page load can switch back to `Pro` again.

## Privacy

- The script does not send data anywhere.
- It only reads and clicks elements already present on `gemini.google.com`.

## Repository notes

- The working folder used during development contained local screenshots from a real browser session.
- Those screenshots are excluded from Git via `.gitignore` and should not be published as-is.

## Limitations

- This script is intended for the normal Gemini web app in a regular browser tab.
- Sidebar, panel, or iframe-hosted Gemini sessions are not supported.
- Gemini's DOM can change without notice.
- The current selector logic targets the mode picker exposed by Gemini's current web UI.
- If Google renames the picker or the `Pro` option text, the script will need an update.

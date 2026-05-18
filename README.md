![SaIL logo](./sail.png)

# SaIL MinuteGen

MinuteGen is a lightweight browser-based tool for generating Word meeting summaries from a transcript and a `.docx` template.

It runs entirely from static files in the browser, uses a password gate to decrypt an Anthropic API key client-side, sends the transcript and template XML to Claude, and returns a downloadable `.docx` summary document.

## Features

- Upload meeting transcripts as `.pdf` or `.docx`
- Add optional context for tone, attendees, or focus areas
- Load a local Word template and reuse its formatting
- Generate a downloadable `.docx` output in the browser
- Password-gated access with client-side API key decryption
- Simple single-page interface with no build step

## Project Structure

```text
MinuteGen/
├── index.html      # App markup
├── styles.css      # App styling
├── app.js          # Browser logic, Anthropic request flow, DOCX generation
├── template.docx   # Source Word template used for generation
├── sail.png        # Branding asset
└── README.md
```

## How It Works

1. The user unlocks the app with a password.
2. The password is used in the browser to decrypt the stored Anthropic API key.
3. The app loads `template.docx` and extracts `word/document.xml`.
4. The user uploads a transcript file and optional notes.
5. The transcript and template XML are sent to Claude.
6. Claude returns a modified `document.xml`.
7. The app injects that XML back into the original `.docx` package and generates a download.

## Requirements

- A modern browser with support for:
  - Web Crypto API
  - `fetch`
  - `Blob` / `URL.createObjectURL`
- Internet access to:
  - Anthropic API
  - JSZip CDN
- The following files present in the same folder:
  - `index.html`
  - `styles.css`
  - `app.js`
  - `template.docx`
  - `sail.png`

## Usage

1. Open the app in the browser.
2. Enter the access password.
3. Upload a transcript in `.pdf` or `.docx` format.
4. Add any optional notes or context.
5. Click **Generate Summary**.
6. Download the generated Word document.

Generated files are named using the detected title from the XML and the current date in `dd-mm-yyyy` format.

## Configuration

The main configuration lives in `app.js`.

Key constants:

- `MODEL` — Anthropic model name used for generation
- `TEMPLATE_PATH` — path to the source Word template
- `PBKDF2_ITERS` — key derivation cost for password-based decryption


### Browser-side API usage

This project decrypts and uses the Anthropic API key in the browser. That may be acceptable for an internal tool, but it is not equivalent to a server-side secret-management model.


## Dependencies

External dependency currently loaded via CDN:

- [JSZip](https://stuk.github.io/jszip/) for reading and rebuilding `.docx` files


<img src="./MinuteGenThumb.png" alt="MinuteGen preview" width="50%">

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

## Setup

You can run MinuteGen either from GitHub Pages or from your own web server.

### Option 1: Fork or clone and publish with GitHub Pages

1. Fork this repository or clone it to your own GitHub account.
2. Make sure the root of the repository contains:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `template.docx`
   - `sail.png`
3. In GitHub, open **Settings** for the repository.
4. Go to **Pages**.
5. Set the source to deploy from the main branch root.
6. Save the settings and wait for GitHub Pages to publish the site.
7. Open the published GitHub Pages URL in your browser.

### Option 2: Download and host on your own web server

1. Download the repository as a ZIP or clone it locally.
2. Place all project files on your own static web server.
3. Make sure the files stay together in the same directory so the app can load `template.docx`, `styles.css`, `app.js`, and `sail.png` correctly.
4. Serve the folder over HTTP or HTTPS.
5. Open the hosted URL in your browser.

If you host this yourself, you will also need to reconfigure the API key functionality to use your own Anthropic credentials and deployment approach.

Opening `index.html` directly as a local `file://` page is not recommended, because some browsers restrict asset loading in that mode.

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

## License

This project is intended to be released under the MIT License.

The MIT License is a permissive open source license that allows people to use, copy, modify, merge, publish, distribute, sublicense, and sell the software, while providing the software "as is" without warranty or liability.

If you publish this repository, add an MIT `LICENSE` file alongside this README so the license terms are included formally in the repo.


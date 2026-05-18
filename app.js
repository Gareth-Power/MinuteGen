// -- ENCRYPTED CREDENTIALS ---------------------------------------------------
// API key encrypted with AES-256-GCM, key derived from password via PBKDF2
const ENCRYPTED = {
  salt: "D6Dnyq5F6iCBpiYcfOsxTF0Sbd6lE//TrTiwcfSS7S0=",
  iv:   "e23/RIZnacy+lCYt",
  tag:  "odzuKD2E4XW5OTWo8Gj4mg==",
  data: "sr2RmiZsXsfcNx/4lBe3PwaUdmNBRI/mOJjT5lSwMdMYCsqv4kvNuepR+iz8FJ9X20KgOzWCRsmZQsJNlxL7fck6yzB1TPGz90Sewkyxs0+t9qjJ5X/OzT1SkKKL+iGDr1RvNZdB21Fg3evQ"
};
const MODEL         = "claude-sonnet-4-6";
const TEMPLATE_PATH = "./template.docx";
const PBKDF2_ITERS  = 600000; // OWASP recommended minimum
// ---------------------------------------------------------------------------

let API_KEY             = null;
let templateDocXml      = null;
let _blobUrl            = null;
let templateArrayBuffer = null;
const logBox            = document.getElementById("logBox");

// -- Helpers -----------------------------------------------------------------
function b64ToBuffer(b64) {
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf;
}

function log(msg, type = "") {
  document.getElementById("status").style.display = "block";
  const el = document.createElement("span");
  el.className = `log-line ${type}`;
  el.textContent = msg;
  logBox.appendChild(el);
  logBox.scrollTop = logBox.scrollHeight;
  return el;
}

function logSpin(msg) {
  document.getElementById("status").style.display = "block";
  const el = document.createElement("span");
  el.className = "log-line spin";
  el.innerHTML = `<span class="spin-icon">⧗</span> ${msg}`;
  logBox.appendChild(el);
  logBox.scrollTop = logBox.scrollHeight;
  return el;
}

// -- Decrypt API key from password --------------------------------------------
async function decryptApiKey(password) {
  const enc      = new TextEncoder();
  const keyMat   = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
  const aesKey   = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: b64ToBuffer(ENCRYPTED.salt), iterations: PBKDF2_ITERS, hash: "SHA-256" },
    keyMat,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );

  // Combine ciphertext + auth tag for AES-GCM
  const cipherBuf = b64ToBuffer(ENCRYPTED.data);
  const tagBuf    = b64ToBuffer(ENCRYPTED.tag);
  const combined  = new Uint8Array(cipherBuf.length + tagBuf.length);
  combined.set(cipherBuf);
  combined.set(tagBuf, cipherBuf.length);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64ToBuffer(ENCRYPTED.iv) },
    aesKey,
    combined
  );

  return new TextDecoder().decode(decrypted);
}

// -- Password gate ------------------------------------------------------------
const pwInput   = document.getElementById("pwInput");
const pwError   = document.getElementById("pwError");
const unlockBtn = document.getElementById("unlockBtn");

async function tryUnlock() {
  const password = pwInput.value;
  if (!password) return;

  unlockBtn.disabled    = true;
  unlockBtn.textContent = "Verifying…";
  pwError.style.display = "none";
  pwInput.classList.remove("err");

  try {
    API_KEY = await decryptApiKey(password);
    // If decryption succeeded, show the app
    document.getElementById("gate").style.display = "none";
    const app = document.getElementById("app");
    app.classList.add("visible");
    app.style.opacity = "0";
    app.style.animation = "rise 0.4s ease forwards";
    loadTemplate();
  } catch {
    // Wrong password -- AES-GCM auth tag will fail
    API_KEY = null;
    pwInput.classList.add("err");
    pwError.style.display = "block";
    pwInput.value = "";
    pwInput.focus();
  } finally {
    unlockBtn.disabled    = false;
    unlockBtn.textContent = "Unlock";
  }
}

unlockBtn.addEventListener("click", tryUnlock);
pwInput.addEventListener("keydown", e => { if (e.key === "Enter") tryUnlock(); });

// Show/hide password toggle
document.getElementById("pwToggle").addEventListener("click", () => {
  pwInput.type = pwInput.type === "password" ? "text" : "password";
});

// -- Load template ------------------------------------------------------------
async function loadTemplate() {
  const pill = document.getElementById("templatePill");
  try {
    const res = await fetch(TEMPLATE_PATH);
    if (!res.ok) throw new Error(`template.docx not found (${res.status})`);
    const buf = await res.arrayBuffer();
    templateArrayBuffer = buf.slice(0);
    // Extract document.xml -- Claude will edit this directly
    const zip = await JSZip.loadAsync(templateArrayBuffer);
    templateDocXml = await zip.file("word/document.xml").async("text");
    pill.className = "pill ok";
    pill.innerHTML = `<span class="dot"></span>template ready`;
    document.getElementById("generateBtn").disabled = false;
  } catch (e) {
    pill.className = "pill err";
    pill.innerHTML = `<span class="dot"></span>${e.message}`;
  }
}

// -- Drop zone ----------------------------------------------------------------
(function () {
  const zone  = document.getElementById("dropZone");
  const input = document.getElementById("transcriptFile");
  const label = document.getElementById("fileName");

  function set(file) {
    if (!file) return;
    const name = file.name.toLowerCase();
    if (!name.endsWith(".pdf") && !name.endsWith(".docx")) return;
    label.textContent = "✓  " + file.name;
    zone.classList.add("filled");
    zone.querySelector(".drop-icon").textContent = "✅";
  }

  input.addEventListener("change", () => set(input.files[0]));
  zone.addEventListener("dragover",  e => { e.preventDefault(); zone.classList.add("dragging"); });
  zone.addEventListener("dragleave", () => zone.classList.remove("dragging"));
  zone.addEventListener("drop", e => {
    e.preventDefault();
    zone.classList.remove("dragging");
    const file = e.dataTransfer.files[0];
    if (file) {
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      set(file);
    }
  });
})();

// -- Read PDF as base64 ------------------------------------------------------
async function readPdfAsBase64(file) {
  const buf   = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary  = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

// -- Extract plain text from .docx -------------------------------------------
async function readDocxAsText(file) {
  const buf = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);
  const xml = await zip.file("word/document.xml").async("text");
  // Strip all XML tags, collapse whitespace, preserve paragraph breaks
  return xml
    .replace(/<w:br\b[^>]*\/>/gi, "\n")
    .replace(/<\/w:p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// -- Claude call --------------------------------------------------------------
// transcript: { type: 'pdf', data: base64String } | { type: 'text', data: string }
async function callClaude(transcript, comments) {
  const system = `You are a Word document editor. You will receive:
1. TEMPLATE_XML -- the Word document.xml of a meeting minutes template. It contains example/placeholder content.
2. TRANSCRIPT -- the actual meeting to be minuted.

Return ONLY the complete, modified document.xml where:
- Every XML tag, attribute, namespace, and formatting element (w:rPr, w:pPr, w:tblPr, w:pStyle, etc.) is preserved exactly as-is
- Never rename, replace, drop, or invent any XML tag names or namespace prefixes (for example, never change <w:t> to <t>)
- The w:sectPr element is preserved exactly as-is
- Text within <w:t> elements is replaced with real content from the TRANSCRIPT
- Paragraphs may be added or removed to fit the content by copying the XML pattern of adjacent paragraphs
- When duplicating paragraphs, remove any w14:paraId and w14:textId attributes (Word will regenerate them)
- Content comes exclusively from the TRANSCRIPT -- never copy example text from the template
- Sections with no relevant transcript content contain a single paragraph with the text "Nothing to report."

Return raw XML only. Start your response with <?xml or <w:document. No markdown, no explanation.`;

  const transcriptBlock = transcript.type === "pdf"
    ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: transcript.data } }
    : { type: "text", text: transcript.data };

  const userContent = [
    { type: "text", text: "TEMPLATE_XML -- preserve all formatting, replace only the content:" },
    { type: "document", source: { type: "text", media_type: "text/plain", data: templateDocXml } },
    { type: "text", text: "TRANSCRIPT -- all meeting content must come from this:" },
    transcriptBlock,
    ...(comments ? [{ type: "text", text: `Additional context: ${comments}` }] : []),
    { type: "text", text: "Return the complete modified document.xml now. Raw XML only." }
  ];

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "output-128k-2025-02-19",
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify({ model: MODEL, max_tokens: 32000, system, messages: [{ role: "user", content: userContent }] })
  });

  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error?.message || `HTTP ${res.status}`);
  }

  const data = await res.json();
  let xml = data.content.map(b => b.text || "").join("");
  // Strip markdown fences if present
  xml = xml.replace(/^```xml\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
  if (!xml.startsWith("<?xml") && !xml.startsWith("<w:document")) {
    const candidates = [xml.indexOf("<?xml"), xml.indexOf("<w:document")].filter(i => i !== -1);
    if (candidates.length === 0) throw new Error("Claude did not return XML. Got: " + xml.substring(0, 200));
    xml = xml.substring(Math.min(...candidates));
  }
  return xml;
}

// -- Generate -----------------------------------------------------------------
document.getElementById("generateBtn").addEventListener("click", async () => {
  const input    = document.getElementById("transcriptFile");
  const comments = document.getElementById("comments").value.trim();

  if (!input.files[0]) return alert("Please upload a transcript.");
  if (!templateDocXml) return alert("Template not loaded yet.");

  const btn = document.getElementById("generateBtn");
  btn.disabled = true;
  btn.textContent = "Generating…";
  document.getElementById("downloadSection").style.display = "none";
  logBox.innerHTML = "";

  try {
    log("Reading transcript…");
    const file = input.files[0];
    let transcript;
    if (file.name.toLowerCase().endsWith(".docx")) {
      const text = await readDocxAsText(file);
      log(`Transcript ready (${(text.length / 1024).toFixed(0)} KB text)`, "ok");
      transcript = { type: "text", data: text };
    } else {
      const b64 = await readPdfAsBase64(file);
      log(`Transcript ready (${(b64.length * 0.75 / 1024).toFixed(0)} KB)`, "ok");
      transcript = { type: "pdf", data: b64 };
    }

    log("Calling Claude…");
    const spinEl = logSpin("Building -- this can take a few minutes…");
    const newDocXml = await callClaude(transcript, comments);
    spinEl.className = "log-line ok";
    spinEl.innerHTML = `✓ Done (${(newDocXml.length / 1024).toFixed(0)} KB)`;
    log(`XML received (${(newDocXml.length / 1024).toFixed(0)} KB)`, "ok");

    log("Building document…");
    const zip = await JSZip.loadAsync(templateArrayBuffer.slice(0));
    zip.file("word/document.xml", newDocXml);
    const blob = await zip.generateAsync({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      compression: "DEFLATE"
    });
    if (_blobUrl) { URL.revokeObjectURL(_blobUrl); }
    _blobUrl = URL.createObjectURL(blob);

    const link = document.getElementById("downloadLink");
    link.href = _blobUrl;
    const titleMatch = newDocXml.match(/<w:t[^>]*>([^<]{3,})<\/w:t>/);
    const title = titleMatch ? titleMatch[1].trim().replace(/[\\/:*?"<>|]/g, "-") : "summary";
    const date = new Intl.DateTimeFormat("en-GB").format(new Date()).replace(/\//g, "-");
    link.download = `${title} - ${date}.docx`;
    document.getElementById("downloadSection").style.display = "block";
    log("Done.", "ok");

  } catch (e) {
    log(`Error: ${e.message}`, "err");
    console.error(e);
  } finally {
    btn.disabled = false;
    btn.textContent = "Generate Summary";
  }
});

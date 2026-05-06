// ============================================================
//  ImageSharp Server Demo — main.js
//  Pure fetch() calls to ASP.NET Core Minimal API endpoints.
//  No .NET runtime in the browser — ImageSharp runs server-side.
// ============================================================

// ── State ───────────────────────────────────────────────────
let originalFile = null;     // the File object from the input
let originalBytes = null;    // Uint8Array of original image
let currentBlob = null;      // last processed result blob
let currentMimeType = 'image/jpeg';
let requestCount = 0;

// ── Helpers ──────────────────────────────────────────────────
function setStatus(msg) {
    document.getElementById('status').textContent = msg;
}

function showProcessing(label = 'Sending to server…') {
    document.getElementById('processingLabel').textContent = label;
    document.getElementById('processingOverlay').classList.add('active');
}

function hideProcessing() {
    document.getElementById('processingOverlay').classList.remove('active');
}

function getQuality() {
    return parseInt(document.getElementById('quality').value, 10);
}

function logRequest(method, endpoint, ms, ok) {
    const log = document.getElementById('requestLog');
    if (requestCount === 0) log.innerHTML = '';
    requestCount++;
    const entry = document.createElement('div');
    entry.className = 'entry';
    entry.innerHTML = ok
        ? `<span class="method">${method}</span> ${endpoint} — <span class="ms">${ms}ms</span>`
        : `<span class="method">${method}</span> ${endpoint} — <span class="err">failed</span>`;
    log.prepend(entry);
}

function displayProcessed(blob, mimeType) {
    currentBlob = blob;
    currentMimeType = mimeType;

    const url = URL.createObjectURL(blob);
    const img = document.getElementById('processedImg');
    img.src = url;
    img.style.display = 'block';
    document.getElementById('processedPlaceholder').style.display = 'none';

    document.getElementById('btnDownloadCurrent').disabled = false;
    document.getElementById('btnDownloadPng').disabled = false;
    document.getElementById('btnDownloadWebp').disabled = false;
}

function enableControls() {
    // Added 'btnOilPaint' to the list of enabled controls
    ['btnFlipH', 'btnFlipV', 'btnRotate90', 'btnRotate180',
        'btnGreyscale', 'btnSepia', 'btnBlur', 'btnSharpen', 'btnOilPaint',
        'btnResize', 'btnBrightness', 'btnReset'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.disabled = false;
        });
}

// ── Core API call ─────────────────────────────────────────────
async function callApi(label, endpoint, params = {}, mimeType = 'image/jpeg') {
    if (!originalBytes) return;

    const url = new URL(endpoint, location.origin);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    showProcessing(`POST ${endpoint}`);
    setStatus(`→ ${label}…`);

    const t0 = performance.now();
    let ok = false;

    try {
        const response = await fetch(url.toString(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/octet-stream' },
            body: originalBytes
        });

        const ms = Math.round(performance.now() - t0);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const blob = await response.blob();
        ok = true;
        logRequest('POST', endpoint, ms, true);
        displayProcessed(blob, mimeType);
        setStatus(`✅ ${label} — ${ms}ms (${(blob.size / 1024).toFixed(1)} KB)`);
    } catch (err) {
        const ms = Math.round(performance.now() - t0);
        logRequest('POST', endpoint, ms, false);
        setStatus(`❌ ${label} failed: ${err.message}`);
        console.error(err);
    } finally {
        hideProcessing();
    }
}

// ── File loading ──────────────────────────────────────────────
async function loadFile(file) {
    if (!file || !file.type.startsWith('image/')) {
        setStatus('❌ Please drop a valid image file');
        return;
    }

    originalFile = file;
    const buffer = await file.arrayBuffer();
    originalBytes = new Uint8Array(buffer);

    const url = URL.createObjectURL(file);
    const img = document.getElementById('originalImg');
    img.src = url;
    img.style.display = 'block';
    document.getElementById('originalPlaceholder').style.display = 'none';

    try {
        const t0 = performance.now();
        const res = await fetch('/process/metadata', {
            method: 'POST',
            headers: { 'Content-Type': 'application/octet-stream' },
            body: originalBytes
        });
        const ms = Math.round(performance.now() - t0);
        const meta = await res.json();
        logRequest('POST', '/process/metadata', ms, true);

        document.getElementById('metadata').innerHTML = `
            <span class="key">Format </span><span class="val">${meta.format}</span><br/>
            <span class="key">Width  </span><span class="val">${meta.width}px</span><br/>
            <span class="key">Height </span><span class="val">${meta.height}px</span><br/>
            <span class="key">Frames </span><span class="val">${meta.frames}</span><br/>
            <span class="key">Size   </span><span class="val">${meta.sizeKb} KB</span>
        `;

        const w = Math.min(meta.width, 2000);
        document.getElementById('resizeWidth').value = w;
        document.getElementById('resizeWidthOut').textContent = w + 'px';
    } catch {
        document.getElementById('metadata').textContent = 'Could not read metadata';
    }

    enableControls();
    setStatus(`✅ Loaded "${file.name}" — choose a processing option`);

    document.getElementById('processedImg').style.display = 'none';
    document.getElementById('processedPlaceholder').style.display = 'block';
    currentBlob = null;
    ['btnDownloadCurrent', 'btnDownloadPng', 'btnDownloadWebp'].forEach(id => {
        document.getElementById(id).disabled = true;
    });
}

// ── Drop zone ──────────────────────────────────────────────────
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');

dropzone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', e => loadFile(e.target.files[0]));
dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('drag-over'); });
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
dropzone.addEventListener('drop', e => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    loadFile(e.dataTransfer.files[0]);
});

// ── Sliders ────────────────────────────────────────────────────
document.getElementById('resizeWidth').addEventListener('input', e => {
    document.getElementById('resizeWidthOut').textContent = e.target.value + 'px';
});
document.getElementById('brightness').addEventListener('input', e => {
    document.getElementById('brightnessOut').textContent = e.target.value;
});
document.getElementById('contrast').addEventListener('input', e => {
    document.getElementById('contrastOut').textContent = e.target.value;
});
document.getElementById('quality').addEventListener('input', e => {
    document.getElementById('qualityOut').textContent = e.target.value;
});

// ── Buttons → API calls ────────────────────────────────────────
document.getElementById('btnGreyscale').addEventListener('click', () =>
    callApi('Greyscale', '/process/greyscale', { quality: getQuality() })
);
document.getElementById('btnSepia').addEventListener('click', () =>
    callApi('Sepia', '/process/sepia', { quality: getQuality() })
);
document.getElementById('btnFlipH').addEventListener('click', () =>
    callApi('Flip Horizontal', '/process/flip', { h: true, quality: getQuality() })
);
document.getElementById('btnFlipV').addEventListener('click', () =>
    callApi('Flip Vertical', '/process/flip', { v: true, quality: getQuality() })
);
document.getElementById('btnRotate90').addEventListener('click', () =>
    callApi('Rotate 90°', '/process/rotate', { degrees: 90, quality: getQuality() })
);
document.getElementById('btnRotate180').addEventListener('click', () =>
    callApi('Rotate 180°', '/process/rotate', { degrees: 180, quality: getQuality() })
);
document.getElementById('btnBlur').addEventListener('click', () =>
    callApi('Gaussian Blur', '/process/blur', { sigma: 3, quality: getQuality() })
);
document.getElementById('btnSharpen').addEventListener('click', () =>
    callApi('Sharpen', '/process/sharpen', { sigma: 3, quality: getQuality() })
);

// Click listener for the new Oil Paint button
document.getElementById('btnOilPaint').addEventListener('click', () =>
    callApi('Oil Paint', '/process/oil-paint', { radius: 4, quality: getQuality() })
);

document.getElementById('btnResize').addEventListener('click', () => {
    const w = document.getElementById('resizeWidth').value;
    callApi(`Resize to ${w}px`, '/process/resize', { maxWidth: w, quality: getQuality() });
});
document.getElementById('btnBrightness').addEventListener('click', () => {
    const b = document.getElementById('brightness').value;
    const c = document.getElementById('contrast').value;
    callApi(`Brightness ${b} / Contrast ${c}`, '/process/brightness-contrast',
        { brightness: b, contrast: c, quality: getQuality() });
});

document.getElementById('btnReset').addEventListener('click', () => {
    document.getElementById('processedImg').style.display = 'none';
    document.getElementById('processedPlaceholder').style.display = 'block';
    currentBlob = null;
    ['btnDownloadCurrent', 'btnDownloadPng', 'btnDownloadWebp'].forEach(id => {
        document.getElementById(id).disabled = true;
    });
    setStatus('Reset — original image retained');
});

// ── Downloads ──────────────────────────────────────────────────
function triggerDownload(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
}

document.getElementById('btnDownloadCurrent').addEventListener('click', () => {
    if (currentBlob) {
        const ext = currentMimeType.split('/')[1];
        triggerDownload(currentBlob, `imagesharp-output.${ext}`);
    }
});

document.getElementById('btnDownloadPng').addEventListener('click', async () => {
    if (!originalBytes) return;
    showProcessing('Converting to PNG on server…');
    try {
        const t0 = performance.now();
        const res = await fetch('/process/convert/png', {
            method: 'POST',
            headers: { 'Content-Type': 'application/octet-stream' },
            body: originalBytes
        });
        const blob = await res.blob();
        logRequest('POST', '/process/convert/png', Math.round(performance.now() - t0), true);
        triggerDownload(blob, 'imagesharp-output.png');
        setStatus('✅ PNG downloaded');
    } finally { hideProcessing(); }
});

document.getElementById('btnDownloadWebp').addEventListener('click', async () => {
    if (!originalBytes) return;
    showProcessing('Converting to WebP on server…');
    try {
        const t0 = performance.now();
        const res = await fetch(`/process/convert/webp?quality=${getQuality()}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/octet-stream' },
            body: originalBytes
        });
        const blob = await res.blob();
        logRequest('POST', '/process/convert/webp', Math.round(performance.now() - t0), true);
        triggerDownload(blob, 'imagesharp-output.webp');
        setStatus('✅ WebP downloaded');
    } finally { hideProcessing(); }
});
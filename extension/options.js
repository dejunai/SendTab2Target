const MAX_TARGETS = 6;

function createRow(idx, data) {
  const div = document.createElement('div');
  div.className = 'target';
  const safeName = (data.name || '').replace(/"/g, '&quot;');
  const safePath = (data.browserPath || '').replace(/"/g, '&quot;');
  div.innerHTML = `
    <label>Target ${idx + 1}</label>
    <div class="row">
      <input type="text" class="name" placeholder="Display name (e.g., Chrome, Firefox)" value="${safeName}" />
      <button class="test" data-idx="${idx}">Test</button>
    </div>
    <label>Browser Path</label>
    <input type="text" class="path" placeholder="e.g., C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" value="${safePath}" />
    <div class="row-status" style="display:none; margin-top: 8px; font-size: 12px; padding: 6px; border-radius: 3px;"></div>
  `;
  return div;
}

function load() {
  chrome.storage.local.get({ targets: [] }, (items) => {
    const container = document.getElementById('targets');
    container.innerHTML = '';
    const targets = items.targets || [];
    for (let i = 0; i < MAX_TARGETS; i++) {
      const t = targets[i] || { name: '', browserPath: '' };
      container.appendChild(createRow(i, t));
    }
    attachTestListeners();
  });
}

function attachTestListeners() {
  document.querySelectorAll('button.test').forEach(btn => {
    btn.addEventListener('click', () => testTarget(parseInt(btn.getAttribute('data-idx'), 10)));
  });
}

function testTarget(idx) {
  const container = document.getElementById('targets');
  const rows = container.querySelectorAll('.target');
  const row = rows[idx];
  const name = row.querySelector('.name').value.trim();
  let browserPath = row.querySelector('.path').value.trim();

  // Auto-clean pasted paths: remove surrounding quotes and duplicate backslashes
  browserPath = browserPath.replace(/^"|"$/g, '').replace(/\\\\/g, '\\');
  row.querySelector('.path').value = browserPath;

  const statusDiv = row.querySelector('.row-status');
  const showRowStatus = (msg, type) => {
    statusDiv.textContent = msg;
    statusDiv.className = `row-status status-${type}`;
    statusDiv.style.display = 'block';
    setTimeout(() => { statusDiv.style.display = 'none'; }, 5000);
  };

  if (!name && !browserPath) {
    showRowStatus('Please enter at least a display name or path', 'error');
    return;
  }

  if (browserPath && !isValidPath(browserPath)) {
    showRowStatus('Invalid path format', 'error');
    return;
  }

  const testUrl = 'about:blank';
  chrome.runtime.sendNativeMessage('com.browser.bridge', { url: testUrl, browser: browserPath || null }, (response) => {
    if (chrome.runtime.lastError) {
      showRowStatus(`Test failed: ${chrome.runtime.lastError.message}`, 'error');
    } else if (response && response.status === 'success') {
      showRowStatus(`Test succeeded: ${name || 'Target'} opened successfully`, 'success');
    } else {
      showRowStatus(`Test failed: ${response && response.error || 'Unknown error'}`, 'error');
    }
  });
}

function isValidPath(p) {
  return /^[A-Za-z]:[\\/]|^\//.test(p);
}

function showStatus(msg, type) {
  const status = document.getElementById('status');
  status.textContent = msg;
  status.className = `status-${type}`;
  status.style.display = 'block';
  setTimeout(() => { status.style.display = 'none'; }, 5000);
}

function save() {
  const container = document.getElementById('targets');
  const rows = container.querySelectorAll('.target');
  const targets = [];
  let hasErrors = false;

  rows.forEach(r => {
    const name = r.querySelector('.name').value.trim();
    let browserPath = r.querySelector('.path').value.trim();
    
    // Auto-clean pasted paths before saving
    browserPath = browserPath.replace(/^"|"$/g, '').replace(/\\\\/g, '\\');
    r.querySelector('.path').value = browserPath;

    if (browserPath && !isValidPath(browserPath)) {
      showStatus('Invalid path format in one or more targets', 'error');
      hasErrors = true;
      return;
    }
    if (name || browserPath) targets.push({ name, browserPath });
  });

  if (hasErrors) return;

  chrome.storage.local.set({ targets }, () => {
    showStatus('Saved successfully', 'success');
  });
}

function restoreDefaults() {
  const defaults = [];
  chrome.storage.local.set({ targets: defaults }, () => {
    load();
  });
}

document.getElementById('save').addEventListener('click', save);
document.getElementById('restore').addEventListener('click', restoreDefaults);
window.addEventListener('load', load);

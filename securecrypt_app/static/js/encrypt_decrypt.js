// ---------- Mode toggle ----------
const encryptModeBtn = document.getElementById('encryptModeBtn');
const decryptModeBtn = document.getElementById('decryptModeBtn');
const actionBtn = document.getElementById('actionBtn');
const dropZoneText = document.getElementById('dropZoneText');
const passwordLabel = document.getElementById('passwordLabel');

let mode = 'encrypt'; // or 'decrypt'

function setMode(newMode){
  mode = newMode;
  encryptModeBtn.classList.toggle('active', mode === 'encrypt');
  decryptModeBtn.classList.toggle('active', mode === 'decrypt');
  actionBtn.textContent = mode === 'encrypt' ? 'Encrypt file' : 'Decrypt file';
  dropZoneText.textContent = mode === 'encrypt'
    ? 'Drop a file here, or click to browse'
    : 'Drop a .enc file here, or click to browse';
  passwordLabel.textContent = mode === 'encrypt' ? 'Password' : 'Password used to encrypt';
  setStatus('', '');
}
encryptModeBtn.addEventListener('click', () => setMode('encrypt'));
decryptModeBtn.addEventListener('click', () => setMode('decrypt'));

// ---------- Password visibility ----------
document.getElementById('toggleVisibility').addEventListener('click', () => {
  const pw = document.getElementById('password');
  pw.type = pw.type === 'password' ? 'text' : 'password';
});

// ---------- File handling ----------
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileChip = document.getElementById('fileChip');
const fileNameEl = document.getElementById('fileName');
const clearFileBtn = document.getElementById('clearFile');
let currentFile = null;

dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drag');
  if (e.dataTransfer.files.length) setFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', () => { if (fileInput.files.length) setFile(fileInput.files[0]); });

clearFileBtn.addEventListener('click', () => {
  currentFile = null;
  fileInput.value = '';
  fileChip.style.display = 'none';
  setStatus('', '');
});

function setFile(file){
  currentFile = file;
  fileNameEl.textContent = file.name;
  fileChip.style.display = 'flex';
  setStatus('', '');
}

// ---------- Status line ----------
const statusLine = document.getElementById('statusLine');
const statusText = document.getElementById('statusText');

function setStatus(msg, type, loading = false){
  statusText.textContent = msg;
  statusLine.className = 'status-line' + (type ? ' ' + type : '') + (loading ? ' loading' : '');
}

// ---------- Web Crypto helpers ----------
async function deriveKey(password, salt, usage){
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 150000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    [usage]
  );
}

function downloadBlob(blob, filename){
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

async function logActivity(filename, action){
  try {
    await fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, action })
    });
  } catch (err){
    console.error('Failed to log activity', err);
  }
}

// ---------- Encrypt ----------
async function encryptFile(){
  const password = document.getElementById('password').value;
  if (!currentFile) return setStatus('Choose a file first.', 'err');
  if (!password) return setStatus('Enter a password.', 'err');

  try {
    setStatus('Encrypting…', '', true);
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(password, salt, 'encrypt');
    const fileBuffer = await currentFile.arrayBuffer();
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, fileBuffer);

    // package: [salt(16)][iv(12)][nameLen(2)][name][ciphertext]
    const nameBytes = new TextEncoder().encode(currentFile.name);
    const header = new Uint8Array(16 + 12 + 2 + nameBytes.length);
    header.set(salt, 0);
    header.set(iv, 16);
    header[28] = nameBytes.length & 0xff;
    header[29] = (nameBytes.length >> 8) & 0xff;
    header.set(nameBytes, 30);

    const combined = new Blob([header, encrypted], { type: 'application/octet-stream' });
    downloadBlob(combined, currentFile.name + '.enc');
    setStatus('Encrypted successfully. File downloaded as ' + currentFile.name + '.enc', 'ok');
    await logActivity(currentFile.name, 'encrypt');
  } catch (err){
    console.error(err);
    setStatus('Encryption failed. Please try again.', 'err');
  }
}

// ---------- Decrypt ----------
async function decryptFile(){
  const password = document.getElementById('password').value;
  if (!currentFile) return setStatus('Choose a .enc file first.', 'err');
  if (!password) return setStatus('Enter the password.', 'err');

  try {
    setStatus('Decrypting…', '', true);
    const buffer = await currentFile.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const salt = bytes.slice(0, 16);
    const iv = bytes.slice(16, 28);
    const nameLen = bytes[28] | (bytes[29] << 8);
    const nameBytes = bytes.slice(30, 30 + nameLen);
    const originalName = new TextDecoder().decode(nameBytes);
    const ciphertext = bytes.slice(30 + nameLen);

    const key = await deriveKey(password, salt, 'decrypt');
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);

    const blob = new Blob([decrypted]);
    downloadBlob(blob, originalName || 'decrypted-file');
    setStatus('Decrypted successfully. File downloaded as ' + (originalName || 'decrypted-file'), 'ok');
    await logActivity(originalName || currentFile.name, 'decrypt');
  } catch (err){
    console.error(err);
    setStatus('Decryption failed. Wrong password or corrupted file.', 'err');
  }
}

actionBtn.addEventListener('click', () => {
  if (mode === 'encrypt') encryptFile();
  else decryptFile();
});

// ---------- Logout (shared with dashboard) ----------
document.getElementById('logoutBtn').addEventListener('click', async () => {
  try {
    const res = await fetch('/api/logout', { method: 'POST' });
    const data = await res.json();
    window.location.href = data.redirect || '/login';
  } catch (err){
    console.error(err);
    window.location.href = '/login';
  }
});

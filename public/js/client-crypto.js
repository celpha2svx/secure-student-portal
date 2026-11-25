// --- 1. CRYPTO HELPERS & METRICS ---
const enc = new TextEncoder();
const dec = new TextDecoder();
const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
const unhex = h => Uint8Array.from(h.match(/../g), x => parseInt(x, 16));
const rnd = n => hex(crypto.getRandomValues(new Uint8Array(n)));
const sha256 = async d => hex(await crypto.subtle.digest('SHA-256', typeof d === 'string' ? enc.encode(d) : d));
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

window.cryptoMetrics = { hashTimes: [], encTimes: [] };

async function deriveKey(password, saltHex) {
    const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: unhex(saltHex), iterations: 100000, hash: 'SHA-256' }, keyMaterial, 512);
    return { verifier: hex(bits.slice(0, 32)), aesKeyBits: bits.slice(32) };
}

// --- 2. UI NAVIGATION ---
function show(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === id));
    document.querySelectorAll('[data-go]').forEach(b => b.classList.toggle('on', b.dataset.go === id));
    window.scrollTo(0, 0);
    
    if (id === 'db' && typeof loadDatabaseExplorer === 'function') loadDatabaseExplorer();
    if (id === 'perf' && typeof loadAuditAndPerformance === 'function') loadAuditAndPerformance();
}

document.addEventListener('click', e => {
    const go = e.target.closest('[data-go]');
    if (go) { show(go.dataset.go); return; }
    
    const tab = e.target.closest('[data-tab]');
    if (tab) {
        document.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t.dataset.tab === tab.dataset.tab));
        document.getElementById('form-register').hidden = tab.dataset.tab !== 'register';
        document.getElementById('form-login').hidden = tab.dataset.tab !== 'login';
        return;
    }
});

// --- 3. REGISTRATION ---
document.getElementById('form-register').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.textContent = "Encrypting..."; btn.disabled = true;

    const username = document.getElementById('r-user').value;
    const password = document.getElementById('r-pass').value;
    const plaintextData = document.getElementById('r-fee').value;

    try {
        const t0 = performance.now();
        const salt = rnd(16);
        const { verifier, aesKeyBits } = await deriveKey(password, salt);
        window.cryptoMetrics.hashTimes.push(performance.now() - t0);

        const key = await crypto.subtle.importKey('raw', aesKeyBits, { name: 'AES-GCM' }, false, ['encrypt']);
        const iv = crypto.getRandomValues(new Uint8Array(12));
        
        const t1 = performance.now();
        const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintextData));
        window.cryptoMetrics.encTimes.push(performance.now() - t1);
        
        const integrity_hash = await sha256(ciphertext);

        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password_hash: verifier, salt, encrypted_data: hex(ciphertext), iv: hex(iv), integrity_hash })
        });

        const result = await response.json();
        
        if (result.success) {
            document.getElementById('auth-result').innerHTML = `
                <div class="msg ok" style="margin-top:20px">
                    <b>✓ Registration Successful.</b> Server stored the ciphertext and verifier. The plaintext was never sent.
                </div>`;
            e.target.reset();
        } else {
            document.getElementById('auth-result').innerHTML = `<div class="msg bad" style="margin-top:20px">Error: ${result.error}</div>`;
        }
    } catch (err) {
        console.error(err);
        document.getElementById('auth-result').innerHTML = `<div class="msg bad" style="margin-top:20px">Cryptographic Error.</div>`;
    } finally {
        btn.textContent = "Encrypt & Store Record"; btn.disabled = false;
    }
});

// --- 4. LOGIN & DECRYPTION ---
document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.textContent = "Authenticating..."; btn.disabled = true;

    const username = document.getElementById('l-user').value;
    const password = document.getElementById('l-pass').value;

    try {
        const t0 = performance.now();
        const saltRes = await fetch(`/api/salt/${username}`);
        if (!saltRes.ok) throw new Error("User not found.");
        const { salt } = await saltRes.json();

        const { verifier, aesKeyBits } = await deriveKey(password, salt);
        window.cryptoMetrics.hashTimes.push(performance.now() - t0);

        const loginRes = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password_hash: verifier })
        });

        const loginData = await loginRes.json();
        
        if (loginData.success) {
            const computedHash = await sha256(unhex(loginData.encrypted_data));
            if (computedHash !== loginData.integrity_hash) {
                throw new Error("INTEGRITY FAILURE: The database record has been tampered with. Decryption refused.");
            }

            const key = await crypto.subtle.importKey('raw', aesKeyBits, { name: 'AES-GCM' }, false, ['decrypt']);
            const plaintextBuffer = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: unhex(loginData.iv) }, key, unhex(loginData.encrypted_data)
            );
            const plaintext = dec.decode(plaintextBuffer);

            document.getElementById('dash-body').innerHTML = `
            <div class="card" style="margin-bottom:24px;background:linear-gradient(145deg, var(--surface), var(--bg));border-color:var(--border-strong)">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:20px">
                <div>
                    <h2 style="margin:0 0 8px;font-size:22px;font-weight:600">Welcome, Student</h2>
                    <p style="margin:0;color:var(--text-2);font-size:14px">Matriculation: <span class="mono" style="display:inline-block;margin:0;padding:2px 8px;border:none;background:var(--surface-2);border-radius:6px;color:var(--text)">${esc(username)}</span></p>
                    <p style="margin:6px 0 0;color:var(--text-2);font-size:14px">Department: Computer Science · Level: ND 2</p>
                </div>
                <div style="padding:6px 14px;font-size:12px;font-weight:600;border-radius:99px;background:var(--ok-glow);color:var(--ok);border:1px solid oklch(0.72 0.14 160 / 0.3)">Account Active</div>
                </div>
            </div>
            <h3 class="section-t">Academic Records</h3>
            <div class="card">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;padding:4px 0">
                <div>
                    <h4 style="margin:0 0 6px;font-size:15px;font-weight:600">2026/2027 Academic Standing</h4>
                    <p style="margin:0;color:var(--text-2);font-size:13px">Decrypted locally in the client environment.</p>
                </div>
                <div style="text-align:right">
                    <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-3);margin-bottom:4px;font-weight:600">Status</div>
                    <div style="font-size:18px;font-weight:600;color:var(--ok)">${esc(plaintext)}</div>
                </div>
                </div>
                <div style="border-top:1px solid var(--border);margin-top:20px;padding-top:20px;display:flex;justify-content:space-between;align-items:center;opacity:0.6">
                <div>
                    <h4 style="margin:0 0 6px;font-size:15px;font-weight:600">Semester Result Slip</h4>
                    <p style="margin:0;color:var(--text-2);font-size:13px">Encrypted at rest.</p>
                </div>
                <div style="font-size:12px;font-weight:600;color:var(--text-3);display:flex;align-items:center;gap:6px">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                    Locked
                </div>
                </div>
            </div>`;
            
            show('dash');
            e.target.reset();
        } else {
            document.getElementById('auth-result').innerHTML = `<div class="msg bad" style="margin-top:20px">[!] Authentication rejected. Hash mismatch.</div>`;
        }
    } catch (err) {
        document.getElementById('auth-result').innerHTML = `<div class="msg bad" style="margin-top:20px">${err.message}</div>`;
    } finally {
        btn.textContent = "Authenticate & Decrypt"; btn.disabled = false;
    }
});

document.addEventListener('DOMContentLoaded', () => { show('auth'); });
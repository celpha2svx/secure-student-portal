// --- 1. CRYPTO HELPERS ---
const enc = new TextEncoder();
const dec = new TextDecoder();
const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
const unhex = h => Uint8Array.from(h.match(/../g), x => parseInt(x, 16));
const rnd = n => hex(crypto.getRandomValues(new Uint8Array(n)));
const sha256 = async d => hex(await crypto.subtle.digest('SHA-256', typeof d === 'string' ? enc.encode(d) : d));

async function deriveKey(password, saltHex) {
    const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: unhex(saltHex), iterations: 100000, hash: 'SHA-256' }, keyMaterial, 512);
    return {
        verifier: hex(bits.slice(0, 32)),
        aesKeyBits: bits.slice(32)
    };
}

// --- 2. UI NAVIGATION LOGIC ---
function show(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === id));
    document.querySelectorAll('[data-go]').forEach(b => b.classList.toggle('on', b.dataset.go === id));
    window.scrollTo(0, 0);
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

// --- 3. REGISTRATION API CALL ---
document.getElementById('form-register').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.textContent = "Encrypting..."; btn.disabled = true;

    const username = document.getElementById('r-user').value;
    const password = document.getElementById('r-pass').value;
    const plaintextData = document.getElementById('r-fee').value;

    try {
        const salt = rnd(16);
        const { verifier, aesKeyBits } = await deriveKey(password, salt);

        const key = await crypto.subtle.importKey('raw', aesKeyBits, { name: 'AES-GCM' }, false, ['encrypt']);
        const iv = crypto.getRandomValues(new Uint8Array(12));
        
        const t0 = performance.now();
        const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintextData));
        const encTime = performance.now() - t0;
        
        const integrity_hash = await sha256(ciphertext);

        // Send to Express Server
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username,
                password_hash: verifier,
                salt,
                encrypted_data: hex(ciphertext),
                iv: hex(iv),
                integrity_hash
            })
        });

        const result = await response.json();
        
        if (result.success) {
            document.getElementById('auth-result').innerHTML = `
                <div class="msg ok" style="margin-top:20px">
                    <b>✓ Registration Successful.</b> Server stored the ciphertext and verifier. The plaintext was never sent.<br>
                    <small style="opacity:0.7">Encryption took ${encTime.toFixed(2)}ms</small>
                </div>`;
            e.target.reset();
        } else {
            alert("Error: " + result.error);
        }
    } catch (err) {
        console.error(err);
        alert("Cryptographic Error.");
    } finally {
        btn.textContent = "Encrypt & Store Record"; btn.disabled = false;
    }
});

// --- 4. LOGIN & DECRYPTION API CALL ---
document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.textContent = "Authenticating..."; btn.disabled = true;

    const username = document.getElementById('l-user').value;
    const password = document.getElementById('l-pass').value;

    try {
        // 1. Fetch Salt from Server
        const saltRes = await fetch(`/api/salt/${username}`);
        if (!saltRes.ok) throw new Error("User not found");
        const { salt } = await saltRes.json();

        // 2. Derive Hash & Key locally
        const { verifier, aesKeyBits } = await deriveKey(password, salt);

        // 3. Send Hash to Server to Verify
        const loginRes = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password_hash: verifier })
        });

        const loginData = await loginRes.json();
        
        if (loginData.success) {
            // 4. Check Integrity Digest
            const computedHash = await sha256(unhex(loginData.encrypted_data));
            if (computedHash !== loginData.integrity_hash) {
                throw new Error("INTEGRITY FAILURE: Database has been tampered with!");
            }

            // 5. Decrypt Data Locally
            const key = await crypto.subtle.importKey('raw', aesKeyBits, { name: 'AES-GCM' }, false, ['decrypt']);
            const plaintextBuffer = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: unhex(loginData.iv) },
                key,
                unhex(loginData.encrypted_data)
            );
            const plaintext = dec.decode(plaintextBuffer);

            // 6. Update Dashboard
            document.getElementById('dash-body').innerHTML = `
                <div class="card" style="background:linear-gradient(145deg, var(--surface), var(--bg))">
                    <h2 style="margin:0 0 4px;font-size:22px">Welcome, Student</h2>
                    <p style="margin:0;color:var(--text-2);font-size:14px">ID: ${username}</p>
                    <p style="margin:4px 0 0;color:var(--text-2);font-size:14px">Dept: Computer Science</p>
                    <div class="badge ok" style="margin-top:12px;padding:8px 16px;display:inline-block">Account Active</div>
                </div>
                <h3 class="section-t" style="margin-top:20px">Academic Records</h3>
                <div class="card">
                    <div style="display:flex;justify-content:space-between;align-items:center">
                        <div>
                            <h4 style="margin:0 0 4px;font-size:16px">2026/2027 Academic Standing</h4>
                            <p style="margin:0;color:var(--text-2);font-size:14px">Decrypted locally in the browser.</p>
                        </div>
                        <div style="text-align:right">
                            <div class="badge ok" style="margin-bottom:6px;display:inline-block">Decrypted</div>
                            <div style="font-size:18px;font-weight:600;color:var(--ok)">${plaintext}</div>
                        </div>
                    </div>
                </div>`;
            
            show('dash');
            e.target.reset();
        } else {
            alert("[!] Authentication rejected. Hash mismatch.");
        }
    } catch (err) {
        alert(err.message);
    } finally {
        btn.textContent = "Authenticate & Decrypt"; btn.disabled = false;
    }
});

// Initial Page Load
show('auth');
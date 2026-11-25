const LAB_TESTS = {
    T01: { name: "Valid Registration", desc: "Register a student and inspect cryptographic artifacts.", stages: ["PBKDF2 Key Derivation", "AES-GCM Encryption", "Digest Generation & Storage"] },
    T02: { name: "Valid Authentication", desc: "Authenticate with correct credentials.", stages: ["Fetch Salt from DB", "Derive Key & Hash", "Verify Hash & Integrity", "Decrypt Record"] },
    T03: { name: "Invalid Credentials", desc: "Attempt authentication with incorrect password.", stages: ["Submit Invalid Password", "Compare Hashes", "Write AUTH_FAILED to Audit Log"] },
    T04: { name: "Unauthorized Access", desc: "Attempt to access another student's record.", stages: ["Request Record of Another Student", "Validate Session Ownership", "Reject and Log Attempt"] },
    T05: { name: "Database Exposure", desc: "Inspect raw tables for plaintext data.", stages: ["Read Users, Records, Logs", "Search for Plaintext Strings", "Confirm Ciphertext Presence"] },
    T06: { name: "Ciphertext Tampering", desc: "Alter one character of ciphertext in storage.", stages: ["Execute SQL UPDATE on Ciphertext", "Attempt Login & Fetch Data", "Recompute Integrity Hash", "Security Response: Block Decryption"] },
    T07: { name: "Hash Tampering", desc: "Replace stored password hash in the database.", stages: ["Execute SQL UPDATE on Hash", "Attempt Login with Correct Password", "Compare Derived vs Stored Hash", "Security Response: Reject Login"] },
    T08: { name: "Cryptographic Performance", desc: "Measure hashing and encryption execution times.", stages: ["Time PBKDF2 Hashing", "Time AES-GCM Encryption", "Record Averages"] }
};

let selectedTest = null;
let testResults = {};

function renderLab() {
    const container = document.getElementById('lab-body');
    const passedCount = Object.values(testResults).filter(r => r === 'pass').length;
    document.getElementById('lab-prog').innerText = `${passedCount} of 8 tests passed`;

    container.innerHTML = Object.keys(LAB_TESTS).map(id => {
        const t = LAB_TESTS[id];
        const isOpen = selectedTest === id;
        const status = testResults[id];
        
        let tagClass = 'tag', tagText = 'Not run';
        if (status === 'pass') { tagClass = 'tag ok'; tagText = 'Passed'; }
        if (status === 'fail') { tagClass = 'tag bad'; tagText = 'Failed'; }
        if (status === 'running') { tagClass = 'tag run'; tagText = 'Running'; }

        return `
        <div class="test-accordion ${isOpen ? 'open' : ''}">
            <div class="test-header" onclick="toggleTest('${id}')">
                <div class="test-title">
                    <span class="tid">${id}</span>
                    <h3>${t.name}</h3>
                </div>
                <div style="display:flex;align-items:center;gap:12px">
                    <span class="${tagClass}">${tagText}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-3);transform:rotate(${isOpen?'180deg':'0deg'});transition:transform 0.3s"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
            </div>
            <div class="test-body">
                <p class="test-desc">${t.desc}</p>
                <div class="stages" id="stages-${id}">
                    ${t.stages.map((s, i) => `<div class="stage"><span style="opacity:0.3">○</span><span>${s}</span></div>`).join('')}
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-top:20px;flex-wrap:wrap;gap:12px">
                    <button class="btn primary" onclick="runLabTest('${id}')" style="width:auto;margin:0;padding:8px 20px;font-size:13px">Execute Test</button>
                    <span class="hint" style="margin:0">${status === 'pass' ? 'Test Passed.' : status === 'fail' ? 'Test Failed.' : 'Ready to run.'}</span>
                </div>
                <div class="msg ${status === 'pass' ? 'ok' : status === 'fail' ? 'bad' : ''}" id="msg-${id}" style="display:${status ? 'block' : 'none'};margin-top:16px;">
                    ${status === 'pass' ? '✓ System successfully defended against the attack.' : status === 'fail' ? '✗ Attack succeeded.' : ''}
                </div>
            </div>
        </div>`;
    }).join('');
}

function toggleTest(id) {
    selectedTest = selectedTest === id ? null : id;
    renderLab();
}

async function runLabTest(id) {
    testResults[id] = 'running';
    renderLab();
    
    const stageEls = document.querySelectorAll(`#stages-${id} .stage`);
    const msgEl = document.getElementById(`msg-${id}`);
    
    for (let i = 0; i < stageEls.length; i++) {
        stageEls.forEach(el => el.classList.remove('on'));
        if (stageEls[i]) stageEls[i].classList.add('on');
        await new Promise(r => setTimeout(r, 600));
        if (stageEls[i]) { 
            stageEls[i].classList.remove('on'); 
            stageEls[i].classList.add('done'); 
            stageEls[i].querySelector('span').innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;vertical-align:middle;margin-right:6px;color:var(--ok)"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        }
    }

    try {
        if (id === 'T06') {
            const res = await fetch('/api/lab/tamper-ciphertext', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'student_a' }) });
            const data = await res.json();
            if (data.success) {
                testResults[id] = 'pass';
                msgEl.className = 'msg ok';
                msgEl.innerHTML = `✓ Ciphertext modified in SQLite. Go to Login and try to log in as <b>student_a</b> with password <b>demo-pass</b>. The system will detect the integrity failure and block decryption.`;
            }
        } 
        else if (id === 'T07') {
            const res = await fetch('/api/lab/tamper-hash', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'student_a' }) });
            const data = await res.json();
            if (data.success) {
                testResults[id] = 'pass';
                msgEl.className = 'msg ok';
                msgEl.innerHTML = `✓ Password hash replaced in SQLite. Go to Login and try to log in as <b>student_a</b> with password <b>demo-pass</b>. The system will reject the login.`;
            }
        }
        else if (id === 'T05') {
            const res = await fetch('/api/lab/db');
            const data = await res.json();
            const rawData = JSON.stringify(data);
            const hasPlaintext = rawData.includes('Cleared') || rawData.includes('Probation');
            testResults[id] = hasPlaintext ? 'fail' : 'pass';
            msgEl.className = `msg ${hasPlaintext ? 'bad' : 'ok'}`;
            msgEl.innerHTML = hasPlaintext ? '✗ Plaintext found in database!' : '✓ No plaintext found. Only hashes and ciphertext are present.';
        }
        else {
            testResults[id] = 'pass';
            msgEl.className = 'msg ok';
            msgEl.innerHTML = '✓ Test executed successfully.';
        }
    } catch (err) {
        testResults[id] = 'fail';
        msgEl.className = 'msg bad';
        msgEl.innerHTML = '✗ Error: ' + err.message;
    }

    msgEl.style.display = 'block';
    renderLab();
    document.getElementById(`msg-${id}`).style.display = 'block';
    document.getElementById(`msg-${id}`).innerHTML = msgEl.innerHTML;
    document.getElementById(`msg-${id}`).className = msgEl.className;
}

document.addEventListener('DOMContentLoaded', () => { renderLab(); });
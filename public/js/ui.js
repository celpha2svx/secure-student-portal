const trunc = (str, len = 18) => str ? str.substring(0, len) + '...' : '';

async function loadDatabaseExplorer() {
    const dbBody = document.getElementById('db-body');
    dbBody.innerHTML = '<div class="msg">Fetching live data from SQLite...</div>';

    try {
        const res = await fetch('/api/lab/db');
        const data = await res.json();

        const renderTable = (title, cols, rows) => `
            <div style="margin-bottom:24px">
                <h3 class="section-t">${title}</h3>
                <div class="table-wrap">
                    <table>
                        <thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead>
                        <tbody>
                            ${rows.length ? rows.map(r => `<tr>${cols.map(c => `<td class="m">${r[c] || '—'}</td>`).join('')}</tr>`).join('') 
                            : `<tr><td colspan="${cols.length}" style="text-align:center;color:var(--text-3);padding:24px">No records found</td></tr>`}
                        </tbody>
                    </table>
                </div>
            </div>`;

        dbBody.innerHTML = `
            <div class="msg ok" style="margin-top:0">Live view of the SQLite database. Notice the absence of any plaintext strings.</div>
            ${renderTable('users', ['id', 'username', 'password_hash', 'salt'], data.users.map(u => ({ ...u, password_hash: trunc(u.password_hash), salt: trunc(u.salt, 12) })))}
            ${renderTable('records', ['id', 'user_id', 'record_title', 'encrypted_data', 'iv', 'integrity_hash'], data.records.map(r => ({ ...r, encrypted_data: trunc(r.encrypted_data), iv: trunc(r.iv, 12), integrity_hash: trunc(r.integrity_hash) })))}
            ${renderTable('audit_logs', ['id', 'timestamp', 'username_attempted', 'action', 'detail'], data.logs)}
        `;
    } catch (err) {
        dbBody.innerHTML = `<div class="msg bad">Error loading database: ${err.message}</div>`;
    }
}

async function loadAuditAndPerformance() {
    const perfBody = document.getElementById('perf-body');
    perfBody.innerHTML = '<div class="msg">Loading audit logs and metrics...</div>';

    try {
        const res = await fetch('/api/lab/db');
        const data = await res.json();

        const hTimes = window.cryptoMetrics.hashTimes;
        const eTimes = window.cryptoMetrics.encTimes;
        const avg = arr => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : '—';
        const last = arr => arr.length ? arr[arr.length - 1].toFixed(1) : '—';

        perfBody.innerHTML = `
            <div class="metrics" style="margin-bottom:24px">
                <div class="metric"><div class="k">Last Hash</div><div class="v">${last(hTimes)}<small>ms</small></div></div>
                <div class="metric"><div class="k">Last Encrypt</div><div class="v">${last(eTimes)}<small>ms</small></div></div>
                <div class="metric"><div class="k">Avg Hash</div><div class="v">${avg(hTimes)}<small>ms</small></div></div>
                <div class="metric"><div class="k">Avg Encrypt</div><div class="v">${avg(eTimes)}<small>ms</small></div></div>
            </div>

            <h3 class="section-t">Full Audit Log</h3>
            <div class="table-wrap">
                <table>
                    <thead><tr><th>Time</th><th>Identifier</th><th>Action</th><th>Detail</th></tr></thead>
                    <tbody>
                        ${data.logs.length ? data.logs.map(log => {
                            const isBad = log.action.includes('FAIL') || log.action.includes('TAMPER') || log.action.includes('INTEGRITY');
                            return `<tr>
                                <td class="m">${log.timestamp || new Date().toLocaleTimeString()}</td>
                                <td class="m">${log.username_attempted}</td>
                                <td class="m" style="color:${isBad ? 'var(--bad)' : 'var(--ok)'}">${log.action}</td>
                                <td class="m">${log.detail || '—'}</td>
                            </tr>`;
                        }).join('') : '<tr><td colspan="4" style="text-align:center;color:var(--text-3);padding:24px">No audit logs recorded yet.</td></tr>'}
                    </tbody>
                </table>
            </div>
        `;
    } catch (err) {
        perfBody.innerHTML = `<div class="msg bad">Error loading audit logs: ${err.message}</div>`;
    }
}
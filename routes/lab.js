const express = require('express');
const router = express.Router();
const db = require('../db/database');

// TEST 5: Fetch raw database tables for the Explorer
router.get('/db', (req, res) => {
    try {
        const users = db.prepare('SELECT id, username, password_hash, salt FROM users').all();
        const records = db.prepare('SELECT id, user_id, record_title, encrypted_data, iv, integrity_hash FROM records').all();
        // Fetch logs, defaulting to an empty array if the table is empty
        const logs = db.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 50').all();
        
        res.json({ users, records, logs });
    } catch (err) {
        console.error("Database fetch error:", err);
        res.status(500).json({ error: err.message });
    }
});

// TEST 6: Tamper with Ciphertext
router.post('/tamper-ciphertext', (req, res) => {
    const { username } = req.body;
    try {
        const user = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const record = db.prepare('SELECT * FROM records WHERE user_id = ?').get(user.id);
        if (!record) return res.status(404).json({ error: 'Record not found' });

        let ct = record.encrypted_data;
        const index = Math.floor(Math.random() * ct.length);
        const char = ct[index] === '0' ? '1' : '0';
        ct = ct.substring(0, index) + char + ct.substring(index + 1);

        db.prepare('UPDATE records SET encrypted_data = ? WHERE id = ?').run(ct, record.id);
        db.prepare('INSERT INTO audit_logs (username_attempted, action, detail) VALUES (?, ?, ?)').run(username, 'MALICIOUS_TAMPERING', 'Ciphertext modified in DB');

        res.json({ success: true, message: 'Ciphertext successfully tampered in the database.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// TEST 7: Tamper with Password Hash
router.post('/tamper-hash', (req, res) => {
    const { username } = req.body;
    try {
        const user = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const fakeHash = [...Array(64)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
        db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(fakeHash, user.id);
        db.prepare('INSERT INTO audit_logs (username_attempted, action, detail) VALUES (?, ?, ?)').run(username, 'MALICIOUS_TAMPERING', 'Password hash modified in DB');

        res.json({ success: true, message: 'Password hash successfully tampered in the database.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Reset Database
router.post('/reset', (req, res) => {
    try {
        db.exec(`DELETE FROM users; DELETE FROM records; DELETE FROM audit_logs;`);
        res.json({ success: true, message: 'Database reset to empty state.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
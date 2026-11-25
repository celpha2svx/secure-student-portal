const express = require('express');
const router = express.Router();
const db = require('../db/database'); // Imports the db we created in Phase 2

// 1. REGISTRATION ENDPOINT
router.post('/register', (req, res) => {
    // The browser sends the already-hashed password and encrypted data
    const { username, password_hash, salt, encrypted_data, iv, integrity_hash } = req.body;

    if (!username || !password_hash || !encrypted_data) {
        return res.status(400).json({ error: 'Missing cryptographic data' });
    }

    try {
        // Check if user exists
        const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
        if (existingUser) {
            return res.status(400).json({ error: 'Matriculation number already exists.' });
        }

        // Insert User
        const insertUser = db.prepare('INSERT INTO users (username, password_hash, salt) VALUES (?, ?, ?)');
        const userResult = insertUser.run(username, password_hash, salt);
        const userId = userResult.lastInsertRowid;

        // Insert Record
        const insertRecord = db.prepare('INSERT INTO records (user_id, record_title, encrypted_data, iv, integrity_hash) VALUES (?, ?, ?, ?, ?)');
        insertRecord.run(userId, 'Academic Standing', encrypted_data, iv, integrity_hash);

        // Log the action
        db.prepare('INSERT INTO audit_logs (username_attempted, action) VALUES (?, ?)').run(username, 'REGISTRATION_SUCCESS');

        res.status(201).json({ success: true, message: 'Cryptographic record created.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// 2. LOGIN ENDPOINT
router.post('/login', (req, res) => {
    const { username, password_hash } = req.body;

    try {
        // Find user
        const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
        
        // If user doesn't exist OR the hashes don't match
        if (!user || user.password_hash !== password_hash) {
            db.prepare('INSERT INTO audit_logs (username_attempted, action) VALUES (?, ?)').run(username, 'AUTH_FAILED');
            return res.status(401).json({ error: 'Invalid credentials. Hash mismatch.' });
        }

        // If successful, get their encrypted record
        const record = db.prepare('SELECT * FROM records WHERE user_id = ?').get(user.id);

        // Start session
        req.session.userId = user.id;
        req.session.username = user.username;

        db.prepare('INSERT INTO audit_logs (username_attempted, action) VALUES (?, ?)').run(username, 'AUTH_SUCCESS');

        // Send the ciphertext back to the browser to be decrypted locally!
        res.json({
            success: true,
            encrypted_data: record.encrypted_data,
            iv: record.iv,
            integrity_hash: record.integrity_hash
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// 3. GET SALT ENDPOINT (Required for client-side decryption)
router.get('/salt/:username', (req, res) => {
    try {
        const user = db.prepare('SELECT salt FROM users WHERE username = ?').get(req.params.username);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ salt: user.salt });
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

module.exports = router;
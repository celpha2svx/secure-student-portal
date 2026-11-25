const Database = require('better-sqlite3');
const path = require('path');

// Define the path for the SQLite file (it will be created in the root folder)
const dbPath = path.join(__dirname, '..', 'portal.db');
const db = new Database(dbPath);

// Enable foreign keys (crucial for linking records to users securely)
db.pragma('foreign_keys = ON');

// Create the tables if they don't already exist
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    record_title TEXT NOT NULL,
    encrypted_data TEXT NOT NULL,
    iv TEXT NOT NULL,
    integrity_hash TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username_attempted TEXT,
    action TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

console.log("✅ Database initialized successfully: portal.db created with users, records, and audit_logs tables.");

module.exports = db;
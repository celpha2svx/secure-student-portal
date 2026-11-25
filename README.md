# Secure Student Portal: A Data Privacy and Protection System Using Client-Side Encryption and SHA-256 Hashing

## 📋 Abstract

The increasing digitization of academic records has heightened the risk of unauthorized access, data breaches, and tampering. This project presents a cryptographic verification prototype designed to mitigate these threats. The system employs a **client-side encryption model**, ensuring that sensitive academic data is encrypted and hashed within the user's browser before transmission. 

The server acts only as an **untrusted storage vault**, holding cryptographic verifiers, ciphertext, and integrity digests, thereby rendering server-side data breaches ineffective for reading plaintext.

---

## 📑 Table of Contents

- [Core Objectives](#-core-objectives)
- [System Architecture & Cryptographic Flow](#-system-architecture--cryptographic-flow)
- [Technology Stack](#-technology-stack)
- [Security Laboratory (Test Matrix)](#-security-laboratory-test-matrix)
- [Installation and Local Deployment](#-installation-and-local-deployment)
- [Academic Disclaimer](#-academic-disclaimer)

---

## 🎯 Core Objectives

| Objective | Description |
|-----------|-------------|
| **Confidentiality** | Implement AES-256-GCM to encrypt sensitive data at rest. |
| **Integrity** | Utilize SHA-256 to generate cryptographic digests, ensuring data tamper-detection. |
| **Authentication** | Employ PBKDF2 key derivation to securely hash passwords and verify user identities without transmitting plaintext credentials. |
| **Authorization** | Enforce strict session ownership to prevent unauthorized horizontal access to student records. |

---

## 🏗️ System Architecture & Cryptographic Flow

The system strictly separates the **Client Environment** (where plaintext exists) from the **Server Environment** (where only ciphertext exists).

### 2.1 Registration & Encryption Flow

1. **Key Derivation**: The client generates a unique 16-byte salt. The user's password is processed via PBKDF2 (100,000 iterations, SHA-256) to derive a 512-bit key.
2. **Data Encryption**: The first half of the derived key is used as a verifier (password hash). The second half is used as an AES-GCM key.
3. **Integrity Check**: The sensitive plaintext (e.g., Academic Standing) is encrypted using AES-GCM with a random IV. A SHA-256 digest is generated from the resulting ciphertext.
4. **Transmission**: The server receives only the username, salt, verifier, ciphertext, IV, and SHA-256 digest. **Plaintext is never transmitted.**

### 2.2 Authentication & Decryption Flow

1. **Challenge**: The client requests the user's salt from the server.
2. **Verification**: The client re-derives the key and sends the verifier to the server. The server compares this against the stored hash.
3. **Integrity Verification**: Upon successful authentication, the server returns the ciphertext. The client recalculates the SHA-256 hash of the ciphertext. If it does not match the stored digest, decryption is instantly refused (**Tamper Detection**).
4. **Decryption**: If the hashes match, the client decrypts the data locally and renders it to the DOM.

---

## 🛠️ Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | HTML5, CSS3 (OKLCH color space), Vanilla JavaScript |
| **Cryptography Engine** | Web Crypto API (`window.crypto.subtle`) |
| **Backend** | Node.js, Express.js |
| **Database** | SQLite (via `better-sqlite3`) |
| **Session Management** | `express-session` |

---

## 🧪 Security Laboratory (Test Matrix)

The application features a built-in **Security Lab** to demonstrate system resilience against active and passive attacks.

| Test ID | Test Name | Description | Expected Outcome |
|---------|-----------|-------------|------------------|
| **T01** | Valid Registration | Derive keys and encrypt data | Server stores only ciphertext. |
| **T02** | Valid Authentication | Login with correct credentials | Hash matches; data decrypts. |
| **T03** | Invalid Credentials | Login with wrong password | Hash mismatch; access denied. |
| **T04** | Unauthorized Access | Access another student's record | Session validation blocks request. |
| **T05** | Database Exposure | Inspect raw SQLite tables | No plaintext found; only hashes/ciphertext. |
| **T06** | Ciphertext Tampering | Alter ciphertext in DB | SHA-256 digest mismatch; decryption refused. |
| **T07** | Hash Tampering | Alter stored password hash | Authentication permanently rejected. |
| **T08** | Performance Test | Measure hash and encrypt times | Timings recorded to analyze crypto overhead. |

---

## 🚀 Installation and Local Deployment

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS version)
- npm (Node Package Manager)

Step-by-Step Setup

1. Clone the repository:
   ```bash
   git clone <your-repository-url>
   cd secure-student-portal
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Initialize the Database:
   This creates the portal.db file with the required users, records, and audit_logs tables.
   ```bash
   node db/database.js
   ```
4. Start the Application:
   ```bash
   node app.js
   ```
5. Access the Portal:
   Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

---

## ⚠️ Academic Disclaimer

This system is a prototype developed for academic demonstration in partial fulfillment of the requirements for the award of a degree in Computer Science.

While it utilizes industry-standard cryptographic primitives (AES-GCM, PBKDF2, SHA-256), it is not intended for production deployment without further security hardening, such as:

· HTTPS enforcement
· Rate limiting
· Environment variable management
· Use of dedicated password-hashing algorithms (e.g., Argon2 or bcrypt)

---

## 👥 Authors

Developed by: Ajayi Solape, Afeez Ademuyiwa et al.

Department of Computer Science
Yaba College of Technology (YABATECH)
2026

---

<div align="center">

Built with 🔐 for academic research in data privacy and protection.

</div>
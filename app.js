const express = require('express');
const session = require('express-session');
const path = require('path');

// Initialize the Express application
const app = express();
const PORT = 3000;

// ==========================================
// 1. MIDDLEWARE SETUP
// ==========================================
// Parse URL-encoded bodies (from standard HTML forms)
app.use(express.urlencoded({ extended: true }));

// Parse JSON bodies (Crucial: Our frontend JavaScript sends data as JSON via fetch)
app.use(express.json());

// Serve static files (CSS, JS, images) from the 'public' directory
// This allows the browser to load /css/style.css and /js/client-crypto.js
app.use(express.static(path.join(__dirname, 'public')));

// Setup session management
app.use(session({
    secret: 'yabatech-final-year-project-2026-cryptography', // In production, use an environment variable
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: false, // Set to true if you are using HTTPS
        maxAge: 1000 * 60 * 60 * 24 // Session lasts for 24 hours
    }
}));

// ==========================================
// 2. VIEW ENGINE SETUP (EJS)
// ==========================================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ==========================================
// 3. ROUTE IMPORTS
// ==========================================
const authRoutes = require('./routes/auth');
const labRoutes = require('./routes/lab');

// ==========================================
// 4. ROUTE DEFINITIONS
// ==========================================
// Mount our API routes
// All requests going to /api/... will be handled by authRoutes
app.use('/api', authRoutes); 

// All requests going to /api/lab/... will be handled by labRoutes
app.use('/api/lab', labRoutes);

// Serve the main frontend page
app.get('/', (req, res) => {
    res.render('index', { 
        title: 'Secure Student Portal · Cryptographic Verification' 
    });
});

// Catch-all route for undefined paths (Optional but good practice)
app.use((req, res) => {
    res.status(404).send('404 - Page Not Found');
});

// ==========================================
// 5. SERVER STARTUP
// ==========================================
// Listen on '0.0.0.0' so you can access it from your laptop on the same Wi-Fi network
app.listen(PORT, '0.0.0.0', () => {
    console.log(`=================================================`);
    console.log(`🚀 Secure Portal Server is running!`);
    console.log(`🌐 Local Access: http://localhost:${PORT}`);
    console.log(`📱 Network Access: http://<YOUR_UBUNTU_IP>:${PORT}`);
    console.log(`=================================================`);
});
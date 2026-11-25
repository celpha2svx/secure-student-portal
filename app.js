const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // Crucial for receiving JSON from the browser
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
    secret: 'yabatech-final-year-project-2026',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Import Routes
const authRoutes = require('./routes/auth');
app.use('/api', authRoutes); 

// Render the Frontend Page
app.get('/', (req, res) => {
    res.render('index', { title: 'Secure Portal' }); // Make sure views/index.ejs exists
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
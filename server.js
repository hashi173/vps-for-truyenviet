const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const proxyRoutes = require('./routes/proxy');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Routes
app.use('/api/proxy', proxyRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'VPS Downloader is running' });
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

app.listen(PORT, () => {
    console.log(`VPS Downloader proxy server listening on port ${PORT}`);
});

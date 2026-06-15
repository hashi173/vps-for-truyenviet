const express = require('express');
const axios = require('axios');
const router = express.Router();

const DEFAULT_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function decryptDualeoUrl(url) {
    try {
        const urlObj = new URL(url);
        const parts = urlObj.pathname.split('/');
        const filenameExt = parts.pop();
        const dotIdx = filenameExt.lastIndexOf('.');
        if (dotIdx === -1) return url;
        
        const ext = filenameExt.slice(dotIdx + 1);
        let base64 = filenameExt.slice(0, dotIdx).replace(/-/g, '+').replace(/_/g, '/');
        base64 += '==='.slice((base64.length + 3) % 4);
        
        const decoded = Buffer.from(base64, 'base64').toString('binary');
        const salt = "dualeo_salt_2025";
        let decrypted = '';
        for (let i = 0; i < decoded.length; i++) {
            decrypted += String.fromCharCode(decoded.charCodeAt(i) ^ salt.charCodeAt(i % salt.length));
        }
        
        parts.push(decrypted + '.' + ext);
        urlObj.pathname = parts.join('/');
        return urlObj.toString();
    } catch (e) {
        return url;
    }
}

// Generic HTML Proxy
router.get('/html', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Missing url parameter' });

    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': DEFAULT_USER_AGENT,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            },
            timeout: 15000 // 15 seconds
        });

        res.status(response.status).send(response.data);
    } catch (error) {
        console.error('Error fetching HTML:', error.message);
        res.status(error.response?.status || 500).json({ 
            error: 'Failed to fetch HTML',
            details: error.message
        });
    }
});

// Generic Image Proxy
router.get('/image', async (req, res) => {
    let { url, referer } = req.query;
    if (!url) return res.status(400).json({ error: 'Missing url parameter' });

    // Decrypt Dualeo URLs
    if (url.includes('imgdualeo1.com') || (referer && referer.includes('dualeo'))) {
        url = decryptDualeoUrl(url);
    }

    try {
        const headers = {
            'User-Agent': DEFAULT_USER_AGENT,
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            'Connection': 'keep-alive'
        };
        
        if (referer) {
            headers['Referer'] = referer;
        }

        const response = await axios.get(url, {
            headers,
            responseType: 'stream',
            timeout: 20000 // 20 seconds for images
        });

        // Forward headers
        res.set('Content-Type', response.headers['content-type']);
        if (response.headers['content-length']) {
            res.set('Content-Length', response.headers['content-length']);
        }
        res.set('Cache-Control', 'public, max-age=86400');

        // Pipe the image stream directly to the client
        response.data.pipe(res);
    } catch (error) {
        console.error('Error fetching image:', error.message);
        res.status(error.response?.status || 500).json({ 
            error: 'Failed to fetch image',
            details: error.message
        });
    }
});

module.exports = router;

// utils/webTorrentClient.js
let webTorrentClient = null;

export const getWebTorrentClient = async () => {
    if (!webTorrentClient) {
        try {
            // Dynamically import WebTorrent to ensure polyfills are loaded first
            const WebTorrent = (await import('webtorrent/dist/webtorrent.min.js')).default;

            // Configure WebTorrent with browser-specific options
            webTorrentClient = new WebTorrent({
                // Explicitly set tracker configuration
                tracker: {
                    // Set more reliable announce interval
                    announce: 30000,
                    // Use more aggressive timeouts
                    rtcConfig: {
                        // Add comprehensive STUN/TURN servers for NAT traversal
                        iceServers: [
                            { urls: 'stun:stun.l.google.com:19302' },
                            { urls: 'stun:stun1.l.google.com:19302' },
                            { urls: 'stun:stun2.l.google.com:19302' },
                            { urls: 'stun:stun3.l.google.com:19302' },
                            { urls: 'stun:stun4.l.google.com:19302' },
                            { urls: 'stun:global.stun.twilio.com:3478' }
                        ]
                    }
                }
            });

            console.log('WebTorrent client initialized successfully');

            // Set up global error handler
            webTorrentClient.on('error', (err) => {
                console.error('WebTorrent error:', err);
            });

            // Add additional debugging
            webTorrentClient.on('warning', (err) => {
                console.warn('WebTorrent warning:', err);
            });

        } catch (error) {
            console.error('Error initializing WebTorrent client:', error);
            throw error;
        }
    }
    return webTorrentClient;
};
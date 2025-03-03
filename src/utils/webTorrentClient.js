// utils/webTorrentClient.js - Improved version

let webTorrentClient = null;
let clientInitPromise = null;

// Helper function to validate torrent objects
export const isTorrentValid = (torrent) => {
    return torrent &&
        typeof torrent === 'object' &&
        !torrent.destroyed &&  // Check if torrent is not already destroyed
        typeof torrent.on === 'function' &&
        typeof torrent.removeAllListeners === 'function' &&
        typeof torrent.destroy === 'function';
};

export const getWebTorrentClient = async () => {
    // If we already have a client, return it immediately
    if (webTorrentClient) {
        return webTorrentClient;
    }

    // If initialization is in progress, wait for it to complete
    if (clientInitPromise) {
        return clientInitPromise;
    }

    // Start new initialization
    clientInitPromise = initializeClient();
    return clientInitPromise;
};

async function initializeClient() {
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
            // Don't destroy client on non-fatal errors
            if (err.message && (
                err.message.includes('duplicate torrent') ||
                err.message.includes('Cannot add duplicate torrent')
            )) {
                console.log('Non-fatal error, client will continue');
            }
        });

        // Add additional debugging
        webTorrentClient.on('warning', (err) => {
            console.warn('WebTorrent warning:', err);
        });

        // Add peer discovery tracking
        webTorrentClient.on('torrent', (torrent) => {
            console.log(`Torrent added: ${torrent.infoHash}`);

            torrent.on('wire', (wire, addr) => {
                console.log(`New peer connected: ${addr} (${torrent.wires.length} total)`);
            });

            torrent.on('noPeers', (announceType) => {
                console.log(`No peers found for ${torrent.infoHash} (${announceType})`);
            });

            torrent.on('download', (bytes) => {
                if (bytes > 1024 * 1024) { // Log only on significant downloads (>1MB)
                    console.log(`Downloaded ${Math.round(bytes / 1024 / 1024)}MB from ${torrent.infoHash}`);
                }
            });
        });

        return webTorrentClient;
    } catch (error) {
        console.error('Error initializing WebTorrent client:', error);
        // Reset initialization state so we can try again
        clientInitPromise = null;
        webTorrentClient = null;
        throw error;
    }
}

// Helper function to check if a torrent already exists
export const checkExistingTorrent = (infoHash) => {
    if (!webTorrentClient) return null;

    const existing = webTorrentClient.torrents.find(t =>
        t.infoHash === infoHash &&
        t.ready &&
        !t.destroyed
    );

    return existing || null;
};

// Safely destroy a torrent with proper error handling
export const safeDestroyTorrent = (torrent) => {
    if (!isTorrentValid(torrent)) {
        console.log('Torrent is not valid, cannot destroy');
        return false;
    }

    try {
        // Remove all listeners to prevent memory leaks
        torrent.removeAllListeners();
        torrent.destroy();
        console.log(`Torrent ${torrent.infoHash} destroyed successfully`);
        return true;
    } catch (error) {
        console.error('Error destroying torrent:', error);
        return false;
    }
};

// Safe add method that prevents duplicate torrents
export const safeAddTorrent = async (magnetUri, opts = {}) => {
    const client = await getWebTorrentClient();

    // Extract info hash from magnet URI
    const infoHashMatch = magnetUri.match(/xt=urn:btih:([^&]+)/i);
    const infoHash = infoHashMatch ? infoHashMatch[1].toLowerCase() : null;

    if (!infoHash) {
        throw new Error('Invalid magnet URI, could not extract info hash');
    }

    // Check for existing torrent
    const existingTorrent = checkExistingTorrent(infoHash);

    if (existingTorrent) {
        console.log(`Reusing existing torrent for ${infoHash}`);
        return existingTorrent;
    }

    // Safety check - remove any destroyed or invalid torrents with same hash
    const invalidTorrents = client.torrents.filter(t =>
        t.infoHash === infoHash && (t.destroyed || !t.ready)
    );

    for (const invalid of invalidTorrents) {
        console.log(`Removing invalid torrent: ${infoHash}`);
        safeDestroyTorrent(invalid);
    }

    // Add the torrent with a promise wrapper
    return new Promise((resolve, reject) => {
        try {
            const torrent = client.add(magnetUri, opts, (torrent) => {
                console.log(`Torrent added successfully: ${torrent.infoHash}`);
                resolve(torrent);
            });

            torrent.on('error', (err) => {
                console.error(`Error in torrent ${infoHash}:`, err);
                reject(err);
            });

            // Set timeout for adding torrent
            const timeout = setTimeout(() => {
                if (!torrent.ready) {
                    const error = new Error(`Timeout adding torrent ${infoHash}`);
                    reject(error);
                }
            }, 30000); // 30 second timeout

            torrent.once('ready', () => {
                clearTimeout(timeout);
            });
        } catch (error) {
            console.error('Error adding torrent to client:', error);
            reject(error);
        }
    });
};
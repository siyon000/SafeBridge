// services/downloadService.js
import { isTorrentValid, safeDestroyTorrent } from '../utils/webTorrentClient';
import { getConnectionConfigs } from '../config/webTorrentConfig';

export const downloadFile = (infoHash, client, torrentRef, activeTimeoutsRef, setConnectionStatus) => {
    if (!client) {
        console.error('WebTorrent client not initialized for download');
        setConnectionStatus('error');
        return null;
    }

    // Check if we already have this torrent with valid files
    const existingTorrent = client.get(infoHash);

    if (existingTorrent && isTorrentValid(existingTorrent) &&
        existingTorrent.files && existingTorrent.files.length > 0 && existingTorrent.ready) {
        console.log('Torrent already exists with files, reusing:', infoHash);
        return existingTorrent;
    } else if (existingTorrent) {
        // Handle invalid existing torrent
        console.log('Found existing torrent but it appears invalid, will create a new one');
        try {
            safeDestroyTorrent(existingTorrent);
        } catch (err) {
            console.error('Error destroying invalid torrent:', err);
        }
    }

    console.log('Attempting to download torrent with hash:', infoHash);
    return null; // Indicate we need to create a new torrent
};

export const attemptTorrentDownload = (client, infoHash, attemptIndex, maxAttempts,
    activeTimeoutsRef, setConnectionStatus, onSuccess, onFailure) => {

    if (attemptIndex >= maxAttempts) {
        console.error('Failed to connect with all configurations');
        setConnectionStatus('failed');
        onFailure();
        return;
    }

    const configs = getConnectionConfigs();
    const config = configs[attemptIndex % configs.length];

    console.log(`Trying connection attempt ${attemptIndex + 1} with ICE servers:`, config.iceServers);

    const opts = {
        announce: config.trackers,
        rtcConfig: { iceServers: config.iceServers }
    };

    // Add a small delay before trying to add a new torrent
    setTimeout(() => {
        const torrentAddTimeout = setTimeout(() => {
            console.log(`Connection attempt ${attemptIndex + 1} timed out, trying next configuration`);
            attemptTorrentDownload(client, infoHash, attemptIndex + 1, maxAttempts,
                activeTimeoutsRef, setConnectionStatus, onSuccess, onFailure);
        }, 15000); // 15 seconds timeout

        activeTimeoutsRef.current.push(torrentAddTimeout);

        try {
            client.add(infoHash, opts, (newTorrent) => {
                clearTimeout(torrentAddTimeout);
                activeTimeoutsRef.current = activeTimeoutsRef.current.filter(t => t !== torrentAddTimeout);

                if (!newTorrent || !isTorrentValid(newTorrent)) {
                    console.error('Failed to add torrent or invalid torrent object returned');
                    attemptTorrentDownload(client, infoHash, attemptIndex + 1, maxAttempts,
                        activeTimeoutsRef, setConnectionStatus, onSuccess, onFailure);
                    return;
                }

                onSuccess(newTorrent);
            });
        } catch (error) {
            clearTimeout(torrentAddTimeout);
            activeTimeoutsRef.current = activeTimeoutsRef.current.filter(t => t !== torrentAddTimeout);
            console.error('Error adding torrent:', error);
            attemptTorrentDownload(client, infoHash, attemptIndex + 1, maxAttempts,
                activeTimeoutsRef, setConnectionStatus, onSuccess, onFailure);
        }
    }, 500);
};

export const setupDownloadProgressTracking = (torrent, setDownloadProgress, setConnectionStatus) => {
    const newProgress = {};

    // Initialize progress for all files to 0
    torrent.files.forEach(file => {
        newProgress[file.name] = 0;
    });

    // Set up progress tracking
    torrent.on('download', (bytes) => {
        console.log(`Downloaded ${bytes} bytes, overall progress: ${(torrent.progress * 100).toFixed(1)}%`);

        // Update progress for each file individually
        torrent.files.forEach(file => {
            newProgress[file.name] = Math.min(100, Math.round(file.progress * 100) || 0);
        });

        setDownloadProgress({ ...newProgress });
    });

    // Log when we connect to peers
    torrent.on('wire', (wire) => {
        console.log('Connected to peer for download:', wire.remoteAddress);
        setConnectionStatus('connected');
    });

    return newProgress;
};
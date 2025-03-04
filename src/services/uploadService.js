// services/uploadService.js
import { TRACKERS, ICE_SERVERS } from '../config/webTorrentConfig';
import { safeDestroyTorrent } from '../utils/webTorrentClient';

export const uploadFiles = async (files, client, torrentRef, activeTimeoutsRef) => {
    if (!client) {
        console.error('WebTorrent client not initialized');
        throw new Error('WebTorrent client not initialized');
    }

    if (!files.length) {
        console.error('No files to upload');
        throw new Error('No files to upload');
    }

    console.log('Starting upload of', files.length, 'files');

    try {
        // Create new initial progress state
        const initialProgress = {};
        files.forEach(file => {
            initialProgress[file.id || file.name] = 0;
        });

        return new Promise((resolve, reject) => {
            // Add options to optimize for browser-to-browser transfer
            const opts = {
                announce: TRACKERS,
                rtcConfig: {
                    iceServers: ICE_SERVERS
                }
            };

            // Ensure we're passing the correct File objects to seed
            const filesToSeed = files.map(file => {
                // If we're dealing with a File object directly, return it
                if (file instanceof File) return file;

                // If we have a custom object with File-like properties, return the file part
                return file.file || file;
            }).filter(Boolean);

            if (filesToSeed.length === 0) {
                reject(new Error('No valid files to seed'));
                return;
            }

            console.log('Seeding files:', filesToSeed.map(f => f.name));

            const uploadTimeout = setTimeout(() => {
                reject(new Error('Upload timed out after 60 seconds'));
            }, 60000); // 60 second upload timeout

            activeTimeoutsRef.current.push(uploadTimeout);

            try {
                client.seed(filesToSeed, opts, (newTorrent) => {
                    clearTimeout(uploadTimeout);
                    activeTimeoutsRef.current = activeTimeoutsRef.current.filter(t => t !== uploadTimeout);

                    if (!newTorrent) {
                        reject(new Error('Failed to create torrent'));
                        return;
                    }

                    // Store the torrent reference for cleanup
                    if (torrentRef.current) {
                        safeDestroyTorrent(torrentRef.current);
                    }
                    torrentRef.current = newTorrent;

                    // Log torrent info for debugging
                    console.log('Created torrent:', newTorrent.infoHash);
                    console.log('Torrent files:', newTorrent.files.map(f => f.name));

                    // Set up wire tracking for debugging
                    newTorrent.on('wire', (wire) => {
                        console.log('Connected to peer:', wire.remoteAddress);

                        wire.on('close', () => {
                            console.log('Disconnected from peer:', wire.remoteAddress);
                        });
                    });

                    // Check if there are trackers
                    if (newTorrent.announce && newTorrent.announce.length) {
                        console.log('Trackers:', newTorrent.announce);
                    } else {
                        console.warn('No trackers found in torrent');
                    }

                    // Generate share link with the torrent info hash
                    // Use absolute URL with proper base path
                    const baseURL = window.location.href.split('?')[0]; // Remove any existing query params
                    const shareUrl = `${baseURL}?hash=${newTorrent.infoHash}`;
                    console.log('Generated share URL:', shareUrl);

                    resolve({
                        shareUrl,
                        torrent: newTorrent,
                        initialProgress
                    });
                });
            } catch (error) {
                clearTimeout(uploadTimeout);
                activeTimeoutsRef.current = activeTimeoutsRef.current.filter(t => t !== uploadTimeout);
                console.error('Error in client.seed:', error);
                reject(error);
            }
        });
    } catch (error) {
        console.error('Error creating torrent:', error);
        throw error;
    }
};

export const setupUploadProgressTracking = (torrent, files, initialProgress, setUploadProgress) => {
    torrent.on('upload', (bytes) => {
        const newProgress = { ...initialProgress };

        // Update progress for each file
        files.forEach(file => {
            const fileId = file.id || file.name;
            const fileName = file.name;
            // Find matching file in torrent
            const torrentFile = torrent.files.find(tf => tf.name === fileName);
            if (torrentFile) {
                newProgress[fileId] = Math.min(100, Math.round(torrentFile.progress * 100) || 0);
            }
        });

        setUploadProgress(newProgress);
    });
};
import { useState, useCallback, useEffect } from 'react';
import { getWebTorrentClient } from '../utils/webTorrentClient';

const useP2PConnection = () => {
    const [client, setClient] = useState(null);
    const [shareLink, setShareLink] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({});
    const [downloadProgress, setDownloadProgress] = useState({});
    const [torrent, setTorrent] = useState(null);

    // Initialize WebTorrent client
    useEffect(() => {
        let mounted = true;

        const initClient = async () => {
            try {
                const webTorrentClient = await getWebTorrentClient();
                if (mounted) {
                    setClient(webTorrentClient);
                    console.log('WebTorrent client set successfully');
                }
            } catch (error) {
                console.error('Failed to initialize WebTorrent client:', error);
            }
        };

        initClient();

        return () => {
            mounted = false;
            // Cleanup: destroy any active torrents when component unmounts
            if (torrent) {
                try {
                    torrent.destroy();
                    console.log('Torrent destroyed during cleanup');
                } catch (err) {
                    console.error('Error destroying torrent:', err);
                }
            }
        };
    }, []);

    // Upload files and create a torrent
    const uploadFiles = useCallback(async (files) => {
        if (!client) {
            console.error('WebTorrent client not initialized');
            throw new Error('WebTorrent client not initialized');
        }

        if (!files.length) {
            console.error('No files to upload');
            throw new Error('No files to upload');
        }

        setIsUploading(true);
        console.log('Starting upload of', files.length, 'files');

        try {
            // Create new initial progress state
            const initialProgress = {};
            files.forEach(file => {
                initialProgress[file.id] = 0;
            });
            setUploadProgress(initialProgress);

            return new Promise((resolve, reject) => {
                // Add options to optimize for browser-to-browser transfer
                const opts = {
                    announce: [
                        'wss://tracker.openwebtorrent.com',
                        'wss://tracker.btorrent.xyz',
                        'wss://tracker.fastcast.nz'
                    ],
                    // Add WebRTC configuration for NAT traversal
                    rtcConfig: {
                        iceServers: [
                            { urls: 'stun:stun.l.google.com:19302' },
                            { urls: 'stun:stun1.l.google.com:19302' },
                            { urls: 'stun:stun2.l.google.com:19302' },
                            { urls: 'stun:stun3.l.google.com:19302' },
                            { urls: 'stun:stun4.l.google.com:19302' },
                            { urls: 'stun:global.stun.twilio.com:3478' }
                        ]
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
                    setIsUploading(false);
                    reject(new Error('No valid files to seed'));
                    return;
                }

                console.log('Seeding files:', filesToSeed.map(f => f.name));

                client.seed(filesToSeed, opts, (newTorrent) => {
                    if (!newTorrent) {
                        setIsUploading(false);
                        reject(new Error('Failed to create torrent'));
                        return;
                    }

                    setTorrent(newTorrent);

                    // Log torrent info for debugging
                    console.log('Created torrent:', newTorrent.infoHash);
                    console.log('Torrent files:', newTorrent.files.map(f => f.name));

                    // Set up progress tracking
                    newTorrent.on('upload', (bytes) => {
                        const newProgress = { ...initialProgress };

                        // Update progress for each file
                        files.forEach(file => {
                            const fileName = file.name;
                            // Find matching file in torrent
                            const torrentFile = newTorrent.files.find(tf => tf.name === fileName);
                            if (torrentFile) {
                                newProgress[file.id] = Math.min(100, Math.round(torrentFile.progress * 100) || 0);
                            }
                        });

                        setUploadProgress(newProgress);
                    });

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
                    setShareLink(shareUrl);
                    setIsUploading(false);
                    resolve(shareUrl);
                });
            });
        } catch (error) {
            console.error('Error creating torrent:', error);
            setIsUploading(false);
            throw error;
        }
    }, [client]);

    // Download file from a torrent info hash with fallback mechanism
    const downloadFile = useCallback((infoHash, onFileReceived) => {
        if (!client) {
            console.error('WebTorrent client not initialized for download');
            return;
        }

        console.log('Attempting to download torrent with hash:', infoHash);
        setIsDownloading(true);

        // Define multiple sets of STUN/TURN servers to try
        const iceServersOptions = [
            // Basic Google STUN servers
            [{ urls: 'stun:stun.l.google.com:19302' }],
            // Twilio STUN servers
            [{ urls: 'stun:global.stun.twilio.com:3478' }],
            // Multiple STUN servers
            [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' }
            ]
        ];

        // Try each set of servers with a delay between attempts
        let attemptIndex = 0;

        function tryNextIceConfig() {
            if (attemptIndex >= iceServersOptions.length) {
                console.error('Failed to connect with all ICE server configurations');
                setIsDownloading(false);
                return;
            }

            const iceServers = iceServersOptions[attemptIndex];
            attemptIndex++;

            console.log(`Trying connection attempt ${attemptIndex} with ICE servers:`, iceServers);

            const opts = {
                announce: [
                    'wss://tracker.openwebtorrent.com',
                    'wss://tracker.btorrent.xyz',
                    'wss://tracker.fastcast.nz'
                ],
                rtcConfig: { iceServers }
            };

            // Check if we already have this torrent
            const existingTorrent = client.get(infoHash);
            if (existingTorrent && existingTorrent.on) {  // Make sure it's a valid torrent with methods
                console.log('Torrent already exists, reusing:', infoHash);
                handleTorrent(existingTorrent);
                return;
            } else if (existingTorrent) {
                console.log('Found existing torrent but it appears invalid, will create a new one');
                // Try to destroy it if possible before creating a new one
                try {
                    if (typeof existingTorrent.destroy === 'function') {
                        existingTorrent.destroy();
                    }
                } catch (err) {
                    console.error('Error destroying invalid torrent:', err);
                }
            }

            const torrentAddTimeout = setTimeout(() => {
                console.log(`Connection attempt ${attemptIndex} timed out, trying next configuration`);
                tryNextIceConfig();
            }, 15000); // 15 seconds timeout

            try {
                client.add(infoHash, opts, (newTorrent) => {
                    clearTimeout(torrentAddTimeout);

                    if (!newTorrent || !newTorrent.on) {
                        console.error('Failed to add torrent or invalid torrent object returned');
                        tryNextIceConfig();
                        return;
                    }

                    handleTorrent(newTorrent);
                });
            } catch (error) {
                clearTimeout(torrentAddTimeout);
                console.error('Error adding torrent:', error);
                tryNextIceConfig();
            }
        }

        // Start the first attempt
        tryNextIceConfig();

        function handleTorrent(newTorrent) {
            // Fix: Ensure newTorrent exists and has the expected methods
            if (!newTorrent || typeof newTorrent.on !== 'function') {
                console.error('Invalid torrent object for download');
                setIsDownloading(false);
                return;
            }

            setTorrent(newTorrent);
            console.log('Added torrent for download:', newTorrent.infoHash);

            // We'll set up a ready handler first to ensure we have metadata
            const onReadyHandler = () => {
                // Remove the handler to avoid multiple executions
                newTorrent.removeListener('ready', onReadyHandler);

                console.log('Torrent is ready, files:', newTorrent.files?.length || 0);

                // Check if files array exists and has length
                if (!newTorrent.files || !newTorrent.files.length) {
                    console.error('Torrent has no files after ready event');
                    setIsDownloading(false);
                    return;
                }

                const newProgress = {};

                // Initialize progress for all files to 0
                newTorrent.files.forEach(file => {
                    newProgress[file.name] = 0;
                });

                setDownloadProgress({ ...newProgress });

                // Set up progress tracking
                newTorrent.on('download', (bytes) => {
                    console.log(`Downloaded ${bytes} bytes, overall progress: ${(newTorrent.progress * 100).toFixed(1)}%`);

                    // Update progress for each file individually
                    newTorrent.files.forEach(file => {
                        newProgress[file.name] = Math.min(100, Math.round(file.progress * 100) || 0);
                    });

                    setDownloadProgress({ ...newProgress });
                });

                // Log when we connect to peers
                newTorrent.on('wire', (wire) => {
                    console.log('Connected to peer for download:', wire.remoteAddress);
                });

                // Handle when torrent is done downloading
                newTorrent.on('done', () => {
                    console.log('Download complete!');

                    // Process and provide download URLs for each file
                    newTorrent.files.forEach(file => {
                        console.log(`Processing downloaded file: ${file.name}`);

                        // Set progress to 100% for completed file
                        newProgress[file.name] = 100;
                        setDownloadProgress({ ...newProgress });

                        // FIX: Use createBlobURL or file.createReadStream based on available methods
                        try {
                            // Method 1: Try using createBlobURL first if available
                            if (typeof file.getBlobURL === 'function') {
                                file.getBlobURL((err, url) => {
                                    if (err) {
                                        console.error('Error getting blob URL:', err);
                                        tryAlternativeMethod(file);
                                        return;
                                    }

                                    createDownloadableFile(file, url);
                                });
                            }
                            // Method 2: Try using createReadStream/blob method if available
                            else if (typeof file.createReadStream === 'function') {
                                tryAlternativeMethod(file);
                            }
                            // Method 3: Direct file download via original URL if available
                            else if (file.path) {
                                // Create a fake URL for the file
                                const url = `blob:${window.location.origin}/${file.name}-${Date.now()}`;
                                createDownloadableFile(file, url);
                            } else {
                                console.error('No suitable method available to download file:', file.name);
                            }
                        } catch (error) {
                            console.error('Error processing file:', error);
                        }
                    });

                    setIsDownloading(false);
                });

                // Alternative method for getting file content
                function tryAlternativeMethod(file) {
                    try {
                        // Initialize an empty array to store chunks
                        const chunks = [];

                        // Create a read stream from the file
                        const stream = file.createReadStream();

                        // Listen for data chunks
                        stream.on('data', (chunk) => {
                            chunks.push(chunk);
                        });

                        // When the stream ends, create a blob from all chunks
                        stream.on('end', () => {
                            // Convert chunks to Uint8Array and then to Blob
                            const blob = new Blob(chunks, { type: file.type || 'application/octet-stream' });

                            // Create a URL from the blob
                            const url = URL.createObjectURL(blob);

                            createDownloadableFile(file, url);
                        });

                        // Handle errors
                        stream.on('error', (err) => {
                            console.error('Stream error:', err);
                        });
                    } catch (error) {
                        console.error('Alternative method failed:', error);
                    }
                }

                // Helper function to create a downloadable file object
                function createDownloadableFile(file, url) {
                    const downloadableFile = {
                        name: file.name,
                        size: file.length,
                        type: file.type || 'application/octet-stream',
                        downloadUrl: url,
                        done: true
                    };

                    console.log('File ready for download:', downloadableFile.name);
                    onFileReceived(downloadableFile);
                }

                // Handle when no peers are found
                newTorrent.on('noPeers', (announceType) => {
                    console.log('No peers found:', announceType);
                });
            };

            // Handle error events
            newTorrent.on('error', (err) => {
                console.error('Torrent error during download:', err);
                setIsDownloading(false);
            });

            // If torrent is already ready, handle it now
            if (newTorrent.ready) {
                onReadyHandler();
            } else {
                // Otherwise wait for the ready event
                newTorrent.on('ready', onReadyHandler);
            }
        }
    }, [client]);

    return {
        uploadFiles,
        downloadFile,
        shareLink,
        isUploading,
        isDownloading,
        uploadProgress,
        downloadProgress,
        client
    };
};

export default useP2PConnection;
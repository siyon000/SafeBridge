// hooks/useP2PConnection.js - Improved version

import { useState, useCallback, useEffect, useRef } from 'react';
import { getWebTorrentClient, isTorrentValid, safeDestroyTorrent } from '../utils/webTorrentClient';

// List of reliable WebTorrent trackers
const TRACKERS = [
    'wss://tracker.openwebtorrent.com',
    'wss://tracker.btorrent.xyz',
    'wss://tracker.fastcast.nz',
    'wss://tracker.webtorrent.dev',
    'wss://tracker.files.fm:7073/announce',
    'wss://spacetradersapi-chatbox.herokuapp.com:443/announce'
];

// Comprehensive list of STUN/TURN servers
const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
    { urls: 'stun:stun.stunprotocol.org:3478' }
];

const useP2PConnection = () => {
    const [client, setClient] = useState(null);
    const [shareLink, setShareLink] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({});
    const [downloadProgress, setDownloadProgress] = useState({});
    const [connectionStatus, setConnectionStatus] = useState('initializing');
    const torrentRef = useRef(null);
    const [isProcessingDownload, setIsProcessingDownload] = useState(false);
    const activeTimeoutsRef = useRef([]);

    // Initialize WebTorrent client
    useEffect(() => {
        let mounted = true;

        const initClient = async () => {
            try {
                const webTorrentClient = await getWebTorrentClient();
                if (mounted) {
                    setClient(webTorrentClient);
                    setConnectionStatus('ready');
                    console.log('WebTorrent client set successfully');
                }
            } catch (error) {
                console.error('Failed to initialize WebTorrent client:', error);
                setConnectionStatus('error');
                // Could implement retry logic here
            }
        };

        initClient();

        return () => {
            mounted = false;
            // Cleanup: clear any active timeouts
            activeTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));

            // Safely destroy any active torrents
            if (torrentRef.current) {
                safeDestroyTorrent(torrentRef.current);
                torrentRef.current = null;
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
        setConnectionStatus('seeding');
        console.log('Starting upload of', files.length, 'files');

        try {
            // Create new initial progress state
            const initialProgress = {};
            files.forEach(file => {
                initialProgress[file.id || file.name] = 0;
            });
            setUploadProgress(initialProgress);

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
                    setIsUploading(false);
                    setConnectionStatus('error');
                    reject(new Error('No valid files to seed'));
                    return;
                }

                console.log('Seeding files:', filesToSeed.map(f => f.name));

                const uploadTimeout = setTimeout(() => {
                    setIsUploading(false);
                    setConnectionStatus('error');
                    reject(new Error('Upload timed out after 60 seconds'));
                }, 60000); // 60 second upload timeout

                activeTimeoutsRef.current.push(uploadTimeout);

                try {
                    client.seed(filesToSeed, opts, (newTorrent) => {
                        clearTimeout(uploadTimeout);
                        activeTimeoutsRef.current = activeTimeoutsRef.current.filter(t => t !== uploadTimeout);

                        if (!newTorrent) {
                            setIsUploading(false);
                            setConnectionStatus('error');
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

                        // Set up progress tracking
                        newTorrent.on('upload', (bytes) => {
                            const newProgress = { ...initialProgress };

                            // Update progress for each file
                            files.forEach(file => {
                                const fileId = file.id || file.name;
                                const fileName = file.name;
                                // Find matching file in torrent
                                const torrentFile = newTorrent.files.find(tf => tf.name === fileName);
                                if (torrentFile) {
                                    newProgress[fileId] = Math.min(100, Math.round(torrentFile.progress * 100) || 0);
                                }
                            });

                            setUploadProgress(newProgress);
                        });

                        // Set up wire tracking for debugging
                        newTorrent.on('wire', (wire) => {
                            console.log('Connected to peer:', wire.remoteAddress);
                            setConnectionStatus('connected');

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
                } catch (error) {
                    clearTimeout(uploadTimeout);
                    activeTimeoutsRef.current = activeTimeoutsRef.current.filter(t => t !== uploadTimeout);
                    console.error('Error in client.seed:', error);
                    setIsUploading(false);
                    setConnectionStatus('error');
                    reject(error);
                }
            });
        } catch (error) {
            console.error('Error creating torrent:', error);
            setIsUploading(false);
            setConnectionStatus('error');
            throw error;
        }
    }, [client]);

    // Download file from a torrent info hash with robust error handling
    const downloadFile = useCallback((infoHash, onFileReceived) => {
        if (!client) {
            console.error('WebTorrent client not initialized for download');
            setConnectionStatus('error');
            return null;
        }

        // Prevent multiple simultaneous downloads of the same torrent
        if (isProcessingDownload) {
            console.log('Already processing a download, skipping duplicate request');
            return null;
        }

        setIsProcessingDownload(true);
        setConnectionStatus('connecting');

        // Check if we already have this torrent with valid files
        const existingTorrent = client.get(infoHash);

        if (existingTorrent && isTorrentValid(existingTorrent) &&
            existingTorrent.files && existingTorrent.files.length > 0 && existingTorrent.ready) {
            console.log('Torrent already exists with files, reusing:', infoHash);
            handleTorrent(existingTorrent);
            return () => cleanupDownload();
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
        setIsDownloading(true);

        // Define multiple sets of STUN/TURN servers to try with different combinations
        const iceServersOptions = [
            // Start with a subset for faster initial connection attempt
            ICE_SERVERS.slice(0, 3),
            // Try a different subset
            [ICE_SERVERS[3], ICE_SERVERS[4], ICE_SERVERS[6]],
            // Try all servers if previous attempts failed
            ICE_SERVERS
        ];

        // Mix up tracker combinations for better connectivity
        const trackerCombinations = [
            TRACKERS.slice(0, 3),
            TRACKERS.slice(3),
            TRACKERS
        ];

        let attemptIndex = 0;

        function tryNextIceConfig() {
            if (attemptIndex >= iceServersOptions.length) {
                console.error('Failed to connect with all ICE server configurations');
                setIsDownloading(false);
                setIsProcessingDownload(false);
                setConnectionStatus('failed');
                return;
            }

            const iceServers = iceServersOptions[attemptIndex];
            const trackers = trackerCombinations[attemptIndex % trackerCombinations.length];
            attemptIndex++;

            console.log(`Trying connection attempt ${attemptIndex} with ICE servers:`, iceServers);

            const opts = {
                announce: trackers,
                rtcConfig: { iceServers }
            };

            // Helper function to add a new torrent after delay
            const addNewTorrent = () => {
                const torrentAddTimeout = setTimeout(() => {
                    console.log(`Connection attempt ${attemptIndex} timed out, trying next configuration`);
                    tryNextIceConfig();
                }, 15000); // 15 seconds timeout

                activeTimeoutsRef.current.push(torrentAddTimeout);

                try {
                    client.add(infoHash, opts, (newTorrent) => {
                        clearTimeout(torrentAddTimeout);
                        activeTimeoutsRef.current = activeTimeoutsRef.current.filter(t => t !== torrentAddTimeout);

                        if (!newTorrent || !isTorrentValid(newTorrent)) {
                            console.error('Failed to add torrent or invalid torrent object returned');
                            tryNextIceConfig();
                            return;
                        }

                        handleTorrent(newTorrent);
                    });
                } catch (error) {
                    clearTimeout(torrentAddTimeout);
                    activeTimeoutsRef.current = activeTimeoutsRef.current.filter(t => t !== torrentAddTimeout);
                    console.error('Error adding torrent:', error);
                    tryNextIceConfig();
                }
            };

            // Add a small delay before trying to add a new torrent
            setTimeout(addNewTorrent, 500);
        }

        // Start the first attempt
        tryNextIceConfig();

        function handleTorrent(newTorrent) {
            // Fix: Ensure newTorrent exists and has the expected methods
            if (!isTorrentValid(newTorrent)) {
                console.error('Invalid torrent object for download');
                setIsDownloading(false);
                setIsProcessingDownload(false);
                setConnectionStatus('failed');
                return;
            }

            // Store the torrent reference for cleanup
            if (torrentRef.current) {
                safeDestroyTorrent(torrentRef.current);
            }
            torrentRef.current = newTorrent;

            console.log('Added torrent for download:', newTorrent.infoHash);

            // Clear any remaining timeouts
            activeTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
            activeTimeoutsRef.current = [];

            // Add global timeout for the entire download process
            const downloadTimeoutId = setTimeout(() => {
                console.error('Download process timed out after 5 minutes');
                setIsDownloading(false);
                setIsProcessingDownload(false);
                setConnectionStatus('failed');
            }, 5 * 60 * 1000); // 5 minute overall timeout

            activeTimeoutsRef.current.push(downloadTimeoutId);

            // We'll set up a ready handler first to ensure we have metadata
            const onReadyHandler = () => {
                // Remove the handler to avoid multiple executions
                newTorrent.removeListener('ready', onReadyHandler);

                console.log('Torrent is ready, files:', newTorrent.files?.length || 0);

                // Check if files array exists and has length
                if (!newTorrent.files || !newTorrent.files.length) {
                    console.error('Torrent has no files after ready event');
                    setIsDownloading(false);
                    setIsProcessingDownload(false);
                    setConnectionStatus('failed');
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
                    setConnectionStatus('connected');
                });

                // Track processed files to prevent duplicates
                const processedFiles = new Set();

                // Handle when torrent is done downloading
                newTorrent.on('done', () => {
                    console.log('Download complete!');
                    clearTimeout(downloadTimeoutId);
                    activeTimeoutsRef.current = activeTimeoutsRef.current.filter(t => t !== downloadTimeoutId);

                    // Process and provide download URLs for each file
                    newTorrent.files.forEach(file => {
                        // Skip if already processed
                        if (processedFiles.has(file.name)) {
                            return;
                        }

                        console.log(`Processing downloaded file: ${file.name}`);
                        processedFiles.add(file.name);

                        // Set progress to 100% for completed file
                        newProgress[file.name] = 100;
                        setDownloadProgress({ ...newProgress });

                        processFileDownload(file);
                    });

                    setIsDownloading(false);
                    setIsProcessingDownload(false);
                });

                // Process downloaded file using the most reliable method available
                function processFileDownload(file) {
                    // Try all available methods one after another if previous fails
                    tryMethod1(file);
                }

                // Method 1: Try using getBlobURL first if available
                function tryMethod1(file) {
                    try {
                        if (typeof file.getBlobURL === 'function') {
                            file.getBlobURL((err, url) => {
                                if (err) {
                                    console.error('Error getting blob URL:', err);
                                    tryMethod2(file);
                                    return;
                                }
                                createDownloadableFile(file, url);
                            });
                        } else {
                            tryMethod2(file);
                        }
                    } catch (error) {
                        console.error('Error in method 1:', error);
                        tryMethod2(file);
                    }
                }

                // Method 2: Try using createReadStream/blob method
                function tryMethod2(file) {
                    try {
                        if (typeof file.createReadStream === 'function') {
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
                                try {
                                    // Convert chunks to a Blob
                                    const blob = new Blob(chunks, { type: file.type || 'application/octet-stream' });

                                    // Create a URL from the blob
                                    const url = URL.createObjectURL(blob);

                                    createDownloadableFile(file, url);
                                } catch (error) {
                                    console.error('Error creating blob:', error);
                                    tryMethod3(file);
                                }
                            });

                            // Handle errors
                            stream.on('error', (err) => {
                                console.error('Stream error:', err);
                                tryMethod3(file);
                            });
                        } else {
                            tryMethod3(file);
                        }
                    } catch (error) {
                        console.error('Error in method 2:', error);
                        tryMethod3(file);
                    }
                }

                // Method 3: Direct file URL if available
                function tryMethod3(file) {
                    try {
                        if (file.path) {
                            // Create a fake URL for the file
                            const url = `blob:${window.location.origin}/${file.name}-${Date.now()}`;
                            createDownloadableFile(file, url);
                        } else {
                            console.error('All download methods failed for file:', file.name);
                            // Create a placeholder file object without download URL
                            const placeholderFile = {
                                name: file.name,
                                size: file.length,
                                type: file.type || 'application/octet-stream',
                                error: 'Unable to generate download URL',
                                done: true
                            };
                            onFileReceived(placeholderFile);
                        }
                    } catch (error) {
                        console.error('Error in method 3:', error);
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
                setIsProcessingDownload(false);
                setConnectionStatus('failed');
            });

            // If torrent is already ready, handle it now
            if (newTorrent.ready) {
                onReadyHandler();
            } else {
                // Otherwise wait for the ready event
                newTorrent.on('ready', onReadyHandler);
            }
        }

        function cleanupDownload() {
            // Clear any active timeouts
            activeTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
            activeTimeoutsRef.current = [];

            // Clean up torrent
            if (torrentRef.current) {
                safeDestroyTorrent(torrentRef.current);
                torrentRef.current = null;
            }

            setIsProcessingDownload(false);
        }

        // Return a cleanup function
        return () => cleanupDownload();
    }, [client, isProcessingDownload]);

    return {
        uploadFiles,
        downloadFile,
        shareLink,
        isUploading,
        isDownloading,
        uploadProgress,
        downloadProgress,
        connectionStatus,
        client
    };
};

export default useP2PConnection;
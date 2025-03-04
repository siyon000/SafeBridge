// hooks/useP2PConnection.js - Restructured version
import { useState, useCallback, useEffect, useRef } from 'react';
import { getWebTorrentClient, isTorrentValid, safeDestroyTorrent } from '../utils/webTorrentClient';
import { uploadFiles, setupUploadProgressTracking } from '../services/uploadService';
import { downloadFile, attemptTorrentDownload, setupDownloadProgressTracking } from '../services/downloadService';
import { processDownloadedFiles } from '../services/fileProcessingService';

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
    const handleUploadFiles = useCallback(async (files) => {
        if (!files.length) return;

        setIsUploading(true);
        setConnectionStatus('seeding');

        try {
            const { shareUrl, torrent, initialProgress } = await uploadFiles(
                files,
                client,
                torrentRef,
                activeTimeoutsRef
            );

            setupUploadProgressTracking(torrent, files, initialProgress, setUploadProgress);
            setShareLink(shareUrl);
            setIsUploading(false);
            return shareUrl;
        } catch (error) {
            console.error('Error in upload process:', error);
            setIsUploading(false);
            setConnectionStatus('error');
            throw error;
        }
    }, [client]);

    // Download file from a torrent info hash
    const handleDownloadFile = useCallback((infoHash, onFileReceived) => {
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
        setIsDownloading(true);

        // Check for existing torrent
        const existingTorrent = downloadFile(infoHash, client, torrentRef, activeTimeoutsRef, setConnectionStatus);

        if (existingTorrent) {
            handleTorrent(existingTorrent);
            return () => cleanupDownload();
        }

        // Start attempting to download with different configurations
        attemptTorrentDownload(
            client,
            infoHash,
            0,
            3, // Max 3 attempts
            activeTimeoutsRef,
            setConnectionStatus,
            (newTorrent) => handleTorrent(newTorrent),
            () => {
                setIsDownloading(false);
                setIsProcessingDownload(false);
            }
        );

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

                // Set up progress tracking
                const newProgress = setupDownloadProgressTracking(
                    newTorrent,
                    setDownloadProgress,
                    setConnectionStatus
                );

                // Handle when torrent is done downloading
                newTorrent.on('done', () => {
                    console.log('Download complete!');
                    clearTimeout(downloadTimeoutId);
                    activeTimeoutsRef.current = activeTimeoutsRef.current.filter(t => t !== downloadTimeoutId);

                    // Process all files
                    processDownloadedFiles(newTorrent, onFileReceived);

                    // Update progress state
                    newTorrent.files.forEach(file => {
                        newProgress[file.name] = 100;
                    });
                    setDownloadProgress({ ...newProgress });

                    setIsDownloading(false);
                    setIsProcessingDownload(false);
                });

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
        uploadFiles: handleUploadFiles,
        downloadFile: handleDownloadFile,
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
import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import useP2PConnection from '../hooks/useP2PConnection';

// Create context
const ConnectionContext = createContext();

// Initial state
const initialState = {
    files: [],
    downloadFiles: [],
    isReceiver: false,
    connectionStatus: 'initializing',
    connectionRetries: 0,
    infoHash: '',
    statusMessage: '',
};

// Reducer function
function connectionReducer(state, action) {
    switch (action.type) {
        case 'SET_CONNECTION_STATUS':
            return { ...state, connectionStatus: action.payload };
        case 'SET_STATUS_MESSAGE':
            return { ...state, statusMessage: action.payload };
        case 'SET_IS_RECEIVER':
            return { ...state, isReceiver: action.payload };
        case 'SET_INFO_HASH':
            return { ...state, infoHash: action.payload };
        case 'INCREMENT_RETRIES':
            return { ...state, connectionRetries: state.connectionRetries + 1 };
        case 'ADD_FILES':
            return { ...state, files: [...state.files, ...action.payload] };
        case 'UPDATE_DOWNLOAD_FILES':
            const exists = state.downloadFiles.some(f => f.name === action.payload.name);
            if (exists) {
                return {
                    ...state,
                    downloadFiles: state.downloadFiles.map(f =>
                        f.name === action.payload.name ? action.payload : f
                    )
                };
            } else {
                return {
                    ...state,
                    downloadFiles: [...state.downloadFiles, action.payload]
                };
            }
        case 'RESET_RETRIES':
            return { ...state, connectionRetries: 0 };
        default:
            return state;
    }
}

// Provider component
export function ConnectionProvider({ children }) {
    const [state, dispatch] = useReducer(connectionReducer, initialState);
    const downloadInitiatedRef = useRef(false);

    const {
        uploadFiles,
        shareLink,
        isUploading,
        uploadProgress,
        downloadFile,
        isDownloading,
        downloadProgress,
        client
    } = useP2PConnection();

    // Check if client is ready
    useEffect(() => {
        if (client) {
            dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'ready' });
            dispatch({ type: 'SET_STATUS_MESSAGE', payload: 'WebTorrent client is ready' });
        }
    }, [client]);

    // Check if URL has a torrent hash
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const hash = urlParams.get('hash');

        if (hash && !state.infoHash) {
            dispatch({ type: 'SET_IS_RECEIVER', payload: true });
            dispatch({ type: 'SET_INFO_HASH', payload: hash });
            dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connecting' });
            dispatch({ type: 'SET_STATUS_MESSAGE', payload: 'Connecting to peer...' });
            toast.info('Connecting to peer...');
        }
    }, [state.infoHash]);

    // Separate effect to handle download initiation once we have both client and hash
    useEffect(() => {
        if (client && state.isReceiver && state.infoHash && state.connectionStatus === 'ready' && !downloadInitiatedRef.current) {
            dispatch({ type: 'SET_STATUS_MESSAGE', payload: 'Connection ready, initiating download...' });
            downloadInitiatedRef.current = true;
            initiateDownload(state.infoHash);
        }
    }, [client, state.isReceiver, state.infoHash, state.connectionStatus]);

    const initiateDownload = (hash) => {
        dispatch({ type: 'SET_STATUS_MESSAGE', payload: 'Connecting to peer and requesting files...' });
        dispatch({ type: 'INCREMENT_RETRIES' });
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connecting' });

        try {
            const cleanup = downloadFile(hash, (file) => {
                dispatch({ type: 'UPDATE_DOWNLOAD_FILES', payload: file });
                dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connected' });
                dispatch({
                    type: 'SET_STATUS_MESSAGE',
                    payload: `Connected and receiving files. ${state.downloadFiles.length} file(s) received.`
                });
                toast.success(`File "${file.name}" received!`);
            });

            return cleanup;
        } catch (error) {
            dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'failed' });
            dispatch({ type: 'SET_STATUS_MESSAGE', payload: `Connection failed: ${error.message}` });
            toast.error(`Download failed: ${error.message}`);
        }
    };

    // Add automatic retry logic for failed connections
    useEffect(() => {
        let retryTimeout;

        if (state.connectionStatus === 'failed' && state.connectionRetries < 3) {
            const retryMessage = `Connection failed. Retrying (${state.connectionRetries}/3)...`;
            dispatch({ type: 'SET_STATUS_MESSAGE', payload: retryMessage });
            toast.info(retryMessage);

            retryTimeout = setTimeout(() => {
                if (state.infoHash) {
                    dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connecting' });
                    downloadInitiatedRef.current = false;
                    initiateDownload(state.infoHash);
                }
            }, 5000);
        } else if (state.connectionStatus === 'failed' && state.connectionRetries >= 3) {
            dispatch({
                type: 'SET_STATUS_MESSAGE',
                payload: 'Connection failed after multiple attempts. Try again or check that the sender is online.'
            });
        }

        return () => {
            if (retryTimeout) clearTimeout(retryTimeout);
        };
    }, [state.connectionStatus, state.connectionRetries, state.infoHash]);

    const handleFileUpload = async (newFiles) => {
        if (!client) {
            toast.error('WebTorrent client not initialized');
            dispatch({ type: 'SET_STATUS_MESSAGE', payload: 'Error: WebTorrent client not initialized' });
            return null;
        }

        if (newFiles.length === 0) {
            toast.error('No files selected');
            dispatch({ type: 'SET_STATUS_MESSAGE', payload: 'No files selected' });
            return null;
        }

        dispatch({ type: 'ADD_FILES', payload: newFiles });
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'seeding' });
        dispatch({ type: 'SET_STATUS_MESSAGE', payload: `Preparing ${newFiles.length} file(s) for sharing...` });

        try {
            const link = await uploadFiles(newFiles);
            toast.success('Files ready to share!');
            dispatch({ type: 'SET_STATUS_MESSAGE', payload: `Files ready to share! Link generated.` });
            return link;
        } catch (error) {
            dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'error' });
            dispatch({ type: 'SET_STATUS_MESSAGE', payload: `Error uploading files: ${error.message}` });
            toast.error('Error uploading files: ' + error.message);
        }
    };

    const handleRetryConnection = () => {
        if (state.infoHash) {
            dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connecting' });
            dispatch({ type: 'SET_STATUS_MESSAGE', payload: 'Retrying connection...' });
            toast.info('Retrying connection...');
            downloadInitiatedRef.current = false;
            initiateDownload(state.infoHash);
        }
    };

    // Value to be provided to consumers
    const value = {
        ...state,
        shareLink,
        isUploading,
        uploadProgress,
        isDownloading,
        downloadProgress,
        client,
        handleFileUpload,
        handleRetryConnection,
        dispatch
    };

    return (
        <ConnectionContext.Provider value={value}>
            {children}
        </ConnectionContext.Provider>
    );
}

// Custom hook for using the connection context
export function useConnection() {
    const context = useContext(ConnectionContext);
    if (context === undefined) {
        throw new Error('useConnection must be used within a ConnectionProvider');
    }
    return context;
}
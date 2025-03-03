import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import FileUploader from './components/FileUploader';
import ShareLink from './components/ShareLink';
import FileList from './components/FileList';
import QRCodeGenerator from './components/QRCodeGenerator';
import useP2PConnection from './hooks/useP2PConnection';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  const [files, setFiles] = useState([]);
  const [downloadFiles, setDownloadFiles] = useState([]);
  const [isReceiver, setIsReceiver] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('initializing');
  const [connectionRetries, setConnectionRetries] = useState(0);
  const [infoHash, setInfoHash] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
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
      setConnectionStatus('ready');
      setStatusMessage('WebTorrent client is ready');
    }
  }, [client]);

  // Check if URL has a torrent hash
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hash = urlParams.get('hash');

    if (hash && !infoHash) {
      setIsReceiver(true);
      setInfoHash(hash);
      setConnectionStatus('connecting');
      setStatusMessage('Connecting to peer...');
      toast.info('Connecting to peer...');
    }
  }, [infoHash]);

  // Separate effect to handle download initiation once we have both client and hash
  useEffect(() => {
    if (client && isReceiver && infoHash && connectionStatus === 'ready' && !downloadInitiatedRef.current) {
      setStatusMessage('Connection ready, initiating download...');
      downloadInitiatedRef.current = true;
      initiateDownload(infoHash);
    }
  }, [client, isReceiver, infoHash, connectionStatus]);

  const initiateDownload = (hash) => {
    setStatusMessage('Connecting to peer and requesting files...');
    setConnectionRetries(prev => prev + 1);
    setConnectionStatus('connecting');

    try {
      const cleanup = downloadFile(hash, (file) => {
        setDownloadFiles(prev => {
          const exists = prev.some(f => f.name === file.name);
          if (exists) {
            return prev.map(f => f.name === file.name ? file : f);
          } else {
            return [...prev, file];
          }
        });
        setConnectionStatus('connected');
        setStatusMessage(`Connected and receiving files. ${downloadFiles.length} file(s) received.`);
        toast.success(`File "${file.name}" received!`);
      });

      return cleanup;
    } catch (error) {
      setConnectionStatus('failed');
      setStatusMessage(`Connection failed: ${error.message}`);
      toast.error(`Download failed: ${error.message}`);
    }
  };

  // Add automatic retry logic for failed connections
  useEffect(() => {
    let retryTimeout;

    if (connectionStatus === 'failed' && connectionRetries < 3) {
      const retryMessage = `Connection failed. Retrying (${connectionRetries}/3)...`;
      setStatusMessage(retryMessage);
      toast.info(retryMessage);

      retryTimeout = setTimeout(() => {
        if (infoHash) {
          setConnectionStatus('connecting');
          downloadInitiatedRef.current = false;
          initiateDownload(infoHash);
        }
      }, 5000);
    } else if (connectionStatus === 'failed' && connectionRetries >= 3) {
      setStatusMessage('Connection failed after multiple attempts. Try again or check that the sender is online.');
    }

    return () => {
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, [connectionStatus, connectionRetries, infoHash]);

  const handleFileUpload = async (newFiles) => {
    if (!client) {
      toast.error('WebTorrent client not initialized');
      setStatusMessage('Error: WebTorrent client not initialized');
      return null;
    }

    if (newFiles.length === 0) {
      toast.error('No files selected');
      setStatusMessage('No files selected');
      return null;
    }

    setFiles(prev => [...prev, ...newFiles]);
    setConnectionStatus('seeding');
    setStatusMessage(`Preparing ${newFiles.length} file(s) for sharing...`);

    try {
      const link = await uploadFiles(newFiles);
      toast.success('Files ready to share!');
      setStatusMessage(`Files ready to share! Link generated.`);
      return link;
    } catch (error) {
      setConnectionStatus('error');
      setStatusMessage(`Error uploading files: ${error.message}`);
      toast.error('Error uploading files: ' + error.message);
    }
  };

  const handleRetryConnection = () => {
    if (infoHash) {
      setConnectionStatus('connecting');
      setStatusMessage('Retrying connection...');
      toast.info('Retrying connection...');
      downloadInitiatedRef.current = false;
      initiateDownload(infoHash);
    }
  };

  // Render connection status banner
  const renderStatusBanner = () => {
    if (!statusMessage) return null;

    let bannerClass = "mb-4 p-3 rounded-lg text-center text-sm";

    switch (connectionStatus) {
      case 'initializing':
      case 'connecting':
        bannerClass += " bg-yellow-100 text-yellow-800 border border-yellow-200";
        break;
      case 'failed':
      case 'error':
        bannerClass += " bg-red-100 text-red-800 border border-red-200";
        break;
      case 'connected':
      case 'seeding':
      case 'ready':
        bannerClass += " bg-green-100 text-green-800 border border-green-200";
        break;
      default:
        bannerClass += " bg-blue-100 text-blue-800 border border-blue-200";
    }

    return (
      <div className={bannerClass}>
        <p className="break-words">{statusMessage}</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header connectionStatus={connectionStatus} />

      <main className="max-w-6xl mx-auto px-4 py-4 sm:py-6">
        {/* Status banner for important messages */}
        {renderStatusBanner()}

        {!isReceiver ? (
          <div className="space-y-6 md:space-y-0 md:grid md:grid-cols-2 md:gap-6">
            <div className="bg-white rounded-xl shadow-md p-4">
              <h2 className="text-xl font-bold mb-4 text-gray-800">Upload Files</h2>
              <FileUploader onUpload={handleFileUpload} isUploading={isUploading} />

              {files.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-md font-semibold mb-3 text-gray-700">Your Files</h3>
                  <FileList files={files} progress={uploadProgress} />
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-md p-4">
              <h2 className="text-xl font-bold mb-4 text-gray-800">Share Files</h2>
              {shareLink ? (
                <>
                  <ShareLink link={shareLink} />
                  <div className="mt-6">
                    <h3 className="text-md font-semibold mb-3 text-gray-700">QR Code</h3>
                    <div className="flex justify-center">
                      <QRCodeGenerator value={shareLink} />
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-6 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-center">
                  <p className="text-gray-600">Upload files to generate a sharing link and QR code.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md p-4">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Receiving Files</h2>

            {connectionStatus === 'failed' && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="text-red-600 font-medium mb-2">Connection Failed</h3>
                <p className="text-red-700 mb-2">Unable to connect to the peer. This could be due to:</p>
                <ul className="list-disc pl-5 mb-4 text-red-700">
                  <li>The sharing session has ended</li>
                  <li>The sender went offline</li>
                  <li>Network firewall or connectivity issues</li>
                </ul>
                <button
                  onClick={handleRetryConnection}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-sm rounded transition-colors"
                >
                  Retry Connection
                </button>
              </div>
            )}

            {isDownloading ? (
              <div className="text-center py-6 bg-blue-50 border border-blue-100 rounded-lg">
                <div className="animate-pulse flex space-x-2 justify-center items-center">
                  <div className="h-3 w-3 bg-blue-600 rounded-full"></div>
                  <div className="h-3 w-3 bg-blue-600 rounded-full animation-delay-200"></div>
                  <div className="h-3 w-3 bg-blue-600 rounded-full animation-delay-400"></div>
                </div>
                <p className="text-blue-600 font-medium mt-3">Downloading from peer...</p>
              </div>
            ) : downloadFiles.length === 0 && connectionStatus !== 'failed' ? (
              <div className="text-center py-8 bg-gray-50 border border-dashed border-gray-300 rounded-lg">
                <div className="flex justify-center">
                  <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                  </svg>
                </div>
                <p className="text-gray-500 mt-4">Waiting for files from sender...</p>
                <p className="text-gray-400 text-sm mt-2">The connection is active, but no files have been shared yet</p>
              </div>
            ) : null}

            {downloadFiles.length > 0 && (
              <div className="mt-6">
                <h3 className="text-md font-semibold mb-3 text-gray-700">Received Files</h3>
                <FileList files={downloadFiles} progress={downloadProgress} />
              </div>
            )}
          </div>
        )}
      </main>

      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
}

export default App;
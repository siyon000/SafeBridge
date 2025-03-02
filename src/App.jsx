import React, { useState, useEffect } from 'react';
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
      console.log('WebTorrent client is ready');

      // If we're in receiver mode and have a hash, retry connection
      if (isReceiver && infoHash && connectionStatus !== 'connected') {
        initiateDownload(infoHash);
      }
    }
  }, [client]);

  // Check if URL has a torrent hash
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hash = urlParams.get('hash');

    if (hash) {
      setIsReceiver(true);
      setInfoHash(hash);
      setConnectionStatus('connecting');
      toast.info('Connecting to peer...');
      console.log('Detected hash in URL, switching to receiver mode', hash);

      // Connect to the torrent
      if (client) {
        console.log('Client ready, initiating download');
        initiateDownload(hash);
      } else {
        console.log('Client not ready, waiting for client initialization');
        const checkInterval = setInterval(() => {
          if (client) {
            console.log('Client now ready, initiating download');
            clearInterval(checkInterval);
            initiateDownload(hash);
          }
        }, 1000);

        // Clear interval after 30 seconds if client never initializes
        setTimeout(() => {
          clearInterval(checkInterval);
          if (!client) {
            setConnectionStatus('failed');
            toast.error('Failed to initialize connection');
          }
        }, 30000);
      }
    }
  }, [client]);

  const initiateDownload = (hash) => {
    console.log('Initiating download with hash:', hash);

    // Increment retry counter
    setConnectionRetries(prev => prev + 1);

    try {
      downloadFile(hash, (file) => {
        console.log('Received file:', file.name);
        setDownloadFiles(prev => {
          // Check if file already exists
          const exists = prev.some(f => f.name === file.name);
          if (exists) {
            // Update existing file
            return prev.map(f => f.name === file.name ? file : f);
          } else {
            // Add new file
            return [...prev, file];
          }
        });
        setConnectionStatus('connected');
        toast.success(`File "${file.name}" received!`);
      });
    } catch (error) {
      console.error('Error initiating download:', error);
      setConnectionStatus('failed');
      toast.error(`Download failed: ${error.message}`);
    }
  };

  // Add automatic retry logic for failed connections
  useEffect(() => {
    let retryTimeout;

    if (connectionStatus === 'failed' && connectionRetries < 3) {
      toast.info(`Connection failed. Retrying (${connectionRetries}/3)...`);
      retryTimeout = setTimeout(() => {
        if (infoHash) {
          setConnectionStatus('connecting');
          initiateDownload(infoHash);
        }
      }, 5000); // Wait 5 seconds before retrying
    }

    return () => {
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, [connectionStatus, connectionRetries, infoHash]);

  const handleFileUpload = async (newFiles) => {
    if (!client) {
      toast.error('WebTorrent client not initialized');
      return null;
    }

    if (newFiles.length === 0) {
      toast.error('No files selected');
      return null;
    }

    setFiles(prev => [...prev, ...newFiles]);
    setConnectionStatus('seeding');

    try {
      console.log('Starting file upload');
      const link = await uploadFiles(newFiles);
      console.log('Upload successful, link generated:', link);
      toast.success('Files ready to share!');
      return link;
    } catch (error) {
      console.error('Error in handleFileUpload:', error);
      setConnectionStatus('error');
      toast.error('Error uploading files: ' + error.message);
    }
  };

  // Add a manual retry button for connection failures
  const handleRetryConnection = () => {
    if (infoHash) {
      setConnectionStatus('connecting');
      toast.info('Retrying connection...');
      initiateDownload(infoHash);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header connectionStatus={connectionStatus} />

      <main className="container mx-auto px-4 py-8">
        {!isReceiver ? (
          <div className="grid gap-8 md:grid-cols-2">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-2xl font-bold mb-4 text-gray-800">Upload Files</h2>
              <FileUploader onUpload={handleFileUpload} isUploading={isUploading} />

              {files.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-2 text-gray-700">Your Files</h3>
                  <FileList files={files} progress={uploadProgress} />
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-2xl font-bold mb-4 text-gray-800">Share Files</h2>
              {shareLink ? (
                <>
                  <ShareLink link={shareLink} />
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-2 text-gray-700">QR Code</h3>
                    <QRCodeGenerator value={shareLink} />
                  </div>
                </>
              ) : (
                <p className="text-gray-600">Upload files to generate a sharing link and QR code.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Receiving Files</h2>

            {connectionStatus === 'failed' && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="text-red-600 font-medium mb-2">Connection Failed</h3>
                <p className="text-red-700 mb-3">Unable to connect to the peer. This could be due to:</p>
                <ul className="list-disc pl-5 mb-3 text-red-700">
                  <li>The sharing session has ended</li>
                  <li>The sender went offline</li>
                  <li>Network firewall or connectivity issues</li>
                </ul>
                <button
                  onClick={handleRetryConnection}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
                >
                  Retry Connection
                </button>
              </div>
            )}

            {isDownloading ? (
              <div className="text-center py-4">
                <div className="animate-pulse flex space-x-2 justify-center items-center">
                  <div className="h-3 w-3 bg-blue-600 rounded-full"></div>
                  <div className="h-3 w-3 bg-blue-600 rounded-full animation-delay-200"></div>
                  <div className="h-3 w-3 bg-blue-600 rounded-full animation-delay-400"></div>
                </div>
                <p className="text-blue-600 font-medium mt-2">Downloading from peer...</p>
              </div>
            ) : downloadFiles.length === 0 && connectionStatus !== 'failed' ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Waiting for files from sender...</p>
              </div>
            ) : null}

            {downloadFiles.length > 0 && (
              <div className="mt-4">
                <h3 className="text-lg font-semibold mb-2 text-gray-700">Received Files</h3>
                <FileList files={downloadFiles} progress={downloadProgress} />
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="mt-12 py-6 bg-gray-100 text-center text-gray-600">
        <p>Secure P2P File Sharing - No server storage, direct peer-to-peer transfer</p>
      </footer>

      <ToastContainer position="bottom-right" />
    </div>
  );
}

export default App;
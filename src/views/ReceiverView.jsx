import React from 'react';
import FileList from '../components/FileList';
import { useConnection } from '../context/ConnectionContext';

const ReceiverView = () => {
    const {
        connectionStatus,
        isDownloading,
        downloadFiles,
        downloadProgress,
        handleRetryConnection
    } = useConnection();

    return (
        <div className="bg-gray-800 rounded-xl shadow-md p-4 border border-gray-700">
            <h2 className="text-xl font-bold mb-4 text-gray-200">Receiving Files</h2>

            {connectionStatus === 'failed' && (
                <div className="mb-6 bg-red-900 bg-opacity-20 border border-red-800 rounded-lg p-4">
                    <h3 className="text-red-400 font-medium mb-2">Connection Failed</h3>
                    <p className="text-red-300 mb-2">Unable to connect to the peer. This could be due to:</p>
                    <ul className="list-disc pl-5 mb-4 text-red-300">
                        <li>The sharing session has ended</li>
                        <li>The sender went offline</li>
                        <li>Network firewall or connectivity issues</li>
                    </ul>
                    <button
                        onClick={handleRetryConnection}
                        className="bg-red-700 hover:bg-red-800 text-white px-4 py-2 text-sm rounded transition-colors"
                    >
                        Retry Connection
                    </button>
                </div>
            )}

            {isDownloading ? (
                <div className="text-center py-6 bg-blue-900 bg-opacity-20 border border-blue-800 rounded-lg">
                    <div className="animate-pulse flex space-x-2 justify-center items-center">
                        <div className="h-3 w-3 bg-blue-500 rounded-full"></div>
                        <div className="h-3 w-3 bg-blue-500 rounded-full animation-delay-200"></div>
                        <div className="h-3 w-3 bg-blue-500 rounded-full animation-delay-400"></div>
                    </div>
                    <p className="text-blue-400 font-medium mt-3">Downloading from peer...</p>
                </div>
            ) : downloadFiles.length === 0 && connectionStatus !== 'failed' ? (
                <div className="text-center py-8 bg-gray-700 border border-dashed border-gray-600 rounded-lg">
                    <div className="flex justify-center">
                        <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                        </svg>
                    </div>
                    <p className="text-gray-300 mt-4">Waiting for files from sender...</p>
                    <p className="text-gray-500 text-sm mt-2">The connection is active, but no files have been shared yet</p>
                </div>
            ) : null}

            {downloadFiles.length > 0 && (
                <div className="mt-6">
                    <h3 className="text-md font-semibold mb-3 text-gray-300">Received Files</h3>
                    <FileList files={downloadFiles} progress={downloadProgress} />
                </div>
            )}
        </div>
    );
};

export default ReceiverView;
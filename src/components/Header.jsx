import React from 'react';

const Header = ({ connectionStatus = 'initializing' }) => {
    const statusConfig = {
        initializing: {
            color: 'bg-yellow-400',
            text: 'Initializing',
            description: 'Setting up connection...',
            icon: 'clock'
        },
        ready: {
            color: 'bg-green-400',
            text: 'Ready',
            description: 'Ready to share files',
            icon: 'check'
        },
        connecting: {
            color: 'bg-yellow-400',
            text: 'Connecting',
            description: 'Establishing connection...',
            icon: 'refresh'
        },
        connected: {
            color: 'bg-green-400',
            text: 'Connected',
            description: 'Connection established',
            icon: 'check'
        },
        seeding: {
            color: 'bg-green-400',
            text: 'Sharing Files',
            description: 'Your files are available to download',
            icon: 'upload'
        },
        failed: {
            color: 'bg-red-500',
            text: 'Connection Failed',
            description: 'Unable to establish connection',
            icon: 'x'
        },
        unsupported: {
            color: 'bg-red-500',
            text: 'Not Supported',
            description: 'Your browser does not support WebRTC',
            icon: 'alert-triangle'
        },
        error: {
            color: 'bg-red-500',
            text: 'Error',
            description: 'An error occurred',
            icon: 'alert-octagon'
        }
    };

    const status = statusConfig[connectionStatus] || statusConfig.initializing;

    // Function to render the appropriate icon
    const renderIcon = (iconName) => {
        switch (iconName) {
            case 'check':
                return (
                    <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M5 13l4 4L19 7"></path>
                    </svg>
                );
            case 'x':
                return (
                    <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                );
            case 'refresh':
                return (
                    <svg className="w-4 h-4 animate-spin" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                    </svg>
                );
            case 'upload':
                return (
                    <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12"></path>
                    </svg>
                );
            case 'clock':
                return (
                    <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                );
            case 'alert-triangle':
                return (
                    <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                    </svg>
                );
            case 'alert-octagon':
                return (
                    <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M11 15h2m-6 4h12a2 2 0 002-2l-1-12a2 2 0 00-2-2H7a2 2 0 00-2 2l-1 12a2 2 0 002 2z"></path>
                    </svg>
                );
            default:
                return null;
        }
    };

    return (
        <header className="bg-blue-600 text-white shadow-md">
            <div className="max-w-6xl mx-auto px-4 py-3">
                <div className="flex items-center justify-between">
                    {/* Logo and title section */}
                    <div className="flex items-center">
                        <div>
                            <h1 className="text-xl font-bold">SafeBridge</h1>
                            <p className="text-blue-200 text-sm">Secure peer-to-peer file sharing</p>
                        </div>
                    </div>

                    {/* Status indicator - more compact on large screens */}
                    <div className={`px-3 py-2 rounded-lg flex items-center space-x-2 shadow-sm ${status.color.replace('bg-', 'bg-opacity-20 text-')}`}>
                        <div className={`flex-shrink-0 p-1 rounded-full ${status.color} shadow flex items-center justify-center`}>
                            {renderIcon(status.icon)}
                        </div>
                        <div>
                            <p className="font-medium text-sm">{status.text}</p>
                            <p className="text-xs opacity-90">{status.description}</p>
                        </div>
                    </div>
                </div>

                {/* Linear progress indicator for actionable states */}
                {['connecting', 'initializing'].includes(connectionStatus) && (
                    <div className="w-full h-1 bg-blue-700 mt-3 overflow-hidden rounded">
                        <div className="h-1 bg-blue-300 animate-pulse-x" style={{ width: '30%' }}></div>
                    </div>
                )}

                {/* Connection tips for important states */}
                {connectionStatus === 'connecting' && (
                    <div className="bg-blue-700 bg-opacity-50 text-sm p-2 mt-3 rounded text-center">
                        Connecting to peer... This might take a moment depending on network conditions.
                    </div>
                )}

                {connectionStatus === 'failed' && (
                    <div className="bg-red-700 bg-opacity-50 text-sm p-2 mt-3 rounded text-center">
                        Connection failed. The sender may be offline or behind a restrictive firewall.
                    </div>
                )}
            </div>
        </header>
    );
};

export default Header;
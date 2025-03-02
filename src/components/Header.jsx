import React from 'react';

const Header = ({ connectionStatus = 'initializing' }) => {
    const statusConfig = {
        initializing: { color: 'bg-yellow-400', text: 'Initializing' },
        ready: { color: 'bg-green-400', text: 'Ready' },
        connecting: { color: 'bg-yellow-400 animate-pulse', text: 'Connecting' },
        connected: { color: 'bg-green-400', text: 'Connected' },
        seeding: { color: 'bg-green-400', text: 'Sharing Files' },
        failed: { color: 'bg-red-500', text: 'Connection Failed' },
        unsupported: { color: 'bg-red-500', text: 'Not Supported' },
        error: { color: 'bg-red-500', text: 'Error' }
    };

    const status = statusConfig[connectionStatus] || statusConfig.initializing;

    return (
        <header className="bg-blue-600 text-white shadow-md">
            <div className="container mx-auto px-4 py-5 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">P2PShare</h1>
                    <p className="text-blue-200">Secure peer-to-peer file sharing</p>
                </div>
                <div className="flex items-center space-x-2">
                    <div className={`h-3 w-3 ${status.color} rounded-full`}></div>
                    <span className="text-sm font-medium">{status.text}</span>
                </div>
            </div>
        </header>
    );
};

export default Header;
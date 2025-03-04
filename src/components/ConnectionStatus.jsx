import React from 'react';
import { useConnection } from '../context/ConnectionContext';

const ConnectionStatus = () => {
    const { statusMessage, connectionStatus } = useConnection();

    if (!statusMessage) return null;

    let bannerClass = "mb-4 p-3 rounded-lg text-center text-sm";

    switch (connectionStatus) {
        case 'initializing':
        case 'connecting':
            bannerClass += " bg-yellow-900 bg-opacity-30 text-yellow-300 border border-yellow-800";
            break;
        case 'failed':
        case 'error':
            bannerClass += " bg-red-900 bg-opacity-30 text-red-300 border border-red-800";
            break;
        case 'connected':
        case 'seeding':
        case 'ready':
            bannerClass += " bg-green-900 bg-opacity-30 text-green-300 border border-green-800";
            break;
        default:
            bannerClass += " bg-blue-900 bg-opacity-30 text-blue-300 border border-blue-800";
    }

    return (
        <div className={bannerClass}>
            <p className="break-words">{statusMessage}</p>
        </div>
    );
};

export default ConnectionStatus;
import React, { useState } from 'react';
import { toast } from 'react-toastify';

const ShareLink = ({ link }) => {
    const [copied, setCopied] = useState(false);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(link);
        setCopied(true);
        toast.success('Link copied to clipboard!');

        setTimeout(() => {
            setCopied(false);
        }, 2000);
    };

    return (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
                <div className="truncate mr-2 text-sm font-mono bg-white rounded px-2 py-1 border border-gray-200 flex-1">
                    {link}
                </div>
                <button
                    onClick={copyToClipboard}
                    className={`ml-2 px-3 py-1 rounded transition-colors ${copied
                        ? 'bg-green-500 text-white'
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                        }`}
                >
                    {copied ? 'Copied!' : 'Copy'}
                </button>
            </div>
            <p className="text-sm text-gray-600 mt-2">
                Share this link with the recipient to allow them to download the files
            </p>
        </div>
    );
};

export default ShareLink;
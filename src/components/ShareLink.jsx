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
            <div className="flex flex-col space-y-2">
                <div className="relative">
                    <div className="bg-white rounded px-3 py-2 border border-gray-200 w-full overflow-hidden">
                        <p className="truncate text-sm font-mono break-all" title={link}>
                            {link}
                        </p>
                    </div>
                </div>
                <button
                    onClick={copyToClipboard}
                    className={`px-4 py-2 rounded transition-colors text-white w-full ${copied ? 'bg-green-500' : 'bg-blue-500 hover:bg-blue-600'
                        }`}
                >
                    {copied ? 'Copied!' : 'Copy Link'}
                </button>
            </div>
            <p className="text-sm text-gray-600 mt-3">
                Share this link with the recipient to allow them to download the files
            </p>
        </div>
    );
};

export default ShareLink;
import React, { useState } from 'react';
import { toast } from 'react-toastify';

const ShareLink = ({ link }) => {
    const [copied, setCopied] = useState(false);

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            toast.success('Link copied to clipboard!');
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
            toast.error('Failed to copy link to clipboard');
        }
    };

    return (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center">
                <div className="flex-grow mb-2 sm:mb-0">
                    <label htmlFor="share-link" className="block text-sm font-medium text-gray-300 mb-1">
                        Share this link with the recipient
                    </label>
                    <div className="relative rounded-md shadow-sm">
                        <input
                            type="text"
                            id="share-link"
                            className="block w-full pr-10 bg-gray-700 border-gray-600 text-gray-200 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            value={link}
                            readOnly
                        />
                    </div>
                </div>
                <div className="sm:ml-3 flex-shrink-0">
                    <button
                        type="button"
                        onClick={copyToClipboard}
                        className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${copied ? 'bg-green-700 hover:bg-green-800' : 'bg-blue-700 hover:bg-blue-800'
                            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500 transition-colors`}
                    >
                        {copied ? (
                            <>
                                <svg className="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                                Copied!
                            </>
                        ) : (
                            <>
                                <svg className="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                                    />
                                </svg>
                                Copy Link
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ShareLink;
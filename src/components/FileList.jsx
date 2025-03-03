import React from 'react';
import ProgressBar from './ProgressBar';
import { formatBytes } from '../utils/fileHelpers';

const FileList = ({ files, progress = {} }) => {
    return (
        <ul className="divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden">
            {files.map(file => (
                <li key={file.id || file.name} className="p-3 bg-white">
                    <div className="flex flex-col sm:flex-row sm:items-center">
                        <div className="min-w-0 flex-1">
                            {/* File name with tooltip for overflow */}
                            <div className="flex items-center">
                                <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                </svg>
                                <p className="text-sm font-medium text-gray-900 truncate" title={file.name}>
                                    {file.name}
                                </p>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{formatBytes(file.size)}</p>

                            {progress[file.id || file.name] !== undefined && (
                                <div className="mt-2 mb-1">
                                    <ProgressBar
                                        progress={progress[file.id || file.name]}
                                        color={progress[file.id || file.name] === 100 ? "green" : "blue"}
                                    />
                                    <p className="text-xs text-right mt-1 text-gray-500">
                                        {Math.round(progress[file.id || file.name])}%
                                    </p>
                                </div>
                            )}
                        </div>

                        {file.done && (
                            <div className="mt-2 sm:mt-0 sm:ml-4">
                                <a
                                    href={file.downloadUrl || '#'}
                                    download={file.name}
                                    className="inline-flex items-center justify-center bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm"
                                    title="Download"
                                    aria-label={`Download ${file.name}`}
                                >
                                    <svg className="h-4 w-4 mr-1 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    Download
                                </a>
                            </div>
                        )}
                    </div>
                </li>
            ))}
        </ul>
    );
};

export default FileList;
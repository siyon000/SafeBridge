import React from 'react';
import ProgressBar from './ProgressBar';
import { formatBytes } from '../utils/fileHelpers';

const FileList = ({ files, progress = {} }) => {
    return (
        <ul className="divide-y divide-gray-200">
            {files.map(file => (
                <li key={file.id || file.name} className="py-3">
                    <div className="flex items-start">
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                            <p className="text-xs text-gray-500">{formatBytes(file.size)}</p>

                            {progress[file.id || file.name] !== undefined && (
                                <div className="mt-1">
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
                            <a
                                href={file.downloadUrl || '#'}
                                download={file.name}
                                className="ml-4 flex-shrink-0 bg-green-50 rounded-full p-1"
                                title="Download"
                            >
                                <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                            </a>
                        )}
                    </div>
                </li>
            ))}
        </ul>
    );
};

export default FileList;
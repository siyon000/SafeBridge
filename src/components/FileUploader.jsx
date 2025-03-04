import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

const FileUploader = ({ onUpload, isUploading }) => {
    const onDrop = useCallback(acceptedFiles => {
        if (acceptedFiles?.length) {
            const filesWithMetadata = acceptedFiles.map(file =>
                Object.assign(file, {
                    id: Math.random().toString(36).substring(2),
                    preview: URL.createObjectURL(file)
                })
            );

            onUpload(filesWithMetadata);
        }
    }, [onUpload]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        disabled: isUploading
    });

    return (
        <div
            {...getRootProps()}
            className={`file-drop-zone border-2 border-dashed border-gray-600 rounded-lg p-4 h-32 sm:h-40 flex items-center justify-center ${isDragActive ? 'bg-gray-700 border-blue-500' : 'bg-gray-800'
                } ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-700 hover:border-blue-500 transition-colors'
                }`}
        >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center max-w-full">
                <svg
                    className="w-8 h-8 sm:w-10 sm:h-10 text-blue-500 mb-2"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>

                {isUploading ? (
                    <p className="text-gray-400 text-center text-sm">Uploading...</p>
                ) : (
                    <>
                        <p className="font-medium text-blue-400 text-center text-xs sm:text-sm">Drop files here, or click to select</p>
                        {/* <p className="text-xs text-gray-400 mt-1 text-center">Upload multiple files at once</p> */}
                    </>
                )}
            </div>
        </div>
    );
};

export default FileUploader;
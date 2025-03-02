import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

const FileUploader = ({ onUpload, isUploading }) => {
    const onDrop = useCallback(acceptedFiles => {
        if (acceptedFiles?.length) {
            // Add some metadata to the files
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
            className={`file-drop-zone ${isDragActive ? 'active' : ''} ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center">
                <svg
                    className="w-12 h-12 text-blue-500 mb-2"
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
                    <p className="text-gray-600">Uploading...</p>
                ) : (
                    <>
                        <p className="font-medium text-blue-600">Drop files here, or click to select</p>
                        <p className="text-sm text-gray-500 mt-1">Upload multiple files at once</p>
                    </>
                )}
            </div>
        </div>
    );
};

export default FileUploader;
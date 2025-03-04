import React from 'react';
import FileUploader from '../components/FileUploader';
import FileList from '../components/FileList';
import ShareLink from '../components/ShareLink';
import QRCodeGenerator from '../components/QRCodeGenerator';
import { useConnection } from '../context/ConnectionContext';

const SenderView = () => {
    const {
        files,
        shareLink,
        uploadProgress,
        isUploading,
        handleFileUpload
    } = useConnection();

    return (
        <div className="space-y-6 md:space-y-0 md:grid md:grid-cols-2 md:gap-6">
            <div className="bg-gray-800 rounded-xl shadow-md p-4 border border-gray-700">
                <h2 className="text-xl font-bold mb-4 text-gray-200">Upload Files</h2>
                <FileUploader onUpload={handleFileUpload} isUploading={isUploading} />
                {files.length > 0 && (
                    <div className="mt-6">
                        <h3 className="text-md font-semibold mb-3 text-gray-300">Your Files</h3>
                        <FileList files={files} progress={uploadProgress} />
                    </div>
                )}
            </div>
            <div className="bg-gray-800 rounded-xl shadow-md p-4 border border-gray-700">
                <h2 className="text-xl font-bold mb-4 text-gray-200">Share Files</h2>
                {shareLink ? (
                    <>
                        <ShareLink link={shareLink} />
                        <div className="mt-6">
                            <h3 className="text-md font-semibold mb-3 text-gray-300">QR Code</h3>
                            <div className="flex justify-center">
                                <QRCodeGenerator value={shareLink} />
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="text-center py-8 bg-gray-700 border border-dashed border-gray-600 rounded-lg">
                        <div className="flex justify-center">
                            <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path>
                            </svg>
                        </div>
                        <p className="text-gray-300 mt-4">Upload files to generate a sharing link</p>
                        <p className="text-gray-500 text-sm mt-2">The link and QR code will appear here after uploading</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SenderView;
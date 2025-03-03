import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

const QRCodeGenerator = ({ value }) => {
    // If no value is provided, show a loading/error state
    if (!value) {
        return (
            <div className="flex flex-col items-center">
                <div className="p-3 sm:p-4 bg-gray-100 rounded-lg shadow-sm border border-gray-200 flex items-center justify-center h-40 w-40 sm:h-48 sm:w-48">
                    <p className="text-gray-500 text-xs sm:text-sm text-center">Waiting for link generation...</p>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 mt-2 text-center px-2 sm:px-4">
                    The QR code will appear once file sharing is ready
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center">
            <div className="p-3 sm:p-4 bg-white rounded-lg shadow-sm border border-gray-200 flex items-center justify-center">
                <QRCodeSVG
                    value={value}
                    size={160}
                    includeMargin={true}
                    bgColor={"#FFFFFF"}
                    fgColor={"#000000"}
                    level={"H"}
                />
            </div>
            <p className="text-xs sm:text-sm text-gray-600 mt-2 text-center px-2 sm:px-4">
                Scan this QR code with your camera to instantly receive files
            </p>
        </div>
    );
};

export default QRCodeGenerator;

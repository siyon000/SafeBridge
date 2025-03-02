import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

const QRCodeGenerator = ({ value }) => {
    // If no value is provided, show a loading/error state
    if (!value) {
        return (
            <div className="flex flex-col items-center">
                <div className="p-4 bg-gray-100 rounded-lg shadow-sm border border-gray-200 inline-block h-[180px] w-[180px] flex items-center justify-center">
                    <p className="text-gray-500 text-sm text-center">Waiting for link generation...</p>
                </div>
                <p className="text-sm text-gray-600 mt-3">
                    The QR code will appear once file sharing is ready
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center">
            <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200 inline-block">
                <QRCodeSVG
                    value={value}
                    size={180}
                    includeMargin={true}
                    bgColor={"#FFFFFF"}
                    fgColor={"#000000"}
                    level={"H"}
                />
            </div>
            <p className="text-sm text-gray-600 mt-3">
                Scan this QR code with your camera to instantly receive files
            </p>
        </div>
    );
};

export default QRCodeGenerator;
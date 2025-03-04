import React from 'react';

const ProgressBar = ({ progress, color = 'blue' }) => {
    const colorClasses = {
        blue: 'bg-blue-600',
        green: 'bg-green-600',
        red: 'bg-red-600',
        yellow: 'bg-yellow-600'
    };

    const bgClass = colorClasses[color] || colorClasses.blue;

    return (
        <div className="w-full bg-gray-700 rounded-full h-2.5">
            <div
                className={`${bgClass} h-2.5 rounded-full transition-all duration-300 ease-in-out`}
                style={{ width: `${progress}%` }}
            ></div>
        </div>
    );
};

export default ProgressBar;
import React from 'react';

const ProgressBar = ({ progress, color = "blue" }) => {
    const colorClasses = {
        blue: "bg-blue-500",
        green: "bg-green-500",
        red: "bg-red-500"
    };

    return (
        <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
                className={`h-2.5 rounded-full ${colorClasses[color] || colorClasses.blue} transition-all duration-300 ease-in-out`}
                style={{ width: `${Math.round(progress)}%` }}
            ></div>
        </div>
    );
};

export default ProgressBar;
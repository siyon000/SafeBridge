/**
 * Format bytes to human-readable format
 * @param {number} bytes - The number of bytes
 * @param {number} decimals - Number of decimal places to show
 * @returns {string} Formatted string with appropriate unit
 */
export const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Generate a unique ID for files
 * @returns {string} A unique ID
 */
export const generateFileId = () => {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

/**
 * Get file type category based on MIME type
 * @param {string} mimeType - The MIME type of the file
 * @returns {string} The category of the file
 */
export const getFileCategory = (mimeType) => {
    if (!mimeType) return 'unknown';

    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.startsWith('text/')) return 'document';
    if (mimeType.includes('pdf')) return 'document';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'document';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'spreadsheet';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'presentation';

    return 'other';
};

/**
 * Create a downloadable URL for a file
 * @param {File} file - The file object
 * @returns {string} URL for the file
 */
export const createDownloadUrl = (file) => {
    return URL.createObjectURL(file);
};

/**
 * Clean up a URL created with URL.createObjectURL
 * @param {string} url - The URL to revoke
 */
export const revokeDownloadUrl = (url) => {
    if (url && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
    }
};
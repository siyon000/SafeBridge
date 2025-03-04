// services/fileProcessingService.js

export const processDownloadedFiles = (torrent, onFileReceived) => {
    // Track processed files to prevent duplicates
    const processedFiles = new Set();

    // Process and provide download URLs for each file
    torrent.files.forEach(file => {
        // Skip if already processed
        if (processedFiles.has(file.name)) {
            return;
        }

        console.log(`Processing downloaded file: ${file.name}`);
        processedFiles.add(file.name);

        // Try multiple methods to create downloadable file
        processFileDownload(file, onFileReceived);
    });
};

// Process downloaded file using the most reliable method available
const processFileDownload = (file, onFileReceived) => {
    // Try all available methods one after another if previous fails
    tryMethod1(file, onFileReceived);
};

// Method 1: Try using getBlobURL first if available
const tryMethod1 = (file, onFileReceived) => {
    try {
        if (typeof file.getBlobURL === 'function') {
            file.getBlobURL((err, url) => {
                if (err) {
                    console.error('Error getting blob URL:', err);
                    tryMethod2(file, onFileReceived);
                    return;
                }
                createDownloadableFile(file, url, onFileReceived);
            });
        } else {
            tryMethod2(file, onFileReceived);
        }
    } catch (error) {
        console.error('Error in method 1:', error);
        tryMethod2(file, onFileReceived);
    }
};

// Method 2: Try using createReadStream/blob method
const tryMethod2 = (file, onFileReceived) => {
    try {
        if (typeof file.createReadStream === 'function') {
            // Initialize an empty array to store chunks
            const chunks = [];

            // Create a read stream from the file
            const stream = file.createReadStream();

            // Listen for data chunks
            stream.on('data', (chunk) => {
                chunks.push(chunk);
            });

            // When the stream ends, create a blob from all chunks
            stream.on('end', () => {
                try {
                    // Convert chunks to a Blob
                    const blob = new Blob(chunks, { type: file.type || 'application/octet-stream' });

                    // Create a URL from the blob
                    const url = URL.createObjectURL(blob);

                    createDownloadableFile(file, url, onFileReceived);
                } catch (error) {
                    console.error('Error creating blob:', error);
                    tryMethod3(file, onFileReceived);
                }
            });

            // Handle errors
            stream.on('error', (err) => {
                console.error('Stream error:', err);
                tryMethod3(file, onFileReceived);
            });
        } else {
            tryMethod3(file, onFileReceived);
        }
    } catch (error) {
        console.error('Error in method 2:', error);
        tryMethod3(file, onFileReceived);
    }
};

// Method 3: Direct file URL if available
const tryMethod3 = (file, onFileReceived) => {
    try {
        if (file.path) {
            // Create a fake URL for the file
            const url = `blob:${window.location.origin}/${file.name}-${Date.now()}`;
            createDownloadableFile(file, url, onFileReceived);
        } else {
            console.error('All download methods failed for file:', file.name);
            // Create a placeholder file object without download URL
            const placeholderFile = {
                name: file.name,
                size: file.length,
                type: file.type || 'application/octet-stream',
                error: 'Unable to generate download URL',
                done: true
            };
            onFileReceived(placeholderFile);
        }
    } catch (error) {
        console.error('Error in method 3:', error);
    }
};

// Helper function to create a downloadable file object
const createDownloadableFile = (file, url, onFileReceived) => {
    const downloadableFile = {
        name: file.name,
        size: file.length,
        type: file.type || 'application/octet-stream',
        downloadUrl: url,
        done: true
    };

    console.log('File ready for download:', downloadableFile.name);
    onFileReceived(downloadableFile);
};
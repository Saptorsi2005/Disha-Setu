/**
 * src/utils/cloudStorage.js
 * Cloudinary upload helper
 */
const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a file buffer to Cloudinary
 * @param {Buffer} buffer  - File buffer from Multer
 * @param {string} folder  - Cloudinary folder name
 * @returns {Promise<string>} Public URL of uploaded image
 */
const uploadToCloud = (buffer, folder = 'dishasetu/feedback') => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder, resource_type: 'image' },
            (error, result) => {
                if (error) return reject(error);
                resolve(result.secure_url);
            }
        );
        stream.end(buffer);
    });
};

module.exports = { cloudinary, uploadToCloud };

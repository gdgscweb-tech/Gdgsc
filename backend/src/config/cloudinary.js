const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// ------------------------------------------------------
// 🔵 Validate Cloudinary ENV variables
// ------------------------------------------------------
const validateCloudinaryConfig = () => {
    const requiredVars = [
        'CLOUDINARY_CLOUD_NAME',
        'CLOUDINARY_API_KEY',
        'CLOUDINARY_API_SECRET'
    ];

    const missingVars = requiredVars.filter(v => !process.env[v]);

    if (missingVars.length > 0) {
        console.error("\n❌ Missing Cloudinary ENV variables:", missingVars.join(", "));
        throw new Error(`Missing Cloudinary environment variables: ${missingVars.join(', ')}`);
    }
};

try {
    validateCloudinaryConfig();
} catch (err) {
    console.error('Cloudinary Configuration Error:', err.message);
}

// ------------------------------------------------------
// 🔵 Configure Cloudinary
// ------------------------------------------------------
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

// ------------------------------------------------------
// 🔵 Cloudinary Storage for Multer
// ------------------------------------------------------
const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'event-images',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        transformation: [{ width: 1200, height: 630, crop: 'limit' }],
        public_id: (req, file) => {
            console.log("\n🟣 [CloudinaryStorage] Generating public_id for file:", file.originalname);
            const timestamp = Date.now();
            const name = file.originalname.split('.')[0].replace(/[^a-zA-Z0-9]/g, '_');
            return `event_${timestamp}_${name}`;
        }
    }
});

// ------------------------------------------------------
// 🔵 Multer Upload Middleware (with debug logging)
// ------------------------------------------------------
const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        console.log("\n🟠 [Multer] File detected:");
        console.log("➡️ fieldname:", file.fieldname);
        console.log("➡️ originalname:", file.originalname);
        console.log("➡️ mimetype:", file.mimetype);
        console.log("➡️ size:", file.size);

        const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

        if (allowed.includes(file.mimetype)) {
            console.log("🟩 [Multer] File accepted.");
            cb(null, true);
        } else {
            console.log("❌ [Multer] File rejected — invalid mime type!");
            cb(new Error("Invalid file type. Allowed: JPG, PNG, GIF, WEBP"), false);
        }
    }
});

// ------------------------------------------------------
// 🔵 Upload Error Handler Middleware
// ------------------------------------------------------
const handleUploadError = (err, req, res, next) => {
    console.log("\n🔴 [UPLOAD ERROR MIDDLEWARE]");
    console.log("➡️ Error:", err);

    if (err instanceof multer.MulterError) {
        // Multer-specific errors
        return res.status(400).json({
            success: false,
            message: err.code === 'LIMIT_FILE_SIZE'
                ? 'File too large (max 5MB).'
                : `Multer error: ${err.message}`
        });
    }

    if (err) {
        return res.status(400).json({
            success: false,
            message: `Upload failed: ${err.message}`
        });
    }

    next();
};

// ------------------------------------------------------
module.exports = {
    cloudinary,
    upload,
    handleUploadError
};


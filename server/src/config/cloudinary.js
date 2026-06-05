const cloudinary = require('cloudinary').v2;
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Custom Multer storage engine for Cloudinary v2
// multer-storage-cloudinary@4 only supports cloudinary v1, so we implement our own.
class CloudinaryStorageV2 {
  _handleFile(req, file, cb) {
    const isImage = file.mimetype.startsWith('image/');
    const isVideo = file.mimetype.startsWith('video/');

    const folder = `nexchat/${isImage ? 'images' : isVideo ? 'videos' : 'files'}`;
    const resource_type = isVideo ? 'video' : isImage ? 'image' : 'raw';

    const uploadOptions = {
      folder,
      resource_type,
      ...(isImage && { transformation: [{ quality: 'auto', fetch_format: 'auto' }] }),
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) return cb(error);
        cb(null, {
          path: result.secure_url,       // accessible as req.file.path
          filename: result.public_id,    // accessible as req.file.filename
          size: result.bytes,
          mimetype: file.mimetype,
          originalname: file.originalname,
        });
      }
    );

    file.stream.pipe(uploadStream);
  }

  _removeFile(req, file, cb) {
    cloudinary.uploader.destroy(file.filename, cb);
  }
}

const upload = multer({
  storage: new CloudinaryStorageV2(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm',
      'audio/mpeg', 'audio/wav', 'audio/ogg',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/zip',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed`), false);
    }
  },
});

module.exports = { cloudinary, upload };

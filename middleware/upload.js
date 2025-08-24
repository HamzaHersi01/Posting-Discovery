// middleware/upload.js
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary.js';

// Configure storage for Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'repairo-jobs', // Folder name in Cloudinary
    allowed_formats: ['jpg', 'jpeg', 'png'],
    transformation: [
      { width: 800, height: 600, crop: 'limit' }, // Resize images
      { quality: 'auto' } // Auto optimize quality
    ]
  },
});

// Create multer instance
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB file size limit
  },
  fileFilter: (req, file, cb) => {
    // Check if file is an image
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

export default upload;
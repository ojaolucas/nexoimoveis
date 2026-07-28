const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure memory storage to hold file buffer
const storage = multer.memoryStorage();

// File filter based on type and size limits
const fileFilter = (req, file, cb) => {
  const allowedImageTypes = /jpeg|jpg|png|webp/;
  const allowedPdfTypes = /pdf/;
  const extension = path.extname(file.originalname).toLowerCase();
  const mimetype = file.mimetype.toLowerCase();

  const isImage = allowedImageTypes.test(extension) && allowedImageTypes.test(mimetype);
  const isPdf = allowedPdfTypes.test(extension) && allowedPdfTypes.test(mimetype);

  if (isImage || isPdf) {
    cb(null, true);
  } else {
    cb(new Error('Formato de arquivo inválido. Apenas imagens (JPG, JPEG, PNG, WEBP) e PDFs são permitidos.'));
  }
};

// Size limits: Images up to 10MB, PDFs up to 20MB
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    // Note: multer limits size globally. We can check and validate specific sizes in middleware.
    fileSize: 20 * 1024 * 1024, // global max size 20MB
  },
});

module.exports = upload;

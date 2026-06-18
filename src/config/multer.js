const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure disk storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Determine the directory based on the request endpoint or custom module field
    let moduleFolder = 'others';
    const url = req.originalUrl || '';
    
    if (url.includes('imoveis')) {
      moduleFolder = 'imoveis';
    } else if (url.includes('contratos')) {
      moduleFolder = 'contratos';
    } else if (url.includes('proprietarios')) {
      moduleFolder = 'proprietarios';
    } else if (url.includes('locatarios')) {
      moduleFolder = 'locatarios';
    } else if (url.includes('manutencoes')) {
      moduleFolder = 'manutencoes';
    } else if (url.includes('vistorias')) {
      moduleFolder = 'vistorias';
    } else if (url.includes('despesas')) {
      moduleFolder = 'despesas';
    }

    const uploadPath = path.join(__dirname, '../../uploads', moduleFolder);

    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

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

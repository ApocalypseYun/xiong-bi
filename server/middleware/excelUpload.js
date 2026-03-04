const multer = require('multer');

// Memory storage for Excel file uploads (no disk write)
const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { 
    fileSize: 5 * 1024 * 1024, // 5MB max
    files: 1 // Single file only
  },
  fileFilter: (req, file, cb) => {
    // Accept Excel files (.xlsx, .xls)
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'application/excel',
      'application/x-excel',
      'application/x-msexcel'
    ];
    
    const allowedExtensions = ['.xlsx', '.xls'];
    const fileExt = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
    
    if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error('只支持 Excel 文件（.xlsx, .xls）'), false);
    }
  }
});

module.exports = excelUpload;

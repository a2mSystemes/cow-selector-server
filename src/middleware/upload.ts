import multer from "multer";
import path from "path";

// Configuration multer 2.x optimisée pour upload en mémoire
const storage = multer.memoryStorage();

// Configuration de validation des fichiers améliorée pour multer 2.x
const fileFilter = (
  req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Types MIME autorisés
  const allowedMimeTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'application/excel',
    'application/x-excel',
    'application/x-msexcel'
  ];

  // Extensions autorisées
  const allowedExtensions = [".xlsx", ".xls"];
  const fileExtension = path.extname(file.originalname).toLowerCase();

  // Validation double : MIME type ET extension
  if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    // Erreur détaillée pour multer 2.x
    const error = new Error(`Type de fichier non autorisé. Types acceptés: ${allowedExtensions.join(', ')}`);
    error.name = 'INVALID_FILE_TYPE';
    cb(error);
  }
};

// Gestionnaire d'erreur personnalisé pour multer 2.x
const errorHandler = (error: any, req: any, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          error: 'Fichier trop volumineux',
          message: 'La taille maximum autorisée est de 10 MB',
          code: 'FILE_TOO_LARGE'
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          error: 'Trop de fichiers',
          message: 'Un seul fichier autorisé par upload',
          code: 'TOO_MANY_FILES'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          error: 'Champ de fichier inattendu',
          message: 'Utilisez le champ "excel" pour l\'upload',
          code: 'UNEXPECTED_FIELD'
        });
      default:
        return res.status(400).json({
          success: false,
          error: 'Erreur d\'upload',
          message: error.message,
          code: 'UPLOAD_ERROR'
        });
    }
  }

  // Erreurs personnalisées (fileFilter)
  if (error.name === 'INVALID_FILE_TYPE') {
    return res.status(400).json({
      success: false,
      error: 'Type de fichier non autorisé',
      message: error.message,
      code: 'INVALID_FILE_TYPE'
    });
  }

  // Autres erreurs
  next(error);
};

// Configuration multer 2.x avec toutes les options optimisées
export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 1, // 1 seul fichier à la fois
    fields: 10, // Limite les champs de formulaire
    fieldNameSize: 100, // Limite la taille des noms de champs
    fieldSize: 1024 * 1024, // 1MB max pour les champs texte
    headerPairs: 2000 // Limite les paires d'en-têtes
  },
  // Nouvelle option multer 2.x pour la sécurité
  preservePath: false, // Évite les attaques de traversée de chemin
});

// Export du gestionnaire d'erreur
export { errorHandler as uploadErrorHandler };

// Middleware combiné pour faciliter l'utilisation
export const uploadExcelFile = [
  uploadMiddleware.single('excel'),
  errorHandler
];

// Validation supplémentaire post-upload pour multer 2.x
export const validateUploadedFile = (req: any, res: any, next: any) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'Aucun fichier fourni',
      message: 'Veuillez sélectionner un fichier Excel à uploader',
      code: 'NO_FILE_PROVIDED'
    });
  }

  // Validation supplémentaire du buffer
  if (!req.file.buffer || req.file.buffer.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Fichier vide',
      message: 'Le fichier uploadé est vide ou corrompu',
      code: 'EMPTY_FILE'
    });
  }

  // Validation de la signature du fichier (magic numbers)
  const buffer = req.file.buffer;
  const isXLSX = buffer.length >= 4 && buffer.toString('hex', 0, 4) === '504b0304'; // ZIP signature (XLSX)
  const isXLS = buffer.length >= 8 && buffer.toString('hex', 0, 8) === 'd0cf11e0a1b11ae1'; // OLE signature (XLS)

  if (!isXLSX && !isXLS) {
    return res.status(400).json({
      success: false,
      error: 'Format de fichier invalide',
      message: 'Le fichier ne semble pas être un vrai fichier Excel',
      code: 'INVALID_FILE_FORMAT'
    });
  }

  next();
};

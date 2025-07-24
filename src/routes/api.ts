import { Router, Request, Response } from 'express';
import { ExcelService } from '../services/ExcelService';
import { DatabaseService } from '../services/DatabaseService';
import { uploadMiddleware } from '../middleware/upload';
import { ApiResponse, UploadResponse } from '../types';

const router = Router();
const db = DatabaseService.getInstance();

/**
 * GET /api/v1/elements
 * Récupère tous les éléments importés
 */
router.get('/elements', (req: Request, res: Response<ApiResponse>) => {
  try {
    const elements = db.getAllElements();
    const info = db.getDatabaseInfo();
    
    res.json({
      success: true,
      data: {
        elements,
        info
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des éléments'
    });
  }
});

/**
 * POST /api/v1/upload
 * Upload et import d'un fichier Excel
 */
router.post('/upload', uploadMiddleware.single('excel'), (req: Request, res: Response<ApiResponse<UploadResponse>>) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Aucun fichier fourni'
      });
    }

    const elements = ExcelService.parseExcelFile(req.file.buffer, req.file.originalname);
    
    if (!ExcelService.validateExcelData(elements)) {
      return res.status(400).json({
        success: false,
        error: 'Données Excel invalides'
      });
    }

    db.importData(elements, req.file.originalname);
    
    const columns = elements.length > 0 
      ? Object.keys(elements[0]).filter(key => key !== 'id')
      : [];

    res.json({
      success: true,
      data: {
        filename: req.file.originalname,
        rowCount: elements.length,
        columns
      },
      message: `${elements.length} lignes importées avec succès`
    });

  } catch (error) {
    console.error('Erreur upload:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de l\'import'
    });
  }
});

/**
 * PUT /api/v1/element/select/:id
 * Sélectionne un élément par ID
 */
router.put('/element/select/:id', (req: Request, res: Response<ApiResponse>) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'ID manquant'
      });
    }

    const selectedElement = db.selectElement(id);
    
    if (!selectedElement) {
      return res.status(404).json({
        success: false,
        error: 'Élément non trouvé'
      });
    }

    res.json({
      success: true,
      data: selectedElement,
      message: 'Élément sélectionné'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la sélection'
    });
  }
});

/**
 * GET /api/v1/element/selected
 * Récupère l'élément actuellement sélectionné (pour VMix)
 */
router.get('/element/selected', (req: Request, res: Response<ApiResponse>) => {
  try {
    const selectedElement = db.getSelectedElement();
    
    if (!selectedElement) {
      return res.status(404).json({
        success: false,
        error: 'Aucun élément sélectionné'
      });
    }

    res.json({
      success: true,
      data: [selectedElement]
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de l\'élément sélectionné'
    });
  }
});

/**
 * GET /api/v1/status
 * Status de l'application et de la base
 */
router.get('/status', (req: Request, res: Response<ApiResponse>) => {
  try {
    const info = db.getDatabaseInfo();
    
    res.json({
      success: true,
      data: {
        server: 'VMix Server',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        database: info
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erreur serveur'
    });
  }
});

/**
 * DELETE /api/v1/reset
 * Reset la base de données
 */
router.delete('/reset', (req: Request, res: Response<ApiResponse>) => {
  try {
    db.reset();
    res.json({
      success: true,
      message: 'Base de données réinitialisée'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la réinitialisation'
    });
  }
});

export default router;
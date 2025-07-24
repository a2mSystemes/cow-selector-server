import * as XLSX from 'xlsx';
import { ExcelRow } from '../types';

export class ExcelService {
  /**
   * Parse un fichier Excel et retourne les données avec des IDs générés
   */
  static parseExcelFile(buffer: Buffer, filename: string): ExcelRow[] {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0]; // Première feuille
      const worksheet = workbook.Sheets[sheetName];
      
      // Conversion en JSON avec header automatique
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1, // Utilise la première ligne comme header
        defval: '' // Valeur par défaut pour cellules vides
      });

      if (jsonData.length < 2) {
        throw new Error('Le fichier Excel doit contenir au moins une ligne d\'en-tête et une ligne de données');
      }

      const headers = jsonData[0] as string[];
      const rows = jsonData.slice(1) as any[][];

      // Transformation en objets avec ID unique
      const elements: ExcelRow[] = rows.map((row, index) => {
        const element: ExcelRow = {
          id: `row_${index + 1}_${Date.now()}`, // ID unique
        };

        // Mappage des colonnes
        headers.forEach((header, colIndex) => {
          const cleanHeader = header.toString().trim();
          element[cleanHeader] = row[colIndex] || '';
        });

        return element;
      });

      console.log(`📊 Fichier Excel parsé: ${filename} - ${elements.length} lignes`);
      return elements;

    } catch (error) {
      console.error('❌ Erreur lors du parsing Excel:', error);
      throw new Error(`Erreur lors de la lecture du fichier Excel: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  /**
   * Valide la structure des données Excel
   */
  static validateExcelData(elements: ExcelRow[]): boolean {
    if (!Array.isArray(elements) || elements.length === 0) {
      return false;
    }

    // Vérifier que chaque élément a au moins un ID
    return elements.every(element => element.id && typeof element.id === 'string');
  }
}

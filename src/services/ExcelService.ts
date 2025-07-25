import ExcelJS from 'exceljs';

export class ExcelService {
  static async parseExcelFile(buffer: Buffer, filename: string): Promise<any[]> {
    try {
      console.log(`Parsing Excel file with ExcelJS: ${filename}`);
      
      const workbook = new ExcelJS.Workbook();
      
      await workbook.xlsx.load(buffer);
      
      const worksheet = workbook.getWorksheet(1);
      if (!worksheet) {
        throw new Error('Aucune feuille de calcul trouvée dans le fichier');
      }
      
      const results: any[] = [];
      const headers: string[] = [];
      
      const headerRow = worksheet.getRow(1);
      headerRow.eachCell((cell, colNumber) => {
        if (cell.value) {
          let headerValue = cell.value.toString().trim();
          const sanitizedStr = headerValue.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          headerValue = sanitizedStr.replace(/[^a-zA-Z0-9]/g, '_');
          headerValue = headerValue.replace(/__+/g, '_');
          headers[colNumber] = headerValue || `Column${colNumber}`;
        } else {
          headers[colNumber] = `Column${colNumber}`;
        }
      });
      
      console.log(`Headers detected: ${headers.filter(h => h).join(', ')}`);
      
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header row
        
        const rowData: any = {
          id: `row_${rowNumber}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
        
        let hasData = false;
        
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber];
          if (header && cell.value !== null && cell.value !== undefined) {
            // Traitement des différents types de valeurs
            let value: any;
            
            // Gestion des dates ExcelJS
            if (cell.value instanceof Date) {
              const date = cell.value as Date;
              const DD = date.getDate().toString().padStart(2, '0'); 
              const MM = date.getMonth().toString().padStart(2, '0'); 
              const YYYY = date.getFullYear().toString().padStart(4, '0'); 
              value =  `${DD}/${MM}/${YYYY}`
            }
            // Gestion des formules
            else if (typeof cell.value === 'object' && cell.value && 'result' in cell.value) {
              value = (cell.value as any).result ?? cell.value.toString();
            }
            // Gestion des valeurs riches (rich text)
            else if (typeof cell.value === 'object' && cell.value && 'richText' in cell.value) {
              value = (cell.value as any).richText?.map((rt: any) => rt.text).join('') ?? '';
            }
            // Gestion des hyperliens
            else if (typeof cell.value === 'object' && cell.value && 'text' in cell.value) {
              value = (cell.value as any).text ?? cell.value.toString();
            }
            // Conversion en string pour les autres cas
            else {
              value = cell.value?.toString() ?? '';
            }
            
            // S'assurer que la valeur n'est pas vide
            if (value !== '' && value !== null && value !== undefined) {
              rowData[header] = value;
              hasData = true;
            }
          }
        });
        
        // Ajouter seulement les lignes qui ont des données
        if (hasData) {
          results.push(rowData);
        }
      });
      
      console.log(`✅ ExcelJS: Successfully parsed ${results.length} rows from ${filename}`);
      
      if (results.length === 0) {
        throw new Error('Aucune donnée trouvée dans le fichier Excel');
      }
      
      return results;
      
    } catch (error: Error | any) {
      console.error('❌ ExcelJS parse error:', error);
      
      // Messages d'erreur spécifiques
      if (error.message.includes('zip')) {
        throw new Error('Le fichier Excel semble être corrompu ou n\'est pas un fichier Excel valide');
      }
      
      if (error.message.includes('password') || error.message.includes('encrypted')) {
        throw new Error('Le fichier Excel est protégé par mot de passe. Veuillez utiliser un fichier non protégé');
      }
      
      throw new Error(`Erreur lors de la lecture du fichier Excel: ${error.message}`);
    }
  }
  
  static validateExcelData(elements: any[]): boolean {
    try {
      if (!Array.isArray(elements)) {
        console.error('❌ Validation failed: elements is not an array');
        return false;
      }
      
      if (elements.length === 0) {
        console.error('❌ Validation failed: no elements found');
        return false;
      }
      
      const validElements = elements.filter(element => {
        if (typeof element !== 'object' || element === null) {
          return false;
        }
        
        const keys = Object.keys(element).filter(key => key !== 'id');
        return keys.length > 0;
      });
      
      if (validElements.length === 0) {
        console.error('❌ Validation failed: no valid elements with data');
        return false;
      }
      
      const firstElement = validElements[0];
      const requiredKeys = Object.keys(firstElement).filter(key => key !== 'id');
      
      if (requiredKeys.length === 0) {
        console.error('❌ Validation failed: no data columns found');
        return false;
      }
      
      console.log(`✅ Validation passed: ${validElements.length} valid elements with columns: ${requiredKeys.join(', ')}`);
      return true;
      
    } catch (error) {
      console.error('❌ Validation error:', error);
      return false;
    }
  }
  
  /**
   * Utilitaire pour obtenir les métadonnées d'un fichier Excel
   */
  static async getExcelMetadata(buffer: Buffer): Promise<any> {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      
      const metadata = {
        worksheetCount: workbook.worksheets.length,
        worksheetNames: workbook.worksheets.map(ws => ws.name),
        creator: workbook.creator || 'Unknown',
        created: workbook.created || null,
        modified: workbook.modified || null,
        properties: {
          title: workbook.title,
          subject: workbook.subject,
          description: workbook.description,
          category: workbook.category
        }
      };
      
      return metadata;
    } catch (error) {
      console.error('❌ Error getting Excel metadata:', error);
      return null;
    }
  }
  
  /**
   * Validation de sécurité du fichier Excel
   */
  static validateExcelSecurity(buffer: Buffer): { isValid: boolean; reason?: string } {
    try {
      // Vérification de la taille
      if (buffer.length > 50 * 1024 * 1024) { // 50MB max pour ExcelJS
        return {
          isValid: false,
          reason: 'Fichier trop volumineux (max 50MB)'
        };
      }
      
      // Vérification signature ZIP (XLSX)
      if (buffer.length >= 4) {
        const zipSignature = buffer.toString('hex', 0, 4);
        if (zipSignature === '504b0304' || zipSignature === '504b0506' || zipSignature === '504b0708') {
          return { isValid: true };
        }
      }
      
      // Vérification signature OLE (XLS)
      if (buffer.length >= 8) {
        const oleSignature = buffer.toString('hex', 0, 8);
        if (oleSignature === 'd0cf11e0a1b11ae1') {
          return { isValid: true };
        }
      }
      
      return {
        isValid: false,
        reason: 'Format de fichier non reconnu comme Excel'
      };
      
    } catch (error: Error | any) {
      return {
        isValid: false,
        reason: `Erreur de validation: ${error.message}`
      };
    }
  }
}

export default ExcelService;

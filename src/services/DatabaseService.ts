import { ExcelRow, DatabaseState } from '../types';

export class DatabaseService {
  private static instance: DatabaseService;
  private database: DatabaseState;

  private constructor() {
    this.database = {
      elements: [],
      selectedElement: null,
      lastUpdated: new Date()
    };
  }

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  importData(elements: ExcelRow[], filename: string): void {
    this.database.elements = elements;
    this.database.selectedElement = null; // Reset sélection
    this.database.lastUpdated = new Date();
    this.database.filename = filename;
    
    console.log(`💾 Base de données mise à jour: ${elements.length} éléments importés`);
  }

  getAllElements(): ExcelRow[] {
    return this.database.elements;
  }

  selectElement(id: string): ExcelRow | null {
    const element = this.database.elements.find(el => el.id === id);
    if (element) {
      this.database.selectedElement = element;
      console.log(`✅ Élément sélectionné: ${id}`);
      return element;
    }
    return null;
  }

  getSelectedElement(): ExcelRow | null {
    return this.database.selectedElement;
  }


  getDatabaseInfo() {
    return {
      elementCount: this.database.elements.length,
      hasSelection: !!this.database.selectedElement,
      lastUpdated: this.database.lastUpdated,
      filename: this.database.filename,
      columns: this.database.elements.length > 0 
        ? Object.keys(this.database.elements[0]).filter(key => key !== 'id')
        : []
    };
  }

  reset(): void {
    this.database = {
      elements: [],
      selectedElement: null,
      lastUpdated: new Date()
    };
    console.log('🔄 Base de données réinitialisée');
  }
}
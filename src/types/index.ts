export interface ExcelRow {
  id: string;
  [key: string]: any; // Permet d'accepter n'importe quelle colonne Excel
}

export interface DatabaseState {
  elements: ExcelRow[];
  selectedElement: ExcelRow | null;
  lastUpdated: Date;
  filename?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: string;
}

export interface UploadResponse {
  filename: string;
  rowCount: number;
  columns: string[];
  fileSize: number | null;
  mimeType: string | null;
  metadata: any;
}
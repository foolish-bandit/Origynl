
export interface ChainRecord {
  hash: string;
  timestamp: number;
  blockHeight: number;
  fileName: string;
  sender: string;
  provenanceType?: 'UPLOAD' | 'LIVE_CAPTURE';
  geoTag?: string; 
  txHash?: string; // Blockchain Transaction ID
  isSimulation?: boolean; // Flag for local demo records
}

export enum VerificationStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  AUTHENTIC = 'AUTHENTIC',
  MISMATCH = 'MISMATCH',
  NOT_FOUND = 'NOT_FOUND',
}

export interface VerificationResult {
  status: VerificationStatus;
  originalRecord?: ChainRecord;
  currentHash?: string;
}

export interface SensorData {
  gps?: { lat: number; lng: number; accuracy: number };
  motion?: { x: number; y: number; z: number }; 
  timestamp: number;
}

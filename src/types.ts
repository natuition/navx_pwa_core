// GPS position data
export interface GpsPosition {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  timestamp: Date;
}

// NMEA sentence parsed data
export interface NmeaData {
  type: string;
  latitude?: number;
  longitude?: number;
  altitude?: number;
  fixQuality?: number;
  numSatellites?: number;
  hdop?: number;
  time?: string;
  date?: string;
}

// Satellite information
export interface SatelliteInfo {
  id: number;
  elevation: number;
  azimuth: number;
  snr: number;
  used: boolean;
}

// NTRIP configuration
export interface NtripConfig {
  host: string;
  port: number;
  mountpoint: string;
  username: string;
  password: string;
  sendGpsToServer?: boolean; // Option pour envoyer les coordonnées GPS au caster
  wsUrl?: string; // Optional full WebSocket URL (ws:// or wss://) to connect through a proxy
}

// NTRIP Mountpoint information
export interface MountpointInfo {
  mountpoint: string;
  identifier: string;
  format: string;
  formatDetails: string;
  carrier: number;
  navSystem: string;
  network: string;
  country: string;
  latitude: number;
  longitude: number;
  nmea: boolean;
  solution: number;
  generator: string;
  compressionEncryption: string;
  authentication: string;
  fee: boolean;
  bitrate: number;
  misc: string;
  distance?: number; // Distance calculée depuis la position actuelle
}

// Configuration pour la récupération automatique des mountpoints
export interface AutoMountpointConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  maxDistance?: number; // Distance maximum en km (par défaut: 50km)
  sendGpsToServer?: boolean; // Option pour envoyer les coordonnées GPS au caster
  wsUrl?: string; // Optional full WebSocket URL (ws:// or wss://) to use for the sourcetable request via proxy
}

// BLE device info
export interface BleDeviceInfo {
  id: string;
  name: string;
  connected: boolean;
}

// Fix type enumeration selon standard NMEA GGA
export enum FixType {
  NO_FIX = 0,           // Aucun fix
  GPS = 1,              // GPS autonome (±1.5-3m H, ±3-5m V)
  DGPS = 2,             // DGPS/SBAS (±0.3-1m H, ±0.5-2m V)
  PPS = 3,              // PPS fix (non utilisé généralement)
  RTK_FIXED = 4,        // RTK Fixed (±1-2cm H, ±2-4cm V)
  RTK_FLOAT = 5,        // RTK Float (±5-20cm H, ±10-40cm V)
  DEAD_RECKONING = 6,   // Dead Reckoning (estimation)
}

export const getFixTypeName = (fixType: FixType): string => {
  switch (fixType) {
    case FixType.NO_FIX:
      return 'No Fix';
    case FixType.GPS:
      return 'GPS';
    case FixType.DGPS:
      return 'DGPS';
    case FixType.PPS:
      return 'PPS';
    case FixType.RTK_FIXED:
      return 'RTK Fixed';
    case FixType.RTK_FLOAT:
      return 'RTK Float';
    case FixType.DEAD_RECKONING:
      return 'Dead Reckoning';
    default:
      return 'Unknown';
  }
};

export const getFixAccuracy = (fixType: FixType): { horizontal: string; vertical: string; description: string } => {
  switch (fixType) {
    case FixType.NO_FIX:
      return {
        horizontal: 'N/A',
        vertical: 'N/A',
        description: 'Aucune position disponible'
      };
    case FixType.GPS:
      return {
        horizontal: '±1.5-3m',
        vertical: '±3-5m',
        description: 'GPS autonome, sans correction'
      };
    case FixType.DGPS:
      return {
        horizontal: '±0.3-1m',
        vertical: '±0.5-2m',
        description: 'DGPS/SBAS (EGNOS/WAAS)'
      };
    case FixType.PPS:
      return {
        horizontal: '±1m',
        vertical: '±2m',
        description: 'Pulse Per Second fix'
      };
    case FixType.RTK_FIXED:
      return {
        horizontal: '±1-2cm',
        vertical: '±2-4cm',
        description: 'RTK Fixed - ambiguïtés résolues'
      };
    case FixType.RTK_FLOAT:
      return {
        horizontal: '±5-20cm',
        vertical: '±10-40cm',
        description: 'RTK Float - ambiguïtés non fixées'
      };
    case FixType.DEAD_RECKONING:
      return {
        horizontal: '±1-10m',
        vertical: '±2-20m',
        description: 'Estimation par navigation à l\'estime'
      };
    default:
      return {
        horizontal: 'Unknown',
        vertical: 'Unknown',
        description: 'Type de fix inconnu'
      };
  }
};

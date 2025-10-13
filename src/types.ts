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

// Fix type enumeration
export enum FixType {
  NO_FIX = 0,
  GPS_FIX = 1,
  DGPS_FIX = 2,
  RTK_FLOAT = 4,
  RTK_FIXED = 5,
}

export const getFixTypeName = (fixType: FixType): string => {
  switch (fixType) {
    case FixType.NO_FIX:
      return 'No Fix';
    case FixType.GPS_FIX:
      return 'GPS';
    case FixType.DGPS_FIX:
      return 'DGPS';
    case FixType.RTK_FLOAT:
      return 'RTK Float';
    case FixType.RTK_FIXED:
      return 'RTK Fixed';
    default:
      return 'Unknown';
  }
};

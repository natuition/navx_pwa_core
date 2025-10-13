import { NmeaData, SatelliteInfo } from './types';

/**
 * Parse NMEA sentences from GPS data
 */
export class NmeaParser {
  private satellites: Map<number, SatelliteInfo> = new Map();
  private gsvSentences: string[][] = [];
  private expectedGsvCount = 0;

  /**
   * Parse a single NMEA sentence
   */
  parse(sentence: string): NmeaData | null {
    if (!sentence.startsWith('$')) {
      return null;
    }

    // Remove $ and checksum
    const parts = sentence.substring(1).split('*');
    const data = parts[0];
    const fields = data.split(',');
    const type = fields[0];

    switch (type) {
      case 'GPGGA':
      case 'GNGGA':
        return this.parseGGA(fields);
      case 'GPRMC':
      case 'GNRMC':
        return this.parseRMC(fields);
      case 'GPGSV':
      case 'GNGSV':
      case 'GLGSV':
      case 'GAGSV':
        this.parseGSV(fields);
        return null;
      default:
        return null;
    }
  }

  /**
   * Parse GGA sentence (Fix data)
   */
  private parseGGA(fields: string[]): NmeaData {
    const lat = this.parseCoordinate(fields[2], fields[3]);
    const lon = this.parseCoordinate(fields[4], fields[5]);
    const fixQuality = parseInt(fields[6]) || 0;
    const numSats = parseInt(fields[7]) || 0;
    const hdop = parseFloat(fields[8]) || 0;
    const altitude = parseFloat(fields[9]) || 0;

    return {
      type: 'GGA',
      latitude: lat,
      longitude: lon,
      altitude,
      fixQuality,
      numSatellites: numSats,
      hdop,
      time: fields[1],
    };
  }

  /**
   * Parse RMC sentence (Recommended minimum)
   */
  private parseRMC(fields: string[]): NmeaData {
    const lat = this.parseCoordinate(fields[3], fields[4]);
    const lon = this.parseCoordinate(fields[5], fields[6]);

    return {
      type: 'RMC',
      latitude: lat,
      longitude: lon,
      time: fields[1],
      date: fields[9],
    };
  }

  /**
   * Parse GSV sentence (Satellites in view)
   */
  private parseGSV(fields: string[]): void {
    const totalMessages = parseInt(fields[1]) || 0;
    const messageNumber = parseInt(fields[2]) || 0;

    if (messageNumber === 1) {
      this.gsvSentences = [];
      this.expectedGsvCount = totalMessages;
    }

    this.gsvSentences.push(fields);

    // When we have all messages, parse satellites
    if (this.gsvSentences.length === this.expectedGsvCount) {
      this.processSatellites();
    }
  }

  /**
   * Process all GSV sentences to extract satellite info
   */
  private processSatellites(): void {
    this.gsvSentences.forEach((fields) => {
      // Each GSV can contain up to 4 satellites
      for (let i = 0; i < 4; i++) {
        const baseIdx = 4 + i * 4;
        if (baseIdx >= fields.length) break;

        const satId = parseInt(fields[baseIdx]);
        if (!satId) continue;

        const elevation = parseInt(fields[baseIdx + 1]) || 0;
        const azimuth = parseInt(fields[baseIdx + 2]) || 0;
        const snr = parseInt(fields[baseIdx + 3]) || 0;

        this.satellites.set(satId, {
          id: satId,
          elevation,
          azimuth,
          snr,
          used: snr > 0,
        });
      }
    });
  }

  /**
   * Parse coordinate from NMEA format (DDMM.MMMM) to decimal degrees
   */
  private parseCoordinate(value: string, direction: string): number | undefined {
    if (!value || !direction) return undefined;

    const degrees = parseFloat(value.substring(0, value.indexOf('.') - 2));
    const minutes = parseFloat(value.substring(value.indexOf('.') - 2));
    let decimal = degrees + minutes / 60;

    if (direction === 'S' || direction === 'W') {
      decimal = -decimal;
    }

    return decimal;
  }

  /**
   * Get current satellites in view
   */
  getSatellites(): SatelliteInfo[] {
    return Array.from(this.satellites.values());
  }

  /**
   * Clear satellite data
   */
  clearSatellites(): void {
    this.satellites.clear();
  }
}

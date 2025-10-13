import { NtripConfig, GpsPosition } from './types';

/**
 * NTRIP client for receiving RTCM corrections
 */
export class NtripClient {
  private config: NtripConfig | null = null;
  private socket: WebSocket | null = null;
  private onDataCallback: ((data: ArrayBuffer) => void) | null = null;
  private reconnectTimer: number | null = null;
  private shouldReconnect = false;
  private gpsPosition: GpsPosition | null = null;
  private gpsTimer: number | null = null;
  private lastGpsSent: number | null = null;

  /**
   * Connect to NTRIP caster
   */
  async connect(config: NtripConfig): Promise<void> {
    this.config = config;
    this.shouldReconnect = true;

    return this.doConnect();
  }

  /**
   * Set initial GPS position (should be called before or immediately after connect for NEAR mountpoint)
   */
  setInitialPosition(position: GpsPosition): void {
    this.gpsPosition = position;
  }

  /**
   * Perform the actual connection
   */
  private async doConnect(): Promise<void> {
    if (!this.config) {
      throw new Error('NTRIP config not set');
    }

    try {
      // Utiliser directement le proxy WebSocket externe
      const wsUrl = `wss://ws-tcp-ntrip-client.natuition.com/?host=${encodeURIComponent(this.config.host)}&port=${encodeURIComponent(this.config.port.toString())}`;

      console.log('Connecting to NTRIP via external WebSocket proxy:', wsUrl);

      this.socket = new WebSocket(wsUrl);
      this.socket.binaryType = 'arraybuffer';

      this.socket.onopen = () => {
        this.sendNtripRequest();

        // Pour le mountpoint NEAR, envoyer immédiatement la position GPS si disponible
        if (this.config?.mountpoint.toUpperCase() === 'NEAR' && this.gpsPosition) {
          setTimeout(() => {
            if (this.gpsPosition) {
              this.sendGpsToServer(this.gpsPosition);
            }
          }, 1000); // Attendre 1 seconde après la connexion
        }

        this.startGpsTimer(); // Démarrer l'envoi périodique de GPS si activé
      };

      this.socket.onmessage = (event) => {
        if (this.onDataCallback && event.data instanceof ArrayBuffer) {
          this.onDataCallback(event.data);
        }
      };

      this.socket.onerror = (error) => {
        console.error('NTRIP WebSocket error:', error);
      };

      this.socket.onclose = () => {
        console.log('NTRIP connection closed');
        this.handleDisconnect();
      };
    } catch (error) {
      console.error('NTRIP connection error:', error);
      throw error;
    }
  }

  /**
   * Send NTRIP request with authentication
   */
  private sendNtripRequest(): void {
    if (!this.socket || !this.config) return;

    // Create NTRIP request
    const auth = btoa(`${this.config.username}:${this.config.password}`);
    const request = [
      `GET /${this.config.mountpoint} HTTP/1.1`,
      `Host: ${this.config.host}:${this.config.port}`,
      `Authorization: Basic ${auth}`,
      `User-Agent: NTRIP NavX-PWA/1.0`,
      'Accept: */*',
      'Connection: close',
      '',
      ''
    ].join('\r\n');

    this.socket.send(new TextEncoder().encode(request));
  }

  /**
   * Disconnect from NTRIP caster
   */
  disconnect(): void {
    this.shouldReconnect = false;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.gpsTimer) {
      clearInterval(this.gpsTimer);
      this.gpsTimer = null;
    }

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this.config = null;
    this.gpsPosition = null;
  }

  /**
   * Handle disconnection and attempt reconnect
   */
  private handleDisconnect(): void {
    this.socket = null;

    if (this.shouldReconnect && this.config) {
      // Attempt to reconnect after 5 seconds
      this.reconnectTimer = window.setTimeout(() => {
        console.log('Attempting to reconnect to NTRIP...');
        this.doConnect().catch(console.error);
      }, 5000);
    }
  }

  /**
   * Set callback for received RTCM data
   */
  onData(callback: (data: ArrayBuffer) => void): void {
    this.onDataCallback = callback;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  /**
   * Update GPS position and optionally send to NTRIP caster
   */
  updateGpsPosition(position: GpsPosition): void {
    this.gpsPosition = position;

    // Pour éviter d'envoyer la position trop souvent, n'envoyer que si au moins
    // 10 secondes se sont écoulées depuis le dernier envoi.
    if (this.isConnected() &&
      (this.config?.mountpoint.toUpperCase() === 'NEAR' || this.config?.sendGpsToServer)) {
      const now = Date.now();
      if (!this.lastGpsSent || (now - this.lastGpsSent) >= 10000) {
        this.sendGpsToServer(position);
        this.lastGpsSent = now;
      }
    }
  }

  /**
   * Start periodic GPS sending to server
   */
  private startGpsTimer(): void {
    // Pour le mountpoint NEAR, toujours envoyer la position (requis pour maintenir la liaison)
    // Pour les autres mountpoints, envoyer seulement si explicitement activé
    const shouldSendGps = this.config?.mountpoint.toUpperCase() === 'NEAR' || this.config?.sendGpsToServer;

    if (shouldSendGps && !this.gpsTimer) {
      // Envoyer la position GPS toutes les 10 secondes (requis pour NEAR)
      this.gpsTimer = window.setInterval(() => {
        if (this.gpsPosition && this.isConnected()) {
          this.sendGpsToServer(this.gpsPosition);
          this.lastGpsSent = Date.now();
        }
      }, 10000);
    }
  }

  /**
   * Send GPS coordinates to NTRIP server in GGA format
   */
  private sendGpsToServer(position: GpsPosition): void {
    if (!this.socket || !this.isConnected()) {
      return;
    }

    try {
      // Créer une phrase NMEA GGA avec la position actuelle
      const now = new Date();
      const time = now.getUTCHours().toString().padStart(2, '0') +
        now.getUTCMinutes().toString().padStart(2, '0') +
        now.getUTCSeconds().toString().padStart(2, '0') + '.00';

      // Convertir latitude en format NMEA (DDMM.MMMM)
      const latDeg = Math.floor(Math.abs(position.latitude));
      const latMin = (Math.abs(position.latitude) - latDeg) * 60;
      const latHem = position.latitude >= 0 ? 'N' : 'S';
      const latNmea = latDeg.toString().padStart(2, '0') + latMin.toFixed(4).padStart(7, '0');

      // Convertir longitude en format NMEA (DDDMM.MMMM)
      const lonDeg = Math.floor(Math.abs(position.longitude));
      const lonMin = (Math.abs(position.longitude) - lonDeg) * 60;
      const lonHem = position.longitude >= 0 ? 'E' : 'W';
      const lonNmea = lonDeg.toString().padStart(3, '0') + lonMin.toFixed(4).padStart(7, '0');

      const altitude = position.altitude?.toFixed(1) || '0.0';
      const fixQuality = '1'; // GPS fix
      const numSats = '08'; // Nombre de satellites (simulé)
      const hdop = '1.0'; // Dilution horizontale de précision
      const geoidHeight = '0.0'; // Hauteur du géoïde

      // Construire la phrase GGA selon le standard NMEA 0183
      const ggaData = `GPGGA,${time},${latNmea},${latHem},${lonNmea},${lonHem},${fixQuality},${numSats},${hdop},${altitude},M,${geoidHeight},M,,`;

      // Calculer le checksum XOR
      let checksum = 0;
      for (let i = 0; i < ggaData.length; i++) {
        checksum ^= ggaData.charCodeAt(i);
      }
      const checksumHex = checksum.toString(16).toUpperCase().padStart(2, '0');

      const nmeaSentence = `$${ggaData}*${checksumHex}\r\n`;

      // Envoyer la phrase NMEA au serveur
      this.socket.send(new TextEncoder().encode(nmeaSentence));
      // Mémoriser l'heure d'envoi pour throttling
      this.lastGpsSent = Date.now();

      const mountpointInfo = this.config?.mountpoint.toUpperCase() === 'NEAR' ?
        ' (maintien liaison NEAR)' : '';
      console.log(`Position GPS envoyée au caster NTRIP${mountpointInfo}:`, nmeaSentence.trim());
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la position GPS:', error);
    }
  }
}

import { NtripConfig } from './types';

/**
 * NTRIP client for receiving RTCM corrections
 */
export class NtripClient {
  private config: NtripConfig | null = null;
  private socket: WebSocket | null = null;
  private onDataCallback: ((data: ArrayBuffer) => void) | null = null;
  private reconnectTimer: number | null = null;
  private shouldReconnect = false;

  /**
   * Connect to NTRIP caster
   */
  async connect(config: NtripConfig): Promise<void> {
    this.config = config;
    this.shouldReconnect = true;

    return this.doConnect();
  }

  /**
   * Perform the actual connection
   */
  private async doConnect(): Promise<void> {
    if (!this.config) {
      throw new Error('NTRIP config not set');
    }

    try {
      // Create WebSocket connection (using a proxy service since direct TCP isn't available in browsers)
      // In production, you'd need a WebSocket-to-TCP proxy server
      const wsUrl = `wss://${this.config.host}:${this.config.port}`;
      
      this.socket = new WebSocket(wsUrl);
      this.socket.binaryType = 'arraybuffer';

      this.socket.onopen = () => {
        this.sendNtripRequest();
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

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this.config = null;
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
}

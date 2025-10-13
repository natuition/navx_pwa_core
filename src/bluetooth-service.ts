/**
 * Web Bluetooth service for connecting to GNSS devices
 */
export class BluetoothService {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private onDataCallback: ((data: string) => void) | null = null;
  // Ecriture BLE: file d'attente et état
  private writeQueue: ArrayBuffer[] = [];
  private isWriting = false;
  private rxCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;

  // UART Service UUID (Nordic UART Service)
  private static readonly UART_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
  private static readonly UART_RX_CHAR_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
  private static readonly UART_TX_CHAR_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

  /**
   * Request and connect to a Bluetooth device
   */
  async connect(): Promise<void> {
    try {
      // Request device
      this.device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [BluetoothService.UART_SERVICE_UUID] }],
        optionalServices: [BluetoothService.UART_SERVICE_UUID],
      });

      // Connect to GATT server
      this.server = await this.device.gatt!.connect();

      // Get UART service
      const service = await this.server.getPrimaryService(BluetoothService.UART_SERVICE_UUID);

      // Get TX characteristic for receiving data
      this.characteristic = await service.getCharacteristic(BluetoothService.UART_TX_CHAR_UUID);

      // Get RX characteristic for sending data (write)
      this.rxCharacteristic = await service.getCharacteristic(BluetoothService.UART_RX_CHAR_UUID);

      // Start notifications
      await this.characteristic.startNotifications();
      this.characteristic.addEventListener('characteristicvaluechanged', this.handleDataReceived.bind(this));

      // Handle disconnection
      this.device.addEventListener('gattserverdisconnected', this.handleDisconnect.bind(this));

      console.log('Bluetooth device connected');
    } catch (error) {
      console.error('Bluetooth connection error:', error);
      throw error;
    }
  }

  /**
   * Disconnect from the Bluetooth device
   */
  async disconnect(): Promise<void> {
    if (this.characteristic) {
      await this.characteristic.stopNotifications();
      this.characteristic.removeEventListener('characteristicvaluechanged', this.handleDataReceived.bind(this));
    }

    if (this.server && this.server.connected) {
      this.server.disconnect();
    }

    this.device = null;
    this.server = null;
    this.characteristic = null;
    this.rxCharacteristic = null;
    // reset queue/flags
    this.writeQueue = [];
    this.isWriting = false;
    console.log('Bluetooth device disconnected');
  }

  /**
   * Write data to the Bluetooth device (for RTCM corrections)
   */
  async write(data: ArrayBuffer): Promise<void> {
    if (!this.server || !this.server.connected) {
      throw new Error('Bluetooth device not connected');
    }

    // Ajouter au buffer d'envoi et démarrer le traitement si nécessaire
    this.writeQueue.push(data);
    if (!this.isWriting) {
      // Lancer en tâche de fond, sans bloquer l'appelant
      this.processWriteQueue().catch((err) => {
        console.error('Bluetooth write queue error:', err);
      });
    }
  }

  /**
   * Traite la file d'attente d'écritures de manière séquentielle pour éviter
   * l'erreur "GATT operation already in progress".
   */
  private async processWriteQueue(): Promise<void> {
    if (this.isWriting) return;
    this.isWriting = true;

    try {
      // S'assurer d'avoir la caractéristique d'écriture
      if (!this.rxCharacteristic) {
        if (!this.server) throw new Error('No GATT server');
        const service = await this.server.getPrimaryService(BluetoothService.UART_SERVICE_UUID);
        this.rxCharacteristic = await service.getCharacteristic(BluetoothService.UART_RX_CHAR_UUID);
      }

      // Défile les éléments jusqu'à ce que la queue soit vide
      while (this.writeQueue.length > 0 && this.server?.connected) {
        const buf = this.writeQueue.shift()!;
        await this.writeDataChunked(this.rxCharacteristic!, buf);
      }
    } finally {
      this.isWriting = false;
      // Si des éléments ont été ajoutés entre-temps, relancer
      if (this.writeQueue.length > 0 && this.server?.connected) {
        // éviter stack overflow: planifier dans la micro-tâche suivante
        setTimeout(() => this.processWriteQueue().catch(console.error), 0);
      }
    }
  }

  /**
   * Ecrit en paquets (20 octets typiquement) avec un petit délai entre paquets
   * pour éviter de surcharger le lien BLE.
   */
  private async writeDataChunked(characteristic: BluetoothRemoteGATTCharacteristic, data: ArrayBuffer): Promise<void> {
    const chunkSize = 20;
    const dataArray = new Uint8Array(data);

    for (let i = 0; i < dataArray.length; i += chunkSize) {
      const chunk = dataArray.slice(i, Math.min(i + chunkSize, dataArray.length));
      await characteristic.writeValue(chunk);
      // Petit délai (5ms) entre paquets si d'autres suivent
      if (i + chunkSize < dataArray.length) {
        await new Promise((resolve) => setTimeout(resolve, 5));
      }
    }
  }

  /**
   * Set callback for received data
   */
  onData(callback: (data: string) => void): void {
    this.onDataCallback = callback;
  }

  /**
   * Handle incoming data from device
   */
  private handleDataReceived(event: Event): void {
    const characteristic = event.target as BluetoothRemoteGATTCharacteristic;
    const value = characteristic.value;

    if (value) {
      const decoder = new TextDecoder('utf-8');
      const text = decoder.decode(value);

      if (this.onDataCallback) {
        this.onDataCallback(text);
      }
    }
  }

  /**
   * Handle device disconnection
   */
  private handleDisconnect(): void {
    console.log('Bluetooth device disconnected');
    this.device = null;
    this.server = null;
    this.characteristic = null;
  }

  /**
   * Check if device is connected
   */
  isConnected(): boolean {
    return this.server?.connected ?? false;
  }

  /**
   * Get device name
   */
  getDeviceName(): string | null {
    return this.device?.name ?? null;
  }
}

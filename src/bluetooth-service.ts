import { Capacitor } from '@capacitor/core';
import { BleClient } from '@capacitor-community/bluetooth-le';

/**
 * Bluetooth service supporting Capacitor native BLE (iOS/Android) with Web Bluetooth fallback for PWA/Desktop.
 */
export class BluetoothService {
  // Web Bluetooth handles
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null; // TX notify
  private rxCharacteristic: BluetoothRemoteGATTCharacteristic | null = null; // RX write

  // Capacitor BLE handles
  private useNative = Capacitor.isNativePlatform();
  private nativeDeviceId: string | null = null;
  private nativeDeviceName: string | null = null;
  private nativeConnected = false;

  // Common state
  private onDataCallback: ((data: string) => void) | null = null;
  private writeQueue: ArrayBuffer[] = [];
  private isWriting = false;

  // UART Service UUID (Nordic UART Service)
  private static readonly UART_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
  private static readonly UART_RX_CHAR_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
  private static readonly UART_TX_CHAR_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

  /**
   * Request and connect to a Bluetooth device
   */
  async connect(): Promise<void> {
    if (this.useNative) {
      await this.connectNative();
    } else {
      await this.connectWeb();
    }
  }

  private async connectNative(): Promise<void> {
    try {
      await BleClient.initialize();
      const device = await BleClient.requestDevice({
        services: [BluetoothService.UART_SERVICE_UUID],
      });
      this.nativeDeviceId = device.deviceId;
      this.nativeDeviceName = (device as any).name ?? null;

      await BleClient.connect(this.nativeDeviceId, () => {
        this.nativeConnected = false;
        this.nativeDeviceId = null;
        this.nativeDeviceName = null;
        console.log('Native BLE disconnected');
      });
      this.nativeConnected = true;

      await BleClient.startNotifications(
        this.nativeDeviceId,
        BluetoothService.UART_SERVICE_UUID,
        BluetoothService.UART_TX_CHAR_UUID,
        (value) => this.handleNativeNotification(value)
      );

      console.log('Native BLE connected');
    } catch (error) {
      console.error('Native BLE connection error:', error);
      throw error;
    }
  }

  private async connectWeb(): Promise<void> {
    try {
      if (!("bluetooth" in navigator)) {
        throw new Error('Web Bluetooth non supporté dans ce navigateur. Utilisez l\'application native (Capacitor) sur iOS.');
      }
      this.device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [BluetoothService.UART_SERVICE_UUID] }],
        optionalServices: [BluetoothService.UART_SERVICE_UUID],
      });

      this.server = await this.device.gatt!.connect();
      const service = await this.server.getPrimaryService(BluetoothService.UART_SERVICE_UUID);
      this.characteristic = await service.getCharacteristic(BluetoothService.UART_TX_CHAR_UUID);
      this.rxCharacteristic = await service.getCharacteristic(BluetoothService.UART_RX_CHAR_UUID);

      await this.characteristic.startNotifications();
      this.characteristic.addEventListener('characteristicvaluechanged', this.handleWebNotification);

      this.device.addEventListener('gattserverdisconnected', this.handleWebDisconnect);
      console.log('Web Bluetooth device connected');
    } catch (error) {
      console.error('Web Bluetooth connection error:', error);
      throw error;
    }
  }

  /**
   * Disconnect from the Bluetooth device
   */
  async disconnect(): Promise<void> {
    if (this.useNative) {
      await this.disconnectNative();
    } else {
      await this.disconnectWeb();
    }
    // reset queue/flags
    this.writeQueue = [];
    this.isWriting = false;
  }

  private async disconnectNative(): Promise<void> {
    try {
      if (this.nativeDeviceId) {
        try {
          await BleClient.stopNotifications(
            this.nativeDeviceId,
            BluetoothService.UART_SERVICE_UUID,
            BluetoothService.UART_TX_CHAR_UUID
          );
        } catch { }
        await BleClient.disconnect(this.nativeDeviceId);
      }
    } finally {
      this.nativeConnected = false;
      this.nativeDeviceId = null;
      this.nativeDeviceName = null;
      console.log('Native BLE disconnected');
    }
  }

  private async disconnectWeb(): Promise<void> {
    if (this.characteristic) {
      try {
        await this.characteristic.stopNotifications();
      } catch { }
      this.characteristic.removeEventListener('characteristicvaluechanged', this.handleWebNotification);
    }
    if (this.server?.connected) {
      this.server.disconnect();
    }
    this.device = null;
    this.server = null;
    this.characteristic = null;
    this.rxCharacteristic = null;
    console.log('Web Bluetooth device disconnected');
  }

  /**
   * Write data to the Bluetooth device (for RTCM corrections)
   */
  async write(data: ArrayBuffer): Promise<void> {
    if (this.useNative) {
      if (!this.nativeConnected || !this.nativeDeviceId) {
        throw new Error('Bluetooth device not connected');
      }
    } else {
      if (!this.server || !this.server.connected) {
        throw new Error('Bluetooth device not connected');
      }
    }

    // Ajouter au buffer d'envoi et démarrer le traitement si nécessaire
    this.writeQueue.push(data);
    if (!this.isWriting) {
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
      while (this.writeQueue.length > 0 && (this.useNative ? this.nativeConnected : this.server?.connected)) {
        const buf = this.writeQueue.shift()!;
        await this.writeDataChunked(buf);
      }
    } finally {
      this.isWriting = false;
      if (this.writeQueue.length > 0 && (this.useNative ? this.nativeConnected : this.server?.connected)) {
        setTimeout(() => this.processWriteQueue().catch(console.error), 0);
      }
    }
  }

  /**
   * Ecrit en paquets (20 octets typiquement) avec un petit délai entre paquets
   * pour éviter de surcharger le lien BLE.
   */
  private async writeDataChunked(data: ArrayBuffer): Promise<void> {
    const chunkSize = 20;
    const dataArray = new Uint8Array(data);
    const interChunkDelayMs = this.useNative ? 5 : 8; // iOS rapide (5ms), Web légèrement ralenti (8ms)

    for (let i = 0; i < dataArray.length; i += chunkSize) {
      const chunk = dataArray.slice(i, Math.min(i + chunkSize, dataArray.length));
      if (this.useNative) {
        const view = new DataView(chunk.buffer, chunk.byteOffset, chunk.byteLength);
        await this.writeNativeWithRetry(view);
      } else {
        if (!this.rxCharacteristic) throw new Error('No RX characteristic');
        await this.writeWebWithRetry(chunk);
      }
      if (i + chunkSize < dataArray.length) await this.sleep(interChunkDelayMs);
    }
  }

  private async writeNativeWithRetry(view: DataView, maxRetries = 5): Promise<void> {
    const anyBle = BleClient as unknown as Record<string, any>;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (typeof anyBle.writeWithoutResponse === 'function') {
          await anyBle.writeWithoutResponse(
            this.nativeDeviceId!,
            BluetoothService.UART_SERVICE_UUID,
            BluetoothService.UART_RX_CHAR_UUID,
            view
          );
        } else {
          await BleClient.write(
            this.nativeDeviceId!,
            BluetoothService.UART_SERVICE_UUID,
            BluetoothService.UART_RX_CHAR_UUID,
            view
          );
        }
        return; // success
      } catch (e: any) {
        const msg = String(e?.message || e || '');
        if (attempt < maxRetries && /GATT operation already in progress/i.test(msg)) {
          // Petit backoff exponentiel: 12ms, 20ms, 35ms, 60ms, 80ms...
          const delay = 12 + Math.floor(8 * Math.pow(1.6, attempt));
          await this.sleep(delay);
          continue;
        }
        // Dernier essai ou autre erreur: rethrow
        throw e;
      }
    }
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async writeWebWithRetry(data: Uint8Array, maxRetries = 5): Promise<void> {
    const char: any = this.rxCharacteristic as unknown as Record<string, any>;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (typeof char.writeValueWithoutResponse === 'function') {
          await char.writeValueWithoutResponse(data);
        } else if (typeof char.writeValueWithResponse === 'function') {
          await char.writeValueWithResponse(data);
        } else if (typeof char.writeValue === 'function') {
          await char.writeValue(data);
        } else {
          throw new Error('No supported write method on characteristic');
        }
        return; // success
      } catch (e: any) {
        const msg = String(e?.message || e || '');
        if (attempt < maxRetries && /GATT operation already in progress/i.test(msg)) {
          const delay = 10 + Math.floor(8 * Math.pow(1.6, attempt));
          await this.sleep(delay);
          continue;
        }
        throw e;
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
   * Handle incoming data from device - Web
   */
  private handleWebNotification = (event: Event): void => {
    const characteristic = event.target as BluetoothRemoteGATTCharacteristic;
    const value = characteristic.value;
    if (value) {
      const decoder = new TextDecoder('utf-8');
      const text = decoder.decode(value);
      this.onDataCallback?.(text);
    }
  };

  private handleWebDisconnect = (): void => {
    console.log('Web Bluetooth device disconnected');
    this.device = null;
    this.server = null;
    this.characteristic = null;
  };

  /**
   * Handle incoming data from device - Native
   */
  private handleNativeNotification(value: DataView): void {
    // decode as UTF-8 text
    const buffer = value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);
    const decoder = new TextDecoder('utf-8');
    const text = decoder.decode(new Uint8Array(buffer));
    this.onDataCallback?.(text);
  }

  /**
   * Check if device is connected
   */
  isConnected(): boolean {
    return this.useNative ? this.nativeConnected : (this.server?.connected ?? false);
  }

  /**
   * Get device name
   */
  getDeviceName(): string | null {
    return this.useNative ? this.nativeDeviceName : (this.device?.name ?? null);
  }
}

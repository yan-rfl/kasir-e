/**
 * Web Bluetooth Thermal Printer Helper
 * Supports 58mm & 80mm Bluetooth Thermal Printers (Putian POS, Generic ESC/POS BLE)
 * Includes Smart Auto-Reconnect & Connection State Broadcasting
 */

export interface BluetoothPrinterDevice {
  device: any; // BluetoothDevice
  characteristic: any; // BluetoothRemoteGATTCharacteristic
  name: string;
}

export type ConnectionListener = (connected: boolean, deviceName: string | null) => void;

// Known BLE Service UUIDs used by thermal POS printers
const KNOWN_PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Standard Chinese POS Service
  '0000ffe0-0000-1000-8000-00805f9b34fb', // HM-10 Transparent Serial
  '0000ff00-0000-1000-8000-00805f9b34fb', // Generic POS BLE
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC SPP over BLE
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
];

const STORAGE_KEY_AUTO_RECONNECT = 'kasire_bt_auto_reconnect';
const STORAGE_KEY_PAIRED_NAME = 'kasire_bt_paired_name';

class BluetoothPrinterService {
  private connectedDevice: BluetoothPrinterDevice | null = null;
  private cachedDevice: any = null; // BluetoothDevice reference
  private isConnecting: boolean = false;
  private listeners: Set<ConnectionListener> = new Set();
  private reconnectInterval: any = null;
  private isInitialized: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      // Listen for tab focus/visibility to check connection
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && !this.isConnected() && this.shouldAutoReconnect()) {
          this.trySilentReconnect().catch(() => {});
        }
      });
    }
  }

  public isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return 'bluetooth' in navigator;
  }

  public isConnected(): boolean {
    return (
      this.connectedDevice !== null &&
      this.connectedDevice.device?.gatt?.connected === true
    );
  }

  public getDeviceName(): string | null {
    return this.connectedDevice?.name || this.getSavedDeviceName() || null;
  }

  public addConnectionListener(listener: ConnectionListener): () => void {
    this.listeners.add(listener);
    // Immediately notify current state
    listener(this.isConnected(), this.getDeviceName());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(connected: boolean, name: string | null) {
    this.listeners.forEach((listener) => {
      try {
        listener(connected, name);
      } catch (err) {
        console.error('Error in printer connection listener:', err);
      }
    });
  }

  private shouldAutoReconnect(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(STORAGE_KEY_AUTO_RECONNECT) === 'true';
  }

  private getSavedDeviceName(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEY_PAIRED_NAME) || null;
  }

  private saveDevicePreferences(device: any) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY_AUTO_RECONNECT, 'true');
    if (device?.name) {
      localStorage.setItem(STORAGE_KEY_PAIRED_NAME, device.name);
    }
  }

  private clearDevicePreferences() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY_AUTO_RECONNECT);
    localStorage.removeItem(STORAGE_KEY_PAIRED_NAME);
  }

  /**
   * Connect to GATT server and acquire write characteristic
   */
  private async setupGattConnection(device: any): Promise<BluetoothPrinterDevice> {
    const server = await device.gatt.connect();

    // Find suitable write characteristic
    let writeChar: any = null;

    for (const serviceUuid of KNOWN_PRINTER_SERVICES) {
      try {
        const service = await server.getPrimaryService(serviceUuid);
        const chars = await service.getCharacteristics();
        for (const c of chars) {
          if (c.properties.write || c.properties.writeWithoutResponse) {
            writeChar = c;
            break;
          }
        }
      } catch {
        // Continue scanning services
      }
      if (writeChar) break;
    }

    // If not found in known services, inspect all primary services on device
    if (!writeChar) {
      try {
        const services = await server.getPrimaryServices();
        for (const s of services) {
          const chars = await s.getCharacteristics();
          for (const c of chars) {
            if (c.properties.write || c.properties.writeWithoutResponse) {
              writeChar = c;
              break;
            }
          }
          if (writeChar) break;
        }
      } catch {
        // ignore
      }
    }

    if (!writeChar) {
      throw new Error('Karakteristik penulisan (write) printer tidak ditemukan pada perangkat ini.');
    }

    const connected: BluetoothPrinterDevice = {
      device,
      characteristic: writeChar,
      name: device.name || 'Printer Bluetooth',
    };

    this.connectedDevice = connected;
    this.cachedDevice = device;
    this.saveDevicePreferences(device);

    // Bind disconnect event listener cleanly
    try {
      device.removeEventListener('gattserverdisconnected', this.handleDisconnected);
    } catch {
      // ignore
    }
    device.addEventListener('gattserverdisconnected', this.handleDisconnected);

    this.stopAutoReconnectTimer();
    this.notifyListeners(true, connected.name);

    return connected;
  }

  private handleDisconnected = () => {
    console.warn('Printer Bluetooth terputus (daya printer mati / di luar jangkauan)');
    this.connectedDevice = null;
    this.notifyListeners(false, null);

    // If auto-reconnect is enabled, start polling in background
    if (this.shouldAutoReconnect() && this.cachedDevice) {
      this.startAutoReconnectTimer();
    }
  };

  private startAutoReconnectTimer() {
    if (this.reconnectInterval || !this.cachedDevice) return;

    this.reconnectInterval = setInterval(async () => {
      if (this.isConnected()) {
        this.stopAutoReconnectTimer();
        return;
      }

      if (this.cachedDevice && !this.isConnecting) {
        try {
          this.isConnecting = true;
          await this.setupGattConnection(this.cachedDevice);
          console.log('Printer Bluetooth berhasil tersambung kembali secara otomatis!');
        } catch {
          // Printer is still powered off, silently wait for next tick
        } finally {
          this.isConnecting = false;
        }
      }
    }, 3500);
  }

  private stopAutoReconnectTimer() {
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }
  }

  /**
   * Try reconnecting to cached device or previously paired devices without prompt
   */
  public async trySilentReconnect(): Promise<boolean> {
    if (this.isConnected()) return true;
    if (this.isConnecting) return false;

    this.isConnecting = true;
    try {
      // 1. Try memory cached device first
      if (this.cachedDevice) {
        try {
          await this.setupGattConnection(this.cachedDevice);
          return true;
        } catch {
          // continue to getDevices
        }
      }

      // 2. Try Chrome getDevices() for remembered devices
      const nav = typeof navigator !== 'undefined' ? (navigator as any) : null;
      if (nav?.bluetooth?.getDevices) {
        const devices = await nav.bluetooth.getDevices();
        if (devices && devices.length > 0) {
          const savedName = this.getSavedDeviceName();
          const target = devices.find((d: any) => d.name === savedName) || devices[0];
          if (target) {
            this.cachedDevice = target;
            await this.setupGattConnection(target);
            return true;
          }
        }
      }
    } catch {
      // ignore
    } finally {
      this.isConnecting = false;
    }

    return false;
  }

  /**
   * Initialize auto-reconnect on app start
   */
  public async initAutoReconnect(): Promise<boolean> {
    if (this.isInitialized) return this.isConnected();
    this.isInitialized = true;

    if (!this.isSupported() || !this.shouldAutoReconnect() || this.isConnected()) {
      return false;
    }

    return this.trySilentReconnect();
  }

  /**
   * Explicit user connect action (shows browser Bluetooth picker)
   */
  public async connect(): Promise<BluetoothPrinterDevice> {
    if (!this.isSupported()) {
      throw new Error('Web Bluetooth tidak didukung di browser ini. Gunakan Chrome di Android/PC atau gunakan Cetak Layar.');
    }

    if (this.isConnected() && this.connectedDevice) {
      return this.connectedDevice;
    }

    // First try silent reconnect if we have a paired device
    if (this.cachedDevice) {
      try {
        const reconnected = await this.setupGattConnection(this.cachedDevice);
        return reconnected;
      } catch {
        // Fall back to device picker
      }
    }

    this.isConnecting = true;
    try {
      const nav = navigator as any;
      const device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: KNOWN_PRINTER_SERVICES,
      });

      if (!device) {
        throw new Error('Tidak ada perangkat printer dipilih.');
      }

      return await this.setupGattConnection(device);
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * Explicit user disconnect action (disables auto-reconnect)
   */
  public async disconnect(): Promise<void> {
    this.clearDevicePreferences();
    this.stopAutoReconnectTimer();

    if (this.connectedDevice?.device?.gatt?.connected) {
      try {
        this.connectedDevice.device.gatt.disconnect();
      } catch {
        // ignore
      }
    }

    this.connectedDevice = null;
    this.cachedDevice = null;
    this.notifyListeners(false, null);
  }

  /**
   * Send ESC/POS raw bytes with chunking (50-100 bytes) and slight delays
   * Auto-reconnects on-the-fly if printer was temporarily powered off.
   */
  public async printBytes(bytes: Uint8Array): Promise<boolean> {
    // If not connected, attempt on-the-fly silent reconnect before failing!
    if (!this.isConnected() || !this.connectedDevice) {
      const reconnected = await this.trySilentReconnect();
      if (!reconnected || !this.connectedDevice) {
        throw new Error('Printer belum terhubung.');
      }
    }

    const char = this.connectedDevice.characteristic;
    const chunkSize = 100;

    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.slice(i, i + chunkSize);
      if (char.writeValueWithoutResponse) {
        await char.writeValueWithoutResponse(chunk);
      } else {
        await char.writeValue(chunk);
      }
      // Small delay between packets to prevent microcontroller buffer overflow
      await new Promise((resolve) => setTimeout(resolve, 25));
    }

    return true;
  }
}

export const bluetoothPrinter = new BluetoothPrinterService();

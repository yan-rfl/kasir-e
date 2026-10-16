/**
 * Web Bluetooth Thermal Printer Helper
 * Supports 58mm Bluetooth Thermal Printers (Putian POS, Generic ESC/POS BLE)
 */

export interface BluetoothPrinterDevice {
  device: any; // BluetoothDevice
  characteristic: any; // BluetoothRemoteGATTCharacteristic
  name: string;
}

// Known BLE Service UUIDs used by 58mm thermal printers
const KNOWN_PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Standard Chinese POS Service
  '0000ffe0-0000-1000-8000-00805f9b34fb', // HM-10 Transparent Serial
  '0000ff00-0000-1000-8000-00805f9b34fb', // Generic POS BLE
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC SPP over BLE
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
];

class BluetoothPrinterService {
  private connectedDevice: BluetoothPrinterDevice | null = null;
  private isConnecting: boolean = false;

  public isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return 'bluetooth' in navigator;
  }

  public isConnected(): boolean {
    return (
      this.connectedDevice !== null &&
      this.connectedDevice.device.gatt?.connected === true
    );
  }

  public getDeviceName(): string | null {
    return this.connectedDevice?.name || null;
  }

  public async connect(): Promise<BluetoothPrinterDevice> {
    if (!this.isSupported()) {
      throw new Error('Web Bluetooth tidak didukung di browser ini. Gunakan Chrome di Android/PC atau gunakan Cetak Layar.');
    }

    if (this.isConnected() && this.connectedDevice) {
      return this.connectedDevice;
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

      device.addEventListener('gattserverdisconnected', () => {
        console.warn('Printer Bluetooth terputus');
        this.connectedDevice = null;
      });

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

      // If still not found, search all services on device
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

      this.connectedDevice = {
        device,
        characteristic: writeChar,
        name: device.name || 'Printer Bluetooth',
      };

      return this.connectedDevice;
    } finally {
      this.isConnecting = false;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.connectedDevice && this.connectedDevice.device.gatt?.connected) {
      this.connectedDevice.device.gatt.disconnect();
    }
    this.connectedDevice = null;
  }

  /**
   * Send ESC/POS raw bytes with chunking (50-100 bytes) and slight delays
   * to avoid buffer overflow on Putian POS microcontrollers.
   */
  public async printBytes(bytes: Uint8Array): Promise<boolean> {
    if (!this.isConnected() || !this.connectedDevice) {
      throw new Error('Printer belum terhubung.');
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
      // Small delay between packets
      await new Promise((resolve) => setTimeout(resolve, 25));
    }

    return true;
  }
}

export const bluetoothPrinter = new BluetoothPrinterService();

package com.kasire.app;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.util.Base64;

import androidx.core.app.ActivityCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

import java.io.OutputStream;
import java.util.Set;
import java.util.UUID;

@CapacitorPlugin(
    name = "BluetoothPrinterPlugin",
    permissions = {
        @Permission(strings = { Manifest.permission.BLUETOOTH_CONNECT, Manifest.permission.BLUETOOTH_SCAN }, alias = "bluetooth"),
        @Permission(strings = { Manifest.permission.ACCESS_FINE_LOCATION }, alias = "location")
    }
)
public class BluetoothPrinterPlugin extends Plugin {

    // Universal standard SPP (Serial Port Profile) UUID for ESC/POS thermal printers
    private static final UUID SPP_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");
    private static final String PREFS_NAME = "KasirE_Printer_Prefs";
    private static final String KEY_SAVED_MAC = "saved_printer_mac";
    private static final String KEY_SAVED_NAME = "saved_printer_name";

    private BluetoothSocket bluetoothSocket = null;
    private OutputStream outputStream = null;
    private String connectedDeviceName = null;
    private String connectedDeviceAddress = null;

    private BluetoothAdapter getAdapter() {
        return BluetoothAdapter.getDefaultAdapter();
    }

    private boolean checkPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            return ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED;
        }
        return true;
    }

    @PluginMethod
    public void listPairedDevices(PluginCall call) {
        if (!checkPermissions()) {
            requestPermissionForAlias("bluetooth", call, "permissionCallback");
            return;
        }

        BluetoothAdapter adapter = getAdapter();
        if (adapter == null) {
            call.reject("Perangkat tidak mendukung Bluetooth");
            return;
        }

        if (!adapter.isEnabled()) {
            call.reject("Bluetooth tidak aktif. Silakan nyalakan Bluetooth");
            return;
        }

        Set<BluetoothDevice> pairedDevices = adapter.getBondedDevices();
        JSArray devicesArray = new JSArray();

        if (pairedDevices != null) {
            for (BluetoothDevice device : pairedDevices) {
                JSObject dev = new JSObject();
                String name = device.getName();
                dev.put("name", name != null ? name : "Printer Bluetooth");
                dev.put("address", device.getAddress());
                devicesArray.put(dev);
            }
        }

        JSObject ret = new JSObject();
        ret.put("devices", devicesArray);
        call.resolve(ret);
    }

    @PluginMethod
    public void connect(PluginCall call) {
        String address = call.getString("address");
        if (address == null || address.isEmpty()) {
            SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            address = prefs.getString(KEY_SAVED_MAC, null);
        }

        if (address == null || address.isEmpty()) {
            call.reject("Alamat printer (MAC) tidak ditemukan");
            return;
        }

        final String targetAddress = address;
        disconnectInternal();

        new Thread(() -> {
            try {
                BluetoothAdapter adapter = getAdapter();
                if (adapter == null || !adapter.isEnabled()) {
                    call.reject("Bluetooth tidak aktif");
                    return;
                }

                if (checkPermissions()) {
                    adapter.cancelDiscovery();
                }

                BluetoothDevice device = adapter.getRemoteDevice(targetAddress);
                BluetoothSocket socket = device.createRfcommSocketToServiceRecord(SPP_UUID);
                socket.connect();

                bluetoothSocket = socket;
                outputStream = socket.getOutputStream();
                connectedDeviceAddress = targetAddress;
                connectedDeviceName = device.getName();

                SharedPreferences.Editor editor = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit();
                editor.putString(KEY_SAVED_MAC, targetAddress);
                editor.putString(KEY_SAVED_NAME, connectedDeviceName != null ? connectedDeviceName : "Printer");
                editor.apply();

                JSObject ret = new JSObject();
                ret.put("connected", true);
                ret.put("name", connectedDeviceName != null ? connectedDeviceName : "Printer");
                ret.put("address", targetAddress);
                call.resolve(ret);
            } catch (Exception e) {
                disconnectInternal();
                call.reject("Gagal tersambung ke printer: " + e.getMessage());
            }
        }).start();
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        disconnectInternal();
        JSObject ret = new JSObject();
        ret.put("connected", false);
        call.resolve(ret);
    }

    private synchronized void disconnectInternal() {
        try {
            if (outputStream != null) {
                outputStream.close();
            }
        } catch (Exception ignored) {}
        try {
            if (bluetoothSocket != null) {
                bluetoothSocket.close();
            }
        } catch (Exception ignored) {}
        outputStream = null;
        bluetoothSocket = null;
        connectedDeviceAddress = null;
        connectedDeviceName = null;
    }

    @PluginMethod
    public void isConnected(PluginCall call) {
        boolean connected = bluetoothSocket != null && bluetoothSocket.isConnected() && outputStream != null;
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String savedName = prefs.getString(KEY_SAVED_NAME, "");

        JSObject ret = new JSObject();
        ret.put("connected", connected);
        ret.put("name", connectedDeviceName != null ? connectedDeviceName : savedName);
        ret.put("address", connectedDeviceAddress != null ? connectedDeviceAddress : "");
        call.resolve(ret);
    }

    @PluginMethod
    public void autoReconnect(PluginCall call) {
        if (bluetoothSocket != null && bluetoothSocket.isConnected()) {
            JSObject ret = new JSObject();
            ret.put("connected", true);
            ret.put("name", connectedDeviceName != null ? connectedDeviceName : "Printer");
            call.resolve(ret);
            return;
        }

        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String savedAddress = prefs.getString(KEY_SAVED_MAC, null);

        if (savedAddress == null || savedAddress.isEmpty()) {
            JSObject ret = new JSObject();
            ret.put("connected", false);
            call.resolve(ret);
            return;
        }

        new Thread(() -> {
            try {
                BluetoothAdapter adapter = getAdapter();
                if (adapter == null || !adapter.isEnabled()) {
                    JSObject ret = new JSObject();
                    ret.put("connected", false);
                    call.resolve(ret);
                    return;
                }

                if (checkPermissions()) {
                    adapter.cancelDiscovery();
                }

                BluetoothDevice device = adapter.getRemoteDevice(savedAddress);
                BluetoothSocket socket = device.createRfcommSocketToServiceRecord(SPP_UUID);
                socket.connect();

                bluetoothSocket = socket;
                outputStream = socket.getOutputStream();
                connectedDeviceAddress = savedAddress;
                connectedDeviceName = device.getName();

                JSObject ret = new JSObject();
                ret.put("connected", true);
                ret.put("name", connectedDeviceName != null ? connectedDeviceName : "Printer");
                ret.put("address", savedAddress);
                call.resolve(ret);
            } catch (Exception e) {
                disconnectInternal();
                JSObject ret = new JSObject();
                ret.put("connected", false);
                ret.put("error", e.getMessage());
                call.resolve(ret);
            }
        }).start();
    }

    @PluginMethod
    public void print(PluginCall call) {
        if (bluetoothSocket == null || !bluetoothSocket.isConnected() || outputStream == null) {
            SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String savedAddress = prefs.getString(KEY_SAVED_MAC, null);
            if (savedAddress != null && !savedAddress.isEmpty()) {
                try {
                    BluetoothAdapter adapter = getAdapter();
                    if (adapter != null && adapter.isEnabled()) {
                        BluetoothDevice device = adapter.getRemoteDevice(savedAddress);
                        BluetoothSocket socket = device.createRfcommSocketToServiceRecord(SPP_UUID);
                        socket.connect();
                        bluetoothSocket = socket;
                        outputStream = socket.getOutputStream();
                        connectedDeviceAddress = savedAddress;
                        connectedDeviceName = device.getName();
                    }
                } catch (Exception ignored) {}
            }
        }

        if (bluetoothSocket == null || !bluetoothSocket.isConnected() || outputStream == null) {
            call.reject("Printer belum tersambung via Bluetooth");
            return;
        }

        String base64Data = call.getString("data");
        if (base64Data == null || base64Data.isEmpty()) {
            call.reject("Data cetak kosong");
            return;
        }

        try {
            byte[] bytes = Base64.decode(base64Data, Base64.DEFAULT);
            outputStream.write(bytes);
            outputStream.flush();

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            disconnectInternal();
            call.reject("Gagal mencetak: " + e.getMessage());
        }
    }
}

package mn.henzhurag.app

import android.Manifest
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothSocket
import android.content.Context
import android.os.Build
import androidx.core.content.ContextCompat
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.PermissionState
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.util.UUID
import java.util.concurrent.atomic.AtomicBoolean

private val SPP_UUID: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")

/**
 * Bridges the phone's Bluetooth Classic (SPP) connection to a Hopeland UHF
 * reader (HL7202K8) into the web app. JS side: @/lib/rfid-bluetooth.ts.
 */
@CapacitorPlugin(
    name = "RfidBluetooth",
    permissions = [Permission(strings = [Manifest.permission.BLUETOOTH_CONNECT], alias = "bluetooth")],
)
class RfidBluetoothPlugin : Plugin() {

    private var socket: BluetoothSocket? = null
    private val running = AtomicBoolean(false)

    @PluginMethod
    fun listPairedDevices(call: PluginCall) {
        if (needsBluetoothPermission()) {
            requestPermissionForAlias("bluetooth", call, "listPairedDevicesCallback")
            return
        }
        respondWithPairedDevices(call)
    }

    @PermissionCallback
    private fun listPairedDevicesCallback(call: PluginCall) {
        if (getPermissionState("bluetooth") == PermissionState.GRANTED) {
            respondWithPairedDevices(call)
        } else {
            call.reject("Bluetooth зөвшөөрөл олгогдоогүй")
        }
    }

    private fun respondWithPairedDevices(call: PluginCall) {
        val adapter = bluetoothAdapter()
        if (adapter == null || !adapter.isEnabled) {
            call.reject("Bluetooth асаагаагүй байна")
            return
        }
        val devices = JSONArray()
        for (device in adapter.bondedDevices) {
            devices.put(
                JSONObject().apply {
                    put("name", device.name ?: device.address)
                    put("address", device.address)
                },
            )
        }
        call.resolve(JSObject().apply { put("devices", devices) })
    }

    @PluginMethod
    fun connect(call: PluginCall) {
        val address = call.getString("address")
        if (address.isNullOrBlank()) {
            call.reject("address шаардлагатай")
            return
        }
        if (needsBluetoothPermission()) {
            call.reject("Bluetooth зөвшөөрөл олгогдоогүй")
            return
        }
        val adapter = bluetoothAdapter()
        val device = adapter?.getRemoteDevice(address)
        if (adapter == null || device == null) {
            call.reject("Төхөөрөмж олдсонгүй")
            return
        }

        Thread {
            try {
                disconnectInternal()
                val sock = device.createRfcommSocketToServiceRecord(SPP_UUID)
                sock.connect()
                socket = sock
                running.set(true)
                notifyListeners("statusChanged", JSObject().put("status", "connected"))
                sock.outputStream.write(buildStartInventoryFrame())
                call.resolve()
                readLoop(sock)
            } catch (e: Exception) {
                running.set(false)
                notifyListeners(
                    "statusChanged",
                    JSObject().put("status", "error").put("message", e.message),
                )
                call.reject("Холбогдож чадсангүй: ${e.message}")
            }
        }.start()
    }

    private fun readLoop(sock: BluetoothSocket) {
        val frameReader = FrameReader()
        val buf = ByteArray(1024)
        try {
            while (running.get()) {
                val n = sock.inputStream.read(buf)
                if (n <= 0) break
                frameReader.append(buf, n)
                while (true) {
                    val frame = frameReader.nextFrame() ?: break
                    handleFrame(sock, frame)
                }
            }
        } catch (e: IOException) {
            notifyListeners(
                "statusChanged",
                JSObject().put("status", "disconnected").put("message", e.message),
            )
        } finally {
            running.set(false)
            notifyListeners("statusChanged", JSObject().put("status", "disconnected"))
        }
    }

    private fun handleFrame(sock: BluetoothSocket, frame: ParsedFrame) {
        when {
            frame.group == GROUP_EPC && frame.mid == MID_TAG_DATA -> {
                parseTag(frame.data)?.let { tag ->
                    val obj = JSObject().put("epc", decodeEpcSerial(tag.epc)).put("antenna", tag.antenna)
                    tag.rssi?.let { obj.put("rssi", it) }
                    notifyListeners("tagScanned", obj)
                }
            }
            frame.group == GROUP_HEARTBEAT && frame.mid == MID_HEARTBEAT -> {
                try {
                    sock.outputStream.write(buildHeartbeatEcho(frame.data))
                } catch (_: IOException) {
                }
            }
        }
    }

    @PluginMethod
    fun disconnect(call: PluginCall) {
        disconnectInternal()
        call.resolve()
    }

    private fun disconnectInternal() {
        running.set(false)
        try {
            socket?.close()
        } catch (_: IOException) {
        }
        socket = null
    }

    private fun needsBluetoothPermission(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return false
        return ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_CONNECT) !=
            android.content.pm.PackageManager.PERMISSION_GRANTED
    }

    private fun bluetoothAdapter() =
        (context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager)?.adapter

    /**
     * Our ear tags carry a human-readable serial (e.g. "H10000021") as ASCII
     * text in the EPC memory bank; parseTag() returns it as hex. Decode back
     * to that serial so it matches the earNumber format the rest of the app
     * uses. Falls back to the raw hex for any tag that isn't ASCII-encoded.
     */
    private fun decodeEpcSerial(hex: String): String {
        if (hex.length % 2 != 0) return hex
        val bytes = try {
            hex.chunked(2).map { it.toInt(16).toByte() }
        } catch (_: NumberFormatException) {
            return hex
        }
        val isPrintableAscii = bytes.all { it.toInt() in 32..126 }
        return if (isPrintableAscii) bytes.map { it.toInt().toChar() }.joinToString("") else hex
    }
}

package mn.henzhurag.app

import android.Manifest
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.PermissionState
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback
import com.pda.rfid.EPCModel
import com.pda.rfid.IAsynchronousMessage
import com.pda.rfid.uhf.UHFReader
import com.port.Adapt
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Bridges the Wing HY820's INTEGRATED UHF reader chip (Hopeland PDA SDK)
 * into the web app. Distinct from RfidBluetoothPlugin, which talks to
 * external Bluetooth SPP readers like the HL7202K8 over RFCOMM. This one
 * calls straight into the on-device UHF module via com.port.Adapt /
 * com.pda.rfid.uhf.UHFReader, so it only does anything on Hopeland
 * hardware — isSupported() reports false everywhere else. JS side:
 * @/lib/rfid-uhf.ts.
 */
@CapacitorPlugin(
    name = "DeviceUhf",
    permissions = [Permission(strings = [Manifest.permission.READ_PHONE_STATE], alias = "phoneState")],
)
class DeviceUhfPlugin : Plugin(), IAsynchronousMessage {

    private var opened = false
    private val scanning = AtomicBoolean(false)

    @PluginMethod
    fun isSupported(call: PluginCall) {
        if (needsPhoneStatePermission()) {
            requestPermissionForAlias("phoneState", call, "isSupportedCallback")
            return
        }
        respondWithSupport(call)
    }

    @PermissionCallback
    private fun isSupportedCallback(call: PluginCall) {
        if (getPermissionState("phoneState") == PermissionState.GRANTED) {
            respondWithSupport(call)
        } else {
            call.resolve(JSObject().put("supported", false))
        }
    }

    private fun respondWithSupport(call: PluginCall) {
        val supported = try {
            Adapt.init(context) && Adapt.getPropertiesInstance().support("UHF")
        } catch (_: Throwable) {
            false
        }
        call.resolve(JSObject().put("supported", supported))
    }

    @PluginMethod
    fun connect(call: PluginCall) {
        if (needsPhoneStatePermission()) {
            call.reject("READ_PHONE_STATE зөвшөөрөл олгогдоогүй")
            return
        }
        Thread {
            try {
                if (!Adapt.init(context)) {
                    fail(call, "SDK эхлүүлж чадсангүй")
                    return@Thread
                }
                if (!opened) {
                    val ok = UHFReader.getUHFInstance().OpenConnect(this)
                    if (!ok) {
                        fail(call, "UHF модуль нээгдсэнгүй")
                        return@Thread
                    }
                    opened = true
                    Thread.sleep(500)
                }
                UHFReader._Config.Stop()
                Thread.sleep(20)
                scanning.set(true)
                UHFReader._Tag6C.GetEPC(1, 1)
                notifyListeners("statusChanged", JSObject().put("status", "connected"))
                call.resolve()
            } catch (e: Exception) {
                fail(call, "Холбогдож чадсангүй: ${e.message}")
            }
        }.start()
    }

    private fun fail(call: PluginCall, message: String) {
        notifyListeners("statusChanged", JSObject().put("status", "error").put("message", message))
        call.reject(message)
    }

    @PluginMethod
    fun disconnect(call: PluginCall) {
        Thread {
            closeConnection()
            notifyListeners("statusChanged", JSObject().put("status", "disconnected"))
            call.resolve()
        }.start()
    }

    private fun closeConnection() {
        scanning.set(false)
        if (opened) {
            try {
                UHFReader._Config.Stop()
                UHFReader._Config.CloseConnect()
            } catch (_: Exception) {
            }
            opened = false
        }
    }

    override fun handleOnDestroy() {
        closeConnection()
        super.handleOnDestroy()
    }

    private fun needsPhoneStatePermission(): Boolean {
        return ContextCompat.checkSelfPermission(context, Manifest.permission.READ_PHONE_STATE) !=
            PackageManager.PERMISSION_GRANTED
    }

    // IAsynchronousMessage callback — fires once per tag read while scanning is on.
    override fun OutPutEPC(model: EPCModel) {
        if (!scanning.get()) return
        val epc = model._EPC ?: return
        val obj = JSObject()
            .put("epc", decodeEpcSerial(epc))
            .put("antenna", model._ANT_NUM)
        obj.put("rssi", model._RSSI.toInt())
        notifyListeners("tagScanned", obj)
    }

    /**
     * Our ear tags carry a human-readable serial (e.g. "H10000021") as ASCII
     * text in the EPC memory bank; the SDK returns it as hex. Decode back to
     * that serial so it matches the earNumber format the rest of the app
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

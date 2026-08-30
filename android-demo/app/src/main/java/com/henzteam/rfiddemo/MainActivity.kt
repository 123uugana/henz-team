package com.henzteam.rfiddemo

import android.Manifest
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.ListView
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import org.json.JSONArray
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

private const val BACKEND_URL = "https://hents-hurga-api.uuganbayrxx0716.workers.dev"
private const val READER_ID = "hl7202k8-01"
private const val READER_SECRET = "change-me-hl7202k8-secret"

class MainActivity : AppCompatActivity() {

    private lateinit var statusText: TextView
    private lateinit var connectButton: Button
    private lateinit var tagListView: ListView
    private val tagAdapter by lazy { ArrayAdapter<String>(this, android.R.layout.simple_list_item_1) }
    private val seenEpcs = LinkedHashSet<String>()
    private val mainHandler = Handler(Looper.getMainLooper())

    private var client: RfidBluetoothClient? = null

    private val requestPermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            if (granted) pickDeviceAndConnect() else toast("Bluetooth зөвшөөрөл хэрэгтэй")
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        statusText = findViewById(R.id.statusText)
        connectButton = findViewById(R.id.connectButton)
        tagListView = findViewById(R.id.tagListView)
        tagListView.adapter = tagAdapter

        connectButton.setOnClickListener { startConnectFlow() }
    }

    private fun startConnectFlow() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_CONNECT)
                != PackageManager.PERMISSION_GRANTED
            ) {
                requestPermission.launch(Manifest.permission.BLUETOOTH_CONNECT)
                return
            }
        }
        pickDeviceAndConnect()
    }

    private fun pickDeviceAndConnect() {
        val adapter = (getSystemService(BLUETOOTH_SERVICE) as BluetoothManager).adapter
        if (adapter == null || !adapter.isEnabled) {
            toast("Bluetooth асаагаагүй байна")
            return
        }
        val paired = adapter.bondedDevices.toList()
        if (paired.isEmpty()) {
            toast("Bluetooth-оор pair хийсэн төхөөрөмж алга. Эхлээд Windows/Android Bluetooth тохиргооноос pair хийнэ үү.")
            return
        }
        val names = paired.map { "${it.name ?: "?"} (${it.address})" }.toTypedArray()
        AlertDialog.Builder(this)
            .setTitle("Уншигч сонго")
            .setItems(names) { _, which -> connectTo(paired[which]) }
            .show()
    }

    private fun connectTo(device: BluetoothDevice) {
        client?.disconnect()
        statusText.text = "Холбогдож байна..."
        val newClient = RfidBluetoothClient(
            onTag = { tag -> mainHandler.post { onTagReceived(tag) } },
            onStatus = { msg -> mainHandler.post { statusText.text = msg } },
            onDisconnected = { mainHandler.post { statusText.text = "Холболт тасарсан" } },
        )
        client = newClient
        Thread {
            try {
                newClient.connect(device)
            } catch (e: Exception) {
                mainHandler.post { statusText.text = "Холбогдож чадсангүй: ${e.message}" }
            }
        }.start()
    }

    private fun onTagReceived(tag: TagReading) {
        val line = "EPC:${tag.epc}  ant:${tag.antenna}  rssi:${tag.rssi ?: "-"}"
        if (seenEpcs.add(tag.epc)) {
            tagAdapter.insert(line, 0)
        }
        uploadScan(tag)
    }

    private fun uploadScan(tag: TagReading) {
        Thread {
            try {
                val url = URL("$BACKEND_URL/api/devices/scans")
                val conn = url.openConnection() as HttpURLConnection
                conn.requestMethod = "POST"
                conn.doOutput = true
                conn.setRequestProperty("Content-Type", "application/json")
                conn.connectTimeout = 5000
                conn.readTimeout = 5000

                val scan = JSONObject().apply {
                    put("epc", tag.epc)
                    tag.rssi?.let { put("rssi", it) }
                    put("antennaId", tag.antenna.toString())
                }
                val body = JSONObject().apply {
                    put("readerId", READER_ID)
                    put("secret", READER_SECRET)
                    put("scans", JSONArray().put(scan))
                }

                OutputStreamWriter(conn.outputStream).use { it.write(body.toString()) }
                val code = conn.responseCode
                conn.disconnect()
                if (code >= 300) {
                    mainHandler.post { toast("Upload алдаа: $code") }
                }
            } catch (e: Exception) {
                mainHandler.post { toast("Upload амжилтгүй: ${e.message}") }
            }
        }.start()
    }

    private fun toast(msg: String) = Toast.makeText(this, msg, Toast.LENGTH_SHORT).show()

    override fun onDestroy() {
        super.onDestroy()
        client?.disconnect()
    }
}

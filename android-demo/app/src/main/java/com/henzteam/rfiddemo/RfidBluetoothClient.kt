package com.henzteam.rfiddemo

import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothSocket
import java.io.IOException
import java.util.UUID
import java.util.concurrent.atomic.AtomicBoolean

private val SPP_UUID: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")

class RfidBluetoothClient(
    private val onTag: (TagReading) -> Unit,
    private val onStatus: (String) -> Unit,
    private val onDisconnected: () -> Unit,
) {
    private var socket: BluetoothSocket? = null
    private val running = AtomicBoolean(false)

    @Throws(IOException::class)
    fun connect(device: BluetoothDevice) {
        onStatus("Холбогдож байна: ${device.name ?: device.address}")
        val sock = device.createRfcommSocketToServiceRecord(SPP_UUID)
        sock.connect()
        socket = sock
        running.set(true)
        onStatus("Холбогдлоо: ${device.name ?: device.address}")

        sock.outputStream.write(buildStartInventoryFrame())

        Thread { readLoop(sock) }.start()
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
            onStatus("Холболт тасарлаа: ${e.message}")
        } finally {
            running.set(false)
            onDisconnected()
        }
    }

    private fun handleFrame(sock: BluetoothSocket, frame: ParsedFrame) {
        when {
            frame.group == GROUP_EPC && frame.mid == MID_TAG_DATA -> {
                parseTag(frame.data)?.let(onTag)
            }
            frame.group == GROUP_HEARTBEAT && frame.mid == MID_HEARTBEAT -> {
                try {
                    sock.outputStream.write(buildHeartbeatEcho(frame.data))
                } catch (e: IOException) {
                    onStatus("Heartbeat алдаа: ${e.message}")
                }
            }
            frame.group == GROUP_EPC && frame.mid == MID_READ_OVER -> {
                // continuous read stopped on the reader side; nothing to do for the demo
            }
        }
    }

    fun disconnect() {
        running.set(false)
        try {
            socket?.close()
        } catch (_: IOException) {
        }
        socket = null
    }
}

package mn.henzhurag.app

/**
 * Port of the Hopeland RFIDReaderAPI binary frame protocol (from the vendor's
 * Python PC SDK: com.rfid.protocol.BaseFrame / ControlWord / helper.CRC16).
 * Frame layout: [0xAA][CW byte0][CW MID][DataLen hi][DataLen lo][Data...][CRC hi][CRC lo]
 * CW byte0 bits (MSB..LSB): flag15 flag14 flag13 flag12 group(4 bits)
 */

data class ParsedFrame(val group: Int, val mid: Int, val data: ByteArray)

data class TagReading(val epc: String, val antenna: Int, val rssi: Int?)

private val CRC_TABLE = intArrayOf(
    0x0, 0x8005, 0x800f, 0xa, 0x801b, 0x1e, 0x14, 0x8011, 0x8033, 0x36,
    0x3c, 0x8039, 0x28, 0x802d, 0x8027, 0x22, 0x8063, 0x66, 0x6c, 0x8069,
    0x78, 0x807d, 0x8077, 0x72, 0x50, 0x8055, 0x805f, 0x5a, 0x804b, 0x4e,
    0x44, 0x8041, 0x80c3, 0xc6, 0xcc, 0x80c9, 0xd8, 0x80dd, 0x80d7, 0xd2,
    0xf0, 0x80f5, 0x80ff, 0xfa, 0x80eb, 0xee, 0xe4, 0x80e1, 0xa0, 0x80a5,
    0x80af, 0xaa, 0x80bb, 0xbe, 0xb4, 0x80b1, 0x8093, 0x96, 0x9c, 0x8099,
    0x88, 0x808d, 0x8087, 0x82, 0x8183, 0x186, 0x18c, 0x8189, 0x198, 0x819d,
    0x8197, 0x192, 0x1b0, 0x81b5, 0x81bf, 0x1ba, 0x81ab, 0x1ae, 0x1a4, 0x81a1,
    0x1e0, 0x81e5, 0x81ef, 0x1ea, 0x81fb, 0x1fe, 0x1f4, 0x81f1, 0x81d3, 0x1d6,
    0x1dc, 0x81d9, 0x1c8, 0x81cd, 0x81c7, 0x1c2, 0x140, 0x8145, 0x814f, 0x14a,
    0x815b, 0x15e, 0x154, 0x8151, 0x8173, 0x176, 0x17c, 0x8179, 0x168, 0x816d,
    0x8167, 0x162, 0x8123, 0x126, 0x12c, 0x8129, 0x138, 0x813d, 0x8137, 0x132,
    0x110, 0x8115, 0x811f, 0x11a, 0x810b, 0x10e, 0x104, 0x8101, 0x8303, 0x306,
    0x30c, 0x8309, 0x318, 0x831d, 0x8317, 0x312, 0x330, 0x8335, 0x833f, 0x33a,
    0x832b, 0x32e, 0x324, 0x8321, 0x360, 0x8365, 0x836f, 0x36a, 0x837b, 0x37e,
    0x374, 0x8371, 0x8353, 0x356, 0x35c, 0x8359, 0x348, 0x834d, 0x8347, 0x342,
    0x3c0, 0x83c5, 0x83cf, 0x3ca, 0x83db, 0x3de, 0x3d4, 0x83d1, 0x83f3, 0x3f6,
    0x3fc, 0x83f9, 0x3e8, 0x83ed, 0x83e7, 0x3e2, 0x83a3, 0x3a6, 0x3ac, 0x83a9,
    0x3b8, 0x83bd, 0x83b7, 0x3b2, 0x390, 0x8395, 0x839f, 0x39a, 0x838b, 0x38e,
    0x384, 0x8381, 0x280, 0x8285, 0x828f, 0x28a, 0x829b, 0x29e, 0x294, 0x8291,
    0x82b3, 0x2b6, 0x2bc, 0x82b9, 0x2a8, 0x82ad, 0x82a7, 0x2a2, 0x82e3, 0x2e6,
    0x2ec, 0x82e9, 0x2f8, 0x82fd, 0x82f7, 0x2f2, 0x2d0, 0x82d5, 0x82df, 0x2da,
    0x82cb, 0x2ce, 0x2c4, 0x82c1, 0x8243, 0x246, 0x24c, 0x8249, 0x258, 0x825d,
    0x8257, 0x252, 0x270, 0x8275, 0x827f, 0x27a, 0x826b, 0x26e, 0x264, 0x8261,
    0x220, 0x8225, 0x822f, 0x22a, 0x823b, 0x23e, 0x234, 0x8231, 0x8213, 0x216,
    0x21c, 0x8219, 0x208, 0x820d, 0x8207, 0x202
)

private fun crc16(data: ByteArray): ByteArray {
    var crc = 0
    for (b in data) {
        val byte = b.toInt() and 0xFF
        val crcIndex = (((crc and 0xFF00) shr 8) xor byte) and 0xFF
        crc = ((crc and 0xFF) shl 8) xor CRC_TABLE[crcIndex]
    }
    return byteArrayOf(((crc shr 8) and 0xFF).toByte(), (crc and 0xFF).toByte())
}

private fun buildFrame(group: Int, mid: Int, data: ByteArray): ByteArray {
    val cwByte0 = (group and 0x0F)
    val len = data.size
    val head = byteArrayOf(
        0xAA.toByte(),
        cwByte0.toByte(),
        mid.toByte(),
        ((len shr 8) and 0xFF).toByte(),
        (len and 0xFF).toByte(),
    )
    val body = head + data
    val crc = crc16(body.copyOfRange(1, body.size))
    return body + crc
}

/** Frame that starts continuous EPC inventory on antenna 1 (CW group 0010, MID 0x10). */
fun buildStartInventoryFrame(): ByteArray = buildFrame(group = 0b0010, mid = 0x10, data = byteArrayOf(1, 1))

/** Echoes a heartbeat ping back to the reader (CW group 0001, MID 0x12) so it keeps the link open. */
fun buildHeartbeatEcho(pingData: ByteArray): ByteArray = buildFrame(group = 0b0001, mid = 0x12, data = pingData)

const val GROUP_EPC = 0b0010
const val MID_TAG_DATA = 0x00
const val MID_READ_OVER = 0x01
const val GROUP_HEARTBEAT = 0b0001
const val MID_HEARTBEAT = 0x12

/**
 * Feed raw bytes from the Bluetooth input stream in and pull out complete,
 * CRC-valid frames as they accumulate. Mirrors the vendor SDK's ring-buffer
 * frame splitter (BaseConnect.prcThread), minus the RS485 address byte we
 * never use.
 */
class FrameReader {
    private val buffer = ArrayList<Byte>()

    fun append(bytes: ByteArray, length: Int) {
        for (i in 0 until length) buffer.add(bytes[i])
    }

    fun nextFrame(): ParsedFrame? {
        while (buffer.size >= 5) {
            if (buffer[0] != 0xAA.toByte()) {
                buffer.removeAt(0)
                continue
            }
            val dataLen = ((buffer[3].toInt() and 0xFF) shl 8) or (buffer[4].toInt() and 0xFF)
            val frameLen = 7 + dataLen
            if (buffer.size < frameLen) return null

            val frame = ByteArray(frameLen) { buffer[it] }
            repeat(frameLen) { buffer.removeAt(0) }

            val crcInput = frame.copyOfRange(1, frameLen - 2)
            val expectedCrc = frame.copyOfRange(frameLen - 2, frameLen)
            val actualCrc = crc16(crcInput)
            if (!expectedCrc.contentEquals(actualCrc)) {
                continue // corrupted frame, drop and keep scanning
            }

            val group = frame[1].toInt() and 0x0F
            val mid = frame[2].toInt() and 0xFF
            val data = frame.copyOfRange(5, 5 + dataLen)
            return ParsedFrame(group, mid, data)
        }
        return null
    }
}

/** Parses a 6C tag payload (BaseFrame._Data for a MID_TAG_DATA frame) into EPC/antenna/RSSI. */
fun parseTag(data: ByteArray): TagReading? {
    if (data.size < 2) return null
    var idx = 0
    fun u16(): Int {
        val v = ((data[idx].toInt() and 0xFF) shl 8) or (data[idx + 1].toInt() and 0xFF)
        idx += 2
        return v
    }
    fun u8(): Int {
        val v = data[idx].toInt() and 0xFF
        idx += 1
        return v
    }

    val epcLen = u16()
    if (epcLen <= 0 || idx + epcLen > data.size) return null
    val epcBytes = data.copyOfRange(idx, idx + epcLen)
    idx += epcLen
    val epc = epcBytes.joinToString("") { "%02X".format(it) }

    idx += 2 // PC bytes, unused
    if (idx >= data.size) return TagReading(epc, antenna = 0, rssi = null)
    val antenna = u8()

    var rssi: Int? = null
    while (idx < data.size) {
        val tag = u8()
        when (tag) {
            1 -> if (idx < data.size) rssi = u8()
            2 -> if (idx < data.size) { u8() } // read result code
            3, 4, 5 -> if (idx + 1 < data.size) { val len = u16(); idx += len }
            6 -> idx += 1
            7 -> idx += 8
            else -> return TagReading(epc, antenna, rssi)
        }
    }
    return TagReading(epc, antenna, rssi)
}

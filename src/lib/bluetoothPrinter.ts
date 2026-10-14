import type { Order, ShopSettings } from '../types'
import { SPICY_LEVELS } from './constants'

// ESC/POS Commands
const ESC = 0x1B
const GS = 0x1D

export class BluetoothPrinterService {
  private device: any = null
  private characteristic: any = null
  private isConnected = false

  public isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator
  }

  public getStatus(): { isConnected: boolean; deviceName: string } {
    return {
      isConnected: this.isConnected,
      deviceName: this.device?.name || 'ไม่ได้เชื่อมต่อ'
    }
  }

  // Request Bluetooth Device
  public async connect(): Promise<boolean> {
    if (!this.isSupported()) {
      throw new Error('อุปกรณ์หรือเบราว์เซอร์นี้ไม่รองรับ Web Bluetooth API (แนะนำใช้ Chrome บน Android/PC)')
    }

    try {
      // Common thermal printer service UUIDs
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb', // Standard POS Printer
          'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
          '49535343-fe7d-4ae5-8fa9-9fafd205e455'
        ]
      })

      const server = await device.gatt.connect()
      this.device = device

      // Find writable characteristic
      const services = await server.getPrimaryServices()
      for (const service of services) {
        const characteristics = await service.getCharacteristics()
        for (const char of characteristics) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            this.characteristic = char
            this.isConnected = true
            console.log('[Printer] Connected to Bluetooth printer:', device.name)
            return true
          }
        }
      }

      throw new Error('ไม่พบลักษณะการเขียน (Write Characteristic) บนเครื่องพิมพ์นี้')
    } catch (err: any) {
      this.isConnected = false
      console.error('[Printer] Connect error:', err)
      throw err
    }
  }

  public async disconnect(): Promise<void> {
    if (this.device && this.device.gatt.connected) {
      this.device.gatt.disconnect()
    }
    this.isConnected = false
    this.characteristic = null
    this.device = null
  }

  // Build ESC/POS Byte Buffer
  public buildEscPosReceipt(order: Order, settings: ShopSettings): Uint8Array {
    const encoder = new TextEncoder()
    const bytes: number[] = []

    const addBytes = (...b: number[]) => bytes.push(...b)
    const addText = (text: string) => {
      const encoded = encoder.encode(text)
      encoded.forEach(b => bytes.push(b))
    }

    // Init printer
    addBytes(ESC, 0x40) // ESC @

    // Center Align
    addBytes(ESC, 0x61, 1)

    // Shop Name (Double size)
    addBytes(GS, 0x21, 0x11)
    addText(`${settings.shopName}\n`)

    // Branch & Contact (Normal size)
    addBytes(GS, 0x21, 0x00)
    addText(`${settings.branchName}\n`)
    if (settings.phone) addText(`โทร: ${settings.phone}\n`)
    addText('--------------------------------\n')

    // Queue Number (Very Large Bold)
    addBytes(ESC, 0x61, 1) // Center
    addBytes(GS, 0x21, 0x22) // 3x size
    addText(` ${order.orderNumber} \n`)
    addBytes(GS, 0x21, 0x00) // Reset size
    addText(`[${order.tableOrQueue || 'รับหน้าร้าน'}] - ${order.diningType === 'takeaway' ? 'กลับบ้าน' : 'ทานที่ร้าน'}\n`)
    addText('--------------------------------\n')

    // Left Align for Details
    addBytes(ESC, 0x61, 0)
    const dateStr = new Date(order.createdAt).toLocaleString('th-TH', {
      dateStyle: 'short',
      timeStyle: 'medium'
    })
    addText(`เวลา: ${dateStr}\n`)
    if (order.isLineOrder) {
      addText(`[LINE สั่งกลับบ้าน] คุณ ${order.customerName || ''}\n`)
      if (order.customerPhone) addText(`โทร: ${order.customerPhone}\n`)
      if (order.pickupTime) addText(`นัดรับ: ${order.pickupTime}\n`)
    }
    if (order.isTableQrOrder) {
      addText(`[สั่งผ่าน QR โต๊ะ] ${order.tableOrQueue || 'ทานที่ร้าน'}\n`)
    }
    
    if (order.spicyLevel) {
      const sp = SPICY_LEVELS.find(s => s.id === order.spicyLevel)?.label.split(' ')[0] || order.spicyLevel
      addText(`ความเผ็ด: ${sp}\n`)
    }

    if (order.orderAddons && order.orderAddons.length > 0) {
      addText(`พิเศษ: ${order.orderAddons.join(', ')}\n`)
    }
    
    if (order.notes) {
      addText(`หมายเหตุ: ${order.notes}\n`)
      addText('--------------------------------\n')
    }

    // Items list
    order.items.forEach(item => {
      const lineTotal = item.price * item.quantity
      const spicy = item.spicyLevel ? SPICY_LEVELS.find(s => s.id === item.spicyLevel)?.label.split(' ')[0] : ''
      const spicyStr = spicy ? `[${spicy}]` : ''
      const addonsStr = item.addons && item.addons.length > 0 ? ` +${item.addons.join(',')}` : ''
      const noteStr = item.note ? ` (${item.note})` : ''
      const rawName = `${item.name}${spicyStr}${addonsStr}${noteStr}`
      const itemName = rawName.length > 20 ? rawName.slice(0, 20) + '..' : rawName
      const qtyStr = `x${item.quantity}`
      const priceStr = `${lineTotal}.-`
      
      // Simple 32 column format
      const leftPart = `${itemName} ${qtyStr}`
      const spacesNeeded = Math.max(1, 32 - leftPart.length - priceStr.length)
      addText(`${leftPart}${' '.repeat(spacesNeeded)}${priceStr}\n`)
    })

    addText('--------------------------------\n')

    // Right Align for Totals
    addBytes(ESC, 0x61, 2)
    addText(`รวมจำนวนรายการ: ${order.totalItemsCount} รายการ\n`)
    if (order.discount > 0) {
      addText(`ส่วนลด: -${order.discount} ฿\n`)
    }

    // Grand total bold
    addBytes(GS, 0x21, 0x11)
    addText(`ยอดสุทธิ: ${order.grandTotal} บาท\n`)
    addBytes(GS, 0x21, 0x00)

    // Payment info
    addBytes(ESC, 0x61, 1)
    const paymentThai = order.paymentMethod === 'promptpay' ? 'พร้อมเพย์ QR' : order.paymentMethod === 'cash' ? 'เงินสด' : 'โอนเงิน'
    addText(`ชำระโดย: ${paymentThai}\n`)
    if (order.cashReceived && order.paymentMethod === 'cash') {
      addText(`รับเงิน: ${order.cashReceived} ฿ | เงินทอน: ${order.changeDue || 0} ฿\n`)
    }

    // Footer
    addText('\n')
    addText(`${settings.receiptFooter || 'ขอบคุณที่ใช้บริการ'}\n`)
    addText('*** POS ตุ่น หม่าล่าทอดฟินเว่อร์ ***\n')

    // Feed lines & cut
    addBytes(ESC, 0x64, 4) // Feed 4 lines
    addBytes(GS, 0x56, 0x41, 0x00) // Partial Cut

    return new Uint8Array(bytes)
  }

  // Print raw bytes to Bluetooth Characteristic in chunks
  public async printRaw(data: Uint8Array): Promise<void> {
    if (!this.characteristic) {
      throw new Error('ยังไม่ได้เชื่อมต่อเครื่องพิมพ์บลูทูธ')
    }

    const chunkSize = 100 // BLE characteristic MTU safe chunk size
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize)
      if (this.characteristic.writeValueWithoutResponse) {
        await this.characteristic.writeValueWithoutResponse(chunk)
      } else {
        await this.characteristic.writeValue(chunk)
      }
      // Brief sleep for printer buffer
      await new Promise(r => setTimeout(r, 20))
    }
  }

  // High-level print order method
  public async printOrder(order: Order, settings: ShopSettings): Promise<boolean> {
    if (!this.isConnected || !this.characteristic) {
      return false
    }

    const payload = this.buildEscPosReceipt(order, settings)
    await this.printRaw(payload)
    return true
  }
}

export const bluetoothPrinter = new BluetoothPrinterService()

// Browser printing wrapper for iPad / iOS / AirPrint
export function triggerBrowserPrint(): void {
  if (typeof window !== 'undefined') {
    window.print()
  }
}

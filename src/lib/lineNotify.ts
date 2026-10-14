import type { Order, LineOaSettings } from '../types'
import { SPICY_LEVELS } from './constants'

/**
 * Format order into a clean, legible Thai message for LINE chat & notifications
 */
export function formatLineOrderMessage(order: Order, shopName = 'ร้านหม่าล่าทอด ตุ่นฟินเว่อร์'): string {
  const timeStr = new Date(order.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
  
  const itemsText = order.items.map((item, idx) => {
    const spicy = item.spicyLevel ? SPICY_LEVELS.find(s => s.id === item.spicyLevel)?.label.split(' ')[0] : ''
    const spicyStr = spicy ? ` [${spicy}]` : ''
    const addonsStr = item.addons && item.addons.length > 0 ? ` (+${item.addons.join(', ')})` : ''
    const noteStr = item.note ? ` (${item.note})` : ''
    return `${idx + 1}. ${item.name}${spicyStr}${addonsStr}${noteStr} x${item.quantity} = ${item.price * item.quantity}฿`
  }).join('\n')

  const customerInfo = order.customerName 
    ? `👤 ลูกค้า: ${order.customerName}${order.customerPhone ? ` (${order.customerPhone})` : ''}\n` 
    : ''
  
  const pickupInfo = order.pickupTime 
    ? `⏰ นัดรับเวลา: ${order.pickupTime}\n` 
    : ''

  return `🥢 ออเดอร์สั่งกลับบ้าน (LINE Takeaway)
━━━━━━━━━━━━━━━━━━━━━
📌 คิวที่: ${order.orderNumber}
${customerInfo}${pickupInfo}🥡 สั่งเวลา: ${timeStr} น.
━━━━━━━━━━━━━━━━━━━━━
📋 รายการอาหาร (${order.totalItemsCount} รายการ):
${itemsText}
━━━━━━━━━━━━━━━━━━━━━
💰 ยอดสุทธิ: ${order.grandTotal} บาท
💳 การชำระเงิน: ${order.paymentMethod === 'promptpay' ? 'พร้อมเพย์ QR' : order.paymentMethod === 'cash' ? 'เงินสดหน้าร้าน' : 'โอนเงิน'}
${order.notes ? `💬 หมายเหตุ: ${order.notes}\n` : ''}━━━━━━━━━━━━━━━━━━━━━
📍 ${shopName}`
}

/**
 * Send order notification to custom Webhook (Make.com, Zapier, Cloudflare, LINE Messaging API Webhook)
 */
export async function sendLineOrderWebhook(
  order: Order, 
  lineSettings?: LineOaSettings, 
  shopName?: string
): Promise<{ success: boolean; message: string }> {
  if (!lineSettings || !lineSettings.enabled || !lineSettings.autoNotifyOnOrder) {
    return { success: false, message: 'ระบบแจ้งเตือน LINE ปิดอยู่' }
  }

  const webhookUrl = lineSettings.webhookUrl?.trim()
  if (!webhookUrl) {
    return { success: false, message: 'ไม่ได้ตั้งค่า Webhook URL' }
  }

  const messageText = formatLineOrderMessage(order, shopName)

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event: 'new_order',
        type: 'takeaway_order',
        orderNumber: order.orderNumber,
        customerName: order.customerName || 'ลูกค้าสั่งผ่าน LINE',
        customerPhone: order.customerPhone || '',
        pickupTime: order.pickupTime || '',
        grandTotal: order.grandTotal,
        totalItemsCount: order.totalItemsCount,
        text: messageText,
        order: order,
        timestamp: Date.now()
      })
    })

    if (res.ok) {
      return { success: true, message: 'ส่งแจ้งเตือน LINE สำเร็จ' }
    } else {
      return { success: false, message: `Webhook ตอบกลับข้อผิดพลาด HTTP ${res.status}` }
    }
  } catch (err: any) {
    console.warn('[LINE Notify] Failed to send webhook:', err)
    return { success: false, message: `เชื่อมต่อ Webhook ไม่สำเร็จ: ${err.message || 'Network error'}` }
  }
}

/**
 * Generate 1-tap LINE share link so customer or staff can send order into LINE OA chat
 */
export function getLineDirectShareUrl(order: Order, lineSettings?: LineOaSettings, shopName?: string): string {
  const text = formatLineOrderMessage(order, shopName)
  const encoded = encodeURIComponent(text)
  
  if (lineSettings?.lineOaId) {
    const cleanId = lineSettings.lineOaId.replace(/^@/, '')
    return `https://line.me/R/oaMessage/@${cleanId}/?${encoded}`
  }
  
  return `https://line.me/R/msg/text/?${encoded}`
}

/**
 * Send test notification to verify LINE Webhook from Settings tab
 */
export async function sendTestLineNotification(
  lineSettings: LineOaSettings, 
  shopName = 'ร้านหม่าล่าทอด ตุ่นฟินเว่อร์'
): Promise<{ success: boolean; message: string }> {
  const webhookUrl = lineSettings.webhookUrl?.trim()
  if (!webhookUrl) {
    return { success: false, message: 'โปรดระบุ Webhook URL ก่อนกดทดสอบ' }
  }

  const testText = `🔔 ทดสอบการแจ้งเตือน LINE จากระบบ POS
━━━━━━━━━━━━━━━━━━━━━
📍 ${shopName}
⏰ เวลาทดสอบ: ${new Date().toLocaleTimeString('th-TH')}
✅ การเชื่อมต่อระบบแจ้งเตือนออเดอร์พร้อมใช้งานแล้ว!`

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'test_notification',
        message: testText,
        text: testText,
        timestamp: Date.now()
      })
    })

    if (res.ok) {
      return { success: true, message: 'ส่งข้อความทดสอบเข้า LINE สำเร็จเรียบร้อย!' }
    } else {
      return { success: false, message: `ส่งไม่สำเร็จ: เซิร์ฟเวอร์ตอบกลับรหัส ${res.status}` }
    }
  } catch (err: any) {
    return { success: false, message: `ไม่สามารถส่งได้: ${err.message || 'โปรดตรวจสอบ URL'}` }
  }
}

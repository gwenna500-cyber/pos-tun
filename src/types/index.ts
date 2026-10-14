export type StickColorId = 'red' | 'yellow' | 'green' | 'blue' | 'purple' | 'orange' | 'custom'

export interface StickColorOption {
  id: StickColorId
  name: string
  price: number
  colorHex: string
  bgClass: string
  textClass: string
  borderClass: string
  label: string
}

export type SpicyLevel = string

export interface SpicyOption {
  id: string
  label: string
  desc?: string
  badgeClass: string
  isAvailable: boolean
}

export interface MenuCategory {
  id: string
  name: string
  icon?: string
}

export type CookingMethod = 
  | 'grill' // ย่างหม่าล่า
  | 'fry'   // ทอดกรอบ
  | 'boil'  // ต้มซุปหม่าล่า

export type DiningType = 
  | 'dine_in'   // ทานที่ร้าน
  | 'takeaway'  // กลับบ้าน
  | 'delivery'  // เดลิเวอรี่

export type PaymentMethod = 
  | 'promptpay' // พร้อมเพย์ QR
  | 'cash'      // เงินสด
  | 'transfer'  // โอนเงิน

export type OrderStatus = 
  | 'pending'   // รอคิวปรุง
  | 'cooking'   // กำลังย่าง/ทอด
  | 'ready'     // ปรุงเสร็จแล้ว/รอเสิร์ฟ
  | 'completed' // จ่ายเงินและรับของแล้ว
  | 'cancelled' // ยกเลิก

export type SyncStatus = 'synced' | 'pending_sync' | 'local_only'

export interface CartItem {
  cartItemId: string
  menuItemId?: string
  name: string
  price: number
  quantity: number
  spicyLevel?: SpicyLevel
  stickColorId?: StickColorId
  category?: string
  note?: string
  addons?: string[] // e.g. ['โรยงาขาวคั่ว', 'ทอดกรอบแห้งพิเศษ']
}

export interface MenuItem {
  id: string
  name: string
  price: number
  category: string
  stickColorId?: StickColorId
  image?: string
  isAvailable: boolean
  description?: string
}

export interface Order {
  id: string
  orderNumber: string       // e.g. "Q-001"
  tableOrQueue: string      // e.g. "คิว 1" or "โต๊ะ 4"
  items: CartItem[]
  totalItemsCount: number   // จำนวนรายการรวม
  subtotal: number
  discount: number
  grandTotal: number
  
  // Modifiers
  spicyLevel?: SpicyLevel
  cookingMethod?: CookingMethod
  diningType: DiningType
  notes: string
  orderAddons?: string[] // e.g. ['โรยงาขาวคั่วเยอะๆ', 'ทอดกรอบแห้งพิเศษ']

  // Payment
  paymentMethod: PaymentMethod
  paymentStatus: 'paid' | 'pending'
  cashReceived?: number
  changeDue?: number

  // Flow & Timing
  status: OrderStatus
  createdAt: number
  updatedAt: number
  completedAt?: number

  // LINE Takeaway & Table QR details
  isLineOrder?: boolean
  isTableQrOrder?: boolean
  tableNumber?: string
  tableSessionId?: string
  customerName?: string
  customerPhone?: string
  pickupTime?: string

  // Sync
  syncStatus: SyncStatus
  firebaseId?: string
}

export type TableStatus = 'available' | 'occupied' | 'billed'

export interface TableSession {
  tableNumber: string
  sessionId: string
  status: TableStatus
  openedAt: number
  billedAt?: number
  totalAmount?: number
  orderCount?: number
  lastOrderAt?: number
  customerName?: string
  paymentMethod?: PaymentMethod
}

export interface LineOaSettings {
  enabled: boolean                // เปิด/ปิดระบบสั่งกลับบ้านผ่าน LINE OA
  lineOaId: string                // e.g. "@tunfinver"
  lineOaUrl: string               // e.g. "https://line.me/R/ti/p/@tunfinver"
  customOrderBaseUrl?: string     // e.g. "https://pos-tun.netlify.app" ลิงก์ Netlify หรือโดเมนจริงของร้าน
  webhookUrl?: string             // LINE Webhook / Make / Zapier / Webhook URL
  notifyToken?: string            // LINE Notify Token หรือ Channel Access Token
  autoNotifyOnOrder: boolean      // แจ้งเตือนเข้า LINE อัตโนมัติเมื่อลูกค้าสั่งออเดอร์
  notifySound: boolean            // ส่งเสียงเตือนในแคชเชียร์/ครัวเมื่อมีออเดอร์จาก LINE
  pickupIntervalMinutes: number   // เวลาเตรียมออเดอร์โดยเฉลี่ย เช่น 15 นาที
  customWelcomeNote?: string      // ข้อความแจ้งลูกค้า
}

export interface ShopSettings {
  brandTitle?: string
  shopTagline?: string
  shopName: string
  branchName: string
  promptpayPhone: string
  address: string
  phone: string
  taxId: string
  receiptFooter: string
  soundEnabled: boolean
  hapticEnabled: boolean
  autoPrintReceipt: boolean
  // Table QR Ordering Settings
  tableOrderingEnabled?: boolean
  tableCount?: number
  tableList?: string[]
  // LINE OA Settings
  lineOaSettings?: LineOaSettings
  // Firebase configuration
  firebaseEnabled: boolean
  firebaseConfig: {
    apiKey: string
    authDomain: string
    databaseURL: string
    projectId: string
    storageBucket: string
    messagingSenderId: string
    appId: string
    measurementId?: string
  }
}

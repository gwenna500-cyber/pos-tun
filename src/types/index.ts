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

export type SpicyLevel = 
  | 'none'          // ไม่เผ็ด
  | 'mild'          // เผ็ดน้อย
  | 'medium'        // เผ็ดกลาง
  | 'numbing'       // เผ็ดชา (ลิ้นชา)
  | 'separate'      // พริกแยก
  | 'dry'           // ย่างแห้ง
  | 'extra_sesame'  // โรยงาเยอะ

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

  // Sync
  syncStatus: SyncStatus
  firebaseId?: string
}

export interface ShopSettings {
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

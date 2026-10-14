import type { StickColorOption, MenuItem, SpicyLevel, CookingMethod, DiningType, ShopSettings } from '../types'

export const STICK_COLORS: StickColorOption[] = [
  {
    id: 'red',
    name: 'ไม้แดง',
    price: 10,
    colorHex: '#ef4444',
    bgClass: 'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white',
    textClass: 'text-red-600',
    borderClass: 'border-red-400',
    label: '10 ฿'
  },
  {
    id: 'yellow',
    name: 'ไม้เหลือง',
    price: 15,
    colorHex: '#eab308',
    bgClass: 'bg-amber-400 hover:bg-amber-500 active:bg-amber-600 text-slate-900',
    textClass: 'text-amber-600',
    borderClass: 'border-amber-400',
    label: '15 ฿'
  },
  {
    id: 'green',
    name: 'ไม้เขียว',
    price: 20,
    colorHex: '#22c55e',
    bgClass: 'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white',
    textClass: 'text-emerald-600',
    borderClass: 'border-emerald-400',
    label: '20 ฿'
  },
  {
    id: 'blue',
    name: 'ไม้ฟ้า',
    price: 25,
    colorHex: '#0ea5e9',
    bgClass: 'bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white',
    textClass: 'text-sky-600',
    borderClass: 'border-sky-400',
    label: '25 ฿'
  },
  {
    id: 'purple',
    name: 'ไม้ม่วง',
    price: 30,
    colorHex: '#a855f7',
    bgClass: 'bg-purple-500 hover:bg-purple-600 active:bg-purple-700 text-white',
    textClass: 'text-purple-600',
    borderClass: 'border-purple-400',
    label: '30 ฿'
  },
  {
    id: 'orange',
    name: 'ไม้ส้ม',
    price: 35,
    colorHex: '#f97316',
    bgClass: 'bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white',
    textClass: 'text-orange-600',
    borderClass: 'border-orange-400',
    label: '35 ฿'
  }
]

export const MENU_CATEGORIES = [
  { id: 'all', name: 'ทั้งหมด', icon: 'Flame' },
  { id: 'quick', name: 'นับสีไม้ด่วน', icon: 'Zap' },
  { id: 'pork_meat', name: 'หมู/เนื้อ/ไก่', icon: 'Beef' },
  { id: 'seafood_ball', name: 'ซีฟู้ด/ลูกชิ้น', icon: 'Fish' },
  { id: 'veggie', name: 'ผักสดเสียบไม้', icon: 'Salad' },
  { id: 'drink', name: 'เครื่องดื่ม', icon: 'CupSoda' }
]

export const DEFAULT_MENU_ITEMS: MenuItem[] = [
  // หมู / เนื้อ / ไก่
  { id: 'm1', name: 'หมูสามชั้นหมักพริกหม่าล่า', price: 15, category: 'pork_meat', stickColorId: 'yellow', isAvailable: true, description: 'สามชั้นคัดพิเศษ มันแทรก นุ่มฉ่ำ' },
  { id: 'm2', name: 'สันคอหมูนุ่ม', price: 15, category: 'pork_meat', stickColorId: 'yellow', isAvailable: true, description: 'สันคอหมูหมักเครื่องเทศจีนเข้มข้น' },
  { id: 'm3', name: 'เนื้อวัวโคขุนเสียบไม้', price: 20, category: 'pork_meat', stickColorId: 'green', isAvailable: true, description: 'เนื้อโคขุนแท้ กลิ่นหอมเนื้อชัดเจน' },
  { id: 'm4', name: 'เอ็นข้อไก่กรุบกรอบ', price: 15, category: 'pork_meat', stickColorId: 'yellow', isAvailable: true, description: 'เอ็นแก้วไก่ เคี้ยวเพลิน' },
  { id: 'm5', name: 'ปีกไก่กลางผ่าครึ่ง', price: 20, category: 'pork_meat', stickColorId: 'green', isAvailable: true, description: 'ย่างหรือทอด หนังกรอบเนื้อนุ่ม' },
  { id: 'm6', name: 'เบคอนพันเห็ดเข็มทอง', price: 20, category: 'pork_meat', stickColorId: 'green', isAvailable: true, description: 'เบคอนรมควัน เห็ดกรุบกรอบ' },
  { id: 'm7', name: 'เบคอนพันไส้กรอกชีส', price: 25, category: 'pork_meat', stickColorId: 'blue', isAvailable: true, description: 'ชีสเยิ้มๆ ด้านใน' },
  
  // ซีฟู้ด / ลูกชิ้น
  { id: 'm8', name: 'ไส้กรอกแดงในตำนาน', price: 10, category: 'seafood_ball', stickColorId: 'red', isAvailable: true, description: 'ไส้กรอกแดงแป้งกรอบนอกนุ่มใน' },
  { id: 'm9', name: 'ลูกชิ้นเนื้อเอ็นพริกไทยดำ', price: 15, category: 'seafood_ball', stickColorId: 'yellow', isAvailable: true, description: 'ลูกชิ้นเนื้อแท้ เด้งดึ๋ง' },
  { id: 'm10', name: 'ลูกชิ้นปลาหมึกทรงเครื่อง', price: 15, category: 'seafood_ball', stickColorId: 'yellow', isAvailable: true, description: 'หนึบหนับ หอมเครื่องเทศ' },
  { id: 'm11', name: 'ปลาหมึกกรอบเสียบไม้', price: 25, category: 'seafood_ball', stickColorId: 'blue', isAvailable: true, description: 'หนวดหมึกสดกรอบ' },
  { id: 'm12', name: 'กุ้งขาวแกะเปลือก', price: 30, category: 'seafood_ball', stickColorId: 'purple', isAvailable: true, description: 'กุ้งสดเด้ง โรยหม่าล่า' },
  { id: 'm13', name: 'เต้าหู้ปลาชีส', price: 20, category: 'seafood_ball', stickColorId: 'green', isAvailable: true, description: 'ไส้ชีสลาวาหอมมัน' },
  
  // ผักสด
  { id: 'm14', name: 'กระเจี๊ยบเขียวสด', price: 10, category: 'veggie', stickColorId: 'red', isAvailable: true, description: 'กระเจี๊ยบสด ย่างไฟกลางหวานกรอบ' },
  { id: 'm15', name: 'บรอกโคลี', price: 10, category: 'veggie', stickColorId: 'red', isAvailable: true, description: 'ซึมซับซอสหม่าล่าได้ดีเยี่ยม' },
  { id: 'm16', name: 'ข้าวโพดหวานสไลซ์', price: 15, category: 'veggie', stickColorId: 'yellow', isAvailable: true, description: 'หวานธรรมชาติ ย่างเกรียมหอมเนย' },
  { id: 'm17', name: 'เห็ดออรินจิชิ้นหนา', price: 15, category: 'veggie', stickColorId: 'yellow', isAvailable: true, description: 'รสสัมผัสคล้ายเนื้อสัตว์' },
  { id: 'm18', name: 'รากบัวจีนสไลซ์บาง', price: 20, category: 'veggie', stickColorId: 'green', isAvailable: true, description: 'กรอบอร่อย ซิกเนเจอร์หม่าล่า' },

  // เครื่องดื่ม
  { id: 'm19', name: 'หวังเหล่าจี๊ (王老吉)', price: 35, category: 'drink', isAvailable: true, description: 'ชาสมุนไพรจีนสูตรเย็น ดับเผ็ดชาทันใจ' },
  { id: 'm20', name: 'ชาเขียวมะลิตราไต้หวัน', price: 25, category: 'drink', isAvailable: true, description: 'หวานกำลังดี หอมมะลิสดชื่น' },
  { id: 'm21', name: 'โค้กเย็น (กระป๋อง)', price: 20, category: 'drink', isAvailable: true, description: 'กระป๋อง 325ml แช่เย็นจัด' },
  { id: 'm22', name: 'น้ำดื่มบรรจุขวดเย็น', price: 10, category: 'drink', isAvailable: true, description: 'น้ำเปล่าเย็น 600ml' }
]

export const SPICY_LEVELS: { id: SpicyLevel; label: string; desc: string; badgeClass: string }[] = [
  { id: 'none', label: 'ไม่เผ็ด (ซอสหวาน)', desc: 'ทาซอสหวาน โรยงา ไม่ใส่พริก', badgeClass: 'bg-slate-100 text-slate-700 border-slate-300' },
  { id: 'mild', label: 'เผ็ดน้อย', desc: 'โรยพริกหม่าล่าเบาๆ ทานง่าย', badgeClass: 'bg-amber-100 text-amber-800 border-amber-300' },
  { id: 'medium', label: 'เผ็ดกลาง (มาตรฐาน)', desc: 'รสชาติยอดฮิต กลมกล่อมหอมชา', badgeClass: 'bg-orange-100 text-orange-800 border-orange-400' },
  { id: 'numbing', label: 'เผ็ดชา (ลิ้นชาคูณสอง)', desc: 'พริกหม่าล่าสูตรพิเศษ ชาถึงใจ', badgeClass: 'bg-red-600 text-white border-red-700 shadow-sm' },
  { id: 'separate', label: 'พริกแยก (ตักใส่ถ้วย)', desc: 'แยกพริกใส่ถ้วยน้ำจิ้มไปจิ้มเอง', badgeClass: 'bg-purple-100 text-purple-800 border-purple-300' },
  { id: 'dry', label: 'ย่างแห้ง (ไม่ชโลมซอส)', desc: 'เน้นความแห้งกรอบของเนื้อ', badgeClass: 'bg-stone-100 text-stone-800 border-stone-300' },
  { id: 'extra_sesame', label: 'โรยงาขาวเยอะๆ', desc: 'หอมกลิ่นงาคั่วพิเศษ', badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-300' }
]

export const COOKING_METHODS: { id: CookingMethod; label: string; icon: string; desc: string }[] = [
  { id: 'grill', label: 'ย่างหม่าล่าไฟแรง', icon: 'Flame', desc: 'หอมกลิ่นเตาย่าง ซอสหม่าล่าเกรียมๆ' },
  { id: 'fry', label: 'ทอดกรอบสะเด็ดน้ำมัน', icon: 'Sparkles', desc: 'กรอบนอกนุ่มใน คลุกผงหม่าล่าแห้ง' },
  { id: 'boil', label: 'ต้มซุปหม่าล่า (หม้อไฟ)', icon: 'Soup', desc: 'ต้มในน้ำซุปหม่าล่าเข้มข้น' }
]

export const DINING_TYPES: { id: DiningType; label: string }[] = [
  { id: 'takeaway', label: 'รับกลับบ้าน' },
  { id: 'dine_in', label: 'ทานที่ร้าน' },
  { id: 'delivery', label: 'เดลิเวอรี่' }
]

export const DEFAULT_SHOP_SETTINGS: ShopSettings = {
  shopName: 'ร้านหม่าล่า ตุ่นฟินเว่อร์',
  branchName: 'สาขา 1 (หน้าร้านหลัก)',
  promptpayPhone: '0812345678',
  address: '123/45 ถนนสุขุมวิท กรุงเทพฯ',
  phone: '081-234-5678',
  taxId: '0105559876543',
  receiptFooter: 'ขอบคุณที่อุดหนุนหม่าล่าตุ่นฟินเว่อร์! เผ็ดชากลมกล่อม สดใหม่ทุกวัน',
  soundEnabled: true,
  hapticEnabled: true,
  autoPrintReceipt: false,
  firebaseEnabled: false,
  firebaseConfig: {
    apiKey: '',
    authDomain: '',
    databaseURL: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: ''
  }
}

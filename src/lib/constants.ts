import type { MenuItem, SpicyOption, MenuCategory, CookingMethod, DiningType, ShopSettings, LineOaSettings } from '../types'

export const DEFAULT_MENU_CATEGORIES: MenuCategory[] = [
  { id: 'all', name: 'ทั้งหมด' },
  { id: 'meat_pork', name: 'เนื้อ & หมูสามชั้น' },
  { id: 'ball_sausage', name: 'ลูกชิ้น & ไส้กรอก' },
  { id: 'veggie_fried', name: 'ผักทอดกรอบ' },
  { id: 'snack', name: 'ของทานเล่น' },
  { id: 'drink', name: 'เครื่องดื่ม' }
]

export const MENU_CATEGORIES = DEFAULT_MENU_CATEGORIES

export const DEFAULT_MENU_ITEMS: MenuItem[] = [
  // หมู / เนื้อ / ไก่ ทอด
  { id: 'm1', name: 'หมูสามชั้นทอดหม่าล่า', price: 20, category: 'meat_pork', isAvailable: true, description: 'สามชั้นทอดกรอบนอกนุ่มใน คลุกผงหม่าล่าหอมๆ' },
  { id: 'm2', name: 'เอ็นข้อไก่ทอดกรุบกรอบ', price: 20, category: 'meat_pork', isAvailable: true, description: 'เอ็นแก้วไก่แท้ คลุกแป้งบางกรอบ เคี้ยวเพลิน' },
  { id: 'm3', name: 'สันคอหมูหมักหม่าล่าทอด', price: 20, category: 'meat_pork', isAvailable: true, description: 'สันคอหมักเครื่องเทศจีนเข้มข้น นุ่มฉ่ำ' },
  { id: 'm4', name: 'เนื้อวัวโคขุนทอดเสียบไม้', price: 25, category: 'meat_pork', isAvailable: true, description: 'เนื้อโคขุนแท้ ทอดพอดีไม่เหนียว กลิ่นหอมเนื้อชัด' },
  { id: 'm5', name: 'ปีกไก่กลางทอดกรอบ', price: 25, category: 'meat_pork', isAvailable: true, description: 'ปีกไก่ผ่าครึ่ง ทอดหนังกรอบสะเด็ดน้ำมัน' },
  { id: 'm6', name: 'เบคอนพันเห็ดเข็มทองทอด', price: 25, category: 'meat_pork', isAvailable: true, description: 'เบคอนรมควันทอดกรอบ เห็ดกรุบหวาน' },
  { id: 'm7', name: 'เบคอนพันไส้กรอกชีส', price: 25, category: 'meat_pork', isAvailable: true, description: 'ชีสลาวาเยิ้มๆ กัดเต็มคำ' },
  
  // ลูกชิ้น / ไส้กรอก ทอด
  { id: 'm8', name: 'ไส้กรอกแดงในตำนานทอด', price: 10, category: 'ball_sausage', isAvailable: true, description: 'ไส้กรอกแดงทอดพองกรอบ ยอดฮิตอันดับ 1' },
  { id: 'm9', name: 'ลูกชิ้นเนื้อเอ็นทอด', price: 15, category: 'ball_sausage', isAvailable: true, description: 'ลูกชิ้นเนื้อเอ็นแท้ เด้งดึ๋ง ทอดพองกรอบ' },
  { id: 'm10', name: 'ลูกชิ้นปลาหมึกทอด', price: 15, category: 'ball_sausage', isAvailable: true, description: 'เนื้อปลาหมึกแท้ หอมกลิ่นคั่วกระทะ' },
  { id: 'm11', name: 'เต้าหู้ปลาชีสทอด', price: 20, category: 'ball_sausage', isAvailable: true, description: 'เต้าหู้ปลานุ่มเด้ง ไส้ชีสเยิ้มหอมมัน' },
  { id: 'm12', name: 'เกี๊ยวหมูทอดกรอบ', price: 20, category: 'ball_sausage', isAvailable: true, description: 'แป้งเกี๊ยวบางกรอบ ไส้หมูสับปรุงรส' },
  
  // ผักทอดกรอบ
  { id: 'm13', name: 'เห็ดเข็มทองทอดกรอบ', price: 25, category: 'veggie_fried', isAvailable: true, description: 'เห็ดเข็มทองชุบแป้งบาง ทอดฟูกรอบ ไม่อมน้ำมัน' },
  { id: 'm14', name: 'รากบัวจีนทอดกรอบ', price: 20, category: 'veggie_fried', isAvailable: true, description: 'สไลซ์บาง ทอดกรอบคล้ายมันฝรั่งแผ่น' },
  { id: 'm15', name: 'ข้าวโพดหวานทอดคลุกผง', price: 20, category: 'veggie_fried', isAvailable: true, description: 'ข้าวโพดหวานฉ่ำ หั่นท่อนทอดกรอบ' },
  { id: 'm16', name: 'กระเจี๊ยบเขียวทอดกรอบ', price: 15, category: 'veggie_fried', isAvailable: true, description: 'ทอดสุกกำลังดี หวานธรรมชาติ' },
  { id: 'm17', name: 'บรอกโคลีทอด', price: 15, category: 'veggie_fried', isAvailable: true, description: 'ดูดซับผงหม่าล่าได้เข้มข้น' },

  // ของทานเล่น
  { id: 'm18', name: 'เฟรนช์ฟรายส์คลุกผงหม่าล่า', price: 39, category: 'snack', isAvailable: true, description: 'มันฝรั่งทอดไซส์ใหญ่ คลุกผงหม่าล่าเข้มข้น' },
  { id: 'm19', name: 'ข้าวเกรียบหม่าล่าทอด', price: 20, category: 'snack', isAvailable: true, description: 'กรอบฟู เคี้ยวเพลิน' },

  // เครื่องดื่ม
  { id: 'm20', name: 'หวังเหล่าจี๊ (王老吉)', price: 35, category: 'drink', isAvailable: true, description: 'ชาสมุนไพรจีนสูตรเย็น ดับเผ็ดชาทันใจ' },
  { id: 'm21', name: 'ชาเขียวมะลิตราไต้หวัน', price: 25, category: 'drink', isAvailable: true, description: 'หวานกำลังดี หอมมะลิสดชื่น' },
  { id: 'm22', name: 'โค้กเย็น (กระป๋อง)', price: 20, category: 'drink', isAvailable: true, description: 'กระป๋อง 325ml แช่เย็นจัด' },
  { id: 'm23', name: 'น้ำดื่มบรรจุขวดเย็น', price: 10, category: 'drink', isAvailable: true, description: 'น้ำเปล่าเย็น 600ml' }
]

export const DEFAULT_SPICY_OPTIONS: SpicyOption[] = [
  { id: 'none', label: 'ไม่เผ็ด (คลุกผงหวาน)', desc: 'ผงปรุงรสหวานกลมกล่อม ไม่ใส่พริก', badgeClass: 'bg-slate-100 text-slate-700 border-slate-300', isAvailable: true },
  { id: 'mild', label: 'เผ็ดน้อย', desc: 'โรยผงหม่าล่าเบาๆ ทานง่าย สบายลิ้น', badgeClass: 'bg-amber-100 text-amber-800 border-amber-300', isAvailable: true },
  { id: 'medium', label: 'เผ็ดกลาง (สูตรเด็ด)', desc: 'รสชาติยอดฮิต หอมเครื่องเทศ ชากำลังดี', badgeClass: 'bg-orange-100 text-orange-800 border-orange-400', isAvailable: true },
  { id: 'numbing', label: 'เผ็ดชา (ลิ้นชาคูณสอง)', desc: 'พริกหม่าล่าสูตรพิเศษ ชาถึงใจสะใจสายหม่าล่า', badgeClass: 'bg-red-600 text-white border-red-700 shadow-sm', isAvailable: true },
  { id: 'separate', label: 'ผงพริกแยก (ใส่ถ้วย)', desc: 'แยกผงหม่าล่าใส่ถ้วยไปจิ้มเอง', badgeClass: 'bg-purple-100 text-purple-800 border-purple-300', isAvailable: true }
]

export const DEFAULT_ORDER_ADDONS = [
  { id: 'extra_sesame', label: 'โรยงาขาวคั่วเยอะๆ', desc: 'หอมกลิ่นงาคั่วพิเศษ' },
  { id: 'dry_crispy', label: 'ทอดกรอบแห้งพิเศษ', desc: 'ทอดสะเด็ดน้ำมันแห้งสนิท กรอบนาน' }
]

export const SPICY_LEVELS = DEFAULT_SPICY_OPTIONS

export const COOKING_METHODS: { id: CookingMethod; label: string; icon: string; desc: string }[] = [
  { id: 'fry', label: 'ทอดกรอบคลุกผงแห้ง', icon: 'Sparkles', desc: 'ทอดกรอบสะเด็ดน้ำมัน คลุกผงหม่าล่าแห้งสูตรเด็ด' },
  { id: 'grill', label: 'ทอดคลุกซอสหม่าล่าฉ่ำ', icon: 'Flame', desc: 'ทอดเสร็จแล้วคลุกซอสหม่าล่าเข้มข้นฉ่ำๆ' },
  { id: 'boil', label: 'ทอดกรอบธรรมดา (ไม่ใส่ผง)', icon: 'Soup', desc: 'ทอดกรอบ ทานกับน้ำจิ้มไก่/ซอสมะเขือเทศ' }
]

export const DINING_TYPES: { id: DiningType; label: string }[] = [
  { id: 'takeaway', label: 'รับกลับบ้าน' },
  { id: 'dine_in', label: 'ทานที่ร้าน' }
]

export const DEFAULT_LINE_OA_SETTINGS: LineOaSettings = {
  enabled: true,
  lineOaId: '@tunfinver',
  lineOaUrl: 'https://line.me/R/ti/p/@tunfinver',
  customOrderBaseUrl: '',
  webhookUrl: '',
  notifyToken: '',
  autoNotifyOnOrder: true,
  notifySound: true,
  pickupIntervalMinutes: 15,
  customWelcomeNote: 'ยินดีต้อนรับสู่ ร้านหม่าล่าทอด ตุ่นฟินเว่อร์! สั่งล่วงหน้าได้เลย รับของไม่ต้องรอคิว'
}

export const DEFAULT_SHOP_SETTINGS: ShopSettings = {
  brandTitle: 'POS ตุ่น',
  shopTagline: 'หม่าล่าทอดกรอบ',
  shopName: 'ร้านหม่าล่าทอด ตุ่นฟินเว่อร์',
  branchName: 'สาขา 1 (หน้าร้านหลัก)',
  promptpayPhone: '0812345678',
  address: '123/45 ถนนสุขุมวิท กรุงเทพฯ',
  phone: '081-234-5678',
  taxId: '0105559876543',
  receiptFooter: 'ขอบคุณที่อุดหนุนหม่าล่าทอดตุ่นฟินเว่อร์! กรอบอร่อย เผ็ดชากลมกล่อม',
  soundEnabled: true,
  hapticEnabled: true,
  autoPrintReceipt: false,
  tableOrderingEnabled: true,
  tableCount: 10,
  tableList: Array.from({ length: 10 }, (_, i) => `โต๊ะ ${i + 1}`),
  lineOaSettings: DEFAULT_LINE_OA_SETTINGS,
  firebaseEnabled: true,
  firebaseConfig: {
    apiKey: 'AIzaSyCtfZirIM0pIclQW9l9FuWQw_8CA3aYZRs',
    authDomain: 'pos123-608f8.firebaseapp.com',
    databaseURL: 'https://pos123-608f8-default-rtdb.asia-southeast1.firebasedatabase.app',
    projectId: 'pos123-608f8',
    storageBucket: 'pos123-608f8.firebasestorage.app',
    messagingSenderId: '579873330648',
    appId: '1:579873330648:web:90e7f550b1aa7804a5cead',
    measurementId: 'G-CW146Q3CN2'
  }
}

// Keep STICK_COLORS array for backward compatibility if needed, but not used in UI
export const STICK_COLORS: any[] = []

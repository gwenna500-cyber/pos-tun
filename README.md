# POS ตุ่น (POS Tun) - ระบบขายหม่าล่า & ของทอดเสียบไม้ (Responsive PWA)

เว็บแอปพลิเคชันระบบจัดการหน้าร้าน (Point of Sale) สไตล์ **หม่าล่า / ปิ้งย่าง / ทอดเสียบไม้** ที่ออกแบบมาสำหรับ **iPad (แนวนอน)** และ **มือถือ (แนวตั้ง)** โดยเฉพาะ รองรับการทำงานแบบ **Offline-First (Dexie.js)** ซิงก์ข้อมูลขึ้น **Firebase Realtime Database** พิมพ์ใบเสร็จผ่าน **Web Bluetooth 58mm** หรือ **AirPrint / window.print()** พร้อมติดตั้งเป็น **PWA (Add to Home Screen)** ได้ทันที และพร้อม Deploy ขึ้น **Netlify**

---

## 🛠️ โครงสร้างเทคโนโลยี (Tech Stack)

- **Frontend Core:** React 19 + TypeScript + Vite + Tailwind CSS v4
- **State Management:** Zustand (จัดการ Cart, Modifiers, Stick Counter, โหมดหน้าจอ)
- **Offline & Local Storage:** Dexie.js (IndexedDB) เก็บออเดอร์ในเครื่องเมื่อเน็ตหลุด ไม่ทำให้ออเดอร์สูญหาย
- **Cloud Real-time Database:** Firebase Realtime Database (อัปเดตสถานะคิวหน้าครัว KDS เรียลไทม์)
- **PWA Service Worker:** `vite-plugin-pwa` (พร้อม Web App Manifest และ Cache ออฟไลน์)
- **Receipt Printing:**
  - **Android / Chrome / PC:** Web Bluetooth API ส่งคำสั่งตรง ESC/POS ไปยังเครื่องพิมพ์ความร้อนพกพา 58mm
  - **iPad / iOS / ทั่วไป:** `window.print()` / AirPrint ด้วยเทมเพลตใบเสร็จ 58mm/80mm แบบ Monospace
- **Payment Integration:**
  - สร้าง QR Code พร้อมเพย์แบบ Dynamic (ระบุยอดเงินสุทธิอัตโนมัติ ตามมาตรฐาน EMVCo)
  - ระบบคิดเงินสดพร้อมคำนวณเงินทอนและปุ่มลัดธนบัตร (20, 50, 100, 500, 1000)
- **Touch & Haptic UX:**
  - ปุ่มกดสัมผัสขนาดใหญ่ $h\text{-}14$ ถึง $h\text{-}16$ (56–64px)
  - ระบบสั่นสัมผัสตอบสนองเบาๆ (`navigator.vibrate(50)`)
  - ระบบเสียงจำลองด้วย Web Audio API (100% Offline ไม่ต้องพึ่งพาไฟล์เสียงภายนอก)

---

## 📱 การออกแบบหน้าจอ (Responsive Layouts)

### 1. iPad / แท็บเล็ต (แนวนอน - แนะนำสำหรับแคชเชียร์หลัก)
- **ฝั่งซ้าย (65%):**
  - **ปุ่มลัดคิดราคาตามสีไม้:** ไม้แดง (10฿), ไม้เหลือง (15฿), ไม้เขียว (20฿), ไม้ฟ้า (25฿), ไม้ม่วง (30฿), ไม้ส้ม (35฿) แตะนับจำนวนได้รวดเร็วทันใจ พร้อมป้ายแสดงจำนวนไม้ที่นับแล้ว
  - **แท็บหมวดหมู่แนวนอน:** ทั้งหมด, สีไม้ด่วน, หมู/เนื้อ/ไก่, ซีฟู้ด/ลูกชิ้น, ผักสด, เครื่องดื่ม
  - **ช่องค้นหาเมนูด่วน**
- **ฝั่งขวา (35%):**
  - **รายการในตะกร้า** พร้อมปุ่มเพิ่ม/ลด (+/-)
  - **ตัวเลือกขั้นตอนปรุง:** ย่างหม่าล่าไฟแรง / ทอดกรอบ / ต้มซุปหม่าล่า
  - **ระดับความเผ็ดชา:** ไม่เผ็ด / เผ็ดน้อย / เผ็ดกลาง / เผ็ดชา (ลิ้นชา) / พริกแยก / ย่างแห้ง / โรยงาเยอะ
  - **รูปแบบการทาน:** ทานที่ร้าน / รับกลับบ้าน
  - **ปุ่มชำระเงินสีแดงขนาดใหญ่:** `bg-red-600 hover:bg-red-700 h-16`

### 2. มือถือ (แนวตั้ง - สำหรับเดินรับออเดอร์หน้าร้าน)
- หน้าจอจัดเป็น **Single Column** สบายตา ใช้งานได้ด้วยมือเดียว
- แถบเมนูด้านบน พร้อมแถบลอยด้านล่าง (**Sticky Bottom Bar**) แสดงจำนวนไม้ ยอดเงินรวม และปุ่มเปิดตะกร้า
- ตะกร้าสินค้าแสดงผลในรูปแบบ **Bottom Drawer Modal**

### 3. จอครัว / สเตชันทอด-ย่าง (Kitchen View / KDS)
- แสดงการ์ดเลขคิวขนาดใหญ่ ชัดเจน อ่านง่ายแม้จะยืนห่างจากหน้าจอ
- แสดงจำนวนไม้และรายการอาหารอย่างละเอียด
- ไฮไลต์ **วิธีปรุง (ทอด/ย่าง)** และ **ระดับความเผ็ดชา** ชัดเจน
- ปุ่มขั้นตอนการทำงาน: `รอคิว` ➔ `กำลังทอด/ย่าง` ➔ `ทอดเสร็จแล้ว (พร้อมเสิร์ฟ)` ➔ `ส่งมอบแล้ว`
- มีเสียงเตือน (Chime) เมื่อมีออเดอร์ใหม่เข้ามา

### 4. รายงานยอดขายประจำวัน (Sales Summary)
- ยอดขายรวมประจำวัน (บาท)
- จำนวนไม้ที่ขายได้ทั้งหมด
- สถิติจำนวนไม้แยกตามสี (ช่วยให้เช็กสต็อกไม้ได้ง่าย)
- สัดส่วนการชำระเงิน (พร้อมเพย์ vs เงินสด)
- ประวัติการขายพร้อมปุ่มพิมพ์ใบเสร็จย้อนหลัง
- ปุ่มส่งออกข้อมูลเป็น **CSV (Excel)**

---

## 🚀 การรันโปรเจกต์ในเครื่อง (Development)

```bash
# ติดตั้ง dependencies (หากยังไม่ได้ติดตั้ง)
npm install

# รัน Development Server
npm run dev
```

เปิดเบราว์เซอร์ที่ [http://localhost:5173](http://localhost:5173)

---

## ☁️ การ Deploy ขึ้น Netlify

โปรเจกต์นี้มีไฟล์คอนฟิก [netlify.toml](file:///d:/kantaphon/pos-tun/netlify.toml) และ [public/_redirects](file:///d:/kantaphon/pos-tun/public/_redirects) สำหรับ Netlify เรียบร้อยแล้ว

### วิธีที่ 1: Deploy ผ่าน Netlify Drop (ง่ายที่สุด ไม่ต้องใช้ Git)
1. สั่ง Build โปรเจกต์ในเครื่อง:
   ```bash
   npm run build
   ```
2. โฟลเดอร์ `dist/` จะถูกสร้างขึ้น
3. เปิดเว็บ [https://app.netlify.com/drop](https://app.netlify.com/drop)
4. ลากโฟลเดอร์ `dist` ไปวางที่หน้าเว็บ Netlify ทันที เว็บจะออนไลน์พร้อมใช้งานภายใน 10 วินาที

### วิธีที่ 2: เชื่อมต่อผ่าน Git (GitHub / GitLab)
1. Push โปรเจกต์นี้ขึ้น GitHub Repository ของคุณ
2. เข้าสู่ระบบ Netlify แล้วเลือก **Add new site > Import an existing project**
3. เลือก Repository แล้วระบบจะดึงค่าจาก `netlify.toml` อัตโนมัติ:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
4. กด **Deploy Site**

---

## 🔥 การตั้งค่า Firebase Realtime Database

1. สร้างโปรเจกต์ใหม่ใน [Firebase Console](https://console.firebase.google.com/)
2. สร้าง **Realtime Database** ในโหมด Test หรือกำหนด Security Rules ดังนี้:
   ```json
   {
     "rules": {
       "orders": {
         ".read": true,
         ".write": true
       }
     }
   }
   ```
3. คัดลอกค่า Firebase Config (`apiKey`, `databaseURL`, `projectId`, `appId`)
4. นำไปกรอกที่หน้า **"ตั้งค่าระบบ" (Settings)** ในเว็บแอป แล้วกดบันทึก
5. ระบบจะเริ่มซิงก์ออเดอร์ระหว่างหน้าแคชเชียร์และหน้าจอครัว (KDS) แบบ Realtime ข้ามอุปกรณ์ทันที

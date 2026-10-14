import React, { useState } from 'react'
import { 
  Settings, 
  Flame, 
  Bluetooth, 
  Database, 
  Save, 
  Volume2, 
  Vibrate, 
  Printer, 
  Check, 
  Globe, 
  UploadCloud, 
  CheckCircle2 
} from 'lucide-react'
import { usePosStore } from '../store/usePosStore'
import { bluetoothPrinter } from '../lib/bluetoothPrinter'
import { initFirebaseService, isFirebaseReady, syncPendingOrdersToFirebase } from '../lib/firebase'

export const SettingsView: React.FC = () => {
  const { 
    shopSettings, 
    setShopSettings, 
    pendingSyncCount, 
    refreshSyncCount,
    isOnline 
  } = usePosStore()

  // Local form state
  const [formData, setFormData] = useState({
    shopName: shopSettings.shopName,
    branchName: shopSettings.branchName,
    promptpayPhone: shopSettings.promptpayPhone,
    phone: shopSettings.phone,
    address: shopSettings.address,
    receiptFooter: shopSettings.receiptFooter,
    soundEnabled: shopSettings.soundEnabled,
    hapticEnabled: shopSettings.hapticEnabled,
    autoPrintReceipt: shopSettings.autoPrintReceipt,
    firebaseEnabled: shopSettings.firebaseEnabled,
    apiKey: shopSettings.firebaseConfig.apiKey,
    databaseURL: shopSettings.firebaseConfig.databaseURL,
    projectId: shopSettings.firebaseConfig.projectId,
    appId: shopSettings.firebaseConfig.appId
  })

  const [savedSuccess, setSavedSuccess] = useState(false)
  const [btStatus, setBtStatus] = useState<{ isConnected: boolean; deviceName: string }>(bluetoothPrinter.getStatus())
  const [btLoading, setBtLoading] = useState(false)
  const [syncLoading, setSyncLoading] = useState(false)

  // Save Settings
  const handleSave = () => {
    const updated = {
      shopName: formData.shopName,
      branchName: formData.branchName,
      promptpayPhone: formData.promptpayPhone,
      phone: formData.phone,
      address: formData.address,
      receiptFooter: formData.receiptFooter,
      soundEnabled: formData.soundEnabled,
      hapticEnabled: formData.hapticEnabled,
      autoPrintReceipt: formData.autoPrintReceipt,
      firebaseEnabled: formData.firebaseEnabled,
      firebaseConfig: {
        ...shopSettings.firebaseConfig,
        apiKey: formData.apiKey,
        databaseURL: formData.databaseURL,
        projectId: formData.projectId,
        appId: formData.appId
      }
    }

    setShopSettings(updated)

    // Try re-initializing Firebase
    if (formData.apiKey && formData.databaseURL && formData.projectId) {
      initFirebaseService(updated.firebaseConfig)
    }

    setSavedSuccess(true)
    setTimeout(() => setSavedSuccess(false), 2500)
  }

  // Connect Bluetooth
  const handleConnectBluetooth = async () => {
    setBtLoading(true)
    try {
      await bluetoothPrinter.connect()
      setBtStatus(bluetoothPrinter.getStatus())
      alert('เชื่อมต่อเครื่องพิมพ์บลูทูธเรียบร้อยแล้ว!')
    } catch (err: any) {
      alert(`การเชื่อมต่อบลูทูธล้มเหลว: ${err.message || 'โปรดตรวจสอบสิทธิ์บลูทูธ'}`)
    } finally {
      setBtLoading(false)
    }
  }

  // Test Print
  const handleTestPrint = async () => {
    try {
      const dummyOrder = {
        id: 'test',
        orderNumber: 'Q-99',
        tableOrQueue: 'ทดสอบเครื่องพิมพ์',
        items: [
          { cartItemId: 't1', name: 'หม่าล่าเนื้อโคขุน (ไม้เขียว)', price: 20, quantity: 2 },
          { cartItemId: 't2', name: 'สามชั้นหมักพริกหม่าล่า (ไม้เหลือง)', price: 15, quantity: 3 }
        ],
        totalItemsCount: 5,
        subtotal: 85,
        discount: 0,
        grandTotal: 85,
        spicyLevel: 'numbing' as const,
        cookingMethod: 'grill' as const,
        diningType: 'takeaway' as const,
        notes: 'ทดสอบระบบ Bluetooth ESC/POS 58mm',
        paymentMethod: 'promptpay' as const,
        paymentStatus: 'paid' as const,
        status: 'completed' as const,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        syncStatus: 'synced' as const
      }
      await bluetoothPrinter.printOrder(dummyOrder, shopSettings)
    } catch (err: any) {
      alert(`ไม่สามารถทดสอบพิมพ์ได้: ${err.message}`)
    }
  }

  // Manual Sync
  const handleManualSync = async () => {
    setSyncLoading(true)
    try {
      const res = await syncPendingOrdersToFirebase()
      await refreshSyncCount()
      alert(`ผลการซิงก์: สำเร็จ ${res.success} รายการ, ล้มเหลว ${res.failed} รายการ`)
    } catch (err: any) {
      alert(`ซิงก์ไม่สำเร็จ: ${err.message}`)
    } finally {
      setSyncLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-3 sm:p-6 space-y-6 pb-16">
      {/* Title */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-red-600" />
            <span>ตั้งค่าระบบ (Settings & Config)</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            จัดการโปรไฟล์ร้าน, พร้อมเพย์, เครื่องพิมพ์บลูทูธ และ Firebase Realtime Database
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-md shadow-red-200 transition-all cursor-pointer"
        >
          {savedSuccess ? <Check className="w-4 h-4 text-emerald-200" /> : <Save className="w-4 h-4" />}
          <span>{savedSuccess ? 'บันทึกเรียบร้อย!' : 'บันทึกการตั้งค่า'}</span>
        </button>
      </div>

      {/* Grid of Setting Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Section 1: Shop Profile & PromptPay */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3.5">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Flame className="w-5 h-5 text-red-600" />
            <h2 className="font-black text-slate-900 text-base">ข้อมูลร้าน & พร้อมเพย์</h2>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อร้าน</label>
            <input
              type="text"
              value={formData.shopName}
              onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
              className="w-full h-10 px-3 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">สาขา</label>
            <input
              type="text"
              value={formData.branchName}
              onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
              className="w-full h-10 px-3 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              เบอร์พร้อมเพย์รับเงิน (สำหรับสร้าง QR Code อัตโนมัติ)
            </label>
            <input
              type="text"
              value={formData.promptpayPhone}
              onChange={(e) => setFormData({ ...formData, promptpayPhone: e.target.value })}
              placeholder="เช่น 0812345678 หรือเลขบัตรประชาชน/TaxID 13 หลัก"
              className="w-full h-10 px-3 text-xs font-bold text-red-600 bg-red-50/50 border border-red-200 rounded-xl focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">เบอร์โทรติดต่อหน้าร้าน</label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full h-10 px-3 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">ข้อความท้ายใบเสร็จ</label>
            <input
              type="text"
              value={formData.receiptFooter}
              onChange={(e) => setFormData({ ...formData, receiptFooter: e.target.value })}
              className="w-full h-10 px-3 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>

        {/* Section 2: Bluetooth Thermal Printer (58mm) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Bluetooth className="w-5 h-5 text-blue-600" />
              <h2 className="font-black text-slate-900 text-base">เครื่องพิมพ์บลูทูธ (58mm ESC/POS)</h2>
            </div>

            <div className="mt-3 p-3 rounded-xl bg-blue-50/70 border border-blue-200 space-y-1.5 text-xs text-blue-900">
              <div className="flex items-center justify-between font-bold">
                <span>สถานะเครื่องพิมพ์:</span>
                <span className={btStatus.isConnected ? 'text-emerald-700' : 'text-slate-500'}>
                  {btStatus.isConnected ? `เชื่อมต่อแล้ว (${btStatus.deviceName})` : 'ยังไม่ได้เชื่อมต่อ'}
                </span>
              </div>
              <p className="text-[11px] text-blue-800 leading-relaxed">
                รองรับเครื่องพิมพ์ใบเสร็จพกพา 58mm ทั่วไปผ่าน Web Bluetooth API (แนะนำเปิดบน Chrome บน Android หรือ PC)
              </p>
            </div>

            <div className="mt-4 space-y-2">
              <button
                onClick={handleConnectBluetooth}
                disabled={btLoading}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs disabled:opacity-60"
              >
                <Bluetooth className="w-4 h-4" />
                <span>{btLoading ? 'กำลังค้นหา...' : 'ค้นหาและจับคู่อุปกรณ์บลูทูธ'}</span>
              </button>

              <button
                onClick={handleTestPrint}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer border border-slate-200"
              >
                <Printer className="w-4 h-4" />
                <span>ทดสอบพิมพ์สลิปตัวอย่าง</span>
              </button>
            </div>
          </div>

          {/* Touch & Audio UX Preferences */}
          <div className="pt-3 border-t border-slate-100 space-y-2.5">
            <h3 className="font-bold text-xs text-slate-700">การตอบสนองหน้าจอ & เสียง</h3>
            
            <label className="flex items-center justify-between cursor-pointer text-xs font-semibold text-slate-800">
              <span className="flex items-center gap-1.5">
                <Vibrate className="w-4 h-4 text-slate-500" />
                <span>ระบบสั่นเมื่อแตะปุ่ม (Haptic 50ms)</span>
              </span>
              <input
                type="checkbox"
                checked={formData.hapticEnabled}
                onChange={(e) => setFormData({ ...formData, hapticEnabled: e.target.checked })}
                className="w-4 h-4 accent-red-600"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer text-xs font-semibold text-slate-800">
              <span className="flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-slate-500" />
                <span>เสียงเตือนและเสียงแตะ (Web Audio)</span>
              </span>
              <input
                type="checkbox"
                checked={formData.soundEnabled}
                onChange={(e) => setFormData({ ...formData, soundEnabled: e.target.checked })}
                className="w-4 h-4 accent-red-600"
              />
            </label>
          </div>
        </div>

        {/* Section 3: Firebase Realtime Database */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-amber-500" />
              <h2 className="font-black text-slate-900 text-base">Firebase Realtime Sync</h2>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              isFirebaseReady() ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
            }`}>
              {isFirebaseReady() ? 'พร้อมใช้งาน' : 'โหมด Dexie ในเครื่อง'}
            </span>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            เชื่อมต่อกับ Firebase Realtime Database เพื่อให้ออเดอร์จากหน้าแคชเชียร์อัปเดตไปยังจอครัว (KDS) แบบ Realtime ข้ามเครื่องพร้อมกัน
          </p>

          <div className="space-y-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Firebase API Key</label>
              <input
                type="text"
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                placeholder="AIzaSy..."
                className="w-full h-9 px-2.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Database URL (Realtime DB)</label>
              <input
                type="text"
                value={formData.databaseURL}
                onChange={(e) => setFormData({ ...formData, databaseURL: e.target.value })}
                placeholder="https://your-app-default-rtdb.firebaseio.com"
                className="w-full h-9 px-2.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Project ID</label>
              <input
                type="text"
                value={formData.projectId}
                onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                placeholder="pos-tun-mala"
                className="w-full h-9 px-2.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-red-500"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              ออเดอร์รอซิงก์: <strong className="text-amber-600">{pendingSyncCount}</strong> รายการ
            </span>
            <button
              onClick={handleManualSync}
              disabled={syncLoading || !isOnline}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1 transition-colors disabled:opacity-50"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>ซิงก์ขึ้น Firebase ทันที</span>
            </button>
          </div>
        </div>

        {/* Section 4: Netlify Deployment Guide & Status */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-2 border-b border-slate-700">
              <Globe className="w-5 h-5 text-teal-400" />
              <h2 className="font-black text-white text-base">การ Deploy ขึ้น Netlify</h2>
            </div>

            <div className="mt-3 space-y-2 text-xs text-slate-300 leading-relaxed">
              <p>
                โปรเจกต์นี้ได้รับการตั้งค่าไฟล์ <code className="bg-slate-800 px-1.5 py-0.5 rounded text-teal-300">netlify.toml</code> และ <code className="bg-slate-800 px-1.5 py-0.5 rounded text-teal-300">_redirects</code> สำหรับ SPA Routing และ PWA Service Worker เรียบร้อยแล้ว
              </p>
              
              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 space-y-1">
                <div className="font-bold text-white">วิธี Deploy ได้ 2 ช่องทาง:</div>
                <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px]">
                  <li><strong>Git Repository:</strong> Push โปรเจกต์ขึ้น GitHub/GitLab แล้วเชื่อมต่อกับ Netlify (Build: <code className="text-teal-300">npm run build</code>, Publish: <code className="text-teal-300">dist</code>)</li>
                  <li><strong>Netlify Drop:</strong> รันคำสั่ง <code className="text-teal-300">npm run build</code> แล้วลากโฟลเดอร์ <code className="text-teal-300">dist/</code> ไปวางที่ app.netlify.com/drop ได้ทันที!</li>
                </ol>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-700/80 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>พร้อมสำหรับการ Deploy</span>
            </span>
            <span className="text-[11px]">PWA & Offline Ready</span>
          </div>
        </div>
      </div>
    </div>
  )
}

import React, { useState, useMemo } from 'react'
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
  Smartphone, 
  UploadCloud, 
  CheckCircle2,
  MessageCircle,
  Copy,
  ExternalLink,
  Bell,
  Sparkles,
  AlertCircle,
  QrCode,
  UtensilsCrossed
} from 'lucide-react'
import { usePosStore } from '../store/usePosStore'
import { bluetoothPrinter } from '../lib/bluetoothPrinter'
import { isFirebaseReady, syncPendingOrdersToFirebase } from '../lib/firebase'
import { sendTestLineNotification } from '../lib/lineNotify'
import { TableQrManagerModal } from './TableQrManagerModal'

export const SettingsView: React.FC = () => {
  const { 
    shopSettings, 
    setShopSettings, 
    pendingSyncCount, 
    refreshSyncCount,
    isOnline,
    setCurrentView,
    openTableStatusModal
  } = usePosStore()

  // Local form state
  const [formData, setFormData] = useState({
    brandTitle: shopSettings.brandTitle || 'POS ตุ่น',
    shopTagline: shopSettings.shopTagline || 'หม่าล่าทอดกรอบ',
    shopName: shopSettings.shopName,
    branchName: shopSettings.branchName,
    promptpayPhone: shopSettings.promptpayPhone,
    phone: shopSettings.phone,
    address: shopSettings.address,
    receiptFooter: shopSettings.receiptFooter,
    soundEnabled: shopSettings.soundEnabled,
    hapticEnabled: shopSettings.hapticEnabled,
    autoPrintReceipt: shopSettings.autoPrintReceipt,
    tableOrderingEnabled: shopSettings.tableOrderingEnabled ?? true,
    tableCount: shopSettings.tableCount || 10
  })

  const [isTableQrModalOpen, setIsTableQrModalOpen] = useState(false)

  // LINE OA form state
  const [lineFormData, setLineFormData] = useState({
    enabled: shopSettings.lineOaSettings?.enabled ?? true,
    lineOaId: shopSettings.lineOaSettings?.lineOaId || '@tunfinver',
    lineOaUrl: shopSettings.lineOaSettings?.lineOaUrl || 'https://line.me/R/ti/p/@tunfinver',
    customOrderBaseUrl: shopSettings.lineOaSettings?.customOrderBaseUrl || '',
    webhookUrl: shopSettings.lineOaSettings?.webhookUrl || '',
    autoNotifyOnOrder: shopSettings.lineOaSettings?.autoNotifyOnOrder ?? true,
    notifySound: shopSettings.lineOaSettings?.notifySound ?? true,
    pickupIntervalMinutes: shopSettings.lineOaSettings?.pickupIntervalMinutes || 15,
    customWelcomeNote: shopSettings.lineOaSettings?.customWelcomeNote || 'ยินดีต้อนรับสู่ ร้านหม่าล่าทอด ตุ่นฟินเว่อร์! สั่งล่วงหน้าได้เลย รับของไม่ต้องรอคิว'
  })

  const [copiedLink, setCopiedLink] = useState(false)
  const [testingLine, setTestingLine] = useState(false)
  const [testLineResult, setTestLineResult] = useState<{ success: boolean; message: string } | null>(null)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [btStatus, setBtStatus] = useState<{ isConnected: boolean; deviceName: string }>(bluetoothPrinter.getStatus())
  const [btLoading, setBtLoading] = useState(false)
  const [syncLoading, setSyncLoading] = useState(false)

  // Force Reload and Clear PWA Cache
  const handleForceReload = async () => {
    if (confirm('ต้องการล้างแคชและโหลดเวอร์ชันล่าสุดใช่หรือไม่?')) {
      try {
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations()
          for (const reg of registrations) {
            await reg.unregister()
          }
        }
        if ('caches' in window) {
          const keys = await caches.keys()
          for (const key of keys) {
            await caches.delete(key)
          }
        }
      } catch (e) {
        console.error('Error clearing cache:', e)
      }
      window.location.reload()
    }
  }

  // Check if running on localhost / private network
  const isLocalhost = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || 
     window.location.hostname === '127.0.0.1' || 
     window.location.hostname.startsWith('192.168.') ||
     window.location.hostname.endsWith('.local'))

  // Computed Customer Order URL
  const customerOrderUrl = useMemo(() => {
    if (lineFormData.customOrderBaseUrl?.trim()) {
      return `${lineFormData.customOrderBaseUrl.trim().replace(/\/+$/, '')}/?mode=order`
    }
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    return `${origin}/?mode=order`
  }, [lineFormData.customOrderBaseUrl])

  // Copy Customer Order URL
  const handleCopyCustomerLink = () => {
    navigator.clipboard.writeText(customerOrderUrl)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2500)
  }

  // Test LINE notification
  const handleTestLine = async () => {
    if (!lineFormData.webhookUrl.trim()) {
      alert('กรุณากรอก Webhook URL สำหรับรับการแจ้งเตือน LINE ก่อนกดทดสอบครับ')
      return
    }
    setTestingLine(true)
    setTestLineResult(null)
    try {
      const res = await sendTestLineNotification(lineFormData, formData.shopName)
      setTestLineResult(res)
    } finally {
      setTestingLine(false)
    }
  }

  // Save Settings
  const handleSave = () => {
    const updated = {
      ...shopSettings,
      brandTitle: formData.brandTitle.trim(),
      shopTagline: formData.shopTagline.trim(),
      shopName: formData.shopName,
      branchName: formData.branchName,
      promptpayPhone: formData.promptpayPhone,
      phone: formData.phone,
      address: formData.address,
      receiptFooter: formData.receiptFooter,
      soundEnabled: formData.soundEnabled,
      hapticEnabled: formData.hapticEnabled,
      autoPrintReceipt: formData.autoPrintReceipt,
      tableOrderingEnabled: formData.tableOrderingEnabled,
      tableCount: formData.tableCount,
      tableList: Array.from({ length: formData.tableCount }, (_, i) => `โต๊ะ ${i + 1}`),
      lineOaSettings: {
        ...lineFormData,
        lineOaId: lineFormData.lineOaId.trim(),
        lineOaUrl: lineFormData.lineOaUrl.trim(),
        customOrderBaseUrl: lineFormData.customOrderBaseUrl?.trim() || '',
        webhookUrl: lineFormData.webhookUrl.trim(),
        customWelcomeNote: lineFormData.customWelcomeNote.trim()
      }
    }

    setShopSettings(updated)
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
          { cartItemId: 't1', name: 'หมูสามชั้นทอดหม่าล่า', price: 20, quantity: 2, spicyLevel: 'medium' as const },
          { cartItemId: 't2', name: 'เอ็นข้อไก่ทอดกรุบกรอบ', price: 20, quantity: 3, spicyLevel: 'numbing' as const }
        ],
        totalItemsCount: 5,
        subtotal: 100,
        discount: 0,
        grandTotal: 100,
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
        {/* Section: LINE OA & Takeaway Online Ordering */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4 md:col-span-2">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#06C755] text-white flex items-center justify-center font-black shadow-sm shadow-emerald-200">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-black text-slate-900 text-base">ระบบ LINE Official Account (LINE OA) & สั่งอาหารกลับบ้าน</h2>
                <p className="text-xs text-slate-500 font-medium">
                  ให้ลูกค้าสั่งอาหารกลับบ้านล่วงหน้าผ่าน LINE พร้อมแจ้งเตือนออเดอร์เข้าอัตโนมัติ
                </p>
              </div>
            </div>

            {/* Toggle System Enable */}
            <label className="flex items-center gap-2 cursor-pointer bg-slate-50 py-1.5 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-800">
              <span>เปิดใช้งานระบบสั่งผ่าน LINE:</span>
              <input
                type="checkbox"
                checked={lineFormData.enabled}
                onChange={(e) => setLineFormData({ ...lineFormData, enabled: e.target.checked })}
                className="w-4 h-4 accent-[#06C755]"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left: LINE OA Profile & Customer Link */}
            <div className="space-y-3">
              <h3 className="font-bold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <span>1. ข้อมูล LINE OA & ลิงก์หน้าร้าน</span>
              </h3>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    LINE OA ID
                  </label>
                  <input
                    type="text"
                    value={lineFormData.lineOaId}
                    onChange={(e) => setLineFormData({ ...lineFormData, lineOaId: e.target.value })}
                    placeholder="เช่น @tunfinver"
                    className="w-full h-10 px-3 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#06C755]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    เวลารอรับอาหารโดยเฉลี่ย
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={lineFormData.pickupIntervalMinutes}
                      onChange={(e) => setLineFormData({ ...lineFormData, pickupIntervalMinutes: Number(e.target.value) || 15 })}
                      className="w-full h-10 px-3 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#06C755]"
                    />
                    <span className="text-xs text-slate-500 font-bold whitespace-nowrap">นาที</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ลิงก์เพิ่มเพื่อน LINE OA URL
                </label>
                <input
                  type="text"
                  value={lineFormData.lineOaUrl}
                  onChange={(e) => setLineFormData({ ...lineFormData, lineOaUrl: e.target.value })}
                  placeholder="เช่น https://line.me/R/ti/p/@tunfinver"
                  className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#06C755]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ข้อความต้อนรับ / ประกาศถึงลูกค้า
                </label>
                <input
                  type="text"
                  value={lineFormData.customWelcomeNote}
                  onChange={(e) => setLineFormData({ ...lineFormData, customWelcomeNote: e.target.value })}
                  placeholder="เช่น ร้านเปิด 15:00 - 22:00 น. รออาหารประมาณ 15-20 นาทีนะคะ"
                  className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#06C755]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>โดเมนเว็บจริง (Netlify URL / โดเมนร้าน)</span>
                  <span className="text-[10px] text-slate-400 font-normal">ระบบจะดึงให้อัตโนมัติเมื่อเปิดบน Netlify</span>
                </label>
                <input
                  type="text"
                  value={lineFormData.customOrderBaseUrl || ''}
                  onChange={(e) => setLineFormData({ ...lineFormData, customOrderBaseUrl: e.target.value })}
                  placeholder="เช่น https://pos-tun.netlify.app"
                  className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#06C755]"
                />
              </div>

              {/* Customer Link Box */}
              <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <span className="text-xs font-black text-emerald-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>ลิงก์หน้าสั่งอาหารสำหรับลูกค้า (ใส่ใน LINE Rich Menu):</span>
                  </span>
                  {isLocalhost && !lineFormData.customOrderBaseUrl?.trim() && (
                    <span className="text-[10px] bg-amber-100 text-amber-900 font-extrabold px-2 py-0.5 rounded-full border border-amber-300">
                      กำลังรันบนเครื่อง Local
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    readOnly
                    value={customerOrderUrl}
                    className="flex-1 h-9 px-2.5 text-xs bg-white border border-emerald-300 rounded-lg text-emerald-950 font-mono select-all truncate font-bold"
                  />
                  <button
                    type="button"
                    onClick={handleCopyCustomerLink}
                    className="h-9 px-3 bg-[#06C755] hover:bg-[#05b34c] text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer flex-shrink-0"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'คัดลอกแล้ว!' : 'คัดลอกลิงก์'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentView('online-order')}
                    className="h-9 px-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer flex-shrink-0"
                    title="ทดสอบเปิดหน้าสั่งของลูกค้า"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>ทดสอบเปิด</span>
                  </button>
                </div>

                {isLocalhost && !lineFormData.customOrderBaseUrl?.trim() ? (
                  <div className="text-[11px] text-amber-950 leading-relaxed bg-amber-50 p-2.5 rounded-xl border border-amber-200 space-y-1">
                    <p className="font-bold flex items-center gap-1 text-amber-900">
                      <span>💡 ใช่ครับ ลิงก์สำหรับลูกค้าต้องเป็นลิงก์ Netlify (เว็บจริง):</span>
                    </p>
                    <p>
                      ตอนนี้กำลังทดสอบบนเครื่องในวง Local ระบบจึงแสดง <code>localhost</code> สำหรับลองกดทดสอบ เมื่อคุณอัปเดตขึ้น <strong>Netlify</strong> แล้วเปิดหน้าเว็บนี้ ลิงก์ตรงนี้จะกลายเป็น <strong>URL ของ Netlify</strong> ให้ลูกค้าภายนอกกดสั่งได้ทันที หรือคุณสามารถพิมพ์ URL Netlify ของคุณในช่อง <em>"โดเมนเว็บจริง"</em> ด้านบนได้เลยครับ
                    </p>
                  </div>
                ) : (
                  <p className="text-[11px] text-emerald-800">
                    💡 นำลิงก์นี้ไปใส่ใน <strong>LINE Official Account Rich Menu</strong> เมื่อลูกค้าแตะปุ่มในไลน์จะเข้าหน้าสั่งอาหารทันที
                  </p>
                )}
              </div>
            </div>

            {/* Right: LINE Order Notifications (Webhook) */}
            <div className="space-y-3">
              <h3 className="font-bold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-amber-500" />
                <span>2. การแจ้งเตือนออเดอร์เข้า LINE (Notifications)</span>
              </h3>

              <div className="space-y-2">
                <label className="flex items-center justify-between cursor-pointer text-xs font-semibold text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span>แจ้งเตือนเข้า LINE อัตโนมัติเมื่อลูกค้าสั่งออเดอร์</span>
                  <input
                    type="checkbox"
                    checked={lineFormData.autoNotifyOnOrder}
                    onChange={(e) => setLineFormData({ ...lineFormData, autoNotifyOnOrder: e.target.checked })}
                    className="w-4 h-4 accent-[#06C755]"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer text-xs font-semibold text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span>ส่งเสียงแจ้งเตือนที่จอแคชเชียร์และจอครัวเมื่อมีออเดอร์ใหม่</span>
                  <input
                    type="checkbox"
                    checked={lineFormData.notifySound}
                    onChange={(e) => setLineFormData({ ...lineFormData, notifySound: e.target.checked })}
                    className="w-4 h-4 accent-[#06C755]"
                  />
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Webhook URL สำหรับแจ้งเตือน (Make.com / Zapier / N8N / Cloudflare)
                </label>
                <input
                  type="url"
                  value={lineFormData.webhookUrl}
                  onChange={(e) => setLineFormData({ ...lineFormData, webhookUrl: e.target.value })}
                  placeholder="https://hook.eu1.make.com/... หรือ Webhook URL"
                  className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#06C755] font-mono text-slate-800"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  เมื่อมีออเดอร์สั่งกลับบ้านใหม่ ระบบจะส่งข้อมูลออเดอร์, ชื่อลูกค้า, และคิวเข้า Webhook URL นี้เพื่อส่งต่อไปยังกลุ่ม LINE หรือ LINE Notify ทันที
                </p>
              </div>

              {/* Test Button & Result */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleTestLine}
                  disabled={testingLine}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 border border-slate-300 transition-colors cursor-pointer disabled:opacity-60"
                >
                  <Bell className="w-4 h-4 text-amber-500" />
                  <span>{testingLine ? 'กำลังส่งข้อความทดสอบ...' : 'ทดสอบส่งการแจ้งเตือนเข้า LINE'}</span>
                </button>

                {testLineResult && (
                  <div className={`mt-2 p-2.5 rounded-xl text-xs font-medium flex items-center gap-1.5 ${
                    testLineResult.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}>
                    {testLineResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />}
                    <span>{testLineResult.message}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section: Table QR Ordering (Dine-In) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4 md:col-span-2">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-sm shadow-indigo-200">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-black text-slate-900 text-base">ระบบสั่งอาหารที่โต๊ะผ่าน QR Code (Dine-In Table QR)</h2>
                <p className="text-xs text-slate-500 font-medium">
                  พิมพ์ QR Code วางประจำโต๊ะ เพื่อให้ลูกค้านั่งสแกนสั่งอาหารส่งตรงเข้าครัวได้ทันที
                </p>
              </div>
            </div>

            {/* Toggle Table Ordering */}
            <label className="flex items-center gap-2 cursor-pointer bg-slate-50 py-1.5 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-800">
              <span>เปิดใช้งานสั่งอาหารที่โต๊ะ:</span>
              <input
                type="checkbox"
                checked={formData.tableOrderingEnabled}
                onChange={(e) => setFormData({ ...formData, tableOrderingEnabled: e.target.checked })}
                className="w-4 h-4 accent-indigo-600 cursor-pointer"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            {/* Table Count Selector */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">
                จำนวนโต๊ะทั้งหมดในร้าน:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={formData.tableCount}
                  onChange={(e) => setFormData({ ...formData, tableCount: Math.max(1, Math.min(30, Number(e.target.value) || 1)) })}
                  className="w-24 h-10 px-3 text-sm font-black text-center bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-xs font-bold text-slate-500">โต๊ะ</span>
              </div>
            </div>

            {/* Action to open Table QR modal and Table Status modal */}
            <div className="md:col-span-2 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={openTableStatusModal}
                className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-[0.99] text-white font-extrabold text-xs flex items-center gap-2 shadow-md shadow-amber-200 transition-all cursor-pointer"
              >
                <UtensilsCrossed className="w-4 h-4" />
                <span>🍽️ เปิดผังโต๊ะ & เช็คบิล</span>
              </button>

              <button
                type="button"
                onClick={() => setIsTableQrModalOpen(true)}
                className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-extrabold text-xs flex items-center gap-2 shadow-md shadow-indigo-200 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>🖨️ พิมพ์การ์ด & ดู QR ทุกโต๊ะ ({formData.tableCount} โต๊ะ)</span>
              </button>
            </div>
          </div>

          {/* Quick Table Preview Chips */}
          <div className="p-3.5 bg-indigo-50/70 rounded-2xl border border-indigo-100 space-y-2">
            <span className="text-xs font-bold text-indigo-950 block">
              ตัวอย่างลิงก์สั่งอาหารประจำโต๊ะ (คลิกเพื่อทดสอบเปิดสั่ง):
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              {Array.from({ length: Math.min(10, formData.tableCount) }, (_, i) => i + 1).map(num => {
                const tableUrl = `${customerOrderUrl.split('?')[0]}?table=${num}`
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => window.open(tableUrl, '_blank')}
                    className="px-3 py-1.5 bg-white hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                    title={`ทดสอบเปิดหน้าสั่งของ โต๊ะ ${num}`}
                  >
                    <UtensilsCrossed className="w-3.5 h-3.5 text-indigo-600" />
                    <span>โต๊ะ {num}</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </button>
                )
              })}
              {formData.tableCount > 10 && (
                <button
                  type="button"
                  onClick={() => setIsTableQrModalOpen(true)}
                  className="px-2.5 py-1 text-xs text-indigo-600 font-extrabold hover:underline cursor-pointer"
                >
                  +{formData.tableCount - 10} โต๊ะ...
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Section 1: Shop Profile & PromptPay */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3.5">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Flame className="w-5 h-5 text-red-600" />
            <h2 className="font-black text-slate-900 text-base">ข้อมูลร้าน & พร้อมเพย์</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ชื่อแบรนด์บนหัวจอ (Header Title)
              </label>
              <input
                type="text"
                value={formData.brandTitle}
                onChange={(e) => setFormData({ ...formData, brandTitle: e.target.value })}
                placeholder="เช่น POS ตุ่น, หม่าล่าตุ่นฟินเว่อร์"
                className="w-full h-10 px-3 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ป้ายกำกับด้านบน (Tagline)
              </label>
              <input
                type="text"
                value={formData.shopTagline}
                onChange={(e) => setFormData({ ...formData, shopTagline: e.target.value })}
                placeholder="เช่น หม่าล่าทอดกรอบ"
                className="w-full h-10 px-3 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500"
              />
            </div>
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

        {/* Section 3: Cloud Realtime Sync Status */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-amber-500" />
                <h2 className="font-black text-slate-900 text-base">ระบบซิงก์ข้อมูลคลาวด์</h2>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                isFirebaseReady() ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                <span className={`w-2 h-2 rounded-full ${isFirebaseReady() ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                {isFirebaseReady() ? 'เชื่อมต่อคลาวด์สำเร็จ' : 'โหมดบันทึกในเครื่อง (Offline)'}
              </span>
            </div>

            <p className="mt-3 text-xs text-slate-500 leading-relaxed">
              ระบบเชื่อมต่อฐานข้อมูลคลาวด์อัตโนมัติ เพื่อส่งรายการออเดอร์จากหน้าแคชเชียร์ไปยังจอครัว (Kitchen View) และเครื่องอื่น ๆ แบบเรียลไทม์ทันที
            </p>

            <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">สถานะอินเทอร์เน็ต:</span>
                <span className={`font-bold ${isOnline ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {isOnline ? '🟢 ออนไลน์ (Online)' : '🔴 ออฟไลน์ (Offline)'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">รายการค้างส่งขึ้นคลาวด์:</span>
                <span className="font-bold text-slate-800">
                  {pendingSyncCount > 0 ? (
                    <span className="text-amber-600 font-black">{pendingSyncCount} รายการ</span>
                  ) : (
                    <span className="text-emerald-600">ข้อมูลเป็นปัจจุบัน (0 รายการ)</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400 text-[11px]">
              ซิงก์อัตโนมัติเมื่อมีการสั่งอาหาร
            </span>
            <button
              onClick={handleManualSync}
              disabled={syncLoading || !isOnline}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{syncLoading ? 'กำลังซิงก์...' : 'กดซิงก์ข้อมูลทันที'}</span>
            </button>
          </div>
        </div>

        {/* Section 4: PWA Installation & Device Guide */}
        <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <Smartphone className="w-5 h-5 text-red-400" />
              <h2 className="font-black text-white text-base">วิธีติดตั้งแอปบน iPad / มือถือ</h2>
            </div>

            <div className="mt-3 space-y-2.5 text-xs text-slate-300 leading-relaxed">
              <p className="text-slate-400">
                ติดตั้งเป็น Web App (PWA) ลงหน้าจอโฮมเพื่อเปิดใช้งานได้เต็มจอ เสมือนแอปแท้ และเปิดใช้งานได้แม้ออฟไลน์
              </p>
              
              <div className="p-3 bg-slate-800/90 rounded-xl border border-slate-700/80 space-y-2.5">
                <div>
                  <div className="font-bold text-amber-300 flex items-center gap-1">
                    📱 สำหรับ iPad / iPhone (Safari):
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    แตะปุ่มแชร์ (Share Icon) ด้านบน แล้วเลือก <strong>"เพิ่มไปยังหน้าจอโฮม (Add to Home Screen)"</strong>
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-700">
                  <div className="font-bold text-sky-300 flex items-center gap-1">
                    🤖 สำหรับ Android / แท็บเล็ต (Chrome):
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    แตะจุดสามจุด (⋮) มุมขวาบน แล้วเลือก <strong>"ติดตั้งแอป (Install App)"</strong> หรือ "เพิ่มลงในหน้าจอหลัก"
                  </p>
                </div>

                <div className="pt-2.5 border-t border-slate-700/80 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">พบหน้าจอไม่อัปเดต?</span>
                  <button
                    type="button"
                    onClick={handleForceReload}
                    className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold transition-all cursor-pointer shadow-xs"
                  >
                    ล้างแคช & รีโหลดเวอร์ชันใหม่
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>โหมดออฟไลน์ (Offline-First) ทำงานอัตโนมัติ</span>
            </span>
            <span className="text-[11px] text-slate-500">v1.0.0</span>
          </div>
        </div>
      </div>

      {/* Table QR Generator & Print Modal */}
      <TableQrManagerModal
        isOpen={isTableQrModalOpen}
        onClose={() => setIsTableQrModalOpen(false)}
      />
    </div>
  )
}

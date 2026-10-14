import React, { useState, useEffect, useMemo } from 'react'
import { 
  X, 
  Printer, 
  Download, 
  Copy, 
  ExternalLink, 
  QrCode, 
  Sparkles, 
  Check, 
  UtensilsCrossed 
} from 'lucide-react'
import QRCode from 'qrcode'
import { usePosStore } from '../store/usePosStore'

interface TableQrData {
  tableNumber: string
  url: string
  qrDataUrl: string
}

interface TableQrManagerModalProps {
  isOpen: boolean
  onClose: () => void
}

export const TableQrManagerModal: React.FC<TableQrManagerModalProps> = ({ isOpen, onClose }) => {
  const { shopSettings } = usePosStore()
  const [tableCount, setTableCount] = useState<number>(shopSettings.tableCount || 10)
  const [tableDataList, setTableDataList] = useState<TableQrData[]>([])
  const [copiedTable, setCopiedTable] = useState<string | null>(null)
  const [filterTable, setFilterTable] = useState<string>('all')
  const [isGenerating, setIsGenerating] = useState(false)

  // Base URL for customer orders
  const baseUrl = useMemo(() => {
    if (shopSettings.lineOaSettings?.customOrderBaseUrl?.trim()) {
      return shopSettings.lineOaSettings.customOrderBaseUrl.trim().replace(/\/+$/, '')
    }
    return typeof window !== 'undefined' ? window.location.origin : ''
  }, [shopSettings.lineOaSettings?.customOrderBaseUrl])

  // Generate QR codes for all tables
  useEffect(() => {
    if (!isOpen) return

    let isMounted = true
    setIsGenerating(true)

    const generateQrs = async () => {
      const results: TableQrData[] = []
      const count = Math.max(1, Math.min(30, tableCount))

      for (let i = 1; i <= count; i++) {
        const tableNumber = `โต๊ะ ${i}`
        const url = `${baseUrl}/?table=${i}`
        try {
          const qrDataUrl = await QRCode.toDataURL(url, {
            width: 320,
            margin: 2,
            color: {
              dark: '#0f172a',
              light: '#ffffff'
            },
            errorCorrectionLevel: 'H'
          })
          results.push({ tableNumber, url, qrDataUrl })
        } catch (err) {
          console.error(`Failed to generate QR for ${tableNumber}:`, err)
        }
      }

      if (isMounted) {
        setTableDataList(results)
        setIsGenerating(false)
      }
    }

    generateQrs()

    return () => {
      isMounted = false
    }
  }, [isOpen, tableCount, baseUrl])

  if (!isOpen) return null

  // Copy URL to clipboard
  const handleCopy = (table: TableQrData) => {
    navigator.clipboard.writeText(table.url)
    setCopiedTable(table.tableNumber)
    setTimeout(() => setCopiedTable(null), 2000)
  }

  // Download QR image
  const handleDownload = (table: TableQrData) => {
    const link = document.createElement('a')
    link.href = table.qrDataUrl
    link.download = `QR_${shopSettings.shopName}_${table.tableNumber}.png`
    link.click()
  }

  // Test open in new tab or customer view
  const handleTestOpen = (tableIndex: number) => {
    const url = `${baseUrl}/?table=${tableIndex}`
    window.open(url, '_blank')
  }

  // Print all or selected table cards
  const handlePrint = () => {
    window.print()
  }

  const filteredList = filterTable === 'all' 
    ? tableDataList 
    : tableDataList.filter(t => t.tableNumber === filterTable)

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fade-in">
      <div 
        className="fixed inset-0" 
        onClick={onClose} 
      />

      <div className="relative z-10 bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="no-print p-4 sm:p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">
                พิมพ์การ์ด & จัดการ QR Code ประจำโต๊ะ
              </h2>
              <p className="text-xs text-slate-300">
                ให้ลูกค้านั่งที่โต๊ะแล้วสแกนสั่งอาหารผ่านโทรศัพท์มือถือเข้าครัวทันที
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์การ์ดตั้งโต๊ะ</span>
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar: Set Table Count & Filter */}
        <div className="no-print p-3 sm:px-5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">จำนวนโต๊ะในร้าน:</span>
            <div className="flex items-center gap-1">
              {[5, 10, 15, 20].map(cnt => (
                <button
                  key={cnt}
                  type="button"
                  onClick={() => setTableCount(cnt)}
                  className={`px-2.5 py-1 rounded-lg font-extrabold transition-all cursor-pointer ${
                    tableCount === cnt 
                      ? 'bg-slate-900 text-white shadow-xs' 
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {cnt} โต๊ะ
                </button>
              ))}
              <input
                type="number"
                min={1}
                max={30}
                value={tableCount}
                onChange={(e) => setTableCount(Math.max(1, Math.min(30, Number(e.target.value) || 1)))}
                className="w-14 h-7 text-center font-bold bg-white border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500">เลือกดูเฉพาะโต๊ะ:</span>
            <select
              value={filterTable}
              onChange={(e) => setFilterTable(e.target.value)}
              className="h-8 px-2.5 rounded-lg bg-white border border-slate-300 font-bold text-slate-800"
            >
              <option value="all">แสดงทุกโต๊ะ ({tableDataList.length} โต๊ะ)</option>
              {tableDataList.map(t => (
                <option key={t.tableNumber} value={t.tableNumber}>{t.tableNumber}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Instruction Banner */}
        <div className="no-print px-5 py-2.5 bg-indigo-50/70 border-b border-indigo-100 text-xs text-indigo-950 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600 flex-shrink-0" />
            <span>
              💡 <strong>คำแนะนำ:</strong> กดปุ่ม <em>"พิมพ์การ์ดตั้งโต๊ะ"</em> เพื่อสั่งพิมพ์การ์ดขนาดมาตรฐานสำหรับวางบนแท่นอะคริลิกประจำแต่ละโต๊ะได้ทันที
            </span>
          </div>
        </div>

        {/* Scrollable Cards Grid (Screen & Print Friendly) */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-100/60 print:p-0 print:bg-white print:overflow-visible">
          {isGenerating ? (
            <div className="py-20 text-center text-slate-400">
              <QrCode className="w-12 h-12 mx-auto animate-pulse text-indigo-500 mb-2" />
              <p className="font-bold text-sm">กำลังสร้าง QR Code ประจำโต๊ะ...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 print:grid-cols-2 print:gap-6 print:m-0">
              {filteredList.map((table, idx) => {
                const tableIndex = idx + 1
                return (
                  <div
                    key={table.tableNumber}
                    className="bg-white rounded-3xl p-5 border-2 border-slate-200 shadow-md flex flex-col items-center text-center justify-between print:border-2 print:border-slate-800 print:shadow-none print:break-inside-avoid print:rounded-2xl"
                  >
                    {/* Printable Card Header */}
                    <div className="space-y-1 w-full pb-3 border-b border-dashed border-slate-200 print:border-slate-400">
                      <div className="flex items-center justify-center gap-1.5 text-red-600 font-extrabold text-xs">
                        <UtensilsCrossed className="w-3.5 h-3.5" />
                        <span>{shopSettings.shopTagline || 'หม่าล่าทอดกรอบ'}</span>
                      </div>
                      <h3 className="text-base font-black text-slate-900 leading-tight">
                        {shopSettings.shopName}
                      </h3>
                    </div>

                    {/* Table Number Badge */}
                    <div className="my-3">
                      <div className="inline-block bg-slate-900 text-white px-5 py-1.5 rounded-2xl text-lg font-black shadow-xs tracking-tight print:bg-black">
                        {table.tableNumber}
                      </div>
                      <p className="text-[11px] font-bold text-indigo-600 mt-1 uppercase tracking-wider">
                        สแกนเพื่อสั่งอาหาร (Scan to Order)
                      </p>
                    </div>

                    {/* QR Code Image */}
                    <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-inner inline-block my-1">
                      <img
                        src={table.qrDataUrl}
                        alt={`QR Code ${table.tableNumber}`}
                        className="w-44 h-44 object-contain mx-auto"
                      />
                    </div>

                    {/* Instruction steps */}
                    <div className="w-full text-left bg-slate-50 p-2.5 rounded-xl border border-slate-100 my-2 text-[10px] text-slate-600 space-y-0.5 print:bg-white print:border-slate-300">
                      <div className="font-bold text-slate-800">ขั้นตอนการสั่งอาหาร:</div>
                      <div>1. สแกน QR ด้วยกล้องโทรศัพท์ หรือ LINE</div>
                      <div>2. เลือกเมนูและระดับความเผ็ดชาที่ชอบ</div>
                      <div>3. ออเดอร์จะส่งตรงเข้าครัวทันที รอเสิร์ฟที่โต๊ะได้เลย</div>
                    </div>

                    {/* Screen Only Action Buttons */}
                    <div className="no-print w-full pt-2 flex items-center justify-between gap-1 border-t border-slate-100 text-xs">
                      <button
                        type="button"
                        onClick={() => handleCopy(table)}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        title="คัดลอกลิงก์สั่งของโต๊ะนี้"
                      >
                        {copiedTable === table.tableNumber ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedTable === table.tableNumber ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownload(table)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                        title="ดาวน์โหลดไฟล์รูป QR Code"
                      >
                        <Download className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleTestOpen(tableIndex)}
                        className="py-1.5 px-2.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        title="ทดสอบเปิดหน้าสั่งโต๊ะนี้ในแท็บใหม่"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>ทดสอบ</span>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

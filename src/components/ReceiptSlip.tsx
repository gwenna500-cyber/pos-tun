import React, { useState } from 'react'
import { 
  Printer, 
  Bluetooth, 
  X, 
  FileCheck
} from 'lucide-react'
import { usePosStore } from '../store/usePosStore'
import { bluetoothPrinter, triggerBrowserPrint } from '../lib/bluetoothPrinter'
import { SPICY_LEVELS } from '../lib/constants'

export const ReceiptSlip: React.FC = () => {
  const { 
    isReceiptModalOpen, 
    activeReceiptOrder, 
    closeReceiptModal, 
    shopSettings 
  } = usePosStore()

  const [btStatus, setBtStatus] = useState<string>('')
  const [isPrintingBt, setIsPrintingBt] = useState(false)

  if (!isReceiptModalOpen || !activeReceiptOrder) return null

  const order = activeReceiptOrder
  const formattedDate = new Date(order.createdAt).toLocaleString('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'medium'
  })

  // Handle Bluetooth print
  const handleBluetoothPrint = async () => {
    setIsPrintingBt(true)
    setBtStatus('กำลังเชื่อมต่อเครื่องพิมพ์...')
    try {
      const status = bluetoothPrinter.getStatus()
      if (!status.isConnected) {
        await bluetoothPrinter.connect()
      }
      setBtStatus('กำลังส่งคำสั่งพิมพ์...')
      await bluetoothPrinter.printOrder(order, shopSettings)
      setBtStatus('พิมพ์ผ่านบลูทูธสำเร็จ!')
      setTimeout(() => setBtStatus(''), 3000)
    } catch (err: any) {
      console.error('Bluetooth print error:', err)
      setBtStatus(`ผิดพลาด: ${err.message || 'ไม่สามารถพิมพ์ได้'}`)
    } finally {
      setIsPrintingBt(false)
    }
  }

  // Handle iPad / iOS AirPrint / Browser Print
  const handleBrowserPrint = () => {
    triggerBrowserPrint()
  }

  return (
    <>
      {/* Visual Screen Modal */}
      <div className="no-print fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in">
        <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh]">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-sm">
              <FileCheck className="w-5 h-5 text-emerald-600" />
              <span>บันทึกการขายสำเร็จ</span>
            </div>
            <button
              onClick={closeReceiptModal}
              className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300 flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Slip Preview Area (Scrollable) */}
          <div className="p-4 overflow-y-auto bg-slate-100/70 flex justify-center">
            <div className="bg-white p-4 rounded-xl shadow-md border border-slate-200 text-slate-800 w-full max-w-[280px] font-mono text-xs">
              {/* Slip Header */}
              <div className="text-center pb-3 border-b border-dashed border-slate-300 space-y-0.5">
                <h4 className="font-extrabold text-sm text-slate-900">
                  {shopSettings.shopName}
                </h4>
                <p className="text-[10px] text-slate-500">{shopSettings.branchName}</p>
                {shopSettings.phone && <p className="text-[10px] text-slate-500">โทร: {shopSettings.phone}</p>}
              </div>

              {/* Big Queue Number */}
              <div className="text-center py-2 border-b border-dashed border-slate-300 bg-red-50/50 my-2 rounded-lg">
                <span className="text-[11px] text-red-600 font-bold">หมายเลขคิว</span>
                <div className="text-2xl font-black text-red-600 leading-none my-0.5">
                  {order.orderNumber}
                </div>
                <span className="text-[10px] text-slate-600">
                  [{order.tableOrQueue}] · {order.diningType === 'takeaway' ? 'กลับบ้าน' : 'ทานที่ร้าน'}
                </span>
              </div>

              {/* Order Info */}
              <div className="text-[10px] text-slate-500 space-y-0.5 pb-2 border-b border-dashed border-slate-300">
                <div>เวลา: {formattedDate}</div>
                {order.notes && <div>โน้ต: <strong>{order.notes}</strong></div>}
              </div>

              {/* Itemized list */}
              <div className="py-2 border-b border-dashed border-slate-300 space-y-1.5">
                {order.items.map((item, idx) => {
                  const spicy = item.spicyLevel ? SPICY_LEVELS.find(s => s.id === item.spicyLevel) : null
                  return (
                    <div key={idx} className="flex justify-between items-start text-[11px]">
                      <div className="flex-1 pr-1 truncate">
                        <span>{item.name}</span>
                        {spicy && <span className="text-red-600 font-bold ml-1">[{spicy.label.split(' ')[0]}]</span>}
                        {item.note && <span className="text-slate-400 block text-[9px]">({item.note})</span>}
                        <span className="text-slate-500 ml-1">×{item.quantity}</span>
                      </div>
                      <span className="font-bold">{item.price * item.quantity}.-</span>
                    </div>
                  )
                })}
              </div>

              {/* Totals */}
              <div className="py-2 border-b border-dashed border-slate-300 space-y-1 text-right">
                <div className="text-[10px] text-slate-500">
                  รวม {order.totalItemsCount} รายการ: {order.subtotal} ฿
                </div>
                {order.discount > 0 && (
                  <div className="text-[10px] text-emerald-600 font-bold">
                    ส่วนลด: -{order.discount} ฿
                  </div>
                )}
                <div className="text-sm font-black text-slate-900 pt-0.5">
                  ยอดสุทธิ: {order.grandTotal} บาท
                </div>
                <div className="text-[10px] text-slate-500 text-center pt-1">
                  ชำระโดย: {order.paymentMethod === 'promptpay' ? 'พร้อมเพย์ QR' : order.paymentMethod === 'cash' ? 'เงินสด' : 'โอนเงิน'}
                  {order.paymentMethod === 'cash' && order.cashReceived && (
                    <span> (รับมา {order.cashReceived} ทอน {order.changeDue || 0})</span>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="text-center pt-2 text-[9px] text-slate-400">
                <p>{shopSettings.receiptFooter}</p>
                <p className="mt-0.5">*** ขอบคุณที่อุดหนุน ***</p>
              </div>
            </div>
          </div>

          {/* Status Message */}
          {btStatus && (
            <div className="px-4 py-2 bg-slate-50 text-center text-xs font-semibold text-slate-700 border-t border-slate-100">
              {btStatus}
            </div>
          )}

          {/* Action Buttons */}
          <div className="p-3 bg-white border-t border-slate-100 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {/* Browser Print / AirPrint (iPad/iOS) */}
              <button
                onClick={handleBrowserPrint}
                className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>พิมพ์ใบเสร็จ (iOS/ทั่วไป)</span>
              </button>

              {/* Bluetooth Thermal 58mm (Chrome/Android) */}
              <button
                onClick={handleBluetoothPrint}
                disabled={isPrintingBt}
                className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs disabled:opacity-60"
              >
                <Bluetooth className="w-4 h-4" />
                <span>พิมพ์บลูทูธ 58mm</span>
              </button>
            </div>

            <button
              onClick={closeReceiptModal}
              className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm transition-colors shadow-xs"
            >
              รับออเดอร์ถัดไป
            </button>
          </div>
        </div>
      </div>

      {/* Print Slip Only (for window.print() and AirPrint styling) */}
      <div className="print-only">
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <h2 style={{ fontSize: '14px', margin: '0 0 2px 0', fontWeight: 'bold' }}>{shopSettings.shopName}</h2>
          <div style={{ fontSize: '11px' }}>{shopSettings.branchName}</div>
          {shopSettings.phone && <div style={{ fontSize: '10px' }}>โทร: {shopSettings.phone}</div>}
          <div style={{ borderBottom: '1px dashed #000', margin: '6px 0' }} />
          
          <div style={{ fontSize: '18px', fontWeight: 'bold', margin: '4px 0' }}>
            {order.orderNumber}
          </div>
          <div style={{ fontSize: '11px' }}>
            [{order.tableOrQueue}] - {order.diningType === 'takeaway' ? 'กลับบ้าน' : 'ทานที่ร้าน'}
          </div>
          <div style={{ borderBottom: '1px dashed #000', margin: '6px 0' }} />
        </div>

        <div style={{ fontSize: '10px', marginBottom: '6px' }}>
          <div>เวลา: {formattedDate}</div>
          {order.notes && <div>หมายเหตุ: {order.notes}</div>}
        </div>

        <div style={{ borderBottom: '1px dashed #000', margin: '6px 0' }} />

        {/* Items */}
        <div style={{ fontSize: '11px' }}>
          {order.items.map((item, idx) => {
            const spicy = item.spicyLevel ? SPICY_LEVELS.find(s => s.id === item.spicyLevel) : null
            return (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <span>
                  {item.name} {spicy ? `[${spicy.label.split(' ')[0]}]` : ''} x{item.quantity}
                </span>
                <span>{item.price * item.quantity}.-</span>
              </div>
            )
          })}
        </div>

        <div style={{ borderBottom: '1px dashed #000', margin: '6px 0' }} />

        <div style={{ textAlign: 'right', fontSize: '11px' }}>
          <div>รวม {order.totalItemsCount} รายการ: {order.subtotal} ฿</div>
          {order.discount > 0 && <div>ส่วนลด: -{order.discount} ฿</div>}
          <div style={{ fontSize: '14px', fontWeight: 'bold', marginTop: '3px' }}>
            ยอดสุทธิ: {order.grandTotal} บาท
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '9px' }}>
          <div>{shopSettings.receiptFooter}</div>
          <div style={{ marginTop: '4px' }}>*** ขอบคุณที่อุดหนุน ***</div>
        </div>
      </div>
    </>
  )
}

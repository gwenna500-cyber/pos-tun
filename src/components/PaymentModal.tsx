import React, { useState, useEffect } from 'react'
import { 
  X, 
  QrCode, 
  Banknote, 
  CheckCircle2, 
  Copy, 
  Check, 
  Tag,
  Sparkles,
  Flame
} from 'lucide-react'
import { usePosStore } from '../store/usePosStore'
import { generatePromptPayQrDataUrl } from '../lib/promptpay'
import type { PaymentMethod } from '../types'

export const PaymentModal: React.FC = () => {
  const { 
    isPaymentModalOpen, 
    closePaymentModal, 
    cart, 
    discount, 
    setDiscount, 
    shopSettings, 
    finalizeCheckout,
    orderAddons,
    toggleOrderAddon,
    orderAddonOptions,
    spicyLevel,
    setSpicyLevel,
    spicyOptions
  } = usePosStore()

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('promptpay')
  const [cashReceived, setCashReceived] = useState<string>('')
  const [promptPayQrUrl, setPromptPayQrUrl] = useState<string>('')
  const [copiedPhone, setCopiedPhone] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const grandTotal = Math.max(0, subtotal - (discount || 0))
  const cashNum = parseFloat(cashReceived) || 0
  const changeDue = Math.max(0, cashNum - grandTotal)
  const isCashSufficient = cashNum >= grandTotal

  // Generate PromptPay QR whenever modal opens or total changes
  useEffect(() => {
    if (isPaymentModalOpen && grandTotal > 0) {
      const phone = shopSettings.promptpayPhone || '0812345678'
      generatePromptPayQrDataUrl(phone, grandTotal).then(setPromptPayQrUrl)
    }
  }, [isPaymentModalOpen, grandTotal, shopSettings.promptpayPhone])

  if (!isPaymentModalOpen) return null

  const handleQuickCash = (amount: number) => {
    setCashReceived(String(amount))
  }

  const handleExactCash = () => {
    setCashReceived(String(grandTotal))
  }

  const handleConfirmPayment = async () => {
    if (isSubmitting) return

    if (paymentMethod === 'cash' && !isCashSufficient) {
      alert('จำนวนเงินสดที่รับมาไม่เพียงพอกับยอดที่ต้องชำระ')
      return
    }

    setIsSubmitting(true)
    try {
      await finalizeCheckout(paymentMethod, paymentMethod === 'cash' ? cashNum : undefined)
    } finally {
      setIsSubmitting(false)
    }
  }

  const copyPromptPayToClipboard = () => {
    if (shopSettings.promptpayPhone) {
      navigator.clipboard.writeText(shopSettings.promptpayPhone)
      setCopiedPhone(true)
      setTimeout(() => setCopiedPhone(false), 2000)
    }
  }

  return (
    <div className="no-print fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4 animate-fade-in">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[95vh]">
        {/* Mobile drag handle */}
        <div className="sm:hidden pt-2.5 pb-1 flex justify-center bg-slate-50">
          <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
        </div>
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div>
            <h3 className="font-black text-slate-900 text-lg sm:text-xl">
              ชำระเงินค่าอาหาร
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              เลือกวิธีการชำระเงินและตรวจสอบยอดสุทธิ
            </p>
          </div>
          <button
            onClick={closePaymentModal}
            className="w-9 h-9 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Grand Total Hero Banner */}
          <div className="bg-gradient-to-br from-red-600 to-red-700 text-white rounded-2xl p-4 text-center shadow-md">
            <span className="text-xs font-bold uppercase tracking-wider text-red-100">
              ยอดที่ต้องชำระสุทธิ
            </span>
            <div className="text-4xl sm:text-5xl font-black mt-0.5 tracking-tight">
              {grandTotal} <span className="text-2xl font-bold">บาท</span>
            </div>
            <div className="mt-1 text-xs text-red-100 flex items-center justify-center gap-2">
              <span>{cart.reduce((s, i) => s + i.quantity, 0)} รายการ</span>
              {discount > 0 && <span>· ส่วนลด {discount} ฿</span>}
            </div>
          </div>

          {/* Payment Method Switcher Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setPaymentMethod('promptpay')}
              className={`py-2.5 px-3 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                paymentMethod === 'promptpay'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <QrCode className="w-4 h-4 text-blue-600" />
              <span>สแกนพร้อมเพย์ QR</span>
            </button>
            <button
              onClick={() => setPaymentMethod('cash')}
              className={`py-2.5 px-3 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                paymentMethod === 'cash'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Banknote className="w-4 h-4 text-emerald-600" />
              <span>เงินสด (คำนวณเงินทอน)</span>
            </button>
          </div>

          {/* Tab 1: PromptPay QR */}
          {paymentMethod === 'promptpay' && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center space-y-3">
              <div className="inline-block bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                {promptPayQrUrl ? (
                  <img
                    src={promptPayQrUrl}
                    alt="PromptPay QR Code"
                    className="w-48 h-48 sm:w-56 sm:h-56 mx-auto object-contain"
                  />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-slate-400 text-xs">
                    กำลังสร้าง QR Code...
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-slate-600">
                <span>พร้อมเพย์เบอร์:</span>
                <span className="font-bold text-slate-900">{shopSettings.promptpayPhone || '0812345678'}</span>
                <button
                  onClick={copyPromptPayToClipboard}
                  className="p-1 hover:bg-slate-200 rounded-md text-slate-500 hover:text-slate-800"
                  title="คัดลอกเบอร์"
                >
                  {copiedPhone ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <p className="text-[11px] text-slate-500">
                สแกนได้จากทุกแอปธนาคาร ยอดเงิน {grandTotal} บาท จะขึ้นให้อัตโนมัติทันที
              </p>
            </div>
          )}

          {/* Tab 2: Cash Payment */}
          {paymentMethod === 'cash' && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  รับเงินสดมา (บาท)
                </label>
                <input
                  type="number"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  placeholder={`ขั้นต่ำ ${grandTotal}`}
                  className="w-full h-12 px-3 text-2xl font-black text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  autoFocus
                />
              </div>

              {/* Quick Banknote Buttons */}
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-500">ปุ่มลัดธนบัตร:</span>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
                  <button
                    onClick={handleExactCash}
                    className="py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-extrabold text-xs rounded-lg transition-colors border border-emerald-300"
                  >
                    พอดี
                  </button>
                  {[50, 100, 500, 1000].map((note) => (
                    <button
                      key={note}
                      onClick={() => handleQuickCash(note)}
                      className="py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-lg transition-colors border border-slate-200 shadow-2xs"
                    >
                      {note} บ.
                    </button>
                  ))}
                </div>
              </div>

              {/* Change calculation box */}
              {cashNum > 0 && (
                <div className={`p-3 rounded-xl border flex items-center justify-between ${
                  isCashSufficient
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-red-50 border-red-200 text-red-900'
                }`}>
                  <span className="font-bold text-sm">
                    {isCashSufficient ? 'เงินทอนให้ลูกค้า:' : 'เงินยังขาดอีก:'}
                  </span>
                  <span className="font-black text-2xl">
                    {isCashSufficient ? `${changeDue} บาท` : `${grandTotal - cashNum} บาท`}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Spicy Level (ตอนกำลังจะคิดตังค์) */}
          <div className="bg-red-50/80 p-3 rounded-2xl border border-red-200">
            <div className="text-xs font-bold text-red-950 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-red-600" />
                <span>ระดับความเผ็ดของบิลนี้:</span>
              </span>
              <span className="text-[10px] text-red-600 font-semibold">*เลือก 1 อย่าง</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {spicyOptions.filter(s => s.isAvailable !== false && s.id !== 'dry' && s.id !== 'extra_sesame').map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSpicyLevel(s.id)}
                  className={`py-2 px-1.5 rounded-xl text-xs font-bold transition-all truncate border text-center cursor-pointer ${
                    spicyLevel === s.id
                      ? 'bg-red-600 text-white border-red-600 shadow-xs ring-2 ring-red-300'
                      : 'bg-white border-red-200 text-slate-700 hover:bg-red-50'
                  }`}
                >
                  {s.label.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Order Addons (ตัวเลือกพิเศษตอนกำลังจะคิดตังค์) */}
          {orderAddonOptions.filter(a => a.isAvailable !== false).length > 0 && (
            <div className="bg-amber-50/80 p-3 rounded-2xl border border-amber-200">
              <div className="text-xs font-bold text-amber-950 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>ตัวเลือกพิเศษของบิลนี้:</span>
                </span>
                <span className="text-[10px] text-amber-700 font-semibold">เลือกได้หลายอย่าง</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {orderAddonOptions.filter(a => a.isAvailable !== false).map((addon) => {
                  const isSelected = orderAddons.includes(addon.label)
                  return (
                    <button
                      key={addon.id}
                      type="button"
                      onClick={() => toggleOrderAddon(addon.label)}
                      className={`p-2 rounded-xl border text-left text-xs font-bold flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-amber-500 text-white border-amber-500 shadow-xs ring-2 ring-amber-300'
                          : 'bg-white border-amber-200 text-slate-700 hover:bg-amber-50'
                      }`}
                    >
                      <span className="truncate">{addon.icon ? `${addon.icon} ` : '✨ '}{addon.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-white flex-shrink-0 ml-1" />}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Quick Discount Adjustment */}
          <div className="flex items-center justify-between pt-1 text-xs">
            <span className="font-semibold text-slate-500 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-amber-500" />
              <span>ปรับส่วนลด:</span>
            </span>
            <div className="flex items-center gap-1">
              {[0, 5, 10, 20].map((d) => (
                <button
                  key={d}
                  onClick={() => setDiscount(d)}
                  className={`px-2 py-1 rounded-md font-bold text-xs border ${
                    discount === d
                      ? 'bg-red-600 text-white border-red-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {d === 0 ? 'ไม่มี' : `-${d}฿`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="sticky bottom-0 bg-white/95 backdrop-blur-xs p-3.5 sm:p-4 border-t border-slate-100 flex gap-2 shadow-lg z-10">
          <button
            onClick={closePaymentModal}
            className="py-3.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-sm transition-colors"
          >
            ย้อนกลับ
          </button>
          <button
            onClick={handleConfirmPayment}
            disabled={isSubmitting || (paymentMethod === 'cash' && !isCashSufficient)}
            className="flex-1 py-3.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-extrabold text-base shadow-md shadow-red-200 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>ยืนยันจบการขาย & พิมพ์ใบเสร็จ</span>
          </button>
        </div>
      </div>
    </div>
  )
}

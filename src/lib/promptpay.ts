import QRCode from 'qrcode'

// Calculate CRC16 checksum for EMVCo standard (CRC-16/CCITT-FALSE)
function crc16(data: string): string {
  let crc = 0xffff
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff
      } else {
        crc = (crc << 1) & 0xffff
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

function formatTLV(id: string, value: string): string {
  const len = String(value.length).padStart(2, '0')
  return `${id}${len}${value}`
}

export function generatePromptPayPayload(targetPhoneOrId: string, amount?: number): string {
  const cleaned = targetPhoneOrId.replace(/[^0-9]/g, '')
  
  // Format target ID
  let targetField = ''
  if (cleaned.length === 10 && cleaned.startsWith('0')) {
    // Mobile number: Thai 08x / 09x / 06x -> 0066 + 9 digits (total length 13)
    const mobileFormatted = `0066${cleaned.slice(1)}`
    targetField = formatTLV('01', mobileFormatted)
  } else if (cleaned.length === 13) {
    // National ID or Tax ID
    targetField = formatTLV('02', cleaned)
  } else if (cleaned.length >= 9 && cleaned.startsWith('66')) {
    const mobileFormatted = `00${cleaned}`
    targetField = formatTLV('01', mobileFormatted)
  } else if (cleaned.length >= 11 && cleaned.startsWith('0066')) {
    targetField = formatTLV('01', cleaned)
  } else {
    // Fallback default
    const mobileFormatted = cleaned.startsWith('0') ? `0066${cleaned.slice(1)}` : `0066${cleaned}`
    targetField = formatTLV('01', mobileFormatted)
  }

  // Merchant Account Info (ID 29)
  // Standard BOT PromptPay AID is A000000677010111 (length 16)
  const aid = formatTLV('00', 'A000000677010111')
  const merchantInfo = formatTLV('29', `${aid}${targetField}`)

  // Build Payload parts
  const pfi = formatTLV('00', '01') // Payload Format Indicator
  const poi = formatTLV('01', amount && amount > 0 ? '12' : '11') // 12 = Dynamic (amount specified), 11 = Static
  const currency = formatTLV('53', '764') // THB
  const country = formatTLV('58', 'TH')

  let payload = `${pfi}${poi}${merchantInfo}${currency}`

  if (amount && amount > 0) {
    const formattedAmount = amount.toFixed(2)
    payload += formatTLV('54', formattedAmount)
  }

  payload += country

  // Checksum container (ID 63 with length 04)
  const checksumContainer = `${payload}6304`
  const checksum = crc16(checksumContainer)

  return `${checksumContainer}${checksum}`
}

export async function generatePromptPayQrDataUrl(phoneOrId: string, amount?: number): Promise<string> {
  const payload = generatePromptPayPayload(phoneOrId, amount)
  try {
    const dataUrl = await QRCode.toDataURL(payload, {
      width: 280,
      margin: 1,
      color: {
        dark: '#1e293b',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    })
    return dataUrl
  } catch (err) {
    console.error('Failed to generate PromptPay QR code:', err)
    return ''
  }
}

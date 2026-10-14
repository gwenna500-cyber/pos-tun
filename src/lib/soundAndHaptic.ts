// Web Audio API & Vibration Utility for responsive cashier feedback

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (AudioContextClass) {
      audioCtx = new AudioContextClass()
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

// Gentle tap feedback vibration (50ms as specified in user requirements)
export function triggerHaptic(duration: number | number[] = 50): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(duration)
    } catch {
      // Ignore vibration error on unsupported platforms (e.g. desktop)
    }
  }
}

// Crisp tap click sound
export function playTapSound(): void {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(600, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.04)

    gain.gain.setValueAtTime(0.08, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start()
    osc.stop(ctx.currentTime + 0.04)
  } catch (e) {
    // Audio context may require user interaction first
  }
}

// Cash register success / checkout sound
export function playSuccessChime(): void {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime
    // Double chime notes: C6 (1046.5Hz) -> E6 (1318.5Hz)
    const notes = [
      { freq: 1046.5, time: now, dur: 0.12 },
      { freq: 1318.5, time: now + 0.1, dur: 0.25 }
    ]

    notes.forEach(({ freq, time, dur }) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, time)

      gain.gain.setValueAtTime(0.15, time)
      gain.gain.exponentialRampToValueAtTime(0.001, time + dur)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(time)
      osc.stop(time + dur)
    })
  } catch (e) {}
}

// Kitchen station order alert chime (louder alert for cook station)
export function playKitchenAlert(): void {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime
    const notes = [880, 1108.73, 1318.51] // A5, C#6, E6

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now + idx * 0.08)

      gain.gain.setValueAtTime(0.2, now + idx * 0.08)
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.2)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now + idx * 0.08)
      osc.stop(now + idx * 0.08 + 0.22)
    })
  } catch (e) {}
}

import { SFX_CATALOG } from './catalog'
import type { SfxEvent } from './types'

type AudioContextCtor = typeof AudioContext

function audioContextCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') {
    return null
  }
  const fromWindow = window.AudioContext
  if (fromWindow) {
    return fromWindow
  }
  const prefixed = (
    window as Window & { webkitAudioContext?: AudioContextCtor }
  ).webkitAudioContext
  return prefixed ?? null
}

function pickSrc(srcs: readonly string[]): string | undefined {
  if (srcs.length === 0) {
    return undefined
  }
  return srcs[Math.floor(Math.random() * srcs.length)] ?? srcs[0]
}

function prefersReducedMotion(): boolean {
  return (
    typeof matchMedia === 'function' &&
    matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

class SfxEngine {
  private ctx: AudioContext | null = null
  private readonly buffers = new Map<string, AudioBuffer>()
  private readonly loading = new Map<string, Promise<AudioBuffer | null>>()
  private readonly active = new Set<AudioBufferSourceNode>()
  private visibilityBound = false

  private ensureContext(): AudioContext | null {
    if (this.ctx) {
      return this.ctx
    }
    const Ctor = audioContextCtor()
    if (!Ctor) {
      return null
    }
    this.ctx = new Ctor()
    this.bindVisibility()
    return this.ctx
  }

  private bindVisibility(): void {
    if (this.visibilityBound || typeof document === 'undefined') {
      return
    }
    this.visibilityBound = true
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.ctx?.state === 'suspended') {
        void this.ctx.resume().catch(() => undefined)
      }
    })
  }

  unlock(): void {
    const ctx = this.ensureContext()
    if (!ctx) {
      return
    }
    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => undefined)
    }
  }

  stopAll(): void {
    for (const source of this.active) {
      try {
        source.stop()
      } catch {
        // already stopped
      }
    }
    this.active.clear()
  }

  async preload(): Promise<void> {
    const srcs = Object.values(SFX_CATALOG).flatMap((entry) => entry.srcs)
    await Promise.all(srcs.map((src) => this.loadBuffer(src)))
  }

  async play(event: SfxEvent, enabled: boolean): Promise<void> {
    if (!enabled) {
      return
    }

    // Skip non-essential select whoosh under reduced motion; explicit toggle still
    // allows ui / submit / results stings (see sfx-design.md).
    if (event === 'card.select' && prefersReducedMotion()) {
      return
    }

    const entry = SFX_CATALOG[event]
    const src = pickSrc(entry.srcs)
    if (!src) {
      return
    }

    const buffer = await this.loadBuffer(src)
    if (!buffer) {
      return
    }

    const ctx = this.ensureContext()
    if (!ctx) {
      return
    }
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume()
      } catch {
        return
      }
    }

    try {
      const source = ctx.createBufferSource()
      source.buffer = buffer
      const gain = ctx.createGain()
      gain.gain.value = entry.volume
      source.connect(gain)
      gain.connect(ctx.destination)
      this.active.add(source)
      source.onended = () => {
        this.active.delete(source)
        source.disconnect()
        gain.disconnect()
      }
      source.start()
    } catch {
      // missing / decode / start failure — silent
    }
  }

  private loadBuffer(src: string): Promise<AudioBuffer | null> {
    const cached = this.buffers.get(src)
    if (cached) {
      return Promise.resolve(cached)
    }

    const pending = this.loading.get(src)
    if (pending) {
      return pending
    }

    const task = this.fetchAndDecode(src)
    this.loading.set(src, task)
    return task
  }

  private async fetchAndDecode(src: string): Promise<AudioBuffer | null> {
    try {
      const ctx = this.ensureContext()
      if (!ctx) {
        return null
      }
      const response = await fetch(src)
      if (!response.ok) {
        return null
      }
      const bytes = await response.arrayBuffer()
      const buffer = await ctx.decodeAudioData(bytes.slice(0))
      this.buffers.set(src, buffer)
      return buffer
    } catch {
      return null
    } finally {
      this.loading.delete(src)
    }
  }
}

export const sfxEngine = new SfxEngine()

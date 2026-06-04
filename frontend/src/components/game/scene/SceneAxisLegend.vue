<script setup lang="ts">
import { PLAYFIELD, SCENE_DEBUG, TABLE } from '@/lib/scene/constants'

const playfieldRightX = PLAYFIELD.leftX + PLAYFIELD.width
const playfieldBackZ = PLAYFIELD.frontZ - PLAYFIELD.depth
</script>

<template>
  <aside
    v-if="SCENE_DEBUG.showAxisIndicator"
    class="scene-axis-legend pointer-events-none absolute bottom-3 left-3 z-10 select-none font-mono text-[10px] leading-relaxed text-text/80"
    aria-hidden="true"
  >
    <p class="mb-1 font-semibold uppercase tracking-wide text-muted">Scene axes</p>
    <ul class="space-y-0.5">
      <li><span class="text-[#ef4444]">X</span> red → right</li>
      <li><span class="text-[#22c55e]">Y</span> green → up</li>
      <li><span class="text-[#3b82f6]">Z</span> blue → toward camera</li>
    </ul>
    <p class="mt-2 text-muted">
      Origin (0, {{ TABLE.y }}, 0)<br />
      Playfield X [{{ PLAYFIELD.leftX }}, {{ playfieldRightX }}]<br />
      Playfield Z [{{ playfieldBackZ }}, {{ PLAYFIELD.frontZ }}]
    </p>
  </aside>
</template>

<style scoped>
.scene-axis-legend {
  padding: 0.45rem 0.55rem;
  border: 1px solid color-mix(in srgb, var(--color-border) 80%, transparent);
  border-radius: 0.375rem;
  background: color-mix(in srgb, var(--color-surface-raised) 88%, transparent);
  backdrop-filter: blur(4px);
}
</style>

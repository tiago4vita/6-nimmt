<script setup lang="ts">
import { ref } from 'vue'
import { ChevronDown, ChevronUp } from 'lucide-vue-next'

import CardTile from '@/components/game/CardTile.vue'
import GameRow from '@/components/game/GameRow.vue'
import { bonesFor } from '@/lib/bones'
import type { Card } from '@/graphql/types'

const open = ref(false)

function card(id: string, value: number): Card {
  return { id, value, bones: bonesFor(value) }
}

const ruleARow = {
  index: 1,
  cards: [card('a1', 12), card('a2', 19)],
}
const ruleAPlay = card('a-played', 23)
const ruleARowAfter = {
  index: 1,
  cards: [card('a1', 12), card('a2', 19), card('a-played', 23)],
}

const ruleBRow = {
  index: 0,
  cards: [
    card('b1', 4),
    card('b2', 11),
    card('b3', 22),
    card('b4', 27),
    card('b5', 31),
  ],
}
const ruleBPlay = card('b-played', 38)
const ruleBRowAfter = {
  index: 0,
  cards: [card('b-played', 38)],
}

const ruleCRows = [
  { index: 0, cards: [card('c1', 14), card('c2', 25)] },
  { index: 1, cards: [card('c3', 31)] },
  { index: 2, cards: [card('c4', 42), card('c5', 50)] },
  { index: 3, cards: [card('c6', 60)] },
]
const ruleCPlay = card('c-played', 3)
</script>

<template>
  <div class="rounded-lg border border-border bg-surface-raised">
    <button
      type="button"
      class="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-text"
      :aria-expanded="open"
      @click="open = !open"
    >
      How to play
      <ChevronUp v-if="open" class="size-4 text-muted" aria-hidden="true" />
      <ChevronDown v-else class="size-4 text-muted" aria-hidden="true" />
    </button>

    <div
      v-if="open"
      class="space-y-6 border-t border-border px-4 py-4 text-sm text-muted"
    >
      <section>
        <h3 class="mb-2 text-xs uppercase tracking-wide text-accent">Goal</h3>
        <p>
          Collect the fewest bones. Bones are the little penalty markers under
          each card — lowest total at the end of all rounds wins.
        </p>
      </section>

      <section>
        <h3 class="mb-2 text-xs uppercase tracking-wide text-accent">
          Rule A — Normal placement
        </h3>
        <p class="mb-3">
          Your card slots onto the row whose last card is closest below it.
          Example: you play
          <CardTile :card="ruleAPlay" size="sm" class="inline-flex align-middle" />
          onto a row ending in 19.
        </p>
        <div class="grid gap-2 sm:grid-cols-2">
          <div>
            <p class="mb-1 text-[11px] uppercase tracking-wide text-muted">Before</p>
            <GameRow :row="ruleARow" />
          </div>
          <div>
            <p class="mb-1 text-[11px] uppercase tracking-wide text-muted">After</p>
            <GameRow :row="ruleARowAfter" highlighted />
          </div>
        </div>
      </section>

      <section>
        <h3 class="mb-2 text-xs uppercase tracking-wide text-accent">
          Rule B — Sixth card collects the row
        </h3>
        <p class="mb-3">
          If your card would be the sixth on a row, you take all five cards on
          it as bones, and the row restarts with your card.
        </p>
        <div class="grid gap-2 sm:grid-cols-2">
          <div>
            <p class="mb-1 text-[11px] uppercase tracking-wide text-muted">
              Before (5 cards)
            </p>
            <GameRow :row="ruleBRow" />
          </div>
          <div>
            <p class="mb-1 text-[11px] uppercase tracking-wide text-muted">
              After playing
              <CardTile :card="ruleBPlay" size="sm" class="inline-flex align-middle" />
            </p>
            <GameRow :row="ruleBRowAfter" highlighted />
          </div>
        </div>
      </section>

      <section>
        <h3 class="mb-2 text-xs uppercase tracking-wide text-accent">
          Rule C — Too low (v1 auto-pick)
        </h3>
        <p class="mb-3">
          When your card is lower than every row’s last card, the game collects
          the row with the fewest bones for you and starts it fresh with your
          card. Example: playing
          <CardTile :card="ruleCPlay" size="sm" class="inline-flex align-middle" />
          when no row ends below 3.
        </p>
        <div class="grid gap-2 sm:grid-cols-2">
          <GameRow v-for="row in ruleCRows" :key="row.index" :row="row" />
        </div>
      </section>

      <section>
        <h3 class="mb-2 text-xs uppercase tracking-wide text-accent">
          Turn flow
        </h3>
        <ol class="list-decimal space-y-1 pl-5">
          <li>Select a card (click or press 1–N).</li>
          <li>Confirm with the “Play card” button (or Enter).</li>
          <li>Wait for the other players — everyone plays simultaneously.</li>
          <li>Cards resolve from lowest to highest each round.</li>
        </ol>
      </section>
    </div>
  </div>
</template>

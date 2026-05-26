<script setup lang="ts">
import { computed, ref, watch, toRef } from 'vue'
import { useRouter } from 'vue-router'
import { useMutation } from '@urql/vue'
import { ArrowLeft } from 'lucide-vue-next'

import AppShell from '@/components/layout/AppShell.vue'
import ConfirmDialog from '@/components/feedback/ConfirmDialog.vue'
import ConnectionStatusBanner from '@/components/feedback/ConnectionStatusBanner.vue'
import IconButton from '@/components/layout/IconButton.vue'
import LoadingShell from '@/components/layout/LoadingShell.vue'
import CopyRoomActions from '@/components/lobby/CopyRoomActions.vue'
import PlayerList from '@/components/lobby/PlayerList.vue'
import RulesDrawer from '@/components/lobby/RulesDrawer.vue'
import { UPDATE_DISPLAY_NAME } from '@/graphql/operations'
import type { MutationResult } from '@/graphql/types'
import { isPlayPhase } from '@/graphql/types'
import { useDisplayName } from '@/composables/useDisplayName'
import { useGameRoom } from '@/composables/useGameRoom'
import { useToast } from '@/composables/useToast'
import { SHOWCASE_MAX_PLAYERS } from '@/lib/showcase'

const props = defineProps<{
  roomId: string
}>()

const router = useRouter()
const { push: pushToast } = useToast()
const { rememberDisplayName } = useDisplayName()

const {
  room,
  players,
  myPlayerId,
  phase,
  isLoading,
  isReconnecting,
  subscriptionError,
  startGame,
  leaveRoom,
  applyView,
  updateSubmitTimeout,
} = useGameRoom(toRef(props, 'roomId'))

const showLeaveConfirm = ref(false)
const isStarting = ref(false)
const isLeaving = ref(false)
const isSavingTimeout = ref(false)
const isEditingName = ref(false)
const editedName = ref('')
const submitTimeoutSeconds = ref(30)

const updateNameMutation = useMutation(UPDATE_DISPLAY_NAME)

const me = computed(() => players.value.find((player) => player.id === myPlayerId.value) ?? null)
const isHost = computed(() => me.value?.isHost ?? false)
const canStart = computed(
  () =>
    isHost.value &&
    players.value.length === SHOWCASE_MAX_PLAYERS &&
    phase.value === 'LOBBY',
)
const isDuelFull = computed(() => players.value.length >= SHOWCASE_MAX_PLAYERS)
const waitingForOpponent = computed(() => players.value.length < SHOWCASE_MAX_PLAYERS)

watch(
  phase,
  (nextPhase) => {
    if (nextPhase && isPlayPhase(nextPhase)) {
      void router.replace({ name: 'play', params: { roomId: props.roomId } })
    }
  },
  { immediate: true },
)

watch(me, (player) => {
  if (player && !isEditingName.value) {
    editedName.value = player.displayName
  }
})

watch(
  () => room.value?.submitTimeoutSeconds,
  (value) => {
    if (value !== undefined && !isSavingTimeout.value) {
      submitTimeoutSeconds.value = value
    }
  },
  { immediate: true },
)

async function handleSubmitTimeoutChange(): Promise<void> {
  if (!isHost.value || phase.value !== 'LOBBY') {
    return
  }

  isSavingTimeout.value = true
  try {
    const errors = await updateSubmitTimeout(submitTimeoutSeconds.value)
    if (errors.length > 0) {
      pushToast(errors[0]?.message ?? 'Could not update turn timer', 'error')
      if (room.value?.submitTimeoutSeconds !== undefined) {
        submitTimeoutSeconds.value = room.value.submitTimeoutSeconds
      }
    }
  } finally {
    isSavingTimeout.value = false
  }
}

async function handleStartGame(): Promise<void> {
  if (!canStart.value) {
    return
  }

  isStarting.value = true
  try {
    const errors = await startGame()
    if (errors.length > 0) {
      pushToast(errors[0]?.message ?? 'Could not start game', 'error')
    }
  } finally {
    isStarting.value = false
  }
}

async function confirmLeave(): Promise<void> {
  isLeaving.value = true
  try {
    const errors = await leaveRoom()
    if (errors.length > 0) {
      pushToast(errors[0]?.message ?? 'Could not leave room', 'error')
      return
    }
    showLeaveConfirm.value = false
    await router.push({ name: 'home' })
  } finally {
    isLeaving.value = false
  }
}

async function saveDisplayName(): Promise<void> {
  const trimmed = editedName.value.trim()
  if (!trimmed) {
    pushToast('Display name cannot be empty', 'error')
    return
  }

  const result = await updateNameMutation.executeMutation({ displayName: trimmed })
  const payload = result.data?.updateDisplayName as MutationResult | undefined
  if (!payload?.success) {
    pushToast(payload?.errors[0]?.message ?? 'Could not update name', 'error')
    return
  }

  if (payload.view) {
    applyView(payload.view)
  }

  rememberDisplayName(trimmed)
  isEditingName.value = false
  pushToast('Display name updated')
}
</script>

<template>
  <AppShell>
    <ConnectionStatusBanner :is-reconnecting="isReconnecting && !isLoading" />

    <LoadingShell v-if="isLoading" variant="lobby" label="Loading lobby" />

    <div v-else-if="room" class="space-y-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <IconButton
          :icon="ArrowLeft"
          ariaLabel="Leave room"
          title="Leave room"
          @click="showLeaveConfirm = true"
        />
        <div class="text-center">
          <div class="text-xs uppercase tracking-wide text-muted">Room code</div>
          <div class="text-2xl font-semibold tracking-[0.2em] text-accent">{{ room.code }}</div>
        </div>
        <CopyRoomActions :room-id="room.id" :code="room.code" />
      </div>

      <div class="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section class="rounded-xl border border-border bg-surface-raised p-4">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-sm font-medium text-text">
              Duelists ({{ players.length }}/{{ SHOWCASE_MAX_PLAYERS }})
            </h2>
            <button
              type="button"
              class="text-xs text-accent hover:underline"
              @click="isEditingName = !isEditingName"
            >
              {{ isEditingName ? 'Cancel edit' : 'Edit name' }}
            </button>
          </div>

          <div v-if="isEditingName" class="mb-4 flex gap-2">
            <input
              v-model="editedName"
              type="text"
              maxlength="32"
              class="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-accent"
            />
            <button
              type="button"
              class="btn btn-primary"
              @click="saveDisplayName"
            >
              Save
            </button>
          </div>

          <PlayerList :players="players" :my-player-id="myPlayerId" />
        </section>

        <section class="rounded-xl border border-border bg-surface-raised p-4">
          <h2 class="text-sm font-medium text-text">
            {{ isHost ? 'Ready to duel?' : 'Waiting for host' }}
          </h2>
          <p v-if="waitingForOpponent" class="mt-2 text-sm text-muted">
            Waiting for your opponent to join this duel.
          </p>
          <p v-else class="mt-2 text-sm text-muted">
            Both duelists are here — the host can start the match.
          </p>
          <p v-if="isDuelFull && !isHost" class="mt-1 text-xs text-muted">
            This duel is full; no additional players can join.
          </p>

          <div v-if="isHost" class="mt-4 space-y-2">
            <div class="flex items-center justify-between text-sm">
              <label for="submit-timeout" class="font-medium text-text">Turn timer</label>
              <span class="tabular-nums text-accent">{{ submitTimeoutSeconds }}s</span>
            </div>
            <input
              id="submit-timeout"
              v-model.number="submitTimeoutSeconds"
              type="range"
              min="3"
              max="60"
              step="1"
              class="w-full accent-accent"
              :disabled="phase !== 'LOBBY' || isSavingTimeout"
              @change="handleSubmitTimeoutChange"
            />
            <p class="text-xs text-muted">3–60 seconds per round · default 30s</p>
          </div>
          <p v-else class="mt-4 text-sm text-muted">
            Turn timer: {{ room.submitTimeoutSeconds }}s per round
          </p>

          <button
            v-if="isHost"
            type="button"
            class="btn btn-primary mt-6 w-full py-3"
            :class="canStart && !isStarting ? 'motion-safe:animate-pulse' : ''"
            :disabled="!canStart || isStarting"
            @click="handleStartGame"
          >
            Start duel
          </button>
          <p v-else class="mt-6 text-sm text-muted">
            The host will start the duel once your opponent arrives.
          </p>
        </section>
      </div>

      <RulesDrawer />

      <p v-if="subscriptionError" class="text-sm text-danger">{{ subscriptionError }}</p>
    </div>

    <ConfirmDialog
      :open="showLeaveConfirm"
      title="Leave room?"
      message="You will return to the home screen."
      confirm-label="Leave room"
      @confirm="confirmLeave"
      @cancel="showLeaveConfirm = false"
    />
  </AppShell>
</template>

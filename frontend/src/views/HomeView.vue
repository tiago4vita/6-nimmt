<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useMutation } from '@urql/vue'

import AppShell from '@/components/layout/AppShell.vue'
import LoadingShell from '@/components/layout/LoadingShell.vue'
import RoomCodeInput from '@/components/lobby/RoomCodeInput.vue'
import RulesDrawer from '@/components/lobby/RulesDrawer.vue'
import { CREATE_ROOM, JOIN_ROOM } from '@/graphql/operations'
import type { MutationResult } from '@/graphql/types'
import { useDisplayName } from '@/composables/useDisplayName'
import { useGuestSession } from '@/composables/useGuestSession'
import { useToast } from '@/composables/useToast'
import { SHOWCASE_MAX_PLAYERS } from '@/lib/showcase'

const router = useRouter()
const route = useRoute()
const { isReady, isLoading: sessionLoading } = useGuestSession()
const { push: pushToast } = useToast()
const { displayName, rememberDisplayName } = useDisplayName()
const joinCode = ref(typeof route.query.join === 'string' ? route.query.join.toUpperCase() : '')
const isSubmitting = ref(false)

const createRoomMutation = useMutation(CREATE_ROOM)
const joinRoomMutation = useMutation(JOIN_ROOM)

const canCreate = computed(() => displayName.value.trim().length > 0 && !isSubmitting.value)
const canJoin = computed(
  () => displayName.value.trim().length > 0 && joinCode.value.length === 6 && !isSubmitting.value,
)

async function handleMutationResult(
  result: MutationResult | undefined,
  onSuccess: (roomId: string) => void,
): Promise<void> {
  if (!result?.success) {
    pushToast(result?.errors[0]?.message ?? 'Something went wrong', 'error')
    return
  }

  const roomId = result.view?.room.id
  if (!roomId) {
    pushToast('Room created but no room id returned', 'error')
    return
  }

  onSuccess(roomId)
}

async function createRoom(): Promise<void> {
  if (!canCreate.value) {
    pushToast('Enter your name to create a duel', 'error')
    return
  }

  const name = displayName.value.trim()
  rememberDisplayName(name)

  isSubmitting.value = true
  try {
    const result = await createRoomMutation.executeMutation({
      displayName: name,
      maxPlayers: SHOWCASE_MAX_PLAYERS,
    })
    await handleMutationResult(result.data?.createRoom as MutationResult | undefined, (roomId) => {
      void router.push({ name: 'lobby', params: { roomId } })
    })
  } finally {
    isSubmitting.value = false
  }
}

async function joinRoom(code = joinCode.value): Promise<void> {
  if (!canJoin.value && code.length === 6) {
    if (!displayName.value.trim()) {
      pushToast('Enter your name to join', 'error')
      return
    }
  }

  if (code.length !== 6 || !displayName.value.trim()) {
    pushToast('Enter your name and a 6-character room code', 'error')
    return
  }

  const name = displayName.value.trim()
  rememberDisplayName(name)

  isSubmitting.value = true
  try {
    const result = await joinRoomMutation.executeMutation({
      code: code.toUpperCase(),
      displayName: name,
    })
    await handleMutationResult(result.data?.joinRoom as MutationResult | undefined, (roomId) => {
      void router.push({ name: 'lobby', params: { roomId } })
    })
  } finally {
    isSubmitting.value = false
  }
}

function onCodeComplete(code: string): void {
  if (displayName.value.trim()) {
    void joinRoom(code)
  }
}
</script>

<template>
  <AppShell main-align="center">
    <LoadingShell
      v-if="sessionLoading || !isReady"
      variant="home"
      label="Starting guest session"
    />

    <div v-else class="mx-auto flex max-w-md flex-col gap-6">
      <div class="text-center">
        <img src="/Logotype.svg" alt="BARE BONES" class="mx-auto h-16 w-auto" />
        <p class="mt-3 text-sm font-normal text-muted">
          Trick-avoidance card duel — create a room or join with a code. No account needed.
        </p>
      </div>

      <label class="block">
        <span class="mb-2 block text-sm text-muted">Your name</span>
        <input
          v-model="displayName"
          type="text"
          maxlength="32"
          class="w-full rounded-md border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/40"
          placeholder="Alice"
        />
      </label>

      <button
        type="button"
        class="btn btn-primary w-full py-3"
        :disabled="!canCreate"
        @click="createRoom"
      >
        Create duel
      </button>

      <div class="flex items-center gap-3 text-xs uppercase tracking-wide text-muted">
        <div class="h-px flex-1 bg-border" />
        or join
        <div class="h-px flex-1 bg-border" />
      </div>

      <RoomCodeInput v-model="joinCode" @complete="onCodeComplete" />

      <button
        type="button"
        class="btn btn-secondary w-full py-3"
        :disabled="!canJoin"
        @click="joinRoom()"
      >
        Join room
      </button>

      <RulesDrawer />
    </div>
  </AppShell>
</template>

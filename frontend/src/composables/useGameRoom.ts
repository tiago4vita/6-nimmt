import { computed, onUnmounted, ref, watch, type MaybeRef, toRef } from 'vue'
import { useMutation, useQuery, useSubscription } from '@urql/vue'

import { useGuestSession } from '@/composables/useGuestSession'
import { onWsReconnected, wsConnected, wsReconnecting } from '@/graphql/client'
import {
  LEAVE_ROOM,
  MY_GAME_VIEW,
  MY_GAME_VIEW_UPDATED,
  RETURN_TO_LOBBY,
  START_GAME,
  SUBMIT_CARD,
  UPDATE_SUBMIT_TIMEOUT,
} from '@/graphql/operations'
import type { GameError, MutationResult, PlayerPrivateView } from '@/graphql/types'

export function useGameRoom(roomId: MaybeRef<string>) {
  const roomIdRef = toRef(roomId)
  const { isReady } = useGuestSession()

  const view = ref<PlayerPrivateView | null>(null)
  const subscriptionPaused = computed(() => !isReady.value || !roomIdRef.value)

  const bootstrapQuery = useQuery({
    query: MY_GAME_VIEW,
    variables: computed(() => ({ roomId: roomIdRef.value })),
    pause: subscriptionPaused,
  })

  const subscription = useSubscription({
    query: MY_GAME_VIEW_UPDATED,
    variables: computed(() => ({ roomId: roomIdRef.value })),
    pause: subscriptionPaused,
  })

  const leaveRoomMutation = useMutation(LEAVE_ROOM)
  const returnToLobbyMutation = useMutation(RETURN_TO_LOBBY)
  const startGameMutation = useMutation(START_GAME)
  const submitCardMutation = useMutation(SUBMIT_CARD)
  const updateSubmitTimeoutMutation = useMutation(UPDATE_SUBMIT_TIMEOUT)

  watch(
    () => bootstrapQuery.data.value,
    (data) => {
      const payload = data?.myGameView as PlayerPrivateView | undefined
      if (payload) {
        view.value = payload
      }
    },
    { immediate: true },
  )

  watch(
    () => subscription.data.value,
    (data) => {
      const payload = data?.myGameViewUpdated as PlayerPrivateView | undefined
      if (payload) {
        view.value = payload
      }
    },
    { immediate: true },
  )

  const stopReconnectListener = onWsReconnected(() => {
    if (roomIdRef.value && isReady.value) {
      void refetchView()
    }
  })

  onUnmounted(() => {
    stopReconnectListener()
  })

  const room = computed(() => view.value?.room ?? null)
  const myHand = computed(() => view.value?.myHand ?? [])
  const mySubmittedCard = computed(() => view.value?.mySubmittedCard ?? null)
  const phase = computed(() => view.value?.room.phase ?? null)
  const players = computed(() => view.value?.room.players ?? [])
  const rows = computed(() => view.value?.room.rows ?? [])
  const myPlayerId = computed(() => view.value?.myPlayerId ?? null)
  const lastResolvedPlays = computed(() => view.value?.lastResolvedPlays ?? [])
  const submissionProgress = computed(() => view.value?.room.submissionProgress ?? null)
  const isSubscriptionConnected = computed(
    () => wsConnected.value && !subscription.error.value && !subscriptionPaused.value,
  )
  const isReconnecting = computed(() => wsReconnecting.value && !subscriptionPaused.value)
  const isLoading = computed(() => bootstrapQuery.fetching.value && !view.value)
  const queryError = computed(() => bootstrapQuery.error.value?.message ?? null)
  const subscriptionError = computed(() => subscription.error.value?.message ?? null)

  function applyView(payload: PlayerPrivateView): void {
    view.value = payload
  }

  function applyMutationView(result: MutationResult | null | undefined): GameError[] {
    if (result?.success && result.view) {
      view.value = result.view
    }
    return result?.errors ?? []
  }

  async function leaveRoom(): Promise<GameError[]> {
    const result = await leaveRoomMutation.executeMutation({ roomId: roomIdRef.value })
    return applyMutationView(result.data?.leaveRoom as MutationResult | undefined)
  }

  async function returnToLobby(): Promise<GameError[]> {
    const result = await returnToLobbyMutation.executeMutation({ roomId: roomIdRef.value })
    return applyMutationView(result.data?.returnToLobby as MutationResult | undefined)
  }

  async function startGame(): Promise<GameError[]> {
    const result = await startGameMutation.executeMutation({ roomId: roomIdRef.value })
    return applyMutationView(result.data?.startGame as MutationResult | undefined)
  }

  async function submitCard(cardId: string): Promise<GameError[]> {
    const result = await submitCardMutation.executeMutation({
      roomId: roomIdRef.value,
      cardId,
    })
    return applyMutationView(result.data?.submitCard as MutationResult | undefined)
  }

  async function updateSubmitTimeout(submitTimeoutSeconds: number): Promise<GameError[]> {
    const result = await updateSubmitTimeoutMutation.executeMutation({
      roomId: roomIdRef.value,
      submitTimeoutSeconds,
    })
    return applyMutationView(result.data?.updateSubmitTimeout as MutationResult | undefined)
  }

  async function refetchView(): Promise<void> {
    await bootstrapQuery.executeQuery({ requestPolicy: 'network-only' })
  }

  return {
    view,
    room,
    myHand,
    mySubmittedCard,
    phase,
    players,
    rows,
    myPlayerId,
    lastResolvedPlays,
    submissionProgress,
    isLoading,
    isSubscriptionConnected,
    isReconnecting,
    queryError,
    subscriptionError,
    leaveRoom,
    returnToLobby,
    startGame,
    submitCard,
    updateSubmitTimeout,
    refetchView,
    applyView,
  }
}

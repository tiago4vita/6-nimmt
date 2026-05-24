import type { RouteRecordRaw } from 'vue-router'

import { useGuestSession } from '@/composables/useGuestSession'

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomeView.vue'),
  },
  {
    path: '/room/:roomId/lobby',
    name: 'lobby',
    component: () => import('@/views/LobbyView.vue'),
    props: true,
  },
  {
    path: '/room/:roomId/play',
    name: 'play',
    component: () => import('@/views/GameView.vue'),
    props: true,
  },
  {
    path: '/room/:roomId/results',
    name: 'results',
    component: () => import('@/views/ResultsView.vue'),
    props: true,
  },
]

export async function ensureGuestSessionGuard(): Promise<boolean> {
  const { ensureSession } = useGuestSession()
  await ensureSession()
  return true
}

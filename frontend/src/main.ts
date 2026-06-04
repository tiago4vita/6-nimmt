import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import urql from '@urql/vue'
import Tres from '@tresjs/core'

import App from './App.vue'
import { urqlClient } from './graphql/client'
import { ensureGuestSessionGuard, routes } from './router'
import './style.css'

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async () => {
  await ensureGuestSessionGuard()
  return true
})

createApp(App).use(router).use(urql, urqlClient).use(Tres).mount('#app')

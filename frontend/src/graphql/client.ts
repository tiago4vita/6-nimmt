import { createClient, subscriptionExchange, fetchExchange } from '@urql/vue'
import { createClient as createWsClient } from 'graphql-ws'

import {
  handleWsClosed,
  handleWsConnected,
  handleWsError,
} from './connection'
import { getAuthHeaders } from '../lib/guest-session'

const httpUrl = import.meta.env.VITE_GRAPHQL_HTTP_URL ?? 'http://localhost:8000/graphql'
const wsUrl = import.meta.env.VITE_GRAPHQL_WS_URL ?? 'ws://localhost:8000/graphql'

const wsClient = createWsClient({
  url: wsUrl,
  connectionParams: () => getAuthHeaders(),
  on: {
    connected: handleWsConnected,
    closed: handleWsClosed,
    error: handleWsError,
  },
})

export { wsConnected, wsReconnecting, onWsReconnected } from './connection'

export const urqlClient = createClient({
  url: httpUrl,
  fetchOptions: () => ({
    headers: getAuthHeaders(),
  }),
  exchanges: [
    fetchExchange,
    subscriptionExchange({
      forwardSubscription: (operation) => ({
        subscribe: (sink) => ({
          unsubscribe: wsClient.subscribe(
            { ...operation, query: operation.query ?? '' },
            sink,
          ),
        }),
      }),
    }),
  ],
})

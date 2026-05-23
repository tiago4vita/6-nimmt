import { createClient, subscriptionExchange, fetchExchange } from '@urql/vue'
import { createClient as createWsClient } from 'graphql-ws'

const httpUrl = import.meta.env.VITE_GRAPHQL_HTTP_URL ?? 'http://localhost:8000/graphql'
const wsUrl = import.meta.env.VITE_GRAPHQL_WS_URL ?? 'ws://localhost:8000/graphql'

const wsClient = createWsClient({
  url: wsUrl,
  connectionParams: () => ({
    authorization: `Bearer ${localStorage.getItem('guestToken') ?? ''}`,
  }),
})

export const urqlClient = createClient({
  url: httpUrl,
  fetchOptions: () => ({
    headers: {
      authorization: `Bearer ${localStorage.getItem('guestToken') ?? ''}`,
    },
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

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GRAPHQL_HTTP_URL: string
  readonly VITE_GRAPHQL_WS_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

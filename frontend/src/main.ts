import { createApp } from 'vue'
import urql from '@urql/vue'
import App from './App.vue'
import { urqlClient } from './graphql/client'
import './style.css'

createApp(App).use(urql, urqlClient).mount('#app')

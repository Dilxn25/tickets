import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import enrutador from './enrutador/index.js'
import './estilos/principal.css'


const app = createApp(App)
app.use(createPinia())
app.use(enrutador)
app.mount('#app')

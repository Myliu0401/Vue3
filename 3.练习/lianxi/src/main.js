import { createApp, reactive, readonly, ref, toRef  } from 'vue'
import App from './App.vue'
import './index.css'
window.reactive = reactive;
window.readonly = readonly;
window.toRef = toRef;
window.ref = ref;
createApp(App).mount('#app')

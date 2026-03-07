import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { router } from './router/index.js';

const app = createApp(App);

app.use(createPinia());
app.use(router);

app.config.errorHandler = (err, _instance, info) => {
  console.error('[DDP] Unhandled error:', err);
  console.error('[DDP] Error info:', info);
};

app.mount('#app');

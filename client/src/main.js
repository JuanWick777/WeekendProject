import { getHealth } from './net/api.js';
import './styles.css';

async function updateServerStatus() {
  const status = document.querySelector('#connection-status');
  try {
    const health = await getHealth();
    status.textContent = health.data.authentication === 'ready' ? 'HTTP disponible · autenticación conectada' : 'HTTP disponible · conexión de cuentas pendiente';
  } catch {
    status.textContent = 'Servidor HTTP no disponible';
  }
}

void updateServerStatus();
if (import.meta.env.DEV) {
  const { startArenaPreview } = await import('./preview/arena-preview.js');
  document.querySelector('#online-pending').hidden = true;
  document.querySelector('#arena-layout').hidden = false;
  const close = startArenaPreview();
  if (import.meta.hot) import.meta.hot.dispose(close);
}

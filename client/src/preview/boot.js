import './practice.css';
import markup from './practice.html?raw';
import { startArenaPreview } from './arena-preview.js';
export async function startPractice(root) {
  root.innerHTML = '<a href="/" class="practice-link">‹ Volver al cliente online</a>' + markup;
  const close = await startArenaPreview();
  root.querySelector('#connection-status').textContent='PRÁCTICA LOCAL · SIN GUARDADO';
  return close;
}

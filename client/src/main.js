import { GAME_CONFIG } from '@cybergrid/shared/constants';
import { getHealth } from './net/api.js';
import './styles.css';

const canvas = document.querySelector('#game');
const context = canvas.getContext('2d');
const status = document.querySelector('#connection-status');
const { width, height, tileSize } = GAME_CONFIG.world;

function drawBaseScene() {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = width * pixelRatio;
  canvas.height = height * pixelRatio;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.fillStyle = '#10151f';
  context.fillRect(0, 0, width, height);
  context.strokeStyle = '#222d3e';
  context.lineWidth = 1;
  context.beginPath();

  for (let x = 0; x <= width; x += tileSize) {
    context.moveTo(x, 0);
    context.lineTo(x, height);
  }
  for (let y = 0; y <= height; y += tileSize) {
    context.moveTo(0, y);
    context.lineTo(width, y);
  }
  context.stroke();
  context.fillStyle = '#c6d0df';
  context.font = '20px system-ui, sans-serif';
  context.textAlign = 'center';
  context.fillText('Canvas preparado para el cliente', width / 2, height / 2);
}

drawBaseScene();
window.addEventListener('resize', drawBaseScene);

try {
  const health = await getHealth();
  status.textContent = 'Servidor HTTP disponible · etapa: ' + health.data.stage;
} catch (error) {
  status.textContent = 'Servidor no disponible: ' + error.message;
}

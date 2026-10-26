import './styles.css';
import './ui/game.css';

const root = document.getElementById('app');
let close;
if (import.meta.env.DEV && new URLSearchParams(location.search).get('practice') === '1') {
  const { startPractice } = await import('./preview/boot.js');
  close = await startPractice(root);
} else {
  const { startApp } = await import('./app.js');
  close = await startApp(root);
}
if (import.meta.hot) import.meta.hot.dispose(() => close?.());

/**
 * CyberGrid: interfaz navegable de revisión visual (sin conexión a backend).
 * Los fondos son las cinco referencias visuales aprobadas. Las zonas clicables
 * están descritas como porcentajes para facilitar su sustitución por componentes.
 *
 * IMPORTANTE: crear/unirse, estado de listo y resultados son SOLO una simulación.
 * Integrar los servicios reales y accesibilidad móvil en la app principal con Codex.
 */
const SCREENS = Object.freeze({
  menu: {
    title: 'MENÚ PRINCIPAL', width: 1626, height: 967,
    image: './assets/ui/menu.png',
    areas: [
      { name: 'Jugar',         box: [31.3, 42.6, 35.6, 12.3], action: 'salas' },
      { name: 'Cómo jugar',    box: [31.7, 57.6, 35.1, 11.7], action: 'como' },
      { name: 'Salir',         box: [31.8, 70.8, 34.6, 11.1], action: 'salir' },
    ],
  },
  salas: {
    title: 'CREAR O UNIRSE A SALA', width: 1672, height: 941,
    image: './assets/ui/salas.png',
    areas: [
      { name: 'Crear sala de demostración', box: [10.8, 66.9, 35.1, 10.8], action: 'crear' },
      { name: 'Unirse a sala de demostración', box: [52.3, 67.0, 35.6, 10.8], action: 'unirse' },
      { name: 'Volver al menú principal', box: [38.3, 86.6, 22.0, 8.1], action: 'menu' },
    ],
  },
  lobby: {
    title: 'LOBBY DE PARTIDA', width: 1670, height: 942,
    image: './assets/ui/lobby.png',
    areas: [
      { name: 'Copiar código de sala de demostración', box: [83.8, 35.7, 5.1, 7.1], action: 'copiar' },
      { name: 'Cambiar estado listo', box: [60.6, 66.9, 28.4, 8.7], action: 'listo' },
      { name: 'Salir de la sala', box: [37.5, 86.8, 24.3, 8.7], action: 'salas' },
    ],
  },
  como: {
    title: 'CÓMO JUGAR', width: 1671, height: 941,
    image: './assets/ui/como-jugar.png',
    areas: [
      { name: 'Regresar al menú principal', box: [40.6, 87.2, 18.1, 7.4], action: 'menu' },
    ],
  },
  resultados: {
    title: 'RESULTADOS DE LA PARTIDA', width: 1671, height: 941,
    image: './assets/ui/resultados.png',
    areas: [
      { name: 'Nueva partida (simulada)', box: [15.8, 75.5, 32.7, 9.0], action: 'nueva' },
      { name: 'Volver al lobby', box: [50.5, 75.5, 32.3, 9.1], action: 'lobby' },
    ],
  },
});

const els = {
  frame: document.getElementById('stage'),
  image: document.getElementById('screenImage'),
  layer: document.getElementById('interactiveLayer'),
  caption: document.getElementById('screenCaption'),
  nav: document.querySelector('.screen-nav'),
  toast: document.getElementById('toast'),
  toggleAreas: document.getElementById('toggleAreas'),
  dialog: document.getElementById('infoDialog'),
  dialogTitle: document.getElementById('dialogTitle'),
  dialogBody: document.getElementById('dialogBody'),
  header: document.querySelector('.tool-header'),
  footer: document.querySelector('.status-line'),
};

const DEMO_CODE = 'K7P4';
const state = { current:'menu', joinCode:'', ready:false };
let toastTimer;

function setBox(element, [x, y, w, h]) {
  Object.assign(element.style, {
    left:`${x}%`, top:`${y}%`, width:`${w}%`, height:`${h}%`,
  });
}
function showToast(message) {
  clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.classList.add('visible');
  toastTimer = setTimeout(() => els.toast.classList.remove('visible'), 4500);
}
function showDialog(title, message) {
  els.dialogTitle.textContent = title;
  els.dialogBody.textContent = message;
  if (!els.dialog.open) els.dialog.showModal();
}
function makeArea({ name, box, action }) {
  const button = document.createElement('button');
  button.type='button'; button.className='hotspot';
  button.setAttribute('aria-label', name);
  button.title=name;
  setBox(button, box);
  button.addEventListener('click', () => actionHandler(action));
  return button;
}
function addRoomInput() {
  const input = document.createElement('input');
  input.type='text';
  input.id='roomCodeInput';
  input.className='join-input';
  input.maxLength=4;
  input.autocomplete='off';
  input.spellcheck=false;
  input.inputMode='text';
  input.placeholder='CÓDIGO DE SALA';
  input.setAttribute('aria-label', 'Código de sala de demostración, ejemplo K7P4');
  input.value=state.joinCode;
  setBox(input, [55.0, 50.0, 31.7, 8.3]);
  input.addEventListener('input', () => {
    input.value=input.value.replace(/[^A-Za-z0-9]/g,'').toUpperCase().slice(0,4);
    state.joinCode=input.value;
  });
  input.addEventListener('keydown', e => {
    if(e.key==='Enter'){ e.preventDefault(); actionHandler('unirse'); }
  });
  els.layer.append(input);
}
function addReadyBadge() {
  if (state.ready) return; // La imagen muestra LISTO; solo cubrir si está NO LISTO
  const badge=document.createElement('span');
  badge.className='ready-badge';
  badge.textContent='NO LISTO';
  badge.setAttribute('aria-hidden','true');
  setBox(badge, [45.9, 35.5, 8.2, 6.1]);
  els.layer.append(badge);
}
function addReadyButtonOverride() {
  if (!state.ready) return;
  const button=[...els.layer.querySelectorAll('.hotspot')].find(el=>el.getAttribute('aria-label')==='Cambiar estado listo');
  if(!button) return;
  const patch=document.createElement('span');
  patch.className='ready-patch';
  patch.setAttribute('aria-hidden','true');
  patch.textContent='CANCELAR LISTO';
  button.append(patch);
}
function sizeStage() {
  const spec=SCREENS[state.current];
  const availableHeight=Math.max(170, window.innerHeight - els.header.offsetHeight - els.footer.offsetHeight - 24);
  const availableWidth=Math.max(260, window.innerWidth - 24);
  const width=Math.min(availableWidth, availableHeight * spec.width / spec.height);
  els.frame.style.setProperty('--stage-width', `${Math.floor(width)}px`);
}
function goTo(page, {announce=false}={}) {
  const spec=SCREENS[page];
  if(!spec) return;
  state.current=page;
  els.frame.style.setProperty('--screen-ratio', String(spec.width/spec.height));
  els.image.src=spec.image;
  els.image.width=spec.width;
  els.image.height=spec.height;
  els.image.alt=`Diseño visual aprobado: ${spec.title.toLowerCase()}`;
  els.frame.setAttribute('aria-label',spec.title);
  els.caption.textContent=spec.title;
  els.layer.replaceChildren();
  for(const area of spec.areas) els.layer.append(makeArea(area));
  if(page==='salas') addRoomInput();
  if(page==='lobby'){ addReadyBadge(); addReadyButtonOverride(); }
  for(const btn of els.nav.querySelectorAll('[data-goto]')) {
    if(btn.dataset.goto===page) btn.setAttribute('aria-current','page');
    else btn.removeAttribute('aria-current');
  }
  sizeStage();
  if(announce) showToast(`Pantalla de demostración: ${spec.title.toLowerCase()}`);
}
function actionHandler(action) {
  if (SCREENS[action]) return goTo(action);
  switch(action){
    case 'crear':
      state.ready=false;
      goTo('lobby');
      showToast(`Sala ${DEMO_CODE} de ejemplo. No se ha creado una sala en el servidor.`);
      break;
    case 'unirse':
      if(state.joinCode.length===0){
        showToast(`Prueba el código ${DEMO_CODE} para entrar a la sala simulada.`);
        document.getElementById('roomCodeInput')?.focus();
        return;
      }
      if(state.joinCode!==DEMO_CODE){
        showDialog('Código no disponible', `Este prototipo solo simula la sala ${DEMO_CODE}. Unirse a salas reales queda pendiente de integrar con el servidor.`);
        return;
      }
      state.ready=false;
      goTo('lobby');
      showToast('Entraste a una sala simulada. Los jugadores y sus estados son datos de referencia.');
      break;
    case 'copiar': {
      const copied = navigator.clipboard?.writeText?.(DEMO_CODE);
      if(copied) copied.then(() => showToast(`Código de ejemplo ${DEMO_CODE} copiado.`))
                       .catch(() => showDialog('Código de ejemplo', `Copia manualmente este código de la pantalla: ${DEMO_CODE}`));
      else showDialog('Código de ejemplo', `Copia manualmente este código de la pantalla: ${DEMO_CODE}`);
      break;
    }
    case 'listo':
      state.ready=!state.ready;
      goTo('lobby');
      showToast(state.ready ? 'Marcado como LISTO (solo simulación). La partida real todavía no se inicia.' : 'Estado cambiado a NO LISTO (solo simulación).');
      break;
    case 'nueva':
      state.ready=false;
      goTo('lobby');
      showToast('Se preparó una nueva ronda simulada. La conexión real queda pendiente.');
      break;
    case 'salir':
      showDialog('Salir de CyberGrid', 'Esta pantalla es una demostración. Al integrarla con la aplicación real, el botón SALIR podrá cerrar la sesión o regresar a la pantalla indicada por el equipo. Puedes cerrar esta pestaña para salir del prototipo.');
      break;
    default: showToast('Acción de demostración.');
  }
}

for(const b of document.querySelectorAll('[data-goto]')){
  b.addEventListener('click',()=>goTo(b.dataset.goto, {announce:true}));
}
els.toggleAreas.addEventListener('click',()=>{
  const visible=document.body.classList.toggle('show-areas');
  els.toggleAreas.setAttribute('aria-pressed',String(visible));
  showToast(visible?'Zonas clicables visibles. Presiona H para ocultarlas.':'Zonas clicables ocultas.');
});
document.addEventListener('keydown',event=>{
  if(event.key.toLowerCase()!=='h'||event.ctrlKey||event.metaKey||event.altKey) return;
  if(/input|textarea/i.test(document.activeElement?.tagName || '')) return;
  if(els.dialog.open) return;
  els.toggleAreas.click();
});
window.addEventListener('resize',sizeStage);
window.addEventListener('hashchange',()=>{
  const target=location.hash.slice(1);
  if(SCREENS[target]&&target!==state.current) goTo(target);
});

// Se puede abrir una pantalla concreta con index.html#salas, #lobby, etc.
goTo(SCREENS[location.hash.slice(1)]?location.hash.slice(1):'menu');

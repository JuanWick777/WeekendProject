// Original transparent PNGs by A; orientation is cosmetic, aiming stays continuous.
const sources = [
  [
    new URL('../../prototypes/a-canvas/assets/drones/rojo/n.png', import.meta.url).href,
    new URL('../../prototypes/a-canvas/assets/drones/rojo/ne.png', import.meta.url).href,
    new URL('../../prototypes/a-canvas/assets/drones/rojo/e.png', import.meta.url).href,
    new URL('../../prototypes/a-canvas/assets/drones/rojo/se.png', import.meta.url).href,
    new URL('../../prototypes/a-canvas/assets/drones/rojo/s.png', import.meta.url).href,
    new URL('../../prototypes/a-canvas/assets/drones/rojo/so.png', import.meta.url).href,
    new URL('../../prototypes/a-canvas/assets/drones/rojo/o.png', import.meta.url).href,
    new URL('../../prototypes/a-canvas/assets/drones/rojo/no.png', import.meta.url).href,
  ],
  [
    new URL('../../prototypes/a-canvas/assets/drones/amarillo/n.png', import.meta.url).href,
    new URL('../../prototypes/a-canvas/assets/drones/amarillo/ne.png', import.meta.url).href,
    new URL('../../prototypes/a-canvas/assets/drones/amarillo/e.png', import.meta.url).href,
    new URL('../../prototypes/a-canvas/assets/drones/amarillo/se.png', import.meta.url).href,
    new URL('../../prototypes/a-canvas/assets/drones/amarillo/s.png', import.meta.url).href,
    new URL('../../prototypes/a-canvas/assets/drones/amarillo/so.png', import.meta.url).href,
    new URL('../../prototypes/a-canvas/assets/drones/amarillo/o.png', import.meta.url).href,
    new URL('../../prototypes/a-canvas/assets/drones/amarillo/no.png', import.meta.url).href,
  ],
  [
    new URL('../../prototypes/a-canvas/assets/drones/morado/n.png', import.meta.url).href,
    new URL('../../prototypes/a-canvas/assets/drones/morado/ne.png', import.meta.url).href,
    new URL('../../prototypes/a-canvas/assets/drones/morado/e.png', import.meta.url).href,
    new URL('../../prototypes/a-canvas/assets/drones/morado/se.png', import.meta.url).href,
    new URL('../../prototypes/a-canvas/assets/drones/morado/s.png', import.meta.url).href,
    new URL('../../prototypes/a-canvas/assets/drones/morado/so.png', import.meta.url).href,
    new URL('../../prototypes/a-canvas/assets/drones/morado/o.png', import.meta.url).href,
    new URL('../../prototypes/a-canvas/assets/drones/morado/no.png', import.meta.url).href,
  ],
  [
    new URL('../../prototypes/a-canvas/assets/drones/verde/n.png', import.meta.url).href,
    new URL('../../prototypes/a-canvas/assets/drones/verde/ne.png', import.meta.url).href,
    new URL('../../prototypes/a-canvas/assets/drones/verde/e.png', import.meta.url).href,
    new URL('../../prototypes/a-canvas/assets/drones/verde/se.png', import.meta.url).href,
    new URL('../../prototypes/a-canvas/assets/drones/verde/s.png', import.meta.url).href,
    new URL('../../prototypes/a-canvas/assets/drones/verde/so.png', import.meta.url).href,
    new URL('../../prototypes/a-canvas/assets/drones/verde/o.png', import.meta.url).href,
    new URL('../../prototypes/a-canvas/assets/drones/verde/no.png', import.meta.url).href,
  ],
];
let skins; let loading;

export function preloadSkins() {
  if (!loading) {
    loading = Promise.all(sources.map((directions) => Promise.all(directions.map((src) => new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Could not load A drone sprite: ' + src));
      image.src = src;
    }))))).then((loaded) => { skins = loaded; }).catch((error) => { loading = null; throw error; });
  }
  return loading;
}

export function drawSkin(context, player, index) {
  if (!skins) return;
  const angle = Math.atan2(player.aimY ?? -1, player.aimX ?? 0) + Math.PI / 2;
  const direction = ((Math.round(angle / (Math.PI / 4)) % 8) + 8) % 8;
  // 72 px at A's radius 18 becomes 40 at our common radius 10.
  // The transparent margins remain; the metal body matches the 20-unit hitbox.
  context.drawImage(skins[index % skins.length][direction], player.x - 20, player.y - 20, 40, 40);
}

export const skinPortrait = (index) => sources[((index % sources.length) + sources.length) % sources.length][0];

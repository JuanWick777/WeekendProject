import { describe, expect, it } from 'vitest';
import { createViewport, screenToWorld } from '../src/game/viewport.js';

describe('encuadre y coordenadas del apuntado', () => {
  it('conserva proporciones y descuenta las bandas del mapa al apuntar', () => {
    const viewport = createViewport(1200, 640, 768, 640);
    expect(viewport).toEqual({ scale: 1, offsetX: 216, offsetY: 0 });
    expect(screenToWorld(600, 320, viewport)).toEqual({ x: 384, y: 320 });
  });
  it('mantiene el mismo punto del mundo con escala móvil y zoom', () => {
    for (const zoom of [1, 2]) {
      const viewport = createViewport(540, 250, 768, 640, { zoom, focusX: 384, focusY: 320 });
      const point = screenToWorld(123 * viewport.scale + viewport.offsetX, 234 * viewport.scale + viewport.offsetY, viewport);
      expect(point.x).toBeCloseTo(123); expect(point.y).toBeCloseTo(234);
    }
  });
  it('limita la cámara junto al borde y evita mostrar espacio fuera del mundo', () => {
    const viewport = createViewport(500, 250, 768, 640, { zoom: 2, focusX: 0, focusY: 0 });
    expect(viewport.offsetY).toBe(0);
    const far = createViewport(500, 250, 768, 640, { zoom: 2, focusX: 768, focusY: 640 });
    expect(far.offsetY + 640 * far.scale).toBe(250);
  });
});

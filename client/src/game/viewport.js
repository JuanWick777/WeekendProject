export function createViewport(width, height, worldWidth, worldHeight, { zoom = 1, focusX = worldWidth / 2, focusY = worldHeight / 2 } = {}) {
  const scale = Math.min(width / worldWidth, height / worldHeight) * zoom;
  const offset = (size, worldSize, focus) => {
    if (worldSize * scale <= size) return (size - worldSize * scale) / 2;
    const halfVisible = size / (2 * scale);
    return size / 2 - Math.max(halfVisible, Math.min(worldSize - halfVisible, focus)) * scale;
  };
  return { scale, offsetX: offset(width, worldWidth, focusX), offsetY: offset(height, worldHeight, focusY) };
}

export function screenToWorld(x, y, viewport) {
  return { x: (x - viewport.offsetX) / viewport.scale, y: (y - viewport.offsetY) / viewport.scale };
}

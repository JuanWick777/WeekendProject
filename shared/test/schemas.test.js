import { describe, expect, it } from 'vitest';
import { clientMessageSchema, seedSchema } from '../src/schemas.js';

function input(overrides = {}) {
  return {
    type: 'input',
    payload: {
      seq: 1,
      moveX: 1,
      moveY: 0,
      aimX: 0,
      aimY: -1,
      attack: true,
      ...overrides,
    },
  };
}

describe('contrato de input de disparo', () => {
  it('permite moverse y apuntar en direcciones independientes', () => {
    expect(clientMessageSchema.parse(input()).payload.aimY).toBe(-1);
  });

  it('rechaza coordenadas autoritativas inyectadas por el cliente', () => {
    expect(clientMessageSchema.safeParse(input({ x: 500 })).success).toBe(false);
  });

  it('rechaza un disparo sin dirección de apuntado', () => {
    expect(clientMessageSchema.safeParse(input({ aimX: 0, aimY: 0 })).success).toBe(false);
  });
});

describe('contrato de la carga de evaluación', () => {
  it('admite lotes reproducibles de 100 y 1000 partidas', () => {
    for (const matches of [100, 1_000]) {
      expect(seedSchema.safeParse({ seed: 42, matches, batchId: 'audit-001' }).success).toBe(true);
    }
  });

  it('rechaza lotes fuera del límite y cantidades fraccionarias', () => {
    for (const matches of [99, 1_001, 100.5]) {
      expect(seedSchema.safeParse({ seed: 42, matches, batchId: 'audit-001' }).success).toBe(false);
    }
  });
});

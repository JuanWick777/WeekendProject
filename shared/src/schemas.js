import { z } from 'zod';
import { CLIENT_MESSAGES } from './protocol.js';

const axis = z.number().finite().min(-1).max(1);
const username = z.string().trim().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/).toLowerCase();
const password = z.string().min(8).max(128);

export const inputPayloadSchema = z.strictObject({
  seq: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  moveX: axis,
  moveY: axis,
  aimX: axis,
  aimY: axis,
  attack: z.boolean(),
}).refine(
  (input) => !input.attack || Math.hypot(input.aimX, input.aimY) > 0.001,
  { path: ['aimX'], message: 'Disparar requiere una dirección de apuntado.' },
);

export const inputMessageSchema = z.strictObject({
  type: z.literal(CLIENT_MESSAGES.INPUT),
  payload: inputPayloadSchema,
});

export const pingMessageSchema = z.strictObject({
  type: z.literal(CLIENT_MESSAGES.PING),
  payload: z.strictObject({
    id: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    sentAtMs: z.number().finite().nonnegative(),
  }),
});

export const clientMessageSchema = z.discriminatedUnion('type', [
  inputMessageSchema,
  pingMessageSchema,
]);

export const registerSchema = z.strictObject({
  username,
  displayName: z.string().trim().min(1).max(20),
  password,
});

export const loginSchema = z.strictObject({ username, password });
export const createRoomSchema = z.strictObject({
  name: z.string().trim().min(1).max(32),
});
export const roomCodeSchema = z.string().trim().toUpperCase().regex(/^[A-Z0-9]{6}$/);
export const readySchema = z.strictObject({ ready: z.boolean() });
export const seedSchema = z.strictObject({
  seed: z.number().int().min(0).max(4_294_967_295),
  matches: z.number().int().min(100).max(1_000),
  batchId: z.string().min(3).max(64).regex(/^[a-zA-Z0-9_-]+$/),
});

export const telemetryQuerySchema = z.strictObject({
  source: z.enum(['all', 'live', 'seed']).default('all'),
});

import { movePlayer } from '@cybergrid/shared/movement';

export function createSnapshotBuffer(map,localId,{delayMs = 100} = {}) {
  const discontinuities = new Map(); const history = []; let latest = null; let receivedAt = 0; let pending = [];
  function push(snapshot,at) {
    if (latest && snapshot.tick < latest.tick) return;
    if(latest)for(const player of snapshot.players) {
      const previous=latest.players.find((p)=>p.id===player.id);
      if(previous&&(previous.alive!==player.alive||Math.hypot(previous.x-player.x,previous.y-player.y)>80))discontinuities.set(player.id,snapshot.serverTimeMs);
    }
    latest = structuredClone(snapshot); receivedAt = at; history.push(latest);
    if (history.length > 12) history.shift();
    const local = latest.players.find((p) => p.id === localId);
    pending = local?.alive ? pending.filter((p) => p.seq > local.lastProcessedSeq && at - p.at < 250) : [];
  }
  return {
    push,
    get latest() { return latest; },
    record(seq,input,at) { pending.push({seq,input:{...input},at}); pending = pending.slice(-6); },
    clear() { pending = []; },
    render(at,input,enabled) {
      if (!latest) return null;
      const time = latest.serverTimeMs + Math.min(Math.max(0,at - receivedAt),150) - delayMs;
      let before = history[0]; let after = latest;
      for (const state of history) { if (state.serverTimeMs <= time) before = state; if (state.serverTimeMs >= time) { after = state; break; } }
      const span = after.serverTimeMs - before.serverTimeMs;
      const fraction = span > 0 ? Math.max(0,Math.min(1,(time - before.serverTimeMs) / span)) : 1;
      const state = {...latest,players:latest.players.map((p) => ({...p})),projectiles:latest.projectiles.map((p) => ({...p}))};
      for (const player of state.players) {
        if (player.id === localId) {
          if (enabled && player.alive && !player.forfeited) {
            const commands = pending.filter((p) => at - p.at < 250);
            if (commands.length) commands.forEach((command,i) => {
              const end = commands[i+1]?.at ?? at;
              movePlayer(player,command.input,Math.max(0,Math.min(50,end - command.at))/1000,map);
            });
            else movePlayer(player,input,Math.min(Math.max(0,at - receivedAt),100)/1000,map);
            player.aimX = input.aimX; player.aimY = input.aimY;
          }
          continue;
        }
        if(time <= (discontinuities.get(player.id) ?? -Infinity))continue;
        const a = before.players.find((p) => p.id === player.id); const b = after.players.find((p) => p.id === player.id);
        if (a && b && a.alive === b.alive && a.alive === player.alive && Math.hypot(b.x-a.x,b.y-a.y) < 80) {
          player.x = a.x + (b.x-a.x)*fraction; player.y = a.y + (b.y-a.y)*fraction;
        }
      }
      for (const projectile of state.projectiles) {
        const a = before.projectiles.find((p) => p.id === projectile.id); const b = after.projectiles.find((p) => p.id === projectile.id);
        if (a && b) { projectile.x = a.x+(b.x-a.x)*fraction; projectile.y = a.y+(b.y-a.y)*fraction; }
      }
      return state;
    },
  };
}

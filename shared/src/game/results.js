export function buildResult(state, reason) {
  const players = [...state.players.values()];
  const candidates = players.filter((player) => !player.forfeited).sort((a, b) =>
    Math.floor(b.controlUs / 1_000_000) - Math.floor(a.controlUs / 1_000_000)
    || b.kills - a.kills || a.deaths - b.deaths);
  const first = candidates[0];
  const tied = first ? candidates.filter((player) => Math.floor(player.controlUs / 1_000_000) === Math.floor(first.controlUs / 1_000_000)
    && player.kills === first.kills && player.deaths === first.deaths) : [];
  const winnerId = reason === 'empty' ? null : reason === 'forfeit' ? first?.id ?? null : tied.length === 1 ? first.id : null;
  const drawPlayerIds = reason === 'time' && tied.length > 1 ? tied.map((player) => player.id) : [];
  return {
    matchId: state.matchId, roomCode: state.roomCode, mode: state.rules.mode,
    seed: state.map.seed, templateId: state.map.templateId,
    templateVersion: state.map.templateVersion, generatorVersion: state.map.generatorVersion,
    startedAtMs: state.startedAtMs, endedAtMs: state.startedAtMs + state.elapsedUs / 1000,
    durationMs: state.elapsedUs / 1000, status: reason === 'empty' ? 'aborted' : 'completed', finishReason: reason,
    winnerId, drawPlayerIds,
    players: players.map((player) => ({
      playerId: player.id, displayName: player.displayName, score: Math.floor(player.controlUs / 1_000_000),
      controlTimeMs: player.controlUs / 1000, kills: player.kills, deaths: player.deaths,
      aliveMs: player.aliveUs / 1000, participatedMs: player.participatedUs / 1000,
      won: player.id === winnerId, draw: drawPlayerIds.includes(player.id), forfeited: player.forfeited,
    })),
  };
}

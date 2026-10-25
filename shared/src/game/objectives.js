export function objectiveState(map, players, elapsedUs, startedAtMs, rules) {
  const intervalUs = rules.nodeDurationMs * 1000;
  const rotationIndex = Math.min(map.nodes.length - 1, Math.floor(elapsedUs / intervalUs));
  const node = map.nodes[rotationIndex];
  const occupants = [...players.values()].filter((player) => player.alive && !player.forfeited
    && Math.hypot(player.x - node.x, player.y - node.y) <= node.radius);
  const untilUs = Math.min((rotationIndex + 1) * intervalUs, rules.durationMs * 1000);
  return {
    activeNodeId: node.id, rotationIndex,
    status: occupants.length === 0 ? 'empty' : occupants.length === 1 ? 'controlled' : 'contested',
    controllerId: occupants.length === 1 ? occupants[0].id : null,
    changesAtMs: startedAtMs + untilUs / 1000,
    nextNodeId: rotationIndex < map.nodes.length - 1 && untilUs - elapsedUs <= rules.nodePreviewMs * 1000
      ? map.nodes[rotationIndex + 1].id : null,
  };
}

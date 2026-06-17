import { eventDeck } from "./events.js";
import { sectorMap } from "./map.js";
import { appendLog, cloneGame, formatSystem, getCurrentSector, getStoryFragment } from "./state.js";

const SYSTEMS = ["reactor", "life_support", "sensors", "archives", "propulsion"];

export function executeGameCommand(command, args, game) {
  switch (command) {
    case "status":
      return { game, lines: formatStatus(game) };
    case "scan":
      return scanSector(game);
    case "logs":
      return { game, lines: game.logs.slice(-16) };
    case "map":
      return { game, lines: formatMap(game) };
    case "jump":
      return jumpSector(game, args[0]);
    case "repair":
      return repairSystem(game, args[0]);
    case "power":
      return allocatePower(game, args[0], Number(args[1]));
    case "wait":
      return advanceTurn(game, "Operator waits through one ship cycle.");
    default:
      return { game, lines: [`${command}: no game handler`] };
  }
}

export function advanceTurn(game, reason = "Ship cycle advanced.") {
  if (game.status !== "active") return { game, lines: [`Run already ${game.status}.`] };

  let next = cloneGame(game);
  next.ship.turn += 1;

  const lifeSupportPower = next.power.life_support;
  const reactorPower = next.power.reactor;
  const sensorPower = next.power.sensors;

  next.ship.power = clamp(next.ship.power + Math.floor((reactorPower - 30) / 8), 0, 100);
  next.ship.oxygen = clamp(next.ship.oxygen + Math.floor((lifeSupportPower - 24) / 7) - 1, 0, 100);
  next.ship.heat = clamp(next.ship.heat + Math.floor((reactorPower - 28) / 9) - (next.power.propulsion < 8 ? 0 : 1), 0, 100);
  next.ship.signal = clamp(next.ship.signal + Math.floor(sensorPower / 15), 0, 100);

  const lines = [`[CYCLE ${next.ship.turn}] ${reason}`];
  next = appendLog(next, `[CYCLE ${next.ship.turn}] ${reason}`);

  if (next.ship.turn % 2 === 0) {
    const eventId = next.eventOrder[next.eventIndex % next.eventOrder.length];
    const event = eventDeck.find((candidate) => candidate.id === eventId);
    next.eventIndex += 1;
    next = applyEffects(next, event.effects);
    const eventLine = `[${event.severity.toUpperCase()}] ${event.title}: ${event.description}`;
    lines.push(eventLine);
    next = appendLog(next, eventLine);
  }

  const terminal = evaluateTerminalState(next);
  next = terminal.game;
  lines.push(...terminal.lines);

  return { game: next, lines };
}

export function scanSector(game) {
  if (game.status !== "active") return { game, lines: [`Run already ${game.status}.`] };

  let next = cloneGame(game);
  const sector = getCurrentSector(next);
  const lines = [
    `SECTOR ${next.ship.location}: ${sector.name}`,
    sector.description,
    `Adjacent sectors: ${sector.links.join(", ")}`,
    `Signal strength: ${next.ship.signal + sector.signal}`,
  ];

  if (sector.fragment && !next.discoveredFragments.includes(sector.fragment)) {
    const fragment = getStoryFragment(sector.fragment);
    next.discoveredFragments.push(sector.fragment);
    lines.push("", `[ARCHIVE] ${fragment.title}`, fragment.text);
    next = appendLog(next, `[ARCHIVE] Recovered ${fragment.title}.`);
  }

  const cycle = advanceTurn(next, "Sensor sweep completed.");
  return { game: cycle.game, lines: [...lines, ...cycle.lines] };
}

export function jumpSector(game, destination) {
  if (!destination) return { game, lines: ["jump: missing sector id"] };
  if (!sectorMap[destination]) return { game, lines: [`jump: ${destination}: sector not found`] };
  if (game.status !== "active") return { game, lines: [`Run already ${game.status}.`] };

  const current = getCurrentSector(game);
  if (!current.links.includes(destination)) {
    return { game, lines: [`jump: ${destination}: not reachable from ${game.ship.location}`] };
  }

  let next = cloneGame(game);
  next.ship.location = destination;
  next.ship.fuel = clamp(next.ship.fuel - 8, 0, 100);
  if (!next.visited.includes(destination)) next.visited.push(destination);

  const sector = getCurrentSector(next);
  const lines = [`[NAV] Jump complete: ${destination} - ${sector.name}.`, sector.description];
  next = appendLog(next, `[NAV] Jumped to ${destination}.`);

  const cycle = advanceTurn(next, `Propulsion burn completed for ${destination}.`);
  return { game: cycle.game, lines: [...lines, ...cycle.lines] };
}

export function repairSystem(game, system) {
  if (!system) return { game, lines: [`repair: missing system (${SYSTEMS.join(", ")})`] };
  if (!SYSTEMS.includes(system)) return { game, lines: [`repair: ${system}: unknown system`] };
  if (game.status !== "active") return { game, lines: [`Run already ${game.status}.`] };

  let next = cloneGame(game);
  const current = next.systems[system];
  if (current === "nominal") return { game, lines: [`[INFO] ${formatSystem(system)} already nominal.`] };

  const cost = system === "reactor" ? 10 : 8;
  if (next.ship.power < cost) return { game, lines: [`[WARN] Repair requires ${cost} power.`] };

  next.ship.power = clamp(next.ship.power - cost, 0, 100);
  next.systems[system] = current === "damaged" || current === "corrupted" ? "unstable" : "nominal";
  const line = `[REPAIR] ${formatSystem(system)} improved to ${next.systems[system]}.`;
  next = appendLog(next, line);

  const cycle = advanceTurn(next, `${formatSystem(system)} repair routine executed.`);
  return { game: cycle.game, lines: [line, ...cycle.lines] };
}

export function allocatePower(game, system, amount) {
  if (!system || Number.isNaN(amount)) return { game, lines: ["power: usage: power <system> <amount>"] };
  if (!SYSTEMS.includes(system)) return { game, lines: [`power: ${system}: unknown system`] };
  if (amount < 0 || amount > 60) return { game, lines: ["power: amount must be between 0 and 60"] };
  if (game.status !== "active") return { game, lines: [`Run already ${game.status}.`] };

  let next = cloneGame(game);
  next.power[system] = Math.floor(amount);
  const total = Object.values(next.power).reduce((sum, value) => sum + value, 0);
  if (total > 100) {
    return { game, lines: [`[WARN] Allocation rejected. Total grid demand would be ${total}/100.`] };
  }

  const line = `[POWER] ${formatSystem(system)} allocation set to ${Math.floor(amount)}. Grid demand ${total}/100.`;
  next = appendLog(next, line);
  return { game: next, lines: [line] };
}

export function formatStatus(game) {
  const sector = getCurrentSector(game);
  return [
    "CSV SIMURGH STATUS",
    `seed: ${game.seed}`,
    `objective: ${game.objective}`,
    `run: ${game.status}`,
    `turn: ${game.ship.turn}`,
    `location: ${game.ship.location} - ${sector.name}`,
    "",
    `hull:   ${bar(game.ship.hull)} ${game.ship.hull}`,
    `power:  ${bar(game.ship.power)} ${game.ship.power}`,
    `oxygen: ${bar(game.ship.oxygen)} ${game.ship.oxygen}`,
    `fuel:   ${bar(game.ship.fuel)} ${game.ship.fuel}`,
    `heat:   ${bar(100 - game.ship.heat)} ${game.ship.heat}`,
    `signal: ${bar(game.ship.signal)} ${game.ship.signal}`,
    "",
    `systems: ${SYSTEMS.map((system) => `${system}=${game.systems[system]}`).join("  ")}`,
    `power grid: ${SYSTEMS.map((system) => `${system}=${game.power[system]}`).join("  ")}`,
    `archives recovered: ${game.discoveredFragments.length}/3`,
  ];
}

function formatMap(game) {
  return Object.entries(sectorMap).map(([id, sector]) => {
    const marker = game.ship.location === id ? "*" : game.visited.includes(id) ? "+" : "?";
    const name = game.visited.includes(id) || game.ship.location === id ? sector.name : "unscanned sector";
    const links = game.visited.includes(id) || game.ship.location === id ? ` -> ${sector.links.join(", ")}` : "";
    return `${marker} ${id} ${name}${links}`;
  });
}

function applyEffects(game, effects) {
  const next = cloneGame(game);
  for (const [key, delta] of Object.entries(effects)) {
    next.ship[key] = clamp(next.ship[key] + delta, 0, 100);
  }
  return next;
}

function evaluateTerminalState(game) {
  let next = game;
  const lines = [];

  if (next.ship.hull <= 0) {
    next = { ...next, status: "lost" };
    lines.push("[LOSS] Hull integrity failed. The Simurgh stops answering commands.");
  } else if (next.ship.oxygen <= 0) {
    next = { ...next, status: "lost" };
    lines.push("[LOSS] Habitable pressure collapsed across operator sections.");
  } else if (next.ship.fuel <= 0) {
    next = { ...next, status: "lost" };
    lines.push("[LOSS] Propellant reserve exhausted before objective completion.");
  } else if (next.ship.heat >= 100) {
    next = { ...next, status: "lost" };
    lines.push("[LOSS] Thermal limits exceeded. Reactor safeties cannot recover.");
  } else if (next.ship.location === "sector-06" && next.discoveredFragments.length >= 3) {
    next = { ...next, status: "won" };
    lines.push("[WIN] Beacon terminus synchronized. Archive route reconstructed.");
  }

  for (const line of lines) next = appendLog(next, line);
  return { game: next, lines };
}

function bar(value) {
  const filled = Math.max(0, Math.min(10, Math.round(value / 10)));
  return `[${"#".repeat(filled)}${".".repeat(10 - filled)}]`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

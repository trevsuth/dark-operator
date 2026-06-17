import { eventDeck } from "./events.js";
import { sectorMap } from "./map.js";
import { analyzeSystemFaults, getSystemArtifactPaths, getSystemRoot } from "./repairSystems.js";
import { appendLog, cloneGame, formatSystem, getCurrentSector, getStoryFragment } from "./state.js";

const SYSTEMS = ["reactor", "life_support", "sensors", "archives", "propulsion"];

export function executeGameCommand(command, args, game, context = {}) {
  switch (command) {
    case "status":
      return { game, lines: formatStatusCommand(game, args, context) };
    case "scan":
      return scanSector(game);
    case "logs":
      return { game, lines: game.logs.slice(-16) };
    case "map":
      return { game, lines: formatMapCommand(game, args) };
    case "jump":
      return jumpSector(game, args[0]);
    case "repair":
      return repairSystem(game, args[0], context);
    case "power":
      return allocatePower(game, args[0], Number(args[1]));
    case "wait":
      return advanceTurn(game, "Operator waits through one ship cycle.");
    default:
      return { game, lines: [`${command}: no game handler`] };
  }
}

function formatStatusCommand(game, args = [], context = {}) {
  if (!args.length) return formatStatus(game);
  if (args[0] === "-a" || args[0] === "--all") return formatAllSystemStatus(game, context);
  if (args[0] === "-v" || args[0] === "--visual") return formatVisualStatus(game, context);

  const system = normalizeSystemName(args[0]);
  if (!SYSTEMS.includes(system)) {
    return [`status: ${args[0]}: unknown system`, `valid systems: ${SYSTEMS.join(", ")}`];
  }

  return formatSystemDetail(game, system, context);
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
  next.environment = advanceEnvironment(next);

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

export function repairSystem(game, system, context = {}) {
  if (!system) return { game, lines: [`repair: missing system (${SYSTEMS.join(", ")})`] };
  system = normalizeSystemName(system);
  if (!SYSTEMS.includes(system)) return { game, lines: [`repair: ${system}: unknown system`] };
  if (game.status !== "active") return { game, lines: [`Run already ${game.status}.`] };

  let next = cloneGame(game);
  const faults = getArtifactFaults(system, context);
  if (faults.length) {
    next.systems[system] = next.systems[system] === "nominal" ? "unstable" : next.systems[system];
    return {
      game: next,
      lines: [
        `[REPAIR] ${formatSystem(system)} validation failed.`,
        `active artifact faults: ${faults.length}`,
        ...faults.flatMap((fault) => [
          `- ${fault.title}`,
          `  evidence: ${fault.file.replace("SYSTEM", system)}`,
          `  repair: ${fault.repair}`,
        ]),
      ],
    };
  }

  const current = next.systems[system];
  if (current === "nominal") return { game, lines: [`[INFO] ${formatSystem(system)} already nominal.`] };

  const cost = system === "reactor" ? 10 : 8;
  if (next.ship.power < cost) return { game, lines: [`[WARN] Repair requires ${cost} power.`] };

  next.ship.power = clamp(next.ship.power - cost, 0, 100);
  next.systems[system] = current === "damaged" || current === "corrupted" ? "unstable" : "nominal";
  const line = `[REPAIR] ${formatSystem(system)} artifact validation passed; state improved to ${next.systems[system]}.`;
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
    "environment:",
    `  atmosphere: O2 ${formatFixed(game.environment.oxygenPercent, 1)}%  N2 ${formatFixed(game.environment.nitrogenPercent, 1)}%  trace ${formatFixed(game.environment.tracePercent, 1)}%`,
    `  pressure:   ${formatFixed(game.environment.pressureKpa, 1)} kPa`,
    `  ambient:    ${formatFixed(game.environment.temperatureC, 1)} C`,
    `  humidity:   ${Math.round(game.environment.humidity)}%`,
    `  co2:        ${Math.round(game.environment.co2Ppm)} ppm`,
    `  partic.:    ${Math.round(game.environment.particulate)} ug/m3`,
    "",
    `systems: ${SYSTEMS.map((system) => `${system}=${game.systems[system]}`).join("  ")}`,
    `power grid: ${SYSTEMS.map((system) => `${system}=${game.power[system]}`).join("  ")}`,
    `archives recovered: ${game.discoveredFragments.length}/3`,
  ];
}

function formatVisualStatus(game, context = {}) {
  const sector = getCurrentSector(game);
  const systemRows = SYSTEMS.map((system) => {
    const artifactFaults = getArtifactFaults(system, context).length;
    const state = artifactFaults ? "fault" : game.systems[system];
    return `${system.padEnd(12)} ${state.padEnd(9)} ${miniBar(game.power[system], 60)} ${String(game.power[system]).padStart(2)}`;
  });
  const recentLogs = game.logs.slice(-5).map((line) => truncate(line, 72));

  return [
    "+----------------------------- CSV SIMURGH :: STATUS -----------------------------+",
    `| seed ${game.seed.padEnd(14)} run ${game.status.padEnd(7)} turn ${String(game.ship.turn).padStart(4)}  loc ${truncate(`${game.ship.location} ${sector.name}`, 28).padEnd(28)} |`,
    "+-------------------------------- RESOURCES --------------------------------------+",
    `| HULL   ${visualBar(game.ship.hull, 100, 28)} ${pct(game.ship.hull)}  POWER ${visualBar(game.ship.power, 100, 18)} ${pct(game.ship.power)} |`,
    `| OXYGEN ${visualBar(game.ship.oxygen, 100, 28)} ${pct(game.ship.oxygen)}  FUEL  ${visualBar(game.ship.fuel, 100, 18)} ${pct(game.ship.fuel)} |`,
    `| HEAT   ${visualBar(game.ship.heat, 100, 28, true)} ${pct(game.ship.heat)}  SIGNAL${visualBar(game.ship.signal, 100, 18)} ${pct(game.ship.signal)} |`,
    "+------------------------------ ENVIRONMENT --------------------------------------+",
    `| atm O2 ${formatFixed(game.environment.oxygenPercent, 1).padStart(4)}%  N2 ${formatFixed(game.environment.nitrogenPercent, 1).padStart(4)}%  trace ${formatFixed(game.environment.tracePercent, 1).padStart(3)}%     pressure ${formatFixed(game.environment.pressureKpa, 1).padStart(5)} kPa |`,
    `| temp ${formatFixed(game.environment.temperatureC, 1).padStart(5)} C   humidity ${String(Math.round(game.environment.humidity)).padStart(2)}%   CO2 ${String(Math.round(game.environment.co2Ppm)).padStart(4)} ppm   partic ${String(Math.round(game.environment.particulate)).padStart(3)} ug/m3 |`,
    "+------------------------------- SYSTEMS -----------------------------------------+",
    ...systemRows.map((row) => `| ${row.padEnd(78)} |`),
    "+------------------------------- OBJECTIVE ---------------------------------------+",
    `| archive fragments ${String(game.discoveredFragments.length).padStart(1)}/3  route links ${sector.links.join(", ").padEnd(26)} objective ${truncate(game.objective, 24).padEnd(24)} |`,
    "+--------------------------------- LOGS ------------------------------------------+",
    ...(recentLogs.length ? recentLogs : ["no recent logs"]).map((line) => `| ${line.padEnd(78)} |`),
    "+---------------------------------------------------------------------------------+",
  ];
}

function formatAllSystemStatus(game, context = {}) {
  return SYSTEMS.flatMap((system, index) => {
    const lines = formatSystemDetail(game, system, context);
    return index === 0 ? lines : ["", ...lines];
  });
}

function formatSystemDetail(game, system, context = {}) {
  const state = game.systems[system];
  const allocation = game.power[system];
  const profile = SYSTEM_PROFILES[system];
  const artifactFaults = getArtifactFaults(system, context);
  const lines = [
    `CSV SIMURGH SYSTEM STATUS: ${system.toUpperCase()}`,
    `state:       ${artifactFaults.length && state === "nominal" ? "unstable (artifact fault)" : state}`,
    `allocation:  ${allocation}/100 grid units`,
    `priority:    ${profile.priority}`,
    `location:    ${profile.location}`,
    `function:    ${profile.function}`,
    `artifacts:   ${getSystemRoot(system)}`,
    "",
    "readouts:",
    ...profile.readouts(game).map(([label, value]) => `  ${label.padEnd(16)} ${value}`),
    "",
    "diagnostics:",
    ...profile.diagnostics(game).map((line) => `  ${line}`),
    ...formatArtifactDiagnostics(system, artifactFaults),
  ];

  return lines;
}

function getArtifactFaults(system, context) {
  return context.fileSystem ? analyzeSystemFaults(system, context.fileSystem) : [];
}

function formatArtifactDiagnostics(system, faults) {
  if (!faults.length) {
    return [`  artifact validation clean. Inspect ${getSystemRoot(system)} for baseline files.`];
  }

  return [
    `  artifact validation reports ${faults.length} active issue${faults.length === 1 ? "" : "s"}.`,
    ...faults.flatMap((fault) => [
      `  - ${fault.title}`,
      `    evidence: ${fault.file.replace("SYSTEM", system)}`,
      `    repair: ${fault.repair}`,
    ]),
    `  run repair ${system} after correcting the listed files.`,
  ];
}

const SYSTEM_PROFILES = {
  reactor: {
    priority: "primary power and thermal risk",
    location: "aft core pressure bay",
    function: "maintains electrical reserves for shipboard systems",
    readouts: (game) => [
      ["grid output", `${game.ship.power}/100 reserve`],
      ["allocation", `${game.power.reactor}/60 local cap`],
      ["core heat", `${game.ship.heat}/100 load`],
      ["thermal trend", trendLabel(Math.floor((game.power.reactor - 28) / 9) - (game.power.propulsion < 8 ? 0 : 1))],
      ["ambient coupling", `${formatFixed(game.environment.temperatureC, 1)} C compartment bleed`],
    ],
    diagnostics: (game) => [
      systemStateLine(game, "reactor"),
      game.power.reactor < 30 ? "reactor allocation is below reserve-positive output." : "reactor allocation is sustaining reserve charge.",
      game.ship.heat > 70 ? "thermal margin is poor; reduce reactor allocation or improve heat rejection." : "thermal margin remains within emergency operating range.",
    ],
  },
  life_support: {
    priority: "habitable atmosphere",
    location: "loop B pressure and scrubber manifold",
    function: "regulates oxygen, pressure, humidity, and CO2 removal",
    readouts: (game) => [
      ["ship oxygen", `${game.ship.oxygen}/100 reserve`],
      ["o2 fraction", `${formatFixed(game.environment.oxygenPercent, 1)}%`],
      ["pressure", `${formatFixed(game.environment.pressureKpa, 1)} kPa`],
      ["humidity", `${Math.round(game.environment.humidity)}%`],
      ["co2", `${Math.round(game.environment.co2Ppm)} ppm`],
    ],
    diagnostics: (game) => [
      systemStateLine(game, "life_support"),
      game.environment.pressureKpa < 90 ? "pressure is below nominal habitat band." : "pressure is acceptable for operator compartments.",
      game.environment.co2Ppm > 1200 ? "CO2 scrubber load is elevated." : "CO2 remains below emergency threshold.",
      game.power.life_support < 24 ? "life support allocation will allow oxygen reserve to decay." : "life support allocation is sufficient for slow atmospheric correction.",
    ],
  },
  sensors: {
    priority: "navigation and anomaly detection",
    location: "forward mast, hull lidar, archive correlation bus",
    function: "builds sector maps and resolves weak signals",
    readouts: (game) => [
      ["signal", `${game.ship.signal}/100 processed`],
      ["allocation", `${game.power.sensors}/60 local cap`],
      ["sector bias", `${getCurrentSector(game).signal} local signal`],
      ["known sectors", `${game.visited.length}/${Object.keys(sectorMap).length}`],
      ["scan gain", `+${Math.floor(game.power.sensors / 15)} signal/cycle`],
    ],
    diagnostics: (game) => [
      systemStateLine(game, "sensors"),
      game.systems.sensors === "unstable" ? "sensor returns may be delayed or under-resolved." : "sensor bus timing is stable.",
      game.power.sensors < 15 ? "allocation is below baseline sweep rate." : "allocation supports continued map refinement.",
    ],
  },
  archives: {
    priority: "historical recovery and system documentation",
    location: "central archive spine",
    function: "stores manuals, crew records, command indexes, and recovered fragments",
    readouts: (game) => [
      ["fragments", `${game.discoveredFragments.length}/3 objective fragments`],
      ["allocation", `${game.power.archives}/60 local cap`],
      ["particulate", `${Math.round(game.environment.particulate)} ug/m3`],
      ["integrity", archiveIntegrity(game)],
      ["manual path", "/archive/manuals/lua"],
    ],
    diagnostics: (game) => [
      systemStateLine(game, "archives"),
      game.systems.archives === "corrupted" ? "archive index corruption is actively increasing dust and recovery errors." : "archive index can service operator document requests.",
      game.discoveredFragments.length >= 3 ? "objective archive threshold met." : "additional sector scans are required for archive reconstruction.",
    ],
  },
  propulsion: {
    priority: "sector transfer and heat rejection support",
    location: "spine drive truss and maneuvering reserves",
    function: "executes sector jumps and supports radiator orientation",
    readouts: (game) => [
      ["fuel", `${game.ship.fuel}/100 reserve`],
      ["allocation", `${game.power.propulsion}/60 local cap`],
      ["jump cost", "8 fuel"],
      ["current sector", game.ship.location],
      ["reachable", getCurrentSector(game).links.join(", ")],
    ],
    diagnostics: (game) => [
      systemStateLine(game, "propulsion"),
      game.ship.fuel < 24 ? "fuel reserve allows fewer than three standard jumps." : "fuel reserve supports continued sector exploration.",
      game.power.propulsion < 8 ? "radiator orientation support is low; reactor heat rejection is reduced." : "propulsion support is adequate for radiator orientation.",
    ],
  },
};

function formatMap(game) {
  return Object.entries(sectorMap).map(([id, sector]) => {
    const marker = game.ship.location === id ? "*" : game.visited.includes(id) ? "+" : "?";
    const name = game.visited.includes(id) || game.ship.location === id ? sector.name : "unscanned sector";
    const links = game.visited.includes(id) || game.ship.location === id ? ` -> ${sector.links.join(", ")}` : "";
    return `${marker} ${id} ${name}${links}`;
  });
}

function formatMapCommand(game, args = []) {
  if (!args.length) return formatMap(game);
  if (args[0] === "-v" || args[0] === "--visual") return formatVisualMap(game);
  return [`map: ${args[0]}: unknown option`, "usage: map [-v|--visual]"];
}

function formatVisualMap(game) {
  const node = (id) => formatMapNode(game, id);
  const link = (from, to, width = 7) => (isExploredLink(game, from, to) ? "-".repeat(width) : " ".repeat(width));
  const vertical = (from, to) => (isExploredLink(game, from, to) ? "|" : " ");
  const diagonalDown = (from, to) => (isExploredLink(game, from, to) ? "\\" : " ");
  const diagonalUp = (from, to) => (isExploredLink(game, from, to) ? "/" : " ");

  return [
    "CSV SIMURGH SECTOR MAP",
    "legend: * current  + visited  ? unvisited",
    "",
    `                 ${node("sector-02")} ${link("sector-02", "sector-04")} ${node("sector-04")} ${link("sector-04", "sector-06")} ${node("sector-06")}`,
    `                    ${vertical("sector-02", "sector-01")}          ${vertical("sector-04", "sector-03")}          ${vertical("sector-06", "sector-05")}`,
    `                    ${vertical("sector-02", "sector-01")}          ${vertical("sector-04", "sector-03")}          ${vertical("sector-06", "sector-05")}`,
    `                 ${node("sector-01")} ${link("sector-01", "sector-03")} ${node("sector-03")} ${link("sector-03", "sector-05")} ${node("sector-05")}`,
    `                              ${diagonalDown("sector-03", "sector-04")}           ${diagonalUp("sector-05", "sector-06")}`,
    `                               ${diagonalDown("sector-03", "sector-04")}         ${diagonalUp("sector-05", "sector-06")}`,
    "",
    "known sectors:",
    ...formatMap(game),
  ];
}

function formatMapNode(game, id) {
  const sector = sectorMap[id];
  const marker = game.ship.location === id ? "*" : game.visited.includes(id) ? "+" : "?";
  const number = id.replace("sector-", "");
  const label = game.visited.includes(id) || game.ship.location === id ? sector.name : "unscanned";
  return `[${marker}${number} ${truncate(label, 15).padEnd(15)}]`;
}

function isExploredLink(game, from, to) {
  const connected = sectorMap[from].links.includes(to) || sectorMap[to].links.includes(from);
  const explored = game.visited.includes(from) || game.visited.includes(to) || game.ship.location === from || game.ship.location === to;
  return connected && explored;
}

function applyEffects(game, effects) {
  const next = cloneGame(game);
  for (const [key, delta] of Object.entries(effects)) {
    if (key in next.ship) next.ship[key] = clamp(next.ship[key] + delta, 0, 100);
  }
  next.environment = advanceEnvironment(next, effects);
  return next;
}

function advanceEnvironment(game, effects = {}) {
  const lifeSupportPower = game.power.life_support;
  const archivePower = game.power.archives;
  const oxygenStress = (70 - game.ship.oxygen) / 70;
  const heatStress = game.ship.heat / 100;
  const leakPenalty = game.systems.life_support === "damaged" ? 1.2 : game.systems.life_support === "unstable" ? 0.5 : 0;
  const archiveDust = game.systems.archives === "corrupted" ? 1.4 : game.systems.archives === "unstable" ? 0.6 : 0;
  const oxygenEffect = effects.oxygen || 0;
  const heatEffect = effects.heat || 0;

  const environment = game.environment;
  const pressureDelta = (lifeSupportPower - 25) * 0.03 - leakPenalty + Math.min(0, oxygenEffect) * 0.08;
  const oxygenPercentDelta = (lifeSupportPower - 24) * 0.012 - Math.max(0, oxygenStress) * 0.08 + oxygenEffect * 0.015;
  const humidityDelta = (lifeSupportPower - 24) * 0.06 - heatStress * 0.5 - leakPenalty * 0.7;
  const temperatureDelta = (game.ship.heat - 22) * 0.018 + heatEffect * 0.08 - (game.power.life_support - 25) * 0.01;
  const co2Delta = 18 - (lifeSupportPower - 20) * 1.8 + leakPenalty * 10;
  const particulateDelta = archiveDust - (archivePower - 15) * 0.05 + (effects.hull && effects.hull < 0 ? Math.abs(effects.hull) * 0.35 : 0);
  const oxygenPercent = clampFloat(environment.oxygenPercent + oxygenPercentDelta, 12, 23.5);
  const tracePercent = clampFloat(environment.tracePercent + Math.max(0, environment.co2Ppm - 1000) / 100000, 0.7, 3.5);

  return {
    pressureKpa: clampFloat(environment.pressureKpa + pressureDelta, 45, 106),
    temperatureC: clampFloat(environment.temperatureC + temperatureDelta, -8, 48),
    humidity: clampFloat(environment.humidity + humidityDelta, 8, 82),
    oxygenPercent,
    nitrogenPercent: clampFloat(100 - oxygenPercent - tracePercent, 72, 82),
    co2Ppm: clampFloat(environment.co2Ppm + co2Delta, 260, 6500),
    tracePercent,
    particulate: clampFloat(environment.particulate + particulateDelta, 1, 180),
  };
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

function visualBar(value, max, width, invert = false) {
  const normalized = clamp(value / max, 0, 1);
  const filled = Math.round(normalized * width);
  const char = invert ? "!" : "#";
  return `[${char.repeat(filled)}${"-".repeat(width - filled)}]`;
}

function miniBar(value, max) {
  const width = 12;
  const filled = Math.round(clamp(value / max, 0, 1) * width);
  return `[${"#".repeat(filled)}${"-".repeat(width - filled)}]`;
}

function pct(value) {
  return `${String(Math.round(value)).padStart(3)}%`;
}

function truncate(value, width) {
  const text = String(value);
  if (text.length <= width) return text;
  if (width <= 1) return text.slice(0, width);
  return `${text.slice(0, width - 1)}~`;
}

function normalizeSystemName(value) {
  return String(value || "").toLowerCase().replaceAll("-", "_");
}

function systemStateLine(game, system) {
  const state = game.systems[system];
  if (state === "nominal") return `${formatSystem(system)} reports nominal emergency operation.`;
  if (state === "unstable") return `${formatSystem(system)} is unstable; repair can restore nominal operation.`;
  if (state === "degraded") return `${formatSystem(system)} is degraded; output is below historical baseline.`;
  if (state === "damaged") return `${formatSystem(system)} is damaged; reserve loss is likely without repair.`;
  if (state === "corrupted") return `${formatSystem(system)} index is corrupted; recovered data may be incomplete.`;
  return `${formatSystem(system)} state is ${state}.`;
}

function trendLabel(value) {
  if (value > 0) return `rising +${value}/cycle`;
  if (value < 0) return `falling ${value}/cycle`;
  return "stable";
}

function archiveIntegrity(game) {
  const state = game.systems.archives;
  if (state === "nominal") return "82% reconstructed";
  if (state === "unstable") return "61% reconstructed";
  if (state === "corrupted") return "39% reconstructed";
  return "unverified";
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function clampFloat(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatFixed(value, digits) {
  return Number(value).toFixed(digits);
}

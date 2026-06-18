import { readFile, writeFile } from "./filesystem.js";
import { analyzeSystemFaults } from "../game/repairSystems.js";

const SYSTEMS = ["reactor", "life_support", "sensors", "archives", "propulsion"];

export function appendScheduledSystemLogs(previousGame, nextGame, fileSystem) {
  const previousTurn = previousGame?.ship?.turn ?? 0;
  const nextTurn = nextGame?.ship?.turn ?? previousTurn;
  if (nextTurn <= previousTurn) return fileSystem;

  let nextFileSystem = fileSystem;
  for (let turn = previousTurn + 1; turn <= nextTurn; turn += 1) {
    for (const system of SYSTEMS) {
      nextFileSystem = appendSystemStatusLine(nextFileSystem, system, formatSystemCycleLine(nextGame, system, turn));
      nextFileSystem = appendFaultSymptomLines(nextFileSystem, nextGame, system, turn);
    }
  }

  return nextFileSystem;
}

function appendSystemStatusLine(fileSystem, system, line) {
  const path = `/ship/systems/${system}/status.log`;
  const current = readFile(path, "/", fileSystem);
  if (!current.ok) return fileSystem;

  const content = `${String(current.content).replace(/\n*$/, "\n")}${line}\n`;
  const result = writeFile(path, "/", content, fileSystem);
  return result.ok ? result.fileSystem : fileSystem;
}

function appendSystemFaultLine(fileSystem, system, line) {
  const path = `/ship/systems/${system}/faults.log`;
  const current = readFile(path, "/", fileSystem);
  if (!current.ok) return fileSystem;

  const content = `${String(current.content).replace(/\n*$/, "\n")}${line}\n`;
  const result = writeFile(path, "/", content, fileSystem);
  return result.ok ? result.fileSystem : fileSystem;
}

function appendFaultSymptomLines(fileSystem, game, system, turn) {
  const faults = analyzeSystemFaults(system, fileSystem);
  if (!faults.length) return fileSystem;

  let nextFileSystem = fileSystem;
  for (const fault of faults) {
    const timestamp = timestampForTurn(turn);
    nextFileSystem = appendSystemStatusLine(
      nextFileSystem,
      system,
      `${timestamp} ${system}: [FAULT] ${faultSymptomMessage(system, fault.id, game)}`,
    );
    nextFileSystem = appendSystemFaultLine(
      nextFileSystem,
      system,
      `${timestamp} ACTIVE ${fault.id}: ${fault.title}; family=${fault.family || "general"}; evidence=${fault.file.replace("SYSTEM", system)}; repair="${fault.repair}"`,
    );
  }

  return nextFileSystem;
}

function formatSystemCycleLine(game, system, turn) {
  const state = game.systems[system];
  const level = state === "nominal" ? "INFO" : "WARN";
  return `${timestampForTurn(turn)} ${system}: [${level}] ${systemCycleMessage(game, system)}`;
}

function systemCycleMessage(game, system) {
  switch (system) {
    case "reactor":
      return `cycle audit heat=${game.ship.heat}/100 reserve=${game.ship.power}/100 allocation=${game.power.reactor}/60 trend=${reactorTrend(game)}`;
    case "life_support":
      return `cycle audit oxygen=${game.ship.oxygen}/100 pressure=${fixed(game.environment.pressureKpa)}kPa co2=${Math.round(game.environment.co2Ppm)}ppm allocation=${game.power.life_support}/60`;
    case "sensors":
      return `cycle audit signal=${game.ship.signal}/100 known=${knownSectorCount(game)} allocation=${game.power.sensors}/60 adjacent_sweep=${game.power.sensors >= 30 ? "enabled" : "disabled"}`;
    case "archives":
      return `cycle audit fragments=${game.discoveredFragments.length}/3 particulate=${Math.round(game.environment.particulate)}ug/m3 allocation=${game.power.archives}/60`;
    case "propulsion":
      return `cycle audit fuel=${game.ship.fuel}/100 radiator_support=${game.power.propulsion >= 8 ? "online" : "offline"} allocation=${game.power.propulsion}/60`;
    default:
      return "cycle audit complete";
  }
}

function faultSymptomMessage(system, faultId, game) {
  const symptoms = FAULT_SYMPTOMS[system] || {};
  const symptom = symptoms[faultId] || "artifact fault continues to affect local diagnostics.";
  return typeof symptom === "function" ? symptom(game) : symptom;
}

const FAULT_SYMPTOMS = {
  reactor: {
    coolant_phase: (game) => `coolant phase mismatch causing thermal jitter; heat=${game.ship.heat}/100`,
    rod_delay: "control rod response delay causing allocation lag and reserve instability.",
    thermal_override: (game) => `thermal alarm override suppressing warnings; heat=${game.ship.heat}/100`,
    relay_dropout: (game) => `relay bus dropout wasting reserve; power=${game.ship.power}/100`,
    sensor_disagreement: "core sensor disagreement forcing conservative reactor estimates.",
    scram_latch: "scram latch remains asserted; output ceiling is below requested allocation.",
    coolant_contamination: "coolant contamination reducing heat transfer efficiency.",
  },
  life_support: {
    pressure_valve_open: (game) => `pressure valve leak persists; pressure=${fixed(game.environment.pressureKpa)}kPa oxygen=${game.ship.oxygen}/100`,
    scrubber_saturated: (game) => `active scrubber saturation increasing CO2; co2=${Math.round(game.environment.co2Ppm)}ppm`,
    oxygen_mix: (game) => `oxygen mix target mismatch; o2_fraction=${fixed(game.environment.oxygenPercent)}%`,
    condenser_offline: (game) => `humidity condenser offline; humidity=${Math.round(game.environment.humidity)}%`,
    bad_atmosphere_sensor: "atmosphere sensor disagreement contaminating pressure and gas mix estimates.",
    biofilter_contamination: (game) => `biofilter contamination contributing particulate load; particulate=${Math.round(game.environment.particulate)}ug/m3`,
    loop_label: "loop B route labels disagree with current valve table.",
  },
  sensors: {
    lidar_alignment: "lidar array misalignment reducing adjacent sweep confidence.",
    signal_filter: (game) => `signal filter threshold suppressing weak returns; signal=${game.ship.signal}/100`,
    archive_bus: "archive correlation bus disconnected; fragment signatures may be missed.",
    timebase_drift: "timebase drift causing delayed or duplicated sector returns.",
    mast_shadowing: "antenna mast shadowing reducing scan aperture.",
    noise_model: "noise model corruption increasing false positive suppression.",
    rail_undervoltage: "sensor rail undervoltage making calibration corrections unreliable.",
  },
  archives: {
    index_corruption: "archive index corruption causing fragment offset ambiguity.",
    checksum_mismatch: "manifest checksum mismatch blocking reliable fragment reconstruction.",
    readonly_vault: "read-only vault flag preventing emergency archive writes.",
    duplicate_manifest: "duplicate manifest entries causing repeated or missing records.",
    dust_gate: (game) => `archive dust gate fault increasing particulate risk; particulate=${Math.round(game.environment.particulate)}ug/m3`,
    manual_catalog: "manual catalog path unresolved; operator documentation may be incomplete.",
    cold_storage: "cold storage bank not awake; historical records remain inaccessible.",
  },
  propulsion: {
    thruster_imbalance: "thruster aperture imbalance increasing route correction error.",
    fuel_sensor_offset: (game) => `fuel sensor offset makes reserve estimate unreliable; fuel=${game.ship.fuel}/100`,
    route_table: "route table stale; burn planner may reject valid links.",
    radiator_lock: "radiator gimbal lock reducing heat rejection support.",
    reserve_leak: (game) => `maneuvering reserve leak persists; fuel=${game.ship.fuel}/100`,
    planner_checksum: "burn planner checksum error forcing conservative route validation.",
    drive_vibration: "drive truss vibration above tolerance during attitude correction.",
  },
};

function reactorTrend(game) {
  const value = Math.floor((game.power.reactor - 28) / 9) - (game.power.propulsion < 8 ? 0 : 1);
  if (value > 0) return `rising+${value}`;
  if (value < 0) return `falling${value}`;
  return "stable";
}

function knownSectorCount(game) {
  return new Set([...(game.visited || []), ...(game.scanned || []), game.ship.location]).size;
}

function timestampForTurn(turn) {
  const minute = Math.floor(turn / 60);
  const second = turn % 60;
  return `2316-04-19T03:${String(15 + minute).padStart(2, "0")}:${String(second).padStart(2, "0")}Z`;
}

function fixed(value) {
  return Number(value).toFixed(1);
}

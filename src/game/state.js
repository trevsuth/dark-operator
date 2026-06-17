import { eventDeck } from "./events.js";
import { sectorMap } from "./map.js";
import { createRng, pick } from "./random.js";
import { storyFragments } from "./story.js";

export function createGame(seed = "simurgh-001") {
  const rng = createRng(seed);
  const defect = pick(rng, ["life_support", "reactor", "sensors", "archives"]);
  const eventOrder = shuffle(eventDeck.map((event) => event.id), rng);
  const fragmentOrder = shuffle(storyFragments.map((fragment) => fragment.id), rng);

  return {
    seed,
    rngState: 0,
    eventIndex: 0,
    eventOrder,
    fragmentOrder,
    status: "active",
    objective: "Reach sector-06 and recover three archive fragments.",
    ship: {
      hull: defect === "life_support" ? 88 : 96,
      power: defect === "reactor" ? 72 : 84,
      oxygen: defect === "life_support" ? 68 : 82,
      fuel: 64,
      heat: defect === "reactor" ? 34 : 22,
      signal: 0,
      turn: 0,
      location: "sector-01",
    },
    systems: {
      reactor: defect === "reactor" ? "degraded" : "nominal",
      life_support: defect === "life_support" ? "damaged" : "nominal",
      sensors: defect === "sensors" ? "unstable" : "nominal",
      archives: defect === "archives" ? "corrupted" : "nominal",
      propulsion: "nominal",
    },
    power: {
      reactor: 35,
      life_support: 25,
      sensors: 15,
      archives: 15,
      propulsion: 10,
    },
    visited: ["sector-01"],
    discoveredFragments: [],
    logs: [
      "[BOOT] CSV Simurgh emergency operator console restored.",
      `[WARN] Initial defect isolated: ${formatSystem(defect)}.`,
      "[INFO] Type 'status', 'scan', 'map', or 'cat /archive/manuals/lua/01_variables.txt'.",
    ],
  };
}

export function cloneGame(game) {
  return {
    ...game,
    ship: { ...game.ship },
    systems: { ...game.systems },
    power: { ...game.power },
    visited: [...game.visited],
    discoveredFragments: [...game.discoveredFragments],
    logs: [...game.logs],
    eventOrder: [...game.eventOrder],
    fragmentOrder: [...game.fragmentOrder],
  };
}

export function appendLog(game, line) {
  return {
    ...game,
    logs: [...game.logs, line].slice(-80),
  };
}

export function getCurrentSector(game) {
  return sectorMap[game.ship.location];
}

export function getStoryFragment(id) {
  return storyFragments.find((fragment) => fragment.id === id);
}

export function formatSystem(system) {
  return system.replaceAll("_", " ");
}

function shuffle(values, rng) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

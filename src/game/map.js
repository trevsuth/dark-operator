export const sectorMap = {
  "sector-01": {
    name: "Awakening Berth",
    description: "Emergency consoles and cold diagnostic relays. The Simurgh answers slowly here.",
    links: ["sector-02", "sector-03"],
    signal: 9,
  },
  "sector-02": {
    name: "Archive Spine",
    description: "Data vaults line the central truss. Many directories report partial amnesia.",
    links: ["sector-01", "sector-04"],
    signal: 18,
    fragment: "archive-ash",
  },
  "sector-03": {
    name: "Thermal Exchange",
    description: "Radiators bloom along the outer hull. Heat sinks pulse with uneven rhythm.",
    links: ["sector-01", "sector-04", "sector-05"],
    signal: 12,
  },
  "sector-04": {
    name: "Dormant Habitat",
    description: "Crew corridors remain pressurized. Nameplates have been polished blank by maintenance arms.",
    links: ["sector-02", "sector-03", "sector-06"],
    signal: 25,
    fragment: "crew-channel",
  },
  "sector-05": {
    name: "Garden Vault",
    description: "Black soil, dry irrigation rails, and sealed lamps waiting for a season command.",
    links: ["sector-03", "sector-06"],
    signal: 20,
    fragment: "garden-vault",
  },
  "sector-06": {
    name: "Beacon Terminus",
    description: "Long-range antennae point toward a weak distress signature beyond the charted hull.",
    links: ["sector-04", "sector-05"],
    signal: 40,
    fragment: "captain-index",
    objective: true,
  },
};

export const eventDeck = [
  {
    id: "micro-impact",
    title: "Micrometeor Shear",
    severity: "medium",
    description: "A brief impact storm crosses the forward hull plating.",
    effects: { hull: -7, heat: 3 },
  },
  {
    id: "oxygen-variance",
    title: "Pressure Variance",
    severity: "medium",
    description: "Life support loop B reports oxygen loss through an unlisted valve path.",
    effects: { oxygen: -8 },
  },
  {
    id: "reactor-surge",
    title: "Reactor Instability",
    severity: "high",
    description: "The reactor overcorrects after a delayed coolant response.",
    effects: { power: -6, heat: 8 },
  },
  {
    id: "archive-noise",
    title: "Archive Corruption",
    severity: "low",
    description: "The archive spine emits recovery chatter on a maintenance bus.",
    effects: { signal: 4 },
  },
  {
    id: "quiet-cycle",
    title: "Quiet Cycle",
    severity: "low",
    description: "No immediate fault escalations. Background repair drones continue their patrol.",
    effects: { hull: 1, heat: -2 },
  },
  {
    id: "ghost-carrier",
    title: "Unknown Carrier",
    severity: "low",
    description: "Sensors detect a repeating transmission on a decommissioned crew channel.",
    effects: { signal: 8 },
  },
];

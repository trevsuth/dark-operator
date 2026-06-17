# TODO

Potential next steps for turning the current vertical slice into a stronger playable prototype.

## Gameplay Loop

- Add a `newrun <seed>` command so players can start fresh seeded runs from inside the terminal.
- Add clearer objective tracking in `status`, including current win condition progress and known route hints.
- Make `scan` reveal adjacent sectors progressively instead of showing every sector as an unknown entry from the start.
- Add more meaningful tradeoffs to `power`, such as stronger sensor output, faster oxygen recovery, higher heat, or jump restrictions.
- Expand `repair` so systems have specific failure modes, repair costs, and partial-success outcomes.
- Add more player-facing consequences when heat, oxygen, fuel, or hull approach critical thresholds.

## Lua Progression

- Gate additional `ship` API helpers behind discovered manuals or repaired archive systems.
- Add more in-universe Lua lessons:
  - functions
  - conditionals
  - loops
  - tables
  - reusable emergency routines
- Add sample automation scripts for common problems:
  - oxygen recovery
  - heat control
  - sector survey
  - archive fragment search
- Add scriptable drones or probes once the core `ship` API is stable.
- Improve Lua error messages with shipboard context and suggestions from recovered manuals.

## Exploration

- Expand the map from six sectors to a larger seeded layout.
- Randomize sector connections, discoveries, and hazards per run.
- Add sector-specific commands or devices, such as archive terminals, damaged relays, sealed habitats, and probe docks.
- Track discovered, scanned, visited, and inaccessible sectors separately.
- Add navigation constraints based on fuel, propulsion damage, signal strength, or repaired systems.

## Events And Resources

- Replace the simple repeating event order with an event deck that scales by turn count and ship condition.
- Add event choices that require immediate tradeoffs instead of only passive effects.
- Add ship defects that meaningfully alter strategy:
  - degraded reactor
  - unstable sensors
  - leaking life support
  - corrupted archives
  - damaged propulsion
- Add recovery events and rare opportunities so runs are not only attrition.
- Tune resource decay for a full run target of roughly 30-60 turns.

## Story And Atmosphere

- Add more archive fragments with randomized ordering.
- Split story into categories: crew journals, maintenance records, command logs, corrupted archive fragments, and signal transcripts.
- Keep the Simurgh's truth ambiguous early; let patterns emerge across multiple runs.
- Add subtle references to memory, forgetting, identity, and transformation through recovered documents.
- Avoid direct lore dumps. Prefer short, technical records with unsettling implications.

## Terminal Experience

- Add dedicated pane commands or presets for status, logs, sensors, and Lua work.
- Let panes subscribe to live output, such as a persistent status pane or log stream.
- Add command history persistence per run.
- Add better tab completion for game systems and sector names.
- Add `man` or `help <command>` entries written as shipboard documentation.

## Persistence

- Add save/load support for current run state.
- Decide whether saved scripts should persist between runs.
- Add a recovered archive index that tracks fragments found across multiple runs.
- Add optional local storage persistence for browser sessions.

## Technical

- Add unit tests for `src/game` state transitions, event application, win/loss checks, and command handling.
- Add smoke tests for Lua scripts that mutate game state.
- Move static filesystem content into data modules if `filesystem.js` grows too large.
- Add TypeScript or JSDoc types for ship state, events, sectors, and command results.
- Update stale docs under `docs/` so they describe Dark Operator instead of the old Console Clone prototype.

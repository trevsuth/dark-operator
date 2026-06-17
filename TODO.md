# TODO

Potential next steps for turning the current vertical slice into a stronger playable prototype.

## Gameplay Loop

- Add a `newrun <seed>` command so players can start fresh seeded runs from inside the terminal.
- Add clearer objective tracking in `status`, including current win condition progress and known route hints.
- Make `scan` reveal adjacent sectors progressively instead of showing every sector as an unknown entry from the start.
- Add more meaningful tradeoffs to `power`, such as stronger sensor output, faster oxygen recovery, higher heat, or jump restrictions.
- Add repair costs and partial-success outcomes on top of the current artifact validation model.
- Let unresolved system faults produce specific recurring symptoms instead of only generic system degradation.
- Extend `docs/simulation.md` whenever new fault symptoms alter drift formulas or cross-system coupling.
- Add commands that help inspect repair artifacts, such as `diff`, `head`, `tail`, or `checksum`.
- Add more player-facing consequences when heat, oxygen, fuel, or hull approach critical thresholds.

## Lua Progression

- Gate additional `ship` API helpers behind discovered manuals or repaired archive systems.
- Add more in-universe Lua lessons:
  - functions
  - tables
  - reusable emergency routines
- Add Lua lessons that specifically teach repair artifact inspection with `fs.read`, `fs.write`, and `fs.list`.
- Add sample automation scripts for common problems:
  - oxygen recovery
  - heat control
  - sector survey
  - archive fragment search
  - repair file audit
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
- Add more ad-hoc documents inside each system manual directory, including contractor addenda, refit notices, parts lists, and contradictory crew annotations.
- Cross-link story fragments with service manuals so technical records occasionally reveal historical context.
- Keep the Simurgh's truth ambiguous early; let patterns emerge across multiple runs.
- Add subtle references to memory, forgetting, identity, and transformation through recovered documents.
- Avoid direct lore dumps. Prefer short, technical records with unsettling implications.

## Terminal Experience

- Add dedicated pane commands or presets for status, logs, sensors, and Lua work.
- Let panes subscribe to live output, such as a persistent status pane or log stream.
- Add command history persistence per run.
- Add better tab completion for game systems and sector names.
- Update tmux documentation and `man tmux` whenever pane controls change.
- Add manual-page coverage for future utilities as they are added.
- Consider adding `less` for long manuals, since the current service binders are large.

## Persistence

- Add save/load support for current run state.
- Decide whether saved scripts should persist between runs.
- Add a recovered archive index that tracks fragments found across multiple runs.
- Add optional local storage persistence for browser sessions.

## Technical

- Add unit tests for `src/game` state transitions, event application, win/loss checks, and command handling.
- Add smoke tests for Lua scripts that mutate game state.
- Add tests that intentionally edit repair artifacts into each known fault state and verify `repair <system>` reports the matching issue.
- Add tests that verify `/archive/manuals/<system>` directories include index, service manual, diagrams, fault procedures, and maintenance logs.
- Continue moving static filesystem content into data modules as document volume grows.
- Add TypeScript or JSDoc types for ship state, events, sectors, and command results.
- Update stale docs under `docs/` so they describe Dark Operator instead of the old Console Clone prototype.

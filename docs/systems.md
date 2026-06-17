# Systems Repair Design

This document proposes a deeper replacement for the current `repair SYSTEM` command. The goal is to make each repair feel like terminal investigation: inspect files, read logs, compare configuration, run diagnostics, edit small artifacts, and then validate the fix.

For the current step-based system states, gradual resource drift, and cross-system coupling formulas, see `simulation.md`.

The current ship systems are:

- `reactor`
- `life_support`
- `sensors`
- `archives`
- `propulsion`

## Design Goals

- Replace one-step repair with system-specific diagnosis and correction.
- Make failures discoverable through logs, configs, manifests, and diagnostic files.
- Let players repair manually with shell tools or automate investigation with Lua.
- Keep the format terminal-native: `cat`, `grep`, `sed`, `awk`, `vim`, `run`, `status`.
- Avoid arbitrary puzzle locks. Every repair should have a plausible technical cause and a readable trail.
- Let each system have 5-7 possible faults per run, with one or more active at a time.

## Proposed Repair Loop

1. `status SYSTEM` shows symptoms and points toward relevant artifact paths.
2. Player inspects logs and configs under `/ship/systems/SYSTEM`.
3. Player identifies one or more fault signatures.
4. Player edits a config, restores a manifest entry, clears a bad override, writes a calibration value, or runs a Lua maintenance script.
5. Player runs a validation command.
6. System state improves from `damaged` or `unstable` toward `nominal`.

Possible future commands:

```bash
diagnose reactor
validate reactor
repair reactor
```

In this model, `repair SYSTEM` should become a validator/applicator, not a magic fix. If required artifacts are not corrected, it should explain what still fails.

## Shared Filesystem Pattern

Each system should have a directory like:

```text
/ship/systems/<system>/
  README.txt
  status.log
  faults.log
  config.ini
  manifest.tsv
  diagnostics/
    latest.txt
    baseline.txt
  scripts/
    check.lua
```

Optional per-system files can add character and specificity:

```text
calibration.dat
routes.tsv
thresholds.ini
valves.tsv
relays.tsv
index.map
checksum.txt
```

## Reactor

Purpose: maintain electrical reserves and manage thermal risk.

Primary paths:

```text
/ship/systems/reactor/
  README.txt
  status.log
  faults.log
  config.ini
  relays.tsv
  coolant.tsv
  diagnostics/latest.txt
  diagnostics/baseline.txt
  scripts/check.lua
```

Potential faults:

1. Coolant pump phase mismatch
   - Symptom: heat rises despite normal reactor allocation.
   - Evidence: `faults.log` reports pump B phase drift; `coolant.tsv` has one pump marked `phase=180`.
   - Repair: edit `coolant.tsv` to restore the expected phase or disable the bad pump and lower reactor allocation.
   - Validation: `diagnose reactor` reports pump phase alignment.

2. Control rod response delay
   - Symptom: power changes lag by one or more cycles.
   - Evidence: `status.log` shows delayed rod actuation; `config.ini` has `rod_response_ms` above baseline.
   - Repair: set `rod_response_ms` within the safe range from `diagnostics/baseline.txt`.
   - Validation: reactor trend stabilizes.

3. Thermal threshold override
   - Symptom: heat climbs without warning until dangerous levels.
   - Evidence: `config.ini` has `thermal_alarm=disabled` or high `thermal_limit_c`.
   - Repair: restore threshold values from baseline.
   - Validation: warning channel reappears in `status.log`.

4. Relay bus dropout
   - Symptom: reactor allocation is accepted but does not improve power reserve.
   - Evidence: `relays.tsv` has a bus row marked `offline` or wrong route.
   - Repair: reroute to a standby relay or change `state=online`.
   - Validation: grid output trend becomes positive.

5. Core sensor disagreement
   - Symptom: reactor reports `unstable` because redundant sensors disagree.
   - Evidence: `diagnostics/latest.txt` shows core sensors A/B/C with one outlier.
   - Repair: mark the outlier as ignored in `config.ini` or recalibrate it to baseline.
   - Validation: sensor variance falls below tolerance.

6. Emergency scram latch stuck
   - Symptom: reactor cannot exceed low output even with high allocation.
   - Evidence: `status.log` reports scram latch not cleared.
   - Repair: set `scram_latch=clear` after verifying heat and pressure are safe.
   - Validation: reactor allocation above 35 produces reserve gain.

7. Coolant contamination
   - Symptom: heat rejection weakens over time.
   - Evidence: `coolant.tsv` shows high particulate or conductivity.
   - Repair: switch loop to backup coolant path and reduce reactor allocation until validated.
   - Validation: heat trend returns to stable or falling.

## Life Support

Purpose: regulate pressure, oxygen fraction, humidity, and CO2 removal.

Primary paths:

```text
/ship/systems/life_support/
  README.txt
  status.log
  faults.log
  config.ini
  valves.tsv
  scrubbers.tsv
  atmosphere.tsv
  diagnostics/latest.txt
  diagnostics/baseline.txt
  scripts/check.lua
```

Potential faults:

1. Pressure valve stuck open
   - Symptom: pressure drops and oxygen reserve decays.
   - Evidence: `valves.tsv` shows a valve with `position=open` when baseline expects `regulated`.
   - Repair: set valve to `regulated` or isolate that loop.
   - Validation: pressure trend stabilizes.

2. CO2 scrubber saturated
   - Symptom: CO2 ppm rises despite adequate power allocation.
   - Evidence: `scrubbers.tsv` shows cartridge capacity near zero.
   - Repair: switch active scrubber bank or mark cartridge replaced.
   - Validation: CO2 trend decreases.

3. Oxygen mix ratio corrupted
   - Symptom: oxygen percentage diverges from oxygen reserve.
   - Evidence: `config.ini` has wrong `target_o2_percent`.
   - Repair: restore target to baseline value.
   - Validation: atmosphere composition returns toward safe band.

4. Humidity condenser offline
   - Symptom: humidity drifts too low or too high.
   - Evidence: `status.log` reports condenser loop failure; `valves.tsv` routes condensate to a sealed loop.
   - Repair: reroute condenser to an available loop.
   - Validation: humidity returns to target range.

5. Bad atmosphere sensor
   - Symptom: diagnostics disagree with resource values.
   - Evidence: `atmosphere.tsv` shows one sensor with impossible pressure or gas percentage.
   - Repair: disable or recalibrate the bad sensor.
   - Validation: diagnostic variance falls below threshold.

6. Biofilter contamination
   - Symptom: particulate or trace gases rise.
   - Evidence: `faults.log` names biofilter bed contamination.
   - Repair: swap active biofilter bed or clean contamination flag.
   - Validation: particulate trend decreases.

7. Loop B mislabeled route
   - Symptom: repair attempts affect the wrong loop.
   - Evidence: `/archive/crew/maintenance.txt` hints at relabeling; `valves.tsv` route names conflict.
   - Repair: correct loop label in `config.ini` or route table.
   - Validation: life support state improves after validate.

## Sensors

Purpose: map sectors, resolve signal, detect anomalies, and support navigation.

Primary paths:

```text
/ship/systems/sensors/
  README.txt
  status.log
  faults.log
  config.ini
  arrays.tsv
  calibration.dat
  filters.ini
  diagnostics/latest.txt
  diagnostics/baseline.txt
  scripts/check.lua
```

Potential faults:

1. Lidar array misalignment
   - Symptom: scans reveal less sector detail.
   - Evidence: `arrays.tsv` shows one array with high angular error.
   - Repair: edit alignment offset to match baseline.
   - Validation: scan gain improves.

2. Signal filter too aggressive
   - Symptom: weak transmissions are suppressed.
   - Evidence: `filters.ini` has high `minimum_signal`.
   - Repair: lower threshold to baseline.
   - Validation: signal strength improves after scan.

3. Archive correlation bus disconnected
   - Symptom: scans find sectors but not archive fragments.
   - Evidence: `status.log` reports correlation timeout; `config.ini` has `archive_bus=offline`.
   - Repair: enable archive bus or route to backup channel.
   - Validation: scan can recover fragments again.

4. Timebase drift
   - Symptom: map links become unreliable or delayed.
   - Evidence: `diagnostics/latest.txt` shows clock skew above tolerance.
   - Repair: set `timebase_source=master` or recalibrate local clock.
   - Validation: clock skew returns within range.

5. Antenna mast shadowing
   - Symptom: signal gain is low in specific sectors.
   - Evidence: `arrays.tsv` marks mast occlusion or wrong deployment state.
   - Repair: set affected mast to `deployed` or reroute scans to another array.
   - Validation: sector signal bias increases.

6. Noise model corruption
   - Symptom: false positives appear in logs.
   - Evidence: `filters.ini` references missing or corrupt noise model.
   - Repair: restore model name from baseline.
   - Validation: ghost readings decrease.

7. Sensor power rail undervoltage
   - Symptom: sensor state remains unstable even after calibration.
   - Evidence: `diagnostics/latest.txt` shows rail voltage below baseline.
   - Repair: update rail assignment in `config.ini` and allocate sufficient power.
   - Validation: `status sensors` reports stable bus timing.

## Archives

Purpose: recover manuals, logs, historical fragments, and ship identity records.

Primary paths:

```text
/ship/systems/archives/
  README.txt
  status.log
  faults.log
  config.ini
  index.map
  manifest.tsv
  checksum.txt
  diagnostics/latest.txt
  diagnostics/baseline.txt
  scripts/check.lua
```

Potential faults:

1. Index map corruption
   - Symptom: `cat` works but recovered fragments are incomplete.
   - Evidence: `index.map` contains missing sectors or duplicate offsets.
   - Repair: restore offset from `manifest.tsv` or baseline.
   - Validation: archive integrity increases.

2. Manifest checksum mismatch
   - Symptom: archive system remains corrupted after scans.
   - Evidence: `checksum.txt` does not match manifest record.
   - Repair: update checksum after confirming manifest rows.
   - Validation: checksum verification passes.

3. Read-only vault flag stuck
   - Symptom: scripts cannot write recovered archive state.
   - Evidence: `config.ini` has `vault_mode=readonly`.
   - Repair: set vault mode to emergency-write after validating permissions.
   - Validation: recovery writes succeed.

4. Duplicate crew index entries
   - Symptom: story fragments appear out of order or repeat.
   - Evidence: `manifest.tsv` shows duplicate fragment ids.
   - Repair: remove or disable duplicate row.
   - Validation: manifest row count matches baseline.

5. Dust intrusion in archive spine
   - Symptom: particulate load rises and archive diagnostics degrade.
   - Evidence: `status.log` reports dust gate open.
   - Repair: close dust gate in `config.ini` or route HVAC support through life support.
   - Validation: particulate trend falls.

6. Manual catalog path broken
   - Symptom: Lua training files become hard to locate.
   - Evidence: `config.ini` points manual catalog at a stale path.
   - Repair: restore `/archive/manuals/lua`.
   - Validation: `diagnose archives` resolves training catalog.

7. Cold storage wake failure
   - Symptom: archive fragments are discovered but not readable.
   - Evidence: `status.log` reports cold storage bank asleep.
   - Repair: mark bank awake or move active bank in `config.ini`.
   - Validation: recovered fragment text becomes available.

## Propulsion

Purpose: sector transfer, fuel management, and radiator orientation support.

Primary paths:

```text
/ship/systems/propulsion/
  README.txt
  status.log
  faults.log
  config.ini
  thrusters.tsv
  fuel.tsv
  routes.tsv
  diagnostics/latest.txt
  diagnostics/baseline.txt
  scripts/check.lua
```

Potential faults:

1. Thruster valve imbalance
   - Symptom: jumps cost extra fuel or fail validation.
   - Evidence: `thrusters.tsv` shows mismatched valve aperture.
   - Repair: normalize aperture values or disable bad thruster.
   - Validation: jump cost returns to baseline.

2. Fuel reserve sensor offset
   - Symptom: displayed fuel disagrees with diagnostics.
   - Evidence: `fuel.tsv` has sensor offset above tolerance.
   - Repair: recalibrate sensor offset.
   - Validation: fuel reserve reading aligns with baseline.

3. Route table stale
   - Symptom: map shows links but propulsion rejects destination.
   - Evidence: `routes.tsv` lacks current sector link.
   - Repair: restore route row from map data or baseline.
   - Validation: destination is accepted.

4. Radiator orientation lock
   - Symptom: reactor heat rejection weakens when propulsion allocation is low.
   - Evidence: `status.log` reports radiator gimbal locked.
   - Repair: set gimbal lock to clear after checking heat range.
   - Validation: heat trend improves with propulsion allocation.

5. Maneuvering reserve leak
   - Symptom: fuel decays over time without jumps.
   - Evidence: `fuel.tsv` shows reserve tank pressure loss.
   - Repair: isolate leaking reserve or switch active tank.
   - Validation: passive fuel loss stops.

6. Burn planner checksum error
   - Symptom: jump command intermittently fails.
   - Evidence: `diagnostics/latest.txt` reports burn planner checksum mismatch.
   - Repair: restore planner checksum from baseline.
   - Validation: planner check passes.

7. Drive truss vibration
   - Symptom: hull damage increases during jumps.
   - Evidence: `status.log` records vibration exceeding tolerance.
   - Repair: lower burn profile or recalibrate thrust timing.
   - Validation: jump no longer applies hull penalty.

## Implementation Notes

- Faults should be generated from a seeded deck, similar to current event ordering.
- Active faults should write concrete evidence into the virtual filesystem.
- Repairs should be deterministic and inspectable.
- Validation should compare current file contents against expected fault-specific values.
- `status SYSTEM` should point to the most relevant files without revealing the exact answer.
- Lua scripts should be able to inspect files and eventually call validation routines.
- The system should support partial repair: fixing one fault can improve state even if another remains.

## Suggested First Slice

Implement one complete system before expanding all five.

Recommended first target: `life_support`.

Reasons:

- It connects directly to existing oxygen and environmental telemetry.
- Its artifacts are intuitive: valves, scrubbers, atmosphere sensors, config thresholds.
- It creates clear pressure, CO2, humidity, and oxygen consequences.
- It teaches players the intended repair loop with readable evidence.

Minimum first-slice flow:

```bash
status life_support
cat /ship/systems/life_support/faults.log
cat /ship/systems/life_support/valves.tsv
vim /ship/systems/life_support/valves.tsv
validate life_support
repair life_support
status life_support
```

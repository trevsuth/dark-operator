# Simulation And System Coupling

This document describes the current ship degradation model in the playable prototype. It is implementation-facing documentation for `src/game/engine.js`, `src/game/state.js`, and `src/game/repairSystems.js`.

## Model Summary

The simulation currently combines two kinds of change:

- System condition changes in discrete steps.
- Ship resources and environmental telemetry drift gradually each cycle.

System state is stored as named labels:

```text
nominal
unstable
degraded
damaged
corrupted
```

Ship and environment values are numeric:

```text
hull, power, oxygen, fuel, heat, signal
pressure, temperature, humidity, oxygen fraction, nitrogen fraction, CO2, trace gases, particulate
```

The result is a step-and-drift model: a system may move from `damaged` to `unstable` in one repair step, but the consequences of that state are expressed through gradual pressure loss, heat buildup, dust accumulation, oxygen loss, or signal gain over multiple cycles.

## Cycle Advancement

Most meaningful actions advance the ship by one cycle:

- `wait`
- `scan`
- `jump`
- successful `repair`

The current `power` command does not advance the cycle. It only changes allocation.

Each cycle:

1. Increments `ship.turn`.
2. Applies resource drift from power allocation.
3. Applies environmental drift from power allocation, current resources, system states, and event effects.
4. Applies a scheduled event every second turn.
5. Checks win/loss conditions.

## Resource Drift

Resource drift is driven mostly by power allocation.

```text
power  += floor((reactor allocation - 30) / 8)
oxygen += floor((life_support allocation - 24) / 7) - 1
heat   += floor((reactor allocation - 28) / 9) - propulsion cooling support
signal += floor(sensors allocation / 15)
```

Propulsion cooling support is binary in the current implementation:

```text
if propulsion allocation >= 8:
  heat -= 1 per cycle
else:
  no propulsion cooling support
```

All ship resources are clamped from `0` to `100`.

## Event Effects

The event deck applies direct resource deltas. Events are shuffled by seed at run creation and applied every second cycle.

Events are classified as `mild`, `moderate`, or `severe`.

Current event examples:

| Severity | Event example | Direct effects |
| --- | --- | --- |
| `mild` | Quiet Cycle | `hull +1`, `heat -2` |
| `mild` | Unknown Carrier | `signal +8` |
| `moderate` | Micrometeor Shear | `hull -7`, `heat +3` |
| `moderate` | Pressure Variance | `oxygen -8` |
| `severe` | Reactor Surge | `power -10`, `heat +14` |
| `severe` | Grid Collapse | `power -16`, `signal -5` |

Event effects also feed into environmental drift. Oxygen loss lowers pressure and oxygen fraction. Heat events increase ambient temperature. Hull damage increases particulate load.

## Environmental Drift

Environmental values drift every cycle after resource changes. They are affected by life support allocation, archive allocation, heat, oxygen reserve, current system state, and event effects.

### Life Support Coupling

Life support allocation affects:

- ship oxygen reserve
- atmospheric pressure
- oxygen fraction
- humidity
- ambient temperature correction
- CO2 removal

Current pressure trend:

```text
pressure += (life_support allocation - 25) * 0.03
pressure -= life_support leak penalty
pressure += oxygen event loss * 0.08 when oxygen event effect is negative
```

Current oxygen fraction trend:

```text
oxygen fraction += (life_support allocation - 24) * 0.012
oxygen fraction -= oxygen reserve stress * 0.08
oxygen fraction += oxygen event effect * 0.015
```

Current CO2 trend:

```text
CO2 += 18 - (life_support allocation - 20) * 1.8
CO2 += life_support leak penalty * 10
```

Life support state changes the leak penalty:

| Life support state | Leak penalty |
| --- | --- |
| `damaged` | `1.2` |
| `unstable` | `0.5` |
| other states | `0` |

This means life support damage is both step-based and gradual: the state changes discretely, but its atmospheric cost compounds each cycle.

### Reactor Coupling

Reactor allocation affects:

- ship power reserve
- ship heat
- ambient temperature indirectly through heat

The reactor system state currently does not directly change the resource formulas. Instead, a reactor initial defect starts the run with lower power, higher heat, and `reactor=degraded`. The practical effect comes from the player's allocation decisions and the heat/power tradeoff:

- higher reactor allocation improves power reserve
- higher reactor allocation increases heat
- heat increases ambient temperature
- excess heat can end the run at `heat >= 100`

### Propulsion Coupling

Propulsion affects:

- fuel through `jump`
- heat rejection support through power allocation
- navigation through reachable sector links

Jumping costs:

```text
fuel -= 8
```

Propulsion allocation of at least `8` provides radiator orientation support:

```text
heat -= 1 per cycle
```

The propulsion system state currently does not directly change jump cost or cooling efficiency. Its detailed files and repair state are available for diagnostics and future mechanics.

### Sensors Coupling

Sensors affect:

- signal gain through power allocation
- scan output and archive fragment discovery through player action
- status diagnostics for known sectors and local signal bias

Current signal gain:

```text
signal += floor(sensors allocation / 15)
```

The sensors system state currently appears in diagnostics but does not directly reduce signal gain. This is a good candidate for future tuning.

### Archives Coupling

Archives affect:

- story and manual access conceptually
- archive fragment recovery through scans
- particulate drift through archive state
- particulate cleanup through archive allocation

Archive state changes dust accumulation:

| Archive state | Dust contribution |
| --- | --- |
| `corrupted` | `+1.4 particulate/cycle` |
| `unstable` | `+0.6 particulate/cycle` |
| other states | `0` |

Archive allocation reduces particulate:

```text
particulate += archive dust contribution
particulate -= (archive allocation - 15) * 0.05
```

Hull damage events also increase particulate:

```text
particulate += abs(hull damage) * 0.35
```

## Cross-System Interactions

The main cross-system relationships are:

| Source | Target | Current interaction |
| --- | --- | --- |
| Reactor allocation | Power reserve | Higher allocation increases `power`. |
| Reactor allocation | Heat | Higher allocation increases `heat`. |
| Propulsion allocation | Heat | Allocation >= 8 provides `-1 heat/cycle`. |
| Heat | Temperature | Higher `heat` raises ambient temperature. |
| Life support allocation | Oxygen reserve | Higher allocation improves or slows oxygen loss. |
| Life support allocation | Atmosphere | Controls pressure, O2 fraction, humidity, and CO2. |
| Life support state | Atmosphere | `damaged` and `unstable` add leak penalties. |
| Sensors allocation | Signal | Higher allocation increases signal gain. |
| Archive state | Particulate | `corrupted` and `unstable` increase dust. |
| Archive allocation | Particulate | Higher allocation improves archive dust handling. |
| Hull damage events | Particulate | Hull damage increases particulate load. |
| Scan action | Archives/story | Can recover archive fragments in sectors. |
| Jump action | Fuel/location | Costs fuel and changes sectors. |

## Repair Interaction

Repairs are artifact validated. Each system has files under:

```text
/ship/systems/<system>
```

Running `repair <system>` checks those files against known fault signatures.

If faults remain:

- the repair does not improve the system
- the command reports evidence paths and repair guidance
- a `nominal` system with active artifact faults becomes `unstable`

If validation passes:

- repair consumes power
- `damaged` or `corrupted` improves to `unstable`
- `unstable` or `degraded` improves to `nominal`
- the repair advances one cycle

Current repair costs:

| System | Power cost |
| --- | --- |
| `reactor` | `10` |
| other systems | `8` |

## Initial Defects

At run creation, one initial defect is selected by seed from:

```text
life_support
reactor
sensors
archives
```

Initial defects set both a system state and starting numeric conditions.

| Defect | Starting effects |
| --- | --- |
| `life_support` | lower hull, lower oxygen, lower pressure, lower humidity, lower O2 fraction, higher CO2, `life_support=damaged` |
| `reactor` | lower power, higher heat, higher temperature, `reactor=degraded` |
| `sensors` | `sensors=unstable` |
| `archives` | higher particulate, `archives=corrupted` |

Propulsion currently starts nominal.

## Terminal Conditions

The run is lost when any of these conditions are met:

```text
hull <= 0
oxygen <= 0
fuel <= 0
heat >= 100
```

The run is won when:

```text
location == sector-06
and recovered archive fragments >= 3
```

## Current Gaps

Some system states are currently diagnostic labels rather than full mechanical modifiers:

- `reactor=degraded` does not directly alter the power or heat formulas.
- `sensors=unstable` does not directly reduce signal gain or scan fidelity.
- `propulsion` state does not directly alter jump cost or cooling support.
- Artifact faults are recognized by `status` and `repair`, but most do not yet produce independent recurring symptoms.

The intended next step is to make each unresolved system fault produce a specific gradual consequence while preserving the current step-and-drift structure.

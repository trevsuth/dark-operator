# AGENTS.md

## Project Vision

This project is a terminal-first science fiction simulation game built on an existing React application that emulates a bash-like terminal, tmux-style pane management, and an embedded Lua interpreter.

The game should feel like a blend of:

* TIS-100
* Duskers
* Hacknet
* else Heart.Break()
* classic hard science fiction
* abandoned generation ship mysteries

The player interacts entirely through terminal interfaces.

They do not control a character directly.

They are an operator, caretaker, or intelligence responsible for understanding and maintaining a vast and aging spacecraft whose systems are only partially understood.

The core fantasy is:

> I am alone at a terminal, slowly learning how this machine works, writing scripts to survive, explore, and uncover what happened.

---

# Setting

The game takes place aboard the:

**CSV Simurgh**

A centuries-old deep-space exploration vessel.

The Simurgh was once humanity's most ambitious archive and exploration mission, carrying scientific knowledge, automated systems, and generations of travelers toward distant regions of space.

Something happened.

The vessel continues its journey, but many systems have failed, records are fragmented, and much of its purpose has been forgotten.

The player awakens as:

* an emergency systems officer
* a dormant maintenance AI
* an archival recovery process
* a remote operator connected through delayed communications

The truth should not be revealed immediately.

The ship's history should emerge through:

* logs
* maintenance records
* crew journals
* corrupted archives
* system diagnostics
* strange discoveries

---

# Literary Inspiration

The vessel name references the Simurgh of Persian literature and mythology.

Themes to emphasize:

* journeys of transformation
* seeking knowledge
* imperfect understanding
* memory and forgetting
* identity
* loneliness
* discovery through persistence

The game should occasionally reference these themes indirectly through logs, archived writings, and crew philosophy.

Avoid direct exposition.

Allow players to discover meaning gradually.

---

# Core Design Goals

The prototype should focus on:

1. Terminal-based interaction
2. Lua scripting as a gameplay mechanic
3. Randomized events
4. Exploration through information
5. Resource management
6. Mystery and atmosphere
7. High replayability

The player should feel increasingly competent as they learn both the ship and the scripting system.

---

# Core Gameplay Loop

The player repeatedly:

1. Reviews ship status
2. Reads alerts and logs
3. Investigates anomalies
4. Runs commands
5. Writes Lua scripts
6. Automates repetitive tasks
7. Allocates resources
8. Responds to emergencies
9. Explores new sectors
10. Recovers fragments of history

Over time, the player transforms from an operator into an expert caretaker of the Simurgh.

---

# Lua Learning Philosophy

Lua is not a side feature.

Lua is a progression system.

Learning Lua should provide real advantages.

Players should be able to complete the game with minimal programming knowledge.

However, players who learn Lua should gain:

* efficiency
* automation
* resilience
* access to advanced systems

The game should teach Lua through gameplay rather than tutorial popups.

Every lesson should immediately solve a real problem.

---

# In-Universe Tutorial System

Tutorials should exist as discoverable documents aboard the ship.

Examples:

```text
/archive/manuals/lua
/archive/training
/archive/engineering
```

Players learn by reading archived training materials.

Examples:

```bash
cat /archive/manuals/lua/01_variables.txt
```

```bash
cat /archive/manuals/lua/02_conditions.txt
```

```bash
cat /archive/manuals/lua/03_loops.txt
```

The tutorials should feel like genuine crew training documents.

Example tone:

```text
SHIPBOARD AUTOMATION MANUAL

SECTION 01: VARIABLES

Variables store values for later use.

Example:

local oxygen = 75

This creates a variable named oxygen
containing the value 75.
```

---

# Lua Curriculum

The game should gradually teach:

### Stage 1

Variables

```lua
local oxygen = 75
```

### Stage 2

Functions

```lua
local status = ship.status()
```

### Stage 3

Conditionals

```lua
if status.oxygen < 40 then
    ship.repair("life_support")
end
```

### Stage 4

Loops

```lua
for _, drone in ipairs(drones) do
    drone.scan()
end
```

### Stage 5

Tables

```lua
local systems = ship.systems()
```

### Stage 6

Automation

```lua
function emergency_check()
    local s = ship.status()

    if s.power < 25 then
        ship.power("reactor", 20)
    end
end
```

Each lesson should unlock because the player encounters a situation where it becomes useful.

---

# Tmux-Style Terminal Layout

The interface should support multiple panes.

Suggested panes:

### Main

Player commands

### Status

Ship resources and alerts

### Logs

Event stream

### Sensors

Scan output

### Lua

Script editor and execution results

Additional panes may be added later.

---

# Ship Resources

Track at minimum:

```ts
type ShipState = {
  hull: number;
  power: number;
  oxygen: number;
  fuel: number;
  heat: number;
  signal: number;
  turn: number;
  location: string;
};
```

Resources should evolve continuously.

Players must make tradeoffs.

---

# Randomized Runs

Every run should be seeded.

Important systems to randomize:

## Sector Layout

Different routes and discoveries.

## Event Deck

Different hazards and opportunities.

## Story Fragments

Logs appear in varying orders.

## Ship Defects

Different systems begin damaged.

Examples:

* damaged life support
* degraded reactor
* unstable sensors
* corrupted archives

## Objectives

Possible goals:

* Reach a distress beacon
* Recover archive fragments
* Reactivate jump systems
* Survive fifty turns
* Reconstruct crew history
* Escape an anomalous region

---

# Event System

Example event structure:

```ts
type GameEvent = {
  id: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high";
  effects: Partial<ShipState>;
};
```

Possible events:

* micrometeor impacts
* oxygen leaks
* reactor instability
* distress signals
* ghost transmissions
* archive corruption
* sensor anomalies
* abandoned probes
* unknown structures
* impossible astronomical readings

Events should scale with ship condition and progression.

---

# Command Examples

```bash
status
```

Display current ship status.

```bash
scan
```

Perform a sensor sweep.

```bash
power sensors 20
```

Allocate power.

```bash
repair life_support
```

Attempt repairs.

```bash
logs
```

View recent activity.

```bash
map
```

Display known sectors.

```bash
jump sector-07
```

Travel.

```bash
run emergency.lua
```

Execute a saved script.

---

# Architecture

Keep game logic independent from React.

Suggested structure:

```text
src/
  game/
    engine.ts
    state.ts
    events.ts
    commands.ts
    luaApi.ts
    map.ts
    story.ts

  terminal/
    shell.ts
    panes.ts
    history.ts

  components/
    TerminalApp.tsx
    Pane.tsx
    StatusPanel.tsx
    LuaEditor.tsx
```

Core APIs:

```ts
createGame(seed?: string)
executeCommand(input: string)
advanceTurn()
runLuaScript(script: string)
```

---

# Atmosphere

The Simurgh should feel:

* old
* enormous
* partially forgotten
* functional but fragile
* lonely
* mysterious

Good examples:

```text
[WARN] Life support loop B reporting pressure variance.

[INFO] Archive reconstruction completed.

[UNKNOWN] Signal detected on decommissioned crew channel.
```

Avoid humor-heavy writing.

Favor technical language, ambiguity, and restraint.

---

# First Playable Prototype

The prototype is complete when the player can:

1. Start a seeded run
2. View ship status
3. Execute commands
4. Advance turns
5. Encounter random events
6. Run Lua scripts
7. Learn basic Lua through discovered manuals
8. Visit multiple sectors
9. Discover story fragments
10. Win or lose a run

---

# Definition of Success

A successful prototype creates the feeling that:

"I don't fully understand this ship yet, but I understand more than I did an hour ago."

The player should finish a run wanting to:

* discover new logs
* try a different strategy
* write a better automation script
* uncover another piece of the Simurgh's history

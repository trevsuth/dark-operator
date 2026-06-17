# Dark Operator

Dark Operator is a terminal-first science fiction simulation game prototype set aboard the CSV Simurgh, a centuries-old deep-space exploration vessel with damaged systems, fragmented archives, and an unclear history.

The player interacts entirely through terminal interfaces. They inspect ship status, read logs and manuals, run commands, write Lua automation, manage scarce resources, travel between sectors, and recover pieces of the ship's story.

## Current Prototype

The current vertical slice includes:

- A React/Vite terminal interface with bash-like commands.
- Tmux-style multiple panes with vertical and horizontal splits.
- A virtual filesystem with ship records, crew documents, Lua training manuals, and per-system service manuals.
- A sandboxed Lua runtime powered by Fengari.
- Seeded ship state and deterministic event progression.
- Sector exploration across the CSV Simurgh.
- Resource management for hull, power, oxygen, fuel, heat, signal, and environmental telemetry.
- Randomized ship defects, artifact-based repair diagnostics, and recurring ship events.
- Archive fragments, win conditions, and loss conditions.
- Unix-style man pages for all shell and shipboard programs.
- Editable `.bashrc` aliases through `vim ~/.bashrc` and `source ~/.bashrc`.

## Run Locally

```bash
npm install
npm run dev
```

Then open the local Vite URL, usually:

```text
http://127.0.0.1:5173/
```

## Build

```bash
npm run build
```

## First Commands

Inside the terminal, try:

```bash
status
status -v
status reactor
scan
map
logs
cat /archive/manuals/lua/01_variables.txt
cat /archive/manuals/reactor/service_manual.txt
cat /ship/systems/reactor/README.txt
run emergency.lua
jump sector-02
```

The shell also supports familiar utility commands such as `ls`, `cd`, `cat`, `grep`, `sed`, `awk`, `vim`, `lua`, `man`, `alias`, `source`, and `tmux`.

## Ship Systems

The current repair model covers five major systems:

- `reactor`
- `life_support`
- `sensors`
- `archives`
- `propulsion`

Each system has repair artifacts under:

```text
/ship/systems/<system>
```

These include configuration files, logs, diagnostics, data tables, and scripts. Running `repair <system>` validates those artifacts against known fault signatures before improving the system state.

Each system also has a service manual directory under:

```text
/archive/manuals/<system>
```

Manual directories include indexes, service descriptions, component notes, ASCII diagrams, fault procedures, calibration notes, maintenance logs, and field notes. They are intended to be useful in play, not only atmospheric.

Useful diagnostics:

```bash
status
status -v
status reactor
status --all
repair reactor
man repair
```

The current degradation model is documented in [docs/simulation.md](docs/simulation.md). In short, system condition changes in discrete steps while resources and environmental telemetry drift gradually each cycle.

## Tmux Controls

Run `tmux` to enter the pane multiplexer. The prefix key is `Ctrl-b`.

```text
Ctrl-b c   create a new vertical pane
Ctrl-b C   create a new horizontal pane
Ctrl-b n   next pane
Ctrl-b p   previous pane
Ctrl-b x   close pane
Ctrl-b 0-9 select pane by id
```

## Lua Automation

Lua is intended to be a gameplay progression system, not just a scripting add-on. The prototype exposes a small ship API:

```lua
local s = ship.status()

if s.oxygen < 55 then
  ship.repair("life_support")
end

if s.power < 35 then
  ship.power("reactor", 42)
end
```

Available ship helpers:

- `ship.status()`
- `ship.logs()`
- `ship.repair(system)`
- `ship.power(system, amount)`
- `ship.scan()`
- `ship.print_status()`

The existing filesystem helpers remain available through `fs.read`, `fs.write`, and `fs.list`.

## Project Structure

```text
src/
  game/
    engine.js
    events.js
    map.js
    random.js
    repairSystems.js
    state.js
    story.js
  terminal/
    Terminal.jsx
    aliases.js
    commands.js
    completion.js
    filesystem.js
    luaRuntime.js
    manpages.js
    parser.js
    path.js
    shell.js
    systemManuals.js
```

Game logic should stay independent from React. React owns display and input; `src/game` owns simulation rules; `src/terminal` bridges shell commands, virtual files, and Lua execution.

## Design Direction

The intended experience is restrained, technical, and lonely. The player should feel like an operator slowly learning how an enormous old machine works:

> I don't fully understand this ship yet, but I understand more than I did an hour ago.

Avoid heavy exposition. Prefer logs, diagnostics, manuals, corrupted records, and strange discoveries that imply history over time.

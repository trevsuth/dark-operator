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
map -v
logs
cat /archive/manuals/lua/01_variables.txt
cat /archive/manuals/reactor/service_manual.txt
cat /ship/systems/reactor/README.txt
run emergency.lua
jump sector-02
```

The shell also supports familiar utility commands such as `ls`, `cd`, `cat`, `grep`, `sed`, `awk`, `diff`, `head`, `tail`, `wc`, `sort`, `uniq`, `checksum`, `vim`, `lua`, `man`, `alias`, `source`, and `tmux`.

## How To Play

You are operating the CSV Simurgh through a terminal. Most actions are typed commands. Some commands only inspect information; others advance the ship cycle and may trigger events.

Start each run by checking the ship:

```bash
status
status -v
logs
```

Use `status` to track hull, power, oxygen, fuel, heat, signal, environmental telemetry, system condition, and the current objective. Use `logs` to review recent events.

Read ship documents like a normal filesystem:

```bash
ls /archive/manuals
cat /ship/briefing.txt
cat /archive/manuals/life_support/service_manual.txt
man repair
```

Explore sectors with scans, maps, and jumps:

```bash
scan
map
map -v
jump sector-02
```

`scan` advances the cycle and may recover archive fragments. If sensors have at least `30` power allocated, `scan` also resolves adjacent sectors before you jump into them:

```bash
power archives 0
power sensors 30
scan
map -v
```

Adjacent scans reveal nearby sector names, signal bias, route links, and whether an archive signature is present. They do not recover archive fragments; to recover a fragment, jump to that sector and scan it directly.

`jump` moves only to adjacent sectors and costs fuel. The objective is to reach the beacon terminus after recovering enough archive context.

### Win Conditions And Archive Fragments

The current prototype has one win condition:

```text
Reach sector-06 and recover at least three archive fragments.
```

`sector-06` is the Beacon Terminus. You can reach it by following connected sectors shown by `map` or `map -v`, but arriving there is not enough by itself. The Simurgh also needs enough recovered archive context to reconstruct the beacon route.

Archive fragments are short recovered records attached to specific sectors. They represent pieces of the ship's damaged memory: crew records, maintenance notes, signal residue, command indexes, and other partial historical data. They are discovered by running `scan` in sectors that contain recoverable archive data.

In the current map, fragments can be found in:

```text
sector-02  Archive Spine
sector-04  Dormant Habitat
sector-05  Garden Vault
sector-06  Beacon Terminus
```

You only need three fragments to satisfy the current objective. `status` shows progress as:

```text
archives recovered: 0/3
```

The run is lost if hull reaches `0`, oxygen reaches `0`, fuel reaches `0`, or heat reaches `100`.

Map markers:

```text
* current sector
+ visited sector
~ scanned but unvisited sector
? unscanned sector
```

Repair systems by inspecting their files, editing bad artifacts, then validating the repair:

```bash
diagnose reactor
status reactor
ls /ship/systems/reactor
cat /ship/systems/reactor/faults.log
vim /ship/systems/reactor/config.ini
repair reactor
```

If `repair` reports active artifact faults, read the evidence path and correct the listed file. System manuals under `/archive/manuals/<system>` explain expected values and failure modes.

Clean reference snapshots are available under `/ship/baselines/<system>`. Use them when a repair depends on multiple files agreeing with each other:

```bash
ls /ship/baselines/reactor
cat /ship/baselines/reactor/config.ini
cat /ship/systems/reactor/config.ini
diff /ship/baselines/reactor/config.ini /ship/systems/reactor/config.ini
tail /ship/systems/reactor/status.log
```

Allocate power when resources are drifting badly:

```bash
power reactor 40
power life_support 30
power propulsion 12
```

Higher reactor allocation can recover power but raises heat. Life support allocation helps oxygen and atmosphere. Propulsion allocation supports heat rejection when it is at least `8`.

Use Lua when a task becomes repetitive:

```bash
cat emergency.lua
vim emergency.lua
run emergency.lua
run audit.lua
watch survey.lua 2
```

Lua scripts can read status, scan, repair, allocate power, and inspect virtual files. Start with `/archive/manuals/lua/01_variables.txt`.

As you recover archive fragments or restore the archive system, sealed archive directories can be released:

```bash
unlock archives
ls /archive/manuals/advanced
```

Use panes when you want status, logs, manuals, and scripts visible in separate terminals:

```bash
tmux
```

Then use `Ctrl-b c` for a vertical pane or `Ctrl-b C` for a horizontal pane.

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

Each system also has clean baseline snapshots under:

```text
/ship/baselines/<system>
```

Baselines exclude volatile files such as `status.log`, `faults.log`, and scripts. They are reference artifacts for manual inspection and future comparison tools.

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

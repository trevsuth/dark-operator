const MAN_PAGES = {
  alias: {
    name: "alias",
    section: "1",
    summary: "define or list command aliases",
    synopsis: ["alias", "alias NAME", "alias NAME=VALUE"],
    description: [
      "alias defines short command names for the current shell session. With no operands, it lists all active aliases. With NAME, it prints that alias if it exists.",
      "Aliases are expanded as the first word of each command or pipeline segment. To make aliases available after editing .bashrc, run source ~/.bashrc.",
    ],
    examples: ["alias", "alias st", "alias oxy=status", "source ~/.bashrc"],
    seeAlso: ["source(1)", "man(1)", "status(1)"],
  },
  awk: {
    name: "awk",
    section: "1",
    summary: "pattern-directed column processing",
    synopsis: ["awk PROGRAM [FILE ...]", "COMMAND | awk PROGRAM"],
    description: [
      "awk reads text records and prints selected fields. This implementation supports a small, useful subset of POSIX awk for shipboard log inspection.",
      "PROGRAM may contain an optional /pattern/ followed by a print block. Fields are split on whitespace unless -F is supplied.",
    ],
    options: ["-F SEP    split input fields using SEP instead of whitespace"],
    examples: [
      "awk '{ print $1 }' /var/log/system.log",
      "echo 'oxygen:82' | awk -F: '{ print $2 }'",
      "logs | awk '/WARN/ { print $0 }'",
    ],
    seeAlso: ["grep(1)", "sed(1)", "cat(1)"],
  },
  cat: {
    name: "cat",
    section: "1",
    summary: "concatenate and print files",
    synopsis: ["cat FILE ...", "COMMAND | cat"],
    description: [
      "cat prints file contents to the terminal. With no file operands, it prints standard input from the previous pipeline stage.",
      "Use cat to read archive manuals, crew records, ship briefings, and scripts before editing or executing them.",
    ],
    examples: [
      "cat /ship/briefing.txt",
      "cat /archive/manuals/lua/01_variables.txt",
      "cat emergency.lua",
    ],
    seeAlso: ["ls(1)", "grep(1)", "vim(1)"],
  },
  cd: {
    name: "cd",
    section: "1",
    summary: "change working directory",
    synopsis: ["cd [DIRECTORY]"],
    description: [
      "cd changes the shell working directory. Without an operand, it returns to the operator home directory.",
      "Paths may be absolute, relative, current-directory, or parent-directory references.",
    ],
    examples: ["cd /archive/manuals/lua", "cd ..", "cd"],
    seeAlso: ["pwd(1)", "ls(1)"],
  },
  clear: {
    name: "clear",
    section: "1",
    summary: "clear terminal history",
    synopsis: ["clear"],
    description: [
      "clear removes the visible scrollback for the active pane. It does not reset ship state, command history, files, scripts, or tmux panes.",
    ],
    examples: ["clear"],
    seeAlso: ["tmux(1)"],
  },
  checksum: {
    name: "checksum",
    section: "1",
    summary: "print stable text checksums",
    synopsis: ["checksum FILE ...", "COMMAND | checksum"],
    description: [
      "checksum prints a stable hexadecimal checksum for each file operand. With no files, it reads standard input from the previous pipeline stage.",
      "Use checksum to compare live repair artifacts with baseline snapshots when exact content matters.",
    ],
    examples: ["checksum /ship/systems/reactor/config.ini", "cat emergency.lua | checksum"],
    seeAlso: ["diff(1)", "cat(1)", "repair(1)"],
  },
  diff: {
    name: "diff",
    section: "1",
    summary: "compare two files line by line",
    synopsis: ["diff FILE FILE"],
    description: [
      "diff compares two virtual filesystem files and prints changed lines with - for the first file and + for the second file.",
      "This implementation is intentionally small and line-oriented. It is useful for comparing /ship/systems artifacts against /ship/baselines snapshots.",
    ],
    examples: ["diff /ship/baselines/sensors/arrays.tsv /ship/systems/sensors/arrays.tsv"],
    seeAlso: ["checksum(1)", "cat(1)", "repair(1)"],
  },
  diagnose: {
    name: "diagnose",
    section: "1",
    summary: "surface system symptoms",
    synopsis: ["diagnose SYSTEM"],
    description: [
      "diagnose prints a surface-level diagnostic report for a ship system. It names symptoms, likely fault families, and recommended files to inspect.",
      "diagnose does not repair the system and does not reveal every answer. Use status, tail, diff, checksum, manuals, and repair artifacts for evidence.",
    ],
    examples: ["diagnose sensors", "diagnose reactor"],
    seeAlso: ["status(1)", "repair(1)", "diff(1)", "tail(1)"],
  },
  echo: {
    name: "echo",
    section: "1",
    summary: "write arguments to standard output",
    synopsis: ["echo [ARG ...]"],
    description: [
      "echo prints its arguments separated by spaces. It is useful for testing pipelines or producing small strings for grep, sed, and awk.",
    ],
    examples: ["echo CSV Simurgh", "echo 'oxygen:82' | awk -F: '{ print $2 }'"],
    seeAlso: ["awk(1)", "grep(1)", "sed(1)"],
  },
  grep: {
    name: "grep",
    section: "1",
    summary: "print lines matching a pattern",
    synopsis: ["grep [OPTION] PATTERN [FILE ...]", "COMMAND | grep [OPTION] PATTERN"],
    description: [
      "grep searches input lines for a JavaScript regular expression pattern and prints matching lines.",
      "When FILE operands are omitted, grep reads standard input from the previous pipeline stage.",
    ],
    options: ["-i       ignore case", "-n       prefix matches with line numbers"],
    examples: [
      "grep WARN /var/log/system.log",
      "grep -in oxygen /archive/manuals/lua/02_conditions.txt",
      "logs | grep UNKNOWN",
    ],
    seeAlso: ["cat(1)", "sed(1)", "awk(1)", "logs(1)"],
  },
  head: {
    name: "head",
    section: "1",
    summary: "print the first lines of text",
    synopsis: ["head [-n COUNT] [FILE ...]", "COMMAND | head [-n COUNT]"],
    description: [
      "head prints the first lines of files or standard input. The default count is 10 lines.",
      "Use head to inspect the beginning of long manuals, logs, and diagnostics.",
    ],
    options: ["-n COUNT    print COUNT lines instead of 10"],
    examples: ["head /ship/systems/reactor/status.log", "logs | head -n 3"],
    seeAlso: ["tail(1)", "cat(1)", "grep(1)"],
  },
  help: {
    name: "help",
    section: "1",
    summary: "display available commands",
    synopsis: ["help"],
    description: [
      "help prints the commands registered in the current shell and a short summary for each one.",
      "For detailed usage, use man COMMAND.",
    ],
    examples: ["help", "man scan"],
    seeAlso: ["man(1)"],
  },
  jump: {
    name: "jump",
    section: "1",
    summary: "travel to an adjacent sector",
    synopsis: ["jump SECTOR"],
    description: [
      "jump burns propellant and moves the Simurgh operator context to an adjacent sector. The destination must be linked from the current location.",
      "A successful jump advances the ship cycle and may trigger an event. Use map and scan before jumping.",
    ],
    examples: ["map", "jump sector-02", "jump sector-04"],
    seeAlso: ["map(1)", "scan(1)", "status(1)"],
  },
  logs: {
    name: "logs",
    section: "1",
    summary: "show recent ship events",
    synopsis: ["logs"],
    description: [
      "logs prints recent shipboard events, warnings, navigation records, repairs, archive recoveries, and win or loss notices.",
      "Use logs to reconstruct what happened during the run and to feed diagnostic pipelines.",
    ],
    examples: ["logs", "logs | grep WARN", "logs | awk '/ARCHIVE/ { print $0 }'"],
    seeAlso: ["grep(1)", "status(1)", "scan(1)"],
  },
  ls: {
    name: "ls",
    section: "1",
    summary: "list directory contents",
    synopsis: ["ls [DIRECTORY]"],
    description: [
      "ls lists files and directories in the virtual filesystem. Directory names are printed with a trailing slash.",
      "Option flags are ignored except that the first non-option argument is treated as the target path.",
    ],
    examples: ["ls", "ls /archive", "ls /archive/manuals/lua"],
    seeAlso: ["cd(1)", "cat(1)", "pwd(1)"],
  },
  lua: {
    name: "lua",
    section: "1",
    summary: "execute a Lua script file",
    synopsis: ["lua FILE"],
    description: [
      "lua executes a saved Lua script through the shipboard automation interpreter. The interpreter is sandboxed and has an instruction budget to stop runaway scripts.",
      "Scripts may use print(), fs.read(), fs.write(), fs.list(), state.get(), state.set(), and the ship API documented in run(1).",
    ],
    examples: ["lua emergency.lua", "vim survey.lua", "lua survey.lua"],
    seeAlso: ["run(1)", "vim(1)", "cat(1)"],
  },
  man: {
    name: "man",
    section: "1",
    summary: "display reference manual pages",
    synopsis: ["man COMMAND", "man -k KEYWORD"],
    description: [
      "man displays manual pages for shell programs and shipboard commands.",
      "With -k, man searches page names and summaries for KEYWORD. With no operands, it lists available pages.",
    ],
    examples: ["man status", "man grep", "man -k lua"],
    seeAlso: ["help(1)"],
  },
  map: {
    name: "map",
    section: "1",
    summary: "show known sectors",
    synopsis: ["map", "map -v", "map --visual"],
    description: [
      "map prints the Simurgh sector graph known to the operator. The current sector is marked with *, visited sectors are marked with +, and unknown sectors are marked with ?.",
      "Sectors resolved by powered adjacent scans are marked with ~ until visited.",
      "With -v or --visual, map renders the explored sector graph as an ASCII diagram. Unvisited sectors are shown without names until reached.",
      "Use map to choose legal jump destinations and to reason about routes toward the beacon terminus.",
    ],
    options: ["-v, --visual    render the explored map as an ASCII diagram"],
    examples: ["map", "map -v", "scan", "jump sector-02"],
    seeAlso: ["jump(1)", "scan(1)", "status(1)"],
  },
  power: {
    name: "power",
    section: "1",
    summary: "allocate ship power",
    synopsis: ["power SYSTEM AMOUNT"],
    description: [
      "power changes grid allocation for a ship system. Valid systems are reactor, life_support, sensors, archives, and propulsion.",
      "The total allocation may not exceed 100. Allocation affects resource drift during future ship cycles.",
    ],
    examples: ["power sensors 25", "power reactor 42", "power life_support 32"],
    seeAlso: ["status(1)", "wait(1)", "repair(1)"],
  },
  pwd: {
    name: "pwd",
    section: "1",
    summary: "print working directory",
    synopsis: ["pwd"],
    description: ["pwd prints the absolute path of the current shell working directory."],
    examples: ["pwd", "cd /archive", "pwd"],
    seeAlso: ["cd(1)", "ls(1)"],
  },
  repair: {
    name: "repair",
    section: "1",
    summary: "validate and apply system repairs",
    synopsis: ["repair SYSTEM"],
    description: [
      "repair validates the artifact files for a ship system and applies the repair only when known faults have been corrected.",
      "Valid systems are reactor, life_support, sensors, archives, and propulsion. Each system has logs, configuration files, diagnostics, and data tables under /ship/systems/SYSTEM.",
      "If files still match a known fault signature, repair reports the evidence path and the required correction instead of improving system state.",
      "A successful repair spends ship power, improves system state, and advances the ship cycle.",
    ],
    examples: ["status sensors", "cat /ship/systems/sensors/faults.log", "vim /ship/systems/sensors/arrays.tsv", "repair sensors"],
    seeAlso: ["status(1)", "power(1)", "logs(1)"],
  },
  run: {
    name: "run",
    section: "1",
    summary: "execute a Lua automation script",
    synopsis: ["run FILE"],
    description: [
      "run executes a saved Lua automation script. It is an operator-facing alias for lua, intended for ship scripts such as emergency.lua.",
      "The ship API provides ship.status(), ship.logs(), ship.repair(system), ship.power(system, amount), ship.scan(), and ship.print_status().",
    ],
    examples: ["run emergency.lua", "cat emergency.lua", "vim emergency.lua"],
    seeAlso: ["lua(1)", "vim(1)", "status(1)"],
  },
  scan: {
    name: "scan",
    section: "1",
    summary: "scan the current sector",
    synopsis: ["scan"],
    description: [
      "scan performs a sensor sweep of the current sector, printing local description, adjacent sectors, signal strength, and any newly recoverable archive fragment.",
      "When sensors have at least 30 grid units allocated, scan also resolves adjacent sectors. Adjacent sweep returns names, signal bias, links, and archive signatures, and marks those sectors as scanned on map output.",
      "Adjacent scans do not recover archive fragments. To recover a fragment, jump to that sector and scan it directly.",
      "A scan advances the ship cycle and may trigger events. Use scan before jumping into unknown routes.",
    ],
    examples: ["power archives 0", "power sensors 30", "scan", "map -v", "scan | grep ARCHIVE"],
    seeAlso: ["map(1)", "jump(1)", "logs(1)"],
  },
  sed: {
    name: "sed",
    section: "1",
    summary: "stream text substitution",
    synopsis: ["sed EXPRESSION [FILE ...]", "COMMAND | sed EXPRESSION"],
    description: [
      "sed transforms input text with a supported substitution expression of the form s/PATTERN/REPLACEMENT/[g].",
      "PATTERN is interpreted as a JavaScript regular expression. With no FILE operands, sed reads from the previous pipeline stage.",
    ],
    examples: ["sed 's/oxygen/O2/' /archive/manuals/lua/02_conditions.txt", "logs | sed 's/^/[LOG] /'"],
    seeAlso: ["grep(1)", "awk(1)", "cat(1)"],
  },
  source: {
    name: "source",
    section: "1",
    summary: "read aliases from a shell file",
    synopsis: ["source [~/.bashrc]"],
    description: [
      "source reads /home/operator/.bashrc and replaces the active shell alias table with aliases found in that file.",
      "This implementation supports alias definitions of the form alias NAME='VALUE'. Other shell commands in .bashrc are ignored.",
    ],
    examples: ["vim ~/.bashrc", "source ~/.bashrc", "alias"],
    seeAlso: ["alias(1)", "vim(1)", "cat(1)"],
  },
  sort: {
    name: "sort",
    section: "1",
    summary: "sort text lines",
    synopsis: ["sort [FILE ...]", "COMMAND | sort"],
    description: [
      "sort prints input lines in ascending lexical order. With no file operands, it reads standard input from the previous pipeline stage.",
    ],
    examples: ["cat /ship/systems/archives/manifest.tsv | sort", "logs | sort"],
    seeAlso: ["uniq(1)", "awk(1)", "grep(1)"],
  },
  status: {
    name: "status",
    section: "1",
    summary: "display current ship telemetry",
    synopsis: ["status", "status SYSTEM", "status -a", "status --all", "status -v", "status --visual"],
    description: [
      "status prints the current run seed, objective, run state, turn, location, resource bars, environmental telemetry, system states, power allocation, and archive recovery progress.",
      "When called with a system name, status prints a detailed diagnostic readout for that system, including artifact validation results. Valid systems are reactor, life_support, sensors, archives, and propulsion.",
      "With -a or --all, status prints detailed readouts for every system.",
      "With -v or --visual, status prints a compact dashboard-style summary inspired by terminal monitors such as btop.",
      "It is the primary command for deciding whether to repair, reallocate power, scan, jump, or wait.",
    ],
    options: ["-a, --all       print detailed readouts for all systems", "-v, --visual    print a visual dashboard summary"],
    examples: ["status", "status -v", "status reactor", "status sensors", "status --all", "status | grep oxygen"],
    seeAlso: ["power(1)", "repair(1)", "scan(1)", "logs(1)"],
  },
  tmux: {
    name: "tmux",
    section: "1",
    summary: "start terminal multiplexer",
    synopsis: ["tmux"],
    description: [
      "tmux attaches the terminal to a simple pane multiplexer. Use panes to keep commands, logs, Lua scripts, and status work separated.",
      "The prefix key is Ctrl-b. After the prefix, c creates a pane, n and p switch panes, x closes a pane, and digits select panes by id.",
    ],
    examples: ["tmux", "Ctrl-b c", "Ctrl-b n"],
    seeAlso: ["vim(1)", "status(1)", "logs(1)"],
  },
  unlock: {
    name: "unlock",
    section: "1",
    summary: "unlock recovered archive directories",
    synopsis: ["unlock archives"],
    description: [
      "unlock archives releases sealed archive directories after enough archive context has been recovered or the archive system is nominal.",
      "Unlocked directories include advanced manuals, private crew records, and historical diagnostics.",
    ],
    examples: ["unlock archives", "ls /archive/manuals/advanced"],
    seeAlso: ["scan(1)", "status(1)", "cat(1)"],
  },
  tail: {
    name: "tail",
    section: "1",
    summary: "print the last lines of text",
    synopsis: ["tail [-n COUNT] [FILE ...]", "COMMAND | tail [-n COUNT]"],
    description: [
      "tail prints the last lines of files or standard input. The default count is 10 lines.",
      "Use tail to inspect recent system status and fault log entries.",
    ],
    options: ["-n COUNT    print COUNT lines instead of 10"],
    examples: ["tail /ship/systems/sensors/faults.log", "logs | tail -n 5"],
    seeAlso: ["head(1)", "cat(1)", "grep(1)"],
  },
  uniq: {
    name: "uniq",
    section: "1",
    summary: "filter adjacent repeated lines",
    synopsis: ["uniq [FILE ...]", "COMMAND | uniq"],
    description: [
      "uniq removes adjacent duplicate lines. Sort input first when repeated values may not already be grouped.",
    ],
    examples: ["cat /ship/systems/archives/manifest.tsv | sort | uniq"],
    seeAlso: ["sort(1)", "grep(1)", "awk(1)"],
  },
  vim: {
    name: "vim",
    section: "1",
    summary: "edit a file",
    synopsis: ["vim FILE"],
    description: [
      "vim opens a small modal editor for files in the virtual filesystem. Press i to enter insert mode, Escape to return to normal mode, and : to enter a command.",
      "Supported editor commands are :w, :q, :q!, :wq, and :x.",
    ],
    examples: ["vim emergency.lua", "vim survey.lua", "run emergency.lua"],
    seeAlso: ["cat(1)", "lua(1)", "run(1)"],
  },
  wait: {
    name: "wait",
    section: "1",
    summary: "advance one ship cycle",
    synopsis: ["wait"],
    description: [
      "wait advances the simulation without issuing a repair, scan, or jump command. Resource drift is applied, logs are updated, and scheduled events may occur.",
      "Use wait cautiously when the ship is stable or when power allocation changes need time to affect resources.",
    ],
    examples: ["status", "wait", "logs"],
    seeAlso: ["status(1)", "power(1)", "logs(1)"],
  },
  watch: {
    name: "watch",
    section: "1",
    summary: "run a Lua script for several cycles",
    synopsis: ["watch FILE [COUNT]"],
    description: [
      "watch runs a Lua script repeatedly for a bounded number of cycles. COUNT defaults to 3 and is capped at 5.",
      "Use watch for conservative automation such as status checks, scans, and file audits. Scripts that advance ship time also append scheduled system logs.",
    ],
    examples: ["watch survey.lua", "watch emergency.lua 2"],
    seeAlso: ["run(1)", "lua(1)", "status(1)"],
  },
  wc: {
    name: "wc",
    section: "1",
    summary: "count lines words and bytes",
    synopsis: ["wc [FILE ...]", "COMMAND | wc"],
    description: [
      "wc prints line, word, and byte counts for files or standard input.",
      "Counts are useful for spotting truncated logs, unexpected manifests, and changed repair artifacts.",
    ],
    examples: ["wc /ship/systems/sensors/arrays.tsv", "cat /archive/manuals/reactor/service_manual.txt | wc"],
    seeAlso: ["cat(1)", "diff(1)", "checksum(1)"],
  },
  whoami: {
    name: "whoami",
    section: "1",
    summary: "print current user name",
    synopsis: ["whoami"],
    description: ["whoami prints the current shell user identity."],
    examples: ["whoami"],
    seeAlso: ["pwd(1)", "status(1)"],
  },
};

export function listManPages() {
  return Object.keys(MAN_PAGES).sort();
}

export function getManPage(name) {
  const page = MAN_PAGES[name];
  return page ? formatManPage(page) : null;
}

export function searchManPages(keyword) {
  const query = keyword.toLowerCase();
  return listManPages()
    .map((name) => MAN_PAGES[name])
    .filter((page) => page.name.includes(query) || page.summary.toLowerCase().includes(query))
    .map((page) => `${page.name} (${page.section}) - ${page.summary}`);
}

function formatManPage(page) {
  return [
    `${page.name.toUpperCase()}(${page.section})`.padEnd(38) + `${page.name.toUpperCase()}(${page.section})`,
    "",
    "NAME",
    `       ${page.name} - ${page.summary}`,
    "",
    "SYNOPSIS",
    ...page.synopsis.map((line) => `       ${line}`),
    "",
    "DESCRIPTION",
    ...formatParagraphs(page.description),
    ...formatSection("OPTIONS", page.options),
    ...formatSection("EXAMPLES", page.examples),
    ...formatSection("SEE ALSO", page.seeAlso?.map((item) => item)),
  ];
}

function formatParagraphs(paragraphs = []) {
  return paragraphs.flatMap((paragraph) => ["       " + paragraph, ""]).slice(0, -1);
}

function formatSection(title, lines = []) {
  if (!lines.length) return [];
  return ["", title, ...lines.map((line) => `       ${line}`)];
}

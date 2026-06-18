import { formatAlias, loadBashrcAliases, parseAliasLine } from "./aliases.js";
import { appendScheduledSystemLogs } from "./degradationLogs.js";
import { getParentDirectory, listDirectory, readFile, resolveNode, writeFile } from "./filesystem.js";
import { runLuaScript } from "./luaRuntime.js";
import { getManPage, listManPages, searchManPages } from "./manpages.js";
import { basename, normalizePath } from "./path.js";
import { executeGameCommand } from "../game/engine.js";

function text(lines = []) {
  return { type: "output", lines: Array.isArray(lines) ? lines : [lines] };
}

function commandHelp(registry) {
  const names = Object.keys(registry).sort();
  return [
    "Available commands:",
    ...names.map((name) => {
      const summary = registry[name].summary ? ` - ${registry[name].summary}` : "";
      return `  ${name}${summary}`;
    }),
  ];
}

export function createCommandRegistry() {
  const registry = {
    help: {
      summary: "show available commands",
      run: () => text(commandHelp(registry)),
    },
    alias: {
      summary: "define or list command aliases",
      run: ({ args, state }) => {
        if (!args.length) {
          const aliases = Object.entries(state.aliases || {}).sort(([a], [b]) => a.localeCompare(b));
          return text(aliases.length ? aliases.map(([name, value]) => formatAlias(name, value)) : "");
        }

        const nextAliases = { ...(state.aliases || {}) };
        const lines = [];

        for (const arg of args) {
          if (!arg.includes("=")) {
            if (nextAliases[arg]) {
              lines.push(formatAlias(arg, nextAliases[arg]));
            } else {
              lines.push(`alias: ${arg}: not found`);
            }
            continue;
          }

          const definition = parseAliasLine(`alias ${arg}`);
          if (!definition) {
            lines.push(`alias: ${arg}: invalid alias definition`);
            continue;
          }

          nextAliases[definition.name] = definition.value;
        }

        return {
          type: "state",
          patch: { aliases: nextAliases },
          lines,
        };
      },
    },
    man: {
      summary: "display reference manual pages",
      run: ({ args }) => {
        if (!args.length) {
          return text(["What manual page do you want?", `Available manual pages: ${listManPages().join(", ")}`]);
        }

        if (args[0] === "-k") {
          const keyword = args.slice(1).join(" ").trim();
          if (!keyword) return text("man: option requires an argument -- k");
          const matches = searchManPages(keyword);
          return text(matches.length ? matches : `${keyword}: nothing appropriate`);
        }

        const page = getManPage(args[0]);
        return text(page || `No manual entry for ${args[0]}`);
      },
    },
    source: {
      summary: "read aliases from a shell file",
      run: ({ args, state }) => {
        const path = args[0] || "~/.bashrc";
        if (path !== "~/.bashrc" && path !== ".bashrc" && path !== `/home/${state.user}/.bashrc`) {
          return text(`source: ${path}: only .bashrc alias files are supported`);
        }

        const aliases = loadBashrcAliases(state.fileSystem, state.user);
        return {
          type: "state",
          patch: { aliases },
          lines: [`loaded ${Object.keys(aliases).length} aliases from /home/${state.user}/.bashrc`],
        };
      },
    },
    status: gameCommand("show ship status"),
    scan: gameCommand("scan the current sector"),
    logs: gameCommand("show recent ship events"),
    map: gameCommand("show known sectors"),
    diagnose: gameCommand("surface system diagnostics"),
    jump: gameCommand("travel to an adjacent sector"),
    repair: gameCommand("attempt system repair"),
    power: gameCommand("allocate ship power"),
    wait: gameCommand("advance one ship cycle"),
    clear: {
      summary: "clear terminal history",
      run: () => ({ type: "clear" }),
    },
    pwd: {
      summary: "print working directory",
      run: ({ state }) => text(state.cwd),
    },
    whoami: {
      summary: "print current user",
      run: ({ state }) => text(state.user),
    },
    echo: {
      summary: "print arguments",
      run: ({ args }) => text(args.join(" ")),
    },
    ls: {
      summary: "list directory contents",
      run: ({ args, state }) => {
        const target = args.find((arg) => !arg.startsWith("-")) || ".";
        const result = listDirectory(target, state.cwd, state.fileSystem);
        if (!result.ok) return text(result.error);

        const names = result.entries.map((entry) =>
          typeof entry === "string" ? entry : entry.type === "directory" ? `${entry.name}/` : entry.name,
        );
        return text(names.length ? names.join("  ") : "");
      },
    },
    cd: {
      summary: "change working directory",
      run: ({ args, state }) => {
        const target = args[0] || `/home/${state.user}`;
        const path = normalizePath(target, state.cwd);
        const { node } = resolveNode(path, "/", state.fileSystem);

        if (!node) return text(`cd: ${target}: No such file or directory`);
        if (node.type !== "directory") return text(`cd: ${target}: Not a directory`);

        return {
          type: "state",
          patch: { cwd: path },
        };
      },
    },
    cat: {
      summary: "print file contents",
      run: ({ args, state, stdin }) => {
        if (!args.length) return stdin?.length ? text(stdin) : text("cat: missing file operand");

        const outputs = args.map((path) => {
          const result = readFile(path, state.cwd, state.fileSystem);
          return result.ok ? result.content : result.error;
        });

        return text(outputs.join("\n"));
      },
    },
    grep: {
      summary: "search text",
      run: ({ args, state, stdin }) => {
        const parsed = parseGrepArgs(args);
        if (!parsed.pattern) return text("grep: missing pattern");

        let expression;
        try {
          expression = new RegExp(parsed.pattern, parsed.ignoreCase ? "i" : "");
        } catch (error) {
          return text(`grep: invalid pattern: ${error.message}`);
        }

        const sources = parsed.files.length
          ? parsed.files.map((path) => {
              const result = readFile(path, state.cwd, state.fileSystem);
              return {
                label: path,
                ok: result.ok,
                lines: result.ok ? splitTextLines(result.content) : [result.error.replace(/^cat:/, "grep:")],
              };
            })
          : [{ label: null, ok: true, lines: stdin || [] }];

        const matches = [];
        for (const source of sources) {
          if (!source.ok) {
            matches.push(...source.lines);
            continue;
          }

          source.lines.forEach((line, index) => {
            if (!expression.test(line)) return;
            const prefix = [
              parsed.files.length > 1 ? `${source.label}:` : "",
              parsed.lineNumbers ? `${index + 1}:` : "",
            ].join("");
            matches.push(`${prefix}${line}`);
          });
        }

        return text(matches);
      },
    },
    sed: {
      summary: "transform text",
      run: ({ args, state, stdin }) => {
        const parsed = parseSedArgs(args);
        if (!parsed.expression) return text("sed: missing expression");

        const substitution = parseSedSubstitution(parsed.expression);
        if (!substitution) return text(`sed: unsupported expression: ${parsed.expression}`);

        let pattern;
        try {
          pattern = new RegExp(substitution.pattern, substitution.global ? "g" : "");
        } catch (error) {
          return text(`sed: invalid pattern: ${error.message}`);
        }

        const input = collectTextSources(parsed.files, state, stdin, "sed");
        if (!input.ok) return text(input.errors);

        return text(input.lines.map((line) => line.replace(pattern, substitution.replacement)));
      },
    },
    awk: {
      summary: "process columns",
      run: ({ args, state, stdin }) => {
        const parsed = parseAwkArgs(args);
        if (!parsed.program) return text("awk: missing program");

        const program = parseAwkProgram(parsed.program);
        if (!program) return text(`awk: unsupported program: ${parsed.program}`);

        let matchPattern = null;
        if (program.pattern) {
          try {
            matchPattern = new RegExp(program.pattern);
          } catch (error) {
            return text(`awk: invalid pattern: ${error.message}`);
          }
        }

        const input = collectTextSources(parsed.files, state, stdin, "awk");
        if (!input.ok) return text(input.errors);

        const output = [];
        for (const line of input.lines) {
          if (matchPattern && !matchPattern.test(line)) continue;
          output.push(formatAwkPrint(program.printItems, line, parsed.separator));
        }

        return text(output);
      },
    },
    head: {
      summary: "print the first lines",
      run: ({ args, state, stdin }) => {
        const parsed = parseCountAndFiles(args, 10);
        const input = collectTextSources(parsed.files, state, stdin, "head");
        if (!input.ok) return text(input.errors);
        return text(input.lines.slice(0, parsed.count));
      },
    },
    tail: {
      summary: "print the last lines",
      run: ({ args, state, stdin }) => {
        const parsed = parseCountAndFiles(args, 10);
        const input = collectTextSources(parsed.files, state, stdin, "tail");
        if (!input.ok) return text(input.errors);
        return text(input.lines.slice(-parsed.count));
      },
    },
    wc: {
      summary: "count lines words and bytes",
      run: ({ args, state, stdin }) => {
        const input = collectTextSources(args, state, stdin, "wc");
        if (!input.ok) return text(input.errors);
        const content = input.lines.join("\n");
        const words = content.trim() ? content.trim().split(/\s+/).length : 0;
        return text(`${input.lines.length} ${words} ${content.length}`);
      },
    },
    sort: {
      summary: "sort text lines",
      run: ({ args, state, stdin }) => {
        const input = collectTextSources(args, state, stdin, "sort");
        if (!input.ok) return text(input.errors);
        return text([...input.lines].sort((a, b) => a.localeCompare(b)));
      },
    },
    uniq: {
      summary: "filter repeated lines",
      run: ({ args, state, stdin }) => {
        const input = collectTextSources(args, state, stdin, "uniq");
        if (!input.ok) return text(input.errors);
        const output = [];
        for (const line of input.lines) {
          if (line !== output.at(-1)) output.push(line);
        }
        return text(output);
      },
    },
    diff: {
      summary: "compare two files",
      run: ({ args, state }) => {
        if (args.length < 2) return text("diff: missing file operand");
        const left = readFile(args[0], state.cwd, state.fileSystem);
        const right = readFile(args[1], state.cwd, state.fileSystem);
        if (!left.ok) return text(left.error.replace(/^cat:/, "diff:"));
        if (!right.ok) return text(right.error.replace(/^cat:/, "diff:"));
        return text(formatDiff(args[0], left.content, args[1], right.content));
      },
    },
    checksum: {
      summary: "print stable file checksums",
      run: ({ args, state, stdin }) => {
        if (!args.length) {
          const content = (stdin || []).join("\n");
          return text(`${checksumText(content)}  -`);
        }

        const lines = [];
        for (const path of args) {
          const result = readFile(path, state.cwd, state.fileSystem);
          lines.push(result.ok ? `${checksumText(result.content)}  ${path}` : result.error.replace(/^cat:/, "checksum:"));
        }
        return text(lines);
      },
    },
    watch: {
      summary: "run a Lua script for several cycles",
      run: ({ args, state }) => {
        if (!args.length) return text("watch: missing script file");
        const scriptPath = args[0];
        const count = Math.max(1, Math.min(5, Number(args[1]) || 3));
        const script = readFile(scriptPath, state.cwd, state.fileSystem);
        if (!script.ok) return text(script.error.replace(/^cat:/, "watch:"));

        let nextState = state;
        const lines = [`watch: running ${scriptPath} for ${count} cycle${count === 1 ? "" : "s"}`];
        for (let index = 0; index < count; index += 1) {
          const result = runLuaScript(script.content, nextState);
          const fileSystem = appendScheduledSystemLogs(nextState.game, result.game, result.fileSystem);
          nextState = {
            ...nextState,
            fileSystem,
            scriptState: result.scriptState,
            game: result.game,
          };
          lines.push(`[WATCH ${index + 1}/${count}]`);
          lines.push(...result.lines);
          if (result.game.status !== "active") break;
        }

        return {
          type: "state",
          patch: {
            fileSystem: nextState.fileSystem,
            scriptState: nextState.scriptState,
            game: nextState.game,
          },
          lines,
        };
      },
    },
    unlock: {
      summary: "unlock recovered archive directories",
      run: ({ args, state }) => {
        if (args[0] !== "archives") return text("unlock: usage: unlock archives");
        const archiveReady = state.game.systems.archives === "nominal" || state.game.discoveredFragments.length >= 2;
        if (!archiveReady) {
          return text([
            "unlock: archive context insufficient",
            "require archives=nominal or at least two recovered archive fragments",
          ]);
        }

        let fileSystem = state.fileSystem;
        for (const [path, content] of Object.entries(unlockedArchiveFiles())) {
          const result = writeFile(path, "/", content, fileSystem);
          if (result.ok) fileSystem = result.fileSystem;
        }

        return {
          type: "state",
          patch: { fileSystem },
          lines: [
            "[ARCHIVE] Advanced directories unlocked.",
            "available: /archive/manuals/advanced  /archive/crew/private  /archive/diagnostics/historical",
          ],
        };
      },
    },
    vim: {
      summary: "edit a file",
      run: ({ args, state }) => {
        if (!args.length) return text("vim: missing file operand");

        const target = args[0];
        const path = normalizePath(target, state.cwd);
        const { node } = resolveNode(path, "/", state.fileSystem);

        if (node?.type === "directory") return text(`vim: ${target}: Is a directory`);

        if (!node) {
          const parent = getParentDirectory(path, "/", state.fileSystem);
          if (!parent || parent.type !== "directory") {
            return text(`vim: ${target}: No such file or directory`);
          }
        }

        return {
          type: "state",
          patch: {
            editor: {
              path,
              name: basename(path),
              content: node?.content || "",
              command: "",
              dirty: false,
              mode: "normal",
              status: node ? `"${path}"` : `"${path}" [New File]`,
            },
          },
        };
      },
    },
    lua: {
      summary: "run a Lua script",
      run: runLuaCommand("lua"),
    },
    run: {
      summary: "run a Lua automation script",
      run: runLuaCommand("run"),
    },
    tmux: {
      summary: "start terminal multiplexer",
      run: () => ({
        type: "state",
        patch: {
          tmux: {
            active: true,
            status: "attached",
          },
        },
        lines: ["attached to tmux session", "prefix: Ctrl-b  c:new  n:next  p:previous  x:close  0-9:select"],
      }),
    },
  };

  return registry;
}

function gameCommand(summary) {
  return {
    summary,
    run: ({ parsed, args, state }) => {
      const result = executeGameCommand(parsed.command, args, state.game, { fileSystem: state.fileSystem });
      const fileSystem = appendScheduledSystemLogs(state.game, result.game, state.fileSystem);
      return {
        type: "state",
        patch: { game: result.game, fileSystem },
        lines: result.lines,
      };
    },
  };
}

function runLuaCommand(commandName) {
  return ({ args, state }) => {
    if (!args.length) return text(`${commandName}: missing script file`);

    const scriptPath = args[0];
    const script = readFile(scriptPath, state.cwd, state.fileSystem);
    if (!script.ok) return text(script.error.replace(/^cat:/, `${commandName}:`));

    const result = runLuaScript(script.content, state);
    const fileSystem = appendScheduledSystemLogs(state.game, result.game, result.fileSystem);
    return {
      type: "state",
      patch: {
        fileSystem,
        scriptState: result.scriptState,
        game: result.game,
      },
      lines: result.lines,
    };
  };
}

function parseGrepArgs(args) {
  const options = {
    ignoreCase: false,
    lineNumbers: false,
    pattern: null,
    files: [],
  };

  for (const arg of args) {
    if (!options.pattern && arg.startsWith("-") && arg.length > 1) {
      if (arg.includes("i")) options.ignoreCase = true;
      if (arg.includes("n")) options.lineNumbers = true;
      continue;
    }

    if (!options.pattern) {
      options.pattern = arg;
      continue;
    }

    options.files.push(arg);
  }

  return options;
}

function splitTextLines(value) {
  return String(value).split("\n");
}

function collectTextSources(files, state, stdin = [], commandName) {
  if (!files.length) return { ok: true, lines: stdin || [], errors: [] };

  const lines = [];
  const errors = [];

  for (const path of files) {
    const result = readFile(path, state.cwd, state.fileSystem);
    if (!result.ok) {
      errors.push(result.error.replace(/^cat:/, `${commandName}:`));
      continue;
    }
    lines.push(...splitTextLines(result.content));
  }

  return errors.length ? { ok: false, lines, errors } : { ok: true, lines, errors };
}

function parseCountAndFiles(args, defaultCount) {
  const parsed = { count: defaultCount, files: [] };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "-n") {
      parsed.count = Math.max(0, Number(args[index + 1]) || defaultCount);
      index += 1;
      continue;
    }

    if (/^-n\d+$/.test(arg)) {
      parsed.count = Number(arg.slice(2));
      continue;
    }

    parsed.files.push(arg);
  }

  return parsed;
}

function formatDiff(leftPath, leftContent, rightPath, rightContent) {
  const leftLines = splitTextLines(leftContent);
  const rightLines = splitTextLines(rightContent);
  const max = Math.max(leftLines.length, rightLines.length);
  const output = [];

  for (let index = 0; index < max; index += 1) {
    const left = leftLines[index];
    const right = rightLines[index];
    if (left === right) continue;
    if (!output.length) output.push(`--- ${leftPath}`, `+++ ${rightPath}`);
    if (left !== undefined) output.push(`-${index + 1}: ${left}`);
    if (right !== undefined) output.push(`+${index + 1}: ${right}`);
  }

  return output;
}

function checksumText(content) {
  let hash = 0x811c9dc5;
  for (const char of String(content)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function unlockedArchiveFiles() {
  return {
    "/archive/manuals/advanced/automation_watch.txt":
      "ADVANCED AUTOMATION NOTE\n\nA watch routine repeats a Lua script for a bounded number of cycles.\nUse it for conservative polling, not blind repair. Scripts that change power or run repairs should print every action they take.\n",
    "/archive/manuals/advanced/baseline_audit.txt":
      "BASELINE AUDIT PROCEDURE\n\nCompare /ship/systems/<system> against /ship/baselines/<system>.\nStart with config.ini, diagnostics/latest.txt, and table files. Logs are volatile and should not match baselines.\n",
    "/archive/crew/private/command_note.txt":
      "PRIVATE COMMAND NOTE\n\nThe final command index was never empty. It was redacted by a process with maintenance authority.\nEngineering note: the redaction coincided with archive dust-gate alarms.\n",
    "/archive/diagnostics/historical/archive-dust-incident.txt":
      "HISTORICAL DIAGNOSTIC CACHE\n\n2290-11-15: archive dust gate reported closed while particulate rose across the central spine.\nContradiction unresolved. Compare archive config with environmental telemetry before trusting either record.\n",
  };
}

function parseSedArgs(args) {
  const parsed = {
    expression: null,
    files: [],
  };

  for (const arg of args) {
    if (!parsed.expression) {
      parsed.expression = arg;
      continue;
    }

    parsed.files.push(arg);
  }

  return parsed;
}

function parseSedSubstitution(expression) {
  if (!expression.startsWith("s") || expression.length < 4) return null;

  const delimiter = expression[1];
  const parts = [];
  let current = "";
  let escaped = false;

  for (const char of expression.slice(2)) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === delimiter && parts.length < 2) {
      parts.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  parts.push(current);
  if (parts.length !== 3) return null;

  return {
    pattern: parts[0],
    replacement: parts[1],
    global: parts[2].includes("g"),
  };
}

function parseAwkArgs(args) {
  const parsed = {
    separator: /\s+/,
    program: null,
    files: [],
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "-F") {
      parsed.separator = args[index + 1] ? new RegExp(escapeRegExp(args[index + 1])) : parsed.separator;
      index += 1;
      continue;
    }

    if (arg.startsWith("-F") && arg.length > 2) {
      parsed.separator = new RegExp(escapeRegExp(arg.slice(2)));
      continue;
    }

    if (!parsed.program) {
      parsed.program = arg;
      continue;
    }

    parsed.files.push(arg);
  }

  return parsed;
}

function parseAwkProgram(program) {
  const trimmed = program.trim();
  const match = trimmed.match(/^(?:\/(.+)\/\s*)?\{\s*print\s+(.+?)\s*\}$/);
  if (!match) return null;

  return {
    pattern: match[1] || null,
    printItems: match[2].split(",").map((item) => item.trim()),
  };
}

function formatAwkPrint(items, line, separator) {
  const fields = line.trim() ? line.trim().split(separator) : [];

  return items
    .map((item) => {
      if (item === "$0") return line;
      if (/^\$\d+$/.test(item)) return fields[Number(item.slice(1)) - 1] || "";
      return item.replace(/^["']|["']$/g, "");
    })
    .join(" ");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

import { getParentDirectory, listDirectory, readFile, resolveNode } from "./filesystem.js";
import { runLuaScript } from "./luaRuntime.js";
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
    status: gameCommand("show ship status"),
    scan: gameCommand("scan the current sector"),
    logs: gameCommand("show recent ship events"),
    map: gameCommand("show known sectors"),
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
      const result = executeGameCommand(parsed.command, args, state.game);
      return {
        type: "state",
        patch: { game: result.game },
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
    return {
      type: "state",
      patch: {
        fileSystem: result.fileSystem,
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

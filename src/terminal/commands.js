import { listDirectory, readFile, resolveNode } from "./filesystem.js";
import { normalizePath } from "./path.js";

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
      run: ({ args, state }) => {
        if (!args.length) return text("cat: missing file operand");

        const outputs = args.map((path) => {
          const result = readFile(path, state.cwd, state.fileSystem);
          return result.ok ? result.content : result.error;
        });

        return text(outputs.join("\n"));
      },
    },
  };

  return registry;
}

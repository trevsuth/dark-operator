import { fileSystem } from "./filesystem.js";
import { parseCommand } from "./parser.js";

export const initialShellState = {
  user: "player",
  host: "console-clone",
  cwd: "/home/player",
  fileSystem,
  environment: {
    SHELL: "/bin/bash",
    TERM: "xterm-256color",
  },
};

export function formatPrompt(state) {
  const home = `/home/${state.user}`;
  const visiblePath = state.cwd === home ? "~" : state.cwd.startsWith(`${home}/`) ? `~${state.cwd.slice(home.length)}` : state.cwd;
  return `${state.user}@${state.host}:${visiblePath}$`;
}

export function executeInput(input, state, registry) {
  const trimmed = input.trim();
  if (!trimmed) return { nextState: state, entries: [] };

  const parsed = parseCommand(trimmed);
  const command = registry[parsed.command];
  const prompt = formatPrompt(state);
  const inputEntry = { kind: "input", prompt, command: input };

  if (!command) {
    return {
      nextState: state,
      entries: [inputEntry, { kind: "output", lines: [`${parsed.command}: command not found`] }],
    };
  }

  const result = command.run({ input: trimmed, args: parsed.args, parsed, state, registry });

  if (result.type === "clear") {
    return { nextState: state, entries: [], clear: true };
  }

  if (result.type === "state") {
    return { nextState: { ...state, ...result.patch }, entries: [inputEntry] };
  }

  return {
    nextState: state,
    entries: [inputEntry, { kind: "output", lines: result.lines }],
  };
}

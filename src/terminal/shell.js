import { fileSystem } from "./filesystem.js";
import { parseCommand, splitPipeline } from "./parser.js";

export const initialShellState = {
  user: "player",
  host: "console-clone",
  cwd: "/home/player",
  fileSystem,
  scriptState: {},
  editor: null,
  tmux: null,
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

  const prompt = formatPrompt(state);
  const inputEntry = { kind: "input", prompt, command: input };
  const pipeline = splitPipeline(trimmed);

  if (pipeline.some((segment) => !segment)) {
    return {
      nextState: state,
      entries: [inputEntry, { kind: "output", lines: ["bash: syntax error near unexpected token `|'"] }],
    };
  }

  let nextState = state;
  let stdin = [];
  let lastResult = null;

  for (const segment of pipeline) {
    const parsed = parseCommand(segment);
    const command = registry[parsed.command];

    if (!command) {
      return {
        nextState,
        entries: [inputEntry, { kind: "output", lines: [`${parsed.command}: command not found`] }],
      };
    }

    const result = command.run({
      input: segment,
      args: parsed.args,
      parsed,
      state: nextState,
      registry,
      stdin,
    });

    if (result.type === "clear") {
      if (pipeline.length === 1) return { nextState, entries: [], clear: true };
      stdin = [];
      lastResult = { type: "output", lines: [] };
      continue;
    }

    if (result.type === "state") {
      nextState = { ...nextState, ...result.patch };
      stdin = resultToLines(result);
      lastResult = result;
      continue;
    }

    stdin = resultToLines(result);
    lastResult = result;
  }

  const outputLines = resultToLines(lastResult);
  return {
    nextState,
    entries: outputLines.length ? [inputEntry, { kind: "output", lines: outputLines }] : [inputEntry],
  };
}

function resultToLines(result) {
  if (!result?.lines) return [];

  return result.lines.flatMap((line) => String(line).split("\n"));
}

import { getDirectoryEntries } from "./filesystem.js";

export function completeInput(input, cursor, state, registry) {
  const beforeCursor = input.slice(0, cursor);
  const tokenStart = findTokenStart(beforeCursor);
  const token = beforeCursor.slice(tokenStart);
  const isCommandToken = isCompletingCommand(beforeCursor, tokenStart);
  const candidates = isCommandToken
    ? getCommandCandidates(token, registry)
    : getPathCandidates(token, state);

  if (!candidates.length) return { input, cursor, matches: [] };

  const replacement = getReplacement(token, candidates);
  if (replacement && replacement !== token) {
    const nextInput = `${input.slice(0, tokenStart)}${replacement}${input.slice(cursor)}`;
    return {
      input: nextInput,
      cursor: tokenStart + replacement.length,
      matches: [],
    };
  }

  if (candidates.length === 1) {
    const nextInput = `${input.slice(0, tokenStart)}${candidates[0].value}${input.slice(cursor)}`;
    return {
      input: nextInput,
      cursor: tokenStart + candidates[0].value.length,
      matches: [],
    };
  }

  return {
    input,
    cursor,
    matches: candidates.map((candidate) => candidate.label),
  };
}

function isCompletingCommand(beforeCursor, tokenStart) {
  const beforeToken = beforeCursor.slice(0, tokenStart);
  const pipeIndex = findLastUnquotedPipe(beforeToken);
  const commandPrefix = pipeIndex >= 0 ? beforeToken.slice(pipeIndex + 1) : beforeToken;
  return commandPrefix.trim() === "";
}

function findLastUnquotedPipe(value) {
  let quote = null;
  let lastPipe = -1;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    const next = value[index + 1];

    if (char === "\\" && next) {
      index += 1;
      continue;
    }

    if ((char === '"' || char === "'") && (!quote || quote === char)) {
      quote = quote ? null : char;
      continue;
    }

    if (!quote && char === "|") lastPipe = index;
  }

  return lastPipe;
}

function findTokenStart(value) {
  const match = value.match(/(^|\s)(\S*)$/);
  if (!match) return value.length;
  return value.length - match[2].length;
}

function getCommandCandidates(token, registry) {
  return Object.keys(registry)
    .filter((name) => name.startsWith(token))
    .sort()
    .map((name) => ({ value: name, label: name }));
}

function getPathCandidates(token, state) {
  const splitIndex = token.lastIndexOf("/");
  const directoryToken = splitIndex >= 0 ? token.slice(0, splitIndex + 1) : "";
  const basenameToken = splitIndex >= 0 ? token.slice(splitIndex + 1) : token;
  const directoryPath = directoryToken || ".";
  const result = getDirectoryEntries(directoryPath, state.cwd, state.fileSystem);

  if (!result.ok) return [];

  return result.entries
    .filter((entry) => entry.name.startsWith(basenameToken))
    .map((entry) => {
      const suffix = entry.type === "directory" ? "/" : "";
      const value = `${directoryToken}${entry.name}${suffix}`;
      return {
        value,
        label: value,
      };
    });
}

function getReplacement(token, candidates) {
  const values = candidates.map((candidate) => candidate.value);
  const common = longestCommonPrefix(values);
  return common.length > token.length ? common : null;
}

function longestCommonPrefix(values) {
  if (!values.length) return "";
  let prefix = values[0];

  for (const value of values.slice(1)) {
    while (!value.startsWith(prefix)) {
      prefix = prefix.slice(0, -1);
      if (!prefix) return "";
    }
  }

  return prefix;
}

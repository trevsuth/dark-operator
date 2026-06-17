import { readFile } from "./filesystem.js";

const ALIAS_NAME = /^[A-Za-z_][A-Za-z0-9_-]*$/;

export function loadBashrcAliases(fileSystem, user = "operator") {
  const result = readFile(`/home/${user}/.bashrc`, "/", fileSystem);
  if (!result.ok) return {};
  return parseAliasDefinitions(result.content);
}

export function parseAliasDefinitions(content) {
  const aliases = {};

  for (const rawLine of String(content).split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const definition = parseAliasLine(line);
    if (definition) aliases[definition.name] = definition.value;
  }

  return aliases;
}

export function parseAliasLine(line) {
  const match = line.match(/^alias\s+([^=\s]+)=(.+)$/);
  if (!match) return null;

  const name = match[1];
  if (!ALIAS_NAME.test(name)) return null;

  return {
    name,
    value: unquoteAliasValue(match[2].trim()),
  };
}

export function formatAlias(name, value) {
  return `alias ${name}='${String(value).replaceAll("'", "'\\''")}'`;
}

function unquoteAliasValue(value) {
  if (value.length >= 2) {
    const quote = value[0];
    if ((quote === "'" || quote === '"') && value.at(-1) === quote) {
      return value.slice(1, -1);
    }
  }

  return value;
}

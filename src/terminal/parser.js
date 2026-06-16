export function parseCommand(input) {
  const tokens = [];
  let token = "";
  let quote = null;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];

    if (char === "\\" && next) {
      token += next;
      index += 1;
      continue;
    }

    if ((char === '"' || char === "'") && (!quote || quote === char)) {
      quote = quote ? null : char;
      continue;
    }

    if (!quote && /\s/.test(char)) {
      if (token) {
        tokens.push(token);
        token = "";
      }
      continue;
    }

    token += char;
  }

  if (token) tokens.push(token);

  return {
    command: tokens[0] || "",
    args: tokens.slice(1),
    tokens,
  };
}

export function splitPipeline(input) {
  const segments = [];
  let segment = "";
  let quote = null;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];

    if (char === "\\" && next) {
      segment += char + next;
      index += 1;
      continue;
    }

    if ((char === '"' || char === "'") && (!quote || quote === char)) {
      quote = quote ? null : char;
      segment += char;
      continue;
    }

    if (!quote && char === "|") {
      segments.push(segment.trim());
      segment = "";
      continue;
    }

    segment += char;
  }

  segments.push(segment.trim());
  return segments;
}

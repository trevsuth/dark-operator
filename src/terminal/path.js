export function normalizePath(inputPath, cwd = "/") {
  const rawPath = inputPath?.startsWith("/") ? inputPath : `${cwd}/${inputPath || ""}`;
  const segments = rawPath.split("/");
  const resolved = [];

  for (const segment of segments) {
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      resolved.pop();
      continue;
    }
    resolved.push(segment);
  }

  return `/${resolved.join("/")}`;
}

export function basename(path) {
  if (path === "/") return "/";
  return path.split("/").filter(Boolean).at(-1);
}

export function dirname(path) {
  if (path === "/") return "/";
  const parts = path.split("/").filter(Boolean);
  parts.pop();
  return parts.length ? `/${parts.join("/")}` : "/";
}

import { basename, dirname, normalizePath } from "./path.js";

export const fileSystem = {
  type: "directory",
  children: {
    home: {
      type: "directory",
      children: {
        player: {
          type: "directory",
          children: {
            "notes.txt": {
              type: "file",
              content:
                "Welcome back.\n\nThe terminal is simulated, but the command model is real enough to build a game on top of it.",
            },
            "todo.txt": {
              type: "file",
              content:
                "- inspect /var/log/system.log\n- find a way into the tmux session\n- keep command output believable",
            },
            "scan.lua": {
              type: "file",
              content:
                "print('running log scan')\n\nlocal log, err = fs.read('/var/log/system.log')\nif not log then\n  print(err)\n  return\nend\n\nif string.find(log, 'tmux') then\n  state.set('found_tmux', true)\n  print('tmux clue found')\nend\n",
            },
            projects: {
              type: "directory",
              children: {
                "readme.md": {
                  type: "file",
                  content: "# Prototype\n\nAdd command handlers in src/terminal/commands.js.",
                },
              },
            },
          },
        },
      },
    },
    var: {
      type: "directory",
      children: {
        log: {
          type: "directory",
          children: {
            "system.log": {
              type: "file",
              content:
                "2026-05-30T09:12:04Z boot: virtual console online\n2026-05-30T09:12:05Z tmux: session detached\n2026-05-30T09:12:08Z auth: player login accepted",
            },
          },
        },
      },
    },
    etc: {
      type: "directory",
      children: {
        hostname: {
          type: "file",
          content: "console-clone",
        },
      },
    },
  },
};

export function getNode(path, root = fileSystem) {
  if (path === "/") return root;
  const parts = path.split("/").filter(Boolean);
  let node = root;

  for (const part of parts) {
    if (node.type !== "directory" || !node.children[part]) return null;
    node = node.children[part];
  }

  return node;
}

export function resolveNode(pathInput, cwd, root = fileSystem) {
  const path = normalizePath(pathInput, cwd);
  return { path, node: getNode(path, root) };
}

export function listDirectory(pathInput, cwd, root = fileSystem) {
  const { path, node } = resolveNode(pathInput || ".", cwd, root);
  if (!node) return { ok: false, error: `ls: cannot access '${pathInput}': No such file or directory` };
  if (node.type === "file") return { ok: true, entries: [basename(path)] };

  return { ok: true, entries: getSortedEntries(node) };
}

export function getDirectoryEntries(pathInput, cwd, root = fileSystem) {
  const { node } = resolveNode(pathInput || ".", cwd, root);
  if (!node || node.type !== "directory") return { ok: false, entries: [] };
  return { ok: true, entries: getSortedEntries(node) };
}

function getSortedEntries(node) {
  const entries = Object.entries(node.children)
    .sort(([aName, aNode], [bName, bNode]) => {
      if (aNode.type !== bNode.type) return aNode.type === "directory" ? -1 : 1;
      return aName.localeCompare(bName);
    })
    .map(([name, child]) => ({ name, type: child.type }));

  return entries;
}

export function readFile(pathInput, cwd, root = fileSystem) {
  const { node } = resolveNode(pathInput, cwd, root);
  if (!node) return { ok: false, error: `cat: ${pathInput}: No such file or directory` };
  if (node.type === "directory") return { ok: false, error: `cat: ${pathInput}: Is a directory` };
  return { ok: true, content: node.content };
}

export function writeFile(pathInput, cwd, content, root = fileSystem) {
  const path = normalizePath(pathInput, cwd);
  if (path === "/") return { ok: false, error: "write: /: Is a directory" };

  const currentNode = getNode(path, root);
  if (currentNode?.type === "directory") {
    return { ok: false, error: `write: ${path}: Is a directory` };
  }

  const parentPath = dirname(path);
  const parent = getNode(parentPath, root);
  if (!parent || parent.type !== "directory") {
    return { ok: false, error: `write: ${path}: No such file or directory` };
  }

  const nextRoot = cloneNode(root);
  const nextParent = getNode(parentPath, nextRoot);
  nextParent.children[basename(path)] = { type: "file", content };

  return {
    ok: true,
    path,
    fileSystem: nextRoot,
    created: !currentNode,
  };
}

export function pathExists(pathInput, cwd, root = fileSystem) {
  return Boolean(resolveNode(pathInput, cwd, root).node);
}

export function getParentDirectory(pathInput, cwd, root = fileSystem) {
  return getNode(dirname(normalizePath(pathInput, cwd)), root);
}

function cloneNode(node) {
  if (node.type === "file") return { ...node };

  return {
    type: "directory",
    children: Object.fromEntries(
      Object.entries(node.children).map(([name, child]) => [name, cloneNode(child)]),
    ),
  };
}

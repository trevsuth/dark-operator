import { basename, dirname, normalizePath } from "./path.js";

export const fileSystem = {
  type: "directory",
  children: {
    home: {
      type: "directory",
      children: {
        operator: {
          type: "directory",
          children: {
            ".bashrc": {
              type: "file",
              content:
                "# CSV Simurgh operator shell aliases\n# Edit this file with vim, then run: source ~/.bashrc\n\nalias st='status'\nalias s='scan'\nalias m='map'\nalias l='logs'\nalias ll='ls'\nalias la='ls /archive'\nalias emergency='run emergency.lua'\n",
            },
            "notes.txt": {
              type: "file",
              content:
                "OPERATOR NOTE\n\nThe emergency console restored with partial command authority.\nStart with status, scan, logs, and map.\nRead /archive/manuals/lua/01_variables.txt before modifying emergency.lua.",
            },
            "emergency.lua": {
              type: "file",
              content:
                "local s = ship.status()\n\nprint('oxygen', s.oxygen)\nprint('power', s.power)\n\nif s.oxygen < 55 then\n  ship.repair('life_support')\nend\n\nif s.power < 35 then\n  ship.power('reactor', 42)\nend\n",
            },
            "survey.lua": {
              type: "file",
              content:
                "local s = ship.status()\nprint('sector', s.location)\nship.scan()\n",
            },
            "readme.txt": {
              type: "file",
              content:
                "CSV SIMURGH EMERGENCY INTERFACE\n\nCore commands:\n  status\n  scan\n  logs\n  map\n  jump sector-02\n  power sensors 25\n  repair life_support\n  lua emergency.lua\n\nThe shell also supports cat, grep, sed, awk, vim, and tmux.",
            },
          },
        },
      },
    },
    archive: {
      type: "directory",
      children: {
        manuals: {
          type: "directory",
          children: {
            lua: {
              type: "directory",
              children: {
                "01_variables.txt": {
                  type: "file",
                  content:
                    "SHIPBOARD AUTOMATION MANUAL\nSECTION 01: VARIABLES\n\nVariables store values for later use.\n\nExample:\n\nlocal oxygen = 75\n\nThis creates a variable named oxygen containing the value 75.\n\nUse now:\n\nlocal s = ship.status()\nprint(s.oxygen)\n",
                },
                "02_conditions.txt": {
                  type: "file",
                  content:
                    "SHIPBOARD AUTOMATION MANUAL\nSECTION 02: CONDITIONS\n\nA condition lets a script react when a system crosses a limit.\n\nExample:\n\nlocal s = ship.status()\nif s.oxygen < 40 then\n  ship.repair('life_support')\nend\n\nThis is useful when pressure drops faster than manual checks can follow.",
                },
                "03_loops.txt": {
                  type: "file",
                  content:
                    "SHIPBOARD AUTOMATION MANUAL\nSECTION 03: LOOPS\n\nLoops repeat work across a list of values.\n\nExample:\n\nlocal systems = {'reactor', 'life_support', 'sensors'}\nfor _, name in ipairs(systems) do\n  print(name)\nend\n\nDo not loop forever. The emergency interpreter will halt scripts that exceed the instruction budget.",
                },
              },
            },
          },
        },
        crew: {
          type: "directory",
          children: {
            "orientation.txt": {
              type: "file",
              content:
                "CREW ORIENTATION EXCERPT\n\nThe Simurgh preserves knowledge by motion. Every archive officer is asked to remember that a map is not a destination, and a record is not a life.",
            },
            "maintenance.txt": {
              type: "file",
              content:
                "MAINTENANCE RECORD 8841\n\nLife support loop B was relabeled twice during the fifth refit. New operators should trust live pressure readings over deck diagrams.",
            },
          },
        },
      },
    },
    ship: {
      type: "directory",
      children: {
        "briefing.txt": {
          type: "file",
          content:
            "CSV SIMURGH\nEmergency authority has been granted to the active console.\nPrimary objective: reach the beacon terminus and recover archive context before the vessel degrades beyond autonomous correction.",
        },
        "systems.txt": {
          type: "file",
          content:
            "Tracked systems: reactor, life_support, sensors, archives, propulsion.\nTracked resources: hull, power, oxygen, fuel, heat, signal.\nUse status for live telemetry.",
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
                "2316-04-19T03:12:04Z boot: emergency console online\n2316-04-19T03:12:05Z archive: index incomplete\n2316-04-19T03:12:08Z auth: operator authority accepted",
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
          content: "csv-simurgh",
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

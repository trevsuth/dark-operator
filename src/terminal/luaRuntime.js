import lua from "fengari/src/lua.js";
import defs from "fengari/src/defs.js";
import lauxlib from "fengari/src/lauxlib.js";
import baseLib from "fengari/src/lbaselib.js";
import coroutineLib from "fengari/src/lcorolib.js";
import mathLib from "fengari/src/lmathlib.js";
import utf8Lib from "fengari/src/lutf8lib.js";
import { getDirectoryEntries, readFile, writeFile } from "./filesystem.js";
import { allocatePower, formatStatus, repairSystem, scanSector } from "../game/engine.js";

const INSTRUCTION_BUDGET = 100000;
const HOOK_INTERVAL = 1000;
const { to_jsstring, to_luastring } = defs;

export function runLuaScript(source, shellState) {
  const output = [];
  let fileSystem = shellState.fileSystem;
  let game = shellState.game;
  let scriptState = { ...shellState.scriptState };
  let instructionsLeft = INSTRUCTION_BUDGET;

  const L = lauxlib.luaL_newstate();
  if (!L) {
    return {
      ok: false,
      lines: ["lua: failed to create Lua state"],
      fileSystem,
      game,
      scriptState,
    };
  }

  openSafeLibraries(L);
  removeUnsafeGlobals(L);

  lua.lua_sethook(
    L,
    () => {
      instructionsLeft -= HOOK_INTERVAL;
      if (instructionsLeft <= 0) {
        lauxlib.luaL_error(L, to_luastring("script exceeded instruction budget", true));
      }
    },
    lua.LUA_MASKCOUNT,
    HOOK_INTERVAL,
  );

  installPrint(L, output);
  installShellApi(L, output);
  installStateApi(L, {
    get: (key) => scriptState[key],
    set: (key, value) => {
      scriptState = { ...scriptState, [key]: value };
    },
  });
  installFsApi(L, {
    read: (path) => readFile(path, shellState.cwd, fileSystem),
    write: (path, content) => {
      const result = writeFile(path, shellState.cwd, content, fileSystem);
      if (result.ok) fileSystem = result.fileSystem;
      return result;
    },
    list: (path) => getDirectoryEntries(path || ".", shellState.cwd, fileSystem),
  });
  installShipApi(L, output, {
    status: () => ({ ...game.ship, environment: game.environment }),
    logs: () => game.logs.slice(-16),
    repair: (system) => {
      const result = repairSystem(game, system, { fileSystem });
      game = result.game;
      output.push(...result.lines);
      return result.game.status === "active";
    },
    power: (system, amount) => {
      const result = allocatePower(game, system, amount);
      game = result.game;
      output.push(...result.lines);
      return !result.lines.some((line) => line.startsWith("[WARN]") || line.startsWith("power:"));
    },
    scan: () => {
      const result = scanSector(game);
      game = result.game;
      output.push(...result.lines);
      return true;
    },
    statusLines: () => formatStatus(game),
  });

  const status = lauxlib.luaL_dostring(L, to_luastring(source));
  if (status !== lua.LUA_OK) {
    const error = lua.lua_tojsstring(L, -1) || "unknown Lua error";
    lua.lua_pop(L, 1);
    return {
      ok: false,
      lines: [...output, `lua: ${error}`],
      fileSystem,
      game,
      scriptState,
    };
  }

  return {
    ok: true,
    lines: output,
    fileSystem,
    game,
    scriptState,
  };
}

function openSafeLibraries(L) {
  const libraries = [
    ["_G", baseLib.luaopen_base],
    ["coroutine", coroutineLib.luaopen_coroutine],
    ["math", mathLib.luaopen_math],
    ["utf8", utf8Lib.luaopen_utf8],
  ];

  for (const [name, open] of libraries) {
    lauxlib.luaL_requiref(L, to_luastring(name, true), open, 1);
    lua.lua_pop(L, 1);
  }
}

function removeUnsafeGlobals(L) {
  for (const name of ["debug", "dofile", "io", "loadfile", "os", "package", "require"]) {
    lua.lua_pushnil(L);
    lua.lua_setglobal(L, to_luastring(name, true));
  }
}

function installPrint(L, output) {
  lua.lua_pushjsfunction(L, (state) => {
    output.push(readLuaArgs(state).join("\t"));
    return 0;
  });
  lua.lua_setglobal(L, to_luastring("print", true));
}

function installShellApi(L, output) {
  lua.lua_createtable(L, 0, 1);

  setFunction(L, "print", (state) => {
    output.push(readLuaArgs(state).join("\t"));
    return 0;
  });

  lua.lua_setglobal(L, to_luastring("shell", true));
}

function installStateApi(L, stateApi) {
  lua.lua_createtable(L, 0, 2);

  setFunction(L, "get", (state) => {
    const key = lauxlib.luaL_checkstring(state, 1);
    pushJsValue(state, stateApi.get(to_jsstring(key)));
    return 1;
  });

  setFunction(L, "set", (state) => {
    const key = lauxlib.luaL_checkstring(state, 1);
    stateApi.set(to_jsstring(key), luaToJsValue(state, 2));
    lua.lua_pushboolean(state, 1);
    return 1;
  });

  lua.lua_setglobal(L, to_luastring("state", true));
}

function installFsApi(L, fsApi) {
  lua.lua_createtable(L, 0, 3);

  setFunction(L, "read", (state) => {
    const path = lauxlib.luaL_checkstring(state, 1);
    const result = fsApi.read(to_jsstring(path));

    if (!result.ok) return pushNilError(state, result.error);

    lua.lua_pushliteral(state, result.content);
    return 1;
  });

  setFunction(L, "write", (state) => {
    const path = lauxlib.luaL_checkstring(state, 1);
    const content = lauxlib.luaL_checkstring(state, 2);
    const result = fsApi.write(to_jsstring(path), to_jsstring(content));

    if (!result.ok) return pushNilError(state, result.error);

    lua.lua_pushboolean(state, 1);
    return 1;
  });

  setFunction(L, "list", (state) => {
    const path = lua.lua_gettop(state) >= 1 ? to_jsstring(lauxlib.luaL_checkstring(state, 1)) : ".";
    const result = fsApi.list(path);

    if (!result.ok) return pushNilError(state, `fs.list: ${path}: Not a directory`);

    lua.lua_createtable(state, result.entries.length, 0);
    result.entries.forEach((entry, index) => {
      lua.lua_pushliteral(state, entry.type === "directory" ? `${entry.name}/` : entry.name);
      lua.lua_rawseti(state, -2, index + 1);
    });
    return 1;
  });

  lua.lua_setglobal(L, to_luastring("fs", true));
}

function installShipApi(L, output, shipApi) {
  lua.lua_createtable(L, 0, 6);

  setFunction(L, "status", (state) => {
    pushJsValue(state, shipApi.status());
    return 1;
  });

  setFunction(L, "logs", (state) => {
    pushJsValue(state, shipApi.logs());
    return 1;
  });

  setFunction(L, "repair", (state) => {
    const system = to_jsstring(lauxlib.luaL_checkstring(state, 1));
    lua.lua_pushboolean(state, shipApi.repair(system) ? 1 : 0);
    return 1;
  });

  setFunction(L, "power", (state) => {
    const system = to_jsstring(lauxlib.luaL_checkstring(state, 1));
    const amount = lauxlib.luaL_checknumber(state, 2);
    lua.lua_pushboolean(state, shipApi.power(system, amount) ? 1 : 0);
    return 1;
  });

  setFunction(L, "scan", (state) => {
    lua.lua_pushboolean(state, shipApi.scan() ? 1 : 0);
    return 1;
  });

  setFunction(L, "print_status", () => {
    output.push(...shipApi.statusLines());
    return 0;
  });

  lua.lua_setglobal(L, to_luastring("ship", true));
}

function setFunction(L, name, fn) {
  lua.lua_pushjsfunction(L, fn);
  lua.lua_setfield(L, -2, to_luastring(name, true));
}

function readLuaArgs(L) {
  const count = lua.lua_gettop(L);
  const values = [];

  for (let index = 1; index <= count; index += 1) {
    lauxlib.luaL_tolstring(L, index);
    values.push(lua.lua_tojsstring(L, -1) ?? "");
    lua.lua_pop(L, 1);
  }

  return values;
}

function pushNilError(L, message) {
  lua.lua_pushnil(L);
  lua.lua_pushliteral(L, message);
  return 2;
}

function pushJsValue(L, value) {
  if (value === undefined || value === null) {
    lua.lua_pushnil(L);
    return;
  }

  if (Array.isArray(value)) {
    lua.lua_createtable(L, value.length, 0);
    value.forEach((item, index) => {
      pushJsValue(L, item);
      lua.lua_rawseti(L, -2, index + 1);
    });
    return;
  }

  if (typeof value === "object") {
    lua.lua_createtable(L, 0, Object.keys(value).length);
    for (const [key, item] of Object.entries(value)) {
      pushJsValue(L, item);
      lua.lua_setfield(L, -2, to_luastring(key, true));
    }
    return;
  }

  if (typeof value === "boolean") {
    lua.lua_pushboolean(L, value ? 1 : 0);
    return;
  }

  if (typeof value === "number") {
    lua.lua_pushnumber(L, value);
    return;
  }

  lua.lua_pushliteral(L, String(value));
}

function luaToJsValue(L, index) {
  const type = lua.lua_type(L, index);

  if (type === lua.LUA_TNIL || type === lua.LUA_TNONE) return null;
  if (type === lua.LUA_TBOOLEAN) return Boolean(lua.lua_toboolean(L, index));
  if (type === lua.LUA_TNUMBER) return lua.lua_tonumber(L, index);
  if (type === lua.LUA_TSTRING) return lua.lua_tojsstring(L, index);

  return lua.lua_typename(L, type);
}

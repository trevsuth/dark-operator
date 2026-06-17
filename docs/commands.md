# Available Commands

Commands are registered in `src/terminal/commands.js` through `createCommandRegistry()`.

Each command handler receives:

```js
{ input, args, parsed, state, registry }
```

Handlers currently return one of:

```js
{ type: "output", lines: [...] }
{ type: "state", patch: { ... } }
{ type: "clear" }
```

## Command List

| Command | Summary | Current behavior |
| --- | --- | --- |
| `help` | Show available commands | Prints command names and summaries from the registry. |
| `clear` | Clear terminal history | Clears visible terminal output. |
| `pwd` | Print working directory | Prints `state.cwd`. |
| `whoami` | Print current user | Prints `state.user`. |
| `echo` | Print arguments | Prints all arguments joined by spaces. |
| `ls` | List directory contents | Lists files and directories for the provided path, or the current directory. Directories render with a trailing `/`. |
| `cd` | Change working directory | Updates `state.cwd` when the target exists and is a directory. Defaults to `/home/player`. |
| `cat` | Print file contents | Prints one or more fake filesystem file contents. Reports missing files and directories. |
| `grep` | Search text | Searches stdin or files with a JavaScript regular expression. Supports `-i` and `-n`. |
| `sed` | Transform text | Supports basic substitution expressions against stdin or files. |
| `awk` | Process columns | Supports basic `print` programs against stdin or files. |
| `vim` | Edit a file | Opens a simplified Vim-style editor for an existing file or a new file in an existing directory. |
| `lua` | Run a Lua script | Executes a Lua script file from the fake filesystem with sandboxed game APIs. |
| `map` | Show known sectors | Prints the known sector graph. `map -v` renders the explored graph as an ASCII diagram. |
| `tmux` | Start terminal multiplexer | Enters a tmux-style pane interface for multiple terminal contexts. |

## Tmux

Start the multiplexer:

```bash
tmux
```

Once attached, use `Ctrl-b` as the prefix key:

| Key | Behavior |
| --- | --- |
| `Ctrl-b c` | Create a new pane. |
| `Ctrl-b n` | Move to the next pane. |
| `Ctrl-b p` | Move to the previous pane. |
| `Ctrl-b x` | Close the active pane. |
| `Ctrl-b 0-9` | Select a pane by id. |
| `Ctrl-b ArrowRight` | Move to the next pane. |
| `Ctrl-b ArrowLeft` | Move to the previous pane. |

Each pane keeps its own prompt, working directory, command history, and scrollback. The fake filesystem and Lua/game state are shared across panes.

## Pipes

Commands can be connected with `|`. The output from the command on the left becomes stdin for the command on the right.

Examples:

```bash
cat notes.txt | grep terminal
cat /var/log/system.log | grep -n tmux
lua scan.lua | grep clue
cat notes.txt | sed 's/terminal/console/g'
cat /var/log/system.log | awk '{ print $1 }'
```

Pipes split only on unquoted `|` characters.

## Grep

Search stdin:

```bash
cat todo.txt | grep tmux
```

Search files directly:

```bash
grep -n tmux /var/log/system.log
grep -i console notes.txt
```

Supported options:

| Option | Behavior |
| --- | --- |
| `-i` | Case-insensitive search. |
| `-n` | Prefix matches with line numbers. |

## Sed

Supported subset:

```bash
sed 's/pattern/replacement/'
sed 's/pattern/replacement/g'
```

Examples:

```bash
cat notes.txt | sed 's/terminal/console/g'
sed 's/tmux/session/g' /var/log/system.log
```

The pattern is treated as a JavaScript regular expression. Only substitution expressions are supported.

## Awk

Supported subset:

```bash
awk '{ print $1 }'
awk '{ print $1, $2 }'
awk '/pattern/ { print $0 }'
awk -F: '{ print $2 }'
```

Examples:

```bash
cat /var/log/system.log | awk '{ print $1 }'
awk '/tmux/ { print $2, $3 }' /var/log/system.log
echo 'user:player' | awk -F: '{ print $2 }'
```

Fields are split on whitespace by default. `-F` accepts a literal separator string.

## Vim Editor

Open a file:

```bash
vim notes.txt
vim projects/readme.md
vim new-file.txt
```

Supported editor controls:

| Input | Behavior |
| --- | --- |
| `i` | Enter insert mode. |
| `Esc` | Return to normal mode. |
| `:w` | Save the current buffer to the fake filesystem. |
| `:q` | Quit when there are no unsaved changes. |
| `:q!` | Quit and discard unsaved changes. |
| `:wq` | Save and quit. |
| `:x` | Save and quit. |

## Tab Completion

The shell prompt supports `Tab` completion for:

- Command names when completing the first token.
- Fake filesystem paths when completing command arguments.

Examples:

```bash
ca<Tab>          # completes cat
cat no<Tab>     # completes notes.txt
cd pro<Tab>     # completes projects/
cat /var/l<Tab> # completes /var/log/
```

When multiple candidates match and there is no longer shared prefix, the terminal prints the available matches.

## Lua Scripting

Run a script:

```bash
lua scan.lua
```

Create or edit scripts with `vim`:

```bash
vim hello.lua
lua hello.lua
```

Available Lua globals:

| API | Behavior |
| --- | --- |
| `print(...)` | Prints to the terminal output. |
| `shell.print(...)` | Same as `print(...)`. |
| `fs.read(path)` | Returns file contents, or `nil, error`. |
| `fs.write(path, content)` | Writes to the fake filesystem and returns `true`, or `nil, error`. |
| `fs.list(path)` | Returns an array-style table of file/directory names. Directories include a trailing `/`. |
| `state.get(key)` | Reads a persisted script/game state value. |
| `state.set(key, value)` | Persists a string, number, boolean, or nil-like value into script/game state. |

Example:

```lua
print("running log scan")

local log, err = fs.read("/var/log/system.log")
if not log then
  print(err)
  return
end

if string.find(log, "tmux") then
  state.set("found_tmux", true)
  print("tmux clue found")
end
```

The runtime removes direct access to `debug`, `dofile`, `io`, `loadfile`, `os`, `package`, and `require`. Scripts run against the fake app filesystem, not the host machine.

## Notes For Adding Commands

Add a new key to the registry:

```js
example: {
  summary: "describe the command",
  run: ({ args, state }) => {
    return { type: "output", lines: [`args: ${args.join(", ")}`] };
  },
}
```

Use `{ type: "state", patch }` when a command should update shell/game state. Use the fake filesystem helpers in `src/terminal/filesystem.js` when command behavior depends on files or directories.

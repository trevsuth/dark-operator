# Simulated File System

This documents the fake filesystem defined in `src/terminal/filesystem.js`.

```txt
/
├── etc/
│   └── hostname
├── home/
│   └── player/
│       ├── notes.txt
│       ├── projects/
│       │   └── readme.md
│       ├── scan.lua
│       └── todo.txt
└── var/
    └── log/
        └── system.log
```

## Directories

| Path | Notes |
| --- | --- |
| `/` | Root of the simulated filesystem. |
| `/etc` | Configuration-like files. |
| `/home` | User home directory parent. |
| `/home/player` | Default starting directory for the shell. |
| `/home/player/projects` | Example project directory. |
| `/var` | Runtime/system-like data. |
| `/var/log` | Log files. |

## Files

| Path | Contents summary |
| --- | --- |
| `/etc/hostname` | Hostname: `console-clone`. |
| `/home/player/notes.txt` | Welcome text and a note that the terminal is simulated. |
| `/home/player/scan.lua` | Example Lua script that scans `/var/log/system.log` and sets `found_tmux`. |
| `/home/player/todo.txt` | Starter objectives around checking logs and a tmux session. |
| `/home/player/projects/readme.md` | Prototype note pointing to `src/terminal/commands.js`. |
| `/var/log/system.log` | Boot, tmux, and auth log entries. |

## Current Starting State

| Field | Value |
| --- | --- |
| User | `player` |
| Host | `console-clone` |
| Working directory | `/home/player` |

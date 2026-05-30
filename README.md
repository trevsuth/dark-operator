# Console Clone

A locally hostable React/Vite application that simulates a bash-like terminal with a fake filesystem and a data-driven command registry.

## Run Locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Extension Points

- Add commands in `src/terminal/commands.js`.
- Add files and directories in `src/terminal/filesystem.js`.
- Adjust prompt and shell state in `src/terminal/shell.js`.
- Change the visual theme through CSS custom properties in `src/styles.css`.

Command handlers receive `{ input, args, parsed, state, registry }` and return one of:

- `{ type: "output", lines: [...] }`
- `{ type: "state", patch: { ... } }`
- `{ type: "clear" }`

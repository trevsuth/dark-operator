import { useEffect, useMemo, useRef, useState } from "react";
import { completeInput } from "./completion.js";
import { createCommandRegistry } from "./commands.js";
import { writeFile } from "./filesystem.js";
import { executeInput, formatPrompt, initialShellState } from "./shell.js";

const welcomeLines = [
  "CSV Simurgh emergency console",
  "Type 'status', 'scan', 'map', or 'help'.",
];

function createPane(id, shellState = initialShellState) {
  return {
    id,
    title: `${id}:bash`,
    shellState,
    entries: [{ kind: "output", lines: welcomeLines }],
    input: "",
    history: [],
    historyIndex: null,
  };
}

export function Terminal() {
  const registry = useMemo(() => createCommandRegistry(), []);
  const [panes, setPanes] = useState(() => [createPane(0)]);
  const [activePaneId, setActivePaneId] = useState(0);
  const [tmuxPrefix, setTmuxPrefix] = useState(false);
  const inputRef = useRef(null);
  const editorRef = useRef(null);
  const nextPaneIdRef = useRef(1);
  const activePane = panes.find((pane) => pane.id === activePaneId) || panes[0];
  const editor = activePane.shellState.editor;
  const isEditorOpen = Boolean(editor);
  const isTmux = panes.length > 1 || activePane.shellState.tmux?.active;

  useEffect(() => {
    if (isEditorOpen) {
      editorRef.current?.focus();
      return;
    }

    inputRef.current?.focus();
  }, [activePaneId, isEditorOpen]);

  function updatePane(paneId, updater) {
    setPanes((current) =>
      current.map((pane) => (pane.id === paneId ? { ...pane, ...updater(pane) } : pane)),
    );
  }

  function updateActivePane(updater) {
    updatePane(activePaneId, updater);
  }

  function updateActiveShellState(updater) {
    updateActivePane((pane) => ({
      shellState: typeof updater === "function" ? updater(pane.shellState) : updater,
    }));
  }

  function submitCommand(event) {
    event.preventDefault();
    const commandText = activePane.input;
    const result = executeInput(commandText, activePane.shellState, registry);

    const globalFileSystemChanged = result.nextState.fileSystem !== activePane.shellState.fileSystem;
    const globalScriptStateChanged = result.nextState.scriptState !== activePane.shellState.scriptState;
    const globalGameChanged = result.nextState.game !== activePane.shellState.game;
    const globalAliasesChanged = result.nextState.aliases !== activePane.shellState.aliases;

    setPanes((current) =>
      current.map((pane) => {
        const shellState = pane.id === activePaneId ? result.nextState : pane.shellState;
        const syncedShellState = {
          ...shellState,
          fileSystem: globalFileSystemChanged ? result.nextState.fileSystem : shellState.fileSystem,
          scriptState: globalScriptStateChanged ? result.nextState.scriptState : shellState.scriptState,
          game: globalGameChanged ? result.nextState.game : shellState.game,
          aliases: globalAliasesChanged ? result.nextState.aliases : shellState.aliases,
        };

        if (pane.id !== activePaneId) return { ...pane, shellState: syncedShellState };

        return {
          ...pane,
          shellState: syncedShellState,
          entries: result.clear ? [] : [...pane.entries, ...result.entries],
          input: "",
          history: commandText.trim() ? [...pane.history, commandText] : pane.history,
          historyIndex: null,
        };
      }),
    );
  }

  function handleKeyDown(event) {
    if (isTmux && handleTmuxKeyDown(event)) return;

    if (event.key === "Tab") {
      event.preventDefault();
      const cursor = event.currentTarget.selectionStart ?? activePane.input.length;
      const completion = completeInput(activePane.input, cursor, activePane.shellState, registry);

      updateActivePane((pane) => ({
        input: completion.input,
        entries: completion.matches.length
          ? [...pane.entries, { kind: "output", lines: [formatCompletionMatches(completion.matches)] }]
          : pane.entries,
      }));

      requestAnimationFrame(() => {
        inputRef.current?.setSelectionRange(completion.cursor, completion.cursor);
      });
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!activePane.history.length) return;
      const nextIndex =
        activePane.historyIndex === null ? activePane.history.length - 1 : Math.max(0, activePane.historyIndex - 1);
      updateActivePane(() => ({
        historyIndex: nextIndex,
        input: activePane.history[nextIndex],
      }));
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (activePane.historyIndex === null) return;
      const nextIndex = activePane.historyIndex + 1;
      if (nextIndex >= activePane.history.length) {
        updateActivePane(() => ({ historyIndex: null, input: "" }));
        return;
      }
      updateActivePane(() => ({
        historyIndex: nextIndex,
        input: activePane.history[nextIndex],
      }));
    }
  }

  function handleTmuxKeyDown(event) {
    if (event.ctrlKey && event.key.toLowerCase() === "b") {
      event.preventDefault();
      setTmuxPrefix(true);
      return true;
    }

    if (!tmuxPrefix) return false;

    event.preventDefault();
    setTmuxPrefix(false);

    if (event.key === "c") {
      createTmuxPane();
      return true;
    }

    if (event.key === "n" || event.key === "ArrowRight") {
      selectRelativePane(1);
      return true;
    }

    if (event.key === "p" || event.key === "ArrowLeft") {
      selectRelativePane(-1);
      return true;
    }

    if (event.key === "x") {
      closeActivePane();
      return true;
    }

    if (/^\d$/.test(event.key)) {
      const paneId = Number(event.key);
      if (panes.some((pane) => pane.id === paneId)) setActivePaneId(paneId);
      return true;
    }

    if (event.key === "Escape") return true;

    return true;
  }

  function createTmuxPane() {
    const id = nextPaneIdRef.current;
    nextPaneIdRef.current += 1;
    const nextPane = createPane(id, {
      ...activePane.shellState,
      editor: null,
      tmux: { active: true, status: "attached" },
    });

    setPanes((current) => [...current, nextPane]);
    setActivePaneId(id);
  }

  function selectRelativePane(delta) {
    const activeIndex = panes.findIndex((pane) => pane.id === activePaneId);
    const nextIndex = (activeIndex + delta + panes.length) % panes.length;
    setActivePaneId(panes[nextIndex].id);
  }

  function closeActivePane() {
    if (panes.length === 1) {
      updateActiveShellState((current) => ({ ...current, tmux: null }));
      return;
    }

    const activeIndex = panes.findIndex((pane) => pane.id === activePaneId);
    const nextPanes = panes.filter((pane) => pane.id !== activePaneId);
    const nextActive = nextPanes[Math.min(activeIndex, nextPanes.length - 1)];
    setPanes(nextPanes);
    setActivePaneId(nextActive.id);
  }

  function updateInput(value) {
    updateActivePane(() => ({ input: value }));
  }

  function updateEditor(patch) {
    updateActiveShellState((current) => ({
      ...current,
      editor: {
        ...current.editor,
        ...patch,
      },
    }));
  }

  function addEditorOutput(lines) {
    updateActivePane((pane) => ({
      entries: [...pane.entries, { kind: "output", lines: Array.isArray(lines) ? lines : [lines] }],
    }));
  }

  function closeEditor(lines) {
    updateActiveShellState((current) => ({ ...current, editor: null }));
    if (lines) addEditorOutput(lines);
  }

  function saveEditor({ closeAfterSave = false } = {}) {
    const result = writeFile(editor.path, "/", editor.content, activePane.shellState.fileSystem);
    if (!result.ok) {
      updateEditor({ mode: "normal", command: "", status: result.error });
      return;
    }

    const status = `"${result.path}" ${result.created ? "[New] " : ""}${editor.content.length}L written`;
    setPanes((current) =>
      current.map((pane) => {
        const shellState = {
          ...pane.shellState,
          fileSystem: result.fileSystem,
        };

        if (pane.id !== activePaneId) return { ...pane, shellState };

        return {
          ...pane,
          shellState: {
            ...shellState,
            editor: closeAfterSave
              ? null
              : {
                  ...pane.shellState.editor,
                  dirty: false,
                  command: "",
                  mode: "normal",
                  status,
                },
          },
        };
      }),
    );

    if (closeAfterSave) addEditorOutput(status);
  }

  function executeEditorCommand(command) {
    if (command === "w") {
      saveEditor();
      return;
    }

    if (command === "q") {
      if (editor.dirty) {
        updateEditor({ mode: "normal", command: "", status: "No write since last change (:q! to quit)" });
        return;
      }
      closeEditor(`"${editor.path}" closed`);
      return;
    }

    if (command === "q!") {
      closeEditor(`"${editor.path}" abandoned`);
      return;
    }

    if (command === "wq" || command === "x") {
      saveEditor({ closeAfterSave: true });
      return;
    }

    updateEditor({ mode: "normal", command: "", status: `Not an editor command: ${command}` });
  }

  function handleEditorKeyDown(event) {
    if (!editor) return;

    if (isTmux && editor.mode !== "insert" && handleTmuxKeyDown(event)) return;

    if (editor.mode === "insert") {
      if (event.key === "Escape") {
        event.preventDefault();
        updateEditor({ mode: "normal", status: "" });
      }
      return;
    }

    event.preventDefault();

    if (editor.mode === "command") {
      if (event.key === "Escape") {
        updateEditor({ mode: "normal", command: "", status: "" });
        return;
      }

      if (event.key === "Enter") {
        executeEditorCommand(editor.command.slice(1).trim());
        return;
      }

      if (event.key === "Backspace") {
        updateEditor({ command: editor.command.length > 1 ? editor.command.slice(0, -1) : ":" });
        return;
      }

      if (event.key.length === 1) {
        updateEditor({ command: `${editor.command}${event.key}` });
      }
      return;
    }

    if (event.key === "i") {
      updateEditor({ mode: "insert", status: "-- INSERT --" });
      return;
    }

    if (event.key === ":") {
      updateEditor({ mode: "command", command: ":", status: "" });
      return;
    }

    if (event.key === "Escape") {
      updateEditor({ command: "", status: "" });
    }
  }

  return (
    <section
      className={`terminal-frame ${isTmux ? "tmux-active" : ""}`}
      onClick={() => (editor ? editorRef.current?.focus() : inputRef.current?.focus())}
    >
      <header className="terminal-titlebar">
        <div className="window-controls" aria-hidden="true">
          <span className="control control-close" />
          <span className="control control-minimize" />
          <span className="control control-maximize" />
        </div>
        <div className="terminal-title">
          {editor ? `vim - ${editor.name}` : isTmux ? `tmux - pane ${activePane.id}` : `bash - ${activePane.shellState.host}`}
        </div>
      </header>

      <div className="tmux-layout" style={{ "--pane-count": panes.length }}>
        {panes.map((pane) => (
          <TerminalPane
            key={pane.id}
            pane={pane}
            active={pane.id === activePaneId}
            inputRef={pane.id === activePaneId ? inputRef : null}
            editorRef={pane.id === activePaneId ? editorRef : null}
            onSubmit={submitCommand}
            onInput={updateInput}
            onKeyDown={handleKeyDown}
            onEditorChange={(content) => updateEditor({ content, dirty: true, status: "-- INSERT --" })}
            onEditorKeyDown={handleEditorKeyDown}
          />
        ))}
      </div>

      {isTmux ? (
        <div className="tmux-statusline">
          <span>{tmuxPrefix ? "PREFIX" : "tmux"}</span>
          <span>{panes.map((pane) => `[${pane.id}${pane.id === activePaneId ? "*" : ""}]`).join(" ")}</span>
          <span>Ctrl-b c new | n/p switch | x close | 0-9 select</span>
        </div>
      ) : null}
    </section>
  );
}

function TerminalPane({
  pane,
  active,
  inputRef,
  editorRef,
  onSubmit,
  onInput,
  onKeyDown,
  onEditorChange,
  onEditorKeyDown,
}) {
  const scrollRef = useRef(null);
  const editor = pane.shellState.editor;

  useEffect(() => {
    if (editor) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [editor, pane.entries]);

  return (
    <div className={`terminal-pane ${active ? "active" : ""}`}>
      <div className="terminal-screen" ref={scrollRef} role="log" aria-live={active ? "polite" : "off"}>
        {editor ? (
          <VimEditor
            editor={editor}
            editorRef={active ? editorRef : null}
            onChange={onEditorChange}
            onKeyDown={onEditorKeyDown}
          />
        ) : (
          <>
            {pane.entries.map((entry, index) =>
              entry.kind === "input" ? (
                <div className="terminal-line input-line" key={`${entry.kind}-${index}`}>
                  <span className="prompt">{entry.prompt}</span>
                  <span className="command-text">{entry.command}</span>
                </div>
              ) : (
                <OutputBlock entry={entry} key={`${entry.kind}-${index}`} />
              ),
            )}

            {active ? (
              <form className="terminal-line active-line" onSubmit={onSubmit}>
                <label className="prompt" htmlFor="terminal-input">
                  {formatPrompt(pane.shellState)}
                </label>
                <input
                  id="terminal-input"
                  ref={inputRef}
                  value={pane.input}
                  onChange={(event) => onInput(event.target.value)}
                  onKeyDown={onKeyDown}
                  autoCapitalize="off"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck="false"
                />
              </form>
            ) : null}
          </>
        )}
      </div>
      <div className="pane-label">{pane.title}</div>
    </div>
  );
}

function OutputBlock({ entry }) {
  return (
    <div className="output-block">
      {entry.lines.flatMap((line, lineIndex) =>
        String(line)
          .split("\n")
          .map((splitLine, splitIndex) => (
            <div className="terminal-line output-line" key={`${lineIndex}-${splitIndex}`}>
              {splitLine || "\u00a0"}
            </div>
          )),
      )}
    </div>
  );
}

function formatCompletionMatches(matches) {
  return matches.join("  ");
}

function VimEditor({ editor, editorRef, onChange, onKeyDown }) {
  const lines = editor.content.split("\n").length;
  const modeLabel = editor.mode === "insert" ? "INSERT" : editor.mode === "command" ? "COMMAND" : "NORMAL";

  return (
    <div className="vim-editor">
      <textarea
        ref={editorRef}
        className="vim-buffer"
        value={editor.content}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        readOnly={editor.mode !== "insert"}
        spellCheck="false"
        aria-label={`Editing ${editor.path}`}
      />
      <div className="vim-statusline">
        <span>{editor.command || editor.status || `"${editor.path}"`}</span>
        <span>
          {modeLabel} {editor.dirty ? "[+]" : ""} {lines}L
        </span>
      </div>
    </div>
  );
}

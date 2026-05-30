import { useEffect, useMemo, useRef, useState } from "react";
import { createCommandRegistry } from "./commands.js";
import { executeInput, formatPrompt, initialShellState } from "./shell.js";

const welcomeLines = [
  "Console Clone virtual bash",
  "Type 'help' for available commands.",
];

export function Terminal() {
  const registry = useMemo(() => createCommandRegistry(), []);
  const [shellState, setShellState] = useState(initialShellState);
  const [entries, setEntries] = useState([{ kind: "output", lines: welcomeLines }]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(null);
  const inputRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [entries]);

  function submitCommand(event) {
    event.preventDefault();
    const commandText = input;
    const result = executeInput(commandText, shellState, registry);

    setShellState(result.nextState);
    setEntries((current) => (result.clear ? [] : [...current, ...result.entries]));

    if (commandText.trim()) {
      setHistory((current) => [...current, commandText]);
    }

    setHistoryIndex(null);
    setInput("");
  }

  function handleKeyDown(event) {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!history.length) return;
      const nextIndex = historyIndex === null ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIndex);
      setInput(history[nextIndex]);
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (historyIndex === null) return;
      const nextIndex = historyIndex + 1;
      if (nextIndex >= history.length) {
        setHistoryIndex(null);
        setInput("");
        return;
      }
      setHistoryIndex(nextIndex);
      setInput(history[nextIndex]);
    }
  }

  return (
    <section className="terminal-frame" onClick={() => inputRef.current?.focus()}>
      <header className="terminal-titlebar">
        <div className="window-controls" aria-hidden="true">
          <span className="control control-close" />
          <span className="control control-minimize" />
          <span className="control control-maximize" />
        </div>
        <div className="terminal-title">bash - {shellState.host}</div>
      </header>

      <div className="terminal-screen" ref={scrollRef} role="log" aria-live="polite">
        {entries.map((entry, index) =>
          entry.kind === "input" ? (
            <div className="terminal-line input-line" key={`${entry.kind}-${index}`}>
              <span className="prompt">{entry.prompt}</span>
              <span className="command-text">{entry.command}</span>
            </div>
          ) : (
            <OutputBlock entry={entry} key={`${entry.kind}-${index}`} />
          ),
        )}

        <form className="terminal-line active-line" onSubmit={submitCommand}>
          <label className="prompt" htmlFor="terminal-input">
            {formatPrompt(shellState)}
          </label>
          <input
            id="terminal-input"
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
          />
        </form>
      </div>
    </section>
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

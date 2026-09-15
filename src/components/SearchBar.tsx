import { useEffect, useRef, useState } from 'react';

interface SearchBarProps {
  /** The committed query (from the URL). */
  value: string;
  /** Called, debounced, whenever the committed query should change. */
  onChange: (q: string) => void;
  delayMs?: number;
}

/**
 * Search box for the event list. Typing updates the field at once; the
 * query is committed after a pause (or on Enter), so each keystroke does
 * not hit the API. Clearing commits immediately.
 */
export function SearchBar({ value, onChange, delayMs = 300 }: SearchBarProps) {
  const [text, setText] = useState(value);
  const timer = useRef<number | null>(null);
  const latest = useRef(onChange);
  latest.current = onChange;

  // Keep the field in sync when the URL changes from outside (back button).
  useEffect(() => {
    setText(value);
  }, [value]);

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  const commit = (q: string) => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
    if (q.trim() !== value) latest.current(q);
  };

  const schedule = (q: string) => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => commit(q), delayMs);
  };

  return (
    <form
      className="search"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        commit(text);
      }}
    >
      <span className="icon-left" aria-hidden="true">
        🔍
      </span>
      <input
        type="search"
        aria-label="搜索局"
        placeholder="搜局名、玩什么、地点、组织者"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (e.target.value.trim() === '') commit('');
          else schedule(e.target.value);
        }}
        enterKeyHint="search"
        autoComplete="off"
      />
      {text ? (
        <button
          type="button"
          className="clear"
          aria-label="清除搜索"
          onClick={() => {
            setText('');
            commit('');
          }}
        >
          ✕
        </button>
      ) : null}
    </form>
  );
}

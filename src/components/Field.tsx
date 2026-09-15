import { cloneElement, useId, type ReactElement } from 'react';

interface FieldProps {
  label: string;
  hint?: string;
  /** The single form control; it receives the id and aria-describedby. */
  children: ReactElement<{ id?: string; 'aria-describedby'?: string }>;
}

/**
 * Label + control + optional hint. The label names the control through
 * `htmlFor`, and the hint is linked with `aria-describedby` rather than
 * nested inside the label, so the control's accessible name is exactly the
 * label text (screen readers and tests can address it by that name alone).
 */
export function Field({ label, hint, children }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {cloneElement(children, { id, ...(hint ? { 'aria-describedby': hintId } : {}) })}
      {hint ? (
        <small id={hintId} className="hint">
          {hint}
        </small>
      ) : null}
    </div>
  );
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="banner error" role="alert">
      {message}
    </div>
  );
}

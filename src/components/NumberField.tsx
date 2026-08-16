import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';

interface NumberFieldProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  id?: string;
  className?: string;
  placeholder?: string;
  'aria-label'?: string;
  disabled?: boolean;
}

/**
 * A number input that does not fight you while you type.
 *
 * Clamping on every keystroke makes a field hostile: clearing it snaps to the
 * minimum, and typing "12" into a field capped at 8 rewrites the first digit
 * before you finish. So the field keeps whatever you have typed as a draft
 * string - including empty - and only commits and clamps on blur or Enter.
 */
export const NumberField = ({
  value,
  onChange,
  min,
  max,
  id,
  className,
  placeholder,
  disabled,
  'aria-label': ariaLabel
}: NumberFieldProps) => {
  const [draft, setDraft] = useState(String(value));

  // Follow the value when it changes from outside (a reset, a preset, etc.)
  // without clobbering what the user is part-way through typing.
  useEffect(() => {
    setDraft(current => (Number(current) === value ? current : String(value)));
  }, [value]);

  const commit = () => {
    const parsed = parseInt(draft, 10);

    if (!Number.isFinite(parsed)) {
      // Empty or nonsense: put the last good value back rather than inventing one.
      setDraft(String(value));
      return;
    }

    let next = parsed;
    if (min !== undefined) next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);

    setDraft(String(next));
    if (next !== value) onChange(next);
  };

  return (
    <Input
      id={id}
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      value={draft}
      placeholder={placeholder}
      disabled={disabled}
      aria-label={ariaLabel}
      className={className}
      onChange={event => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={event => {
        if (event.key === 'Enter') {
          event.currentTarget.blur();
        }
      }}
    />
  );
};

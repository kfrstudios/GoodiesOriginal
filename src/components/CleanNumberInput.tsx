import React, { useState, useEffect, useRef } from 'react';

export interface CleanNumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'min' | 'max'> {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number | string;
  allowDecimals?: boolean;
  className?: string;
  id?: string;
}

export const CleanNumberInput: React.FC<CleanNumberInputProps> = ({
  value,
  onChange,
  min = 0,
  max,
  step = 'any',
  allowDecimals = false,
  className = '',
  onFocus,
  onBlur,
  ...props
}) => {
  // Keep local string state to allow smooth typing (e.g. typing empty or decimal point "0.")
  const [text, setText] = useState<string>(() => (value === 0 ? '0' : String(value)));
  const isFocusedRef = useRef(false);

  // Sync external value when not focused or when prop changes significantly
  useEffect(() => {
    if (!isFocusedRef.current) {
      setText(value === 0 ? '0' : String(value));
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Strictly prevent negative numbers and exponential notations
    if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') {
      e.preventDefault();
      return;
    }

    // If decimals are disallowed, prevent '.' and ','
    if (!allowDecimals && (e.key === '.' || e.key === ',')) {
      e.preventDefault();
      return;
    }

    // Call external onKeyDown if provided
    props.onKeyDown?.(e);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(',', '.');

    // Remove any negative signs or illegal non-numeric characters
    if (allowDecimals) {
      raw = raw.replace(/[^0-9.]/g, '');
      // Allow only one decimal point
      const parts = raw.split('.');
      if (parts.length > 2) {
        raw = parts[0] + '.' + parts.slice(1).join('');
      }
    } else {
      raw = raw.replace(/[^0-9]/g, '');
    }

    // If the input was "0" and user types a digit (e.g. "05"), replace "0" directly with "5"
    if (raw.length > 1 && raw.startsWith('0') && raw[1] !== '.') {
      raw = raw.replace(/^0+/, '');
      if (raw === '') raw = '0';
    }

    // If completely cleared
    if (raw === '') {
      setText('');
      onChange(min > 0 ? min : 0);
      return;
    }

    // Intermediate state: user typed "0." or "."
    if (raw === '.' || raw.endsWith('.')) {
      setText(raw);
      const parsed = parseFloat(raw);
      if (!isNaN(parsed)) {
        onChange(parsed);
      }
      return;
    }

    const num = parseFloat(raw);
    if (isNaN(num)) {
      setText('');
      onChange(min > 0 ? min : 0);
      return;
    }

    // Prevent negative numbers
    let clamped = Math.max(min, num);

    // Prevent unrealistic / out of bounds numbers if max is provided
    if (max !== undefined && clamped > max) {
      clamped = max;
      raw = String(max);
    }

    setText(raw);
    onChange(clamped);
  };

  const handleFocusInternal = (e: React.FocusEvent<HTMLInputElement>) => {
    isFocusedRef.current = true;
    // Auto-select text so typing immediately replaces whatever was there (especially "0")
    e.target.select();
    onFocus?.(e);
  };

  const handleBlurInternal = (e: React.FocusEvent<HTMLInputElement>) => {
    isFocusedRef.current = false;
    if (text === '' || isNaN(parseFloat(text))) {
      const fallback = min > 0 ? min : 0;
      setText(String(fallback));
      onChange(fallback);
    } else {
      let parsed = parseFloat(text);
      if (parsed < min) parsed = min;
      if (max !== undefined && parsed > max) parsed = max;
      setText(String(parsed));
      onChange(parsed);
    }
    onBlur?.(e);
  };

  return (
    <input
      type="text"
      inputMode={allowDecimals ? 'decimal' : 'numeric'}
      value={text}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onFocus={handleFocusInternal}
      onBlur={handleBlurInternal}
      className={className}
      {...props}
    />
  );
};

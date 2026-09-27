"use client";

import { useRef, type ChangeEvent } from "react";

function formatAmount(value: string) {
  const sanitized = value.replace(/,/g, "").replace(/[^\d.-]/g, "");
  const negative = sanitized.startsWith("-");
  const unsigned = sanitized.replace(/-/g, "");
  const decimalIndex = unsigned.indexOf(".");
  const hasDecimal = decimalIndex >= 0;
  let integer = (hasDecimal ? unsigned.slice(0, decimalIndex) : unsigned).replace(/\D/g, "");
  const fraction = hasDecimal ? unsigned.slice(decimalIndex + 1).replace(/\D/g, "") : "";

  if (!integer && hasDecimal) integer = "0";
  integer = integer.replace(/^0+(?=\d)/, "");
  const groupedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${negative ? "-" : ""}${groupedInteger}${hasDecimal ? `.${fraction}` : ""}`;
}

export function AmountInput({
  className,
  id,
  name,
  onChange,
  required = false,
  value,
}: {
  className: string;
  id: string;
  name?: string;
  onChange: (value: string) => void;
  required?: boolean;
  value: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const inputValue = event.currentTarget.value;
    const cursor = event.currentTarget.selectionStart ?? inputValue.length;
    const rawCursor = formatAmount(inputValue.slice(0, cursor)).replace(/,/g, "").length;
    const formatted = formatAmount(inputValue);
    onChange(formatted);

    requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input) return;
      let position = 0;
      let rawCharacters = 0;
      while (position < formatted.length && rawCharacters < rawCursor) {
        if (formatted[position] !== ",") rawCharacters += 1;
        position += 1;
      }
      input.setSelectionRange(position, position);
    });
  }

  return (
    <input
      className={className}
      id={id}
      inputMode="decimal"
      name={name}
      onChange={handleChange}
      ref={inputRef}
      required={required}
      type="text"
      value={formatAmount(value)}
    />
  );
}
"use client";

import { useState } from "react";

interface KeywordsFieldProps {
  value: string[];
  onChange: (keywords: string[]) => void;
  placeholder?: string;
  error?: string;
}

export default function KeywordsField({
  value,
  onChange,
  placeholder = "Escribe y presiona Enter",
  error,
}: KeywordsFieldProps) {
  const [input, setInput] = useState("");

  const addKeyword = () => {
    const trimmed = input.trim().toLowerCase();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInput("");
  };

  const removeKeyword = (kw: string) => {
    onChange(value.filter((k) => k !== kw));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addKeyword();
    }
  };

  return (
    <div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addKeyword}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          type="button"
          onClick={addKeyword}
          className="px-3 py-2 text-sm bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500"
        >
          Agregar
        </button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {value.map((kw) => (
            <span
              key={kw}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs"
            >
              {kw}
              <button
                type="button"
                onClick={() => removeKeyword(kw)}
                className="hover:text-red-500"
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      )}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

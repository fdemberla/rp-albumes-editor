"use client";

import { useCallback } from "react";
import { X } from "lucide-react";

export const COLOR_TAGS = [
  { value: "red", label: "Rojo", bg: "bg-red-500", ring: "ring-red-500", dot: "#EF4444" },
  { value: "orange", label: "Naranja", bg: "bg-orange-500", ring: "ring-orange-500", dot: "#F97316" },
  { value: "yellow", label: "Amarillo", bg: "bg-yellow-400", ring: "ring-yellow-400", dot: "#FACC15" },
  { value: "green", label: "Verde", bg: "bg-green-500", ring: "ring-green-500", dot: "#22C55E" },
  { value: "teal", label: "Verde azul", bg: "bg-teal-500", ring: "ring-teal-500", dot: "#14B8A6" },
  { value: "blue", label: "Azul", bg: "bg-blue-500", ring: "ring-blue-500", dot: "#3B82F6" },
  { value: "purple", label: "Púrpura", bg: "bg-purple-500", ring: "ring-purple-500", dot: "#A855F7" },
  { value: "pink", label: "Rosa", bg: "bg-pink-500", ring: "ring-pink-500", dot: "#EC4899" },
  { value: "gray", label: "Gris", bg: "bg-gray-400", ring: "ring-gray-400", dot: "#9CA3AF" },
] as const;

export type ColorTagValue = (typeof COLOR_TAGS)[number]["value"];

interface ColorTagSelectorProps {
  value: string[];
  onChange: (tags: string[]) => void;
  label?: string;
  /** Whether multiple tags can be selected. Default: true */
  multiSelect?: boolean;
  /** Compact mode: smaller circles, no chips below. Default: false */
  compact?: boolean;
}

export default function ColorTagSelector({
  value,
  onChange,
  label,
  multiSelect = true,
  compact = false,
}: ColorTagSelectorProps) {
  const toggle = useCallback(
    (tag: string) => {
      if (multiSelect) {
        if (value.includes(tag)) {
          onChange(value.filter((t) => t !== tag));
        } else {
          onChange([...value, tag]);
        }
      } else {
        onChange(value.includes(tag) ? [] : [tag]);
      }
    },
    [value, onChange, multiSelect],
  );

  const dotSize = compact ? "w-5 h-5" : "w-6 h-6";

  return (
    <div>
      {label && (
        <p className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
          {label}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {COLOR_TAGS.map((ct) => {
          const active = value.includes(ct.value);
          return (
            <button
              key={ct.value}
              type="button"
              title={ct.label}
              onClick={() => toggle(ct.value)}
              className={`${dotSize} rounded-full transition-all duration-150 ${ct.bg} ${
                active
                  ? `ring-2 ring-offset-2 ${ct.ring} scale-110 opacity-100`
                  : "opacity-50 hover:opacity-80"
              }`}
            />
          );
        })}
      </div>

      {!compact && value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {value.map((tag) => {
            const ct = COLOR_TAGS.find((c) => c.value === tag);
            if (!ct) return null;
            return (
              <span
                key={tag}
                className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full text-white font-medium ${ct.bg}`}
              >
                {ct.label}
                <button
                  type="button"
                  onClick={() => toggle(tag)}
                  className="ml-0.5 hover:opacity-75"
                  aria-label={`Quitar ${ct.label}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

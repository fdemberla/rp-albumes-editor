"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";
import type { Fotografo, FotografoCreateInput } from "@/types/electron";

interface FotografoSelectorProps {
  value: string | null; // fotografoId
  onChange: (fotografoId: string | null, fotografo: Fotografo | null) => void;
  /** Pre-selected fotografo for display (avoids an extra fetch) */
  initialFotografo?: Fotografo | null;
  className?: string;
}

export default function FotografoSelector({
  value,
  onChange,
  initialFotografo,
  className,
}: FotografoSelectorProps) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Fotografo[]>([]);
  const [selected, setSelected] = useState<Fotografo | null>(
    initialFotografo || null,
  );
  const [showDropdown, setShowDropdown] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const touchedRef = useRef(false);

  // Sync selected state when value or initialFotografo changes
  // Once the user has interacted (select/clear), stop overriding their choice
  useEffect(() => {
    if (!value && !initialFotografo) {
      setSelected(null);
      touchedRef.current = false;
      return;
    }
    if (touchedRef.current) return;
    if (initialFotografo) {
      setSelected(initialFotografo);
    }
  }, [value, initialFotografo]);

  // Search fotografos with debounce
  const doSearch = useCallback(async (term: string) => {
    setLoading(true);
    const result = await window.electronAPI.listFotografos(term || undefined);
    if (result.success && result.fotografos) {
      setResults(result.fotografos);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!showDropdown) return;
    const timer = setTimeout(() => doSearch(search), 200);
    return () => clearTimeout(timer);
  }, [search, showDropdown, doSearch]);

  // Close dropdown on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
        setShowCreate(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (fotografo: Fotografo) => {
    touchedRef.current = true;
    setSelected(fotografo);
    onChange(fotografo.id, fotografo);
    setShowDropdown(false);
    setSearch("");
  };

  const handleClear = () => {
    touchedRef.current = true;
    setSelected(null);
    onChange(null, null);
    setSearch("");
  };

  const handleCreate = async (input: FotografoCreateInput) => {
    const result = await window.electronAPI.createFotografo(input);
    if (result.success && result.fotografo) {
      handleSelect(result.fotografo);
      setShowCreate(false);
    }
  };

  // If a fotografo is selected, show it as a pill
  if (selected) {
    return (
      <div className={className}>
        <div className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700">
          <span className="flex-1 text-sm text-gray-900 dark:text-white">
            {selected.firstName} {selected.lastName}
          </span>
          <button
            type="button"
            onClick={handleClear}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative ${className || ""}`}>
      <input
        ref={inputRef}
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onFocus={() => {
          setShowDropdown(true);
          doSearch(search);
        }}
        placeholder="Buscar fotógrafo..."
        className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
      />

      {showDropdown && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-auto">
          {loading && (
            <div className="px-3 py-2 text-xs text-gray-400">Buscando...</div>
          )}

          {!loading && results.length === 0 && (
            <div className="px-3 py-2 text-xs text-gray-400">
              {search ? "Sin resultados" : "No hay fotógrafos"}
            </div>
          )}

          {results.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => handleSelect(f)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-900 dark:text-white transition-colors"
            >
              <span className="font-medium">
                {f.firstName} {f.lastName}
              </span>
              {f.email && (
                <span className="ml-2 text-xs text-gray-400">{f.email}</span>
              )}
            </button>
          ))}

          {/* Create new */}
          <div className="border-t border-gray-200 dark:border-gray-600">
            {showCreate ? (
              <InlineCreateForm
                initialName={search}
                onCreate={handleCreate}
                onCancel={() => setShowCreate(false)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="w-full text-left px-3 py-2 text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
              >
                + Crear nuevo fotógrafo
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Inline Create Form ─────────────────────────────────────────────────────

function InlineCreateForm({
  initialName,
  onCreate,
  onCancel,
}: {
  initialName: string;
  onCreate: (input: FotografoCreateInput) => void;
  onCancel: () => void;
}) {
  // Attempt to split the initial search text into first/last name
  const parts = initialName.trim().split(/\s+/);
  const [firstName, setFirstName] = useState(parts[0] || "");
  const [lastName, setLastName] = useState(parts.slice(1).join(" ") || "");
  const [email, setEmail] = useState("");

  const handleSubmit = () => {
    if (!firstName.trim() || !lastName.trim()) return;
    onCreate({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim() || undefined,
    });
  };

  return (
    <div
      className="p-3 space-y-2"
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          handleSubmit();
        }
      }}
    >
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          placeholder="Nombre"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          required
          className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          autoFocus
        />
        <input
          type="text"
          placeholder="Apellido"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          required
          className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      </div>
      <input
        type="email"
        placeholder="Email (opcional)"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
      />
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="px-2 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700"
        >
          Crear
        </button>
      </div>
    </div>
  );
}

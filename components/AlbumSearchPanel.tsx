"use client";

import { useState, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Search,
  ChevronDown,
  ChevronUp,
  X,
  SlidersHorizontal,
  Tag,
} from "lucide-react";
import type { AlbumFilter, Fotografo } from "@/types/electron";
import FotografoSelector from "./FotografoSelector";

interface AlbumSearchPanelProps {
  filters: AlbumFilter;
  onFiltersChange: (filters: AlbumFilter) => void;
  onClear: () => void;
}

const inputClass =
  "w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent";

const selectClass =
  "w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent";

const labelClass =
  "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1";

export default function AlbumSearchPanel({
  filters,
  onFiltersChange,
  onClear,
}: AlbumSearchPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [keywordInput, setKeywordInput] = useState("");
  const [selectedFotografo, setSelectedFotografo] = useState<Fotografo | null>(
    null,
  );

  // Count active advanced filters (excluding name, photographer, page, pageSize)
  const advancedCount = [
    filters.city,
    filters.state,
    filters.country,
    filters.dateFrom,
    filters.dateTo,
    filters.keywords && filters.keywords.length > 0 ? true : undefined,
    filters.sortBy && filters.sortBy !== "eventDate" ? true : undefined,
    filters.sortOrder && filters.sortOrder !== "desc" ? true : undefined,
    filters.pageSize && filters.pageSize !== 20 ? true : undefined,
  ].filter(Boolean).length;

  const updateFilter = useCallback(
    (key: keyof AlbumFilter, value: unknown) => {
      const next = { ...filters, [key]: value || undefined };
      // Clean up empty values
      if (!next[key]) delete next[key];
      onFiltersChange(next);
    },
    [filters, onFiltersChange],
  );

  const handlePhotographerChange = useCallback(
    (fotografoId: string | null, fotografo: Fotografo | null) => {
      setSelectedFotografo(fotografo);
      const next = { ...filters };
      if (fotografoId) {
        next.photographerId = fotografoId;
        delete next.photographer;
      } else {
        delete next.photographerId;
        delete next.photographer;
      }
      onFiltersChange(next);
    },
    [filters, onFiltersChange],
  );

  const addKeyword = useCallback(() => {
    const kw = keywordInput.trim();
    if (!kw) return;
    const current = filters.keywords || [];
    if (current.includes(kw)) {
      setKeywordInput("");
      return;
    }
    onFiltersChange({ ...filters, keywords: [...current, kw] });
    setKeywordInput("");
  }, [keywordInput, filters, onFiltersChange]);

  const removeKeyword = useCallback(
    (kw: string) => {
      const updated = (filters.keywords || []).filter((k) => k !== kw);
      onFiltersChange({
        ...filters,
        keywords: updated.length > 0 ? updated : undefined,
      });
    },
    [filters, onFiltersChange],
  );

  const handleClear = useCallback(() => {
    setSelectedFotografo(null);
    setKeywordInput("");
    onClear();
  }, [onClear]);

  const hasAnyFilter =
    filters.name ||
    filters.photographer ||
    filters.photographerId ||
    filters.city ||
    filters.state ||
    filters.country ||
    filters.dateFrom ||
    filters.dateTo ||
    (filters.keywords && filters.keywords.length > 0);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 space-y-3">
      {/* ── Primary row ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={filters.name || ""}
            onChange={(e) => updateFilter("name", e.target.value)}
            placeholder="Buscar por nombre de álbum..."
            className={`${inputClass} pl-9`}
          />
        </div>

        <div className="w-64">
          <FotografoSelector
            value={filters.photographerId || null}
            onChange={handlePhotographerChange}
            initialFotografo={selectedFotografo}
            className="text-sm"
          />
        </div>

        {/* Toggle advanced */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="relative flex items-center gap-1.5 px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
          title="Filtros avanzados"
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span className="hidden sm:inline">Filtros</span>
          {expanded ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
          {advancedCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-blue-600 text-white text-[10px] rounded-full flex items-center justify-center font-medium">
              {advancedCount}
            </span>
          )}
        </button>

        {/* Clear all */}
        {hasAnyFilter && (
          <button
            onClick={handleClear}
            className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 dark:text-red-400 rounded-md border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title="Limpiar filtros"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">Limpiar</span>
          </button>
        )}
      </div>

      {/* ── Advanced filters (collapsible) ────────────────────────────── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700 space-y-3">
              {/* Row 1: Location */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Ciudad</label>
                  <input
                    type="text"
                    value={filters.city || ""}
                    onChange={(e) => updateFilter("city", e.target.value)}
                    placeholder="Ej: Panamá"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Estado / Provincia</label>
                  <input
                    type="text"
                    value={filters.state || ""}
                    onChange={(e) => updateFilter("state", e.target.value)}
                    placeholder="Ej: Panamá"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>País</label>
                  <input
                    type="text"
                    value={filters.country || ""}
                    onChange={(e) => updateFilter("country", e.target.value)}
                    placeholder="Ej: Panamá"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Row 2: Dates + Keywords */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Fecha desde</label>
                  <input
                    type="date"
                    value={filters.dateFrom || ""}
                    onChange={(e) => updateFilter("dateFrom", e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Fecha hasta</label>
                  <input
                    type="date"
                    value={filters.dateTo || ""}
                    onChange={(e) => updateFilter("dateTo", e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    <Tag className="inline w-3 h-3 mr-1" />
                    Palabras clave
                  </label>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addKeyword();
                        }
                      }}
                      placeholder="Agregar y Enter"
                      className={`${inputClass} flex-1`}
                    />
                    <button
                      onClick={addKeyword}
                      disabled={!keywordInput.trim()}
                      className="px-2.5 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Keyword chips */}
              {filters.keywords && filters.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {filters.keywords.map((kw) => (
                    <span
                      key={kw}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
                    >
                      {kw}
                      <button
                        onClick={() => removeKeyword(kw)}
                        className="hover:text-red-500 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Row 3: Sort + Page size */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Ordenar por</label>
                  <select
                    value={filters.sortBy || "eventDate"}
                    onChange={(e) =>
                      updateFilter(
                        "sortBy",
                        e.target.value === "eventDate"
                          ? undefined
                          : e.target.value,
                      )
                    }
                    className={selectClass}
                  >
                    <option value="eventDate">Fecha del evento</option>
                    <option value="name">Nombre</option>
                    <option value="createdAt">Fecha de creación</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Orden</label>
                  <select
                    value={filters.sortOrder || "desc"}
                    onChange={(e) =>
                      updateFilter(
                        "sortOrder",
                        e.target.value === "desc" ? undefined : e.target.value,
                      )
                    }
                    className={selectClass}
                  >
                    <option value="desc">Descendente (más reciente)</option>
                    <option value="asc">Ascendente (más antiguo)</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Resultados por página</label>
                  <select
                    value={filters.pageSize || 20}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      updateFilter("pageSize", v === 20 ? undefined : v);
                    }}
                    className={selectClass}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

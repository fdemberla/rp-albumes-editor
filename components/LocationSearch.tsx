"use client";

import { useState } from "react";
import { Search, MapPin, Lightbulb } from "lucide-react";

interface LocationSearchProps {
  onLocationSelect: (location: {
    city: string;
    state: string;
    country: string;
    latitude: number;
    longitude: number;
  }) => void;
}

export default function LocationSearch({
  onLocationSelect,
}: LocationSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    setError(null);
    setResults([]);

    try {
      // Usando Nominatim (OpenStreetMap) - gratuito, sin API key
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery,
        )}&limit=5`,
        {
          headers: {
            "User-Agent": "EditorMetadatos/1.0",
          },
        },
      );

      if (!response.ok) {
        throw new Error("Error al buscar ubicación");
      }

      const data = await response.json();
      setResults(data);

      if (data.length === 0) {
        setError("No se encontraron resultados");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSearching(false);
    }
  };

  const handleSelectResult = (result: any) => {
    // Extraer información del resultado de Nominatim
    const address = result.address || {};

    onLocationSelect({
      city: address.city || address.town || address.village || "",
      state: address.state || address.province || "",
      country: address.country || "",
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
    });

    // Limpiar búsqueda
    setSearchQuery("");
    setResults([]);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Ej: Panama City, Panama"
          className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          onClick={handleSearch}
          disabled={searching || !searchQuery.trim()}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white text-sm rounded-lg transition-colors whitespace-nowrap"
        >
          {searching ? (
            "Buscando..."
          ) : (
            <>
              <Search className="w-4 h-4 inline" /> Buscar
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="text-xs text-red-600 dark:text-red-400">{error}</div>
      )}

      {results.length > 0 && (
        <div className="max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg">
          {results.map((result, index) => (
            <button
              key={index}
              onClick={() => handleSelectResult(result)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 border-b border-gray-200 dark:border-gray-700 last:border-b-0 transition-colors"
            >
              <div className="font-medium text-gray-900 dark:text-white">
                {result.display_name}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> GPS:{" "}
                {parseFloat(result.lat).toFixed(6)},{" "}
                {parseFloat(result.lon).toFixed(6)}
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1">
        <Lightbulb className="w-3 h-3 mt-0.5 flex-shrink-0" />
        <span>
          Busca por ciudad, dirección o lugar. Se guardarán las coordenadas GPS
          junto con la ubicación.
        </span>
      </div>
    </div>
  );
}

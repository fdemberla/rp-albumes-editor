"use client";

import { useState } from "react";
import { X, Globe, MapPin } from "lucide-react";
import type { LocationValue } from "@/types/form";
import LocationSearch from "../LocationSearch";

interface LocationFieldProps {
  value: LocationValue;
  onChange: (location: LocationValue) => void;
  showGps?: boolean;
  error?: string;
}

export default function LocationField({
  value,
  onChange,
  showGps = true,
  error,
}: LocationFieldProps) {
  const [showSearch, setShowSearch] = useState(false);
  const [selectedName, setSelectedName] = useState<string | null>(null);

  const update = (patch: Partial<LocationValue>) => {
    onChange({ ...value, ...patch });
  };

  const handleLocationSelect = (location: {
    city: string;
    state: string;
    country: string;
    latitude: number;
    longitude: number;
  }) => {
    onChange({
      city: location.city || "",
      state: location.state || "",
      country: location.country || "",
      gpsLatitude: location.latitude ? location.latitude.toFixed(6) : "",
      gpsLongitude: location.longitude ? location.longitude.toFixed(6) : "",
    });

    // Build a display name from the selected location
    const parts = [location.city, location.state, location.country].filter(
      Boolean,
    );
    setSelectedName(parts.join(", ") || "Ubicación seleccionada");
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Buscar o completar manualmente
        </span>
        <button
          type="button"
          onClick={() => setShowSearch(!showSearch)}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          {showSearch ? (
            <>
              <X className="w-3 h-3 inline" /> Cerrar búsqueda
            </>
          ) : (
            <>
              <Globe className="w-3 h-3 inline" /> Buscar ubicación
            </>
          )}
        </button>
      </div>

      {showSearch && (
        <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-md border border-gray-200 dark:border-gray-700 space-y-2">
          <LocationSearch onLocationSelect={handleLocationSelect} />

          {selectedName && (
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md text-sm text-green-800 dark:text-green-300">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium">{selectedName}</span>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <input
          type="text"
          value={value.city}
          onChange={(e) => update({ city: e.target.value })}
          placeholder="Ciudad"
          className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <input
          type="text"
          value={value.state}
          onChange={(e) => update({ state: e.target.value })}
          placeholder="Estado/Provincia"
          className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <input
          type="text"
          value={value.country}
          onChange={(e) => update({ country: e.target.value })}
          placeholder="País"
          className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {showGps && (
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            value={value.gpsLatitude}
            onChange={(e) => update({ gpsLatitude: e.target.value })}
            placeholder="Latitud"
            className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input
            type="text"
            value={value.gpsLongitude}
            onChange={(e) => update({ gpsLongitude: e.target.value })}
            placeholder="Longitud"
            className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      )}

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import type { AlbumPhoto } from "@/types/electron";
import LocationSearch from "./LocationSearch";

interface AlbumPhotoEditorProps {
  photos: AlbumPhoto[];
  albumId: string;
  onSaved?: () => void;
}

export default function AlbumPhotoEditor({
  photos,
  albumId,
  onSaved,
}: AlbumPhotoEditorProps) {
  const isSingle = photos.length === 1;
  const photo = isSingle ? photos[0] : null;

  // Metadata state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [copyright, setCopyright] = useState("");
  const [artist, setArtist] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("");
  const [gpsLatitude, setGpsLatitude] = useState("");
  const [gpsLongitude, setGpsLongitude] = useState("");

  // UI state
  const [keywordInput, setKeywordInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [showLocationSearch, setShowLocationSearch] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load data from single selected photo
  useEffect(() => {
    if (isSingle && photo) {
      setTitle(photo.title || "");
      setDescription(photo.description || "");
      setKeywords(photo.keywords || []);
      setCopyright(photo.copyright || "");
      setArtist(photo.artist || "");
      setCity(photo.city || "");
      setState(photo.state || "");
      setCountry(photo.country || "");
      setGpsLatitude(
        photo.gpsLatitude != null ? String(photo.gpsLatitude) : "",
      );
      setGpsLongitude(
        photo.gpsLongitude != null ? String(photo.gpsLongitude) : "",
      );
    } else {
      // Reset for multi-edit
      setTitle("");
      setDescription("");
      setKeywords([]);
      setCopyright("");
      setArtist("");
      setCity("");
      setState("");
      setCountry("");
      setGpsLatitude("");
      setGpsLongitude("");
    }
    setSaveSuccess(false);
  }, [photos, isSingle, photo]);

  const handleAddKeyword = () => {
    const trimmed = keywordInput.trim().toLowerCase();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords([...keywords, trimmed]);
    }
    setKeywordInput("");
  };

  const handleKeywordKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  const removeKeyword = (kw: string) => {
    setKeywords(keywords.filter((k) => k !== kw));
  };

  const handleLocationSelect = (location: {
    city: string;
    state: string;
    country: string;
    lat?: number;
    lon?: number;
  }) => {
    setCity(location.city || "");
    setState(location.state || "");
    setCountry(location.country || "");
    if (location.lat) setGpsLatitude(String(location.lat));
    if (location.lon) setGpsLongitude(String(location.lon));
    setShowLocationSearch(false);
  };

  const handleSave = async () => {
    if (!window.electronAPI) return;

    setSaving(true);
    setSaveSuccess(false);

    try {
      const metadata: Record<string, unknown> = {};

      // For single edit, send all fields
      // For multi edit, only send fields that have values (non-empty overwrite)
      if (title) metadata.title = title;
      if (description) metadata.description = description;
      if (keywords.length > 0) metadata.keywords = keywords;
      if (copyright) metadata.copyright = copyright;
      if (artist) metadata.artist = artist;
      if (city) metadata.city = city;
      if (state) metadata.state = state;
      if (country) metadata.country = country;
      if (gpsLatitude) metadata.gpsLatitude = gpsLatitude;
      if (gpsLongitude) metadata.gpsLongitude = gpsLongitude;

      const photoIds = photos.map((p) => p.id);

      const result = await window.electronAPI.updatePhotoMetadata(
        albumId,
        photoIds,
        metadata,
      );

      if (result.success) {
        setSaveSuccess(true);
        onSaved?.();
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Error saving photo metadata:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
        {isSingle
          ? `Editar: ${photo?.originalFilename}`
          : `Editar ${photos.length} fotos`}
      </h3>

      {/* Title (single only) */}
      {isSingle && (
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Título
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Título de la foto"
          />
        </div>
      )}

      {/* Description (single only) */}
      {isSingle && (
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Descripción
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full px-2.5 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
            placeholder="Descripción..."
          />
        </div>
      )}

      {/* Artist */}
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
          Artista / Fotógrafo
        </label>
        <input
          type="text"
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
          className="w-full px-2.5 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder={isSingle ? "Nombre del artista" : "Aplicar a todas..."}
        />
      </div>

      {/* Copyright */}
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
          Copyright
        </label>
        <input
          type="text"
          value={copyright}
          onChange={(e) => setCopyright(e.target.value)}
          className="w-full px-2.5 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="© 2026 ..."
        />
      </div>

      {/* Keywords */}
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
          Palabras Clave
        </label>
        <div className="flex gap-1.5">
          <input
            type="text"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={handleKeywordKeyDown}
            onBlur={handleAddKeyword}
            placeholder="Enter para agregar"
            className="flex-1 px-2.5 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="button"
            onClick={handleAddKeyword}
            className="px-2 py-1.5 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
          >
            +
          </button>
        </div>
        {keywords.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {keywords.map((kw) => (
              <span
                key={kw}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-[10px]"
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
      </div>

      {/* Location */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
            Ubicación
          </label>
          <button
            type="button"
            onClick={() => setShowLocationSearch(!showLocationSearch)}
            className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline"
          >
            {showLocationSearch ? "Cerrar búsqueda" : "Buscar ubicación"}
          </button>
        </div>
        {showLocationSearch && (
          <LocationSearch onLocationSelect={handleLocationSelect} />
        )}
        <div className="grid grid-cols-3 gap-1.5">
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Ciudad"
            className="px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input
            type="text"
            value={state}
            onChange={(e) => setState(e.target.value)}
            placeholder="Estado"
            className="px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="País"
            className="px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <input
            type="text"
            value={gpsLatitude}
            onChange={(e) => setGpsLatitude(e.target.value)}
            placeholder="Latitud"
            className="px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input
            type="text"
            value={gpsLongitude}
            onChange={(e) => setGpsLongitude(e.target.value)}
            placeholder="Longitud"
            className="px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Save */}
      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
        {saveSuccess && (
          <p className="text-xs text-green-600 dark:text-green-400 mb-2">
            ✓ Metadatos guardados exitosamente
          </p>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {saving
            ? "Guardando..."
            : isSingle
              ? "Guardar Metadatos"
              : `Aplicar a ${photos.length} fotos`}
        </button>
      </div>
    </div>
  );
}

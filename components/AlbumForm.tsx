"use client";

import { useState, useEffect } from "react";
import type { AlbumCreateInput, Album } from "@/types/electron";
import LocationSearch from "./LocationSearch";

interface AlbumFormProps {
  album?: Album | null; // If provided, we're in edit mode
  onSave: (input: AlbumCreateInput) => Promise<Album | null | void>;
  onCancel: () => void;
  /** Called after a new album is created with the post-create choice */
  onPostCreate?: (albumId: string, wantsUpload: boolean) => void;
  loading?: boolean;
}

export default function AlbumForm({
  album,
  onSave,
  onCancel,
  onPostCreate,
  loading,
}: AlbumFormProps) {
  const isEditing = !!album;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [photographer, setPhotographer] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("");
  const [keywordInput, setKeywordInput] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);

  // Post-create step
  const [showPostCreate, setShowPostCreate] = useState(false);
  const [createdAlbumId, setCreatedAlbumId] = useState<string | null>(null);

  // Populate form when editing
  useEffect(() => {
    if (album) {
      setName(album.name || "");
      setDescription(album.description || "");
      setPhotographer(album.photographer || "");
      setEventDate(
        album.eventDate
          ? new Date(album.eventDate).toISOString().substring(0, 10)
          : "",
      );
      setCity(album.city || "");
      setState(album.state || "");
      setCountry(album.country || "");
      setKeywords(album.keywords || []);
    }
  }, [album]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const input: AlbumCreateInput = {
      name: name.trim(),
      description: description.trim() || undefined,
      photographer: photographer.trim(),
      eventDate,
      city: city.trim() || undefined,
      state: state.trim() || undefined,
      country: country.trim() || undefined,
      keywords,
    };

    const result = await onSave(input);

    // If this is a new album creation and we have a post-create callback, show the step
    if (
      !isEditing &&
      onPostCreate &&
      result &&
      typeof result === "object" &&
      "id" in result
    ) {
      setCreatedAlbumId(result.id);
      setShowPostCreate(true);
    }
  };

  const handleLocationSelect = (loc: {
    city: string;
    state: string;
    country: string;
    lat?: number;
    lon?: number;
  }) => {
    setCity(loc.city || "");
    setState(loc.state || "");
    setCountry(loc.country || "");
  };

  // Post-create confirmation step
  if (showPostCreate && createdAlbumId && onPostCreate) {
    return (
      <div className="space-y-6 text-center py-4">
        <div className="text-green-500 text-4xl">✓</div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Álbum creado exitosamente
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          ¿Ya tenés archivos listos para subir a este álbum?
        </p>
        <div className="flex gap-3 justify-center pt-2">
          <button
            onClick={() => onPostCreate(createdAlbumId, true)}
            className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Sí, subir fotos ahora
          </button>
          <button
            onClick={() => onPostCreate(createdAlbumId, false)}
            className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500"
          >
            No, después
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
        {isEditing ? "Editar Álbum" : "Nuevo Álbum"}
      </h2>

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Nombre del Álbum *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Ej: Inauguración Hotel Panamá"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Descripción
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
          placeholder="Descripción del evento o sesión fotográfica..."
        />
      </div>

      {/* Photographer */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Fotógrafo *
        </label>
        <input
          type="text"
          value={photographer}
          onChange={(e) => setPhotographer(e.target.value)}
          required
          className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Nombre del fotógrafo"
        />
      </div>

      {/* Event Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Fecha del Evento *
        </label>
        <input
          type="date"
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
          required
          className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Location */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Ubicación
        </label>
        <LocationSearch onLocationSelect={handleLocationSelect} />
        <div className="grid grid-cols-3 gap-2">
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Ciudad"
            className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input
            type="text"
            value={state}
            onChange={(e) => setState(e.target.value)}
            placeholder="Estado/Provincia"
            className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="País"
            className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Keywords */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Palabras Clave
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={handleKeywordKeyDown}
            onBlur={handleAddKeyword}
            placeholder="Escribe y presiona Enter"
            className="flex-1 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="button"
            onClick={handleAddKeyword}
            className="px-3 py-2 text-sm bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500"
          >
            Agregar
          </button>
        </div>
        {keywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {keywords.map((kw) => (
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
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={
            loading || !name.trim() || !photographer.trim() || !eventDate
          }
          className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading
            ? "Guardando..."
            : isEditing
              ? "Actualizar Álbum"
              : "Crear Álbum"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

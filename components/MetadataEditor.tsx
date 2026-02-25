"use client";

import { useState, useEffect, useMemo } from "react";
import { useImageStore } from "@/lib/store";
import { ImageMetadata } from "@/types/electron";
import LocationSearch from "./LocationSearch";

export default function MetadataEditor() {
  const {
    updateImageMetadata,
    images,
    selectedImages: selectedImageIds,
  } = useImageStore();

  // Get actual selected images with useMemo to prevent re-creation
  const selectedImages = useMemo(
    () => images.filter((img) => selectedImageIds.includes(img.id)),
    [images, selectedImageIds]
  );

  const [metadata, setMetadata] = useState<Partial<ImageMetadata>>({
    title: "",
    description: "",
    keywords: [],
    copyright: "",
    artist: "",
    location: {
      city: "",
      state: "",
      country: "",
      gpsLatitude: "",
      gpsLongitude: "",
    },
  });

  const [keywordInput, setKeywordInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [showLocationSearch, setShowLocationSearch] = useState(false);

  // Load metadata from first selected image
  useEffect(() => {
    const selected = images.filter((img) => selectedImageIds.includes(img.id));

    if (selected.length === 1) {
      const img = selected[0];
      setMetadata({
        title: img.metadata.title || "",
        description: img.metadata.description || "",
        keywords: img.metadata.keywords || [],
        copyright: img.metadata.copyright || "",
        artist: img.metadata.artist || "",
        location: {
          city: img.metadata.location?.city || "",
          state: img.metadata.location?.state || "",
          country: img.metadata.location?.country || "",
          gpsLatitude: img.metadata.location?.gpsLatitude || "",
          gpsLongitude: img.metadata.location?.gpsLongitude || "",
        },
      });
    } else if (selected.length > 1) {
      // Reset for bulk edit
      setMetadata({
        title: "",
        description: "",
        keywords: [],
        copyright: "",
        artist: "",
        location: {
          city: "",
          state: "",
          country: "",
          gpsLatitude: "",
          gpsLongitude: "",
        },
      });
    }
  }, [selectedImageIds, images]);

  const handleAddKeyword = () => {
    if (keywordInput.trim()) {
      setMetadata({
        ...metadata,
        keywords: [...(metadata.keywords || []), keywordInput.trim()],
      });
      setKeywordInput("");
    }
  };

  const handleRemoveKeyword = (index: number) => {
    setMetadata({
      ...metadata,
      keywords: metadata.keywords?.filter((_, i) => i !== index) || [],
    });
  };

  const handleLocationSelect = (location: {
    city: string;
    state: string;
    country: string;
    latitude: number;
    longitude: number;
  }) => {
    setMetadata({
      ...metadata,
      location: {
        city: location.city,
        state: location.state,
        country: location.country,
        gpsLatitude: location.latitude.toFixed(6),
        gpsLongitude: location.longitude.toFixed(6),
      },
    });
    setShowLocationSearch(false);
  };

  const handleSave = async () => {
    if (!window.electronAPI || selectedImages.length === 0) return;

    setSaving(true);

    try {
      // Prepare updates only with changed fields
      const updates = selectedImages.map((img) => ({
        filePath: img.filePath,
        metadata: metadata,
      }));

      const results = await window.electronAPI.writeBulkMetadata(updates);

      // Update local state
      results.forEach((result, index) => {
        if (result.success) {
          updateImageMetadata(selectedImages[index].id, metadata);
        }
      });

      const failedCount = results.filter((r) => !r.success).length;
      if (failedCount > 0) {
        alert(`${failedCount} imágenes fallaron al actualizar`);
      } else {
        alert("Metadatos actualizados exitosamente");
      }
    } catch (error) {
      alert(
        "Error al guardar metadatos: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    } finally {
      setSaving(false);
    }
  };

  if (selectedImages.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 max-h-[calc(100vh-250px)] overflow-y-auto pr-2">
      {selectedImages.length > 1 && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-sm text-blue-800 dark:text-blue-300">
          Editando {selectedImages.length} imágenes. Los campos que completes se
          aplicarán a todas las seleccionadas.
        </div>
      )}

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Título
        </label>
        <input
          type="text"
          value={metadata.title}
          onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Título de la imagen"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Descripción
        </label>
        <textarea
          value={metadata.description}
          onChange={(e) =>
            setMetadata({ ...metadata, description: e.target.value })
          }
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Descripción detallada para WordPress"
        />
      </div>

      {/* Keywords */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Palabras Clave
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && (e.preventDefault(), handleAddKeyword())
            }
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Agregar palabra clave"
          />
          <button
            onClick={handleAddKeyword}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Agregar
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {metadata.keywords?.map((keyword, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 rounded-full text-sm"
            >
              {keyword}
              <button
                onClick={() => handleRemoveKeyword(index)}
                className="hover:text-blue-600 dark:hover:text-blue-200"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Copyright */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Copyright
        </label>
        <input
          type="text"
          value={metadata.copyright}
          onChange={(e) =>
            setMetadata({ ...metadata, copyright: e.target.value })
          }
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="© 2025 Tu Organización"
        />
      </div>

      {/* Artist/Photographer */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Fotógrafo
        </label>
        <input
          type="text"
          value={metadata.artist}
          onChange={(e) => setMetadata({ ...metadata, artist: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Nombre del fotógrafo"
        />
      </div>

      {/* Location with GPS Integration */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Ubicación
          </label>
          <button
            onClick={() => setShowLocationSearch(!showLocationSearch)}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            {showLocationSearch ? "✕ Cerrar búsqueda" : "🌍 Buscar en mapa"}
          </button>
        </div>

        {showLocationSearch && (
          <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <LocationSearch onLocationSelect={handleLocationSelect} />
          </div>
        )}

        <div className="space-y-2">
          <input
            type="text"
            value={metadata.location?.city || ""}
            onChange={(e) =>
              setMetadata({
                ...metadata,
                location: {
                  ...metadata.location,
                  city: e.target.value,
                  state: metadata.location?.state || "",
                  country: metadata.location?.country || "",
                  gpsLatitude: metadata.location?.gpsLatitude || "",
                  gpsLongitude: metadata.location?.gpsLongitude || "",
                },
              })
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Ciudad"
          />
          <input
            type="text"
            value={metadata.location?.state || ""}
            onChange={(e) =>
              setMetadata({
                ...metadata,
                location: {
                  ...metadata.location,
                  city: metadata.location?.city || "",
                  state: e.target.value,
                  country: metadata.location?.country || "",
                  gpsLatitude: metadata.location?.gpsLatitude || "",
                  gpsLongitude: metadata.location?.gpsLongitude || "",
                },
              })
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Estado/Provincia"
          />
          <input
            type="text"
            value={metadata.location?.country || ""}
            onChange={(e) =>
              setMetadata({
                ...metadata,
                location: {
                  ...metadata.location,
                  city: metadata.location?.city || "",
                  state: metadata.location?.state || "",
                  country: e.target.value,
                  gpsLatitude: metadata.location?.gpsLatitude || "",
                  gpsLongitude: metadata.location?.gpsLongitude || "",
                },
              })
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="País"
          />

          {/* GPS Coordinates */}
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
              📍 Coordenadas GPS
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={metadata.location?.gpsLatitude || ""}
                onChange={(e) =>
                  setMetadata({
                    ...metadata,
                    location: {
                      ...metadata.location,
                      city: metadata.location?.city || "",
                      state: metadata.location?.state || "",
                      country: metadata.location?.country || "",
                      gpsLatitude: e.target.value,
                      gpsLongitude: metadata.location?.gpsLongitude || "",
                    },
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Latitud"
              />
              <input
                type="text"
                value={metadata.location?.gpsLongitude || ""}
                onChange={(e) =>
                  setMetadata({
                    ...metadata,
                    location: {
                      ...metadata.location,
                      city: metadata.location?.city || "",
                      state: metadata.location?.state || "",
                      country: metadata.location?.country || "",
                      gpsLatitude: metadata.location?.gpsLatitude || "",
                      gpsLongitude: e.target.value,
                    },
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Longitud"
              />
            </div>

            {metadata.location?.gpsLatitude &&
              metadata.location?.gpsLongitude && (
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
                  <span>
                    📌 {metadata.location.gpsLatitude},{" "}
                    {metadata.location.gpsLongitude}
                  </span>
                  <a
                    href={`https://www.google.com/maps?q=${metadata.location.gpsLatitude},${metadata.location.gpsLongitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Ver en Google Maps →
                  </a>
                </div>
              )}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
      >
        {saving
          ? "Guardando..."
          : `Guardar Metadatos (${selectedImages.length})`}
      </button>
    </div>
  );
}

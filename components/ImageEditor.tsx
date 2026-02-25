"use client";

import { useState, useEffect, useMemo } from "react";
import { useImageStore } from "@/lib/store";
import { ImageMetadata } from "@/types/electron";
import LocationSearch from "./LocationSearch";

export default function ImageEditor() {
  const {
    updateImageMetadata,
    images,
    selectedImages: selectedImageIds,
  } = useImageStore();

  // Get actual selected images with useMemo
  const selectedImages = useMemo(
    () => images.filter((img) => selectedImageIds.includes(img.id)),
    [images, selectedImageIds]
  );

  // Metadata state
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

  // Rename state
  const [pattern, setPattern] = useState("");
  const [startNumber, setStartNumber] = useState(1);
  const [numberPadding, setNumberPadding] = useState(3);

  // File operation state
  // Por defecto mantenemos los archivos originales (copias)
  const [keepOriginals, setKeepOriginals] = useState(true);
  const [outputFolder, setOutputFolder] = useState<string | null>(null);
  const [operation, setOperation] = useState<"copy" | "move">("copy");

  // UI state
  const [keywordInput, setKeywordInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [showLocationSearch, setShowLocationSearch] = useState(false);

  // Load metadata from first selected image
  useEffect(() => {
    if (selectedImages.length === 1) {
      const img = selectedImages[0];
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
    } else if (selectedImages.length > 1) {
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
  }, [selectedImages]);

  // Generate preview of new filenames
  const previewRenames = useMemo(() => {
    if (!pattern) return [];

    return selectedImages.map((img, index) => {
      const ext = img.metadata.fileName.split(".").pop();
      const number = (startNumber + index)
        .toString()
        .padStart(numberPadding, "0");

      let newName = pattern
        .replace("{n}", number)
        .replace("{date}", new Date().toISOString().split("T")[0])
        .replace("{original}", img.metadata.fileName.replace(/\.[^/.]+$/, ""));

      newName = `${newName}.${ext}`;

      const dir = img.filePath.substring(
        0,
        img.filePath.lastIndexOf("\\") || img.filePath.lastIndexOf("/")
      );
      const separator = img.filePath.includes("\\") ? "\\" : "/";
      const newPath = `${dir}${separator}${newName}`;

      return {
        id: img.id,
        oldPath: img.filePath,
        oldName: img.metadata.fileName,
        newPath: newPath,
        newName: newName,
      };
    });
  }, [selectedImages, pattern, startNumber, numberPadding]);

  // Handle keyword operations
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

  // Handle location selection
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

  // Select output folder
  const handleSelectOutputFolder = async () => {
    if (!window.electronAPI) return;

    const result = await window.electronAPI.openFolder();
    if (!result.canceled && result.folder) {
      setOutputFolder(result.folder);
    }
  };

  // Handle save metadata and optional rename/copy
  const handleSave = async () => {
    if (!window.electronAPI || selectedImages.length === 0) return;

    setSaving(true);

    try {
      // If user deselects keeping originals, require an output folder
      if (!keepOriginals && !outputFolder) {
        alert(
          "Si no mantienes los archivos originales, por favor selecciona una carpeta de salida"
        );
        setSaving(false);
        return;
      }

      // Build operations depending on keepOriginals
      // - keepOriginals === true: create copies (default behaviour)
      //   - if pattern present, use previewRenames
      //   - if no pattern, create copies with suffix _edited to avoid overwriting
      // - keepOriginals === false: move/copy to selected outputFolder (user must choose)

      const makeCopyName = (originalName: string) => {
        if (pattern) return null; // previewRenames will provide name
        // insert suffix before extension
        const idx = originalName.lastIndexOf(".");
        const base = idx === -1 ? originalName : originalName.slice(0, idx);
        const ext = idx === -1 ? "" : originalName.slice(idx);
        return `${base}_edited${ext}`;
      };

      const operations = selectedImages.map((img, index) => {
        const suggestedName =
          previewRenames[index]?.newName ||
          makeCopyName(img.metadata.fileName) ||
          img.metadata.fileName;
        return {
          filePath: img.filePath,
          newName: suggestedName,
          metadata: metadata,
          // if user provided an outputFolder use it, otherwise null (main will fallback to same dir)
          outputFolder: outputFolder || null,
          // operation: if user kept originals -> always copy; otherwise use chosen operation
          operation: keepOriginals ? "copy" : operation,
        };
      });

      console.log("=== DEBUG: Enviando operaciones a Electron ===");
      console.log("Total operaciones:", operations.length);
      console.log("Operaciones:", JSON.stringify(operations, null, 2));
      console.log("keepOriginals:", keepOriginals);
      console.log("outputFolder:", outputFolder);
      console.log("window.electronAPI:", window.electronAPI);
      console.log("window.electronAPI.processBulkImages:", window.electronAPI.processBulkImages);
      console.log("Tipo de processBulkImages:", typeof window.electronAPI.processBulkImages);

      if (typeof window.electronAPI.processBulkImages !== 'function') {
        throw new Error("processBulkImages no está disponible en electronAPI. Reinicia la aplicación.");
      }

      const results = await window.electronAPI.processBulkImages(operations);
      
      console.log("=== DEBUG: Resultados recibidos ===");
      console.log("Total resultados:", results.length);
      console.log("Resultados:", JSON.stringify(results, null, 2));

      results.forEach(
        (result: { success: boolean; newPath?: string }, index: number) => {
          if (result.success && result.newPath) {
            updateImageMetadata(selectedImages[index].id, {
              ...metadata,
              fileName:
                result.newPath.split("\\").pop() ||
                result.newPath.split("/").pop() ||
                "",
              filePath: result.newPath,
            });
          }
        }
      );

      const failedCount = results.filter(
        (r: { success: boolean }) => !r.success
      ).length;
      if (failedCount > 0) {
        alert(
          `${failedCount} archivos fallaron. ${
            results.length - failedCount
          } procesados exitosamente`
        );
      } else {
        alert(
          `${results.length} archivos ${
            keepOriginals
              ? "copiados"
              : operation === "copy"
              ? "copiados"
              : "movidos"
          } exitosamente`
        );
        setPattern("");
      }
    } catch (error) {
      alert(
        "Error al procesar: " +
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
    <div className="space-y-6 max-h-[calc(100vh-250px)] overflow-y-auto pr-2">
      {selectedImages.length > 1 && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-sm text-blue-800 dark:text-blue-300">
          Editando {selectedImages.length} imágenes
        </div>
      )}

      {/* METADATOS SECTION */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
          Metadatos
        </h3>
        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Título
            </label>
            <input
              type="text"
              value={metadata.title}
              onChange={(e) =>
                setMetadata({ ...metadata, title: e.target.value })
              }
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
              rows={3}
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
              onChange={(e) =>
                setMetadata({ ...metadata, artist: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Nombre del fotógrafo"
            />
          </div>

          {/* Location with GPS */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Ubicación
              </label>
              <button
                onClick={() => setShowLocationSearch(!showLocationSearch)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                {showLocationSearch ? "✕ Cerrar" : "🌍 Buscar en mapa"}
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
                  Coordenadas GPS
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
                  metadata.location?.gpsLongitude &&
                  (() => {
                    const lat = parseFloat(
                      metadata.location.gpsLatitude || "0"
                    );
                    const lng = parseFloat(
                      metadata.location.gpsLongitude || "0"
                    );
                    const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
                    return (
                      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
                        <span>
                          📌 {metadata.location.gpsLatitude},{" "}
                          {metadata.location.gpsLongitude}
                        </span>
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Ver en Google Maps →
                        </a>
                      </div>
                    );
                  })()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RENOMBRAR SECTION */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
          🔤 Renombrar Archivos
        </h3>
        <div className="space-y-4">
          {/* Pattern Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Patrón de Nombre
            </label>
            <input
              type="text"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="HotelA_Panama_2025_{n}"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Variables: {"{n}"} = número, {"{date}"} = fecha actual,{" "}
              {"{original}"} = nombre original
            </p>
          </div>

          {/* Number Settings */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Número Inicial
              </label>
              <input
                type="number"
                value={startNumber}
                onChange={(e) => setStartNumber(parseInt(e.target.value) || 1)}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Dígitos
              </label>
              <input
                type="number"
                value={numberPadding}
                onChange={(e) =>
                  setNumberPadding(parseInt(e.target.value) || 1)
                }
                min="1"
                max="6"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Preview */}
          {pattern && previewRenames.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Vista Previa ({previewRenames.length} archivos)
              </label>
              <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                <div className="max-h-48 overflow-y-auto">
                  {previewRenames.slice(0, 5).map((rename, index) => (
                    <div
                      key={index}
                      className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 last:border-b-0 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 dark:text-gray-400 truncate flex-1">
                          {rename.oldName}
                        </span>
                        <span className="text-gray-400">→</span>
                        <span className="text-blue-600 dark:text-blue-400 truncate flex-1 font-medium">
                          {rename.newName}
                        </span>
                      </div>
                    </div>
                  ))}
                  {previewRenames.length > 5 && (
                    <div className="px-3 py-2 text-xs text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800">
                      ... y {previewRenames.length - 5} más
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Examples */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 text-xs">
            <p className="font-medium text-gray-700 dark:text-gray-300 mb-2">
              Ejemplos:
            </p>
            <div className="space-y-1 text-gray-600 dark:text-gray-400">
              <div>
                <code className="bg-white dark:bg-gray-800 px-2 py-0.5 rounded">
                  HotelA_{"{date}"}_{"{n}"}
                </code>
                <span className="ml-2">→ HotelA_2025-10-03_001.jpg</span>
              </div>
              <div>
                <code className="bg-white dark:bg-gray-800 px-2 py-0.5 rounded">
                  Event_{"{n}"}
                </code>
                <span className="ml-2">→ Event_001.jpg</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FILE OPERATIONS SECTION */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
          Opciones de Archivo
        </h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="keepOriginals"
              checked={keepOriginals}
              onChange={(e) => setKeepOriginals(e.target.checked)}
              className="w-4 h-4"
            />
            <label
              htmlFor="keepOriginals"
              className="text-sm text-gray-700 dark:text-gray-300"
            >
              Mantener archivos originales (crear copias)
            </label>
          </div>

          {!keepOriginals && (
            <div className="space-y-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
              <div className="flex gap-3 mb-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="operation"
                    value="copy"
                    checked={operation === "copy"}
                    onChange={(e) =>
                      setOperation(e.target.value as "copy" | "move")
                    }
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    📋 Copiar archivos
                  </span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="operation"
                    value="move"
                    checked={operation === "move"}
                    onChange={(e) =>
                      setOperation(e.target.value as "copy" | "move")
                    }
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    ↗️ Mover archivos
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Carpeta de salida:
                </label>
                <button
                  onClick={handleSelectOutputFolder}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Seleccionar
                </button>
              </div>
              {outputFolder && (
                <div className="p-2 bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600 text-xs text-gray-600 dark:text-gray-400 truncate">
                  {outputFolder}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Save/Process Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
      >
        {saving
          ? "Procesando..."
          : `Aplicar Cambios (${selectedImages.length})`}
      </button>
    </div>
  );
}

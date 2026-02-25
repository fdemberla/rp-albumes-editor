"use client";

import { useState, useMemo } from "react";
import { useImageStore } from "@/lib/store";

export default function BulkRename() {
  const { getSelectedImages, updateImageMetadata } = useImageStore();
  const selectedImages = getSelectedImages();

  const [pattern, setPattern] = useState("");
  const [startNumber, setStartNumber] = useState(1);
  const [numberPadding, setNumberPadding] = useState(3);
  const [renaming, setRenaming] = useState(false);

  // Generate preview of new filenames
  const previewRenames = useMemo(() => {
    if (!pattern) return [];

    return selectedImages.map((img, index) => {
      const ext = img.metadata.fileName.split(".").pop();
      const number = (startNumber + index)
        .toString()
        .padStart(numberPadding, "0");

      // Replace placeholders
      let newName = pattern
        .replace("{n}", number)
        .replace("{date}", new Date().toISOString().split("T")[0])
        .replace("{original}", img.metadata.fileName.replace(/\.[^/.]+$/, ""));

      // Add extension
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

  const handleRename = async () => {
    if (!window.electronAPI || previewRenames.length === 0) return;

    setRenaming(true);

    try {
      const renames = previewRenames.map((r) => ({
        oldPath: r.oldPath,
        newPath: r.newPath,
      }));

      const results = await window.electronAPI.bulkRenameFiles(renames);

      // Update local state
      results.forEach((result, index) => {
        if (result.success && result.newPath) {
          const rename = previewRenames[index];
          updateImageMetadata(rename.id, {
            fileName: rename.newName,
            filePath: result.newPath,
          });
        }
      });

      const failedCount = results.filter((r) => !r.success).length;
      if (failedCount > 0) {
        alert(`${failedCount} archivos fallaron al renombrar`);
      } else {
        alert("Archivos renombrados exitosamente");
        setPattern("");
      }
    } catch (error) {
      alert(
        "Error al renombrar archivos: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    } finally {
      setRenaming(false);
    }
  };

  if (selectedImages.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-sm text-amber-800 dark:text-amber-300">
        ⚠️ Esta operación renombrará {selectedImages.length} archivos. Asegúrate
        de revisar los cambios antes de aplicar.
      </div>

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
          Variables: {"{n}"} = número, {"{date}"} = fecha actual, {"{original}"}{" "}
          = nombre original
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
            onChange={(e) => setNumberPadding(parseInt(e.target.value) || 1)}
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
            <div className="max-h-60 overflow-y-auto">
              {previewRenames.slice(0, 10).map((rename, index) => (
                <div
                  key={index}
                  className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                >
                  <div className="flex items-center gap-2 text-xs">
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
              {previewRenames.length > 10 && (
                <div className="px-3 py-2 text-xs text-center text-gray-500 dark:text-gray-400">
                  ... y {previewRenames.length - 10} más
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Examples */}
      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
          Ejemplos de patrones:
        </p>
        <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
          <div>
            <code className="bg-gray-200 dark:bg-gray-800 px-2 py-0.5 rounded">
              HotelA_Panama_{"{date}"}_{"{n}"}
            </code>
            <span className="ml-2">→ HotelA_Panama_2025-10-03_001.jpg</span>
          </div>
          <div>
            <code className="bg-gray-200 dark:bg-gray-800 px-2 py-0.5 rounded">
              Event_{"{n}"}
            </code>
            <span className="ml-2">→ Event_001.jpg</span>
          </div>
          <div>
            <code className="bg-gray-200 dark:bg-gray-800 px-2 py-0.5 rounded">
              {"{original}"}_edited
            </code>
            <span className="ml-2">→ photo_edited.jpg</span>
          </div>
        </div>
      </div>

      {/* Rename Button */}
      <button
        onClick={handleRename}
        disabled={renaming || !pattern || previewRenames.length === 0}
        className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
      >
        {renaming
          ? "Renombrando..."
          : `Renombrar ${previewRenames.length} Archivos`}
      </button>
    </div>
  );
}

"use client";

import { useState, useCallback } from "react";
import { useImageStore } from "@/lib/store";
import { ImageWithMetadata } from "@/lib/store";

export default function ImageImport() {
  const { addImages, setLoading, setError, loading } = useImageStore();
  const [dragActive, setDragActive] = useState(false);

  const processFiles = useCallback(
    async (filePaths: string[]) => {
      if (!window.electronAPI) {
        setError("Electron API not available");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const results = await window.electronAPI.readBulkMetadata(filePaths);

        const images: ImageWithMetadata[] = [];

        for (const result of results) {
          if (result.success && result.metadata) {
            const preview = await window.electronAPI.getImagePreview(
              result.filePath
            );

            images.push({
              id: crypto.randomUUID(),
              filePath: result.filePath,
              preview: preview.success ? preview.data : undefined,
              metadata: result.metadata,
              selected: false,
            });
          }
        }

        addImages(images);
      } catch (error) {
        setError(
          error instanceof Error ? error.message : "Error loading images"
        );
      } finally {
        setLoading(false);
      }
    },
    [addImages, setLoading, setError]
  );

  const handleOpenFiles = async () => {
    if (!window.electronAPI) return;

    const result = await window.electronAPI.openFiles();
    if (!result.canceled && result.files.length > 0) {
      await processFiles(result.files);
    }
  };

  const handleOpenFolder = async () => {
    if (!window.electronAPI) return;

    const result = await window.electronAPI.openFolder();
    if (!result.canceled && result.folder) {
      const folderResult = await window.electronAPI.listImagesInFolder(
        result.folder
      );
      if (folderResult.success && folderResult.files) {
        await processFiles(folderResult.files);
      }
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (!window.electronAPI) return;

      const files = Array.from(e.dataTransfer.files);
      const filePaths = files.map((file) => (file as any).path).filter(Boolean);

      if (filePaths.length > 0) {
        await processFiles(filePaths);
      }
    },
    [processFiles]
  );

  return (
    <div className="w-full max-w-2xl">
      <div
        className={`relative border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
          dragActive
            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
            : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {loading && (
          <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 rounded-lg flex items-center justify-center z-50">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin">
                <svg
                  className="w-8 h-8 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"
                  />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Cargando imágenes...
              </p>
            </div>
          </div>
        )}
        <div className="space-y-4">
          <div className="flex justify-center">
            <svg
              className="w-16 h-16 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Importar Imágenes
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Arrastra y suelta tus imágenes aquí o usa los botones abajo
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleOpenFiles}
              disabled={loading}
              className={`px-6 py-3 font-medium rounded-lg transition-colors ${
                loading
                  ? "bg-blue-400 text-white cursor-not-allowed opacity-60"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              Seleccionar Archivos
            </button>
            <button
              onClick={handleOpenFolder}
              disabled={loading}
              className={`px-6 py-3 font-medium rounded-lg transition-colors ${
                loading
                  ? "bg-gray-400 text-white cursor-not-allowed opacity-60"
                  : "bg-gray-600 hover:bg-gray-700 text-white"
              }`}
            >
              Seleccionar Carpeta
            </button>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Formatos soportados: JPG, PNG, GIF, BMP, TIFF, WebP, HEIC
          </p>
        </div>
      </div>
    </div>
  );
}

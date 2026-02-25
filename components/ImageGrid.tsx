"use client";

import { useImageStore } from "@/lib/store";

export default function ImageGrid() {
  const {
    images,
    selectedImages,
    toggleImageSelection,
    selectAll,
    deselectAll,
    clearImages,
  } = useImageStore();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Imágenes ({images.length})
          </h2>
          {selectedImages.length > 0 && (
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {selectedImages.length} seleccionadas
            </span>
          )}
        </div>

        <div className="flex gap-2">
          {selectedImages.length === images.length ? (
            <button
              onClick={deselectAll}
              className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              Deseleccionar Todo
            </button>
          ) : (
            <button
              onClick={selectAll}
              className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              Seleccionar Todo
            </button>
          )}
          <button
            onClick={clearImages}
            className="px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
          >
            Limpiar
          </button>
        </div>
      </div>

      {/* Image Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[calc(100vh-200px)] overflow-y-auto">
        {images.map((image) => (
          <div
            key={image.id}
            onClick={() => toggleImageSelection(image.id)}
            className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
              image.selected
                ? "border-blue-500 ring-2 ring-blue-500"
                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
            }`}
          >
            {/* Image */}
            <div className="aspect-square bg-gray-100 dark:bg-gray-700">
              {image.preview ? (
                <img
                  src={image.preview}
                  alt={image.metadata.fileName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg
                    className="w-12 h-12 text-gray-400"
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
              )}
            </div>

            {/* Selection Indicator */}
            {image.selected && (
              <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            )}

            {/* Filename overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
              <p
                className="text-xs text-white truncate"
                title={image.metadata.fileName}
              >
                {image.metadata.fileName}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

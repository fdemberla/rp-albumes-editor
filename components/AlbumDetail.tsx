"use client";

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useAlbumStore } from "@/lib/albumStore";
import type {
  AlbumUpdateInput,
  AlbumPhoto,
  AlbumCreateInput,
  UploadPhotoInput,
  UploadProgress,
  DownloadProgress,
} from "@/types/electron";
import { Upload, Image as ImageIcon, Check, ChevronLeft } from "lucide-react";
import AlbumForm from "./AlbumForm";
import AlbumPhotoEditor from "./AlbumPhotoEditor";
import PhotoViewer from "./PhotoViewer";

interface AlbumDetailProps {
  /** If true, opens with the upload flow active */
  initialShowUpload?: boolean;
  /** Called once the initialShowUpload flag has been consumed */
  onUploadShown?: () => void;
}

export default function AlbumDetail({
  initialShowUpload = false,
  onUploadShown,
}: AlbumDetailProps) {
  const {
    currentAlbum,
    loading,
    error,
    uploadProgress,
    updateAlbum,
    removePhotos,
    uploadPhotos,
    fetchAlbum,
    setCurrentAlbum,
    clearError,
  } = useAlbumStore();

  const [isEditing, setIsEditing] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [loadingThumbnails, setLoadingThumbnails] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] =
    useState<DownloadProgress | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  // Listen for download progress events
  useEffect(() => {
    if (!window.electronAPI?.onDownloadProgress) return;
    const cleanup = window.electronAPI.onDownloadProgress((progress) => {
      setDownloadProgress(progress);
      if (progress.stage === "complete") {
        // Auto-hide after 3 seconds
        setTimeout(() => {
          setDownloadProgress(null);
          setDownloading(false);
        }, 3000);
      }
    });
    return cleanup;
  }, []);

  // Handle initialShowUpload — trigger file picker automatically
  useEffect(() => {
    if (initialShowUpload && currentAlbum && !isUploading) {
      onUploadShown?.();
      handleUploadPhotos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialShowUpload, currentAlbum?.id]);

  // Load thumbnails for photos
  const loadThumbnails = useCallback(async () => {
    if (!currentAlbum || !currentAlbum.photos.length) return;

    setLoadingThumbnails(true);
    const newThumbnails: Record<string, string> = {};

    for (const photo of currentAlbum.photos) {
      if (photo.thumbnailPath && !thumbnails[photo.id]) {
        try {
          const result = await window.electronAPI.getAlbumThumbnail(
            photo.thumbnailPath,
          );
          if (result.success && result.data) {
            newThumbnails[photo.id] = result.data;
          }
        } catch {
          // Skip failed thumbnails
        }
      }
    }

    setThumbnails((prev) => ({ ...prev, ...newThumbnails }));
    setLoadingThumbnails(false);
  }, [currentAlbum, thumbnails]);

  useEffect(() => {
    loadThumbnails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAlbum?.id, currentAlbum?.photos.length]);

  if (!currentAlbum) return null;

  const handleBack = () => {
    setCurrentAlbum(null);
    setSelectedPhotos([]);
    setThumbnails({});
  };

  const handleUpdate = async (input: AlbumCreateInput) => {
    const updateInput: AlbumUpdateInput = input;
    await updateAlbum(currentAlbum.id, updateInput);
    setIsEditing(false);
  };

  const togglePhotoSelection = (photoId: string) => {
    setSelectedPhotos((prev) =>
      prev.includes(photoId)
        ? prev.filter((id) => id !== photoId)
        : [...prev, photoId],
    );
  };

  const selectAllPhotos = () => {
    setSelectedPhotos(currentAlbum.photos.map((p: AlbumPhoto) => p.id));
  };

  const deselectAllPhotos = () => {
    setSelectedPhotos([]);
  };

  const handleRemovePhotos = async () => {
    if (selectedPhotos.length === 0) return;

    const confirmed = window.confirm(
      `¿Eliminar ${selectedPhotos.length} foto${selectedPhotos.length !== 1 ? "s" : ""} del álbum? Se eliminarán del servidor.`,
    );
    if (confirmed) {
      const success = await removePhotos(currentAlbum.id, selectedPhotos);
      if (success) {
        setSelectedPhotos([]);
        setThumbnails((prev) => {
          const next = { ...prev };
          for (const id of selectedPhotos) delete next[id];
          return next;
        });
      }
    }
  };

  const handleDownloadPhotos = async () => {
    if (selectedPhotos.length === 0 || !window.electronAPI) return;

    const photosToDownload = currentAlbum.photos
      .filter((p: AlbumPhoto) => selectedPhotos.includes(p.id))
      .map((p: AlbumPhoto) => ({
        storedPath: p.storedPath,
        originalFilename: p.originalFilename,
      }));

    setDownloading(true);
    setDownloadProgress(null);
    try {
      const result = await window.electronAPI.downloadPhotos(photosToDownload);
      if (result.error === "cancelled") {
        setDownloading(false);
        setDownloadProgress(null);
      }
    } catch (err) {
      console.error("Download error:", err);
      setDownloading(false);
      setDownloadProgress(null);
    }
  };

  /** Open file picker and upload selected files to this album */
  const handleUploadPhotos = async () => {
    if (!window.electronAPI || isUploading) return;

    const result = await window.electronAPI.openFiles();
    if (result.canceled || result.files.length === 0) return;

    setIsUploading(true);

    // Read metadata from selected files
    const metadataResults = await window.electronAPI.readBulkMetadata(
      result.files,
    );

    // Build upload payload — metadata will be enriched with album data on the backend
    const photos: UploadPhotoInput[] = result.files.map((filePath, i) => {
      const meta = metadataResults[i];
      return {
        filePath,
        metadata: meta.success && meta.metadata ? meta.metadata : {},
      };
    });

    await uploadPhotos(currentAlbum.id, photos);
    setIsUploading(false);
  };

  // Get selected photo objects for the editor
  const selectedPhotoObjects = currentAlbum.photos.filter((p: AlbumPhoto) =>
    selectedPhotos.includes(p.id),
  );

  // If editing album metadata, show the form
  if (isEditing) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 max-w-2xl mx-auto">
        <AlbumForm
          album={currentAlbum}
          onSave={handleUpdate}
          onCancel={() => setIsEditing(false)}
          loading={loading}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleBack}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md flex items-center gap-1"
        >
          <ChevronLeft className="w-4 h-4" /> Volver
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {currentAlbum.name}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {currentAlbum.fotografo
              ? `${currentAlbum.fotografo.firstName} ${currentAlbum.fotografo.lastName}`
              : currentAlbum.photographer || "Sin fotógrafo"}{" "}
            &middot;{" "}
            {new Date(currentAlbum.eventDate).toLocaleDateString("es-PA")}
            {(currentAlbum.city || currentAlbum.country) && (
              <>
                {" "}
                &middot;{" "}
                {[currentAlbum.city, currentAlbum.country]
                  .filter(Boolean)
                  .join(", ")}
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleUploadPhotos}
            disabled={isUploading}
            className="px-4 py-1.5 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-1.5"
          >
            <Upload className="w-4 h-4" />
            Subir Fotos
          </button>
          <button
            onClick={() => setIsEditing(true)}
            className="px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-600 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20"
          >
            Editar
          </button>
        </div>
      </div>

      {/* Description */}
      {currentAlbum.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          {currentAlbum.description}
        </p>
      )}

      {/* Keywords */}
      {currentAlbum.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {currentAlbum.keywords.map((kw: string) => (
            <span
              key={kw}
              className="px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
            >
              {kw}
            </span>
          ))}
        </div>
      )}

      {/* Upload Progress Banner */}
      {(isUploading || uploadProgress) && (
        <UploadProgressBar progress={uploadProgress} />
      )}

      {/* Download Progress Banner */}
      {(downloading || downloadProgress) && (
        <DownloadProgressBar progress={downloadProgress} />
      )}

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <div className="flex items-center justify-between">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            <button
              onClick={clearError}
              className="text-red-500 hover:text-red-700 text-sm"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {/* Photo Actions Bar */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg shadow p-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {currentAlbum.photos.length} foto
            {currentAlbum.photos.length !== 1 ? "s" : ""}
          </span>
          {currentAlbum.photos.length > 0 && (
            <>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <button
                onClick={selectAllPhotos}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Seleccionar todo
              </button>
              <button
                onClick={deselectAllPhotos}
                className="text-xs text-gray-500 dark:text-gray-400 hover:underline"
              >
                Deseleccionar
              </button>
              {selectedPhotos.length > 0 && (
                <span className="text-xs text-blue-600 dark:text-blue-300 font-medium">
                  ({selectedPhotos.length} seleccionada
                  {selectedPhotos.length !== 1 ? "s" : ""})
                </span>
              )}
            </>
          )}
        </div>
        {selectedPhotos.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPhotos}
              disabled={loading || downloading}
              className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {downloading
                ? "Descargando..."
                : selectedPhotos.length === 1
                  ? "Descargar foto"
                  : `Descargar ${selectedPhotos.length} fotos (ZIP)`}
            </button>
            <button
              onClick={handleRemovePhotos}
              disabled={loading}
              className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              Eliminar {selectedPhotos.length} foto
              {selectedPhotos.length !== 1 ? "s" : ""}
            </button>
          </div>
        )}
      </div>

      {/* Main content: Photo grid + sidebar editor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Photo Grid (2/3) */}
        <div className="lg:col-span-2">
          {currentAlbum.photos.length === 0 && !isUploading && (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                Este álbum no tiene fotos todavía.
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 mb-4">
                Hacé clic en &quot;Subir Fotos&quot; para agregar imágenes.
              </p>
              <button
                onClick={handleUploadPhotos}
                className="px-5 py-2.5 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 flex items-center gap-1.5 mx-auto"
              >
                <Upload className="w-4 h-4" /> Subir Fotos
              </button>
            </div>
          )}

          {loadingThumbnails && currentAlbum.photos.length > 0 && (
            <div className="text-center py-4">
              <div className="inline-block w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-gray-500 mt-1">
                Cargando thumbnails...
              </p>
            </div>
          )}

          {currentAlbum.photos.length > 0 && (
            <motion.div
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.04 } },
              }}
            >
              {currentAlbum.photos.map((photo: AlbumPhoto) => {
                const isSelected = selectedPhotos.includes(photo.id);
                const thumb = thumbnails[photo.id];

                return (
                  <motion.div
                    key={photo.id}
                    variants={{
                      hidden: { opacity: 0, scale: 0.92 },
                      visible: { opacity: 1, scale: 1 },
                    }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    onClick={() => togglePhotoSelection(photo.id)}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      const idx = currentAlbum.photos.findIndex(
                        (p: AlbumPhoto) => p.id === photo.id,
                      );
                      setViewerIndex(idx >= 0 ? idx : 0);
                    }}
                    className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                      isSelected
                        ? "border-blue-500 ring-2 ring-blue-300"
                        : "border-transparent hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <div className="aspect-square bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={photo.title || photo.originalFilename}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                      )}
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                      <p className="text-[10px] text-white truncate">
                        {photo.originalFilename}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>

        {/* Sidebar: Photo Editor (1/3) */}
        <div className="lg:col-span-1">
          {selectedPhotoObjects.length > 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sticky top-4">
              <AlbumPhotoEditor
                photos={selectedPhotoObjects}
                albumId={currentAlbum.id}
                onSaved={() => {
                  // Refresh album to get updated metadata
                  fetchAlbum(currentAlbum.id);
                }}
              />
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sticky top-4">
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p className="text-sm">
                  Seleccioná una o más fotos para editar sus metadatos.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Photo Viewer Lightbox */}
      <AnimatePresence>
        {viewerIndex !== null && currentAlbum.photos.length > 0 && (
          <PhotoViewer
            photos={currentAlbum.photos}
            initialIndex={viewerIndex}
            albumId={currentAlbum.id}
            onClose={() => setViewerIndex(null)}
            onSaved={() => fetchAlbum(currentAlbum.id)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Upload Progress Bar Component ──────────────────────────────────────

function UploadProgressBar({ progress }: { progress: UploadProgress | null }) {
  if (!progress) {
    return (
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Preparando archivos...
          </p>
        </div>
      </div>
    );
  }

  const percentage =
    progress.stage === "complete"
      ? 100
      : Math.round(
          ((progress.current - 1) / progress.total) * 100 +
            (progress.stage === "uploading" ? 50 / progress.total : 0),
        );

  const stageLabels: Record<string, string> = {
    compressing: "Comprimiendo",
    uploading: "Subiendo",
    complete: "¡Completado!",
  };

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {progress.stage !== "complete" ? (
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Check className="w-4 h-4 text-green-500" />
          )}
          <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
            {stageLabels[progress.stage] || progress.stage}
            {progress.stage !== "complete" && (
              <>
                {" "}
                {progress.current} de {progress.total}
              </>
            )}
          </p>
        </div>
        <span className="text-xs text-blue-600 dark:text-blue-400 font-mono">
          {percentage}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full transition-all duration-300 ${
            progress.stage === "complete" ? "bg-green-500" : "bg-blue-600"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Current file */}
      {progress.fileName && progress.stage !== "complete" && (
        <p className="text-xs text-blue-600 dark:text-blue-400 truncate">
          {progress.fileName}
        </p>
      )}

      {progress.stage === "complete" && (
        <p className="text-xs text-green-600 dark:text-green-400">
          Se subieron {progress.total} foto{progress.total !== 1 ? "s" : ""}{" "}
          exitosamente.
        </p>
      )}
    </div>
  );
}

// ─── Download Progress Bar Component ────────────────────────────────────

function DownloadProgressBar({
  progress,
}: {
  progress: DownloadProgress | null;
}) {
  if (!progress) {
    return (
      <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-indigo-700 dark:text-indigo-300">
            Preparando descarga...
          </p>
        </div>
      </div>
    );
  }

  const percentage =
    progress.stage === "complete"
      ? 100
      : Math.round(
          ((progress.current - 1) / progress.total) * 100 +
            (progress.stage === "downloading"
              ? 0
              : progress.stage === "zipping"
                ? 50 / progress.total
                : progress.stage === "saving"
                  ? 100 / progress.total
                  : 0),
        );

  const stageLabels: Record<string, string> = {
    downloading: "Descargando",
    zipping: "Comprimiendo en ZIP",
    saving: "Guardando",
    complete: "¡Descarga completada!",
  };

  return (
    <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {progress.stage !== "complete" ? (
            <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Check className="w-4 h-4 text-green-500" />
          )}
          <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
            {stageLabels[progress.stage] || progress.stage}
            {progress.stage !== "complete" &&
              progress.stage !== "saving" &&
              progress.total > 1 && (
                <>
                  {" "}
                  {progress.current} de {progress.total}
                </>
              )}
          </p>
        </div>
        <span className="text-xs text-indigo-600 dark:text-indigo-400 font-mono">
          {percentage}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-indigo-200 dark:bg-indigo-800 rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full transition-all duration-300 ${
            progress.stage === "complete" ? "bg-green-500" : "bg-indigo-600"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Current file */}
      {progress.fileName && progress.stage !== "complete" && (
        <p className="text-xs text-indigo-600 dark:text-indigo-400 truncate">
          {progress.fileName}
        </p>
      )}

      {progress.stage === "complete" && (
        <p className="text-xs text-green-600 dark:text-green-400">
          {progress.total === 1
            ? "Foto descargada exitosamente."
            : `Se descargaron ${progress.total} fotos exitosamente.`}
        </p>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, X } from "lucide-react";
import { useAlbumStore } from "@/lib/albumStore";
import { useImageStore } from "@/lib/store";
import type {
  Album,
  AlbumCreateInput,
  UploadPhotoInput,
} from "@/types/electron";
import AlbumForm from "./AlbumForm";

interface AlbumUploadProps {
  onClose: () => void;
}

export default function AlbumUpload({ onClose }: AlbumUploadProps) {
  const {
    albums,
    loading: albumLoading,
    error: albumError,
    uploadProgress,
    fetchAlbums,
    createAlbum,
    uploadPhotos,
    clearError,
  } = useAlbumStore();

  const { images, selectedImages } = useImageStore();

  const [selectedAlbumId, setSelectedAlbumId] = useState<string>("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [uploadSummary, setUploadSummary] = useState<{
    total: number;
    uploaded: number;
    failed: number;
  } | null>(null);

  // Get selected images
  const selectedImagesList = images.filter((img) =>
    selectedImages.includes(img.id),
  );

  // Load albums on mount
  useEffect(() => {
    fetchAlbums({ pageSize: 100 }); // Load up to 100 albums for the selector
  }, [fetchAlbums]);

  const handleCreateAlbum = async (input: AlbumCreateInput) => {
    const album = await createAlbum(input);
    if (album) {
      setSelectedAlbumId(album.id);
      setShowCreateForm(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedAlbumId || selectedImagesList.length === 0) return;

    const photos: UploadPhotoInput[] = selectedImagesList.map((img) => ({
      filePath: img.filePath,
      metadata: img.metadata,
    }));

    setUploadComplete(false);
    const success = await uploadPhotos(selectedAlbumId, photos);

    setUploadComplete(true);
    if (success) {
      setUploadSummary({
        total: photos.length,
        uploaded: photos.length,
        failed: 0,
      });
    }
  };

  const selectedAlbum = albums.find((a: Album) => a.id === selectedAlbumId);

  // Show create form
  if (showCreateForm) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateForm(false)}
            className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h3 className="font-medium text-gray-900 dark:text-white">
            Crear nuevo álbum
          </h3>
        </div>
        <AlbumForm
          onSave={handleCreateAlbum}
          onCancel={() => setShowCreateForm(false)}
          loading={albumLoading}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Subir al Servidor
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Selected photos info */}
      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          {selectedImagesList.length} archivo
          {selectedImagesList.length !== 1 ? "s" : ""} seleccionado
          {selectedImagesList.length !== 1 ? "s" : ""} para subir
        </p>
      </div>

      {/* Error */}
      {albumError && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <div className="flex items-center justify-between">
            <p className="text-sm text-red-700 dark:text-red-400">
              {albumError}
            </p>
            <button onClick={clearError} className="text-red-500 text-sm">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Album selector */}
      {!uploadComplete && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Álbum de destino
            </label>
            <div className="flex gap-2">
              <select
                value={selectedAlbumId}
                onChange={(e) => setSelectedAlbumId(e.target.value)}
                className="flex-1 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Seleccionar álbum...</option>
                {albums.map((album: Album) => (
                  <option key={album.id} value={album.id}>
                    {album.name} — {album.photographer} (
                    {new Date(album.eventDate).toLocaleDateString("es-PA")})
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-3 py-2 text-sm text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-600 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 whitespace-nowrap"
              >
                + Nuevo
              </button>
            </div>
          </div>

          {/* Selected album info */}
          {selectedAlbum && (
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md text-sm">
              <p className="font-medium text-gray-900 dark:text-white">
                {selectedAlbum.name}
              </p>
              <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                {selectedAlbum.photographer} &middot;{" "}
                {[selectedAlbum.city, selectedAlbum.country]
                  .filter(Boolean)
                  .join(", ")}
                &middot; {selectedAlbum.photoCount} fotos existentes
              </p>
            </div>
          )}
        </>
      )}

      {/* Upload Progress */}
      {uploadProgress && !uploadComplete && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              {uploadProgress.stage === "compressing"
                ? "Comprimiendo"
                : uploadProgress.stage === "uploading"
                  ? "Subiendo"
                  : "Completado"}
              : {uploadProgress.fileName}
            </span>
            <span className="text-gray-800 dark:text-gray-200 font-medium">
              {uploadProgress.current}/{uploadProgress.total}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{
                width: `${(uploadProgress.current / uploadProgress.total) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Upload Complete */}
      {uploadComplete && uploadSummary && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md text-center">
          <p className="text-green-700 dark:text-green-400 font-medium">
            Subida completada
          </p>
          <p className="text-sm text-green-600 dark:text-green-500 mt-1">
            {uploadSummary.uploaded} de {uploadSummary.total} archivos subidos
            exitosamente
            {uploadSummary.failed > 0 && (
              <span className="text-red-500">
                {" "}
                ({uploadSummary.failed} fallaron)
              </span>
            )}
          </p>
          <button
            onClick={onClose}
            className="mt-3 px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Upload Button */}
      {!uploadComplete && (
        <button
          onClick={handleUpload}
          disabled={
            !selectedAlbumId || selectedImagesList.length === 0 || albumLoading
          }
          className="w-full px-4 py-3 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {albumLoading
            ? "Subiendo..."
            : `Subir ${selectedImagesList.length} Archivo${selectedImagesList.length !== 1 ? "s" : ""}`}
        </button>
      )}

      {/* Info */}
      {!uploadComplete && (
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
          Las fotos JPEG y PNG serán comprimidas antes de subir. Las fotos RAW y
          los videos MP4 se suben sin compresión. Se generarán thumbnails
          automáticamente.
        </p>
      )}
    </div>
  );
}

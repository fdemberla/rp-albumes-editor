"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useAlbumStore } from "@/lib/albumStore";
import type { AlbumFilter, AlbumCreateInput, Album } from "@/types/electron";
import AlbumForm from "./AlbumForm";
import AlbumDetail from "./AlbumDetail";
import AlbumSearchPanel from "./AlbumSearchPanel";
import { COLOR_TAGS } from "./ColorTagSelector";

export default function AlbumManager() {
  const {
    albums,
    totalAlbums,
    currentPage,
    totalPages,
    currentAlbum,
    loading,
    error,
    fetchAlbums,
    createAlbum,
    fetchAlbum,
    deleteAlbum,
    clearError,
  } = useAlbumStore();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filters, setFilters] = useState<AlbumFilter>({});
  // When true, the album detail will open with upload panel visible
  const [openWithUpload, setOpenWithUpload] = useState(false);

  // Fetch albums on mount
  useEffect(() => {
    fetchAlbums();
  }, [fetchAlbums]);

  const handleSearch = useCallback(() => {
    // Strip pagination when filters change so it resets to page 1
    const searchFilters = { ...filters };
    delete searchFilters.page;
    fetchAlbums(searchFilters);
  }, [filters, fetchAlbums]);

  // Search when filters change (debounced)
  useEffect(() => {
    const timeout = setTimeout(() => {
      handleSearch();
    }, 300);
    return () => clearTimeout(timeout);
  }, [handleSearch]);

  const handleCreate = async (input: AlbumCreateInput) => {
    const album = await createAlbum(input);
    if (album) {
      setShowCreateForm(false);
      return album;
    }
    return null;
  };

  /** Called after the post-create confirmation step */
  const handlePostCreate = async (albumId: string, wantsUpload: boolean) => {
    setShowCreateForm(false);
    setOpenWithUpload(wantsUpload);
    await fetchAlbum(albumId);
  };

  const handleDelete = async (albumId: string) => {
    const confirmed = window.confirm(
      "¿Estás seguro de que deseas eliminar este álbum? Se eliminarán todas las fotos del servidor.",
    );
    if (confirmed) {
      await deleteAlbum(albumId);
    }
  };

  const handlePageChange = (newPage: number) => {
    fetchAlbums({ ...filters, page: newPage });
  };

  // If viewing an album detail, render that instead
  if (currentAlbum) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="album-detail"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          <AlbumDetail
            initialShowUpload={openWithUpload}
            onUploadShown={() => setOpenWithUpload(false)}
          />
        </motion.div>
      </AnimatePresence>
    );
  }

  // If creating a new album, render the form
  if (showCreateForm) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="create-form"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 max-w-2xl mx-auto"
        >
          <AlbumForm
            onSave={handleCreate}
            onCancel={() => setShowCreateForm(false)}
            onPostCreate={handlePostCreate}
            loading={loading}
          />
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Álbumes
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {totalAlbums} álbum{totalAlbums !== 1 ? "es" : ""} en el servidor
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          + Nuevo Álbum
        </button>
      </div>

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

      {/* Search & Filters */}
      <AlbumSearchPanel
        filters={filters}
        onFiltersChange={setFilters}
        onClear={() => setFilters({})}
      />

      {/* Loading */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Cargando álbumes...
          </p>
        </div>
      )}

      {/* Album Grid */}
      {!loading && albums.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            No hay álbumes
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
            Crea un álbum para empezar a subir fotos al servidor.
          </p>
        </div>
      )}

      {!loading && albums.length > 0 && (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.07 } },
          }}
        >
          {albums.map((album) => (
            <motion.div
              key={album.id}
              variants={{
                hidden: { opacity: 0, y: 16 },
                visible: { opacity: 1, y: 0 },
              }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
              onClick={() => {
                useAlbumStore.getState().fetchAlbum(album.id);
              }}
            >
              {/* Album Card — Fading Slideshow */}
              <div className="relative">
                <AlbumCardPreview album={album} />
                {album.colorTags && album.colorTags.length > 0 && (
                  <div className="absolute top-2 right-2 flex gap-1 bg-black/40 backdrop-blur-sm rounded-full px-1.5 py-1">
                    {album.colorTags.map((tag) => {
                      const ct = COLOR_TAGS.find((c) => c.value === tag);
                      return ct ? (
                        <span
                          key={tag}
                          title={ct.label}
                          className={`w-3 h-3 rounded-full ${ct.bg} ring-1 ring-white/40`}
                        />
                      ) : null;
                    })}
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                  {album.name}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {album.fotografo
                    ? `${album.fotografo.firstName} ${album.fotografo.lastName}`
                    : album.photographer || "Sin fotógrafo"}{" "}
                  &middot;{" "}
                  {new Date(album.eventDate).toLocaleDateString("es-PA")}
                </p>
                {(album.city || album.country) && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {[album.city, album.country].filter(Boolean).join(", ")}
                  </p>
                )}
                {album.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {album.keywords.slice(0, 4).map((kw) => (
                      <span
                        key={kw}
                        className="px-1.5 py-0.5 text-[10px] rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                      >
                        {kw}
                      </span>
                    ))}
                    {album.keywords.length > 4 && (
                      <span className="text-[10px] text-gray-400">
                        +{album.keywords.length - 4}
                      </span>
                    )}
                  </div>
                )}
                {/* Delete button */}
                <div className="flex justify-end mt-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(album.id);
                    }}
                    className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="px-3 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Anterior
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Página {currentPage} de {totalPages}
          </span>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="px-3 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Album Card Slideshow Preview ─────────────────────────────────────

function AlbumCardPreview({ album }: { album: Album }) {
  const [images, setImages] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load thumbnails
  useEffect(() => {
    if (!album.previewThumbnails || album.previewThumbnails.length === 0) {
      setLoaded(true);
      return;
    }

    let cancelled = false;

    async function loadThumbs() {
      const results: string[] = [];
      for (const thumbPath of album.previewThumbnails) {
        if (cancelled) return;
        try {
          const res = await window.electronAPI.getAlbumThumbnail(thumbPath);
          if (res.success && res.data) {
            results.push(res.data);
          }
        } catch {
          // skip
        }
      }
      if (!cancelled) {
        setImages(results);
        setLoaded(true);
      }
    }

    loadThumbs();
    return () => {
      cancelled = true;
    };
  }, [album.previewThumbnails]);

  // Cycle through images
  useEffect(() => {
    if (images.length <= 1) return;

    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 3000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [images.length]);

  // No photos — show gradient placeholder
  if (loaded && images.length === 0) {
    return (
      <div className="h-36 bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
        <span className="text-4xl text-white/80">
          {album.photoCount > 0 ? `${album.photoCount}` : "0"}
        </span>
        <span className="text-sm text-white/60 ml-1 mt-2">fotos</span>
      </div>
    );
  }

  // Loading state
  if (!loaded) {
    return (
      <div className="h-36 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Slideshow
  return (
    <div className="relative h-36 bg-gray-900 overflow-hidden">
      <AnimatePresence mode="popLayout">
        <motion.img
          key={currentIndex}
          src={images[currentIndex]}
          alt={`${album.name} preview`}
          className="absolute inset-0 w-full h-full object-cover"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        />
      </AnimatePresence>

      {/* Photo count badge */}
      <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full backdrop-blur-sm">
        {album.photoCount} foto{album.photoCount !== 1 ? "s" : ""}
      </div>

      {/* Dot indicators */}
      {images.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
          {images.map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                i === currentIndex ? "bg-white" : "bg-white/40"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

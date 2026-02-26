"use client";

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import type { AlbumPhoto } from "@/types/electron";
import AlbumPhotoEditor from "./AlbumPhotoEditor";

interface PhotoViewerProps {
  photos: AlbumPhoto[];
  initialIndex: number;
  albumId: string;
  onClose: () => void;
  onSaved?: () => void;
}

export default function PhotoViewer({
  photos,
  initialIndex,
  albumId,
  onClose,
  onSaved,
}: PhotoViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [imageData, setImageData] = useState<string | null>(null);
  const [loadingImage, setLoadingImage] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [direction, setDirection] = useState(0); // -1 = prev, 1 = next
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

  const photo = photos[currentIndex];

  // Load thumbnails for the strip
  useEffect(() => {
    let cancelled = false;
    const loadThumbnails = async () => {
      const thumbs: Record<string, string> = {};
      for (const p of photos) {
        if (cancelled) break;
        if (p.thumbnailPath) {
          try {
            const result = await window.electronAPI.getAlbumThumbnail(p.thumbnailPath);
            if (result.success && result.data) {
              thumbs[p.id] = result.data;
            }
          } catch {
            // skip
          }
        }
      }
      if (!cancelled) setThumbnails(thumbs);
    };
    loadThumbnails();
    return () => { cancelled = true; };
  }, [photos]);

  // Load full-resolution image
  const loadImage = useCallback(async () => {
    if (!photo?.storedPath || !window.electronAPI) return;
    setLoadingImage(true);
    try {
      const result = await window.electronAPI.getAlbumPhoto(photo.storedPath);
      if (result.success && result.data) {
        setImageData(result.data);
      } else {
        setImageData(null);
      }
    } catch {
      setImageData(null);
    } finally {
      setLoadingImage(false);
    }
  }, [photo?.storedPath]);

  useEffect(() => {
    loadImage();
  }, [loadImage]);

  const goTo = useCallback(
    (index: number) => {
      if (index < 0 || index >= photos.length) return;
      setDirection(index > currentIndex ? 1 : -1);
      setCurrentIndex(index);
      setImageData(null);
    },
    [currentIndex, photos.length],
  );

  const goPrev = useCallback(
    () => goTo(currentIndex - 1),
    [currentIndex, goTo],
  );
  const goNext = useCallback(
    () => goTo(currentIndex + 1),
    [currentIndex, goTo],
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "e" || e.key === "E") setShowEditor((v) => !v);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, goPrev, goNext]);

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex bg-black/95"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/70 to-transparent">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-md transition-colors"
            title="Cerrar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="text-white/90">
            <p className="text-sm font-medium truncate max-w-md">
              {photo.originalFilename}
            </p>
            <p className="text-xs text-white/50">
              {currentIndex + 1} / {photos.length}
              {photo.width && photo.height && (
                <span className="ml-2">
                  {photo.width} × {photo.height}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEditor((v) => !v)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              showEditor
                ? "bg-blue-600 text-white"
                : "bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
            }`}
            title="Editar metadatos (E)"
          >
            {showEditor ? "Cerrar Editor" : "Editar Metadatos"}
          </button>
        </div>
      </div>

      {/* Main image area */}
      <div
        className={`flex-1 flex items-center justify-center relative ${showEditor ? "mr-96" : ""} transition-[margin] duration-300`}
      >
        {/* Prev button */}
        {currentIndex > 0 && (
          <button
            onClick={goPrev}
            className="absolute left-3 z-10 p-2 rounded-full bg-black/40 text-white/80 hover:bg-black/60 hover:text-white transition-colors"
            title="Anterior (←)"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Image */}
        <div className="w-full h-full flex items-center justify-center p-12">
          {loadingImage ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-white/50">Cargando imagen...</p>
            </div>
          ) : imageData ? (
            <AnimatePresence mode="wait" custom={direction}>
              <motion.img
                key={photo.id}
                src={imageData}
                alt={photo.title || photo.originalFilename}
                className="max-w-full max-h-full object-contain select-none"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: "easeOut" }}
                draggable={false}
              />
            </AnimatePresence>
          ) : null}
        </div>

        {/* Next button */}
        {currentIndex < photos.length - 1 && (
          <button
            onClick={goNext}
            className="absolute right-3 z-10 p-2 rounded-full bg-black/40 text-white/80 hover:bg-black/60 hover:text-white transition-colors"
            title="Siguiente (→)"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {/* Bottom thumbnail strip */}
        {photos.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent pt-6 pb-3 px-4">
            <div className="flex justify-center gap-1.5 overflow-x-auto max-w-full scrollbar-thin">
              {photos.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => goTo(i)}
                  className={`flex-shrink-0 w-12 h-12 rounded overflow-hidden border-2 transition-all ${
                    i === currentIndex
                      ? "border-white ring-1 ring-white/50 scale-110"
                      : "border-transparent opacity-50 hover:opacity-80"
                  }`}
                >
                  {thumbnails[p.id] ? (
                    <img
                      src={thumbnails[p.id]}
                      alt={p.originalFilename}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                      <span className="text-[8px] text-gray-400">{i + 1}</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Editor Sidebar */}
      <AnimatePresence>
        {showEditor && (
          <motion.div
            initial={{ x: 384, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 384, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed top-0 right-0 h-full w-96 bg-white dark:bg-gray-800 shadow-2xl overflow-y-auto z-20"
          >
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Metadatos
              </h3>
              <button
                onClick={() => setShowEditor(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                &times;
              </button>
            </div>
            <div className="p-4">
              <AlbumPhotoEditor
                key={photo.id}
                photos={[photo]}
                albumId={albumId}
                onSaved={onSaved}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

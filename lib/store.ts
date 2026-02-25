import { create } from "zustand";
import { ImageMetadata } from "@/types/electron";

export interface ImageWithMetadata {
  id: string;
  filePath: string;
  preview?: string;
  metadata: ImageMetadata;
  selected: boolean;
}

interface ImageStore {
  images: ImageWithMetadata[];
  selectedImages: string[];
  loading: boolean;
  error: string | null;

  // Actions
  addImages: (images: ImageWithMetadata[]) => void;
  removeImage: (id: string) => void;
  clearImages: () => void;
  updateImageMetadata: (id: string, metadata: Partial<ImageMetadata>) => void;
  toggleImageSelection: (id: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  getSelectedImages: () => ImageWithMetadata[];
}

export const useImageStore = create<ImageStore>((set, get) => ({
  images: [],
  selectedImages: [],
  loading: false,
  error: null,

  addImages: (newImages) =>
    set((state) => ({
      images: [...state.images, ...newImages],
    })),

  removeImage: (id) =>
    set((state) => ({
      images: state.images.filter((img) => img.id !== id),
      selectedImages: state.selectedImages.filter((imgId) => imgId !== id),
    })),

  clearImages: () =>
    set({
      images: [],
      selectedImages: [],
    }),

  updateImageMetadata: (id, metadata) =>
    set((state) => ({
      images: state.images.map((img) =>
        img.id === id
          ? { ...img, metadata: { ...img.metadata, ...metadata } }
          : img
      ),
    })),

  toggleImageSelection: (id) =>
    set((state) => {
      const isSelected = state.selectedImages.includes(id);
      return {
        selectedImages: isSelected
          ? state.selectedImages.filter((imgId) => imgId !== id)
          : [...state.selectedImages, id],
        images: state.images.map((img) =>
          img.id === id ? { ...img, selected: !img.selected } : img
        ),
      };
    }),

  selectAll: () =>
    set((state) => ({
      selectedImages: state.images.map((img) => img.id),
      images: state.images.map((img) => ({ ...img, selected: true })),
    })),

  deselectAll: () =>
    set((state) => ({
      selectedImages: [],
      images: state.images.map((img) => ({ ...img, selected: false })),
    })),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  getSelectedImages: () => {
    const state = get();
    return state.images.filter((img) => state.selectedImages.includes(img.id));
  },
}));

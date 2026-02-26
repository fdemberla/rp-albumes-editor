import { create } from "zustand";
import type {
  Album,
  AlbumPhoto,
  AlbumCreateInput,
  AlbumUpdateInput,
  AlbumFilter,
  UploadPhotoInput,
  UploadProgress,
  ConnectionTestResult,
} from "@/types/electron";

interface AlbumStore {
  // ─── State ──────────────────────────────────────────────────────────────
  albums: Album[];
  totalAlbums: number;
  currentPage: number;
  totalPages: number;
  currentAlbum: (Album & { photos: AlbumPhoto[] }) | null;
  loading: boolean;
  error: string | null;
  uploadProgress: UploadProgress | null;
  dbConnected: boolean | null;
  sftpConnected: boolean | null;
  currentFilters: AlbumFilter | null;

  // ─── Actions ────────────────────────────────────────────────────────────

  // Connection tests
  testDbConnection: () => Promise<ConnectionTestResult>;
  testSftpConnection: () => Promise<ConnectionTestResult>;
  testAllConnections: () => Promise<void>;

  // Album CRUD
  fetchAlbums: (filters?: AlbumFilter) => Promise<void>;
  createAlbum: (input: AlbumCreateInput) => Promise<Album | null>;
  fetchAlbum: (albumId: string) => Promise<void>;
  updateAlbum: (
    albumId: string,
    input: AlbumUpdateInput,
  ) => Promise<Album | null>;
  deleteAlbum: (albumId: string) => Promise<boolean>;

  // Photo operations
  uploadPhotos: (
    albumId: string,
    photos: UploadPhotoInput[],
  ) => Promise<boolean>;
  removePhotos: (albumId: string, photoIds: string[]) => Promise<boolean>;

  // UI state
  setCurrentAlbum: (album: (Album & { photos: AlbumPhoto[] }) | null) => void;
  clearError: () => void;
  setUploadProgress: (progress: UploadProgress | null) => void;
}

export const useAlbumStore = create<AlbumStore>((set, get) => ({
  // ─── Initial State ────────────────────────────────────────────────────
  albums: [],
  totalAlbums: 0,
  currentPage: 1,
  totalPages: 1,
  currentAlbum: null,
  loading: false,
  error: null,
  uploadProgress: null,
  dbConnected: null,
  sftpConnected: null,
  currentFilters: null,

  // ─── Connection Tests ─────────────────────────────────────────────────

  testDbConnection: async () => {
    try {
      const result = await window.electronAPI.testDbConnection();
      set({ dbConnected: result.success });
      return result;
    } catch (err) {
      set({ dbConnected: false });
      return {
        success: false,
        message: err instanceof Error ? err.message : String(err),
      };
    }
  },

  testSftpConnection: async () => {
    try {
      const result = await window.electronAPI.testSftpConnection();
      set({ sftpConnected: result.success });
      return result;
    } catch (err) {
      set({ sftpConnected: false });
      return {
        success: false,
        message: err instanceof Error ? err.message : String(err),
      };
    }
  },

  testAllConnections: async () => {
    const store = get();
    await Promise.all([store.testDbConnection(), store.testSftpConnection()]);
  },

  // ─── Album CRUD ───────────────────────────────────────────────────────

  fetchAlbums: async (filters) => {
    set({ loading: true, error: null, currentFilters: filters || null });
    try {
      const result = await window.electronAPI.listAlbums(filters);
      if (result.success) {
        set({
          albums: result.albums || [],
          totalAlbums: result.total || 0,
          currentPage: result.page || 1,
          totalPages: result.totalPages || 1,
          loading: false,
        });
      } else {
        set({ error: result.error || "Error fetching albums", loading: false });
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : String(err),
        loading: false,
      });
    }
  },

  createAlbum: async (input) => {
    set({ loading: true, error: null });
    try {
      const result = await window.electronAPI.createAlbum(input);
      if (result.success && result.album) {
        // Refresh album list
        await get().fetchAlbums(get().currentFilters || undefined);
        set({ loading: false });
        return result.album;
      } else {
        set({
          error: result.error || "Error creating album",
          loading: false,
        });
        return null;
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : String(err),
        loading: false,
      });
      return null;
    }
  },

  fetchAlbum: async (albumId) => {
    set({ loading: true, error: null });
    try {
      const result = await window.electronAPI.getAlbum(albumId);
      if (result.success && result.album) {
        set({ currentAlbum: result.album, loading: false });
      } else {
        set({
          error: result.error || "Album not found",
          loading: false,
        });
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : String(err),
        loading: false,
      });
    }
  },

  updateAlbum: async (albumId, input) => {
    set({ loading: true, error: null });
    try {
      const result = await window.electronAPI.updateAlbum(albumId, input);
      if (result.success && result.album) {
        // Refresh current album if it's the one being edited
        const current = get().currentAlbum;
        if (current && current.id === albumId) {
          set({
            currentAlbum: { ...current, ...result.album },
            loading: false,
          });
        } else {
          set({ loading: false });
        }
        // Refresh album list
        await get().fetchAlbums(get().currentFilters || undefined);
        return result.album;
      } else {
        set({
          error: result.error || "Error updating album",
          loading: false,
        });
        return null;
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : String(err),
        loading: false,
      });
      return null;
    }
  },

  deleteAlbum: async (albumId) => {
    set({ loading: true, error: null });
    try {
      const result = await window.electronAPI.deleteAlbum(albumId);
      if (result.success) {
        // Clear current album if it was the deleted one
        const current = get().currentAlbum;
        if (current && current.id === albumId) {
          set({ currentAlbum: null });
        }
        // Refresh album list
        await get().fetchAlbums(get().currentFilters || undefined);
        set({ loading: false });
        return true;
      } else {
        set({
          error: result.error || "Error deleting album",
          loading: false,
        });
        return false;
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : String(err),
        loading: false,
      });
      return false;
    }
  },

  // ─── Photo Operations ─────────────────────────────────────────────────

  uploadPhotos: async (albumId, photos) => {
    set({ loading: true, error: null, uploadProgress: null });

    // Register progress listener
    const cleanup = window.electronAPI.onUploadProgress((progress) => {
      set({ uploadProgress: progress });
    });

    try {
      const result = await window.electronAPI.uploadPhotosToAlbum(
        albumId,
        photos,
      );

      cleanup(); // Remove listener

      if (result.success) {
        // Refresh the current album to show new photos
        await get().fetchAlbum(albumId);
        // Also refresh the album list to update photo counts
        await get().fetchAlbums();
        set({ loading: false, uploadProgress: null });
        return true;
      } else {
        set({
          error: result.error || "Error uploading photos",
          loading: false,
          uploadProgress: null,
        });
        return false;
      }
    } catch (err) {
      cleanup();
      set({
        error: err instanceof Error ? err.message : String(err),
        loading: false,
        uploadProgress: null,
      });
      return false;
    }
  },

  removePhotos: async (albumId, photoIds) => {
    set({ loading: true, error: null });
    try {
      const result = await window.electronAPI.removePhotosFromAlbum(
        albumId,
        photoIds,
      );
      if (result.success) {
        // Refresh album detail
        await get().fetchAlbum(albumId);
        await get().fetchAlbums();
        set({ loading: false });
        return true;
      } else {
        set({
          error: result.error || "Error removing photos",
          loading: false,
        });
        return false;
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : String(err),
        loading: false,
      });
      return false;
    }
  },

  // ─── UI State ─────────────────────────────────────────────────────────

  setCurrentAlbum: (album) => set({ currentAlbum: album }),
  clearError: () => set({ error: null }),
  setUploadProgress: (progress) => set({ uploadProgress: progress }),
}));

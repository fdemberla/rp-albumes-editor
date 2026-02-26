// ─── Auth & User Types ────────────────────────────────────────────────────────

export type Role = "ADMIN" | "USER";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
  fotografo?: Fotografo | null;
}

export interface Fotografo {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; email: string; role: Role } | null;
}

export interface AuthSession {
  success: boolean;
  user?: User;
  fotografo?: Fotografo | null;
  error?: string;
}

export interface UserCreateInput {
  email: string;
  firstName: string;
  lastName: string;
  role?: Role;
}

export type UserUpdateInput = Partial<UserCreateInput>;

export interface FotografoCreateInput {
  firstName: string;
  lastName: string;
  email?: string;
  userId?: string;
}

export type FotografoUpdateInput = Partial<FotografoCreateInput>;

// ─── Image Metadata Types ─────────────────────────────────────────────────────

export interface ImageMetadata {
  fileName: string;
  filePath: string;
  fileSize?: string;
  imageWidth?: number;
  imageHeight?: number;
  title: string;
  description: string;
  keywords: string[];
  copyright: string;
  artist: string;
  dateCreated?: string;
  location: {
    city: string;
    state: string;
    country: string;
    gpsLatitude?: string;
    gpsLongitude?: string;
  };
  camera?: {
    make: string;
    model: string;
  };
}

export interface MetadataUpdate {
  filePath: string;
  metadata: Partial<ImageMetadata>;
}

export interface RenameOperation {
  oldPath: string;
  newPath: string;
}

export interface BulkImageOperation {
  filePath: string;
  newName: string;
  metadata: Partial<ImageMetadata>;
  outputFolder: string | null;
  operation: "copy" | "move";
}

// ─── Album Types ──────────────────────────────────────────────────────────

export interface Album {
  id: string;
  name: string;
  description: string | null;
  photographer: string | null; // Legacy — will be removed after data migration
  photographerId: string | null;
  fotografo: Fotografo | null;
  eventDate: string; // ISO date string
  city: string | null;
  state: string | null;
  country: string | null;
  keywords: string[];
  createdAt: string;
  updatedAt: string;
  photoCount: number;
  previewThumbnails: string[];
}

export interface AlbumPhoto {
  id: string;
  albumId: string;
  originalFilename: string;
  storedFilename: string;
  storedPath: string;
  thumbnailPath: string | null;
  fileSize: number;
  width: number | null;
  height: number | null;
  title: string | null;
  description: string | null;
  keywords: string[];
  copyright: string | null;
  artist: string | null;
  dateCreated: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  gpsLatitude: number | null;
  gpsLongitude: number | null;
  cameraMake: string | null;
  cameraModel: string | null;
  createdAt: string;
}

export interface AlbumCreateInput {
  name: string;
  description?: string;
  photographer?: string; // Legacy text field
  photographerId?: string; // FK to Fotografo
  eventDate: string; // ISO date string (YYYY-MM-DD)
  city?: string;
  state?: string;
  country?: string;
  keywords?: string[];
}

export type AlbumUpdateInput = Partial<AlbumCreateInput>;

export interface AlbumFilter {
  name?: string;
  photographer?: string; // text search (legacy + fotografo name)
  photographerId?: string; // exact FK filter
  city?: string;
  state?: string;
  country?: string;
  dateFrom?: string; // ISO date string
  dateTo?: string; // ISO date string
  keywords?: string[];
  sortBy?: "eventDate" | "name" | "createdAt";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface AlbumListResult {
  success: boolean;
  albums?: Album[];
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  error?: string;
}

export interface UploadPhotoInput {
  filePath: string;
  metadata: Partial<ImageMetadata>;
}

export interface UploadProgress {
  current: number;
  total: number;
  fileName: string;
  stage: "compressing" | "uploading" | "complete";
}

export interface DownloadProgress {
  current: number;
  total: number;
  fileName: string;
  stage: "downloading" | "saving" | "zipping" | "complete";
}

export interface UploadResult {
  success: boolean;
  results?: Array<{
    success: boolean;
    originalFile: string;
    photoId?: string;
    storedPath?: string;
    compressedSize?: number;
    error?: string;
  }>;
  summary?: {
    total: number;
    uploaded: number;
    failed: number;
  };
  error?: string;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
}

// ─── Electron API ─────────────────────────────────────────────────────────

export interface ElectronAPI {
  // ─── Auth Operations ───────────────────────────────────────────────────
  login: () => Promise<AuthSession>;
  logout: () => Promise<{ success: boolean; error?: string }>;
  getSession: () => Promise<AuthSession>;

  // ─── User Management (admin) ──────────────────────────────────────────
  listUsers: () => Promise<{
    success: boolean;
    users?: User[];
    error?: string;
  }>;
  createUser: (input: UserCreateInput) => Promise<{
    success: boolean;
    user?: User;
    error?: string;
  }>;
  updateUser: (
    userId: string,
    input: UserUpdateInput,
  ) => Promise<{ success: boolean; user?: User; error?: string }>;
  deleteUser: (userId: string) => Promise<{ success: boolean; error?: string }>;

  // ─── Fotografo Operations ─────────────────────────────────────────────
  listFotografos: (search?: string) => Promise<{
    success: boolean;
    fotografos?: Fotografo[];
    error?: string;
  }>;
  createFotografo: (input: FotografoCreateInput) => Promise<{
    success: boolean;
    fotografo?: Fotografo;
    error?: string;
  }>;
  updateFotografo: (
    fotografoId: string,
    input: FotografoUpdateInput,
  ) => Promise<{ success: boolean; fotografo?: Fotografo; error?: string }>;
  deleteFotografo: (
    fotografoId: string,
  ) => Promise<{ success: boolean; error?: string }>;
  getFotografoByEmail: (email: string) => Promise<{
    success: boolean;
    fotografo?: Fotografo | null;
    error?: string;
  }>;

  // Dialog operations
  openFiles: () => Promise<{ canceled: boolean; files: string[] }>;
  openFolder: () => Promise<{ canceled: boolean; folder: string | null }>;

  // Image metadata operations
  readMetadata: (filePath: string) => Promise<{
    success: boolean;
    metadata?: ImageMetadata;
    error?: string;
  }>;
  readBulkMetadata: (filePaths: string[]) => Promise<
    Array<{
      success: boolean;
      filePath: string;
      metadata?: ImageMetadata;
      error?: string;
    }>
  >;
  writeMetadata: (
    filePath: string,
    metadata: Partial<ImageMetadata>,
  ) => Promise<{
    success: boolean;
    error?: string;
  }>;
  writeBulkMetadata: (updates: MetadataUpdate[]) => Promise<
    Array<{
      success: boolean;
      filePath: string;
      error?: string;
    }>
  >;

  // File operations
  renameFile: (
    oldPath: string,
    newPath: string,
  ) => Promise<{
    success: boolean;
    newPath?: string;
    error?: string;
  }>;
  bulkRenameFiles: (renames: RenameOperation[]) => Promise<
    Array<{
      success: boolean;
      oldPath: string;
      newPath?: string;
      error?: string;
    }>
  >;

  // Bulk image processing (copy/move with metadata and rename)
  processBulkImages: (operations: BulkImageOperation[]) => Promise<
    Array<{
      success: boolean;
      oldPath: string;
      newPath?: string;
      error?: string;
    }>
  >;

  // Image preview
  getImagePreview: (filePath: string) => Promise<{
    success: boolean;
    data?: string;
    error?: string;
  }>;

  // Folder operations
  listImagesInFolder: (folderPath: string) => Promise<{
    success: boolean;
    files?: string[];
    error?: string;
  }>;

  // ─── Connection Tests ──────────────────────────────────────────────────
  testDbConnection: () => Promise<ConnectionTestResult>;
  testSftpConnection: () => Promise<ConnectionTestResult>;

  // ─── Album Operations ─────────────────────────────────────────────────
  createAlbum: (
    input: AlbumCreateInput,
  ) => Promise<{ success: boolean; album?: Album; error?: string }>;
  listAlbums: (filters?: AlbumFilter) => Promise<AlbumListResult>;
  getAlbum: (albumId: string) => Promise<{
    success: boolean;
    album?: Album & { photos: AlbumPhoto[] };
    error?: string;
  }>;
  updateAlbum: (
    albumId: string,
    input: AlbumUpdateInput,
  ) => Promise<{ success: boolean; album?: Album; error?: string }>;
  deleteAlbum: (
    albumId: string,
  ) => Promise<{ success: boolean; error?: string }>;

  // ─── Album Photo Operations ───────────────────────────────────────────
  uploadPhotosToAlbum: (
    albumId: string,
    photos: UploadPhotoInput[],
  ) => Promise<UploadResult>;
  removePhotosFromAlbum: (
    albumId: string,
    photoIds: string[],
  ) => Promise<{ success: boolean; deletedCount?: number; error?: string }>;
  getAlbumPhoto: (storedPath: string) => Promise<{
    success: boolean;
    data?: string;
    error?: string;
  }>;
  getAlbumThumbnail: (thumbnailPath: string) => Promise<{
    success: boolean;
    data?: string;
    error?: string;
  }>;

  // ─── Photo Metadata Editing ────────────────────────────────────────
  updatePhotoMetadata: (
    albumId: string,
    photoIds: string[],
    metadata: Record<string, unknown>,
  ) => Promise<{ success: boolean; updatedCount?: number; error?: string }>;

  // ─── Photo Download ───────────────────────────────────────────────
  downloadPhotos: (
    photos: Array<{ storedPath: string; originalFilename: string }>,
  ) => Promise<{
    success: boolean;
    savedPath?: string;
    photoCount?: number;
    error?: string;
  }>;

  // ─── Upload Progress ──────────────────────────────────────────────────
  onUploadProgress: (
    callback: (progress: UploadProgress) => void,
  ) => () => void;

  // ─── Download Progress ─────────────────────────────────────────────────
  onDownloadProgress: (
    callback: (progress: DownloadProgress) => void,
  ) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};

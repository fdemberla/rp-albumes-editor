const { contextBridge, ipcRenderer } = require("electron");

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electronAPI", {
  // ─── Auth Operations ──────────────────────────────────────────────────
  login: () => ipcRenderer.invoke("auth:login"),
  logout: () => ipcRenderer.invoke("auth:logout"),
  getSession: () => ipcRenderer.invoke("auth:getSession"),

  // ─── User Management (admin) ──────────────────────────────────────────
  listUsers: () => ipcRenderer.invoke("user:list"),
  createUser: (input) => ipcRenderer.invoke("user:create", input),
  updateUser: (userId, input) =>
    ipcRenderer.invoke("user:update", userId, input),
  deleteUser: (userId) => ipcRenderer.invoke("user:delete", userId),

  // ─── Fotografo Operations ─────────────────────────────────────────────
  listFotografos: (search) => ipcRenderer.invoke("fotografo:list", search),
  createFotografo: (input) => ipcRenderer.invoke("fotografo:create", input),
  updateFotografo: (fotografoId, input) =>
    ipcRenderer.invoke("fotografo:update", fotografoId, input),
  deleteFotografo: (fotografoId) =>
    ipcRenderer.invoke("fotografo:delete", fotografoId),
  getFotografoByEmail: (email) =>
    ipcRenderer.invoke("fotografo:getByEmail", email),

  // Dialog operations
  openFiles: () => ipcRenderer.invoke("dialog:openFiles"),
  openFolder: () => ipcRenderer.invoke("dialog:openFolder"),

  // Image metadata operations
  readMetadata: (filePath) =>
    ipcRenderer.invoke("image:readMetadata", filePath),
  readBulkMetadata: (filePaths) =>
    ipcRenderer.invoke("image:readBulkMetadata", filePaths),
  writeMetadata: (filePath, metadata) =>
    ipcRenderer.invoke("image:writeMetadata", filePath, metadata),
  writeBulkMetadata: (updates) =>
    ipcRenderer.invoke("image:writeBulkMetadata", updates),

  // File operations
  renameFile: (oldPath, newPath) =>
    ipcRenderer.invoke("file:rename", oldPath, newPath),
  bulkRenameFiles: (renames) => ipcRenderer.invoke("file:bulkRename", renames),

  // Bulk image processing (copy/move with metadata and rename)
  processBulkImages: (operations) =>
    ipcRenderer.invoke("image:processBulkImages", operations),

  // Image preview
  getImagePreview: (filePath) =>
    ipcRenderer.invoke("image:getPreview", filePath),

  // Folder operations
  listImagesInFolder: (folderPath) =>
    ipcRenderer.invoke("folder:listImages", folderPath),

  // ─── Connection Tests ──────────────────────────────────────────────────
  testDbConnection: () => ipcRenderer.invoke("db:testConnection"),
  testSftpConnection: () => ipcRenderer.invoke("sftp:testConnection"),

  // ─── Album Operations ─────────────────────────────────────────────────
  createAlbum: (input) => ipcRenderer.invoke("album:create", input),
  listAlbums: (filters) => ipcRenderer.invoke("album:list", filters),
  getAlbum: (albumId) => ipcRenderer.invoke("album:get", albumId),
  updateAlbum: (albumId, input) =>
    ipcRenderer.invoke("album:update", albumId, input),
  deleteAlbum: (albumId) => ipcRenderer.invoke("album:delete", albumId),

  // ─── Album Photo Operations ───────────────────────────────────────────
  uploadPhotosToAlbum: (albumId, photos) =>
    ipcRenderer.invoke("album:uploadPhotos", albumId, photos),
  removePhotosFromAlbum: (albumId, photoIds) =>
    ipcRenderer.invoke("album:removePhotos", albumId, photoIds),
  getAlbumPhoto: (storedPath) =>
    ipcRenderer.invoke("album:getPhoto", storedPath),
  getAlbumThumbnail: (thumbnailPath) =>
    ipcRenderer.invoke("album:getThumbnail", thumbnailPath),

  // ─── Read EXIF from stored photo ─────────────────────────────────────────
  readPhotoExif: (storedPath) =>
    ipcRenderer.invoke("album:readPhotoExif", storedPath),

  // ─── Photo Metadata Editing ────────────────────────────────────────────
  updatePhotoMetadata: (albumId, photoIds, metadata) =>
    ipcRenderer.invoke(
      "album:updatePhotoMetadata",
      albumId,
      photoIds,
      metadata,
    ),

  // ─── Photo Download ───────────────────────────────────────────────────
  downloadPhotos: (photos) =>
    ipcRenderer.invoke("album:downloadPhotos", photos),

  // ─── Download Progress Listener ────────────────────────────────────────
  onDownloadProgress: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on("album:downloadProgress", handler);
    return () => ipcRenderer.removeListener("album:downloadProgress", handler);
  },

  // ─── Upload Progress Listener ─────────────────────────────────────────
  onUploadProgress: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on("album:uploadProgress", handler);
    // Return cleanup function
    return () => ipcRenderer.removeListener("album:uploadProgress", handler);
  },
});

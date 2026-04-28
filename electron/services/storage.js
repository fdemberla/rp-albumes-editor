const SftpClient = require("ssh2-sftp-client");
const path = require("path");

// Use path.posix for all remote paths (Linux server)
const posix = path.posix;

let client = null;
let isConnected = false;
let connectingPromise = null; // Mutex: prevents concurrent reconnection attempts

/**
 * Get SFTP configuration from environment variables.
 */
function getConfig() {
  return {
    host: process.env.SFTP_HOST,
    port: parseInt(process.env.SFTP_PORT || "22", 10),
    username: process.env.SFTP_USER,
    password: process.env.SFTP_PASSWORD,
  };
}

/**
 * Get the remote base path from environment.
 */
function getBasePath() {
  return process.env.SFTP_BASE_PATH || "/fotos";
}

/**
 * Validate that a path segment does not contain path traversal attempts.
 * @param {string} segment
 * @returns {boolean}
 */
function isPathSafe(segment) {
  if (!segment || typeof segment !== "string") return false;
  // Block path traversal, null bytes, and absolute paths
  if (segment.includes("..") || segment.includes("\0")) return false;
  if (segment.startsWith("/") || segment.startsWith("\\")) return false;
  return true;
}

/**
 * Build a safe remote path from segments, anchored to SFTP_BASE_PATH.
 * @param  {...string} segments
 * @returns {string}
 */
function buildRemotePath(...segments) {
  const basePath = getBasePath();
  for (const seg of segments) {
    if (!isPathSafe(seg)) {
      throw new Error(`Unsafe path segment rejected: "${seg}"`);
    }
  }
  return posix.join(basePath, ...segments);
}

/**
 * Connect to the SFTP server. Reuses existing connection if active.
 * A mutex (connectingPromise) prevents concurrent reconnection races.
 */
async function connect() {
  if (isConnected && client) return;

  // If a connection attempt is already in progress, wait for it
  if (connectingPromise) {
    return connectingPromise;
  }

  connectingPromise = (async () => {
    // Clean up any stale client
    if (client) {
      try { await client.end(); } catch {}
      client = null;
      isConnected = false;
    }

    const config = getConfig();
    if (!config.host || !config.username) {
      throw new Error(
        "SFTP configuration missing. Check SFTP_HOST, SFTP_USER, SFTP_PASSWORD in .env",
      );
    }

    const newClient = new SftpClient();
    await newClient.connect(config);

    // Reset state automatically when the connection closes or errors
    newClient.on("close", () => { isConnected = false; client = null; });
    newClient.on("error", () => { isConnected = false; client = null; });

    // Raise the listener limit on the underlying SSH2 Client to accommodate
    // concurrent SFTP channel operations without spurious warnings
    if (newClient.client) {
      newClient.client.setMaxListeners(30);
    }

    client = newClient;
    isConnected = true;
    console.log(`[SFTP] Connected to ${config.host}:${config.port}`);
  })().finally(() => {
    connectingPromise = null;
  });

  return connectingPromise;
}

/**
 * Disconnect from the SFTP server.
 */
async function disconnect() {
  if (client) {
    try {
      await client.end();
    } catch (err) {
      console.error("[SFTP] Error during disconnect:", err.message);
    }
    client = null;
    isConnected = false;
    console.log("[SFTP] Disconnected");
  }
}

/**
 * Ensure a remote directory exists, creating it recursively if needed.
 * @param {string} remotePath
 */
async function ensureDir(remotePath) {
  await connect();
  await client.mkdir(remotePath, true);
}

/**
 * Compute the storage directory for an album based on a date.
 * Structure: /<basePath>/<year>/<month>/<albumId>/
 * @param {string} albumId
 * @param {Date} [date]
 * @returns {string}
 */
function getAlbumDir(albumId, date) {
  const d = date || new Date();
  const year = String(d.getFullYear());
  const month = String(d.getMonth() + 1).padStart(2, "0");
  if (!isPathSafe(albumId)) {
    throw new Error(`Unsafe albumId: "${albumId}"`);
  }
  return buildRemotePath(year, month, albumId);
}

/**
 * Upload a photo buffer to the SFTP server.
 * @param {string} albumId
 * @param {string} fileName
 * @param {Buffer} buffer
 * @param {Date} [date] - Album date for folder structure
 * @returns {Promise<string>} - The stored path relative to SFTP_BASE_PATH
 */
async function uploadPhoto(albumId, fileName, buffer, date) {
  if (!isPathSafe(fileName)) {
    throw new Error(`Unsafe fileName: "${fileName}"`);
  }

  await connect();

  const albumDir = getAlbumDir(albumId, date);
  await ensureDir(albumDir);

  const remotePath = posix.join(albumDir, fileName);
  await client.put(buffer, remotePath);

  // Return path relative to base
  const basePath = getBasePath();
  return remotePath.slice(basePath.length + 1);
}

/**
 * Upload a thumbnail buffer to the SFTP server.
 * @param {string} albumId
 * @param {string} fileName
 * @param {Buffer} buffer
 * @param {Date} [date]
 * @returns {Promise<string>} - The stored path relative to SFTP_BASE_PATH
 */
async function uploadThumbnail(albumId, fileName, buffer, date) {
  if (!isPathSafe(fileName)) {
    throw new Error(`Unsafe fileName: "${fileName}"`);
  }

  await connect();

  const albumDir = getAlbumDir(albumId, date);
  const thumbDir = posix.join(albumDir, "thumbs");
  await ensureDir(thumbDir);

  const remotePath = posix.join(thumbDir, fileName);
  await client.put(buffer, remotePath);

  const basePath = getBasePath();
  return remotePath.slice(basePath.length + 1);
}

/**
 * Download a file from the SFTP server as a Buffer.
 * @param {string} relativePath - Path relative to SFTP_BASE_PATH
 * @returns {Promise<Buffer>}
 */
async function downloadFile(relativePath) {
  if (
    !relativePath ||
    relativePath.includes("..") ||
    relativePath.includes("\0")
  ) {
    throw new Error(`Unsafe path: "${relativePath}"`);
  }

  await connect();

  const basePath = getBasePath();
  const remotePath = posix.join(basePath, relativePath);
  return await client.get(remotePath);
}

/**
 * Delete a single file from the SFTP server.
 * @param {string} relativePath - Path relative to SFTP_BASE_PATH
 */
async function deleteFile(relativePath) {
  if (
    !relativePath ||
    relativePath.includes("..") ||
    relativePath.includes("\0")
  ) {
    throw new Error(`Unsafe path: "${relativePath}"`);
  }

  await connect();

  const basePath = getBasePath();
  const remotePath = posix.join(basePath, relativePath);
  await client.delete(remotePath);
}

/**
 * Delete an album's entire directory from the SFTP server (including all photos).
 * @param {string} albumId
 * @param {Date} [date] - Album date to locate the correct folder
 */
async function deleteAlbumDir(albumId, date) {
  await connect();

  const albumDir = getAlbumDir(albumId, date);
  try {
    await client.rmdir(albumDir, true);
    console.log(`[SFTP] Deleted album directory: ${albumDir}`);
  } catch (err) {
    // Directory may not exist if no photos were ever uploaded
    if (err.code !== 2) {
      // code 2 = No such file
      throw err;
    }
    console.log(
      `[SFTP] Album directory not found (already deleted): ${albumDir}`,
    );
  }
}

/**
 * Test the SFTP connection by connecting and listing the base path.
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function testConnection() {
  try {
    await connect();
    const basePath = getBasePath();
    await client.list(basePath);
    return { success: true, message: `Connected to ${process.env.SFTP_HOST}` };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

module.exports = {
  connect,
  disconnect,
  uploadPhoto,
  uploadThumbnail,
  downloadFile,
  deleteFile,
  deleteAlbumDir,
  testConnection,
  getAlbumDir,
};

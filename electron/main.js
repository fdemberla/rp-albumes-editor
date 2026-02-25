// Load environment variables before anything else
require("dotenv").config();

const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs").promises;
const { exiftool } = require("exiftool-vendored");
const {
  registerAlbumHandlers,
  cleanup: albumCleanup,
} = require("./handlers/albums");

let mainWindow;
const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
    icon: path.join(__dirname, "../public/icon.png"),
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:3000");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../out/index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();
  registerAlbumHandlers();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    exiftool.end(); // Clean up exiftool process
    albumCleanup().catch((err) => console.error("Album cleanup error:", err));
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handlers

// Open file dialog to select images
ipcMain.handle("dialog:openFiles", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile", "multiSelections"],
    filters: [
      {
        name: "Images",
        extensions: [
          "jpg",
          "jpeg",
          "png",
          "gif",
          "bmp",
          "tiff",
          "webp",
          "heic",
        ],
      },
    ],
  });

  if (result.canceled) {
    return { canceled: true, files: [] };
  }

  return { canceled: false, files: result.filePaths };
});

// Open folder dialog
ipcMain.handle("dialog:openFolder", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
  });

  if (result.canceled) {
    return { canceled: true, folder: null };
  }

  return { canceled: false, folder: result.filePaths[0] };
});

// Read image metadata
ipcMain.handle("image:readMetadata", async (event, filePath) => {
  try {
    const metadata = await exiftool.read(filePath);

    return {
      success: true,
      metadata: {
        fileName: path.basename(filePath),
        filePath: filePath,
        fileSize: metadata.FileSize,
        imageWidth: metadata.ImageWidth,
        imageHeight: metadata.ImageHeight,
        title: metadata.Title || "",
        description: metadata.Description || metadata.ImageDescription || "",
        keywords: metadata.Keywords || metadata.Subject || [],
        copyright: metadata.Copyright || "",
        artist: metadata.Artist || metadata.Creator || "",
        dateCreated: metadata.DateCreated || metadata.CreateDate || "",
        location: {
          city: metadata.City || "",
          state: metadata.State || metadata.Province || "",
          country: metadata.Country || "",
          gpsLatitude: metadata.GPSLatitude || "",
          gpsLongitude: metadata.GPSLongitude || "",
        },
        camera: {
          make: metadata.Make || "",
          model: metadata.Model || "",
        },
      },
    };
  } catch (error) {
    console.error("Error reading metadata:", error);
    return {
      success: false,
      error: error.message,
    };
  }
});

// Read metadata for multiple images
ipcMain.handle("image:readBulkMetadata", async (event, filePaths) => {
  const results = [];

  for (const filePath of filePaths) {
    try {
      const metadata = await exiftool.read(filePath);

      results.push({
        success: true,
        filePath: filePath,
        metadata: {
          fileName: path.basename(filePath),
          filePath: filePath,
          fileSize: metadata.FileSize,
          imageWidth: metadata.ImageWidth,
          imageHeight: metadata.ImageHeight,
          title: metadata.Title || "",
          description: metadata.Description || metadata.ImageDescription || "",
          keywords: metadata.Keywords || metadata.Subject || [],
          copyright: metadata.Copyright || "",
          artist: metadata.Artist || metadata.Creator || "",
          dateCreated: metadata.DateCreated || metadata.CreateDate || "",
          location: {
            city: metadata.City || "",
            state: metadata.State || metadata.Province || "",
            country: metadata.Country || "",
            gpsLatitude: metadata.GPSLatitude || "",
            gpsLongitude: metadata.GPSLongitude || "",
          },
          camera: {
            make: metadata.Make || "",
            model: metadata.Model || "",
          },
        },
      });
    } catch (error) {
      results.push({
        success: false,
        filePath: filePath,
        error: error.message,
      });
    }
  }

  return results;
});

// Write metadata to image
ipcMain.handle("image:writeMetadata", async (event, filePath, metadata) => {
  try {
    const tags = {};

    if (metadata.title) tags.Title = metadata.title;
    if (metadata.description) tags.Description = metadata.description;
    if (metadata.keywords && metadata.keywords.length > 0) {
      tags.Keywords = metadata.keywords;
      tags.Subject = metadata.keywords;
    }
    if (metadata.copyright) tags.Copyright = metadata.copyright;
    if (metadata.artist) tags.Artist = metadata.artist;
    if (metadata.location) {
      if (metadata.location.city) tags.City = metadata.location.city;
      if (metadata.location.state) tags.State = metadata.location.state;
      if (metadata.location.country) tags.Country = metadata.location.country;
      // GPS Coordinates
      if (metadata.location.gpsLatitude && metadata.location.gpsLongitude) {
        tags.GPSLatitude = metadata.location.gpsLatitude;
        tags.GPSLongitude = metadata.location.gpsLongitude;
      }
    }

    await exiftool.write(filePath, tags, ["-overwrite_original"]);

    return { success: true };
  } catch (error) {
    console.error("Error writing metadata:", error);
    return {
      success: false,
      error: error.message,
    };
  }
});

// Write metadata to multiple images
ipcMain.handle("image:writeBulkMetadata", async (event, updates) => {
  const results = [];

  for (const update of updates) {
    try {
      const tags = {};

      if (update.metadata.title !== undefined)
        tags.Title = update.metadata.title;
      if (update.metadata.description !== undefined)
        tags.Description = update.metadata.description;
      if (update.metadata.keywords && update.metadata.keywords.length > 0) {
        tags.Keywords = update.metadata.keywords;
        tags.Subject = update.metadata.keywords;
      }
      if (update.metadata.copyright !== undefined)
        tags.Copyright = update.metadata.copyright;
      if (update.metadata.artist !== undefined)
        tags.Artist = update.metadata.artist;
      if (update.metadata.location) {
        if (update.metadata.location.city !== undefined)
          tags.City = update.metadata.location.city;
        if (update.metadata.location.state !== undefined)
          tags.State = update.metadata.location.state;
        if (update.metadata.location.country !== undefined)
          tags.Country = update.metadata.location.country;
        // GPS Coordinates
        if (
          update.metadata.location.gpsLatitude &&
          update.metadata.location.gpsLongitude
        ) {
          tags.GPSLatitude = update.metadata.location.gpsLatitude;
          tags.GPSLongitude = update.metadata.location.gpsLongitude;
        }
      }

      await exiftool.write(update.filePath, tags, ["-overwrite_original"]);

      results.push({
        success: true,
        filePath: update.filePath,
      });
    } catch (error) {
      results.push({
        success: false,
        filePath: update.filePath,
        error: error.message,
      });
    }
  }

  return results;
});

// Rename file
ipcMain.handle("file:rename", async (event, oldPath, newPath) => {
  try {
    await fs.rename(oldPath, newPath);
    return { success: true, newPath };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
});

// Bulk rename files
ipcMain.handle("file:bulkRename", async (event, renames) => {
  const results = [];

  for (const rename of renames) {
    try {
      await fs.rename(rename.oldPath, rename.newPath);
      results.push({
        success: true,
        oldPath: rename.oldPath,
        newPath: rename.newPath,
      });
    } catch (error) {
      results.push({
        success: false,
        oldPath: rename.oldPath,
        error: error.message,
      });
    }
  }

  return results;
});

// Get image as base64 for preview
ipcMain.handle("image:getPreview", async (event, filePath) => {
  try {
    const data = await fs.readFile(filePath);
    const base64 = data.toString("base64");
    const ext = path.extname(filePath).toLowerCase();
    let mimeType = "image/jpeg";

    if (ext === ".png") mimeType = "image/png";
    else if (ext === ".gif") mimeType = "image/gif";
    else if (ext === ".webp") mimeType = "image/webp";
    else if (ext === ".bmp") mimeType = "image/bmp";

    return {
      success: true,
      data: `data:${mimeType};base64,${base64}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
});

// List all images in a folder
ipcMain.handle("folder:listImages", async (event, folderPath) => {
  try {
    const files = await fs.readdir(folderPath);
    const imageExtensions = [
      ".jpg",
      ".jpeg",
      ".png",
      ".gif",
      ".bmp",
      ".tiff",
      ".webp",
      ".heic",
    ];

    const imageFiles = files
      .filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return imageExtensions.includes(ext);
      })
      .map((file) => path.join(folderPath, file));

    return {
      success: true,
      files: imageFiles,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
});

// Process bulk images: copy/move files with metadata and optional rename
ipcMain.handle("image:processBulkImages", async (event, operations) => {
  console.log("=== DEBUG: processBulkImages INICIADO ===");
  console.log(
    "Tipo de operations:",
    typeof operations,
    Array.isArray(operations),
  );
  console.log("Operations recibidas:", JSON.stringify(operations, null, 2));

  try {
    if (!Array.isArray(operations)) {
      console.error("ERROR: operations no es un array");
      throw new Error("Invalid operations payload");
    }

    console.log("Total de operaciones a procesar:", operations.length);
    const results = [];

    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      console.log(
        `\n--- Procesando operación ${i + 1}/${operations.length} ---`,
      );
      console.log("Operación:", JSON.stringify(op, null, 2));

      try {
        // Prepare new filename
        const newFileName = op.newName;
        const outputDir = op.outputFolder || path.dirname(op.filePath);
        const newFilePath = path.join(outputDir, newFileName);

        console.log("  - Archivo origen:", op.filePath);
        console.log("  - Carpeta destino:", outputDir);
        console.log("  - Nombre nuevo:", newFileName);
        console.log("  - Ruta completa destino:", newFilePath);
        console.log("  - Operación:", op.operation);

        // Ensure output directory exists
        try {
          console.log("  - Creando directorio si no existe...");
          await fs.mkdir(outputDir, { recursive: true });
          console.log("  - Directorio OK");
        } catch (mkdirErr) {
          console.log("  - Advertencia mkdir:", mkdirErr.message);
          void mkdirErr;
        }

        // Copy or move file
        console.log("  - Ejecutando operación de archivo...");
        if (op.operation === "copy") {
          await fs.copyFile(op.filePath, newFilePath);
          console.log("  - Archivo copiado exitosamente");
        } else if (op.operation === "move") {
          await fs.rename(op.filePath, newFilePath);
          console.log("  - Archivo movido exitosamente");
        }

        // Write metadata to the new file
        console.log("  - Escribiendo metadatos...");
        const tags = {};

        if (op.metadata.title !== undefined) tags.Title = op.metadata.title;
        if (op.metadata.description !== undefined)
          tags.Description = op.metadata.description;
        if (op.metadata.keywords && op.metadata.keywords.length > 0) {
          tags.Keywords = op.metadata.keywords;
          tags.Subject = op.metadata.keywords;
        }
        if (op.metadata.copyright !== undefined)
          tags.Copyright = op.metadata.copyright;
        if (op.metadata.artist !== undefined) tags.Artist = op.metadata.artist;
        if (op.metadata.location) {
          if (op.metadata.location.city !== undefined)
            tags.City = op.metadata.location.city;
          if (op.metadata.location.state !== undefined)
            tags.State = op.metadata.location.state;
          if (op.metadata.location.country !== undefined)
            tags.Country = op.metadata.location.country;
          if (
            op.metadata.location.gpsLatitude &&
            op.metadata.location.gpsLongitude
          ) {
            tags.GPSLatitude = op.metadata.location.gpsLatitude;
            tags.GPSLongitude = op.metadata.location.gpsLongitude;
          }
        }

        console.log("  - Tags a escribir:", JSON.stringify(tags, null, 2));
        await exiftool.write(newFilePath, tags, ["-overwrite_original"]);
        console.log("  - Metadatos escritos exitosamente");

        results.push({
          success: true,
          oldPath: op.filePath,
          newPath: newFilePath,
        });
        console.log("  ✓ Operación completada con éxito");
      } catch (error) {
        console.error(`  ✗ ERROR en operación ${i + 1}:`, error);
        console.error("  Stack trace:", error.stack);
        results.push({
          success: false,
          oldPath: op && op.filePath ? op.filePath : "",
          error: error && error.message ? error.message : String(error),
        });
      }
    }

    console.log("\n=== DEBUG: processBulkImages COMPLETADO ===");
    console.log("Resultados totales:", results.length);
    console.log("Exitosos:", results.filter((r) => r.success).length);
    console.log("Fallidos:", results.filter((r) => !r.success).length);
    console.log("Resultados finales:", JSON.stringify(results, null, 2));

    return results;
  } catch (err) {
    console.error("=== ERROR FATAL en processBulkImages ===");
    console.error("Error:", err);
    console.error("Stack:", err.stack);
    console.error("Tipo de error:", typeof err);
    return [
      {
        success: false,
        oldPath: "",
        error: err && err.message ? err.message : String(err),
      },
    ];
  }
});

"use client";

import { useState, useRef, useMemo } from "react";
import { FileText, Copy, FolderOutput } from "lucide-react";
import { useImageStore } from "@/lib/store";
import type { ImageMetadata } from "@/types/electron";
import type {
  FieldDescriptor,
  FormularioGenericoHandle,
  LocationValue,
} from "@/types/form";
import FormularioGenerico from "./FormularioGenerico";

interface MetaFormValues extends Record<string, unknown> {
  title: string;
  description: string;
  keywords: string[];
  copyright: string;
  artist: string;
  location: LocationValue;
}

export default function ImageEditor() {
  const {
    updateImageMetadata,
    images,
    selectedImages: selectedImageIds,
  } = useImageStore();

  // Get actual selected images with useMemo
  const selectedImages = useMemo(
    () => images.filter((img) => selectedImageIds.includes(img.id)),
    [images, selectedImageIds],
  );

  // Form ref for reading metadata values
  const formRef = useRef<FormularioGenericoHandle<MetaFormValues>>(null);

  // Default values from selected image(s)
  const metaDefaultValues: MetaFormValues = useMemo(() => {
    if (selectedImages.length === 1) {
      const img = selectedImages[0];
      return {
        title: img.metadata.title || "",
        description: img.metadata.description || "",
        keywords: img.metadata.keywords || [],
        copyright: img.metadata.copyright || "",
        artist: img.metadata.artist || "",
        location: {
          city: img.metadata.location?.city || "",
          state: img.metadata.location?.state || "",
          country: img.metadata.location?.country || "",
          gpsLatitude: img.metadata.location?.gpsLatitude || "",
          gpsLongitude: img.metadata.location?.gpsLongitude || "",
        },
      };
    }
    return {
      title: "",
      description: "",
      keywords: [],
      copyright: "",
      artist: "",
      location: {
        city: "",
        state: "",
        country: "",
        gpsLatitude: "",
        gpsLongitude: "",
      },
    };
  }, [selectedImages]);

  const metaFields: FieldDescriptor[] = [
    {
      name: "title",
      label: "Título",
      type: "text",
      placeholder: "Título de la imagen",
    },
    {
      name: "description",
      label: "Descripción",
      type: "textarea",
      rows: 3,
      placeholder: "Descripción detallada para WordPress",
    },
    {
      name: "keywords",
      label: "Palabras Clave",
      type: "keywords",
      placeholder: "Agregar palabra clave",
    },
    {
      name: "copyright",
      label: "Copyright",
      type: "text",
      placeholder: "© 2026 Tu Organización",
    },
    {
      name: "artist",
      label: "Fotógrafo",
      type: "text",
      placeholder: "Nombre del fotógrafo",
    },
    { name: "location", label: "Ubicación", type: "location", showGps: true },
  ];

  // Rename state
  const [pattern, setPattern] = useState("");
  const [startNumber, setStartNumber] = useState(1);
  const [numberPadding, setNumberPadding] = useState(3);

  // File operation state
  const [keepOriginals, setKeepOriginals] = useState(true);
  const [outputFolder, setOutputFolder] = useState<string | null>(null);
  const [operation, setOperation] = useState<"copy" | "move">("copy");

  // UI state
  const [saving, setSaving] = useState(false);

  // Generate preview of new filenames
  const previewRenames = useMemo(() => {
    if (!pattern) return [];

    return selectedImages.map((img, index) => {
      const ext = img.metadata.fileName.split(".").pop();
      const number = (startNumber + index)
        .toString()
        .padStart(numberPadding, "0");

      let newName = pattern
        .replace("{n}", number)
        .replace("{date}", new Date().toISOString().split("T")[0])
        .replace("{original}", img.metadata.fileName.replace(/\.[^/.]+$/, ""));

      newName = `${newName}.${ext}`;

      const dir = img.filePath.substring(
        0,
        img.filePath.lastIndexOf("\\") || img.filePath.lastIndexOf("/"),
      );
      const separator = img.filePath.includes("\\") ? "\\" : "/";
      const newPath = `${dir}${separator}${newName}`;

      return {
        id: img.id,
        oldPath: img.filePath,
        oldName: img.metadata.fileName,
        newPath: newPath,
        newName: newName,
      };
    });
  }, [selectedImages, pattern, startNumber, numberPadding]);

  // Select output folder
  const handleSelectOutputFolder = async () => {
    if (!window.electronAPI) return;

    const result = await window.electronAPI.openFolder();
    if (!result.canceled && result.folder) {
      setOutputFolder(result.folder);
    }
  };

  // Handle save metadata and optional rename/copy
  const handleSave = async () => {
    if (!window.electronAPI || selectedImages.length === 0) return;

    setSaving(true);

    try {
      // If user deselects keeping originals, require an output folder
      if (!keepOriginals && !outputFolder) {
        alert(
          "Si no mantienes los archivos originales, por favor selecciona una carpeta de salida",
        );
        setSaving(false);
        return;
      }

      // Read metadata from the generic form
      const formValues = formRef.current?.getValues();
      const loc = formValues?.location as LocationValue | undefined;
      const metadata: Partial<ImageMetadata> = {
        title: (formValues?.title as string) || "",
        description: (formValues?.description as string) || "",
        keywords: (formValues?.keywords as string[]) || [],
        copyright: (formValues?.copyright as string) || "",
        artist: (formValues?.artist as string) || "",
        location: {
          city: loc?.city || "",
          state: loc?.state || "",
          country: loc?.country || "",
          gpsLatitude: loc?.gpsLatitude || "",
          gpsLongitude: loc?.gpsLongitude || "",
        },
      };

      // Build operations depending on keepOriginals
      // - keepOriginals === true: create copies (default behaviour)
      //   - if pattern present, use previewRenames
      //   - if no pattern, create copies with suffix _edited to avoid overwriting
      // - keepOriginals === false: move/copy to selected outputFolder (user must choose)

      const makeCopyName = (originalName: string) => {
        if (pattern) return null; // previewRenames will provide name
        // insert suffix before extension
        const idx = originalName.lastIndexOf(".");
        const base = idx === -1 ? originalName : originalName.slice(0, idx);
        const ext = idx === -1 ? "" : originalName.slice(idx);
        return `${base}_edited${ext}`;
      };

      const operations = selectedImages.map((img, index) => {
        const suggestedName =
          previewRenames[index]?.newName ||
          makeCopyName(img.metadata.fileName) ||
          img.metadata.fileName;
        return {
          filePath: img.filePath,
          newName: suggestedName,
          metadata: metadata,
          // if user provided an outputFolder use it, otherwise null (main will fallback to same dir)
          outputFolder: outputFolder || null,
          // operation: if user kept originals -> always copy; otherwise use chosen operation
          operation: keepOriginals ? "copy" : operation,
        };
      });

      console.log("=== DEBUG: Enviando operaciones a Electron ===");
      console.log("Total operaciones:", operations.length);
      console.log("Operaciones:", JSON.stringify(operations, null, 2));
      console.log("keepOriginals:", keepOriginals);
      console.log("outputFolder:", outputFolder);
      console.log("window.electronAPI:", window.electronAPI);
      console.log(
        "window.electronAPI.processBulkImages:",
        window.electronAPI.processBulkImages,
      );
      console.log(
        "Tipo de processBulkImages:",
        typeof window.electronAPI.processBulkImages,
      );

      if (typeof window.electronAPI.processBulkImages !== "function") {
        throw new Error(
          "processBulkImages no está disponible en electronAPI. Reinicia la aplicación.",
        );
      }

      const results = await window.electronAPI.processBulkImages(operations);

      console.log("=== DEBUG: Resultados recibidos ===");
      console.log("Total resultados:", results.length);
      console.log("Resultados:", JSON.stringify(results, null, 2));

      results.forEach(
        (result: { success: boolean; newPath?: string }, index: number) => {
          if (result.success && result.newPath) {
            updateImageMetadata(selectedImages[index].id, {
              ...metadata,
              fileName:
                result.newPath.split("\\").pop() ||
                result.newPath.split("/").pop() ||
                "",
              filePath: result.newPath,
            });
          }
        },
      );

      const failedCount = results.filter(
        (r: { success: boolean }) => !r.success,
      ).length;
      if (failedCount > 0) {
        alert(
          `${failedCount} archivos fallaron. ${
            results.length - failedCount
          } procesados exitosamente`,
        );
      } else {
        alert(
          `${results.length} archivos ${
            keepOriginals
              ? "copiados"
              : operation === "copy"
                ? "copiados"
                : "movidos"
          } exitosamente`,
        );
        setPattern("");
      }
    } catch (error) {
      alert(
        "Error al procesar: " +
          (error instanceof Error ? error.message : "Unknown error"),
      );
    } finally {
      setSaving(false);
    }
  };

  if (selectedImages.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6 max-h-[calc(100vh-250px)] overflow-y-auto pr-2">
      {selectedImages.length > 1 && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-sm text-blue-800 dark:text-blue-300">
          Editando {selectedImages.length} imágenes
        </div>
      )}

      {/* METADATOS SECTION */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
          Metadatos
        </h3>
        <FormularioGenerico<MetaFormValues>
          ref={formRef}
          fields={metaFields}
          defaultValues={metaDefaultValues}
          onSubmit={() => {}}
          hideButtons
        />
      </div>

      {/* RENOMBRAR SECTION */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
          <FileText className="w-5 h-5" /> Renombrar Archivos
        </h3>
        <div className="space-y-4">
          {/* Pattern Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Patrón de Nombre
            </label>
            <input
              type="text"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="HotelA_Panama_2025_{n}"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Variables: {"{n}"} = número, {"{date}"} = fecha actual,{" "}
              {"{original}"} = nombre original
            </p>
          </div>

          {/* Number Settings */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Número Inicial
              </label>
              <input
                type="number"
                value={startNumber}
                onChange={(e) => setStartNumber(parseInt(e.target.value) || 1)}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Dígitos
              </label>
              <input
                type="number"
                value={numberPadding}
                onChange={(e) =>
                  setNumberPadding(parseInt(e.target.value) || 1)
                }
                min="1"
                max="6"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Preview */}
          {pattern && previewRenames.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Vista Previa ({previewRenames.length} archivos)
              </label>
              <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                <div className="max-h-48 overflow-y-auto">
                  {previewRenames.slice(0, 5).map((rename, index) => (
                    <div
                      key={index}
                      className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 last:border-b-0 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 dark:text-gray-400 truncate flex-1">
                          {rename.oldName}
                        </span>
                        <span className="text-gray-400">→</span>
                        <span className="text-blue-600 dark:text-blue-400 truncate flex-1 font-medium">
                          {rename.newName}
                        </span>
                      </div>
                    </div>
                  ))}
                  {previewRenames.length > 5 && (
                    <div className="px-3 py-2 text-xs text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800">
                      ... y {previewRenames.length - 5} más
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Examples */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 text-xs">
            <p className="font-medium text-gray-700 dark:text-gray-300 mb-2">
              Ejemplos:
            </p>
            <div className="space-y-1 text-gray-600 dark:text-gray-400">
              <div>
                <code className="bg-white dark:bg-gray-800 px-2 py-0.5 rounded">
                  HotelA_{"{date}"}_{"{n}"}
                </code>
                <span className="ml-2">→ HotelA_2025-10-03_001.jpg</span>
              </div>
              <div>
                <code className="bg-white dark:bg-gray-800 px-2 py-0.5 rounded">
                  Event_{"{n}"}
                </code>
                <span className="ml-2">→ Event_001.jpg</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FILE OPERATIONS SECTION */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
          Opciones de Archivo
        </h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="keepOriginals"
              checked={keepOriginals}
              onChange={(e) => setKeepOriginals(e.target.checked)}
              className="w-4 h-4"
            />
            <label
              htmlFor="keepOriginals"
              className="text-sm text-gray-700 dark:text-gray-300"
            >
              Mantener archivos originales (crear copias)
            </label>
          </div>

          {!keepOriginals && (
            <div className="space-y-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
              <div className="flex gap-3 mb-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="operation"
                    value="copy"
                    checked={operation === "copy"}
                    onChange={(e) =>
                      setOperation(e.target.value as "copy" | "move")
                    }
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <Copy className="w-4 h-4" /> Copiar archivos
                  </span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="operation"
                    value="move"
                    checked={operation === "move"}
                    onChange={(e) =>
                      setOperation(e.target.value as "copy" | "move")
                    }
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <FolderOutput className="w-4 h-4" /> Mover archivos
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Carpeta de salida:
                </label>
                <button
                  onClick={handleSelectOutputFolder}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Seleccionar
                </button>
              </div>
              {outputFolder && (
                <div className="p-2 bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600 text-xs text-gray-600 dark:text-gray-400 truncate">
                  {outputFolder}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Save/Process Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
      >
        {saving
          ? "Procesando..."
          : `Aplicar Cambios (${selectedImages.length})`}
      </button>
    </div>
  );
}

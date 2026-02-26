"use client";

import { useState, useMemo, useRef } from "react";
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

export default function MetadataEditor() {
  const {
    updateImageMetadata,
    images,
    selectedImages: selectedImageIds,
  } = useImageStore();

  const selectedImages = useMemo(
    () => images.filter((img) => selectedImageIds.includes(img.id)),
    [images, selectedImageIds],
  );

  const [saving, setSaving] = useState(false);
  const formRef = useRef<FormularioGenericoHandle<MetaFormValues>>(null);

  // Build default values from selected image(s)
  const defaultValues: MetaFormValues = useMemo(() => {
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

  const fields: FieldDescriptor[] = [
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
      rows: 4,
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
    {
      name: "location",
      label: "Ubicación",
      type: "location",
      showGps: true,
    },
  ];

  const handleSubmit = async (values: MetaFormValues) => {
    if (!window.electronAPI || selectedImages.length === 0) return;

    setSaving(true);

    try {
      const loc = values.location as LocationValue;
      const metadata: Partial<ImageMetadata> = {
        title: values.title,
        description: values.description,
        keywords: values.keywords,
        copyright: values.copyright,
        artist: values.artist,
        location: {
          city: loc.city,
          state: loc.state,
          country: loc.country,
          gpsLatitude: loc.gpsLatitude,
          gpsLongitude: loc.gpsLongitude,
        },
      };

      const updates = selectedImages.map((img) => ({
        filePath: img.filePath,
        metadata,
      }));

      const results = await window.electronAPI.writeBulkMetadata(updates);

      results.forEach((result, index) => {
        if (result.success) {
          updateImageMetadata(selectedImages[index].id, metadata);
        }
      });

      const failedCount = results.filter((r) => !r.success).length;
      if (failedCount > 0) {
        alert(`${failedCount} imágenes fallaron al actualizar`);
      } else {
        alert("Metadatos actualizados exitosamente");
      }
    } catch (error) {
      alert(
        "Error al guardar metadatos: " +
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
    <div className="space-y-4 max-h-[calc(100vh-250px)] overflow-y-auto pr-2">
      {selectedImages.length > 1 && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-sm text-blue-800 dark:text-blue-300">
          Editando {selectedImages.length} imágenes. Los campos que completes se
          aplicarán a todas las seleccionadas.
        </div>
      )}

      <FormularioGenerico<MetaFormValues>
        ref={formRef}
        fields={fields}
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        submitLabel={
          saving
            ? "Guardando..."
            : `Guardar Metadatos (${selectedImages.length})`
        }
        loading={saving}
      />
    </div>
  );
}

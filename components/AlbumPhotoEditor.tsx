"use client";

import { useState, useRef, useMemo } from "react";
import { Check } from "lucide-react";
import type { AlbumPhoto } from "@/types/electron";
import type {
  FieldDescriptor,
  FormularioGenericoHandle,
  LocationValue,
} from "@/types/form";
import FormularioGenerico from "./FormularioGenerico";

interface AlbumPhotoEditorProps {
  photos: AlbumPhoto[];
  albumId: string;
  onSaved?: () => void;
}

interface PhotoMetaValues extends Record<string, unknown> {
  title: string;
  description: string;
  artist: string;
  copyright: string;
  keywords: string[];
  location: LocationValue;
}

export default function AlbumPhotoEditor({
  photos,
  albumId,
  onSaved,
}: AlbumPhotoEditorProps) {
  const isSingle = photos.length === 1;
  const photo = isSingle ? photos[0] : null;

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const formRef = useRef<FormularioGenericoHandle<PhotoMetaValues>>(null);

  const defaultValues: PhotoMetaValues = useMemo(() => {
    if (isSingle && photo) {
      return {
        title: photo.title || "",
        description: photo.description || "",
        artist: photo.artist || "",
        copyright: photo.copyright || "",
        keywords: photo.keywords || [],
        location: {
          city: photo.city || "",
          state: photo.state || "",
          country: photo.country || "",
          gpsLatitude:
            photo.gpsLatitude != null ? String(photo.gpsLatitude) : "",
          gpsLongitude:
            photo.gpsLongitude != null ? String(photo.gpsLongitude) : "",
        },
      };
    }
    return {
      title: "",
      description: "",
      artist: "",
      copyright: "",
      keywords: [],
      location: {
        city: "",
        state: "",
        country: "",
        gpsLatitude: "",
        gpsLongitude: "",
      },
    };
  }, [photos, isSingle, photo]);

  const fields: FieldDescriptor[] = [
    {
      name: "title",
      label: "Título",
      type: "text",
      placeholder: "Título de la foto",
      hidden: !isSingle,
    },
    {
      name: "description",
      label: "Descripción",
      type: "textarea",
      rows: 2,
      placeholder: "Descripción...",
      hidden: !isSingle,
    },
    {
      name: "artist",
      label: "Artista / Fotógrafo",
      type: "text",
      placeholder: isSingle ? "Nombre del artista" : "Aplicar a todas...",
    },
    {
      name: "copyright",
      label: "Copyright",
      type: "text",
      placeholder: "© 2026 ...",
    },
    {
      name: "keywords",
      label: "Palabras Clave",
      type: "keywords",
      placeholder: "Enter para agregar",
    },
    {
      name: "location",
      label: "Ubicación",
      type: "location",
      showGps: true,
    },
  ];

  const handleSubmit = async (values: PhotoMetaValues) => {
    if (!window.electronAPI) return;

    setSaving(true);
    setSaveSuccess(false);

    try {
      const metadata: Record<string, unknown> = {};
      const loc = values.location as LocationValue;

      if (values.title) metadata.title = values.title;
      if (values.description) metadata.description = values.description;
      if (values.keywords.length > 0) metadata.keywords = values.keywords;
      if (values.copyright) metadata.copyright = values.copyright;
      if (values.artist) metadata.artist = values.artist;
      if (loc.city) metadata.city = loc.city;
      if (loc.state) metadata.state = loc.state;
      if (loc.country) metadata.country = loc.country;
      if (loc.gpsLatitude) metadata.gpsLatitude = loc.gpsLatitude;
      if (loc.gpsLongitude) metadata.gpsLongitude = loc.gpsLongitude;

      const photoIds = photos.map((p) => p.id);

      const result = await window.electronAPI.updatePhotoMetadata(
        albumId,
        photoIds,
        metadata,
      );

      if (result.success) {
        setSaveSuccess(true);
        onSaved?.();
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Error saving photo metadata:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
        {isSingle
          ? `Editar: ${photo?.originalFilename}`
          : `Editar ${photos.length} fotos`}
      </h3>

      <FormularioGenerico<PhotoMetaValues>
        ref={formRef}
        fields={fields}
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        submitLabel={
          saving
            ? "Guardando..."
            : isSingle
              ? "Guardar Metadatos"
              : `Aplicar a ${photos.length} fotos`
        }
        loading={saving}
        hideButtons
      />

      {/* Save button + success toast */}
      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
        {saveSuccess && (
          <p className="text-xs text-green-600 dark:text-green-400 mb-2 flex items-center gap-1">
            <Check className="w-3 h-3" /> Metadatos guardados exitosamente
          </p>
        )}
        <button
          onClick={() => formRef.current?.submit()}
          disabled={saving}
          className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {saving
            ? "Guardando..."
            : isSingle
              ? "Guardar Metadatos"
              : `Aplicar a ${photos.length} fotos`}
        </button>
      </div>
    </div>
  );
}

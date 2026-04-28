"use client";

import { useState, useRef } from "react";
import { CheckCircle } from "lucide-react";
import type { AlbumCreateInput, Album } from "@/types/electron";
import type {
  FieldDescriptor,
  FormularioGenericoHandle,
  LocationValue,
} from "@/types/form";
import { useAuthStore } from "@/lib/authStore";
import FormularioGenerico from "./FormularioGenerico";
import ColorTagSelector from "./ColorTagSelector";

interface AlbumFormProps {
  album?: Album | null;
  onSave: (input: AlbumCreateInput) => Promise<Album | null | void>;
  onCancel: () => void;
  onPostCreate?: (albumId: string, wantsUpload: boolean) => void;
  loading?: boolean;
}

interface AlbumFormValues extends Record<string, unknown> {
  name: string;
  description: string;
  photographerId: string | null;
  eventDate: string;
  location: LocationValue;
  keywords: string[];
  colorTags: string[];
}

export default function AlbumForm({
  album,
  onSave,
  onCancel,
  onPostCreate,
  loading,
}: AlbumFormProps) {
  const isEditing = !!album;
  const { fotografo: linkedFotografo } = useAuthStore();
  const formRef = useRef<FormularioGenericoHandle<AlbumFormValues>>(null);

  // Post-create step
  const [showPostCreate, setShowPostCreate] = useState(false);
  const [createdAlbumId, setCreatedAlbumId] = useState<string | null>(null);

  const initialFotografo = album?.fotografo ?? linkedFotografo ?? null;

  const defaultValues: AlbumFormValues = {
    name: album?.name || "",
    description: album?.description || "",
    photographerId: album?.photographerId ?? linkedFotografo?.id ?? null,
    eventDate: album?.eventDate
      ? new Date(album.eventDate).toISOString().substring(0, 10)
      : "",
    location: {
      city: album?.city || "",
      state: album?.state || "",
      country: album?.country || "",
      gpsLatitude: "",
      gpsLongitude: "",
    },
    keywords: album?.keywords || [],
    colorTags: album?.colorTags || [],
  };

  const fields: FieldDescriptor[] = [
    {
      name: "name",
      label: "Nombre del Álbum",
      type: "text",
      placeholder: "Ej: Inauguración Hotel Panamá",
      required: true,
      validate: (v) =>
        !(v as string)?.trim() ? "El nombre es obligatorio" : undefined,
    },
    {
      name: "description",
      label: "Descripción",
      type: "textarea",
      rows: 3,
      placeholder: "Descripción del evento o sesión fotográfica...",
    },
    {
      name: "photographerId",
      label: "Fotógrafo",
      type: "fotografo",
      initialFotografo,
      validate: (v) => (!v ? "Selecciona un fotógrafo" : undefined),
    },
    {
      name: "eventDate",
      label: "Fecha del Evento",
      type: "text",
      inputType: "date",
      required: true,
      validate: (v) =>
        !(v as string)?.trim() ? "La fecha es obligatoria" : undefined,
    },
    {
      name: "location",
      label: "Ubicación",
      type: "location",
      showGps: false,
    },
    {
      name: "keywords",
      label: "Palabras Clave",
      type: "keywords",
      placeholder: "Escribe y presiona Enter",
    },
    {
      name: "colorTags",
      label: "Etiquetas de Color",
      type: "custom",
      render: ({ value, onChange }) => (
        <ColorTagSelector
          value={(value as string[]) || []}
          onChange={(tags) => onChange(tags)}
        />
      ),
    },
  ];

  const handleSubmit = async (values: AlbumFormValues) => {
    const loc = values.location as LocationValue;
    const input: AlbumCreateInput = {
      name: values.name.trim(),
      description: values.description.trim() || undefined,
      photographerId: values.photographerId || undefined,
      eventDate: values.eventDate,
      city: loc.city.trim() || undefined,
      state: loc.state.trim() || undefined,
      country: loc.country.trim() || undefined,
      keywords: values.keywords,
      colorTags: values.colorTags,
    };

    const result = await onSave(input);

    if (
      !isEditing &&
      onPostCreate &&
      result &&
      typeof result === "object" &&
      "id" in result
    ) {
      setCreatedAlbumId(result.id);
      setShowPostCreate(true);
    }
  };

  // Post-create confirmation step
  if (showPostCreate && createdAlbumId && onPostCreate) {
    return (
      <div className="space-y-6 text-center py-4">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Álbum creado exitosamente
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          ¿Ya tenés archivos listos para subir a este álbum?
        </p>
        <div className="flex gap-3 justify-center pt-2">
          <button
            onClick={() => onPostCreate(createdAlbumId, true)}
            className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Sí, subir fotos ahora
          </button>
          <button
            onClick={() => onPostCreate(createdAlbumId, false)}
            className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500"
          >
            No, después
          </button>
        </div>
      </div>
    );
  }

  return (
    <FormularioGenerico<AlbumFormValues>
      ref={formRef}
      fields={fields}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      title={isEditing ? "Editar Álbum" : "Nuevo Álbum"}
      submitLabel={
        loading
          ? "Guardando..."
          : isEditing
            ? "Actualizar Álbum"
            : "Crear Álbum"
      }
      cancelLabel="Cancelar"
      onCancel={onCancel}
      loading={loading}
    />
  );
}

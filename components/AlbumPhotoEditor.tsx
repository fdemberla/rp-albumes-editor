"use client";

import { useState, useRef, useMemo } from "react";
import { Check, Camera, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import type { AlbumPhoto, Fotografo } from "@/types/electron";
import FotografoSelector from "./FotografoSelector";
import type {
  FieldDescriptor,
  FormularioGenericoHandle,
  LocationValue,
} from "@/types/form";
import FormularioGenerico from "./FormularioGenerico";
import ColorTagSelector from "./ColorTagSelector";

function ArtistSelector({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const [fotografo, setFotografo] = useState<Fotografo | null>(null);
  const currentText = (value as string) || "";

  const handleChange = (id: string | null, foto: Fotografo | null) => {
    if (foto) {
      const name = `${foto.firstName} ${foto.lastName}`.trim();
      setFotografo(foto);
      onChange(name);
    } else {
      setFotografo(null);
      onChange("");
    }
  };

  return (
    <div>
      <FotografoSelector
        value={fotografo?.id ?? null}
        onChange={handleChange}
      />
      {currentText && !fotografo && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Actual: {currentText}
        </p>
      )}
    </div>
  );
}

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
  colorTags: string[];
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

  // EXIF reader state (single photo only)
  type ExifData = NonNullable<
    Awaited<ReturnType<typeof window.electronAPI.readPhotoExif>>["exif"]
  >;
  const [exifData, setExifData] = useState<ExifData | null>(null);
  const [exifLoading, setExifLoading] = useState(false);
  const [exifError, setExifError] = useState<string | null>(null);
  const [exifOpen, setExifOpen] = useState(false);

  const handleReadExif = async () => {
    if (!photo || !window.electronAPI) return;
    setExifLoading(true);
    setExifError(null);
    setExifOpen(true);
    try {
      const result = await window.electronAPI.readPhotoExif(photo.storedPath);
      if (result.success && result.exif) {
        setExifData(result.exif);

        console.log("EXIF data read successfully:", result.exif);
      } else {
        setExifError(result.error ?? "No se pudo leer el EXIF");
      }
    } catch (err) {
      setExifError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setExifLoading(false);
    }
  };

  const defaultValues: PhotoMetaValues = useMemo(() => {
    if (isSingle && photo) {
      return {
        title: photo.title || "",
        description: photo.description || "",
        artist: photo.artist || "",
        copyright: photo.copyright || "",
        keywords: photo.keywords || [],
        colorTags: photo.colorTags || [],
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
      colorTags: [],
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
      label: "Descripción / Pie de foto",
      type: "textarea",
      rows: 2,
      placeholder: "Descripción...",
    },
    {
      name: "artist",
      label: "Artista / Fotógrafo",
      type: "custom",
      render: ({ value, onChange }) => (
        <ArtistSelector value={value} onChange={onChange} />
      ),
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
      if (isSingle || values.description)
        metadata.description = values.description || null;
      if (values.keywords.length > 0) metadata.keywords = values.keywords;
      if (values.colorTags.length > 0) metadata.colorTags = values.colorTags;
      if (values.copyright) metadata.copyright = values.copyright;
      if (isSingle || values.artist) metadata.artist = values.artist || null;
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

      {/* EXIF reader (single photo only) */}
      {isSingle && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <button
            onClick={exifOpen ? () => setExifOpen(false) : handleReadExif}
            disabled={exifLoading}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-60"
          >
            <span className="flex items-center gap-1.5">
              {exifLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Camera className="w-3.5 h-3.5" />
              )}
              {exifLoading ? "Leyendo EXIF..." : "Datos de cámara (EXIF)"}
            </span>
            {exifOpen ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          {exifOpen && (
            <div className="px-3 py-2 space-y-2 text-xs">
              {exifError && (
                <p className="text-red-500 dark:text-red-400">{exifError}</p>
              )}
              {exifData && (
                <>
                  {/* Camera */}
                  {(exifData.make || exifData.model) && (
                    <ExifSection title="Cámara">
                      <ExifRow label="Marca" value={exifData.make} />
                      <ExifRow label="Modelo" value={exifData.model} />
                      <ExifRow label="Lente" value={exifData.lensModel} />
                      <ExifRow label="Software" value={exifData.software} />
                    </ExifSection>
                  )}
                  {/* Exposure */}
                  {(exifData.exposureTime ||
                    exifData.fNumber ||
                    exifData.iso) && (
                    <ExifSection title="Exposición">
                      <ExifRow
                        label="Tiempo"
                        value={
                          exifData.exposureTime
                            ? `${exifData.exposureTime}s`
                            : null
                        }
                      />
                      <ExifRow
                        label="Apertura"
                        value={
                          exifData.fNumber ? `f/${exifData.fNumber}` : null
                        }
                      />
                      <ExifRow
                        label="ISO"
                        value={
                          exifData.iso != null ? String(exifData.iso) : null
                        }
                      />
                      <ExifRow label="Focal" value={exifData.focalLength} />
                      <ExifRow
                        label="Focal (35mm)"
                        value={
                          exifData.focalLengthIn35mm != null
                            ? `${exifData.focalLengthIn35mm}mm`
                            : null
                        }
                      />
                      <ExifRow
                        label="Modo exp."
                        value={exifData.exposureProgram}
                      />
                      <ExifRow
                        label="Compensación"
                        value={exifData.exposureCompensation}
                      />
                      <ExifRow label="Medición" value={exifData.meteringMode} />
                      <ExifRow
                        label="Balance blancos"
                        value={exifData.whiteBalance}
                      />
                      <ExifRow label="Flash" value={exifData.flash} />
                    </ExifSection>
                  )}
                  {/* Image */}
                  {(exifData.imageWidth || exifData.colorSpace) && (
                    <ExifSection title="Imagen">
                      <ExifRow
                        label="Dimensiones"
                        value={
                          exifData.imageWidth && exifData.imageHeight
                            ? `${exifData.imageWidth} × ${exifData.imageHeight}`
                            : null
                        }
                      />
                      <ExifRow
                        label="Orientación"
                        value={exifData.orientation}
                      />
                      <ExifRow
                        label="Color space"
                        value={exifData.colorSpace}
                      />
                    </ExifSection>
                  )}
                  {/* GPS */}
                  {(exifData.gpsLatitude != null || exifData.gpsAltitude) && (
                    <ExifSection title="GPS">
                      <ExifRow
                        label="Latitud"
                        value={
                          exifData.gpsLatitude != null
                            ? String(exifData.gpsLatitude)
                            : null
                        }
                      />
                      <ExifRow
                        label="Longitud"
                        value={
                          exifData.gpsLongitude != null
                            ? String(exifData.gpsLongitude)
                            : null
                        }
                      />
                      <ExifRow label="Altitud" value={exifData.gpsAltitude} />
                    </ExifSection>
                  )}
                  {/* Dates */}
                  {(exifData.dateTimeOriginal || exifData.createDate) && (
                    <ExifSection title="Fechas">
                      <ExifRow
                        label="Fecha original"
                        value={exifData.dateTimeOriginal}
                      />
                      <ExifRow
                        label="Fecha creación"
                        value={exifData.createDate}
                      />
                    </ExifSection>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ExifSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide text-[10px] mb-1">
        {title}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function ExifRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <span className="text-gray-500 dark:text-gray-400 shrink-0 w-28">
        {label}
      </span>
      <span className="text-gray-800 dark:text-gray-200 break-all">
        {value}
      </span>
    </div>
  );
}

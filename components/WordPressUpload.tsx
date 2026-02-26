"use client";

import { useState, useRef, useCallback } from "react";
import { useImageStore } from "@/lib/store";
import type { FieldDescriptor, FormularioGenericoHandle } from "@/types/form";
import FormularioGenerico from "./FormularioGenerico";

interface WordPressConfig extends Record<string, unknown> {
  siteUrl: string;
  username: string;
  applicationPassword: string;
}

const configFields: FieldDescriptor[] = [
  {
    name: "siteUrl",
    label: "URL del Sitio WordPress",
    type: "text",
    inputType: "url",
    placeholder: "https://tusitio.com",
  },
  {
    name: "username",
    label: "Usuario",
    type: "text",
    placeholder: "admin",
  },
  {
    name: "applicationPassword",
    label: "Application Password",
    type: "text",
    inputType: "password",
    placeholder: "xxxx xxxx xxxx xxxx xxxx xxxx",
    helperText:
      "Crea una en: WordPress Admin → Usuarios → Tu Perfil → Application Passwords",
  },
];

const configDefaults: WordPressConfig = {
  siteUrl: "",
  username: "",
  applicationPassword: "",
};

export default function WordPressUpload() {
  const { getSelectedImages } = useImageStore();
  const selectedImages = getSelectedImages();

  const configRef = useRef<FormularioGenericoHandle<WordPressConfig>>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showConfig, setShowConfig] = useState(false);

  const uploadToWordPress = useCallback(
    async (
      file: File,
      metadata: Record<string, unknown>,
      config: WordPressConfig,
    ) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", (metadata.title as string) || "");
      formData.append("alt_text", (metadata.description as string) || "");
      formData.append("caption", (metadata.description as string) || "");
      formData.append("description", (metadata.description as string) || "");

      const credentials = btoa(
        `${config.username}:${config.applicationPassword}`,
      );

      const response = await fetch(`${config.siteUrl}/wp-json/wp/v2/media`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    },
    [],
  );

  const handleUpload = async () => {
    const config = configRef.current?.getValues();
    if (!config?.siteUrl || !config?.username || !config?.applicationPassword) {
      alert("Por favor completa la configuración de WordPress");
      setShowConfig(true);
      return;
    }

    if (selectedImages.length === 0) {
      alert("No hay imágenes seleccionadas");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const total = selectedImages.length;
      let completed = 0;

      for (const image of selectedImages) {
        const response = await fetch(image.preview || "");
        const blob = await response.blob();
        const file = new File([blob], image.metadata.fileName, {
          type: "image/jpeg",
        });

        await uploadToWordPress(
          file,
          image.metadata as unknown as Record<string, unknown>,
          config as WordPressConfig,
        );

        completed++;
        setUploadProgress(Math.round((completed / total) * 100));
      }

      alert(`${completed} imágenes subidas exitosamente a WordPress`);
    } catch (error) {
      alert(
        "Error al subir a WordPress: " +
          (error instanceof Error ? error.message : "Unknown error"),
      );
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          WordPress Upload
        </h3>
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          {showConfig ? "Ocultar" : "Configurar"}
        </button>
      </div>

      {showConfig && (
        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
          <FormularioGenerico<WordPressConfig>
            ref={configRef}
            fields={configFields}
            defaultValues={configDefaults}
            onSubmit={() => {}}
            hideButtons
          />
        </div>
      )}

      {uploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>Subiendo...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={uploading || selectedImages.length === 0}
        className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
      >
        {uploading
          ? `Subiendo ${uploadProgress}%...`
          : `Subir a WordPress (${selectedImages.length})`}
      </button>

      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
        Las imágenes seleccionadas se subirán con sus metadatos actuales
      </p>
    </div>
  );
}

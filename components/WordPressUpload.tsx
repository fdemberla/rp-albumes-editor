"use client";

import { useState } from "react";
import { useImageStore } from "@/lib/store";

interface WordPressConfig {
  siteUrl: string;
  username: string;
  applicationPassword: string;
}

export default function WordPressUpload() {
  const { getSelectedImages } = useImageStore();
  const selectedImages = getSelectedImages();

  const [config, setConfig] = useState<WordPressConfig>({
    siteUrl: "",
    username: "",
    applicationPassword: "",
  });

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showConfig, setShowConfig] = useState(false);

  const uploadToWordPress = async (file: File, metadata: any) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", metadata.title || "");
    formData.append("alt_text", metadata.description || "");
    formData.append("caption", metadata.description || "");
    formData.append("description", metadata.description || "");

    const credentials = btoa(
      `${config.username}:${config.applicationPassword}`
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
  };

  const handleUpload = async () => {
    if (!config.siteUrl || !config.username || !config.applicationPassword) {
      alert("Por favor completa la configuración de WordPress");
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
        // Read file from path
        const response = await fetch(image.preview || "");
        const blob = await response.blob();
        const file = new File([blob], image.metadata.fileName, {
          type: "image/jpeg",
        });

        await uploadToWordPress(file, image.metadata);

        completed++;
        setUploadProgress(Math.round((completed / total) * 100));
      }

      alert(`${completed} imágenes subidas exitosamente a WordPress`);
    } catch (error) {
      alert(
        "Error al subir a WordPress: " +
          (error instanceof Error ? error.message : "Unknown error")
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
        <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              URL del Sitio WordPress
            </label>
            <input
              type="url"
              value={config.siteUrl}
              onChange={(e) =>
                setConfig({ ...config, siteUrl: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://tusitio.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Usuario
            </label>
            <input
              type="text"
              value={config.username}
              onChange={(e) =>
                setConfig({ ...config, username: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="admin"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Application Password
            </label>
            <input
              type="password"
              value={config.applicationPassword}
              onChange={(e) =>
                setConfig({ ...config, applicationPassword: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Crea una en: WordPress Admin → Usuarios → Tu Perfil → Application
              Passwords
            </p>
          </div>
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
        disabled={uploading || selectedImages.length === 0 || !config.siteUrl}
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

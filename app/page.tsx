"use client";

import AlbumManager from "@/components/AlbumManager";
import ServerStatus from "@/components/ServerStatus";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-[1600px] mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Editor de Metadatos
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
                Gestiona álbumes de fotos y edita metadatos.
              </p>
            </div>
            <ServerStatus />
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-4">
        <AlbumManager />
      </main>
    </div>
  );
}

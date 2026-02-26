"use client";

import { useEffect } from "react";
import { Database, Server, ServerOff } from "lucide-react";
import { useAlbumStore } from "@/lib/albumStore";

export default function ServerStatus() {
  const { dbConnected, sftpConnected, testAllConnections } = useAlbumStore();

  useEffect(() => {
    testAllConnections();
    // Re-check every 60 seconds
    const interval = setInterval(testAllConnections, 60000);
    return () => clearInterval(interval);
  }, [testAllConnections]);

  return (
    <div className="flex items-center gap-3 text-xs">
      <div
        className="flex items-center gap-1.5"
        title={
          dbConnected === null
            ? "Base de datos: verificando..."
            : dbConnected
              ? "Base de datos: conectada"
              : "Base de datos: desconectada"
        }
      >
        <Database
          className={`w-3.5 h-3.5 ${
            dbConnected === null
              ? "text-gray-400 animate-pulse"
              : dbConnected
                ? "text-green-500"
                : "text-red-500"
          }`}
        />
        <span className="text-gray-600 dark:text-gray-400">DB</span>
      </div>
      <div
        className="flex items-center gap-1.5"
        title={
          sftpConnected === null
            ? "SFTP: verificando..."
            : sftpConnected
              ? "SFTP: conectado"
              : "SFTP: desconectado"
        }
      >
        {sftpConnected === false ? (
          <ServerOff className="w-3.5 h-3.5 text-red-500" />
        ) : (
          <Server
            className={`w-3.5 h-3.5 ${
              sftpConnected === null
                ? "text-gray-400 animate-pulse"
                : "text-green-500"
            }`}
          />
        )}
        <span className="text-gray-600 dark:text-gray-400">SFTP</span>
      </div>
    </div>
  );
}

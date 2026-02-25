"use client";

import { useEffect } from "react";
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
      <div className="flex items-center gap-1.5">
        <div
          className={`w-2 h-2 rounded-full ${
            dbConnected === null
              ? "bg-gray-400 animate-pulse"
              : dbConnected
                ? "bg-green-500"
                : "bg-red-500"
          }`}
        />
        <span className="text-gray-600 dark:text-gray-400">DB</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div
          className={`w-2 h-2 rounded-full ${
            sftpConnected === null
              ? "bg-gray-400 animate-pulse"
              : sftpConnected
                ? "bg-green-500"
                : "bg-red-500"
          }`}
        />
        <span className="text-gray-600 dark:text-gray-400">SFTP</span>
      </div>
    </div>
  );
}

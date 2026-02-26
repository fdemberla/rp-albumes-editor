"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useAuthStore } from "@/lib/authStore";
import AlbumManager from "@/components/AlbumManager";
import ServerStatus from "@/components/ServerStatus";
import LoginScreen from "@/components/LoginScreen";
import UserManager from "@/components/UserManager";

export default function Home() {
  const { user, checked, loading, checkSession, logout } = useAuthStore();
  const [showAdmin, setShowAdmin] = useState(false);

  // Check for existing session on mount
  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // Show loading spinner while checking session
  if (!checked || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Verificando sesión...
          </p>
        </div>
      </div>
    );
  }

  // Not authenticated — show login
  if (!user) {
    return <LoginScreen />;
  }

  // Authenticated — show main app
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
            <div className="flex items-center gap-3">
              <ServerStatus />
              {/* User info */}
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <span className="hidden sm:inline">
                  {user.firstName} {user.lastName}
                </span>
                <span
                  className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full ${
                    user.role === "ADMIN"
                      ? "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                  }`}
                >
                  {user.role}
                </span>
              </div>
              {/* Admin button */}
              {user.role === "ADMIN" && (
                <button
                  onClick={() => setShowAdmin(!showAdmin)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    showAdmin
                      ? "bg-purple-600 text-white"
                      : "text-purple-600 dark:text-purple-400 border border-purple-300 dark:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                  }`}
                >
                  {showAdmin ? "Cerrar Admin" : "Administración"}
                </button>
              )}
              {/* Logout */}
              <button
                onClick={logout}
                className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-4">
        <AnimatePresence mode="wait">
          {showAdmin ? (
            <motion.div
              key="admin"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <UserManager onClose={() => setShowAdmin(false)} />
            </motion.div>
          ) : (
            <motion.div
              key="albums"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <AlbumManager />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

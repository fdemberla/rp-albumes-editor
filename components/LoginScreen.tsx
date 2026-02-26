"use client";

import { motion } from "motion/react";
import { Camera, AlertTriangle, X } from "lucide-react";
import { useAuthStore } from "@/lib/authStore";

export default function LoginScreen() {
  const { login, loading, error, clearError } = useAuthStore();

  const handleLogin = async () => {
    clearError();
    await login();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 space-y-8">
          {/* Logo / Title */}
          <div className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/40 rounded-2xl flex items-center justify-center mb-4">
              <Camera className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Editor de Metadatos
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Gestión de álbumes fotográficos y metadatos
            </p>
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
            >
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-red-700 dark:text-red-400">
                    {error}
                  </p>
                </div>
                <button
                  onClick={clearError}
                  className="text-red-400 hover:text-red-600 leading-none"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Login Button */}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-[#0078d4] hover:bg-[#106ebe] disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span>Iniciando sesión...</span>
              </>
            ) : (
              <>
                {/* Microsoft logo */}
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 21 21"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect x="1" y="1" width="9" height="9" fill="#F25022" />
                  <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
                  <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
                  <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
                </svg>
                <span>Iniciar sesión con Microsoft</span>
              </>
            )}
          </button>

          {/* Footer */}
          <p className="text-center text-xs text-gray-400 dark:text-gray-500">
            Usa tu cuenta corporativa de Microsoft para acceder.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

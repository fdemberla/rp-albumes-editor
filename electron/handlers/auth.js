/**
 * IPC handlers for authentication.
 *
 * Channels:
 *   auth:login      — interactive Entra ID login
 *   auth:logout     — clear session
 *   auth:getSession — silent session check (app startup)
 */

const { ipcMain } = require("electron");
const authService = require("../services/auth");

// We share the same Prisma instance from albums handler via getPrisma()
let getPrisma;

/**
 * Resolve the current user from the DB by email.
 * Returns { user, fotografo } or null.
 */
async function resolveUser(email) {
  const db = getPrisma();
  const user = await db.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (!user) return null;

  // Look up linked fotografo by email
  const fotografo = await db.fotografo.findUnique({
    where: { email: email.toLowerCase() },
  });

  return { user, fotografo: fotografo || null };
}

function registerAuthHandlers(getPrismaFn) {
  getPrisma = getPrismaFn;

  // ─── Login ────────────────────────────────────────────────────────────
  ipcMain.handle("auth:login", async () => {
    try {
      const msalResult = await authService.login();

      if (!msalResult || !msalResult.account) {
        return { success: false, error: "No se pudo autenticar." };
      }

      const email = (
        msalResult.account.username ||
        msalResult.account.upn ||
        ""
      ).toLowerCase();

      if (!email) {
        return { success: false, error: "No se encontró email en la cuenta." };
      }

      const resolved = await resolveUser(email);
      if (!resolved) {
        // Clear the session so they aren't stuck
        await authService.logout();
        return {
          success: false,
          error:
            "Usuario no autorizado. Contacta al administrador para obtener acceso.",
        };
      }

      return {
        success: true,
        user: resolved.user,
        fotografo: resolved.fotografo,
      };
    } catch (err) {
      console.error("[Auth] Login error:", err);
      return { success: false, error: err.message };
    }
  });

  // ─── Logout ───────────────────────────────────────────────────────────
  ipcMain.handle("auth:logout", async () => {
    try {
      await authService.logout();
      return { success: true };
    } catch (err) {
      console.error("[Auth] Logout error:", err);
      return { success: false, error: err.message };
    }
  });

  // ─── Get Session (silent — for app startup) ───────────────────────────
  ipcMain.handle("auth:getSession", async () => {
    try {
      const msalResult = await authService.getSession();
      if (!msalResult || !msalResult.account) {
        return { success: false };
      }

      const email = (
        msalResult.account.username ||
        msalResult.account.upn ||
        ""
      ).toLowerCase();

      if (!email) return { success: false };

      const resolved = await resolveUser(email);
      if (!resolved) return { success: false };

      return {
        success: true,
        user: resolved.user,
        fotografo: resolved.fotografo,
      };
    } catch {
      return { success: false };
    }
  });
}

module.exports = { registerAuthHandlers, resolveUser };

/**
 * IPC handlers for user management (admin only).
 *
 * Channels:
 *   user:list    — list all users
 *   user:create  — create a new user
 *   user:update  — update a user
 *   user:delete  — delete a user
 */

const { ipcMain } = require("electron");
const authService = require("../services/auth");

let getPrisma;

/**
 * Resolve the current session and verify the caller is an ADMIN.
 * Returns the admin user or throws.
 */
async function requireAdmin() {
  const msalResult = await authService.getSession();
  if (!msalResult || !msalResult.account) {
    throw new Error("No autorizado — sesión no válida.");
  }

  const email = (
    msalResult.account.username ||
    msalResult.account.upn ||
    ""
  ).toLowerCase();
  const db = getPrisma();
  const user = await db.user.findUnique({ where: { email } });

  if (!user) throw new Error("No autorizado — usuario no encontrado.");
  if (user.role !== "ADMIN") {
    throw new Error("No autorizado — se requieren permisos de administrador.");
  }

  return user;
}

function registerUserHandlers(getPrismaFn) {
  getPrisma = getPrismaFn;

  // ─── List Users ───────────────────────────────────────────────────────
  ipcMain.handle("user:list", async () => {
    try {
      await requireAdmin();
      const db = getPrisma();
      const users = await db.user.findMany({
        orderBy: { firstName: "asc" },
        include: { fotografo: true },
      });
      return { success: true, users };
    } catch (err) {
      console.error("[User] List error:", err);
      return { success: false, error: err.message };
    }
  });

  // ─── Create User ─────────────────────────────────────────────────────
  ipcMain.handle("user:create", async (_event, input) => {
    try {
      await requireAdmin();
      const db = getPrisma();

      // Validate
      if (!input.email || !input.firstName || !input.lastName) {
        return {
          success: false,
          error: "Email, nombre y apellido son requeridos.",
        };
      }

      // Check for duplicate email
      const existing = await db.user.findUnique({
        where: { email: input.email.toLowerCase() },
      });
      if (existing) {
        return {
          success: false,
          error: "Ya existe un usuario con ese email.",
        };
      }

      const user = await db.user.create({
        data: {
          email: input.email.toLowerCase(),
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          role: input.role === "ADMIN" ? "ADMIN" : "USER",
        },
      });

      return { success: true, user };
    } catch (err) {
      console.error("[User] Create error:", err);
      return { success: false, error: err.message };
    }
  });

  // ─── Update User ─────────────────────────────────────────────────────
  ipcMain.handle("user:update", async (_event, userId, input) => {
    try {
      const admin = await requireAdmin();
      const db = getPrisma();

      // Prevent an admin from removing their own admin role
      if (userId === admin.id && input.role && input.role !== "ADMIN") {
        return {
          success: false,
          error: "No puedes remover tu propio rol de administrador.",
        };
      }

      const data = {};
      if (input.firstName !== undefined)
        data.firstName = input.firstName.trim();
      if (input.lastName !== undefined) data.lastName = input.lastName.trim();
      if (input.email !== undefined) data.email = input.email.toLowerCase();
      if (input.role !== undefined) data.role = input.role;

      const user = await db.user.update({
        where: { id: userId },
        data,
      });

      return { success: true, user };
    } catch (err) {
      console.error("[User] Update error:", err);
      return { success: false, error: err.message };
    }
  });

  // ─── Delete User ─────────────────────────────────────────────────────
  ipcMain.handle("user:delete", async (_event, userId) => {
    try {
      const admin = await requireAdmin();
      const db = getPrisma();

      if (userId === admin.id) {
        return {
          success: false,
          error: "No puedes eliminar tu propia cuenta.",
        };
      }

      await db.user.delete({ where: { id: userId } });
      return { success: true };
    } catch (err) {
      console.error("[User] Delete error:", err);
      return { success: false, error: err.message };
    }
  });
}

module.exports = { registerUserHandlers };

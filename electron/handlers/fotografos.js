/**
 * IPC handlers for Fotografo management.
 *
 * Channels:
 *   fotografo:list          — list / search fotografos
 *   fotografo:create        — create a new fotografo
 *   fotografo:update        — update a fotografo
 *   fotografo:delete        — delete a fotografo (if no albums reference it)
 *   fotografo:getByEmail    — look up a fotografo by email
 */

const { ipcMain } = require("electron");

let getPrisma;

function registerFotografoHandlers(getPrismaFn) {
  getPrisma = getPrismaFn;

  // ─── List / Search Fotografos ──────────────────────────────────────────
  ipcMain.handle("fotografo:list", async (_event, search) => {
    try {
      const db = getPrisma();

      const where = {};
      if (search && search.trim()) {
        const term = search.trim();
        where.OR = [
          { firstName: { contains: term, mode: "insensitive" } },
          { lastName: { contains: term, mode: "insensitive" } },
          { email: { contains: term, mode: "insensitive" } },
        ];
      }

      const fotografos = await db.fotografo.findMany({
        where,
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
        include: { user: { select: { id: true, email: true, role: true } } },
      });

      return { success: true, fotografos };
    } catch (err) {
      console.error("[Fotografo] List error:", err);
      return { success: false, error: err.message };
    }
  });

  // ─── Create Fotografo ────────────────────────────────────────────────
  ipcMain.handle("fotografo:create", async (_event, input) => {
    try {
      const db = getPrisma();

      if (!input.firstName || !input.lastName) {
        return {
          success: false,
          error: "Nombre y apellido son requeridos.",
        };
      }

      // If email provided, check uniqueness
      if (input.email) {
        const existing = await db.fotografo.findUnique({
          where: { email: input.email.toLowerCase() },
        });
        if (existing) {
          return {
            success: false,
            error: "Ya existe un fotógrafo con ese email.",
          };
        }
      }

      const data = {
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        email: input.email ? input.email.toLowerCase() : null,
      };

      // Link to user if userId provided
      if (input.userId) {
        data.userId = input.userId;
      } else if (input.email) {
        // Auto-link if a user with the same email exists
        const matchingUser = await db.user.findUnique({
          where: { email: input.email.toLowerCase() },
        });
        if (matchingUser) {
          // Check the user isn't already linked to another fotografo
          const existingLink = await db.fotografo.findUnique({
            where: { userId: matchingUser.id },
          });
          if (!existingLink) {
            data.userId = matchingUser.id;
          }
        }
      }

      const fotografo = await db.fotografo.create({
        data,
        include: { user: { select: { id: true, email: true, role: true } } },
      });

      return { success: true, fotografo };
    } catch (err) {
      console.error("[Fotografo] Create error:", err);
      return { success: false, error: err.message };
    }
  });

  // ─── Update Fotografo ────────────────────────────────────────────────
  ipcMain.handle("fotografo:update", async (_event, fotografoId, input) => {
    try {
      const db = getPrisma();

      const data = {};
      if (input.firstName !== undefined)
        data.firstName = input.firstName.trim();
      if (input.lastName !== undefined) data.lastName = input.lastName.trim();
      if (input.email !== undefined)
        data.email = input.email ? input.email.toLowerCase() : null;
      if (input.userId !== undefined) data.userId = input.userId || null;

      const fotografo = await db.fotografo.update({
        where: { id: fotografoId },
        data,
        include: { user: { select: { id: true, email: true, role: true } } },
      });

      return { success: true, fotografo };
    } catch (err) {
      console.error("[Fotografo] Update error:", err);
      return { success: false, error: err.message };
    }
  });

  // ─── Delete Fotografo ────────────────────────────────────────────────
  ipcMain.handle("fotografo:delete", async (_event, fotografoId) => {
    try {
      const db = getPrisma();

      // Check if any albums reference this fotografo
      const albumCount = await db.album.count({
        where: { photographerId: fotografoId },
      });
      if (albumCount > 0) {
        return {
          success: false,
          error: `No se puede eliminar: ${albumCount} álbum${albumCount !== 1 ? "es" : ""} usan este fotógrafo.`,
        };
      }

      await db.fotografo.delete({ where: { id: fotografoId } });
      return { success: true };
    } catch (err) {
      console.error("[Fotografo] Delete error:", err);
      return { success: false, error: err.message };
    }
  });

  // ─── Get By Email ────────────────────────────────────────────────────
  ipcMain.handle("fotografo:getByEmail", async (_event, email) => {
    try {
      const db = getPrisma();
      const fotografo = await db.fotografo.findUnique({
        where: { email: email.toLowerCase() },
        include: { user: { select: { id: true, email: true, role: true } } },
      });

      return { success: true, fotografo: fotografo || null };
    } catch (err) {
      console.error("[Fotografo] GetByEmail error:", err);
      return { success: false, error: err.message };
    }
  });
}

module.exports = { registerFotografoHandlers };

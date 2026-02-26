"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Check, ChevronLeft } from "lucide-react";
import { useAuthStore } from "@/lib/authStore";
import type {
  User,
  Role,
  UserCreateInput,
  Fotografo,
  FotografoCreateInput,
} from "@/types/electron";
import type { FieldDescriptor } from "@/types/form";
import FormularioGenerico from "./FormularioGenerico";

// ─── Sub-views ──────────────────────────────────────────────────────────────

type AdminView = "users" | "fotografos";

export default function UserManager({ onClose }: { onClose: () => void }) {
  const { user: currentUser } = useAuthStore();
  const [view, setView] = useState<AdminView>("users");

  if (!currentUser || currentUser.role !== "ADMIN") return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onClose}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md flex items-center gap-1"
        >
          <ChevronLeft className="w-4 h-4" /> Volver
        </button>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Administración
        </h2>
      </div>

      {/* Tab Toggle */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 w-fit">
        <button
          onClick={() => setView("users")}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
            view === "users"
              ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          }`}
        >
          Usuarios
        </button>
        <button
          onClick={() => setView("fotografos")}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
            view === "fotografos"
              ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          }`}
        >
          Fotógrafos
        </button>
      </div>

      <AnimatePresence mode="wait">
        {view === "users" ? (
          <motion.div
            key="users"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
          >
            <UsersPanel currentUser={currentUser} />
          </motion.div>
        ) : (
          <motion.div
            key="fotografos"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
          >
            <FotografosPanel />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Users Panel
// ═══════════════════════════════════════════════════════════════════════════════

function UsersPanel({ currentUser }: { currentUser: User }) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    const result = await window.electronAPI.listUsers();
    if (result.success && result.users) {
      setUsers(result.users);
    } else {
      setError(result.error || "Error al cargar usuarios");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (userId: string) => {
    if (userId === currentUser.id) return;
    const confirmed = window.confirm(
      "¿Estás seguro de que deseas eliminar este usuario?",
    );
    if (!confirmed) return;

    const result = await window.electronAPI.deleteUser(userId);
    if (result.success) {
      fetchUsers();
    } else {
      setError(result.error || "Error al eliminar usuario");
    }
  };

  const handleSave = async (input: UserCreateInput) => {
    let result;
    if (editingUser) {
      result = await window.electronAPI.updateUser(editingUser.id, input);
    } else {
      result = await window.electronAPI.createUser(input);
    }

    if (result.success) {
      setShowForm(false);
      setEditingUser(null);
      fetchUsers();
    } else {
      setError(result.error || "Error al guardar usuario");
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <div className="flex items-center justify-between">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-700 text-sm"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {users.length} usuario{users.length !== 1 ? "s" : ""}
        </p>
        <button
          onClick={() => {
            setEditingUser(null);
            setShowForm(true);
          }}
          className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          + Agregar Usuario
        </button>
      </div>

      {showForm && (
        <UserForm
          user={editingUser}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingUser(null);
          }}
        />
      )}

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                <th className="text-left px-4 py-2 font-medium text-gray-600 dark:text-gray-300">
                  Nombre
                </th>
                <th className="text-left px-4 py-2 font-medium text-gray-600 dark:text-gray-300">
                  Email
                </th>
                <th className="text-left px-4 py-2 font-medium text-gray-600 dark:text-gray-300">
                  Rol
                </th>
                <th className="text-right px-4 py-2 font-medium text-gray-600 dark:text-gray-300">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-gray-100 dark:border-gray-700 last:border-0"
                >
                  <td className="px-4 py-2.5 text-gray-900 dark:text-white">
                    {u.firstName} {u.lastName}
                    {u.id === currentUser.id && (
                      <span className="ml-2 text-xs text-blue-500">(tú)</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">
                    {u.email}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        u.role === "ADMIN"
                          ? "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingUser(u);
                          setShowForm(true);
                        }}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Editar
                      </button>
                      {u.id !== currentUser.id && (
                        <button
                          onClick={() => handleDelete(u.id)}
                          className="text-xs text-red-600 dark:text-red-400 hover:underline"
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── User Form ──────────────────────────────────────────────────────────────

function UserForm({
  user,
  onSave,
  onCancel,
}: {
  user: User | null;
  onSave: (input: UserCreateInput) => void;
  onCancel: () => void;
}) {
  const defaultValues: UserCreateInput & Record<string, unknown> = {
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
    role: user?.role || "USER",
  };

  const fields: FieldDescriptor[] = [
    {
      name: "firstName",
      label: "Nombre",
      type: "text",
      required: true,
      colSpan: 1,
      validate: (v) =>
        !(v as string)?.trim() ? "El nombre es obligatorio" : undefined,
    },
    {
      name: "lastName",
      label: "Apellido",
      type: "text",
      required: true,
      colSpan: 1,
      validate: (v) =>
        !(v as string)?.trim() ? "El apellido es obligatorio" : undefined,
    },
    {
      name: "email",
      label: "Email",
      type: "text",
      inputType: "email",
      required: true,
      validate: (v) =>
        !(v as string)?.trim() ? "El email es obligatorio" : undefined,
    },
    {
      name: "role",
      label: "Rol",
      type: "select",
      options: [
        { value: "USER", label: "Usuario" },
        { value: "ADMIN", label: "Administrador" },
      ],
    },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <FormularioGenerico
        fields={fields}
        defaultValues={defaultValues}
        onSubmit={(values) => {
          onSave({
            email: (values.email as string).trim(),
            firstName: (values.firstName as string).trim(),
            lastName: (values.lastName as string).trim(),
            role: values.role as Role,
          });
        }}
        title={user ? "Editar Usuario" : "Nuevo Usuario"}
        submitLabel={user ? "Guardar" : "Crear"}
        cancelLabel="Cancelar"
        onCancel={onCancel}
        columns={2}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Fotografos Panel
// ═══════════════════════════════════════════════════════════════════════════════

function FotografosPanel() {
  const [fotografos, setFotografos] = useState<Fotografo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingFotografo, setEditingFotografo] = useState<Fotografo | null>(
    null,
  );
  const [search, setSearch] = useState("");

  const fetchFotografos = async (searchTerm?: string) => {
    setLoading(true);
    const result = await window.electronAPI.listFotografos(searchTerm);
    if (result.success && result.fotografos) {
      setFotografos(result.fotografos);
    } else {
      setError(result.error || "Error al cargar fotógrafos");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchFotografos();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFotografos(search || undefined);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleDelete = async (fotografoId: string) => {
    const confirmed = window.confirm(
      "¿Estás seguro de que deseas eliminar este fotógrafo?",
    );
    if (!confirmed) return;

    const result = await window.electronAPI.deleteFotografo(fotografoId);
    if (result.success) {
      fetchFotografos(search || undefined);
    } else {
      setError(result.error || "Error al eliminar fotógrafo");
    }
  };

  const handleSave = async (input: FotografoCreateInput) => {
    let result;
    if (editingFotografo) {
      result = await window.electronAPI.updateFotografo(
        editingFotografo.id,
        input,
      );
    } else {
      result = await window.electronAPI.createFotografo(input);
    }

    if (result.success) {
      setShowForm(false);
      setEditingFotografo(null);
      fetchFotografos(search || undefined);
    } else {
      setError(result.error || "Error al guardar fotógrafo");
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <div className="flex items-center justify-between">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-700 text-sm"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Buscar fotógrafo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
        <button
          onClick={() => {
            setEditingFotografo(null);
            setShowForm(true);
          }}
          className="px-4 py-1.5 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 whitespace-nowrap"
        >
          + Agregar Fotógrafo
        </button>
      </div>

      {showForm && (
        <FotografoForm
          fotografo={editingFotografo}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingFotografo(null);
          }}
        />
      )}

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : fotografos.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p className="text-sm">
            {search
              ? "No se encontraron fotógrafos."
              : "No hay fotógrafos registrados."}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                <th className="text-left px-4 py-2 font-medium text-gray-600 dark:text-gray-300">
                  Nombre
                </th>
                <th className="text-left px-4 py-2 font-medium text-gray-600 dark:text-gray-300">
                  Email
                </th>
                <th className="text-left px-4 py-2 font-medium text-gray-600 dark:text-gray-300">
                  Usuario vinculado
                </th>
                <th className="text-right px-4 py-2 font-medium text-gray-600 dark:text-gray-300">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {fotografos.map((f) => (
                <tr
                  key={f.id}
                  className="border-b border-gray-100 dark:border-gray-700 last:border-0"
                >
                  <td className="px-4 py-2.5 text-gray-900 dark:text-white">
                    {f.firstName} {f.lastName}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">
                    {f.email || "—"}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">
                    {f.user ? (
                      <span className="text-green-600 dark:text-green-400 text-xs flex items-center gap-1">
                        <Check className="w-3 h-3" /> {f.user.email}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">
                        Sin vincular
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingFotografo(f);
                          setShowForm(true);
                        }}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(f.id)}
                        className="text-xs text-red-600 dark:text-red-400 hover:underline"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Fotografo Form ─────────────────────────────────────────────────────────

function FotografoForm({
  fotografo,
  onSave,
  onCancel,
}: {
  fotografo: Fotografo | null;
  onSave: (input: FotografoCreateInput) => void;
  onCancel: () => void;
}) {
  const defaultValues: FotografoCreateInput & Record<string, unknown> = {
    firstName: fotografo?.firstName || "",
    lastName: fotografo?.lastName || "",
    email: fotografo?.email || "",
  };

  const fields: FieldDescriptor[] = [
    {
      name: "firstName",
      label: "Nombre",
      type: "text",
      required: true,
      colSpan: 1,
      validate: (v) =>
        !(v as string)?.trim() ? "El nombre es obligatorio" : undefined,
    },
    {
      name: "lastName",
      label: "Apellido",
      type: "text",
      required: true,
      colSpan: 1,
      validate: (v) =>
        !(v as string)?.trim() ? "El apellido es obligatorio" : undefined,
    },
    {
      name: "email",
      label: "Email",
      type: "text",
      inputType: "email",
      placeholder: "opcional — para vincular con usuario",
    },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <FormularioGenerico
        fields={fields}
        defaultValues={defaultValues}
        onSubmit={(values) => {
          onSave({
            firstName: (values.firstName as string).trim(),
            lastName: (values.lastName as string).trim(),
            email: (values.email as string).trim() || undefined,
          });
        }}
        title={fotografo ? "Editar Fotógrafo" : "Nuevo Fotógrafo"}
        submitLabel={fotografo ? "Guardar" : "Crear"}
        cancelLabel="Cancelar"
        onCancel={onCancel}
        columns={2}
      />
    </div>
  );
}

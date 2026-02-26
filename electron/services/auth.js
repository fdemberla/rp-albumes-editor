/**
 * Microsoft Entra ID (Azure AD) authentication service using MSAL Node.
 *
 * Uses ConfidentialClientApplication with client_secret + authorization code
 * flow via system browser. The token cache is persisted to disk so users
 * stay logged in across app restarts.
 */

const msal = require("@azure/msal-node");
const path = require("path");
const http = require("http");
const { app } = require("electron");
const fs = require("fs");

// ─── Configuration ──────────────────────────────────────────────────────────

const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID;
const AZURE_CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;
const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID;

const AUTHORITY = `https://login.microsoftonline.com/${AZURE_TENANT_ID}`;
const SCOPES = ["User.Read"]; // MS Graph basic profile

// Path for the persistent token cache
const CACHE_FILE = path.join(app.getPath("userData"), "msal-token-cache.json");

// ─── MSAL Application ──────────────────────────────────────────────────────

let msalApp = null;

/**
 * Initialise the MSAL ConfidentialClientApplication (lazy singleton).
 * Loads the persisted token cache from disk if it exists.
 */
async function getMsalApp() {
  if (msalApp) return msalApp;

  if (!AZURE_CLIENT_ID || !AZURE_TENANT_ID || !AZURE_CLIENT_SECRET) {
    throw new Error(
      "AZURE_CLIENT_ID, AZURE_CLIENT_SECRET and AZURE_TENANT_ID must be set in the environment",
    );
  }

  const config = {
    auth: {
      clientId: AZURE_CLIENT_ID,
      authority: AUTHORITY,
      clientSecret: AZURE_CLIENT_SECRET,
    },
    cache: {
      cachePlugin: createCachePlugin(),
    },
  };

  msalApp = new msal.ConfidentialClientApplication(config);
  return msalApp;
}

// ─── Persistent cache plugin (file-based) ───────────────────────────────────

function createCachePlugin() {
  const beforeCacheAccess = async (cacheContext) => {
    try {
      if (fs.existsSync(CACHE_FILE)) {
        const data = fs.readFileSync(CACHE_FILE, "utf8");
        cacheContext.tokenCache.deserialize(data);
      }
    } catch (err) {
      console.warn("[Auth] Failed to read token cache:", err.message);
    }
  };

  const afterCacheAccess = async (cacheContext) => {
    if (cacheContext.cacheHasChanged) {
      try {
        fs.writeFileSync(CACHE_FILE, cacheContext.tokenCache.serialize());
      } catch (err) {
        console.warn("[Auth] Failed to write token cache:", err.message);
      }
    }
  };

  return { beforeCacheAccess, afterCacheAccess };
}

// ─── Public API ─────────────────────────────────────────────────────────────

const REDIRECT_PORT = 51892;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/auth/callback`;

/**
 * Interactive login — opens the system browser for Entra ID SSO.
 * Spins up a temporary loopback HTTP server to capture the authorization code,
 * then exchanges it for tokens using acquireTokenByCode.
 */
async function login() {
  const cca = await getMsalApp();

  // Generate the auth URL
  const authCodeUrlParams = {
    scopes: SCOPES,
    redirectUri: REDIRECT_URI,
  };
  const authUrl = await cca.getAuthCodeUrl(authCodeUrlParams);

  // Wait for the auth code via a temporary loopback server
  const code = await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://localhost:${REDIRECT_PORT}`);
      const authCode = url.searchParams.get("code");
      const error = url.searchParams.get("error");
      const errorDescription = url.searchParams.get("error_description");

      if (authCode) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(
          "<html><body style='font-family:sans-serif;text-align:center;margin-top:80px'>" +
            "<h1>✅ Inicio de sesión exitoso</h1>" +
            "<p>Puedes cerrar esta ventana.</p>" +
            "</body></html>",
        );
        server.close();
        resolve(authCode);
      } else if (error) {
        res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
        res.end(
          "<html><body style='font-family:sans-serif;text-align:center;margin-top:80px'>" +
            `<h1 style='color:red'>❌ Error al iniciar sesión</h1>` +
            `<p>${errorDescription || error}</p>` +
            "</body></html>",
        );
        server.close();
        reject(new Error(errorDescription || error));
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    server.listen(REDIRECT_PORT, () => {
      // Open the auth URL in the default browser
      const { shell } = require("electron");
      shell.openExternal(authUrl);
    });

    // Timeout after 2 minutes
    setTimeout(() => {
      server.close();
      reject(new Error("Tiempo de espera agotado para la autenticación."));
    }, 120000);
  });

  // Exchange the authorization code for tokens
  const tokenRequest = {
    code,
    scopes: SCOPES,
    redirectUri: REDIRECT_URI,
  };

  const result = await cca.acquireTokenByCode(tokenRequest);
  return result;
}

/**
 * Try to acquire a token silently from the cache.
 * Returns the AuthenticationResult if a valid cached session exists, or null.
 */
async function getSession() {
  const cca = await getMsalApp();
  const cache = cca.getTokenCache();
  const accounts = await cache.getAllAccounts();

  if (!accounts || accounts.length === 0) return null;

  try {
    const result = await cca.acquireTokenSilent({
      account: accounts[0],
      scopes: SCOPES,
    });
    return result;
  } catch {
    // Token expired / invalid — user must re-login
    return null;
  }
}

/**
 * Logout — removes the account from the MSAL cache.
 */
async function logout() {
  const cca = await getMsalApp();
  const cache = cca.getTokenCache();
  const accounts = await cache.getAllAccounts();

  for (const account of accounts) {
    await cache.removeAccount(account);
  }

  // Also delete the cache file
  try {
    if (fs.existsSync(CACHE_FILE)) fs.unlinkSync(CACHE_FILE);
  } catch {
    // ignore
  }
}

module.exports = { login, logout, getSession };

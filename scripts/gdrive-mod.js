/**
 * Upload / manage mod jars on Google Drive via service account or OAuth refresh token.
 * No googleapis dependency — uses Node crypto + https.
 */
"use strict";

const fs = require("fs");
const crypto = require("crypto");
const https = require("https");

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

function readServiceAccount() {
  const rawJson = String(process.env.GDRIVE_SERVICE_ACCOUNT_JSON || "").trim();
  if (rawJson) {
    return JSON.parse(rawJson);
  }
  const file = String(process.env.GDRIVE_SERVICE_ACCOUNT_FILE || "").trim();
  if (file && fs.existsSync(file)) {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  }
  return null;
}

function hasDriveUploadCredentials() {
  if (readServiceAccount()) return true;
  return Boolean(
    process.env.GDRIVE_OAUTH_CLIENT_ID &&
      process.env.GDRIVE_OAUTH_CLIENT_SECRET &&
      process.env.GDRIVE_OAUTH_REFRESH_TOKEN
  );
}

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function httpsRequest(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(
      {
        protocol: u.protocol,
        hostname: u.hostname,
        port: u.port || 443,
        path: u.pathname + u.search,
        method: options.method || "GET",
        headers: options.headers || {},
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const buf = Buffer.concat(chunks);
          const text = buf.toString("utf8");
          let json = null;
          try {
            json = JSON.parse(text);
          } catch {
            json = null;
          }
          resolve({
            status: res.statusCode || 0,
            headers: res.headers,
            buffer: buf,
            text,
            json,
          });
        });
      }
    );
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

async function getAccessTokenFromServiceAccount(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: DRIVE_SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    })
  );
  const unsigned = `${header}.${claim}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = signer
    .sign(sa.private_key)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  const assertion = `${unsigned}.${signature}`;
  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  }).toString();
  const res = await httpsRequest(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": Buffer.byteLength(body),
    },
  }, body);
  if (res.status >= 300 || !res.json?.access_token) {
    throw new Error(
      res.json?.error_description ||
        res.json?.error ||
        `Drive token HTTP ${res.status}`
    );
  }
  return res.json.access_token;
}

async function getAccessTokenFromOAuthRefresh() {
  const body = new URLSearchParams({
    client_id: process.env.GDRIVE_OAUTH_CLIENT_ID,
    client_secret: process.env.GDRIVE_OAUTH_CLIENT_SECRET,
    refresh_token: process.env.GDRIVE_OAUTH_REFRESH_TOKEN,
    grant_type: "refresh_token",
  }).toString();
  const res = await httpsRequest(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": Buffer.byteLength(body),
    },
  }, body);
  if (res.status >= 300 || !res.json?.access_token) {
    throw new Error(
      res.json?.error_description ||
        res.json?.error ||
        `OAuth refresh HTTP ${res.status}`
    );
  }
  return res.json.access_token;
}

async function getAccessToken() {
  const sa = readServiceAccount();
  if (sa) return getAccessTokenFromServiceAccount(sa);
  if (
    process.env.GDRIVE_OAUTH_CLIENT_ID &&
    process.env.GDRIVE_OAUTH_CLIENT_SECRET &&
    process.env.GDRIVE_OAUTH_REFRESH_TOKEN
  ) {
    return getAccessTokenFromOAuthRefresh();
  }
  throw new Error(
    "Нет учётных данных Google Drive. Задайте GDRIVE_SERVICE_ACCOUNT_JSON (или FILE) либо OAuth refresh token"
  );
}

async function driveApi(method, pathAndQuery, { token, body, headers } = {}) {
  const url = pathAndQuery.startsWith("http")
    ? pathAndQuery
    : `https://www.googleapis.com${pathAndQuery}`;
  const payload = body == null ? null : Buffer.isBuffer(body) ? body : Buffer.from(body);
  const res = await httpsRequest(
    url,
    {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(payload ? { "Content-Length": payload.length } : {}),
        ...(headers || {}),
      },
    },
    payload
  );
  if (res.status >= 300) {
    const msg =
      res.json?.error?.message ||
      res.json?.error_description ||
      res.text?.slice(0, 240) ||
      `Drive API HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return res;
}

async function listFilesInFolder(token, folderId, fileName) {
  const q = [
    `'${folderId}' in parents`,
    "trashed = false",
    fileName ? `name = '${String(fileName).replace(/'/g, "\\'")}'` : null,
  ]
    .filter(Boolean)
    .join(" and ");
  const res = await driveApi(
    "GET",
    `/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)&pageSize=50&supportsAllDrives=true&includeItemsFromAllDrives=true`,
    { token }
  );
  return Array.isArray(res.json?.files) ? res.json.files : [];
}

async function deleteFile(token, fileId) {
  await driveApi("DELETE", `/drive/v3/files/${encodeURIComponent(fileId)}?supportsAllDrives=true`, {
    token,
  });
}

async function makeAnyoneReader(token, fileId) {
  try {
    await driveApi("POST", `/drive/v3/files/${encodeURIComponent(fileId)}/permissions?supportsAllDrives=true`, {
      token,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: "reader",
        type: "anyone",
        allowFileDiscovery: false,
      }),
    });
  } catch (err) {
    // already public / insufficient permission — keep going if file exists
    if (!/already|exists|403|404/i.test(String(err.message || ""))) {
      console.warn("Drive make public:", err.message);
    }
  }
}

async function uploadModJar({
  buffer,
  fileName,
  folderId,
  mimeType = "application/java-archive",
}) {
  if (!folderId) throw new Error("Не задан ID папки Google Drive");
  if (!buffer?.length) throw new Error("Пустой файл");
  const token = await getAccessToken();

  // Remove previous jars with the same name in the folder
  try {
    const existing = await listFilesInFolder(token, folderId, fileName);
    for (const f of existing) {
      try {
        await deleteFile(token, f.id);
      } catch (err) {
        console.warn("Drive delete old mod:", err.message);
      }
    }
  } catch (err) {
    console.warn("Drive list old mods:", err.message);
  }

  const boundary = `genesis_mod_${Date.now().toString(36)}`;
  const meta = JSON.stringify({
    name: fileName,
    parents: [folderId],
  });
  const preamble = Buffer.from(
    `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${meta}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: ${mimeType}\r\n\r\n`
  );
  const closing = Buffer.from(`\r\n--${boundary}--\r\n`);
  const body = Buffer.concat([preamble, buffer, closing]);

  const res = await driveApi(
    "POST",
    `/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,webViewLink,webContentLink`,
    {
      token,
      headers: {
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );

  const fileId = String(res.json?.id || "");
  if (!fileId) throw new Error("Drive не вернул id файла");

  await makeAnyoneReader(token, fileId);

  return {
    id: fileId,
    name: String(res.json?.name || fileName),
    webViewLink: res.json?.webViewLink || null,
    webContentLink: res.json?.webContentLink || null,
    downloadUrl: `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`,
  };
}

function httpsGetText(url, hops = 0) {
  return new Promise((resolve, reject) => {
    if (hops > 6) {
      reject(new Error("Drive redirect loop"));
      return;
    }
    const req = https.get(
      url,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml",
        },
      },
      (res) => {
        if (
          [301, 302, 303, 307, 308].includes(res.statusCode) &&
          res.headers.location
        ) {
          res.resume();
          const next = res.headers.location.startsWith("http")
            ? res.headers.location
            : new URL(res.headers.location, url).href;
          httpsGetText(next, hops + 1).then(resolve, reject);
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          resolve({
            status: res.statusCode || 0,
            text: Buffer.concat(chunks).toString("utf8"),
          });
        });
      }
    );
    req.on("error", reject);
  });
}

function parseJarsFromDriveHtml(html) {
  const text = String(html || "");
  /** @type {Map<string, { id: string, name: string }>} */
  const byId = new Map();

  const entryRe =
    /\/file\/d\/([a-zA-Z0-9_-]{10,})\/(?:view|preview)[^"'<]*[\s\S]{0,500}?flip-entry-title[^>]*>([^<]+)/gi;
  let m;
  while ((m = entryRe.exec(text))) {
    const id = m[1];
    const name = String(m[2] || "").trim();
    if (/\.jar$/i.test(name)) byId.set(id, { id, name });
  }

  // Fallback: ids + nearby .jar names from JSON blobs in the page
  const jsonJarRe =
    /"(?:title|name|fileName)"\s*:\s*"([^"]+\.jar)"[\s\S]{0,240}?"id"\s*:\s*"([a-zA-Z0-9_-]{10,})"/gi;
  while ((m = jsonJarRe.exec(text))) {
    byId.set(m[2], { id: m[2], name: m[1] });
  }
  const jsonJarRe2 =
    /"id"\s*:\s*"([a-zA-Z0-9_-]{10,})"[\s\S]{0,240}?"(?:title|name|fileName)"\s*:\s*"([^"]+\.jar)"/gi;
  while ((m = jsonJarRe2.exec(text))) {
    byId.set(m[1], { id: m[1], name: m[2] });
  }

  return [...byId.values()];
}

async function listJarsViaPublicFolderPage(folderId) {
  const urls = [
    `https://drive.google.com/embeddedfolderview?id=${encodeURIComponent(folderId)}`,
    `https://drive.google.com/drive/folders/${encodeURIComponent(folderId)}?usp=sharing`,
  ];
  /** @type {Map<string, { id: string, name: string }>} */
  const found = new Map();
  let lastErr = null;
  for (const url of urls) {
    try {
      const res = await httpsGetText(url);
      if (res.status >= 400) {
        lastErr = new Error(`Drive folder HTTP ${res.status}`);
        continue;
      }
      for (const f of parseJarsFromDriveHtml(res.text)) {
        found.set(f.id, f);
      }
      if (found.size) break;
    } catch (err) {
      lastErr = err;
    }
  }
  if (!found.size && lastErr) throw lastErr;
  return [...found.values()];
}

async function listJarsViaApi(folderId) {
  const token = await getAccessToken();
  const files = await listFilesInFolder(token, folderId, null);
  return files
    .filter((f) => /\.jar$/i.test(String(f.name || "")))
    .map((f) => ({ id: String(f.id), name: String(f.name) }));
}

/**
 * Find the single (or newest) .jar in the shared Drive folder.
 * Works with a public folder page; uses service account if configured.
 */
async function findModJarInFolder(folderId) {
  if (!folderId) throw new Error("Не задан ID папки Google Drive");

  let jars = [];
  if (hasDriveUploadCredentials()) {
    try {
      jars = await listJarsViaApi(folderId);
    } catch (err) {
      console.warn("Drive API list jars:", err.message);
    }
  }
  if (!jars.length) {
    jars = await listJarsViaPublicFolderPage(folderId);
  }
  if (!jars.length) {
    throw new Error(
      "В папке Google Drive нет .jar — загрузите мод вручную и нажмите «Уведомить» снова"
    );
  }
  // Prefer one file; if several, take lexicographically last name (often higher version)
  jars.sort((a, b) => String(a.name).localeCompare(String(b.name), "en"));
  const pick = jars[jars.length - 1];
  return {
    id: pick.id,
    name: pick.name,
    downloadUrl: `https://drive.google.com/uc?export=download&id=${encodeURIComponent(pick.id)}`,
    count: jars.length,
  };
}

module.exports = {
  hasDriveUploadCredentials,
  uploadModJar,
  getAccessToken,
  findModJarInFolder,
};

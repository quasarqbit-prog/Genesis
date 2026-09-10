"use strict";

require("dotenv").config();

const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const http = require("http");
const https = require("https");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mysql = require("mysql2/promise");
const { Server } = require("socket.io");

const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const BCRYPT_ROUNDS = 12;
const MC_NICK_RE = /^[A-Za-z0-9_]{3,16}$/;
const TELEGRAM_RE = /^@?[A-Za-z0-9_]{5,32}$/;
const MOD_API_KEY = process.env.MOD_API_KEY || "";
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_BOT_USERNAME = (process.env.TELEGRAM_BOT_USERNAME || "").replace(
  /^@/,
  ""
);
const UPLOADS_DIR = path.join(__dirname, "uploads");
const AVATARS_DIR = path.join(UPLOADS_DIR, "avatars");

const app = express();
const server = http.createServer(app);

const corsOrigin = process.env.CORS_ORIGIN?.trim() || true;
const io = new Server(server, {
  cors: { origin: corsOrigin, methods: ["GET", "POST"] },
});

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use("/uploads", express.static(UPLOADS_DIR));

/** Локальная разработка: Express раздаёт статику. На VPS статику отдаёт Nginx. */
if (process.env.NODE_ENV !== "production") {
  app.use(express.static(path.join(__dirname)));
}

const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "genesis",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "genesis",
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true,
});

function ensureUploadDirs() {
  fs.mkdirSync(AVATARS_DIR, { recursive: true });
}

function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      mcNick: user.mcNick,
      telegram: user.telegram,
      role: user.role || "user",
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) {
    return res.status(401).json({ error: "Требуется авторизация" });
  }
  try {
    const payload = jwt.verify(match[1], JWT_SECRET);
    req.user = {
      id: payload.sub,
      mcNick: payload.mcNick,
      telegram: payload.telegram,
      role: payload.role || "user",
    };
    return next();
  } catch {
    return res.status(401).json({ error: "Сессия недействительна" });
  }
}

function adminMiddleware(req, res, next) {
  authMiddleware(req, res, () => {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ error: "Нет доступа" });
    }
    return next();
  });
}

function toPublicUser(rowOrUser) {
  const role = rowOrUser.role || "user";
  let avatarPath =
    rowOrUser.avatarUrl ||
    rowOrUser.avatar_path ||
    rowOrUser.avatarPath ||
    "";
  if (avatarPath && !avatarPath.startsWith("http") && !avatarPath.includes("?")) {
    avatarPath = `${avatarPath}?v=1`;
  }
  return {
    id: rowOrUser.id,
    mcNick: rowOrUser.mcNick || rowOrUser.mc_nick || "",
    telegram: rowOrUser.telegram || "",
    accountType: rowOrUser.accountType || rowOrUser.account_type || "",
    role,
    isAdmin: role === "admin",
    avatarUrl: avatarPath || "",
  };
}

function normalizeTelegram(raw) {
  const t = String(raw || "").trim();
  if (!t) return "";
  return t.startsWith("@") ? t : `@${t}`;
}

function normalizeMcNick(raw) {
  return String(raw || "").trim();
}

function parseFormJson(raw) {
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function columnExists(table, column) {
  const [rows] = await pool.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    [table, column]
  );
  return rows.length > 0;
}

async function ensureSchema() {
  ensureUploadDirs();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      telegram VARCHAR(64) NOT NULL,
      telegram_id BIGINT NULL,
      mc_nick VARCHAR(16) NOT NULL,
      account_type ENUM('pirate', 'licensed') NOT NULL DEFAULT 'pirate',
      role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_users_telegram (telegram),
      UNIQUE KEY uq_users_mc_nick (mc_nick),
      UNIQUE KEY uq_users_telegram_id (telegram_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS profiles (
      user_id INT UNSIGNED NOT NULL,
      mc_nick VARCHAR(16) NULL,
      race_name VARCHAR(64) NULL,
      registered TINYINT(1) NOT NULL DEFAULT 0,
      form_json JSON NULL,
      avatar_path VARCHAR(512) NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id),
      CONSTRAINT fk_profiles_user
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS game_stats (
      user_id INT UNSIGNED NOT NULL,
      score INT NOT NULL DEFAULT 0,
      inventory_json JSON NULL,
      meta_json JSON NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id),
      CONSTRAINT fk_game_stats_user
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  if (!(await columnExists("users", "role"))) {
    await pool.query(
      `ALTER TABLE users
       ADD COLUMN role ENUM('user', 'admin') NOT NULL DEFAULT 'user'
       AFTER account_type`
    );
  }
  if (!(await columnExists("users", "telegram_id"))) {
    await pool.query(
      `ALTER TABLE users ADD COLUMN telegram_id BIGINT NULL AFTER telegram`
    );
    try {
      await pool.query(
        `ALTER TABLE users ADD UNIQUE KEY uq_users_telegram_id (telegram_id)`
      );
    } catch {
      /* index may already exist */
    }
  }
  if (!(await columnExists("profiles", "avatar_path"))) {
    await pool.query(
      `ALTER TABLE profiles ADD COLUMN avatar_path VARCHAR(512) NULL AFTER form_json`
    );
  }
}

async function ensureAdminSeed() {
  const telegram = normalizeTelegram(
    process.env.ADMIN_TELEGRAM || "@kunvutikmurmurmurrr"
  );
  const mcNick = normalizeMcNick(process.env.ADMIN_MC_NICK || "DapRatt");
  const accountType = String(
    process.env.ADMIN_ACCOUNT_TYPE || "licensed"
  ).toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || "ilovecuw");
  if (!TELEGRAM_RE.test(telegram) || !MC_NICK_RE.test(mcNick) || password.length < 6) {
    console.warn("Admin seed skipped: invalid ADMIN_* config");
    return;
  }

  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const [rows] = await pool.execute(
    `SELECT id FROM users
     WHERE telegram = :telegram OR mc_nick = :mcNick
     LIMIT 1`,
    { telegram, mcNick }
  );

  if (rows[0]) {
    await pool.execute(
      `UPDATE users
       SET telegram = :telegram,
           mc_nick = :mcNick,
           account_type = :accountType,
           role = 'admin',
           password_hash = :hash
       WHERE id = :id`,
      { telegram, mcNick, accountType, hash, id: rows[0].id }
    );
    await ensureProfile(rows[0].id, mcNick);
    console.log(`Admin seed updated: ${telegram} / ${mcNick}`);
    return;
  }

  const [result] = await pool.execute(
    `INSERT INTO users (telegram, mc_nick, account_type, role, password_hash)
     VALUES (:telegram, :mcNick, :accountType, 'admin', :hash)`,
    { telegram, mcNick, accountType, hash }
  );
  await ensureProfile(result.insertId, mcNick);
  console.log(`Admin seed created: ${telegram} / ${mcNick}`);
}

async function ensureProfile(userId, mcNick = null) {
  await pool.execute(
    `INSERT IGNORE INTO profiles (user_id, mc_nick, registered, form_json)
     VALUES (:userId, :mcNick, 0, '{}')`,
    { userId, mcNick }
  );
  if (mcNick) {
    await pool.execute(
      `UPDATE profiles SET mc_nick = :mcNick WHERE user_id = :userId`,
      { userId, mcNick }
    );
  }
  await pool.execute(
    `INSERT IGNORE INTO game_stats (user_id, score, inventory_json, meta_json)
     VALUES (:userId, 0, '{}', '{}')`,
    { userId }
  );
}

function verifyTelegramLoginPayload(data) {
  if (!TELEGRAM_BOT_TOKEN) {
    return { ok: false, error: "TELEGRAM_BOT_TOKEN не настроен" };
  }
  const hash = String(data.hash || "");
  if (!hash) return { ok: false, error: "Нет hash" };

  const check = { ...data };
  delete check.hash;
  const dataCheckString = Object.keys(check)
    .filter((key) => check[key] !== undefined && check[key] !== null && check[key] !== "")
    .sort()
    .map((key) => `${key}=${check[key]}`)
    .join("\n");

  const secretKey = crypto
    .createHash("sha256")
    .update(TELEGRAM_BOT_TOKEN.trim())
    .digest();
  const computed = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  const a = Buffer.from(computed, "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, error: "Неверная подпись Telegram (проверьте BOT_TOKEN)" };
  }

  const authDate = Number(data.auth_date);
  if (!Number.isFinite(authDate)) {
    return { ok: false, error: "Некорректный auth_date" };
  }
  const ageSec = Math.floor(Date.now() / 1000) - authDate;
  if (ageSec > 86400) {
    return { ok: false, error: "Данные Telegram устарели. Войдите ещё раз" };
  }

  return { ok: true };
}

function downloadToFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    const req = client.get(url, { timeout: 15000 }, (res) => {
      if (
        res.statusCode >= 300 &&
        res.statusCode < 400 &&
        res.headers.location
      ) {
        res.resume();
        downloadToFile(res.headers.location, destPath).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      const file = fs.createWriteStream(destPath);
      res.pipe(file);
      file.on("finish", () => file.close(() => resolve(destPath)));
      file.on("error", (err) => {
        fs.unlink(destPath, () => reject(err));
      });
    });
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("timeout"));
    });
  });
}

async function telegramApi(method, payload = null) {
  if (!TELEGRAM_BOT_TOKEN) {
    throw new Error("TELEGRAM_BOT_TOKEN не настроен");
  }
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN.trim()}/${method}`;
  const init = payload
    ? {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    : { method: "GET" };
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!data.ok) {
    const desc = data.description || `Telegram API ${method} failed`;
    throw new Error(desc);
  }
  return data.result;
}

async function resolveTelegramPhotoUrl(telegramId, widgetPhotoUrl) {
  if (widgetPhotoUrl) return String(widgetPhotoUrl);
  if (!TELEGRAM_BOT_TOKEN || !telegramId) return "";
  try {
    const photos = await telegramApi(
      `getUserProfilePhotos?user_id=${telegramId}&limit=1`
    );
    const sizes = photos?.photos?.[0];
    if (!Array.isArray(sizes) || !sizes.length) return "";
    const best = sizes[sizes.length - 1];
    const fileData = await telegramApi(
      `getFile?file_id=${encodeURIComponent(best.file_id)}`
    );
    const filePath = fileData?.file_path;
    if (!filePath) return "";
    return `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN.trim()}/${filePath}`;
  } catch (err) {
    console.warn("resolveTelegramPhotoUrl:", err.message);
    return "";
  }
}

async function handleTelegramUpdate(update) {
  const msg = update?.message || update?.edited_message;
  if (!msg?.chat?.id) return;
  const text = String(msg.text || "").trim();
  const chatId = msg.chat.id;
  if (!text.startsWith("/start") && !text.startsWith("/help")) return;

  const botName = TELEGRAM_BOT_USERNAME
    ? `@${TELEGRAM_BOT_USERNAME}`
    : "бот Genesis";
  const reply =
    `Привет! Это ${botName}.\n\n` +
    `Авторизация и аватарка работают через сайт Genesis.\n` +
    `1) Открой сайт\n` +
    `2) Нажми «Войти через Telegram»\n` +
    `3) Вернись на сайт — аватар подтянется сам\n\n` +
    `Команда /start нужна только чтобы бот мог читать твоё фото профиля.`;

  try {
    await telegramApi("sendMessage", {
      chat_id: chatId,
      text: reply,
    });
  } catch (err) {
    console.warn("telegram sendMessage:", err.message);
  }
}

function startTelegramBotPolling() {
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn("Telegram bot polling skipped: no TELEGRAM_BOT_TOKEN");
    return;
  }

  let offset = 0;
  let stopped = false;

  const stop = () => {
    stopped = true;
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);

  (async () => {
    try {
      await telegramApi("deleteWebhook", { drop_pending_updates: false });
      const me = await telegramApi("getMe");
      console.log(
        `Telegram bot polling: @${me.username || "?"} (id ${me.id})`
      );
    } catch (err) {
      console.error("Telegram bot init failed:", err.message);
      return;
    }

    while (!stopped) {
      try {
        const updates = await telegramApi("getUpdates", {
          offset,
          timeout: 25,
          allowed_updates: ["message"],
        });
        for (const update of updates || []) {
          offset = Math.max(offset, Number(update.update_id) + 1);
          await handleTelegramUpdate(update);
        }
      } catch (err) {
        console.warn("Telegram polling:", err.message);
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
  })();
}

async function saveTelegramAvatar(userId, photoUrl, telegramId = null) {
  ensureUploadDirs();
  await ensureProfile(userId, null);

  let url = String(photoUrl || "").trim();
  if (!url && telegramId) {
    url = await resolveTelegramPhotoUrl(telegramId, "");
  }
  if (!url) return "";

  const extMatch = String(url).match(/\.(jpe?g|png|webp|gif)(?:\?|$)/i);
  const ext = extMatch
    ? extMatch[1].toLowerCase().replace("jpeg", "jpg")
    : "jpg";
  const fileName = `${userId}.${ext}`;
  const absPath = path.join(AVATARS_DIR, fileName);
  const publicPath = `/uploads/avatars/${fileName}`;

  const persistPath = async (avatarPath) => {
    await pool.execute(
      `UPDATE profiles SET avatar_path = :avatarPath WHERE user_id = :userId`,
      { avatarPath, userId }
    );
    return avatarPath.startsWith("http")
      ? avatarPath
      : `${avatarPath}?v=${Date.now()}`;
  };

  try {
    await downloadToFile(String(url), absPath);
    return await persistPath(publicPath);
  } catch (err) {
    console.warn("avatar download failed:", err.message);
  }

  // Bot API fallback
  if (telegramId) {
    try {
      const botUrl = await resolveTelegramPhotoUrl(telegramId, "");
      if (botUrl) {
        await downloadToFile(botUrl, absPath);
        return await persistPath(publicPath);
      }
    } catch (err2) {
      console.warn("avatar bot fallback failed:", err2.message);
    }
  }

  // Последний запасной вариант — прямая ссылка Telegram CDN
  if (url.startsWith("http://") || url.startsWith("https://")) {
    try {
      return await persistPath(url);
    } catch (err3) {
      console.warn("avatar remote persist failed:", err3.message);
    }
  }
  return "";
}

async function allocateMcNick(preferred, telegramId) {
  const candidates = [];
  const clean = String(preferred || "").replace(/[^A-Za-z0-9_]/g, "");
  if (clean.length >= 3) candidates.push(clean.slice(0, 16));
  candidates.push(`tg${telegramId}`.slice(0, 16));
  candidates.push(`u${String(telegramId)}`.slice(0, 16));

  for (const base of candidates) {
    if (!MC_NICK_RE.test(base)) continue;
    let nick = base;
    for (let i = 0; i < 30; i += 1) {
      const [rows] = await pool.execute(
        `SELECT id FROM users WHERE mc_nick = :nick LIMIT 1`,
        { nick }
      );
      if (!rows[0]) return nick;
      const suffix = String(i + 1);
      nick = `${base.slice(0, Math.max(3, 16 - suffix.length))}${suffix}`;
      if (!MC_NICK_RE.test(nick)) break;
    }
  }
  return `u${Date.now().toString(36)}`.slice(0, 16);
}

async function loadUserPublic(userId) {
  const [rows] = await pool.execute(
    `SELECT u.id, u.telegram, u.mc_nick, u.account_type, u.role, p.avatar_path
     FROM users u
     LEFT JOIN profiles p ON p.user_id = u.id
     WHERE u.id = :userId
     LIMIT 1`,
    { userId }
  );
  return rows[0] ? toPublicUser(rows[0]) : null;
}

let cachedTelegramBot = null;

async function getTelegramBotInfo() {
  if (cachedTelegramBot) return cachedTelegramBot;
  if (!TELEGRAM_BOT_TOKEN) return null;
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN.trim()}/getMe`
    );
    const data = await res.json();
    if (!data?.ok || !data.result?.id) {
      console.warn("Telegram getMe failed:", data);
      return null;
    }
    cachedTelegramBot = {
      id: data.result.id,
      username: String(data.result.username || "").replace(/^@/, ""),
    };
    return cachedTelegramBot;
  } catch (err) {
    console.warn("Telegram getMe error:", err.message);
    return null;
  }
}

/* ---------- Health / config ---------- */
app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, db: true });
  } catch (err) {
    res.status(503).json({ ok: false, db: false, error: err.message });
  }
});

app.get("/api/config", async (_req, res) => {
  const bot = await getTelegramBotInfo();
  const username = bot?.username || TELEGRAM_BOT_USERNAME || "";
  res.json({
    telegramBotUsername: username,
    telegramBotId: bot?.id || null,
    telegramLoginEnabled: Boolean(TELEGRAM_BOT_TOKEN && username),
  });
});

app.post("/api/auth/telegram", async (req, res) => {
  try {
    const payload = {
      id: req.body?.id,
      first_name: req.body?.first_name,
      last_name: req.body?.last_name,
      username: req.body?.username,
      photo_url: req.body?.photo_url,
      auth_date: req.body?.auth_date,
      hash: req.body?.hash,
    };

    const verifyPayload = {};
    for (const [key, value] of Object.entries(payload)) {
      if (value === undefined || value === null || value === "") continue;
      verifyPayload[key] = String(value);
    }

    const verified = verifyTelegramLoginPayload(verifyPayload);
    if (!verified.ok) {
      return res.status(401).json({ error: verified.error });
    }

    const telegramId = Number(verifyPayload.id);
    if (!Number.isFinite(telegramId)) {
      return res.status(400).json({ error: "Некорректный Telegram id" });
    }

    const username = String(verifyPayload.username || "").trim();
    const telegram = username
      ? normalizeTelegram(username)
      : `@tg${telegramId}`;
    const photoUrl = verifyPayload.photo_url || "";

    let userId = null;
    const [byId] = await pool.execute(
      `SELECT id FROM users WHERE telegram_id = :telegramId LIMIT 1`,
      { telegramId }
    );
    if (byId[0]) {
      userId = byId[0].id;
      await pool.execute(
        `UPDATE users SET telegram = :telegram WHERE id = :userId`,
        { telegram, userId }
      );
    } else {
      const [byName] = await pool.execute(
        `SELECT id FROM users WHERE telegram = :telegram LIMIT 1`,
        { telegram }
      );
      if (byName[0]) {
        userId = byName[0].id;
        await pool.execute(
          `UPDATE users SET telegram_id = :telegramId WHERE id = :userId`,
          { telegramId, userId }
        );
      }
    }

    // Нет аккаунта — только данные Telegram для завершения регистрации
    if (!userId) {
      return res.json({
        registered: false,
        telegramAuth: verifyPayload,
        telegram,
        telegramId,
        photoUrl,
      });
    }

    await ensureProfile(userId, null);
    const avatarUrl = await saveTelegramAvatar(userId, photoUrl, telegramId);
    const user = await loadUserPublic(userId);
    if (avatarUrl && user) user.avatarUrl = avatarUrl;

    return res.json({
      registered: true,
      token: signToken(user),
      user,
    });
  } catch (err) {
    console.error("telegram auth:", err);
    return res.status(500).json({ error: "Ошибка входа через Telegram" });
  }
});

/* ---------- Auth ---------- */
app.post("/api/register", async (req, res) => {
  try {
    const telegramAuthRaw = req.body?.telegramAuth || {};
    const verifyPayload = {};
    for (const [key, value] of Object.entries(telegramAuthRaw)) {
      if (value === undefined || value === null || value === "") continue;
      verifyPayload[key] = String(value);
    }
    const verified = verifyTelegramLoginPayload(verifyPayload);
    if (!verified.ok) {
      return res.status(401).json({
        error: verified.error || "Сначала войдите через Telegram",
        field: "telegram",
      });
    }

    const telegramId = Number(verifyPayload.id);
    if (!Number.isFinite(telegramId)) {
      return res.status(400).json({
        error: "Некорректный Telegram id",
        field: "telegram",
      });
    }

    const username = String(verifyPayload.username || "").trim();
    const telegram = username
      ? normalizeTelegram(username)
      : `@tg${telegramId}`;
    const photoUrl = verifyPayload.photo_url || "";

    const mcNick = normalizeMcNick(req.body?.mcNick || req.body?.mc_nick);
    const accountType = String(req.body?.accountType || req.body?.account_type || "")
      .trim()
      .toLowerCase();
    const password = String(req.body?.password || "");
    const passwordConfirm = String(
      req.body?.passwordConfirm || req.body?.password_confirm || ""
    );

    if (!MC_NICK_RE.test(mcNick)) {
      return res.status(400).json({
        error: "Ник Minecraft: 3–16 символов, латиница, цифры и _",
        field: "mcNick",
      });
    }
    if (accountType !== "pirate" && accountType !== "licensed") {
      return res.status(400).json({
        error: "Выберите тип аккаунта",
        field: "accountType",
      });
    }
    if (password.length < 6 || password.length > 72) {
      return res.status(400).json({
        error: "Пароль: от 6 до 72 символов",
        field: "password",
      });
    }
    if (password !== passwordConfirm) {
      return res.status(400).json({
        error: "Пароли не совпадают",
        field: "passwordConfirm",
      });
    }

    const [existingTg] = await pool.execute(
      `SELECT id FROM users
       WHERE telegram_id = :telegramId OR telegram = :telegram
       LIMIT 1`,
      { telegramId, telegram }
    );
    if (existingTg[0]) {
      return res.status(409).json({
        error: "Этот Telegram уже зарегистрирован. Войдите.",
        field: "telegram",
      });
    }

    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const [result] = await pool.execute(
      `INSERT INTO users
        (telegram, telegram_id, mc_nick, account_type, role, password_hash)
       VALUES
        (:telegram, :telegramId, :mcNick, :accountType, 'user', :hash)`,
      { telegram, telegramId, mcNick, accountType, hash }
    );
    const userId = result.insertId;
    try {
      await ensureProfile(userId, mcNick);
    } catch (profileErr) {
      console.error("register profile:", profileErr);
      try {
        await ensureSchema();
        await ensureProfile(userId, mcNick);
      } catch (retryErr) {
        console.error("register profile retry:", retryErr);
      }
    }

    const avatarUrl = await saveTelegramAvatar(userId, photoUrl, telegramId);
    const user =
      (await loadUserPublic(userId)) ||
      toPublicUser({
        id: userId,
        mcNick,
        telegram,
        accountType,
        role: "user",
        avatar_path: avatarUrl,
      });
    if (avatarUrl) user.avatarUrl = avatarUrl;

    return res.status(201).json({ token: signToken(user), user });
  } catch (err) {
    if (err && err.code === "ER_DUP_ENTRY") {
      const msg = String(err.message || "");
      if (msg.includes("telegram")) {
        return res.status(409).json({
          error: "Этот Telegram уже зарегистрирован",
          field: "telegram",
        });
      }
      if (msg.includes("mc_nick")) {
        return res.status(409).json({
          error: "Этот ник Minecraft уже занят",
          field: "mcNick",
        });
      }
      return res.status(409).json({ error: "Аккаунт уже существует" });
    }
    if (
      err &&
      (err.code === "ER_BAD_FIELD_ERROR" ||
        err.code === "ER_NO_SUCH_TABLE" ||
        err.code === "ER_WRONG_VALUE_COUNT_ON_ROW")
    ) {
      console.error("register schema:", err);
      return res.status(500).json({
        error:
          "База данных не обновлена. На сервере выполните: mysql -u genesis -p genesis < sql/migrate_auth_v2.sql",
        field: null,
      });
    }
    console.error("register:", err);
    return res.status(500).json({
      error: "Ошибка регистрации",
      detail: err?.code || err?.message || null,
    });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const loginRaw = String(req.body?.login || req.body?.username || "").trim();
    const password = String(req.body?.password || "");
    if (!loginRaw || !password) {
      return res.status(400).json({ error: "Введите ник и пароль" });
    }

    const loginNick = normalizeMcNick(loginRaw);
    if (!MC_NICK_RE.test(loginNick)) {
      return res.status(400).json({
        error: "Ник Minecraft: 3–16 символов, латиница, цифры и _",
        field: "login",
      });
    }

    const [rows] = await pool.execute(
      `SELECT id, telegram, telegram_id, mc_nick, account_type, role, password_hash
       FROM users
       WHERE mc_nick = :loginNick
       LIMIT 1`,
      { loginNick }
    );
    const row = rows[0];
    if (!row) {
      return res.status(401).json({ error: "Неверный ник или пароль" });
    }

    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) {
      return res.status(401).json({ error: "Неверный ник или пароль" });
    }

    await ensureProfile(row.id, row.mc_nick);
    if (row.telegram_id) {
      await saveTelegramAvatar(row.id, "", row.telegram_id);
    }
    const user = (await loadUserPublic(row.id)) || toPublicUser(row);
    return res.json({ token: signToken(user), user });
  } catch (err) {
    console.error("login:", err);
    return res.status(500).json({ error: "Ошибка входа" });
  }
});

/** Проверка пароля для Minecraft-мода */
app.post("/api/mc/verify", async (req, res) => {
  try {
    if (MOD_API_KEY) {
      const key = req.headers["x-mod-key"] || req.body?.apiKey;
      if (key !== MOD_API_KEY) {
        return res.status(403).json({ ok: false, error: "Forbidden" });
      }
    }

    const nick = normalizeMcNick(req.body?.nick || req.body?.mcNick);
    const password = String(req.body?.password || "");
    if (!MC_NICK_RE.test(nick) || !password) {
      return res.status(400).json({ ok: false, error: "Bad request" });
    }

    const [rows] = await pool.execute(
      `SELECT password_hash, account_type, telegram
       FROM users WHERE mc_nick = :nick LIMIT 1`,
      { nick }
    );
    const row = rows[0];
    if (!row) {
      return res.status(401).json({ ok: false, error: "Unknown player" });
    }

    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) {
      return res.status(401).json({ ok: false, error: "Wrong password" });
    }

    return res.json({
      ok: true,
      nick,
      accountType: row.account_type,
      telegram: row.telegram,
    });
  } catch (err) {
    console.error("mc verify:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

/* ---------- Profile / race data ---------- */
app.get("/api/user/profile", authMiddleware, async (req, res) => {
  try {
    await ensureProfile(req.user.id, req.user.mcNick || null);
    const [userRows] = await pool.execute(
      `SELECT telegram, telegram_id, mc_nick, account_type, role FROM users WHERE id = :userId LIMIT 1`,
      { userId: req.user.id }
    );
    const u = userRows[0] || {};
    const [rows] = await pool.execute(
      `SELECT p.registered, p.mc_nick, p.race_name, p.form_json, p.avatar_path,
              p.updated_at, g.score, g.inventory_json, g.meta_json
       FROM profiles p
       LEFT JOIN game_stats g ON g.user_id = p.user_id
       WHERE p.user_id = :userId
       LIMIT 1`,
      { userId: req.user.id }
    );
    const row = rows[0] || {};

    // Если аватарки ещё нет — пробуем подтянуть из Telegram
    if (!row.avatar_path && u.telegram_id) {
      const refreshed = await saveTelegramAvatar(req.user.id, "", u.telegram_id);
      if (refreshed) row.avatar_path = refreshed.split("?")[0];
    }

    const user = toPublicUser({
      id: req.user.id,
      telegram: u.telegram || req.user.telegram || "",
      mc_nick: u.mc_nick || req.user.mcNick || "",
      account_type: u.account_type || "",
      role: u.role || req.user.role || "user",
      avatar_path: row.avatar_path || "",
    });
    return res.json({
      user,
      registered: Boolean(row.registered),
      mcNick: user.mcNick,
      raceName: row.race_name || "",
      form: parseFormJson(row.form_json),
      stats: {
        score: Number(row.score) || 0,
        inventory: parseFormJson(row.inventory_json),
        meta: parseFormJson(row.meta_json),
      },
      updatedAt: row.updated_at || null,
    });
  } catch (err) {
    console.error("profile get:", err);
    return res.status(500).json({ error: "Не удалось загрузить профиль" });
  }
});

app.post("/api/user/avatar/refresh", authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT telegram_id FROM users WHERE id = :userId LIMIT 1`,
      { userId: req.user.id }
    );
    const telegramId = rows[0]?.telegram_id || null;
    if (!telegramId) {
      return res.status(400).json({
        error: "Сначала войдите через Telegram, чтобы привязать аккаунт",
      });
    }
    const photoUrl = String(req.body?.photo_url || "");
    const avatarUrl = await saveTelegramAvatar(req.user.id, photoUrl, telegramId);
    if (!avatarUrl) {
      return res.status(404).json({
        error:
          "Фото не найдено. Напиши боту /start, убедись что в Telegram есть аватар, затем на сайте нажми «Войти через Telegram»",
      });
    }
    const user = await loadUserPublic(req.user.id);
    if (user) user.avatarUrl = avatarUrl;
    return res.json({ ok: true, user, avatarUrl });
  } catch (err) {
    console.error("avatar refresh:", err);
    return res.status(500).json({ error: "Ошибка обновления аватарки" });
  }
});

/* ---------- Admin stub ---------- */
app.get("/api/admin/status", adminMiddleware, async (_req, res) => {
  try {
    const [[usersCount]] = await pool.query(
      `SELECT COUNT(*) AS c FROM users`
    );
    return res.json({
      ok: true,
      stub: true,
      message: "Админ-панель в разработке",
      users: Number(usersCount?.c) || 0,
    });
  } catch (err) {
    console.error("admin status:", err);
    return res.status(500).json({ error: "Ошибка админ API" });
  }
});

app.get("/api/admin/users", adminMiddleware, async (_req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, telegram, mc_nick, account_type, role, created_at
       FROM users
       ORDER BY id ASC
       LIMIT 200`
    );
    return res.json({
      stub: true,
      users: rows.map((r) => toPublicUser(r)).map((u, i) => ({
        ...u,
        createdAt: rows[i].created_at || null,
      })),
    });
  } catch (err) {
    console.error("admin users:", err);
    return res.status(500).json({ error: "Ошибка списка пользователей" });
  }
});

app.put("/api/user/profile", authMiddleware, async (req, res) => {
  try {
    await ensureProfile(req.user.id);
    const form =
      req.body?.form && typeof req.body.form === "object" ? req.body.form : {};
    const registered =
      req.body?.registered !== undefined
        ? Boolean(req.body.registered)
        : undefined;
    const mcNick = String(form.nick || req.body?.mcNick || "").trim().slice(0, 16);
    const raceName = String(form.raceName || req.body?.raceName || "")
      .trim()
      .slice(0, 64);

    const fields = [
      "form_json = CAST(:formJson AS JSON)",
      "mc_nick = :mcNick",
      "race_name = :raceName",
    ];
    const params = {
      userId: req.user.id,
      formJson: JSON.stringify(form),
      mcNick: mcNick || null,
      raceName: raceName || null,
    };
    if (registered !== undefined) {
      fields.push("registered = :registered");
      params.registered = registered ? 1 : 0;
    }

    await pool.execute(
      `UPDATE profiles SET ${fields.join(", ")} WHERE user_id = :userId`,
      params
    );

    if (req.body?.stats && typeof req.body.stats === "object") {
      const score = Number(req.body.stats.score);
      await pool.execute(
        `UPDATE game_stats
         SET score = COALESCE(:score, score),
             inventory_json = COALESCE(CAST(:inventory AS JSON), inventory_json),
             meta_json = COALESCE(CAST(:meta AS JSON), meta_json)
         WHERE user_id = :userId`,
        {
          userId: req.user.id,
          score: Number.isFinite(score) ? score : null,
          inventory:
            req.body.stats.inventory != null
              ? JSON.stringify(req.body.stats.inventory)
              : null,
          meta:
            req.body.stats.meta != null
              ? JSON.stringify(req.body.stats.meta)
              : null,
        }
      );
    }

    io.to(`user:${req.user.id}`).emit("profile:updated", {
      registered: registered !== undefined ? registered : undefined,
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error("profile put:", err);
    return res.status(500).json({ error: "Не удалось сохранить профиль" });
  }
});

/* ---------- Socket.io ---------- */
const onlineUsers = new Map(); // socket.id -> { userId?, username? }

function broadcastPresence() {
  io.emit("presence:update", { online: onlineUsers.size });
}

io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) {
    socket.data.user = null;
    return next();
  }
  try {
    const payload = jwt.verify(String(token), JWT_SECRET);
    socket.data.user = {
      id: payload.sub,
      mcNick: payload.mcNick,
      telegram: payload.telegram,
    };
  } catch {
    socket.data.user = null;
  }
  return next();
});

io.on("connection", (socket) => {
  onlineUsers.set(socket.id, {
    userId: socket.data.user?.id || null,
    mcNick: socket.data.user?.mcNick || null,
  });
  broadcastPresence();

  if (socket.data.user?.id) {
    socket.join(`user:${socket.data.user.id}`);
  }

  socket.emit("presence:update", { online: onlineUsers.size });

  socket.on("chat:message", (payload) => {
    const text = String(payload?.text || "").trim().slice(0, 300);
    if (!text) return;
    const username =
      socket.data.user?.mcNick ||
      String(payload?.username || "Гость").slice(0, 32);
    io.emit("chat:message", {
      username,
      text,
      at: Date.now(),
    });
  });

  socket.on("disconnect", () => {
    onlineUsers.delete(socket.id);
    broadcastPresence();
  });
});

server.listen(PORT, async () => {
  try {
    await ensureSchema();
    await ensureAdminSeed();
    console.log("DB schema OK");
  } catch (err) {
    console.error("DB schema ensure failed:", err.message);
  }
  startTelegramBotPolling();
  console.log(`Genesis API + Socket.io on :${PORT}`);
});

async function shutdown() {
  try {
    await pool.end();
  } catch {
    /* ignore */
  }
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

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
const MODS_DIR = path.join(UPLOADS_DIR, "mods");
const ORDERS_DIR = path.join(UPLOADS_DIR, "orders");
const DATA_DIR = path.join(__dirname, "data");
const RULES_FILE = path.join(DATA_DIR, "rules.json");
const RULES_DEFAULT_FILE = path.join(__dirname, "rules-default.json");
const SERVER_INFO_FILE = path.join(DATA_DIR, "server.json");
const PATCHES_FILE = path.join(DATA_DIR, "patches.json");
const MUSIC_INDEX_FILE = path.join(__dirname, "assets", "sound", "music-index.json");
const MUSIC_INDEX_CACHE_FILE = path.join(DATA_DIR, "music-index-cache.json");
const GDRIVE_MUSIC_FOLDER_ID =
  process.env.GDRIVE_MUSIC_FOLDER_ID || "1xXichFk7SQH3TSD4XETlZ7ENNId1Pr1R";
const GDRIVE_MOD_FOLDER_ID =
  process.env.GDRIVE_MOD_FOLDER_ID || "1SrkR-K4V-0wmdjGQeyCOsAIn6KSaeV-P";
const GDRIVE_ID_RE = /^[a-zA-Z0-9_-]{10,128}$/;

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
app.use(express.json({ limit: "32mb" }));
app.use(
  "/uploads",
  express.static(UPLOADS_DIR, {
    etag: true,
    maxAge: "5m",
    setHeaders(res) {
      res.setHeader("Cache-Control", "public, max-age=300, must-revalidate");
    },
  })
);

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
  fs.mkdirSync(MODS_DIR, { recursive: true });
  fs.mkdirSync(ORDERS_DIR, { recursive: true });
  fs.mkdirSync(DATA_DIR, { recursive: true });
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
  let payload;
  try {
    payload = jwt.verify(match[1], JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "Сессия недействительна" });
  }
  resolveAuthUserRow(payload)
    .then((row) => {
      if (!row) {
        return res.status(401).json({ error: "Сессия недействительна" });
      }
      const tokenId = Number(payload.sub);
      const userId = Number(row.id);
      req.user = {
        id: userId,
        mcNick: row.mc_nick,
        telegram: row.telegram,
        role: row.role || "user",
        tokenNeedsRefresh:
          !Number.isFinite(tokenId) || tokenId !== userId,
      };
      return next();
    })
    .catch((err) => {
      console.error("authMiddleware:", err);
      return res.status(500).json({ error: "Ошибка авторизации" });
    });
}

async function resolveAuthUserRow(payload) {
  if (!payload || typeof payload !== "object") return null;
  const id = Number(payload.sub);
  if (Number.isFinite(id)) {
    const [rows] = await pool.execute(
      `SELECT id, telegram, mc_nick, role FROM users WHERE id = :id LIMIT 1`,
      { id }
    );
    if (rows[0]) return rows[0];
  }
  const mcNick = normalizeMcNick(String(payload.mcNick || ""));
  if (mcNick) {
    const [rows] = await pool.execute(
      `SELECT id, telegram, mc_nick, role FROM users WHERE mc_nick = :mcNick LIMIT 1`,
      { mcNick }
    );
    if (rows[0]) return rows[0];
  }
  const rawTg = String(payload.telegram || "").trim();
  if (rawTg) {
    const telegram = normalizeTelegram(rawTg);
    const [rows] = await pool.execute(
      `SELECT id, telegram, mc_nick, role FROM users WHERE telegram = :telegram LIMIT 1`,
      { telegram }
    );
    if (rows[0]) return rows[0];
  }
  return null;
}

function adminMiddleware(req, res, next) {
  authMiddleware(req, res, () => {
    refreshUserRole(req)
      .then(() => {
        if (!isAdminRole(req.user?.role)) {
          return res.status(403).json({ error: "Нет доступа" });
        }
        return next();
      })
      .catch((err) => {
        console.error("adminMiddleware:", err);
        return res.status(500).json({ error: "Ошибка доступа" });
      });
  });
}

function staffMiddleware(req, res, next) {
  authMiddleware(req, res, () => {
    refreshUserRole(req)
      .then(() => {
        if (!isStaffRole(req.user?.role)) {
          return res.status(403).json({ error: "Нет доступа к панели" });
        }
        return next();
      })
      .catch((err) => {
        console.error("staffMiddleware:", err);
        return res.status(500).json({ error: "Ошибка доступа" });
      });
  });
}

function isStaffRole(role) {
  return role === "helper" || role === "admin" || role === "founder";
}

function isAdminRole(role) {
  return role === "admin" || role === "founder";
}

async function refreshUserRole(req) {
  if (req.user?.id == null || !Number.isFinite(Number(req.user.id))) return;
  const [rows] = await pool.execute(
    `SELECT role FROM users WHERE id = :userId LIMIT 1`,
    { userId: req.user.id }
  );
  if (rows[0]?.role) req.user.role = rows[0].role;
}

function publicAvatarUrl(rawPath) {
  const raw = String(rawPath || "").trim();
  if (!raw) return "";
  if (
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("data:")
  ) {
    return raw;
  }
  const base = raw.split("?")[0];
  let bust = Date.now();
  try {
    const abs = path.join(AVATARS_DIR, path.basename(base));
    const st = fs.statSync(abs);
    if (st?.mtimeMs) bust = Math.floor(st.mtimeMs);
  } catch {
    /* файла нет — всё равно отдаём URL, клиент сделает retry/fallback */
  }
  return `${base}?v=${bust}`;
}

function toPublicUser(rowOrUser) {
  const role = rowOrUser.role || "user";
  const rawAvatar =
    rowOrUser.avatarUrl ||
    rowOrUser.avatar_path ||
    rowOrUser.avatarPath ||
    "";
  const avatarPath = publicAvatarUrl(rawAvatar);
  const showSiteOnline =
    rowOrUser.showSiteOnline !== undefined
      ? Boolean(rowOrUser.showSiteOnline)
      : rowOrUser.show_site_online === undefined
        ? true
        : Boolean(Number(rowOrUser.show_site_online));
  const showServerOnline =
    rowOrUser.showServerOnline !== undefined
      ? Boolean(rowOrUser.showServerOnline)
      : rowOrUser.show_server_online === undefined
        ? true
        : Boolean(Number(rowOrUser.show_server_online));
  const showOnlineFrame =
    rowOrUser.showOnlineFrame !== undefined
      ? Boolean(rowOrUser.showOnlineFrame)
      : rowOrUser.show_online_frame === undefined
        ? true
        : Boolean(Number(rowOrUser.show_online_frame));
  const siteNick =
    rowOrUser.siteNick ||
    rowOrUser.site_nick ||
    "";
  const bannedUntilRaw =
    rowOrUser.bannedUntil ||
    rowOrUser.banned_until ||
    rowOrUser.expires_at ||
    null;
  let bannedUntil = null;
  if (bannedUntilRaw) {
    const ts = new Date(bannedUntilRaw).getTime();
    if (Number.isFinite(ts) && ts > Date.now()) {
      bannedUntil = new Date(ts).toISOString();
    }
  }
  const banned =
    rowOrUser.banned !== undefined
      ? Boolean(rowOrUser.banned) && Boolean(bannedUntil)
      : Boolean(bannedUntil);
  const form =
    rowOrUser.race && typeof rowOrUser.race === "object"
      ? rowOrUser.race
      : parseFormJson(rowOrUser.form_json || rowOrUser.formJson || rowOrUser.form);
  const raceName = String(
    rowOrUser.raceName ||
      rowOrUser.race_name ||
      form.raceName ||
      ""
  ).trim();
  const race = {
    raceName,
    origin: String(form.origin || "").trim(),
    abilities: String(form.abilities || "").trim(),
    traits: String(form.traits || "").trim(),
    useful: String(form.useful || "").trim(),
    mechanics: String(form.mechanics || "").trim(),
    blocks: Array.isArray(form.blocks) ? form.blocks : [],
  };
  return {
    id: rowOrUser.id,
    mcNick: rowOrUser.mcNick || rowOrUser.mc_nick || "",
    siteNick: String(siteNick || "").trim(),
    telegram: rowOrUser.telegram || "",
    accountType: rowOrUser.accountType || rowOrUser.account_type || "",
    role,
    isFounder: role === "founder",
    isAdmin: role === "admin" || role === "founder",
    isHelper: role === "helper",
    isStaff: isStaffRole(role),
    avatarUrl: avatarPath || "",
    showSiteOnline,
    showServerOnline,
    showOnlineFrame,
    banned,
    bannedUntil,
    raceName,
    race,
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
      role ENUM('user', 'helper', 'admin', 'founder') NOT NULL DEFAULT 'user',
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
       ADD COLUMN role ENUM('user', 'helper', 'admin', 'founder') NOT NULL DEFAULT 'user'
       AFTER account_type`
    );
  } else {
    try {
      await pool.query(
        `ALTER TABLE users
         MODIFY COLUMN role ENUM('user', 'helper', 'admin', 'founder') NOT NULL DEFAULT 'user'`
      );
    } catch (err) {
      console.warn("role enum migrate:", err.message);
    }
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_bans (
      user_id INT UNSIGNED NOT NULL,
      banned_by INT UNSIGNED NULL,
      duration_value INT UNSIGNED NOT NULL,
      duration_unit ENUM('second', 'minute', 'hour', 'day') NOT NULL,
      banned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP NOT NULL,
      PRIMARY KEY (user_id),
      CONSTRAINT fk_user_bans_user
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE,
      CONSTRAINT fk_user_bans_by
        FOREIGN KEY (banned_by) REFERENCES users (id)
        ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  try {
    await pool.query(
      `ALTER TABLE users MODIFY COLUMN password_hash VARCHAR(255) NULL`
    );
  } catch (err) {
    console.warn("password_hash null migrate:", err.message);
  }
  if (!(await columnExists("users", "password_plain"))) {
    await pool.query(
      `ALTER TABLE users
       ADD COLUMN password_plain VARCHAR(72) NULL AFTER password_hash`
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
  if (!(await columnExists("profiles", "site_nick"))) {
    await pool.query(
      `ALTER TABLE profiles ADD COLUMN site_nick VARCHAR(32) NULL AFTER avatar_path`
    );
  }
  if (!(await columnExists("profiles", "show_site_online"))) {
    await pool.query(
      `ALTER TABLE profiles ADD COLUMN show_site_online TINYINT(1) NOT NULL DEFAULT 1 AFTER site_nick`
    );
  }
  if (!(await columnExists("profiles", "show_server_online"))) {
    await pool.query(
      `ALTER TABLE profiles ADD COLUMN show_server_online TINYINT(1) NOT NULL DEFAULT 1 AFTER show_site_online`
    );
  }
  if (!(await columnExists("profiles", "show_online_frame"))) {
    await pool.query(
      `ALTER TABLE profiles ADD COLUMN show_online_frame TINYINT(1) NOT NULL DEFAULT 1 AFTER show_server_online`
    );
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS studio_submissions (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      client_folder_id VARCHAR(64) NOT NULL,
      submitter_id INT UNSIGNED NOT NULL,
      submitter_mc_nick VARCHAR(16) NOT NULL,
      folder_name VARCHAR(128) NOT NULL,
      folder_color VARCHAR(16) NOT NULL DEFAULT '#8ec8ff',
      payload_json JSON NOT NULL,
      status ENUM('pending', 'rejected', 'approved', 'added') NOT NULL DEFAULT 'pending',
      reason TEXT NULL,
      reviewed_by INT UNSIGNED NULL,
      reviewed_at TIMESTAMP NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_studio_sub_submitter (submitter_id),
      KEY idx_studio_sub_status (status),
      KEY idx_studio_sub_client (submitter_id, client_folder_id),
      CONSTRAINT fk_studio_sub_user
        FOREIGN KEY (submitter_id) REFERENCES users (id)
        ON DELETE CASCADE,
      CONSTRAINT fk_studio_sub_reviewer
        FOREIGN KEY (reviewed_by) REFERENCES users (id)
        ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      submitter_id INT UNSIGNED NOT NULL,
      submitter_mc_nick VARCHAR(16) NOT NULL,
      kind ENUM('skin', 'model', 'build') NOT NULL,
      description TEXT NOT NULL,
      refs_json JSON NULL,
      results_json JSON NULL,
      status ENUM('pending', 'rejected', 'approved', 'ready') NOT NULL DEFAULT 'pending',
      reason TEXT NULL,
      reviewed_by INT UNSIGNED NULL,
      reviewed_at TIMESTAMP NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_orders_submitter (submitter_id),
      KEY idx_orders_status (status),
      CONSTRAINT fk_orders_user
        FOREIGN KEY (submitter_id) REFERENCES users (id)
        ON DELETE CASCADE,
      CONSTRAINT fk_orders_reviewer
        FOREIGN KEY (reviewed_by) REFERENCES users (id)
        ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  if (!(await columnExists("studio_submissions", "hidden"))) {
    await pool.query(
      `ALTER TABLE studio_submissions
       ADD COLUMN hidden TINYINT(1) NOT NULL DEFAULT 0`
    );
  }
  if (!(await columnExists("studio_submissions", "deleted_at"))) {
    await pool.query(
      `ALTER TABLE studio_submissions
       ADD COLUMN deleted_at TIMESTAMP NULL`
    );
  }
  if (!(await columnExists("studio_submissions", "queue_no"))) {
    await pool.query(
      `ALTER TABLE studio_submissions
       ADD COLUMN queue_no INT UNSIGNED NULL`
    );
  }

  if (!(await columnExists("orders", "hidden"))) {
    await pool.query(
      `ALTER TABLE orders
       ADD COLUMN hidden TINYINT(1) NOT NULL DEFAULT 0`
    );
  }
  if (!(await columnExists("orders", "deleted_at"))) {
    await pool.query(
      `ALTER TABLE orders
       ADD COLUMN deleted_at TIMESTAMP NULL`
    );
  }
  if (!(await columnExists("orders", "queue_no"))) {
    await pool.query(
      `ALTER TABLE orders
       ADD COLUMN queue_no INT UNSIGNED NULL`
    );
  }
  try {
    await pool.query(
      `ALTER TABLE orders
       MODIFY COLUMN kind ENUM('skin', 'model', 'build') NOT NULL`
    );
  } catch (err) {
    console.warn("orders kind enum migrate:", err.message);
  }
}

async function ensureFounderIdZero(founderId) {
  const fromId = Number(founderId);
  if (!Number.isFinite(fromId) || fromId === 0) return 0;

  const conn = await pool.getConnection();
  try {
    await conn.query("SET FOREIGN_KEY_CHECKS = 0");
    await conn.query(
      "SET SESSION sql_mode = CONCAT(@@SESSION.sql_mode, ',NO_AUTO_VALUE_ON_ZERO')"
    );

    const [zeroRows] = await conn.execute(
      `SELECT id, role FROM users WHERE id = 0 LIMIT 1`
    );
    if (zeroRows[0]) {
      if (zeroRows[0].role === "founder") {
        console.log("Founder already has id 0");
        return 0;
      }
      throw new Error("users.id=0 занят не-основателем");
    }

    await conn.execute(`UPDATE profiles SET user_id = 0 WHERE user_id = :id`, {
      id: fromId,
    });
    await conn.execute(`UPDATE game_stats SET user_id = 0 WHERE user_id = :id`, {
      id: fromId,
    });
    await conn.execute(`UPDATE user_bans SET user_id = 0 WHERE user_id = :id`, {
      id: fromId,
    });
    await conn.execute(
      `UPDATE user_bans SET banned_by = 0 WHERE banned_by = :id`,
      { id: fromId }
    );
    await conn.execute(`UPDATE users SET id = 0 WHERE id = :id`, { id: fromId });

    await conn.execute(
      `UPDATE profiles
       SET avatar_path = REPLACE(avatar_path, :fromPref, :toPref)
       WHERE user_id = 0 AND avatar_path LIKE :fromLike`,
      {
        fromPref: `/uploads/avatars/${fromId}.`,
        toPref: `/uploads/avatars/0.`,
        fromLike: `/uploads/avatars/${fromId}.%`,
      }
    );

    for (const ext of ["png", "jpg", "jpeg", "webp", "gif"]) {
      const fromPath = path.join(AVATARS_DIR, `${fromId}.${ext}`);
      const toPath = path.join(AVATARS_DIR, `0.${ext}`);
      if (!fs.existsSync(fromPath)) continue;
      if (fs.existsSync(toPath)) fs.unlinkSync(toPath);
      fs.renameSync(fromPath, toPath);
    }

    await repairUserLocalAvatar(0);

    const [[maxRow]] = await conn.query(
      `SELECT COALESCE(MAX(id), 0) AS maxId FROM users`
    );
    const nextAi = Math.max(1, Number(maxRow.maxId) + 1);
    await conn.query(`ALTER TABLE users AUTO_INCREMENT = ${nextAi}`);

    console.log(`Founder id remapped ${fromId} → 0`);
    return 0;
  } finally {
    try {
      await conn.query("SET FOREIGN_KEY_CHECKS = 1");
    } catch {
      /* ignore */
    }
    conn.release();
  }
}

async function repairUserLocalAvatar(userId) {
  const id = Number(userId);
  if (!Number.isFinite(id) || id < 0) return "";

  const [rows] = await pool.execute(
    `SELECT p.avatar_path, u.telegram_id
     FROM users u
     LEFT JOIN profiles p ON p.user_id = u.id
     WHERE u.id = :id
     LIMIT 1`,
    { id }
  );
  if (!rows[0]) return "";

  const exts = ["png", "jpg", "jpeg", "webp", "gif"];
  const current = String(rows[0].avatar_path || "").split("?")[0].trim();

  const setPath = async (publicPath) => {
    await ensureProfile(id, null);
    await pool.execute(
      `UPDATE profiles SET avatar_path = :avatarPath WHERE user_id = :userId`,
      { avatarPath: publicPath, userId: id }
    );
    return publicPath;
  };

  const existsPublic = (publicPath) => {
    if (!publicPath.startsWith("/uploads/avatars/")) return false;
    return fs.existsSync(path.join(AVATARS_DIR, path.basename(publicPath)));
  };

  if (current && existsPublic(current)) {
    const base = path.basename(current);
    const m = /^(\d+)\.(\w+)$/.exec(base);
    if (m && Number(m[1]) !== id) {
      const destName = `${id}.${m[2]}`;
      const fromAbs = path.join(AVATARS_DIR, base);
      const toAbs = path.join(AVATARS_DIR, destName);
      if (fs.existsSync(fromAbs)) {
        if (fs.existsSync(toAbs) && toAbs !== fromAbs) fs.unlinkSync(toAbs);
        if (toAbs !== fromAbs) fs.renameSync(fromAbs, toAbs);
        return setPath(`/uploads/avatars/${destName}`);
      }
    }
    return current;
  }

  for (const ext of exts) {
    const abs = path.join(AVATARS_DIR, `${id}.${ext}`);
    if (fs.existsSync(abs)) {
      return setPath(`/uploads/avatars/${id}.${ext}`);
    }
  }

  const orphan = /^\/uploads\/avatars\/(\d+)\.(\w+)$/.exec(current);
  if (orphan) {
    const oldAbs = path.join(AVATARS_DIR, `${orphan[1]}.${orphan[2]}`);
    const newAbs = path.join(AVATARS_DIR, `${id}.${orphan[2]}`);
    if (fs.existsSync(oldAbs)) {
      if (fs.existsSync(newAbs) && newAbs !== oldAbs) fs.unlinkSync(newAbs);
      if (newAbs !== oldAbs) fs.renameSync(oldAbs, newAbs);
      return setPath(`/uploads/avatars/${id}.${orphan[2]}`);
    }
  }

  const telegramId = rows[0].telegram_id;
  if (telegramId) {
    try {
      const restored = await saveTelegramAvatar(id, "", telegramId);
      if (restored) return String(restored).split("?")[0];
    } catch (err) {
      console.warn(`avatar repair for user ${id}:`, err.message);
    }
  }
  return "";
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

  let founderId;
  if (rows[0]) {
    founderId = Number(rows[0].id);
    await pool.execute(
      `UPDATE users
       SET telegram = :telegram,
           mc_nick = :mcNick,
           account_type = :accountType,
           role = 'founder',
           password_hash = :hash,
           password_plain = :plain
       WHERE id = :id`,
      { telegram, mcNick, accountType, hash, plain: password, id: founderId }
    );
    await ensureProfile(founderId, mcNick);
    console.log(`Founder seed updated: ${telegram} / ${mcNick}`);
  } else {
    const conn = await pool.getConnection();
    try {
      await conn.query(
        "SET SESSION sql_mode = CONCAT(@@SESSION.sql_mode, ',NO_AUTO_VALUE_ON_ZERO')"
      );
      await conn.execute(
        `INSERT INTO users (id, telegram, mc_nick, account_type, role, password_hash, password_plain)
         VALUES (0, :telegram, :mcNick, :accountType, 'founder', :hash, :plain)`,
        { telegram, mcNick, accountType, hash, plain: password }
      );
      founderId = 0;
    } finally {
      conn.release();
    }
    await ensureProfile(0, mcNick);
    console.log(`Founder seed created with id 0: ${telegram} / ${mcNick}`);
  }

  try {
    founderId = await ensureFounderIdZero(founderId);
  } catch (err) {
    console.warn("Founder id=0 remap:", err.message);
  }
  try {
    await repairUserLocalAvatar(founderId ?? 0);
  } catch (err) {
    console.warn("Founder avatar repair:", err.message);
  }
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

async function downloadToFile(url, destPath) {
  const res = await fetch(String(url), {
    redirect: "follow",
    headers: { "User-Agent": "GenesisWeb/1.0" },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 32) {
    throw new Error("file too small");
  }
  await fs.promises.writeFile(destPath, buf);
  return destPath;
}

async function telegramApi(method, payload = null) {
  if (!TELEGRAM_BOT_TOKEN) {
    throw new Error("TELEGRAM_BOT_TOKEN не настроен");
  }
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN.trim()}/${method}`;
  const init =
    payload == null
      ? { method: "GET" }
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        };
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!data.ok) {
    const desc = data.description || `Telegram API ${method} failed`;
    throw new Error(desc);
  }
  return data.result;
}

async function fileUrlFromTelegramFileId(fileId) {
  if (!fileId) return "";
  const fileData = await telegramApi("getFile", { file_id: fileId });
  const filePath = fileData?.file_path;
  if (!filePath) return "";
  return `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN.trim()}/${filePath}`;
}

async function resolveTelegramPhotoUrl(telegramId, widgetPhotoUrl) {
  const widget = String(widgetPhotoUrl || "").trim();
  if (widget) return widget;
  if (!TELEGRAM_BOT_TOKEN || !telegramId) return "";

  const uid = Number(telegramId);
  if (!Number.isFinite(uid)) return "";

  // 1) Альбом фото профиля
  try {
    const photos = await telegramApi("getUserProfilePhotos", {
      user_id: uid,
      limit: 1,
    });
    const sizes = photos?.photos?.[0];
    if (Array.isArray(sizes) && sizes.length) {
      const best = sizes[sizes.length - 1];
      const url = await fileUrlFromTelegramFileId(best.file_id);
      if (url) return url;
    }
  } catch (err) {
    console.warn("getUserProfilePhotos:", err.message);
  }

  // 2) Фото личного чата с ботом (появляется после /start)
  try {
    const chat = await telegramApi("getChat", { chat_id: uid });
    const fileId = chat?.photo?.big_file_id || chat?.photo?.small_file_id;
    const url = await fileUrlFromTelegramFileId(fileId);
    if (url) return url;
  } catch (err) {
    console.warn("getChat photo:", err.message);
  }

  return "";
}

async function syncAvatarByTelegramId(telegramId, photoUrl = "") {
  const tid = Number(telegramId);
  if (!Number.isFinite(tid)) return "";
  const [rows] = await pool.execute(
    `SELECT id FROM users WHERE telegram_id = :telegramId LIMIT 1`,
    { telegramId: tid }
  );
  if (!rows[0]) return "";
  return saveTelegramAvatar(rows[0].id, photoUrl, tid);
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
  const fromId = Number(msg.from?.id);
  let avatarSynced = false;
  if (Number.isFinite(fromId)) {
    try {
      const avatarUrl = await syncAvatarByTelegramId(fromId, "");
      avatarSynced = Boolean(avatarUrl);
    } catch (err) {
      console.warn("avatar sync on /start:", err.message);
    }
  }

  const reply = avatarSynced
    ? `Готово! Аватар подтянут.\nОбнови страницу сайта или нажми «Обновить аватар».`
    : `Привет! Это ${botName}.\n\n` +
      `Если аватар на сайте пустой:\n` +
      `1) Убедись, что в Telegram есть фото профиля\n` +
      `2) Настройки → Конфиденциальность → Фотографии профиля → не «Никто»\n` +
      `3) На сайте: Выйти → Войти через Telegram`;

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
  if (!url) {
    console.warn(
      `avatar missing for user ${userId}: no photo_url and bot could not resolve photo (tg=${telegramId || "-"})`
    );
    return "";
  }

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
    console.log(`avatar saved locally for user ${userId}: ${publicPath}`);
    return await persistPath(publicPath);
  } catch (err) {
    console.warn("avatar download failed:", err.message);
  }

  // Bot API fallback (если пришёл widget URL, а скачать не вышло)
  if (telegramId) {
    try {
      const botUrl = await resolveTelegramPhotoUrl(telegramId, "");
      if (botUrl && botUrl !== url) {
        await downloadToFile(botUrl, absPath);
        console.log(`avatar saved via bot API for user ${userId}`);
        return await persistPath(publicPath);
      }
      if (botUrl) {
        await downloadToFile(botUrl, absPath);
        return await persistPath(publicPath);
      }
    } catch (err2) {
      console.warn("avatar bot fallback failed:", err2.message);
    }
  }

  // Последний запасной вариант — прямая ссылка (браузер сможет открыть)
  if (url.startsWith("http://") || url.startsWith("https://")) {
    try {
      console.log(`avatar stored as remote URL for user ${userId}`);
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

async function allocateUniqueMcNick(baseName, excludeUserId = null) {
  const base = String(baseName || "Genesis_Player")
    .replace(/[^A-Za-z0-9_]/g, "")
    .slice(0, 16) || "Genesis_Player";
  for (let i = 0; i < 50; i += 1) {
    const suffix = i === 0 ? "" : String(i);
    const nick = `${base.slice(0, Math.max(3, 16 - suffix.length))}${suffix}`;
    if (!MC_NICK_RE.test(nick)) continue;
    const [rows] = await pool.execute(
      `SELECT id FROM users WHERE mc_nick = :nick LIMIT 1`,
      { nick }
    );
    if (!rows[0] || Number(rows[0].id) === Number(excludeUserId)) return nick;
  }
  return `GP${Date.now().toString(36)}`.slice(0, 16);
}

async function persistUploadedAvatar(userId, dataUrl) {
  ensureUploadDirs();
  await ensureProfile(userId, null);
  const match = /^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,([A-Za-z0-9+/=]+)$/i.exec(
    String(dataUrl || "")
  );
  if (!match) {
    const err = new Error("Нужно изображение PNG/JPEG/WebP/GIF");
    err.status = 400;
    throw err;
  }
  const mime = match[1].toLowerCase();
  const ext = mime.includes("png")
    ? "png"
    : mime.includes("webp")
      ? "webp"
      : mime.includes("gif")
        ? "gif"
        : "jpg";
  const buf = Buffer.from(match[2], "base64");
  if (buf.length < 32 || buf.length > 2.5 * 1024 * 1024) {
    const err = new Error("Размер файла: до 2.5 МБ");
    err.status = 400;
    throw err;
  }

  // Удаляем старые файлы с другим расширением
  for (const oldExt of ["png", "jpg", "jpeg", "webp", "gif"]) {
    const oldPath = path.join(AVATARS_DIR, `${userId}.${oldExt}`);
    try {
      await fs.promises.unlink(oldPath);
    } catch {
      /* ignore */
    }
  }

  const publicPath = `/uploads/avatars/${userId}.${ext}`;
  const absPath = path.join(AVATARS_DIR, `${userId}.${ext}`);
  await fs.promises.writeFile(absPath, buf);
  await pool.execute(
    `UPDATE profiles SET avatar_path = :avatarPath WHERE user_id = :userId`,
    { avatarPath: publicPath, userId }
  );
  return publicAvatarUrl(publicPath);
}

async function resetUserAvatar(userId) {
  await ensureProfile(userId, null);
  const [rows] = await pool.execute(
    `SELECT telegram_id FROM users WHERE id = :userId LIMIT 1`,
    { userId }
  );
  const telegramId = rows[0]?.telegram_id || null;
  for (const oldExt of ["png", "jpg", "jpeg", "webp", "gif"]) {
    const oldPath = path.join(AVATARS_DIR, `${userId}.${oldExt}`);
    try {
      await fs.promises.unlink(oldPath);
    } catch {
      /* ignore */
    }
  }
  await pool.execute(
    `UPDATE profiles SET avatar_path = NULL WHERE user_id = :userId`,
    { userId }
  );
  if (telegramId) {
    return saveTelegramAvatar(userId, "", telegramId);
  }
  return "";
}

async function loadUserPublic(userId) {
  const [rows] = await pool.execute(
    `SELECT u.id, u.telegram, u.mc_nick, u.account_type, u.role,
            p.avatar_path, p.site_nick, p.race_name, p.form_json,
            p.show_site_online, p.show_server_online, p.show_online_frame,
            b.expires_at AS banned_until
     FROM users u
     LEFT JOIN profiles p ON p.user_id = u.id
     LEFT JOIN user_bans b ON b.user_id = u.id AND b.expires_at > NOW()
     WHERE u.id = :userId
     LIMIT 1`,
    { userId }
  );
  return rows[0] ? toPublicUser(rows[0]) : null;
}

async function findUserRowByNick(nickRaw) {
  const nick = String(nickRaw || "").trim();
  if (!nick) return null;
  const [rows] = await pool.execute(
    `SELECT u.id, u.telegram, u.mc_nick, u.account_type, u.role,
            p.avatar_path, p.site_nick, p.show_site_online, p.show_server_online, p.show_online_frame,
            b.expires_at AS banned_until
     FROM users u
     LEFT JOIN profiles p ON p.user_id = u.id
     LEFT JOIN user_bans b ON b.user_id = u.id AND b.expires_at > NOW()
     WHERE u.mc_nick = :nick
        OR p.site_nick = :nick
        OR LOWER(u.mc_nick) = LOWER(:nick)
        OR LOWER(COALESCE(p.site_nick, '')) = LOWER(:nick)
     LIMIT 1`,
    { nick }
  );
  return rows[0] || null;
}

function banDurationMs(value, unit) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0 || n > 1000000) return null;
  const map = {
    second: 1000,
    minute: 60 * 1000,
    hour: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
  };
  const mult = map[unit];
  if (!mult) return null;
  return Math.floor(n * mult);
}

function emitGameCommandStub(payload) {
  // Задел: мод Minecraft сможет слушать и применять бан на сервере
  try {
    io.emit("panel:game-command", payload);
  } catch (err) {
    console.warn("panel:game-command emit:", err.message);
  }
}

async function applyPermissionCommand(actor, nick, actionRaw) {
  if (!isAdminRole(actor.role)) {
    const err = new Error("Команда permission только для админов");
    err.status = 403;
    throw err;
  }
  const action = String(actionRaw || "").trim().toLowerCase();
  if (!["admin", "helper", "remove"].includes(action)) {
    const err = new Error("Действие: admin, helper или remove");
    err.status = 400;
    throw err;
  }
  const row = await findUserRowByNick(nick);
  if (!row) {
    const err = new Error("Пользователь не найден");
    err.status = 404;
    throw err;
  }
  if (row.role === "founder") {
    const err = new Error("Нельзя изменить права Основателя");
    err.status = 403;
    throw err;
  }
  if (Number(row.id) === Number(actor.id) && action === "remove") {
    const err = new Error("Нельзя снять права самому себе");
    err.status = 400;
    throw err;
  }
  const nextRole = action === "remove" ? "user" : action;
  await pool.execute(`UPDATE users SET role = :role WHERE id = :userId`, {
    role: nextRole,
    userId: row.id,
  });
  const user = await loadUserPublic(row.id);
  broadcastDirectoryUser(user);
  return {
    ok: true,
    message: `Права ${row.mc_nick}: ${nextRole}`,
    user,
  };
}

async function applyBanCommand(actor, nick, amountRaw, unitRaw) {
  if (!isStaffRole(actor.role)) {
    const err = new Error("Нет доступа");
    err.status = 403;
    throw err;
  }
  const unit = String(unitRaw || "").trim().toLowerCase();
  const ms = banDurationMs(amountRaw, unit);
  if (!ms) {
    const err = new Error("Формат: ban <ник> <число> second|minute|hour|day");
    err.status = 400;
    throw err;
  }
  const row = await findUserRowByNick(nick);
  if (!row) {
    const err = new Error("Пользователь не найден");
    err.status = 404;
    throw err;
  }
  if (row.role === "founder") {
    const err = new Error("Нельзя забанить Основателя");
    err.status = 403;
    throw err;
  }
  if (Number(row.id) === Number(actor.id)) {
    const err = new Error("Нельзя забанить самого себя");
    err.status = 400;
    throw err;
  }
  const expiresAt = new Date(Date.now() + ms);
  const expiresSql = expiresAt.toISOString().slice(0, 19).replace("T", " ");
  await pool.execute(
    `INSERT INTO user_bans (user_id, banned_by, duration_value, duration_unit, expires_at)
     VALUES (:userId, :bannedBy, :durationValue, :durationUnit, :expiresAt)
     ON DUPLICATE KEY UPDATE
       banned_by = VALUES(banned_by),
       duration_value = VALUES(duration_value),
       duration_unit = VALUES(duration_unit),
       banned_at = CURRENT_TIMESTAMP,
       expires_at = VALUES(expires_at)`,
    {
      userId: row.id,
      bannedBy: actor.id,
      durationValue: Number(amountRaw),
      durationUnit: unit,
      expiresAt: expiresSql,
    }
  );
  const user = await loadUserPublic(row.id);
  broadcastDirectoryUser(user);
  emitGameCommandStub({
    type: "ban",
    userId: row.id,
    mcNick: row.mc_nick,
    expiresAt: expiresAt.toISOString(),
    durationValue: Number(amountRaw),
    durationUnit: unit,
    by: actor.id,
  });
  return {
    ok: true,
    message: `Бан ${row.mc_nick} до ${expiresAt.toLocaleString("ru-RU")}`,
    user,
  };
}

async function applyUnbanCommand(actor, nick) {
  if (!isStaffRole(actor.role)) {
    const err = new Error("Нет доступа");
    err.status = 403;
    throw err;
  }
  const row = await findUserRowByNick(nick);
  if (!row) {
    const err = new Error("Пользователь не найден");
    err.status = 404;
    throw err;
  }
  await pool.execute(`DELETE FROM user_bans WHERE user_id = :userId`, {
    userId: row.id,
  });
  const user = await loadUserPublic(row.id);
  broadcastDirectoryUser(user);
  emitGameCommandStub({
    type: "unban",
    userId: row.id,
    mcNick: row.mc_nick,
    by: actor.id,
  });
  return {
    ok: true,
    message: `Разбан ${row.mc_nick}`,
    user,
  };
}

async function applyPasswordCommand(actor, nick, modeOrPass, confirmPass) {
  if (!isAdminRole(actor.role)) {
    const err = new Error("Команда password только для админов");
    err.status = 403;
    throw err;
  }
  const row = await findUserRowByNick(nick);
  if (!row) {
    const err = new Error("Пользователь не найден");
    err.status = 404;
    throw err;
  }
  const mode = String(modeOrPass || "").trim();
  if (!mode) {
    const err = new Error(
      "Формат: password <ник> unset | password <ник> <пароль> <повтор>"
    );
    err.status = 400;
    throw err;
  }
  if (mode.toLowerCase() === "unset") {
    await pool.execute(
      `UPDATE users SET password_hash = NULL, password_plain = NULL WHERE id = :userId`,
      { userId: row.id }
    );
    return {
      ok: true,
      message: `Пароль ${row.mc_nick}: unset (вход только через Telegram)`,
    };
  }
  const pass = mode;
  const confirm = String(confirmPass || "");
  if (pass.length < 6 || pass.length > 72) {
    const err = new Error("Пароль: 6–72 символа");
    err.status = 400;
    throw err;
  }
  if (pass !== confirm) {
    const err = new Error("Пароли не совпадают");
    err.status = 400;
    throw err;
  }
  const hash = await bcrypt.hash(pass, BCRYPT_ROUNDS);
  await pool.execute(
    `UPDATE users
     SET password_hash = :hash, password_plain = :plain
     WHERE id = :userId`,
    { hash, plain: pass, userId: row.id }
  );
  return {
    ok: true,
    message: `Пароль ${row.mc_nick} установлен`,
  };
}

async function applyPasswordShowCommand(actor, nickRaw) {
  if (!isAdminRole(actor.role)) {
    const err = new Error("Команда password_show только для админов");
    err.status = 403;
    throw err;
  }
  const nick = String(nickRaw || "").trim();
  if (nick) {
    const row = await findUserRowByNick(nick);
    if (!row) {
      const err = new Error("Пользователь не найден");
      err.status = 404;
      throw err;
    }
    const [rows] = await pool.execute(
      `SELECT mc_nick, password_hash, password_plain
       FROM users WHERE id = :userId LIMIT 1`,
      { userId: row.id }
    );
    const u = rows[0];
    const value = formatPasswordShowValue(u);
    return {
      ok: true,
      message: `${u.mc_nick}: ${value}`,
      entries: [{ nick: u.mc_nick, password: value }],
    };
  }

  const [rows] = await pool.execute(
    `SELECT mc_nick, password_hash, password_plain
     FROM users
     ORDER BY mc_nick ASC
     LIMIT 500`
  );
  const entries = rows.map((u) => ({
    nick: u.mc_nick,
    password: formatPasswordShowValue(u),
  }));
  const message = entries.map((e) => `${e.nick}: ${e.password}`).join(", ");
  return {
    ok: true,
    message: message || "Нет пользователей",
    entries,
  };
}

function formatPasswordShowValue(row) {
  if (!row?.password_hash) return "unset";
  const plain = String(row.password_plain || "");
  if (plain) return plain;
  return "set";
}

async function executePanelLine(actor, lineRaw) {
  const line = String(lineRaw || "").trim();
  if (!line) {
    const err = new Error("Пустая команда");
    err.status = 400;
    throw err;
  }
  if (line.startsWith("/")) {
    // Задел: команды игры на Minecraft-сервере
    emitGameCommandStub({
      type: "raw",
      command: line.slice(1).trim(),
      by: actor.id,
    });
    return {
      ok: true,
      stub: true,
      message: `Игровая команда принята (задел): ${line}`,
    };
  }

  const parts = line.split(/\s+/).filter(Boolean);
  const cmd = String(parts[0] || "").toLowerCase();
  if (cmd === "permission") {
    return applyPermissionCommand(actor, parts[1], parts[2]);
  }
  if (cmd === "ban") {
    return applyBanCommand(actor, parts[1], parts[2], parts[3]);
  }
  if (cmd === "unban") {
    return applyUnbanCommand(actor, parts[1]);
  }
  if (cmd === "password") {
    return applyPasswordCommand(actor, parts[1], parts[2], parts[3]);
  }
  if (cmd === "password_show") {
    return applyPasswordShowCommand(actor, parts[1] || "");
  }
  const err = new Error(`Неизвестная команда: ${cmd}`);
  err.status = 400;
  throw err;
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

/* ---------- Presence (site + Minecraft server) ---------- */
const onlineUsers = new Map(); // socket.id -> { userId?, mcNick? }
const serverOnlineIds = new Set(); // user ids online on Minecraft server

function getOnlineUserIds() {
  const ids = new Set();
  for (const entry of onlineUsers.values()) {
    const id = Number(entry?.userId);
    if (Number.isFinite(id) && id >= 0) ids.add(id);
  }
  return [...ids];
}

function getServerOnlineUserIds() {
  return [...serverOnlineIds];
}

function broadcastPresence() {
  const onlineIds = getOnlineUserIds();
  const serverIds = getServerOnlineUserIds();
  io.emit("presence:update", {
    online: onlineIds.length,
    onlineIds,
    serverOnlineIds: serverIds,
  });
}

function withPresenceFlags(user) {
  if (!user) return null;
  const id = Number(user.id);
  const onlineSet = new Set(getOnlineUserIds());
  const serverSet = new Set(getServerOnlineUserIds());
  // showOnlineFrame — только своя рамка в профиле; видимость для других — отдельные флаги
  const siteOnline = user.showSiteOnline !== false && onlineSet.has(id);
  const serverOnline = user.showServerOnline !== false && serverSet.has(id);
  return {
    ...user,
    online: siteOnline,
    siteOnline,
    serverOnline,
  };
}

function broadcastDirectoryUser(user) {
  const payload = withPresenceFlags(user);
  if (!payload) return;
  io.emit("directory:user", { user: payload });
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
    if (userId == null) {
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
        (telegram, telegram_id, mc_nick, account_type, role, password_hash, password_plain)
       VALUES
        (:telegram, :telegramId, :mcNick, :accountType, 'user', :hash, :plain)`,
      { telegram, telegramId, mcNick, accountType, hash, plain: password }
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
    if (!row.password_hash) {
      return res.status(401).json({
        error: "Вход по паролю отключён. Войдите через Telegram",
        field: "password",
      });
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

function signMcAuthProof(challenge, nick, status) {
  return crypto
    .createHmac("sha256", MOD_API_KEY)
    .update(`${challenge}\n${String(nick || "").toLowerCase()}\n${status}`)
    .digest("hex");
}

async function lookupMcPasswordStatus(nick, password) {
  const [rows] = await pool.execute(
    `SELECT mc_nick, password_hash, account_type, telegram
     FROM users WHERE LOWER(mc_nick) = LOWER(:nick) LIMIT 1`,
    { nick }
  );
  const row = rows[0];
  if (!row) {
    return { status: "unknown", row: null };
  }
  if (!row.password_hash) {
    return { status: "unset", row };
  }
  const ok = await bcrypt.compare(password, row.password_hash);
  return { status: ok ? "ok" : "wrong", row };
}

/** Проверка пароля для Minecraft-мода (сервер → сайт)
 *  POST /api/mc/verify
 *  Header: x-mod-key: <MOD_API_KEY>
 *  Body: { "nick": "PlayerNick", "password": "..." }
 *  200 { ok: true } | 401 Unknown player / Wrong password / Password unset | 403 key
 */
app.post("/api/mc/verify", async (req, res) => {
  try {
    if (!MOD_API_KEY) {
      console.error("mc verify: MOD_API_KEY is not set");
      return res.status(403).json({ ok: false, error: "Forbidden" });
    }
    const key = String(req.headers["x-mod-key"] || req.body?.apiKey || "");
    if (key !== MOD_API_KEY) {
      return res.status(403).json({ ok: false, error: "Forbidden" });
    }

    const nick = normalizeMcNick(req.body?.nick || req.body?.mcNick);
    const password = String(req.body?.password || "");
    if (!MC_NICK_RE.test(nick) || !password) {
      return res.status(400).json({ ok: false, error: "Bad request" });
    }

    const { status, row } = await lookupMcPasswordStatus(nick, password);
    if (status === "unknown") {
      return res.status(401).json({ ok: false, error: "Unknown player" });
    }
    if (status === "unset") {
      return res.status(401).json({ ok: false, error: "Password unset" });
    }
    if (status === "wrong") {
      return res.status(401).json({ ok: false, error: "Wrong password" });
    }

    return res.json({
      ok: true,
      nick: row.mc_nick || nick,
      accountType: row.account_type,
      telegram: row.telegram,
    });
  } catch (err) {
    console.error("mc verify:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

/** Проверка пароля с клиента Minecraft (игровой хостинг часто режет исходящий HTTP с сервера)
 *  POST /api/mc/player-verify
 *  Body: { "nick", "password", "challenge" }
 *  200 { ok, status, nick, challenge, sig } — sig = HMAC-SHA256(MOD_API_KEY, challenge\\nnick\\nstatus)
 */
app.post("/api/mc/player-verify", async (req, res) => {
  try {
    if (!MOD_API_KEY) {
      console.error("mc player-verify: MOD_API_KEY is not set");
      return res.status(503).json({ ok: false, error: "Unavailable" });
    }

    const nick = normalizeMcNick(req.body?.nick || req.body?.mcNick);
    const password = String(req.body?.password || "");
    const challenge = String(req.body?.challenge || "").trim().toLowerCase();
    if (!MC_NICK_RE.test(nick) || !password || !/^[a-f0-9]{32}$/.test(challenge)) {
      return res.status(400).json({ ok: false, error: "Bad request" });
    }

    const { status, row } = await lookupMcPasswordStatus(nick, password);
    const resolvedNick = (row && row.mc_nick) || nick;
    const sig = signMcAuthProof(challenge, resolvedNick, status);
    return res.json({
      ok: status === "ok",
      status,
      nick: resolvedNick,
      challenge,
      sig,
    });
  } catch (err) {
    console.error("mc player-verify:", err);
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
              p.site_nick, p.show_site_online, p.show_server_online, p.show_online_frame,
              p.updated_at, g.score, g.inventory_json, g.meta_json
       FROM profiles p
       LEFT JOIN game_stats g ON g.user_id = p.user_id
       WHERE p.user_id = :userId
       LIMIT 1`,
      { userId: req.user.id }
    );
    const row = rows[0] || {};

    let avatarPath = String(row.avatar_path || "").split("?")[0];
    if (!avatarPath || !fs.existsSync(path.join(AVATARS_DIR, path.basename(avatarPath)))) {
      const repaired = await repairUserLocalAvatar(req.user.id);
      if (repaired) {
        avatarPath = String(repaired).split("?")[0];
        row.avatar_path = avatarPath;
      }
    }

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
      site_nick: row.site_nick || "",
      race_name: row.race_name || "",
      form_json: row.form_json || {},
      show_site_online: row.show_site_online,
      show_server_online: row.show_server_online,
      show_online_frame: row.show_online_frame,
    });
    if (user.avatarUrl) {
      user.avatarUrl = publicAvatarUrl(user.avatarUrl);
    }
    const payload = {
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
    };
    if (req.user.tokenNeedsRefresh) {
      payload.token = signToken(user);
    }
    return res.json(payload);
  } catch (err) {
    console.error("profile get:", err);
    return res.status(500).json({ error: "Не удалось загрузить профиль" });
  }
});

app.patch("/api/user/site-nick", authMiddleware, async (req, res) => {
  try {
    await ensureProfile(req.user.id, req.user.mcNick || null);
    let siteNick = String(req.body?.siteNick || req.body?.site_nick || "").trim();
    if (!siteNick) {
      const [rows] = await pool.execute(
        `SELECT telegram FROM users WHERE id = :userId LIMIT 1`,
        { userId: req.user.id }
      );
      const tg = String(rows[0]?.telegram || "").trim();
      siteNick = tg.replace(/^@/, "") || tg;
    }
    siteNick = siteNick.slice(0, 32);
    await pool.execute(
      `UPDATE profiles SET site_nick = :siteNick WHERE user_id = :userId`,
      { siteNick, userId: req.user.id }
    );
    const user = await loadUserPublic(req.user.id);
    return res.json({ ok: true, user });
  } catch (err) {
    console.error("site-nick update:", err);
    return res.status(500).json({ error: "Не удалось сменить ник на сайте" });
  }
});

app.post("/api/user/save", authMiddleware, async (req, res) => {
  try {
    await ensureProfile(req.user.id, req.user.mcNick || null);

    if (req.body?.resetAvatar) {
      await resetUserAvatar(req.user.id);
    } else if (req.body?.image || req.body?.dataUrl) {
      await persistUploadedAvatar(
        req.user.id,
        req.body?.image || req.body?.dataUrl
      );
    }

    let siteNick = String(req.body?.siteNick || req.body?.site_nick || "").trim();
    if (!siteNick) {
      const [rows] = await pool.execute(
        `SELECT telegram FROM users WHERE id = :userId LIMIT 1`,
        { userId: req.user.id }
      );
      const tg = String(rows[0]?.telegram || "").trim();
      siteNick = tg.replace(/^@/, "") || tg;
    }
    siteNick = siteNick.slice(0, 32);
    await pool.execute(
      `UPDATE profiles SET site_nick = :siteNick WHERE user_id = :userId`,
      { siteNick, userId: req.user.id }
    );

    let mcNick = normalizeMcNick(req.body?.mcNick || req.body?.mc_nick);
    const rawMc = String(req.body?.mcNick || req.body?.mc_nick || "").trim();
    if (!mcNick) {
      mcNick = await allocateUniqueMcNick("Genesis_Player", req.user.id);
    }
    if (!MC_NICK_RE.test(mcNick)) {
      return res.status(400).json({
        error: "Игровой ник: 3–16 символов, латиница, цифры и _",
        field: "mcNick",
      });
    }

    const [mine] = await pool.execute(
      `SELECT mc_nick FROM users WHERE id = :userId LIMIT 1`,
      { userId: req.user.id }
    );
    const current = mine[0]?.mc_nick || "";
    if (current !== mcNick) {
      const [taken] = await pool.execute(
        `SELECT id FROM users WHERE mc_nick = :mcNick AND id <> :userId LIMIT 1`,
        { mcNick, userId: req.user.id }
      );
      if (taken[0]) {
        if (!rawMc) {
          mcNick = await allocateUniqueMcNick("Genesis_Player", req.user.id);
        } else {
          return res.status(409).json({
            error: "Этот игровой ник уже занят",
            field: "mcNick",
          });
        }
      }
      await pool.execute(
        `UPDATE users SET mc_nick = :mcNick WHERE id = :userId`,
        { mcNick, userId: req.user.id }
      );
      await ensureProfile(req.user.id, mcNick);
    }

    const user = await loadUserPublic(req.user.id);
    if (user?.avatarUrl) {
      const base = String(user.avatarUrl).split("?")[0];
      user.avatarUrl = `${base}?v=${Date.now()}`;
    }
    broadcastDirectoryUser(user);
    return res.json({
      ok: true,
      user,
      token: signToken(user),
    });
  } catch (err) {
    console.error("user save:", err);
    if (err.status === 400) {
      return res.status(400).json({ error: err.message });
    }
    const msg = String(err?.message || "");
    if (msg.includes("Duplicate") || msg.includes("uq_users_mc_nick")) {
      return res.status(409).json({ error: "Этот игровой ник уже занят", field: "mcNick" });
    }
    return res.status(500).json({ error: "Не удалось сохранить профиль" });
  }
});

app.patch("/api/user/mc-nick", authMiddleware, async (req, res) => {
  try {
    let mcNick = normalizeMcNick(req.body?.mcNick || req.body?.mc_nick);
    if (!mcNick) {
      mcNick = await allocateUniqueMcNick("Genesis_Player", req.user.id);
    }
    if (!MC_NICK_RE.test(mcNick)) {
      return res.status(400).json({
        error: "Ник: 3–16 символов, латиница, цифры и _",
        field: "mcNick",
      });
    }

    const [mine] = await pool.execute(
      `SELECT mc_nick FROM users WHERE id = :userId LIMIT 1`,
      { userId: req.user.id }
    );
    const current = mine[0]?.mc_nick || "";
    if (current === mcNick) {
      const user = await loadUserPublic(req.user.id);
      return res.json({ ok: true, user, token: signToken(user) });
    }

    const [taken] = await pool.execute(
      `SELECT id FROM users WHERE mc_nick = :mcNick AND id <> :userId LIMIT 1`,
      { mcNick, userId: req.user.id }
    );
    if (taken[0]) {
      if (String(req.body?.mcNick || req.body?.mc_nick || "").trim() === "") {
        mcNick = await allocateUniqueMcNick("Genesis_Player", req.user.id);
      } else {
        return res.status(409).json({
          error: "Этот ник уже занят",
          field: "mcNick",
        });
      }
    }

    await pool.execute(
      `UPDATE users SET mc_nick = :mcNick WHERE id = :userId`,
      { mcNick, userId: req.user.id }
    );
    await ensureProfile(req.user.id, mcNick);
    const user = await loadUserPublic(req.user.id);
    return res.json({ ok: true, user, token: signToken(user) });
  } catch (err) {
    console.error("mc-nick update:", err);
    const msg = String(err?.message || "");
    if (msg.includes("Duplicate") || msg.includes("uq_users_mc_nick")) {
      return res.status(409).json({ error: "Этот ник уже занят", field: "mcNick" });
    }
    return res.status(500).json({ error: "Не удалось сменить игровой ник" });
  }
});

app.patch("/api/user/privacy", authMiddleware, async (req, res) => {
  try {
    await ensureProfile(req.user.id, req.user.mcNick || null);
    const fields = [];
    const params = { userId: req.user.id };
    const map = {
      showSiteOnline: "show_site_online",
      showServerOnline: "show_server_online",
      showOnlineFrame: "show_online_frame",
    };
    for (const [key, column] of Object.entries(map)) {
      if (req.body?.[key] === undefined && req.body?.[column] === undefined) continue;
      const raw = req.body?.[key] !== undefined ? req.body[key] : req.body[column];
      fields.push(`${column} = :${key}`);
      params[key] = raw ? 1 : 0;
    }
    if (!fields.length) {
      return res.status(400).json({ error: "Нет параметров" });
    }
    await pool.execute(
      `UPDATE profiles SET ${fields.join(", ")} WHERE user_id = :userId`,
      params
    );
    const user = await loadUserPublic(req.user.id);
    broadcastDirectoryUser(user);
    return res.json({ ok: true, user });
  } catch (err) {
    console.error("privacy update:", err);
    return res.status(500).json({ error: "Не удалось сохранить настройки" });
  }
});

app.post("/api/user/avatar/upload", authMiddleware, async (req, res) => {
  try {
    const avatarUrl = await persistUploadedAvatar(
      req.user.id,
      req.body?.image || req.body?.dataUrl
    );
    const user = await loadUserPublic(req.user.id);
    if (user) user.avatarUrl = avatarUrl;
    broadcastDirectoryUser(user);
    return res.json({ ok: true, user, avatarUrl });
  } catch (err) {
    console.error("avatar upload:", err);
    if (err.status === 400) {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: "Не удалось загрузить аватар" });
  }
});

app.post("/api/user/avatar/reset", authMiddleware, async (req, res) => {
  try {
    const avatarUrl = await resetUserAvatar(req.user.id);
    const user = await loadUserPublic(req.user.id);
    if (avatarUrl && user) user.avatarUrl = avatarUrl;
    broadcastDirectoryUser(user);
    return res.json({ ok: true, user, avatarUrl: user?.avatarUrl || "" });
  } catch (err) {
    console.error("avatar reset:", err);
    return res.status(500).json({ error: "Не удалось сбросить аватар" });
  }
});

async function assertFounderActor(req) {
  await refreshUserRole(req);
  if (req.user?.role !== "founder") {
    const err = new Error("Только основатель");
    err.status = 403;
    throw err;
  }
}

async function assertFounderCanEditOtherUser(req, targetId) {
  await assertFounderActor(req);
  const actorId = Number(req.user?.id);
  const otherId = Number(targetId);
  if (!Number.isFinite(actorId) || !Number.isFinite(otherId) || otherId < 0) {
    const err = new Error("Некорректный пользователь");
    err.status = 400;
    throw err;
  }
  if (actorId === otherId) {
    const err = new Error("Свой профиль меняй в настройках");
    err.status = 403;
    throw err;
  }
}

function parseTargetUserId(raw) {
  const id = Number(raw);
  if (!Number.isFinite(id) || id < 0) {
    const err = new Error("Некорректный пользователь");
    err.status = 400;
    throw err;
  }
  return id;
}

app.put("/api/users/:id/profile", authMiddleware, async (req, res) => {
  try {
    const targetId = parseTargetUserId(req.params.id);
    await assertFounderCanEditOtherUser(req, targetId);
    const existing = await loadUserPublic(targetId);
    if (!existing) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }
    await ensureProfile(targetId, existing.mcNick || null);

    let siteNick =
      req.body?.siteNick !== undefined || req.body?.site_nick !== undefined
        ? String(req.body?.siteNick || req.body?.site_nick || "").trim()
        : String(existing.siteNick || "").trim();
    if (!siteNick) {
      const [rows] = await pool.execute(
        `SELECT telegram FROM users WHERE id = :userId LIMIT 1`,
        { userId: targetId }
      );
      const tg = String(rows[0]?.telegram || "").trim();
      siteNick = tg.replace(/^@/, "") || tg;
    }
    siteNick = siteNick.slice(0, 32);

    let mcNick = existing.mcNick || "";
    if (req.body?.mcNick !== undefined || req.body?.mc_nick !== undefined) {
      mcNick = normalizeMcNick(req.body?.mcNick || req.body?.mc_nick);
      if (!MC_NICK_RE.test(mcNick)) {
        return res.status(400).json({
          error: "Игровой ник: 3–16 символов, латиница, цифры и _",
          field: "mcNick",
        });
      }
      if (mcNick !== existing.mcNick) {
        const [taken] = await pool.execute(
          `SELECT id FROM users WHERE mc_nick = :mcNick AND id <> :userId LIMIT 1`,
          { mcNick, userId: targetId }
        );
        if (taken[0]) {
          return res.status(409).json({
            error: "Этот игровой ник уже занят",
            field: "mcNick",
          });
        }
        await pool.execute(
          `UPDATE users SET mc_nick = :mcNick WHERE id = :userId`,
          { mcNick, userId: targetId }
        );
        await ensureProfile(targetId, mcNick);
      }
    }

    await pool.execute(
      `UPDATE profiles SET site_nick = :siteNick WHERE user_id = :userId`,
      { siteNick, userId: targetId }
    );

    const formIn =
      req.body?.form && typeof req.body.form === "object" ? req.body.form : {};
    const prevForm = existing.race || {};
    const form = {
      nick: mcNick || "",
      raceName: String(formIn.raceName ?? prevForm.raceName ?? "").trim().slice(0, 64),
      origin: String(formIn.origin ?? prevForm.origin ?? "").trim(),
      abilities: String(formIn.abilities ?? prevForm.abilities ?? "").trim(),
      traits: String(formIn.traits ?? prevForm.traits ?? "").trim(),
      useful: String(formIn.useful ?? prevForm.useful ?? "").trim(),
      mechanics: String(formIn.mechanics ?? prevForm.mechanics ?? "").trim(),
      blocks: Array.isArray(formIn.blocks)
        ? formIn.blocks
        : Array.isArray(prevForm.blocks)
          ? prevForm.blocks
          : [],
    };
    const registered =
      req.body?.registered !== undefined
        ? Boolean(req.body.registered)
        : Boolean(
            form.raceName && form.origin && form.abilities && form.useful
          );

    await pool.execute(
      `UPDATE profiles
       SET form_json = :formJson,
           race_name = :raceName,
           registered = :registered
       WHERE user_id = :userId`,
      {
        userId: targetId,
        formJson: JSON.stringify(form),
        raceName: form.raceName || null,
        registered: registered ? 1 : 0,
      }
    );
    const user = await loadUserPublic(targetId);
    broadcastDirectoryUser(user);
    return res.json({ ok: true, user });
  } catch (err) {
    console.error("founder profile put:", err);
    const status = err.status || 500;
    return res.status(status).json({
      error: err.message || "Не удалось сохранить профиль",
    });
  }
});

app.post("/api/users/:id/avatar/upload", authMiddleware, async (req, res) => {
  try {
    const targetId = parseTargetUserId(req.params.id);
    await assertFounderCanEditOtherUser(req, targetId);
    const existing = await loadUserPublic(targetId);
    if (!existing) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }
    const avatarUrl = await persistUploadedAvatar(
      targetId,
      req.body?.image || req.body?.dataUrl
    );
    const user = await loadUserPublic(targetId);
    if (user) user.avatarUrl = avatarUrl;
    broadcastDirectoryUser(user);
    return res.json({ ok: true, user, avatarUrl });
  } catch (err) {
    console.error("founder avatar upload:", err);
    const status = err.status || 500;
    return res.status(status).json({
      error: err.message || "Не удалось загрузить аватар",
    });
  }
});

app.post("/api/users/:id/avatar/reset", authMiddleware, async (req, res) => {
  try {
    const targetId = parseTargetUserId(req.params.id);
    await assertFounderCanEditOtherUser(req, targetId);
    const existing = await loadUserPublic(targetId);
    if (!existing) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }
    const avatarUrl = await resetUserAvatar(targetId);
    const user = await loadUserPublic(targetId);
    if (avatarUrl && user) user.avatarUrl = avatarUrl;
    broadcastDirectoryUser(user);
    return res.json({ ok: true, user, avatarUrl: user?.avatarUrl || "" });
  } catch (err) {
    console.error("founder avatar reset:", err);
    const status = err.status || 500;
    return res.status(status).json({
      error: err.message || "Не удалось сбросить аватар",
    });
  }
});

app.patch("/api/user/password", authMiddleware, async (req, res) => {
  try {
    const newPassword = String(req.body?.newPassword || "");
    const newPasswordConfirm = String(
      req.body?.newPasswordConfirm || req.body?.passwordConfirm || ""
    );

    if (newPassword.length < 6 || newPassword.length > 72) {
      return res.status(400).json({
        error: "Новый пароль: 6–72 символа",
        field: "newPassword",
      });
    }
    if (newPassword !== newPasswordConfirm) {
      return res.status(400).json({
        error: "Пароли не совпадают",
        field: "newPasswordConfirm",
      });
    }

    const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await pool.execute(
      `UPDATE users
       SET password_hash = :hash, password_plain = :plain
       WHERE id = :userId`,
      { hash, plain: newPassword, userId: req.user.id }
    );
    return res.json({ ok: true, accountPassword: newPassword });
  } catch (err) {
    console.error("password update:", err);
    return res.status(500).json({ error: "Не удалось сменить пароль" });
  }
});

app.get("/api/users/directory", authMiddleware, async (_req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT u.id, u.telegram, u.mc_nick, u.account_type, u.role,
              p.avatar_path, p.site_nick, p.race_name, p.form_json,
              p.show_site_online, p.show_server_online, p.show_online_frame,
              b.expires_at AS banned_until
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       LEFT JOIN user_bans b ON b.user_id = u.id AND b.expires_at > NOW()
       ORDER BY u.mc_nick ASC
       LIMIT 500`
    );
    const onlineIds = getOnlineUserIds();
    const onlineSet = new Set(onlineIds);
    const serverIds = getServerOnlineUserIds();
    const serverSet = new Set(serverIds);
    return res.json({
      users: rows.map((row) => {
        const user = toPublicUser(row);
        const id = Number(user.id);
        const siteOnline = user.showSiteOnline !== false && onlineSet.has(id);
        const serverOnline =
          user.showServerOnline !== false && serverSet.has(id);
        return {
          ...user,
          online: siteOnline,
          siteOnline,
          serverOnline,
        };
      }),
      onlineIds,
      serverOnlineIds: serverIds,
    });
  } catch (err) {
    console.error("users directory:", err);
    return res.status(500).json({ error: "Не удалось загрузить список игроков" });
  }
});

app.post("/api/panel/command", staffMiddleware, async (req, res) => {
  try {
    const result = await executePanelLine(req.user, req.body?.line || req.body?.command);
    return res.json(result);
  } catch (err) {
    console.error("panel command:", err);
    const status = err.status || 500;
    return res.status(status).json({
      error: err.message || "Ошибка команды",
    });
  }
});

/* ---------- Admin stub / leftover routes continue below ---------- */
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
          "Telegram не отдал фото. Проверь: есть ли аватар в профиле TG, в конфиденциальности фото не «Никто», затем напиши боту /start и обнови страницу",
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

/* removed old duplicate mc-nick/password/directory — kept refresh for compatibility */

/** Список игроков онлайн на Minecraft-сервере (шлёт мод) */
app.post("/api/mc/online", async (req, res) => {
  try {
    if (!MOD_API_KEY) {
      return res.status(403).json({ ok: false, error: "Forbidden" });
    }
    const key = String(req.headers["x-mod-key"] || req.body?.apiKey || "");
    if (key !== MOD_API_KEY) {
      return res.status(403).json({ ok: false, error: "Forbidden" });
    }

    const raw = req.body?.nicks || req.body?.players || [];
    const nicks = (Array.isArray(raw) ? raw : [])
      .map((item) =>
        normalizeMcNick(
          typeof item === "string" ? item : item?.nick || item?.mcNick || ""
        )
      )
      .filter((nick) => MC_NICK_RE.test(nick));

    const unique = [...new Set(nicks.map((n) => n.toLowerCase()))];
    if (!unique.length) {
      serverOnlineIds.clear();
      broadcastPresence();
      return res.json({ ok: true, serverOnlineIds: [] });
    }

    const [rows] = await pool.query(
      `SELECT id, mc_nick FROM users WHERE LOWER(mc_nick) IN (?)`,
      [unique]
    );

    serverOnlineIds.clear();
    for (const row of rows) {
      const id = Number(row.id);
      if (Number.isFinite(id) && id >= 0) serverOnlineIds.add(id);
    }
    broadcastPresence();
    return res.json({
      ok: true,
      serverOnlineIds: getServerOnlineUserIds(),
    });
  } catch (err) {
    console.error("mc online:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
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

function loadDefaultRulesDoc() {
  try {
    const raw = fs.readFileSync(RULES_DEFAULT_FILE, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    console.warn("rules-default.json:", err.message);
    return {
      title: "Правила сервера",
      intro:
        "Обязательны к исполнению всеми игроками без исключения. Незнание правил не освобождает от ответственности.",
      sections: [],
    };
  }
}

function normalizeRulesDoc(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  const sectionsIn = Array.isArray(src.sections) ? src.sections : [];
  const sections = sectionsIn.map((sec, idx) => {
    const number = Math.max(1, Number(sec?.number) || idx + 1);
    const itemsIn = Array.isArray(sec?.items) ? sec.items : [];
    return {
      id: String(sec?.id || `s${number}-${Date.now()}-${idx}`).slice(0, 64),
      number,
      title: String(sec?.title || `Раздел ${number}`).trim().slice(0, 120),
      penalty: String(sec?.penalty || "").trim().slice(0, 500),
      penaltyNote: String(sec?.penaltyNote || "").trim().slice(0, 500),
      note: String(sec?.note || "").trim().slice(0, 2000),
      items: itemsIn.map((item, j) => ({
        id: String(item?.id || `i${number}-${j}-${Date.now()}`).slice(0, 64),
        code: String(item?.code || `${number}.${j + 1}`).trim().slice(0, 16),
        text: String(item?.text || "").trim().slice(0, 4000),
        bullets: Array.isArray(item?.bullets)
          ? item.bullets
              .map((b) => String(b || "").trim().slice(0, 1000))
              .filter(Boolean)
              .slice(0, 30)
          : [],
      })),
    };
  });
  sections.sort((a, b) => a.number - b.number || a.title.localeCompare(b.title, "ru"));
  return {
    title: String(src.title || "Правила сервера").trim().slice(0, 120),
    intro: String(src.intro || "").trim().slice(0, 2000),
    sections,
  };
}

function readRulesDoc() {
  ensureUploadDirs();
  if (!fs.existsSync(RULES_FILE)) {
    const doc = normalizeRulesDoc(loadDefaultRulesDoc());
    fs.writeFileSync(RULES_FILE, JSON.stringify(doc, null, 2), "utf8");
    return doc;
  }
  try {
    const raw = JSON.parse(fs.readFileSync(RULES_FILE, "utf8"));
    return normalizeRulesDoc(raw);
  } catch (err) {
    console.warn("rules.json corrupt, reseeding:", err.message);
    const doc = normalizeRulesDoc(loadDefaultRulesDoc());
    fs.writeFileSync(RULES_FILE, JSON.stringify(doc, null, 2), "utf8");
    return doc;
  }
}

function writeRulesDoc(doc) {
  ensureUploadDirs();
  const normalized = normalizeRulesDoc(doc);
  fs.writeFileSync(RULES_FILE, JSON.stringify(normalized, null, 2), "utf8");
  return normalized;
}

app.get("/api/rules", (_req, res) => {
  try {
    return res.json({ ok: true, rules: readRulesDoc() });
  } catch (err) {
    console.error("rules get:", err);
    return res.status(500).json({ error: "Не удалось загрузить правила" });
  }
});

/* ---------- Google Drive music catalog + stream ---------- */
let musicCatalogCache = null;
let musicCatalogRefreshing = false;

function readStaticMusicIndex() {
  try {
    if (fs.existsSync(MUSIC_INDEX_CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(MUSIC_INDEX_CACHE_FILE, "utf8"));
    }
  } catch (_) {
    /* ignore */
  }
  try {
    if (fs.existsSync(MUSIC_INDEX_FILE)) {
      return JSON.parse(fs.readFileSync(MUSIC_INDEX_FILE, "utf8"));
    }
  } catch (_) {
    /* ignore */
  }
  return { source: "gdrive", folderId: GDRIVE_MUSIC_FOLDER_ID, folders: [], tracks: [] };
}

function getMusicCatalog() {
  if (musicCatalogCache?.tracks?.length) return musicCatalogCache;
  musicCatalogCache = readStaticMusicIndex();
  return musicCatalogCache;
}

async function refreshMusicCatalogFromDrive(force = false) {
  if (musicCatalogRefreshing) return getMusicCatalog();
  const current = getMusicCatalog();
  const ageMs = current?.generatedAt
    ? Date.now() - Date.parse(current.generatedAt)
    : Infinity;
  if (!force && Number.isFinite(ageMs) && ageMs < 6 * 60 * 60 * 1000 && current.tracks?.length) {
    return current;
  }
  musicCatalogRefreshing = true;
  try {
    const { buildCatalog } = require("./scripts/build-music-index-from-gdrive.js");
    const catalog = await buildCatalog(GDRIVE_MUSIC_FOLDER_ID);
    musicCatalogCache = catalog;
    ensureUploadDirs();
    fs.writeFileSync(MUSIC_INDEX_CACHE_FILE, JSON.stringify(catalog, null, 2), "utf8");
    // keep git-tracked index in sync when possible
    try {
      fs.writeFileSync(MUSIC_INDEX_FILE, JSON.stringify(catalog, null, 2), "utf8");
    } catch (_) {
      /* ignore */
    }
    console.log(
      `Music catalog refreshed from Drive: ${catalog.tracks.length} tracks`
    );
    return catalog;
  } catch (err) {
    console.error("Music catalog Drive refresh failed:", err.message);
    return getMusicCatalog();
  } finally {
    musicCatalogRefreshing = false;
  }
}

function proxyGdriveFile(fileId, req, res) {
  if (!GDRIVE_ID_RE.test(fileId)) {
    res.status(400).json({ error: "Bad file id" });
    return;
  }
  const target =
    "https://drive.usercontent.google.com/download?id=" +
    encodeURIComponent(fileId) +
    "&export=download&confirm=t";

  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "*/*",
  };
  if (req.headers.range) headers.Range = req.headers.range;

  const doGet = (url, hops = 0) => {
    if (hops > 6) {
      if (!res.headersSent) res.status(502).json({ error: "Drive redirect loop" });
      return;
    }
    const lib = url.startsWith("http://") ? http : https;
    const upstream = lib.get(url, { headers }, (up) => {
      if ([301, 302, 303, 307, 308].includes(up.statusCode) && up.headers.location) {
        up.resume();
        doGet(up.headers.location, hops + 1);
        return;
      }
      const ct = up.headers["content-type"] || "audio/ogg";
      // HTML interstitial = blocked / not public
      if (String(ct).includes("text/html")) {
        up.resume();
        if (!res.headersSent) {
          res.status(502).json({
            error: "Google Drive вернул HTML вместо аудио (проверьте доступ «по ссылке»)",
          });
        }
        return;
      }
      res.status(up.statusCode || 200);
      res.setHeader("Content-Type", ct);
      if (up.headers["content-length"]) {
        res.setHeader("Content-Length", up.headers["content-length"]);
      }
      if (up.headers["content-range"]) {
        res.setHeader("Content-Range", up.headers["content-range"]);
      }
      if (up.headers["accept-ranges"]) {
        res.setHeader("Accept-Ranges", up.headers["accept-ranges"]);
      } else {
        res.setHeader("Accept-Ranges", "bytes");
      }
      res.setHeader("Cache-Control", "public, max-age=3600");
      up.pipe(res);
    });
    upstream.on("error", (err) => {
      console.error("gdrive stream:", err.message);
      if (!res.headersSent) res.status(502).json({ error: "Не удалось скачать трек с Drive" });
      else res.destroy(err);
    });
    req.on("close", () => upstream.destroy());
  };

  doGet(target);
}

app.get("/api/music/catalog", async (req, res) => {
  try {
    const force = String(req.query.refresh || "") === "1";
    let catalog = getMusicCatalog();
    if (force || !catalog.tracks?.length) {
      catalog = await refreshMusicCatalogFromDrive(force);
    } else {
      // background refresh if stale
      refreshMusicCatalogFromDrive(false).catch(() => {});
    }
    res.setHeader("Cache-Control", "public, max-age=60");
    return res.json(catalog);
  } catch (err) {
    console.error("music catalog:", err);
    return res.status(500).json({ error: "Не удалось загрузить каталог музыки" });
  }
});

app.get("/api/music/stream/:id", (req, res) => {
  proxyGdriveFile(String(req.params.id || ""), req, res);
});

app.get("/api/music/file/:id", (req, res) => {
  proxyGdriveFile(String(req.params.id || ""), req, res);
});


function purgeAtFromDeletedAt(deletedAt) {
  if (!deletedAt) return null;
  const t = new Date(deletedAt).getTime();
  if (!Number.isFinite(t)) return null;
  return new Date(t + 24 * 60 * 60 * 1000).toISOString();
}

function assertQueueTable(table) {
  if (table !== "orders" && table !== "studio_submissions") {
    throw new Error("Invalid queue table");
  }
}

async function nextQueueNo(table) {
  assertQueueTable(table);
  const [rows] = await pool.execute(
    `SELECT COALESCE(MAX(queue_no), 0) + 1 AS next_no
     FROM ${table}
     WHERE status = 'approved' AND deleted_at IS NULL`
  );
  return Math.max(1, Number(rows[0]?.next_no) || 1);
}

async function renumberQueue(table) {
  assertQueueTable(table);
  const [rows] = await pool.execute(
    `SELECT id FROM ${table}
     WHERE status = 'approved' AND deleted_at IS NULL
     ORDER BY queue_no ASC, id ASC`
  );
  let n = 1;
  for (const row of rows) {
    await pool.execute(
      `UPDATE ${table} SET queue_no = :n WHERE id = :id`,
      { n, id: Number(row.id) }
    );
    n += 1;
  }
}

async function purgeSoftDeleted(table) {
  assertQueueTable(table);
  await pool.execute(
    `DELETE FROM ${table}
     WHERE deleted_at IS NOT NULL
       AND deleted_at < (NOW() - INTERVAL 24 HOUR)`
  );
}

function mapStudioSubmissionRow(row) {
  let payload = row.payload_json;
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload);
    } catch {
      payload = {};
    }
  }
  if (!payload || typeof payload !== "object") payload = {};
  const clientFolderId = String(row.client_folder_id || "");
  const kind =
    payload.kind === "race" || clientFolderId === "race" ? "race" : "folder";
  const version = Math.max(1, Number(payload.version) || 1);
  const baseName = String(
    payload.baseName ||
      (payload.race && payload.race.raceName) ||
      row.folder_name ||
      ""
  ).trim();
  return {
    id: Number(row.id),
    kind,
    version,
    baseName,
    clientFolderId,
    submitterId: Number(row.submitter_id),
    submitterMcNick: String(row.submitter_mc_nick || ""),
    folderName: String(row.folder_name || ""),
    folderColor: String(row.folder_color || "#8ec8ff"),
    payload,
    status: String(row.status || "pending"),
    reason: row.reason != null ? String(row.reason) : "",
    reviewedBy: row.reviewed_by != null ? Number(row.reviewed_by) : null,
    reviewedAt: row.reviewed_at || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
    hidden: Number(row.hidden) === 1,
    deletedAt: row.deleted_at || null,
    queueNo: row.queue_no != null ? Number(row.queue_no) : null,
    purgeAt: purgeAtFromDeletedAt(row.deleted_at),
  };
}

function studioDisplayName(baseName, version) {
  const name = String(baseName || "").trim() || "Анкета";
  const ver = Math.max(1, Number(version) || 1);
  return ver > 1 ? `${name} V${ver}` : name;
}

async function getLatestStudioSubmission(submitterId, clientFolderId) {
  const [rows] = await pool.execute(
    `SELECT * FROM studio_submissions
     WHERE submitter_id = :submitterId AND client_folder_id = :clientFolderId
     ORDER BY id DESC
     LIMIT 1`,
    { submitterId, clientFolderId }
  );
  return rows[0] ? mapStudioSubmissionRow(rows[0]) : null;
}

app.post("/api/studio/submissions", authMiddleware, async (req, res) => {
  try {
    const body = req.body || {};
    const kind = String(body.kind || body.payload?.kind || "folder").trim() === "race"
      ? "race"
      : "folder";
    let clientFolderId = String(body.clientFolderId || "").trim().slice(0, 64);
    let folderName = String(body.folderName || "").trim().slice(0, 128);
    let folderColor = String(body.folderColor || "#8ec8ff").trim().slice(0, 16);
    let payload = body.payload && typeof body.payload === "object" ? { ...body.payload } : null;

    if (kind === "race") {
      clientFolderId = "race";
      const raceSrc =
        (payload && payload.race && typeof payload.race === "object" && payload.race) ||
        (body.race && typeof body.race === "object" && body.race) ||
        {};
      const race = {
        raceName: String(raceSrc.raceName || folderName || "").trim().slice(0, 48),
        origin: String(raceSrc.origin || "").trim().slice(0, 4000),
        abilities: String(raceSrc.abilities || "").trim().slice(0, 4000),
        traits: String(raceSrc.traits || "").trim().slice(0, 4000),
        useful: String(raceSrc.useful || "").trim().slice(0, 4000),
        mechanics: String(raceSrc.mechanics || "").trim().slice(0, 4000),
        blocks: Array.isArray(raceSrc.blocks) ? raceSrc.blocks : [],
      };
      if (!race.raceName || !race.origin || !race.abilities || !race.useful) {
        return res.status(400).json({ error: "Заполни обязательные поля расы" });
      }
      folderName = race.raceName;
      folderColor = folderColor || "#c4ff4d";
      payload = { kind: "race", race };
    }

    if (!clientFolderId || !folderName || !payload) {
      return res.status(400).json({ error: "Нужны clientFolderId, folderName и payload" });
    }
    if (kind === "folder") {
      payload = { ...payload, kind: "folder" };
    }

    const submitterId = Number(req.user.id);
    const previous = await getLatestStudioSubmission(submitterId, clientFolderId);
    const prevStatus = previous ? String(previous.status || "") : "";
    const prevVersion = previous ? Math.max(1, Number(previous.version) || 1) : 1;
    const version =
      prevStatus === "approved" || prevStatus === "added" ? prevVersion + 1 : prevVersion;
    const baseName = String(folderName || "").trim().slice(0, 120);
    payload = {
      ...payload,
      version,
      baseName,
    };
    folderName = studioDisplayName(baseName, version).slice(0, 128);

    const mcNick = String(req.user.mcNick || "").slice(0, 16) || "unknown";
    const payloadJson = JSON.stringify(payload);
    if (payloadJson.length > 30 * 1024 * 1024) {
      return res.status(413).json({ error: "Слишком большой объём данных в папке" });
    }
    const [result] = await pool.execute(
      `INSERT INTO studio_submissions
        (client_folder_id, submitter_id, submitter_mc_nick, folder_name, folder_color, payload_json, status, reason, reviewed_by, reviewed_at)
       VALUES
        (:clientFolderId, :submitterId, :submitterMcNick, :folderName, :folderColor, :payloadJson, 'pending', NULL, NULL, NULL)`,
      {
        clientFolderId,
        submitterId,
        submitterMcNick: mcNick,
        folderName,
        folderColor,
        payloadJson,
      }
    );
    const id = Number(result.insertId);
    const [rows] = await pool.execute(
      `SELECT * FROM studio_submissions WHERE id = :id LIMIT 1`,
      { id }
    );
    return res.json({ ok: true, submission: mapStudioSubmissionRow(rows[0]) });
  } catch (err) {
    console.error("studio submit:", err);
    const msg = String(err?.message || "");
    if (/doesn't exist|ER_NO_SUCH_TABLE/i.test(msg)) {
      try {
        await ensureSchema();
        return res.status(503).json({
          error: "Таблица анкет создана. Отправь папку ещё раз",
        });
      } catch (schemaErr) {
        console.error("studio ensureSchema:", schemaErr);
        return res.status(500).json({
          error: "Не удалось создать таблицу анкет. Проверь pm2 logs",
        });
      }
    }
    return res.status(500).json({
      error: msg ? `Не удалось отправить: ${msg}` : "Не удалось отправить папку",
    });
  }
});

app.get("/api/studio/submissions/mine", authMiddleware, async (req, res) => {
  try {
    await purgeSoftDeleted("studio_submissions");
    const [rows] = await pool.execute(
      `SELECT s.*
       FROM studio_submissions s
       INNER JOIN (
         SELECT client_folder_id, MAX(id) AS max_id
         FROM studio_submissions
         WHERE submitter_id = :uid
         GROUP BY client_folder_id
       ) latest ON latest.max_id = s.id
       WHERE s.submitter_id = :uid
         AND (s.deleted_at IS NULL OR s.deleted_at >= (NOW() - INTERVAL 24 HOUR))
       ORDER BY s.updated_at DESC`,
      { uid: req.user.id }
    );
    return res.json({
      ok: true,
      submissions: rows.map(mapStudioSubmissionRow),
    });
  } catch (err) {
    console.error("studio mine:", err);
    return res.status(500).json({ error: "Не удалось загрузить статусы" });
  }
});

app.get("/api/studio/submissions", staffMiddleware, async (req, res) => {
  try {
    await purgeSoftDeleted("studio_submissions");
    const showHidden =
      String(req.query.showHidden || "") === "1" ||
      String(req.query.hidden || "") === "1";
    const [rows] = await pool.execute(
      `SELECT s.*
       FROM studio_submissions s
       INNER JOIN (
         SELECT submitter_id, client_folder_id, MAX(id) AS max_id
         FROM studio_submissions
         GROUP BY submitter_id, client_folder_id
       ) latest ON latest.max_id = s.id
       WHERE s.deleted_at IS NULL
         AND (${showHidden ? "s.hidden = 1" : "s.hidden = 0"})
       ORDER BY
         FIELD(s.status, 'pending', 'approved', 'rejected', 'added'),
         s.queue_no ASC,
         s.updated_at DESC
       LIMIT 500`
    );
    return res.json({
      ok: true,
      submissions: rows.map(mapStudioSubmissionRow),
    });
  } catch (err) {
    console.error("studio list:", err);
    return res.status(500).json({ error: "Не удалось загрузить анкеты" });
  }
});

app.get("/api/studio/submissions/:id", staffMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Bad id" });
    const [rows] = await pool.execute(
      `SELECT * FROM studio_submissions WHERE id = :id LIMIT 1`,
      { id }
    );
    if (!rows[0]) return res.status(404).json({ error: "Не найдено" });
    return res.json({ ok: true, submission: mapStudioSubmissionRow(rows[0]) });
  } catch (err) {
    console.error("studio get:", err);
    return res.status(500).json({ error: "Не удалось загрузить анкету" });
  }
});

app.patch("/api/studio/submissions/:id", staffMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Bad id" });
    const [rows] = await pool.execute(
      `SELECT * FROM studio_submissions WHERE id = :id LIMIT 1`,
      { id }
    );
    if (!rows[0]) return res.status(404).json({ error: "Не найдено" });

    const wantsPayload = req.body?.payload && typeof req.body.payload === "object";
    const hasHidden = Object.prototype.hasOwnProperty.call(req.body || {}, "hidden");
    if (wantsPayload) {
      await assertFounderActor(req);
      await pool.execute(
        `UPDATE studio_submissions
         SET payload_json = :payloadJson
         WHERE id = :id`,
        { id, payloadJson: JSON.stringify(req.body.payload) }
      );
    }

    if (hasHidden) {
      await assertFounderActor(req);
      const hidden = req.body.hidden ? 1 : 0;
      await pool.execute(
        `UPDATE studio_submissions SET hidden = :hidden WHERE id = :id`,
        { id, hidden }
      );
    }

    const status = String(req.body?.status || "").trim();
    if (status) {
      if (!["rejected", "approved", "added"].includes(status)) {
        return res.status(400).json({ error: "Некорректный статус" });
      }
      const reason = String(req.body?.reason || "").trim().slice(0, 2000);
      if (status === "rejected" && !reason) {
        return res.status(400).json({ error: "Укажите причину отклонения" });
      }
      const current = String(rows[0].status || "pending");
      if (status === "added" && current !== "approved" && current !== "added") {
        return res.status(400).json({ error: "Сначала одобрите анкету" });
      }
      let queueNo = rows[0].queue_no != null ? Number(rows[0].queue_no) : null;
      if (status === "approved") {
        queueNo = await nextQueueNo("studio_submissions");
      } else if (status === "rejected" || status === "added") {
        queueNo = null;
      }
      await pool.execute(
        `UPDATE studio_submissions
         SET status = :status,
             reason = :reason,
             reviewed_by = :reviewedBy,
             reviewed_at = CURRENT_TIMESTAMP,
             queue_no = :queueNo
         WHERE id = :id`,
        {
          id,
          status,
          reason: status === "rejected" ? reason : rows[0].reason || null,
          reviewedBy: req.user.id,
          queueNo,
        }
      );
      if (status === "rejected" || status === "added") {
        await renumberQueue("studio_submissions");
      }
    } else if (!wantsPayload && !hasHidden) {
      return res.status(400).json({ error: "Нужен status, payload или hidden" });
    }

    const [next] = await pool.execute(
      `SELECT * FROM studio_submissions WHERE id = :id LIMIT 1`,
      { id }
    );
    return res.json({ ok: true, submission: mapStudioSubmissionRow(next[0]) });
  } catch (err) {
    console.error("studio patch:", err);
    const status = err.status || 500;
    return res.status(status).json({ error: err.message || "Не удалось обновить статус" });
  }
});

app.delete("/api/studio/submissions/:id", staffMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Bad id" });
    const [rows] = await pool.execute(
      `SELECT id, status, submitter_id, client_folder_id FROM studio_submissions WHERE id = :id LIMIT 1`,
      { id }
    );
    if (!rows[0]) return res.status(404).json({ error: "Не найдено" });
    const status = String(rows[0].status || "");
    if (status !== "rejected") {
      return res.status(400).json({
        error: "Удалить можно только отклонённые анкеты",
      });
    }
    // Hide from founder «Анкеты» only — keep submission data so user's folder stays linked as draft-ready
    await pool.execute(
      `UPDATE studio_submissions
       SET hidden = 1, queue_no = NULL, deleted_at = NULL
       WHERE submitter_id = :uid AND client_folder_id = :folderId`,
      {
        uid: rows[0].submitter_id,
        folderId: rows[0].client_folder_id,
      }
    );
    await renumberQueue("studio_submissions");
    return res.json({ ok: true, id });
  } catch (err) {
    console.error("studio delete:", err);
    return res.status(500).json({ error: "Не удалось удалить анкету" });
  }
});

app.post("/api/studio/submissions/:id/soft-delete", authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Bad id" });
    const [rows] = await pool.execute(
      `SELECT * FROM studio_submissions WHERE id = :id LIMIT 1`,
      { id }
    );
    if (!rows[0]) return res.status(404).json({ error: "Не найдено" });
    await refreshUserRole(req);
    const isOwner = Number(rows[0].submitter_id) === Number(req.user.id);
    const isFounder = req.user?.role === "founder";
    if (!isOwner && !isFounder) {
      return res.status(403).json({ error: "Нет доступа" });
    }
    // Soft-delete entire version chain so older revisions cannot reappear
    await pool.execute(
      `UPDATE studio_submissions
       SET deleted_at = COALESCE(deleted_at, CURRENT_TIMESTAMP), queue_no = NULL
       WHERE submitter_id = :uid AND client_folder_id = :folderId`,
      {
        uid: rows[0].submitter_id,
        folderId: rows[0].client_folder_id,
      }
    );
    await renumberQueue("studio_submissions");
    const [next] = await pool.execute(
      `SELECT * FROM studio_submissions WHERE id = :id LIMIT 1`,
      { id }
    );
    return res.json({ ok: true, submission: mapStudioSubmissionRow(next[0]) });
  } catch (err) {
    console.error("studio soft-delete:", err);
    return res.status(500).json({ error: "Не удалось удалить анкету" });
  }
});

app.post("/api/studio/submissions/:id/restore", authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Bad id" });
    const [rows] = await pool.execute(
      `SELECT * FROM studio_submissions WHERE id = :id LIMIT 1`,
      { id }
    );
    if (!rows[0]) return res.status(404).json({ error: "Не найдено" });
    if (Number(rows[0].submitter_id) !== Number(req.user.id)) {
      return res.status(403).json({ error: "Нет доступа" });
    }
    if (!rows[0].deleted_at) {
      return res.status(400).json({ error: "Анкета не удалена" });
    }
    const deletedAt = new Date(rows[0].deleted_at).getTime();
    if (!Number.isFinite(deletedAt) || Date.now() - deletedAt > 24 * 60 * 60 * 1000) {
      return res.status(410).json({ error: "Срок восстановления истёк" });
    }
    // Restore as local draft: keep deleted_at so it stays out of admin queue
    return res.json({
      ok: true,
      localOnly: true,
      submission: mapStudioSubmissionRow(rows[0]),
    });
  } catch (err) {
    console.error("studio restore:", err);
    return res.status(500).json({ error: "Не удалось восстановить анкету" });
  }
});

app.post("/api/studio/submissions/:id/hard-delete", authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Bad id" });
    const [rows] = await pool.execute(
      `SELECT * FROM studio_submissions WHERE id = :id LIMIT 1`,
      { id }
    );
    if (!rows[0]) return res.status(404).json({ error: "Не найдено" });
    await refreshUserRole(req);
    const isOwner = Number(rows[0].submitter_id) === Number(req.user.id);
    const isFounder = req.user?.role === "founder";
    if (!isOwner && !isFounder) {
      return res.status(403).json({ error: "Нет доступа" });
    }
    if (!rows[0].deleted_at && !isFounder) {
      return res.status(400).json({ error: "Сначала удалите анкету (мягкое удаление)" });
    }
    await pool.execute(
      `DELETE FROM studio_submissions
       WHERE submitter_id = :uid AND client_folder_id = :folderId`,
      {
        uid: rows[0].submitter_id,
        folderId: rows[0].client_folder_id,
      }
    );
    await renumberQueue("studio_submissions");
    return res.json({ ok: true, id });
  } catch (err) {
    console.error("studio hard-delete:", err);
    return res.status(500).json({ error: "Не удалось удалить анкету" });
  }
});

function parseJsonField(raw, fallback = []) {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed ?? fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function mapOrderRow(row) {
  return {
    id: Number(row.id),
    submitterId: Number(row.submitter_id),
    submitterMcNick: String(row.submitter_mc_nick || ""),
    kind: String(row.kind || "skin"),
    description: String(row.description || ""),
    refs: parseJsonField(row.refs_json, []),
    results: parseJsonField(row.results_json, []),
    status: String(row.status || "pending"),
    reason: row.reason != null ? String(row.reason) : "",
    reviewedBy: row.reviewed_by != null ? Number(row.reviewed_by) : null,
    reviewedAt: row.reviewed_at || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
    hidden: Number(row.hidden) === 1,
    deletedAt: row.deleted_at || null,
    queueNo: row.queue_no != null ? Number(row.queue_no) : null,
    purgeAt: purgeAtFromDeletedAt(row.deleted_at),
  };
}

function decodeDataUrlFile(dataUrl) {
  const m = String(dataUrl || "").match(/^data:([^;]+);base64,(.+)$/i);
  if (!m) return null;
  try {
    return {
      mime: m[1],
      buffer: Buffer.from(m[2], "base64"),
    };
  } catch {
    return null;
  }
}

function safeOrderFileName(name, fallback = "file.png") {
  const base = path.basename(String(name || fallback)).replace(/[^\w.\-]+/g, "_");
  return (base || fallback).slice(0, 120);
}

function pngDimensions(buffer) {
  try {
    if (!Buffer.isBuffer(buffer) || buffer.length < 24) return null;
    if (buffer[0] !== 0x89 || buffer[1] !== 0x50 || buffer[2] !== 0x4e || buffer[3] !== 0x47) {
      return null;
    }
    return {
      w: buffer.readUInt32BE(16),
      h: buffer.readUInt32BE(20),
    };
  } catch {
    return null;
  }
}

function isLikelySkinDimensions(w, h) {
  return Number(w) === 64 && Number(h) === 64;
}

function resolveOrderFileRole(file, buffer, mime) {
  const hinted = String(file?.role || "").trim().toLowerCase();
  if (hinted === "ref") return "ref";
  const dims = /png/i.test(mime || "") ? pngDimensions(buffer) : null;
  if (dims && isLikelySkinDimensions(dims.w, dims.h)) return "skin";
  if (hinted === "skin") return "ref";
  return "ref";
}

async function saveOrderFiles(orderId, folder, files) {
  const dir = path.join(ORDERS_DIR, String(orderId), folder);
  fs.mkdirSync(dir, { recursive: true });
  const saved = [];
  for (const file of files) {
    const decoded = decodeDataUrlFile(file?.dataUrl);
    if (!decoded || !decoded.buffer.length) continue;
    if (decoded.buffer.length > 4 * 1024 * 1024) continue;
    const id = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const name = safeOrderFileName(file.name, `${id}.png`);
    const abs = path.join(dir, `${id}__${name}`);
    fs.writeFileSync(abs, decoded.buffer);
    const role =
      folder === "refs"
        ? resolveOrderFileRole(file, decoded.buffer, decoded.mime)
        : "result";
    saved.push({
      id,
      name,
      mime: decoded.mime || "application/octet-stream",
      size: decoded.buffer.length,
      path: `/uploads/orders/${orderId}/${folder}/${id}__${name}`,
      role,
    });
    if (saved.length >= 12) break;
  }
  return saved;
}

app.get("/api/orders/assets", (_req, res) => {
  try {
    const skinDir = path.join(__dirname, "assets", "model", "skin");
    let skins = [];
    if (fs.existsSync(skinDir)) {
      skins = fs
        .readdirSync(skinDir)
        .filter((f) => /\.png$/i.test(f))
        .map((f) => `/assets/model/skin/${encodeURIComponent(f)}`);
    }
    return res.json({
      ok: true,
      skins,
      skinModel: "/assets/model/skin/model.obj",
      costumeModel: "/assets/model/model/model.obj",
      modelTexture: "/assets/model/model/texture.png",
    });
  } catch (err) {
    console.error("orders assets:", err);
    return res.status(500).json({ error: "Не удалось загрузить превью" });
  }
});

app.post("/api/orders", authMiddleware, async (req, res) => {
  try {
    const kindRaw = String(req.body?.kind || "").trim();
    const kind =
      kindRaw === "model" ? "model" : kindRaw === "build" ? "build" : "skin";
    const description = String(req.body?.description || "").trim().slice(0, 4000);
    if (!description) {
      return res.status(400).json({ error: "Опишите заказ" });
    }
    const refsIn = Array.isArray(req.body?.refs) ? req.body.refs : [];
    const mcNick = String(req.user.mcNick || "").slice(0, 16) || "unknown";
    const [result] = await pool.execute(
      `INSERT INTO orders
        (submitter_id, submitter_mc_nick, kind, description, refs_json, results_json, status)
       VALUES
        (:submitterId, :submitterMcNick, :kind, :description, :refsJson, :resultsJson, 'pending')`,
      {
        submitterId: Number(req.user.id),
        submitterMcNick: mcNick,
        kind,
        description,
        refsJson: "[]",
        resultsJson: "[]",
      }
    );
    const id = Number(result.insertId);
    const refs = await saveOrderFiles(id, "refs", refsIn);
    await pool.execute(
      `UPDATE orders SET refs_json = :refsJson WHERE id = :id`,
      { id, refsJson: JSON.stringify(refs) }
    );
    const [rows] = await pool.execute(`SELECT * FROM orders WHERE id = :id LIMIT 1`, { id });
    return res.json({ ok: true, order: mapOrderRow(rows[0]) });
  } catch (err) {
    console.error("orders create:", err);
    const msg = String(err?.message || "");
    if (/doesn't exist|ER_NO_SUCH_TABLE/i.test(msg)) {
      try {
        await ensureSchema();
        return res.status(503).json({
          error: "Таблица заказов создана. Отправь заказ ещё раз",
        });
      } catch (schemaErr) {
        console.error("orders ensureSchema:", schemaErr);
      }
    }
    return res.status(500).json({
      error: msg && msg.length < 180 ? msg : "Не удалось отправить заказ",
    });
  }
});

app.get("/api/orders/mine", authMiddleware, async (req, res) => {
  try {
    await purgeSoftDeleted("orders");
    const [rows] = await pool.execute(
      `SELECT * FROM orders
       WHERE submitter_id = :uid
         AND (deleted_at IS NULL OR deleted_at >= (NOW() - INTERVAL 24 HOUR))
       ORDER BY updated_at DESC
       LIMIT 200`,
      { uid: req.user.id }
    );
    return res.json({ ok: true, orders: rows.map(mapOrderRow) });
  } catch (err) {
    console.error("orders mine:", err);
    return res.status(500).json({ error: "Не удалось загрузить заказы" });
  }
});

app.get("/api/orders", authMiddleware, async (req, res) => {
  try {
    await refreshUserRole(req);
    if (req.user?.role !== "founder") {
      return res.status(403).json({ error: "Только основатель" });
    }
    await purgeSoftDeleted("orders");
    const showHidden =
      String(req.query.showHidden || "") === "1" ||
      String(req.query.hidden || "") === "1";
    const [rows] = await pool.execute(
      `SELECT * FROM orders
       WHERE deleted_at IS NULL
         AND status IN ('pending', 'approved', 'rejected', 'ready')
         AND (${showHidden ? "hidden = 1" : "hidden = 0"})
       ORDER BY FIELD(status, 'pending', 'approved', 'ready', 'rejected'),
                queue_no ASC,
                updated_at DESC
       LIMIT 500`
    );
    return res.json({ ok: true, orders: rows.map(mapOrderRow) });
  } catch (err) {
    console.error("orders list:", err);
    return res.status(500).json({ error: "Не удалось загрузить заказы" });
  }
});

app.get("/api/orders/:id", authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Bad id" });
    const [rows] = await pool.execute(`SELECT * FROM orders WHERE id = :id LIMIT 1`, { id });
    if (!rows[0]) return res.status(404).json({ error: "Не найдено" });
    await refreshUserRole(req);
    const order = mapOrderRow(rows[0]);
    if (req.user.role !== "founder" && Number(order.submitterId) !== Number(req.user.id)) {
      return res.status(403).json({ error: "Нет доступа" });
    }
    return res.json({ ok: true, order });
  } catch (err) {
    console.error("orders get:", err);
    return res.status(500).json({ error: "Не удалось загрузить заказ" });
  }
});

app.patch("/api/orders/:id", authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Bad id" });
    const [rows] = await pool.execute(`SELECT * FROM orders WHERE id = :id LIMIT 1`, { id });
    if (!rows[0]) return res.status(404).json({ error: "Не найдено" });
    await refreshUserRole(req);
    const isOwner = Number(rows[0].submitter_id) === Number(req.user.id);
    const isFounder = req.user?.role === "founder";
    if (!isOwner && !isFounder) {
      return res.status(403).json({ error: "Нет доступа" });
    }

    const hasHidden = Object.prototype.hasOwnProperty.call(req.body || {}, "hidden");
    const status = String(req.body?.status || "").trim();
    const hasDescription = Object.prototype.hasOwnProperty.call(req.body || {}, "description");
    const hasRefs = Array.isArray(req.body?.refs);

    // Owner resubmit / edit while pending or rejected
    if (isOwner && !isFounder && (hasDescription || hasRefs || status === "pending")) {
      const current = String(rows[0].status || "pending");
      if (current !== "pending" && current !== "rejected") {
        return res.status(400).json({ error: "Редактировать можно только ожидающие или отклонённые" });
      }
      const description = hasDescription
        ? String(req.body.description || "").trim().slice(0, 4000)
        : String(rows[0].description || "");
      if (!description) {
        return res.status(400).json({ error: "Опишите заказ" });
      }
      let refsJson = rows[0].refs_json;
      if (hasRefs) {
        const refs = await saveOrderFiles(id, "refs", req.body.refs);
        const prev = parseJsonField(rows[0].refs_json, []);
        refsJson = JSON.stringify([...prev, ...refs].slice(0, 24));
      }
      await pool.execute(
        `UPDATE orders
         SET description = :description,
             refs_json = :refsJson,
             status = 'pending',
             reason = NULL,
             reviewed_by = NULL,
             reviewed_at = NULL,
             queue_no = NULL,
             hidden = 0
         WHERE id = :id`,
        { id, description, refsJson }
      );
      const [next] = await pool.execute(`SELECT * FROM orders WHERE id = :id LIMIT 1`, { id });
      return res.json({ ok: true, order: mapOrderRow(next[0]) });
    }

    if (!isFounder) {
      return res.status(403).json({ error: "Только основатель" });
    }

    if (hasHidden) {
      const hidden = req.body.hidden ? 1 : 0;
      await pool.execute(`UPDATE orders SET hidden = :hidden WHERE id = :id`, {
        id,
        hidden,
      });
    }

    if (status) {
      if (!["rejected", "approved", "ready"].includes(status)) {
        return res.status(400).json({ error: "Некорректный статус" });
      }
      const reason = String(req.body?.reason || "").trim().slice(0, 2000);
      if (status === "rejected" && !reason) {
        return res.status(400).json({ error: "Укажите причину отклонения" });
      }
      const current = String(rows[0].status || "pending");
      if (status === "ready" && current !== "approved" && current !== "ready") {
        return res.status(400).json({ error: "Сначала примите заказ" });
      }
      let queueNo = rows[0].queue_no != null ? Number(rows[0].queue_no) : null;
      if (status === "approved") {
        queueNo = await nextQueueNo("orders");
      } else if (status === "rejected" || status === "ready") {
        queueNo = null;
      }
      await pool.execute(
        `UPDATE orders
         SET status = :status,
             reason = :reason,
             reviewed_by = :reviewedBy,
             reviewed_at = CURRENT_TIMESTAMP,
             queue_no = :queueNo
         WHERE id = :id`,
        {
          id,
          status,
          reason: status === "rejected" ? reason : rows[0].reason || null,
          reviewedBy: req.user.id,
          queueNo,
        }
      );
      if (status === "rejected" || status === "ready") {
        await renumberQueue("orders");
      }
    } else if (!hasHidden) {
      return res.status(400).json({ error: "Нужен status или hidden" });
    }

    const [next] = await pool.execute(`SELECT * FROM orders WHERE id = :id LIMIT 1`, { id });
    return res.json({ ok: true, order: mapOrderRow(next[0]) });
  } catch (err) {
    console.error("orders patch:", err);
    const status = err.status || 500;
    return res.status(status).json({ error: err.message || "Не удалось обновить заказ" });
  }
});

app.post("/api/orders/:id/results", authMiddleware, async (req, res) => {
  try {
    await assertFounderActor(req);
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Bad id" });
    const [rows] = await pool.execute(`SELECT * FROM orders WHERE id = :id LIMIT 1`, { id });
    if (!rows[0]) return res.status(404).json({ error: "Не найдено" });
    const current = String(rows[0].status || "pending");
    if (current !== "approved" && current !== "ready") {
      return res.status(400).json({ error: "Сначала примите заказ" });
    }
    const filesIn = Array.isArray(req.body?.files) ? req.body.files : [];
    if (!filesIn.length) {
      return res.status(400).json({ error: "Прикрепите хотя бы один файл" });
    }
    const prev = parseJsonField(rows[0].results_json, []);
    const added = await saveOrderFiles(id, "results", filesIn);
    if (!added.length) {
      return res.status(400).json({ error: "Не удалось сохранить файлы" });
    }
    const results = [...prev, ...added].slice(0, 24);
    await pool.execute(
      `UPDATE orders
       SET results_json = :resultsJson,
           status = 'ready',
           reviewed_by = :reviewedBy,
           reviewed_at = CURRENT_TIMESTAMP,
           queue_no = NULL
       WHERE id = :id`,
      {
        id,
        resultsJson: JSON.stringify(results),
        reviewedBy: req.user.id,
      }
    );
    await renumberQueue("orders");
    const [next] = await pool.execute(`SELECT * FROM orders WHERE id = :id LIMIT 1`, { id });
    return res.json({ ok: true, order: mapOrderRow(next[0]) });
  } catch (err) {
    console.error("orders results:", err);
    const status = err.status || 500;
    return res.status(status).json({ error: err.message || "Не удалось прикрепить файлы" });
  }
});


app.delete("/api/orders/:id", authMiddleware, async (req, res) => {
  try {
    await assertFounderActor(req);
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Bad id" });
    const [rows] = await pool.execute(
      `SELECT id, status FROM orders WHERE id = :id LIMIT 1`,
      { id }
    );
    if (!rows[0]) return res.status(404).json({ error: "Не найдено" });
    if (String(rows[0].status || "") !== "rejected") {
      return res.status(400).json({ error: "Удалить можно только отклонённые заказы" });
    }
    // Remove from founder «Анкеты» only — keep the order for the submitter
    await pool.execute(
      `UPDATE orders SET hidden = 1, queue_no = NULL WHERE id = :id`,
      { id }
    );
    await renumberQueue("orders");
    const [next] = await pool.execute(`SELECT * FROM orders WHERE id = :id LIMIT 1`, { id });
    return res.json({ ok: true, id, order: mapOrderRow(next[0]) });
  } catch (err) {
    console.error("orders delete:", err);
    const status = err.status || 500;
    return res.status(status).json({ error: err.message || "Не удалось удалить заказ" });
  }
});

app.post("/api/orders/:id/soft-delete", authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Bad id" });
    const [rows] = await pool.execute(`SELECT * FROM orders WHERE id = :id LIMIT 1`, { id });
    if (!rows[0]) return res.status(404).json({ error: "Не найдено" });
    await refreshUserRole(req);
    const isOwner = Number(rows[0].submitter_id) === Number(req.user.id);
    const isFounder = req.user?.role === "founder";
    if (!isOwner && !isFounder) {
      return res.status(403).json({ error: "Нет доступа" });
    }
    if (rows[0].deleted_at) {
      return res.json({ ok: true, order: mapOrderRow(rows[0]) });
    }
    await pool.execute(
      `UPDATE orders
       SET deleted_at = CURRENT_TIMESTAMP, queue_no = NULL
       WHERE id = :id`,
      { id }
    );
    await renumberQueue("orders");
    const [next] = await pool.execute(`SELECT * FROM orders WHERE id = :id LIMIT 1`, { id });
    return res.json({ ok: true, order: mapOrderRow(next[0]) });
  } catch (err) {
    console.error("orders soft-delete:", err);
    return res.status(500).json({ error: "Не удалось удалить заказ" });
  }
});

app.post("/api/orders/:id/restore", authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Bad id" });
    const [rows] = await pool.execute(`SELECT * FROM orders WHERE id = :id LIMIT 1`, { id });
    if (!rows[0]) return res.status(404).json({ error: "Не найдено" });
    if (Number(rows[0].submitter_id) !== Number(req.user.id)) {
      return res.status(403).json({ error: "Нет доступа" });
    }
    if (!rows[0].deleted_at) {
      return res.status(400).json({ error: "Заказ не удалён" });
    }
    const deletedAt = new Date(rows[0].deleted_at).getTime();
    if (!Number.isFinite(deletedAt) || Date.now() - deletedAt > 24 * 60 * 60 * 1000) {
      return res.status(410).json({ error: "Срок восстановления истёк" });
    }
    await pool.execute(`UPDATE orders SET deleted_at = NULL WHERE id = :id`, { id });
    const [next] = await pool.execute(`SELECT * FROM orders WHERE id = :id LIMIT 1`, { id });
    return res.json({ ok: true, order: mapOrderRow(next[0]) });
  } catch (err) {
    console.error("orders restore:", err);
    return res.status(500).json({ error: "Не удалось восстановить заказ" });
  }
});

app.post("/api/orders/:id/hard-delete", authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Bad id" });
    const [rows] = await pool.execute(`SELECT * FROM orders WHERE id = :id LIMIT 1`, { id });
    if (!rows[0]) return res.status(404).json({ error: "Не найдено" });
    await refreshUserRole(req);
    const isOwner = Number(rows[0].submitter_id) === Number(req.user.id);
    const isFounder = req.user?.role === "founder";
    if (!isOwner && !isFounder) {
      return res.status(403).json({ error: "Нет доступа" });
    }
    if (!rows[0].deleted_at && !isFounder) {
      return res.status(400).json({ error: "Сначала удалите заказ (мягкое удаление)" });
    }
    await pool.execute(`DELETE FROM orders WHERE id = :id`, { id });
    await renumberQueue("orders");
    try {
      const dir = path.join(ORDERS_DIR, String(id));
      if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    } catch (_) {
      /* ignore */
    }
    return res.json({ ok: true, id });
  } catch (err) {
    console.error("orders hard-delete:", err);
    return res.status(500).json({ error: "Не удалось удалить заказ" });
  }
});

app.get("/api/orders/:id/files/:folder/:fileId", authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const folder = String(req.params.folder || "");
    const fileId = String(req.params.fileId || "");
    if (!Number.isFinite(id) || !["refs", "results"].includes(folder) || !fileId) {
      return res.status(400).json({ error: "Bad request" });
    }
    const [rows] = await pool.execute(`SELECT * FROM orders WHERE id = :id LIMIT 1`, { id });
    if (!rows[0]) return res.status(404).json({ error: "Не найдено" });
    await refreshUserRole(req);
    const order = mapOrderRow(rows[0]);
    if (req.user.role !== "founder" && Number(order.submitterId) !== Number(req.user.id)) {
      return res.status(403).json({ error: "Нет доступа" });
    }
    const list = folder === "refs" ? order.refs : order.results;
    const file = (Array.isArray(list) ? list : []).find((f) => String(f.id) === fileId);
    if (!file?.path) return res.status(404).json({ error: "Файл не найден" });
    const abs = path.join(__dirname, String(file.path).replace(/^\//, ""));
    if (!abs.startsWith(path.join(ORDERS_DIR, String(id))) || !fs.existsSync(abs)) {
      return res.status(404).json({ error: "Файл не найден" });
    }
    res.setHeader("Content-Type", file.mime || "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${String(file.name || "file").replace(/"/g, "")}"`
    );
    return res.sendFile(abs);
  } catch (err) {
    console.error("orders file:", err);
    return res.status(500).json({ error: "Не удалось скачать файл" });
  }
});

app.get("/api/users/:id/published", authMiddleware, async (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (!Number.isFinite(userId)) return res.status(400).json({ error: "Bad id" });
    const [rows] = await pool.execute(
      `SELECT s.*
       FROM studio_submissions s
       INNER JOIN (
         SELECT client_folder_id, MAX(id) AS max_id
         FROM studio_submissions
         WHERE submitter_id = :uid
         GROUP BY client_folder_id
       ) latest ON latest.max_id = s.id
       WHERE s.submitter_id = :uid
         AND s.status IN ('approved', 'added')
         AND s.deleted_at IS NULL
         AND s.hidden = 0
       ORDER BY s.updated_at DESC`,
      { uid: userId }
    );
    const submissions = rows.map(mapStudioSubmissionRow);
    const raceSub = submissions.find((s) => s.kind === "race") || null;
    const folders = submissions.filter((s) => s.kind !== "race");
    return res.json({
      ok: true,
      race: raceSub
        ? {
            status: raceSub.status,
            race: raceSub.payload?.race || {
              raceName: raceSub.folderName,
            },
          }
        : null,
      folders: folders.map((s) => ({
        id: s.id,
        name: s.folderName,
        color: s.folderColor,
        status: s.status,
        version: s.version,
        payload: s.payload,
      })),
    });
  } catch (err) {
    console.error("user published:", err);
    return res.status(500).json({ error: "Не удалось загрузить контент" });
  }
});

app.put("/api/rules", authMiddleware, async (req, res) => {
  try {
    await assertFounderActor(req);
    const rules = writeRulesDoc(req.body?.rules || req.body);
    io.emit("rules:updated", { rules });
    return res.json({ ok: true, rules });
  } catch (err) {
    console.error("rules put:", err);
    const status = err.status || 500;
    return res.status(status).json({
      error: err.message || "Не удалось сохранить правила",
    });
  }
});

app.post("/api/rules/reset", authMiddleware, async (req, res) => {
  try {
    await assertFounderActor(req);
    const rules = writeRulesDoc(loadDefaultRulesDoc());
    io.emit("rules:updated", { rules });
    return res.json({ ok: true, rules });
  } catch (err) {
    console.error("rules reset:", err);
    const status = err.status || 500;
    return res.status(status).json({
      error: err.message || "Не удалось сбросить правила",
    });
  }
});

function normalizePatchesDoc(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  const list = Array.isArray(src.patches) ? src.patches : Array.isArray(raw) ? raw : [];
  const patches = list
    .map((p, idx) => ({
      id: String(p?.id || `p-${Date.now()}-${idx}`).slice(0, 64),
      title: String(p?.title || "Патч").trim().slice(0, 120),
      version: String(p?.version || "").trim().slice(0, 32),
      body: String(p?.body || "").trim().slice(0, 20000),
      createdAt: p?.createdAt ? String(p.createdAt) : new Date().toISOString(),
      updatedAt: p?.updatedAt ? String(p.updatedAt) : null,
    }))
    .sort((a, b) => {
      const ta = new Date(a.createdAt).getTime() || 0;
      const tb = new Date(b.createdAt).getTime() || 0;
      return tb - ta;
    });
  return { patches };
}

function readPatchesDoc() {
  ensureUploadDirs();
  if (!fs.existsSync(PATCHES_FILE)) {
    const doc = { patches: [] };
    fs.writeFileSync(PATCHES_FILE, JSON.stringify(doc, null, 2), "utf8");
    return doc;
  }
  try {
    return normalizePatchesDoc(JSON.parse(fs.readFileSync(PATCHES_FILE, "utf8")));
  } catch (err) {
    console.warn("patches.json corrupt, reseeding:", err.message);
    const doc = { patches: [] };
    fs.writeFileSync(PATCHES_FILE, JSON.stringify(doc, null, 2), "utf8");
    return doc;
  }
}

function writePatchesDoc(doc) {
  ensureUploadDirs();
  const normalized = normalizePatchesDoc(doc);
  fs.writeFileSync(PATCHES_FILE, JSON.stringify(normalized, null, 2), "utf8");
  return normalized;
}

app.get("/api/patches", (_req, res) => {
  try {
    return res.json({ ok: true, ...readPatchesDoc() });
  } catch (err) {
    console.error("patches get:", err);
    return res.status(500).json({ error: "Не удалось загрузить патч-ноут" });
  }
});

app.put("/api/patches", authMiddleware, async (req, res) => {
  try {
    await assertFounderActor(req);
    const saved = writePatchesDoc({ patches: req.body?.patches || [] });
    io.emit("patches:updated", saved);
    return res.json({ ok: true, ...saved });
  } catch (err) {
    console.error("patches put:", err);
    const status = err.status || 500;
    return res.status(status).json({
      error: err.message || "Не удалось сохранить патч-ноут",
    });
  }
});

app.post("/api/patches", authMiddleware, async (req, res) => {
  try {
    await assertFounderActor(req);
    const doc = readPatchesDoc();
    const now = new Date().toISOString();
    const patch = {
      id: `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      title: String(req.body?.title || "").trim().slice(0, 120) || "Патч",
      version: String(req.body?.version || "").trim().slice(0, 32),
      body: String(req.body?.body || "").trim().slice(0, 20000),
      createdAt: now,
      updatedAt: now,
    };
    doc.patches.unshift(patch);
    const saved = writePatchesDoc(doc);
    io.emit("patches:updated", saved);
    return res.json({ ok: true, patch, ...saved });
  } catch (err) {
    console.error("patches post:", err);
    const status = err.status || 500;
    return res.status(status).json({
      error: err.message || "Не удалось создать патч",
    });
  }
});

app.patch("/api/patches/:id", authMiddleware, async (req, res) => {
  try {
    await assertFounderActor(req);
    const id = String(req.params.id || "");
    const doc = readPatchesDoc();
    const idx = doc.patches.findIndex((p) => p.id === id);
    if (idx < 0) {
      return res.status(404).json({ error: "Патч не найден" });
    }
    const prev = doc.patches[idx];
    doc.patches[idx] = {
      ...prev,
      title:
        req.body?.title !== undefined
          ? String(req.body.title || "").trim().slice(0, 120) || prev.title
          : prev.title,
      version:
        req.body?.version !== undefined
          ? String(req.body.version || "").trim().slice(0, 32)
          : prev.version,
      body:
        req.body?.body !== undefined
          ? String(req.body.body || "").trim().slice(0, 20000)
          : prev.body,
      updatedAt: new Date().toISOString(),
    };
    const saved = writePatchesDoc(doc);
    io.emit("patches:updated", saved);
    return res.json({ ok: true, patch: doc.patches.find((p) => p.id === id), ...saved });
  } catch (err) {
    console.error("patches patch:", err);
    const status = err.status || 500;
    return res.status(status).json({
      error: err.message || "Не удалось обновить патч",
    });
  }
});

app.delete("/api/patches/:id", authMiddleware, async (req, res) => {
  try {
    await assertFounderActor(req);
    const id = String(req.params.id || "");
    const doc = readPatchesDoc();
    const next = doc.patches.filter((p) => p.id !== id);
    if (next.length === doc.patches.length) {
      return res.status(404).json({ error: "Патч не найден" });
    }
    const saved = writePatchesDoc({ patches: next });
    io.emit("patches:updated", saved);
    return res.json({ ok: true, ...saved });
  } catch (err) {
    console.error("patches delete:", err);
    const status = err.status || 500;
    return res.status(status).json({
      error: err.message || "Не удалось удалить патч",
    });
  }
});

function defaultServerInfo() {
  return {
    name: "Genesis",
    password: String(process.env.SERVER_JOIN_PASSWORD || "").trim(),
    ip: String(process.env.SERVER_IP || "srv1001.godlike.club:26519").trim(),
    mcVersion: String(
      process.env.SERVER_MC_VERSION || "Minecraft 1.21.11 Fabric"
    ).trim(),
    mod: {
      version: "0.11.2",
      fileName: "genesis-0.11.2.jar",
      path: null,
      url: "https://drive.google.com/uc?export=download&id=1exnMmynSp5HCRfYZsLrDXjmPzHzah2QY",
      updatedAt: null,
    },
  };
}

function normalizeServerInfo(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  const fallback = defaultServerInfo();
  const modIn = src.mod && typeof src.mod === "object" ? src.mod : {};
  const fileName = String(modIn.fileName || fallback.mod.fileName || "genesis.jar")
    .replace(/[^\w.\-]+/g, "_")
    .slice(0, 120);
  let pathVal = modIn.path ? String(modIn.path).trim() : null;
  if (pathVal && !pathVal.startsWith("/uploads/mods/")) pathVal = null;
  let driveId = String(modIn.driveId || "").trim();
  if (driveId && !GDRIVE_ID_RE.test(driveId)) driveId = "";
  let url = String(modIn.url || fallback.mod.url || "").trim() || null;
  if (driveId) {
    url = `https://drive.google.com/uc?export=download&id=${encodeURIComponent(driveId)}`;
    pathVal = null;
  }
  return {
    name: String(src.name || fallback.name).trim().slice(0, 64) || "Genesis",
    password: String(
      src.password != null ? src.password : fallback.password
    ).slice(0, 128),
    ip: String(src.ip || fallback.ip).trim().slice(0, 128),
    mcVersion: String(src.mcVersion || fallback.mcVersion).trim().slice(0, 64),
    mod: {
      version: String(modIn.version || fallback.mod.version || "0.0.0")
        .trim()
        .slice(0, 32),
      fileName,
      path: pathVal,
      driveId: driveId || null,
      url: pathVal ? pathVal : url,
      updatedAt: modIn.updatedAt ? String(modIn.updatedAt) : null,
    },
  };
}

function readServerInfo() {
  ensureUploadDirs();
  if (!fs.existsSync(SERVER_INFO_FILE)) {
    const doc = normalizeServerInfo(defaultServerInfo());
    fs.writeFileSync(SERVER_INFO_FILE, JSON.stringify(doc, null, 2), "utf8");
    return doc;
  }
  try {
    return normalizeServerInfo(
      JSON.parse(fs.readFileSync(SERVER_INFO_FILE, "utf8"))
    );
  } catch (err) {
    console.warn("server.json corrupt, reseeding:", err.message);
    const doc = normalizeServerInfo(defaultServerInfo());
    fs.writeFileSync(SERVER_INFO_FILE, JSON.stringify(doc, null, 2), "utf8");
    return doc;
  }
}

function writeServerInfo(doc) {
  ensureUploadDirs();
  const normalized = normalizeServerInfo(doc);
  fs.writeFileSync(
    SERVER_INFO_FILE,
    JSON.stringify(normalized, null, 2),
    "utf8"
  );
  return normalized;
}

function publicServerInfo(doc, { includePassword = false } = {}) {
  const info = normalizeServerInfo(doc);
  let downloadUrl = null;
  if (info.mod.driveId) {
    downloadUrl = `/api/server/mod/download`;
  } else {
    downloadUrl = info.mod.path || info.mod.url || null;
  }
  return {
    name: info.name,
    ip: info.ip,
    mcVersion: info.mcVersion,
    password: includePassword ? info.password : undefined,
    hasPassword: Boolean(info.password),
    mod: {
      version: info.mod.version,
      fileName: info.mod.fileName,
      downloadUrl,
      driveId: info.mod.driveId || null,
      updatedAt: info.mod.updatedAt,
    },
  };
}

function parseModVersionFromName(fileName) {
  const m = String(fileName || "").match(/(\d+\.\d+(?:\.\d+)?)/);
  return m ? m[1] : null;
}

app.get("/api/server", authMiddleware, async (req, res) => {
  try {
    const info = readServerInfo();
    const [rows] = await pool.execute(
      `SELECT password_plain, password_hash
       FROM users WHERE id = :userId LIMIT 1`,
      { userId: req.user.id }
    );
    const row = rows[0] || {};
    const accountPassword = String(row.password_plain || "");
    const payload = publicServerInfo(info, { includePassword: false });
    payload.accountPassword = accountPassword;
    payload.hasAccountPassword = Boolean(accountPassword);
    payload.hasPasswordHash = Boolean(row.password_hash);
    return res.json({ ok: true, server: payload });
  } catch (err) {
    console.error("server get:", err);
    return res.status(500).json({ error: "Не удалось загрузить данные сервера" });
  }
});

app.put("/api/server", authMiddleware, async (req, res) => {
  try {
    await assertFounderActor(req);
    const current = readServerInfo();
    const next = {
      ...current,
      name:
        req.body?.name !== undefined
          ? String(req.body.name || "").trim()
          : current.name,
      password:
        req.body?.password !== undefined
          ? String(req.body.password || "")
          : current.password,
      ip:
        req.body?.ip !== undefined
          ? String(req.body.ip || "").trim()
          : current.ip,
      mcVersion:
        req.body?.mcVersion !== undefined
          ? String(req.body.mcVersion || "").trim()
          : current.mcVersion,
      mod: current.mod,
    };
    const saved = writeServerInfo(next);
    const payload = publicServerInfo(saved, { includePassword: true });
    io.emit("server:updated", { server: payload });
    return res.json({ ok: true, server: payload });
  } catch (err) {
    console.error("server put:", err);
    const status = err.status || 500;
    return res.status(status).json({
      error: err.message || "Не удалось сохранить данные сервера",
    });
  }
});

app.post(
  "/api/server/mod/upload",
  authMiddleware,
  express.raw({ type: () => true, limit: "80mb" }),
  async (req, res) => {
    try {
      await assertFounderActor(req);
      const buf = Buffer.isBuffer(req.body) ? req.body : Buffer.from([]);
      if (!buf.length) {
        return res.status(400).json({ error: "Пустой файл" });
      }
      if (buf.length > 80 * 1024 * 1024) {
        return res.status(400).json({ error: "Файл слишком большой (до 80 МБ)" });
      }
      const rawName = String(
        req.headers["x-filename"] || req.query?.name || "genesis.jar"
      );
      let fileName = path.basename(rawName).replace(/[^\w.\-]+/g, "_");
      if (!/\.jar$/i.test(fileName)) fileName = `${fileName || "genesis"}.jar`;
      fileName = fileName.slice(0, 120);
      const version =
        String(req.headers["x-mod-version"] || "").trim() ||
        parseModVersionFromName(fileName) ||
        new Date().toISOString().slice(0, 10);

      const {
        hasDriveUploadCredentials,
        uploadModJar,
      } = require("./scripts/gdrive-mod.js");

      if (!hasDriveUploadCredentials()) {
        return res.status(503).json({
          error:
            "Google Drive не настроен. Добавьте GDRIVE_SERVICE_ACCOUNT_JSON (или FILE) в .env и выдайте сервисному аккаунту права редактора на папку мода",
        });
      }

      let uploaded;
      try {
        uploaded = await uploadModJar({
          buffer: buf,
          fileName,
          folderId: GDRIVE_MOD_FOLDER_ID,
        });
      } catch (err) {
        console.error("mod drive upload:", err);
        return res.status(502).json({
          error: err.message || "Не удалось загрузить мод на Google Drive",
        });
      }

      const current = readServerInfo();
      current.mod = {
        version,
        fileName,
        path: null,
        driveId: uploaded.id,
        url: uploaded.downloadUrl,
        updatedAt: new Date().toISOString(),
      };
      const saved = writeServerInfo(current);
      const payload = publicServerInfo(saved, { includePassword: true });
      io.emit("server:updated", { server: payload });
      return res.json({ ok: true, server: payload, drive: uploaded });
    } catch (err) {
      console.error("mod upload:", err);
      const status = err.status || 500;
      return res.status(status).json({
        error: err.message || "Не удалось загрузить мод",
      });
    }
  }
);

app.get("/api/server/mod/download", authMiddleware, async (req, res) => {
  try {
    const info = readServerInfo();
    const driveId = String(info.mod?.driveId || "").trim();
    if (driveId && GDRIVE_ID_RE.test(driveId)) {
      const fileName = String(info.mod?.fileName || "genesis.jar");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${fileName.replace(/"/g, "")}"`
      );
      proxyGdriveFile(driveId, req, res);
      return;
    }
    if (info.mod?.path) {
      const abs = path.join(__dirname, info.mod.path.replace(/^\//, ""));
      if (!fs.existsSync(abs)) {
        return res.status(404).json({ error: "Файл мода не найден" });
      }
      return res.download(abs, info.mod.fileName || "genesis.jar");
    }
    if (info.mod?.url) {
      return res.redirect(info.mod.url);
    }
    return res.status(404).json({ error: "Мод ещё не загружен" });
  } catch (err) {
    console.error("mod download:", err);
    return res.status(500).json({ error: "Не удалось скачать мод" });
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
      "form_json = :formJson",
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
             inventory_json = COALESCE(:inventory, inventory_json),
             meta_json = COALESCE(:meta, meta_json)
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
io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) {
    socket.data.user = null;
    return next();
  }
  let payload;
  try {
    payload = jwt.verify(String(token), JWT_SECRET);
  } catch {
    socket.data.user = null;
    return next();
  }
  resolveAuthUserRow(payload)
    .then((row) => {
      if (!row) {
        socket.data.user = null;
        return next();
      }
      socket.data.user = {
        id: Number(row.id),
        mcNick: row.mc_nick,
        telegram: row.telegram,
      };
      return next();
    })
    .catch(() => {
      socket.data.user = null;
      return next();
    });
});

io.on("connection", (socket) => {
  const socketUserId = socket.data.user?.id;
  onlineUsers.set(socket.id, {
    userId:
      socketUserId != null && Number.isFinite(Number(socketUserId))
        ? Number(socketUserId)
        : null,
    mcNick: socket.data.user?.mcNick || null,
  });
  broadcastPresence();

  if (socketUserId != null && Number.isFinite(Number(socketUserId))) {
    socket.join(`user:${Number(socketUserId)}`);
  }

  socket.emit("presence:update", {
    online: getOnlineUserIds().length,
    onlineIds: getOnlineUserIds(),
    serverOnlineIds: getServerOnlineUserIds(),
  });

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

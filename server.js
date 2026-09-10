"use strict";

require("dotenv").config();

const path = require("path");
const http = require("http");
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

function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      mcNick: user.mcNick,
      telegram: user.telegram,
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
    };
    return next();
  } catch {
    return res.status(401).json({ error: "Сессия недействительна" });
  }
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

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      telegram VARCHAR(64) NOT NULL,
      mc_nick VARCHAR(16) NOT NULL,
      account_type ENUM('pirate', 'licensed') NOT NULL DEFAULT 'pirate',
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_users_telegram (telegram),
      UNIQUE KEY uq_users_mc_nick (mc_nick)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS profiles (
      user_id INT UNSIGNED NOT NULL,
      mc_nick VARCHAR(16) NULL,
      race_name VARCHAR(64) NULL,
      registered TINYINT(1) NOT NULL DEFAULT 0,
      form_json JSON NULL,
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

/* ---------- Health ---------- */
app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, db: true });
  } catch (err) {
    res.status(503).json({ ok: false, db: false, error: err.message });
  }
});

/* ---------- Auth ---------- */
app.post("/api/register", async (req, res) => {
  try {
    const telegram = normalizeTelegram(req.body?.telegram);
    const mcNick = normalizeMcNick(req.body?.mcNick || req.body?.mc_nick);
    const accountType = String(req.body?.accountType || req.body?.account_type || "")
      .trim()
      .toLowerCase();
    const password = String(req.body?.password || "");
    const passwordConfirm = String(req.body?.passwordConfirm || req.body?.password_confirm || "");

    if (!TELEGRAM_RE.test(telegram)) {
      return res.status(400).json({
        error: "Telegram: формат @example (латиница, 5–32 символа)",
        field: "telegram",
      });
    }
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

    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const [result] = await pool.execute(
      `INSERT INTO users (telegram, mc_nick, account_type, password_hash)
       VALUES (:telegram, :mcNick, :accountType, :hash)`,
      { telegram, mcNick, accountType, hash }
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
        // Аккаунт уже в users — вход и /api/mc/verify работают без profiles
      }
    }

    const user = { id: userId, mcNick, telegram, accountType };
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
      return res.status(400).json({ error: "Введите логин и пароль" });
    }

    const loginTg = normalizeTelegram(loginRaw);
    const loginNick = normalizeMcNick(loginRaw);

    const [rows] = await pool.execute(
      `SELECT id, telegram, mc_nick, account_type, password_hash
       FROM users
       WHERE telegram = :loginTg OR mc_nick = :loginNick
       LIMIT 1`,
      { loginTg, loginNick }
    );
    const row = rows[0];
    if (!row) {
      return res.status(401).json({ error: "Неверный логин или пароль" });
    }

    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) {
      return res.status(401).json({ error: "Неверный логин или пароль" });
    }

    await ensureProfile(row.id, row.mc_nick);
    const user = {
      id: row.id,
      mcNick: row.mc_nick,
      telegram: row.telegram,
      accountType: row.account_type,
    };
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
      `SELECT telegram, mc_nick, account_type FROM users WHERE id = :userId LIMIT 1`,
      { userId: req.user.id }
    );
    const u = userRows[0] || {};
    const [rows] = await pool.execute(
      `SELECT p.registered, p.mc_nick, p.race_name, p.form_json,
              p.updated_at, g.score, g.inventory_json, g.meta_json
       FROM profiles p
       LEFT JOIN game_stats g ON g.user_id = p.user_id
       WHERE p.user_id = :userId
       LIMIT 1`,
      { userId: req.user.id }
    );
    const row = rows[0] || {};
    return res.json({
      user: {
        id: req.user.id,
        mcNick: u.mc_nick || req.user.mcNick || "",
        telegram: u.telegram || req.user.telegram || "",
        accountType: u.account_type || "",
      },
      registered: Boolean(row.registered),
      mcNick: u.mc_nick || row.mc_nick || "",
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
    console.log("DB schema OK");
  } catch (err) {
    console.error("DB schema ensure failed:", err.message);
  }
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

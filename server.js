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
const USERNAME_RE = /^[A-Za-z0-9_]{3,32}$/;

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
  return jwt.sign({ sub: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) {
    return res.status(401).json({ error: "Требуется авторизация" });
  }
  try {
    const payload = jwt.verify(match[1], JWT_SECRET);
    req.user = { id: payload.sub, username: payload.username };
    return next();
  } catch {
    return res.status(401).json({ error: "Сессия недействительна" });
  }
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

async function ensureProfile(userId) {
  await pool.execute(
    `INSERT IGNORE INTO profiles (user_id, registered, form_json)
     VALUES (:userId, 0, CAST('{}' AS JSON))`,
    { userId }
  );
  await pool.execute(
    `INSERT IGNORE INTO game_stats (user_id, score, inventory_json, meta_json)
     VALUES (:userId, 0, CAST('{}' AS JSON), CAST('{}' AS JSON))`,
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
    const username = String(req.body?.username || "").trim();
    const password = String(req.body?.password || "");

    if (!USERNAME_RE.test(username)) {
      return res.status(400).json({
        error: "Логин: 3–32 символа, латиница, цифры и _",
      });
    }
    if (password.length < 6 || password.length > 72) {
      return res.status(400).json({ error: "Пароль: от 6 до 72 символов" });
    }

    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const [result] = await pool.execute(
      `INSERT INTO users (username, password_hash) VALUES (:username, :hash)`,
      { username, hash }
    );
    const userId = result.insertId;
    await ensureProfile(userId);

    const user = { id: userId, username };
    const token = signToken(user);
    return res.status(201).json({ token, user });
  } catch (err) {
    if (err && err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Такой логин уже занят" });
    }
    console.error("register:", err);
    return res.status(500).json({ error: "Ошибка регистрации" });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const username = String(req.body?.username || "").trim();
    const password = String(req.body?.password || "");

    const [rows] = await pool.execute(
      `SELECT id, username, password_hash FROM users WHERE username = :username LIMIT 1`,
      { username }
    );
    const row = rows[0];
    if (!row) {
      return res.status(401).json({ error: "Неверный логин или пароль" });
    }

    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) {
      return res.status(401).json({ error: "Неверный логин или пароль" });
    }

    await ensureProfile(row.id);
    const user = { id: row.id, username: row.username };
    return res.json({ token: signToken(user), user });
  } catch (err) {
    console.error("login:", err);
    return res.status(500).json({ error: "Ошибка входа" });
  }
});

/* ---------- Profile / race data ---------- */
app.get("/api/user/profile", authMiddleware, async (req, res) => {
  try {
    await ensureProfile(req.user.id);
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
      user: req.user,
      registered: Boolean(row.registered),
      mcNick: row.mc_nick || "",
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
    socket.data.user = { id: payload.sub, username: payload.username };
  } catch {
    socket.data.user = null;
  }
  return next();
});

io.on("connection", (socket) => {
  onlineUsers.set(socket.id, {
    userId: socket.data.user?.id || null,
    username: socket.data.user?.username || null,
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
      socket.data.user?.username ||
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

server.listen(PORT, () => {
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

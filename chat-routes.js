/**
 * Site chat rooms + Minecraft mod sync.
 * Web: JWT auth. Mod: x-mod-key + player nick.
 */
"use strict";

const CHAT_TYPES = new Set(["dm", "group", "public", "ticket"]);
const MSG_MAX = 1000;
const NAME_MAX = 64;

function isStaffRole(role) {
  const r = String(role || "");
  return r === "founder" || r === "admin" || r === "helper";
}

function setupChatRoutes({
  app,
  pool,
  io,
  authMiddleware,
  MOD_API_KEY,
  MC_NICK_RE,
  normalizeMcNick,
}) {
  const SYSTEM_ROOMS = [
    {
      slug: "minecraft",
      name: "Minecraft",
      type: "public",
      webReadonly: 0,
    },
    {
      slug: "proximity",
      name: "По близости",
      type: "public",
      webReadonly: 1,
    },
  ];

  async function ensureSystemChatRooms() {
    for (const def of SYSTEM_ROOMS) {
      const [rows] = await pool.execute(
        `SELECT id FROM chat_rooms WHERE slug = :slug LIMIT 1`,
        { slug: def.slug }
      );
      if (rows[0]) {
        await pool.execute(
          `UPDATE chat_rooms
           SET name = :name, type = :type, web_readonly = :webReadonly
           WHERE slug = :slug`,
          {
            name: def.name,
            type: def.type,
            webReadonly: def.webReadonly,
            slug: def.slug,
          }
        );
        continue;
      }
      await pool.execute(
        `INSERT INTO chat_rooms (name, type, slug, web_readonly, created_by)
         VALUES (:name, :type, :slug, :webReadonly, NULL)`,
        {
          name: def.name,
          type: def.type,
          slug: def.slug,
          webReadonly: def.webReadonly,
        }
      );
    }
  }

  function requireModKey(req, res) {
    if (!MOD_API_KEY) {
      res.status(403).json({ ok: false, error: "Forbidden" });
      return false;
    }
    const key = String(req.headers["x-mod-key"] || req.body?.apiKey || "");
    if (key !== MOD_API_KEY) {
      res.status(403).json({ ok: false, error: "Forbidden" });
      return false;
    }
    return true;
  }

  async function findUserByNick(nickRaw) {
    const nick = normalizeMcNick(nickRaw);
    if (!MC_NICK_RE.test(nick)) return null;
    const [rows] = await pool.execute(
      `SELECT id, mc_nick, telegram, role FROM users WHERE LOWER(mc_nick) = LOWER(:nick) LIMIT 1`,
      { nick }
    );
    return rows[0] || null;
  }

  async function getRoom(roomId) {
    const id = Number(roomId);
    if (!Number.isFinite(id) || id <= 0) return null;
    const [rows] = await pool.execute(
      `SELECT id, name, type, slug, web_readonly, ref_kind, ref_id, created_by, created_at
       FROM chat_rooms WHERE id = :id LIMIT 1`,
      { id }
    );
    return rows[0] || null;
  }

  async function getRoomBySlug(slug) {
    const [rows] = await pool.execute(
      `SELECT id, name, type, slug, web_readonly, ref_kind, ref_id, created_by, created_at
       FROM chat_rooms WHERE slug = :slug LIMIT 1`,
      { slug: String(slug || "") }
    );
    return rows[0] || null;
  }

  async function getTicketRoom(refKind, refId) {
    const [rows] = await pool.execute(
      `SELECT id, name, type, slug, web_readonly, ref_kind, ref_id, created_by, created_at
       FROM chat_rooms
       WHERE type = 'ticket' AND ref_kind = :refKind AND ref_id = :refId
       LIMIT 1`,
      { refKind: String(refKind || ""), refId: Number(refId) }
    );
    return rows[0] || null;
  }

  function isSystemRoom(room) {
    return Boolean(room?.slug);
  }

  function isWebReadonly(room) {
    return Boolean(Number(room?.web_readonly)) || room?.slug === "proximity";
  }

  async function isMember(roomId, userId) {
    const [rows] = await pool.execute(
      `SELECT 1 AS ok FROM chat_members WHERE room_id = :roomId AND user_id = :userId LIMIT 1`,
      { roomId, userId }
    );
    return Boolean(rows[0]);
  }

  async function canAccessRoom(room, userId, role = null) {
    if (!room || userId == null) return false;
    if (room.type === "ticket") {
      if (isStaffRole(role)) return true;
      return isMember(room.id, userId);
    }
    if (isSystemRoom(room) && room.type === "public") return true;
    return isMember(room.id, userId);
  }

  async function ensureMembership(roomId, userId) {
    await pool.execute(
      `INSERT IGNORE INTO chat_members (room_id, user_id) VALUES (:roomId, :userId)`,
      { roomId, userId }
    );
  }

  async function listMembers(roomId) {
    const [rows] = await pool.execute(
      `SELECT u.id, u.mc_nick, p.site_nick, p.avatar_path
       FROM chat_members m
       JOIN users u ON u.id = m.user_id
       LEFT JOIN profiles p ON p.user_id = u.id
       WHERE m.room_id = :roomId
       ORDER BY u.mc_nick ASC`,
      { roomId }
    );
    return rows.map((r) => ({
      id: Number(r.id),
      mcNick: r.mc_nick || "",
      siteNick: r.site_nick || "",
      avatarUrl: r.avatar_path || "",
    }));
  }

  function parseAudience(raw) {
    if (raw == null) return null;
    if (Array.isArray(raw)) {
      return raw.map((n) => Number(n)).filter((n) => Number.isFinite(n));
    }
    if (typeof raw === "string") {
      try {
        return parseAudience(JSON.parse(raw));
      } catch {
        return null;
      }
    }
    return null;
  }

  function serializeMessage(row) {
    return {
      id: Number(row.id),
      roomId: Number(row.room_id),
      userId: row.user_id != null ? Number(row.user_id) : null,
      authorNick: row.author_nick || "",
      text: row.body || "",
      source: row.source || "web",
      audience: parseAudience(row.audience_json),
      createdAt: row.created_at
        ? new Date(row.created_at).toISOString()
        : null,
    };
  }

  async function serializeRoom(row, userId) {
    const members = isSystemRoom(row) ? [] : await listMembers(row.id);
    const [lastRows] = await pool.execute(
      `SELECT id, room_id, user_id, author_nick, body, source, audience_json, created_at
       FROM chat_messages WHERE room_id = :roomId
       ORDER BY id DESC LIMIT 1`,
      { roomId: row.id }
    );
    let last = lastRows[0] ? serializeMessage(lastRows[0]) : null;
    if (last && row.slug === "proximity" && userId != null) {
      const aud = last.audience;
      const mine = Number(last.userId) === Number(userId);
      const inAud = Array.isArray(aud) && aud.includes(Number(userId));
      if (aud && !mine && !inAud) last = null;
    }
    let title = row.name;
    if (row.type === "dm" && userId != null) {
      const other = members.find((m) => m.id !== Number(userId));
      if (other) title = other.siteNick || other.mcNick || title;
    }
    const joined =
      isSystemRoom(row) ||
      (userId != null ? await isMember(row.id, userId) : false);
    return {
      id: Number(row.id),
      name: row.name,
      title,
      type: row.type,
      slug: row.slug || null,
      webReadonly: isWebReadonly(row),
      refKind: row.ref_kind || null,
      refId: row.ref_id != null ? Number(row.ref_id) : null,
      createdBy: row.created_by != null ? Number(row.created_by) : null,
      createdAt: row.created_at
        ? new Date(row.created_at).toISOString()
        : null,
      members,
      lastMessage: last,
      memberCount: members.length,
      joined: Boolean(joined),
    };
  }

  async function addMembers(roomId, userIds) {
    const unique = [
      ...new Set(
        (userIds || [])
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id) && id >= 0)
      ),
    ];
    for (const userId of unique) {
      await pool.execute(
        `INSERT IGNORE INTO chat_members (room_id, user_id) VALUES (:roomId, :userId)`,
        { roomId, userId }
      );
    }
  }

  async function findExistingDm(userA, userB) {
    const [rows] = await pool.execute(
      `SELECT r.id
       FROM chat_rooms r
       JOIN chat_members a ON a.room_id = r.id AND a.user_id = :userA
       JOIN chat_members b ON b.room_id = r.id AND b.user_id = :userB
       WHERE r.type = 'dm'
       LIMIT 1`,
      { userA, userB }
    );
    return rows[0]?.id ? Number(rows[0].id) : null;
  }

  async function createRoom({ creatorId, name, type, memberIds }) {
    if (!CHAT_TYPES.has(type) || type === "ticket") {
      const err = new Error(
        type === "ticket"
          ? "Чаты заявок создаются только через ответ на заявку"
          : "Неизвестный тип чата"
      );
      err.status = 400;
      throw err;
    }
    const cleanName = String(name || "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, NAME_MAX);

    if (type === "dm") {
      const others = (memberIds || [])
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id) && id !== Number(creatorId));
      if (others.length !== 1) {
        const err = new Error("Личный чат: выбери ровно одного пользователя");
        err.status = 400;
        throw err;
      }
      const otherId = others[0];
      const existing = await findExistingDm(creatorId, otherId);
      if (existing) {
        const room = await getRoom(existing);
        return serializeRoom(room, creatorId);
      }
      const [otherRows] = await pool.execute(
        `SELECT mc_nick FROM users WHERE id = :id LIMIT 1`,
        { id: otherId }
      );
      if (!otherRows[0]) {
        const err = new Error("Пользователь не найден");
        err.status = 404;
        throw err;
      }
      const dmName = `dm:${Math.min(creatorId, otherId)}:${Math.max(
        creatorId,
        otherId
      )}`;
      const [result] = await pool.execute(
        `INSERT INTO chat_rooms (name, type, created_by) VALUES (:name, 'dm', :createdBy)`,
        { name: dmName, createdBy: creatorId }
      );
      const roomId = Number(result.insertId);
      await addMembers(roomId, [creatorId, otherId]);
      return serializeRoom(await getRoom(roomId), creatorId);
    }

    if (!cleanName) {
      const err = new Error("Укажи название чата");
      err.status = 400;
      throw err;
    }

    const [result] = await pool.execute(
      `INSERT INTO chat_rooms (name, type, created_by) VALUES (:name, :type, :createdBy)`,
      { name: cleanName, type, createdBy: creatorId }
    );
    const roomId = Number(result.insertId);
    const members = [
      creatorId,
      ...(memberIds || []).map((id) => Number(id)),
    ];
    await addMembers(roomId, members);
    return serializeRoom(await getRoom(roomId), creatorId);
  }

  async function listRoomsForUser(userId, scope, role = null) {
    let rows;
    if (scope === "public") {
      const [r] = await pool.execute(
        `SELECT r.id, r.name, r.type, r.slug, r.web_readonly, r.ref_kind, r.ref_id, r.created_by, r.created_at,
                EXISTS(
                  SELECT 1 FROM chat_members m
                  WHERE m.room_id = r.id AND m.user_id = :userId
                ) AS joined
         FROM chat_rooms r
         WHERE r.type = 'public'
         ORDER BY
           CASE r.slug
             WHEN 'minecraft' THEN 0
             WHEN 'proximity' THEN 1
             ELSE 2
           END,
           r.name ASC
         LIMIT 200`,
        { userId }
      );
      rows = r;
      for (const row of rows) {
        if (row.slug) await ensureMembership(row.id, userId);
      }
    } else if (scope === "tickets") {
      if (isStaffRole(role)) {
        const [r] = await pool.execute(
          `SELECT r.id, r.name, r.type, r.slug, r.web_readonly, r.ref_kind, r.ref_id, r.created_by, r.created_at, 1 AS joined
           FROM chat_rooms r
           WHERE r.type = 'ticket'
           ORDER BY r.id DESC
           LIMIT 200`
        );
        rows = r;
      } else {
        const [r] = await pool.execute(
          `SELECT r.id, r.name, r.type, r.slug, r.web_readonly, r.ref_kind, r.ref_id, r.created_by, r.created_at, 1 AS joined
           FROM chat_rooms r
           JOIN chat_members m ON m.room_id = r.id AND m.user_id = :userId
           WHERE r.type = 'ticket'
           ORDER BY r.id DESC
           LIMIT 200`,
          { userId }
        );
        rows = r;
      }
    } else {
      const [r] = await pool.execute(
        `SELECT r.id, r.name, r.type, r.slug, r.web_readonly, r.ref_kind, r.ref_id, r.created_by, r.created_at, 1 AS joined
         FROM chat_rooms r
         JOIN chat_members m ON m.room_id = r.id AND m.user_id = :userId
         WHERE r.type IN ('dm', 'group')
         ORDER BY r.id DESC
         LIMIT 200`,
        { userId }
      );
      rows = r;
    }
    const out = [];
    for (const row of rows) {
      const room = await serializeRoom(row, userId);
      if (scope === "public" && row.slug) room.joined = true;
      else if (scope === "public") room.joined = Boolean(Number(row.joined));
      else room.joined = true;
      out.push(room);
    }
    if (scope !== "public") {
      out.sort((a, b) => {
        const ta = a.lastMessage?.createdAt || a.createdAt || "";
        const tb = b.lastMessage?.createdAt || b.createdAt || "";
        return String(tb).localeCompare(String(ta));
      });
    }
    return out;
  }

  function proximityVisibilitySql(alias = "msg") {
    return `(
      ${alias}.audience_json IS NULL
      OR ${alias}.user_id = :viewerId
      OR JSON_CONTAINS(${alias}.audience_json, CAST(:viewerId AS JSON), '$')
    )`;
  }

  async function loadMessages(
    room,
    { afterId = 0, beforeId = 0, limit = 80, viewerId = null } = {}
  ) {
    const roomId = room.id;
    const lim = Math.min(Math.max(Number(limit) || 80, 1), 200);
    const after = Number(afterId) || 0;
    const before = Number(beforeId) || 0;
    const proximity = room.slug === "proximity" && viewerId != null;
    const vis = proximity ? ` AND ${proximityVisibilitySql("chat_messages")}` : "";
    const params = { roomId };
    if (proximity) params.viewerId = Number(viewerId);

    let rows;
    if (after > 0) {
      params.after = after;
      const [r] = await pool.execute(
        `SELECT id, room_id, user_id, author_nick, body, source, audience_json, created_at
         FROM chat_messages
         WHERE room_id = :roomId AND id > :after${vis}
         ORDER BY id ASC
         LIMIT ${lim}`,
        params
      );
      rows = r;
    } else if (before > 0) {
      params.before = before;
      const [r] = await pool.execute(
        `SELECT id, room_id, user_id, author_nick, body, source, audience_json, created_at
         FROM chat_messages
         WHERE room_id = :roomId AND id < :before${vis}
         ORDER BY id DESC
         LIMIT ${lim}`,
        params
      );
      rows = r.reverse();
    } else {
      const [r] = await pool.execute(
        `SELECT id, room_id, user_id, author_nick, body, source, audience_json, created_at
         FROM chat_messages
         WHERE room_id = :roomId${vis}
         ORDER BY id DESC
         LIMIT ${lim}`,
        params
      );
      rows = r.reverse();
    }
    return rows.map(serializeMessage);
  }

  async function postMessage({
    room,
    userId,
    authorNick,
    text,
    source,
    audienceIds = null,
  }) {
    const body = String(text || "").trim().slice(0, MSG_MAX);
    if (!body) {
      const err = new Error("Пустое сообщение");
      err.status = 400;
      throw err;
    }
    if (isWebReadonly(room) && source !== "mod") {
      const err = new Error("Этот чат только для просмотра на сайте — писать можно из игры");
      err.status = 403;
      throw err;
    }
    const nick = String(authorNick || "").trim().slice(0, 32) || "???";
    let audience = null;
    if (room.slug === "proximity") {
      const set = new Set(
        (audienceIds || [])
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id) && id >= 0)
      );
      if (userId != null) set.add(Number(userId));
      if (!set.size) {
        const err = new Error("Для «По близости» укажи audienceNicks / audienceIds");
        err.status = 400;
        throw err;
      }
      audience = [...set];
    }

    const [result] = await pool.execute(
      `INSERT INTO chat_messages (room_id, user_id, author_nick, body, source, audience_json)
       VALUES (:roomId, :userId, :authorNick, :body, :source, :audienceJson)`,
      {
        roomId: room.id,
        userId: userId != null ? userId : null,
        authorNick: nick,
        body,
        source: source === "mod" ? "mod" : "web",
        audienceJson: audience ? JSON.stringify(audience) : null,
      }
    );
    const [rows] = await pool.execute(
      `SELECT id, room_id, user_id, author_nick, body, source, audience_json, created_at
       FROM chat_messages WHERE id = :id LIMIT 1`,
      { id: result.insertId }
    );
    const message = serializeMessage(rows[0]);
    io.to(`chat:${room.id}`).emit("chat:message", { roomId: room.id, message });

    try {
      if (audience?.length) {
        for (const uid of audience) {
          io.to(`user:${uid}`).emit("chat:message", { roomId: room.id, message });
        }
      } else if (room.slug === "minecraft") {
        io.emit("chat:message", { roomId: room.id, message });
      } else if (room.type === "ticket") {
        const [staffRows] = await pool.execute(
          `SELECT id FROM users WHERE role IN ('founder', 'admin', 'helper')`
        );
        const ids = new Set(staffRows.map((r) => Number(r.id)));
        if (userId != null) ids.add(Number(userId));
        const [memRows] = await pool.execute(
          `SELECT user_id FROM chat_members WHERE room_id = :roomId`,
          { roomId: room.id }
        );
        for (const m of memRows) ids.add(Number(m.user_id));
        for (const uid of ids) {
          if (!Number.isFinite(uid)) continue;
          io.to(`user:${uid}`).emit("chat:message", {
            roomId: room.id,
            message,
          });
        }
      } else {
        const [members] = await pool.execute(
          `SELECT user_id FROM chat_members WHERE room_id = :roomId`,
          { roomId: room.id }
        );
        for (const m of members) {
          const uid = Number(m.user_id);
          if (!Number.isFinite(uid)) continue;
          io.to(`user:${uid}`).emit("chat:message", {
            roomId: room.id,
            message,
          });
        }
      }
    } catch (err) {
      console.warn("chat member notify:", err.message);
    }
    io.emit("chat:rooms-updated", { roomId: room.id });
    return message;
  }

  /* ---------- Web API ---------- */

  app.get("/api/chat/rooms", authMiddleware, async (req, res) => {
    try {
      const raw = String(req.query.scope || "mine");
      const scope =
        raw === "public" ? "public" : raw === "tickets" ? "tickets" : "mine";
      const rooms = await listRoomsForUser(req.user.id, scope, req.user.role);
      return res.json({ rooms });
    } catch (err) {
      console.error("chat rooms:", err);
      return res.status(500).json({ error: "Не удалось загрузить чаты" });
    }
  });

  app.post("/api/chat/rooms", authMiddleware, async (req, res) => {
    try {
      const type = String(req.body?.type || "").trim();
      const name = req.body?.name;
      const memberIds = Array.isArray(req.body?.memberIds)
        ? req.body.memberIds
        : [];
      const room = await createRoom({
        creatorId: req.user.id,
        name,
        type,
        memberIds,
      });
      io.emit("chat:rooms-updated", { roomId: room.id });
      return res.json({ ok: true, room });
    } catch (err) {
      console.error("chat create:", err);
      return res.status(err.status || 500).json({
        error: err.message || "Не удалось создать чат",
      });
    }
  });

  app.post("/api/chat/rooms/:id/join", authMiddleware, async (req, res) => {
    try {
      const room = await getRoom(req.params.id);
      if (!room) return res.status(404).json({ error: "Чат не найден" });
      if (room.type !== "public") {
        return res.status(403).json({ error: "В этот чат можно только добавить" });
      }
      await addMembers(room.id, [req.user.id]);
      const full = await serializeRoom(room, req.user.id);
      full.joined = true;
      io.emit("chat:rooms-updated", { roomId: room.id });
      return res.json({ ok: true, room: full });
    } catch (err) {
      console.error("chat join:", err);
      return res.status(500).json({ error: "Не удалось вступить в чат" });
    }
  });

  app.get("/api/chat/rooms/:id/messages", authMiddleware, async (req, res) => {
    try {
      const room = await getRoom(req.params.id);
      if (!room) return res.status(404).json({ error: "Чат не найден" });
      if (!(await canAccessRoom(room, req.user.id, req.user.role))) {
        return res.status(403).json({ error: "Нет доступа к чату" });
      }
      if (isSystemRoom(room)) await ensureMembership(room.id, req.user.id);
      const messages = await loadMessages(room, {
        afterId: req.query.after,
        beforeId: req.query.before,
        limit: req.query.limit,
        viewerId: req.user.id,
      });
      return res.json({ messages });
    } catch (err) {
      console.error("chat messages:", err);
      return res.status(500).json({ error: "Не удалось загрузить сообщения" });
    }
  });

  app.post("/api/chat/rooms/:id/messages", authMiddleware, async (req, res) => {
    try {
      const room = await getRoom(req.params.id);
      if (!room) return res.status(404).json({ error: "Чат не найден" });
      if (!(await canAccessRoom(room, req.user.id, req.user.role))) {
        return res.status(403).json({ error: "Нет доступа к чату" });
      }
      if (isSystemRoom(room)) await ensureMembership(room.id, req.user.id);
      if (room.type === "ticket") await ensureMembership(room.id, req.user.id);
      const message = await postMessage({
        room,
        userId: req.user.id,
        authorNick: req.user.mcNick || "Игрок",
        text: req.body?.text,
        source: "web",
      });
      return res.json({ ok: true, message });
    } catch (err) {
      console.error("chat post:", err);
      return res.status(err.status || 500).json({
        error: err.message || "Не удалось отправить",
      });
    }
  });

  /** Staff reply on a studio/order application — creates ticket chat visible to all staff + submitter */
  app.post("/api/chat/tickets", authMiddleware, async (req, res) => {
    try {
      if (!isStaffRole(req.user.role)) {
        return res.status(403).json({ error: "Только для персонала" });
      }
      const refKind = String(req.body?.refKind || "").trim();
      const refId = Number(req.body?.refId);
      const text = String(req.body?.text || "").trim().slice(0, MSG_MAX - 48);
      if (!["studio", "order"].includes(refKind) || !Number.isFinite(refId) || refId <= 0) {
        return res.status(400).json({ error: "Нужны refKind (studio|order) и refId" });
      }
      if (!text) {
        return res.status(400).json({ error: "Напиши текст ответа" });
      }

      let submitterId = null;
      let title = "Заявка";
      if (refKind === "studio") {
        const [rows] = await pool.execute(
          `SELECT id, submitter_id, folder_name, submitter_mc_nick
           FROM studio_submissions WHERE id = :id LIMIT 1`,
          { id: refId }
        );
        if (!rows[0]) return res.status(404).json({ error: "Анкета не найдена" });
        submitterId = Number(rows[0].submitter_id);
        title = `Заявка · ${rows[0].folder_name || rows[0].submitter_mc_nick || refId}`;
      } else {
        const [rows] = await pool.execute(
          `SELECT id, submitter_id, kind, submitter_mc_nick, description
           FROM orders WHERE id = :id LIMIT 1`,
          { id: refId }
        );
        if (!rows[0]) return res.status(404).json({ error: "Заказ не найден" });
        submitterId = Number(rows[0].submitter_id);
        const kindLabel =
          rows[0].kind === "model"
            ? "Модель"
            : rows[0].kind === "build"
              ? "Постройка"
              : "Скин";
        title = `Заявка · ${kindLabel} · ${rows[0].submitter_mc_nick || refId}`;
      }

      let room = await getTicketRoom(refKind, refId);
      if (!room) {
        const [result] = await pool.execute(
          `INSERT INTO chat_rooms (name, type, slug, web_readonly, ref_kind, ref_id, created_by)
           VALUES (:name, 'ticket', NULL, 0, :refKind, :refId, :createdBy)`,
          {
            name: String(title).slice(0, NAME_MAX),
            refKind,
            refId,
            createdBy: req.user.id,
          }
        );
        room = await getRoom(result.insertId);
      }
      await addMembers(room.id, [submitterId, req.user.id]);

      const linkTag = `[[ticket:${refKind}:${refId}]]`;
      const body = `${linkTag}\n${text}`;
      const message = await postMessage({
        room,
        userId: req.user.id,
        authorNick: req.user.mcNick || "Админ",
        text: body,
        source: "web",
      });
      const full = await serializeRoom(room, req.user.id);
      full.joined = true;
      io.emit("chat:rooms-updated", { roomId: room.id, scope: "tickets" });
      return res.json({ ok: true, room: full, message });
    } catch (err) {
      console.error("chat ticket:", err);
      return res.status(err.status || 500).json({
        error: err.message || "Не удалось создать чат по заявке",
      });
    }
  });

  /* ---------- Mod API (same chat model, nick-scoped) ---------- */

  async function resolveModPlayer(req, res) {
    if (!requireModKey(req, res)) return null;
    const nick = normalizeMcNick(req.body?.nick || req.query?.nick || "");
    if (!MC_NICK_RE.test(nick)) {
      res.status(400).json({ ok: false, error: "Bad nick" });
      return null;
    }
    const user = await findUserByNick(nick);
    if (!user) {
      res.status(401).json({ ok: false, error: "Unknown player" });
      return null;
    }
    return user;
  }

  app.get("/api/mc/chat/rooms", async (req, res) => {
    try {
      const user = await resolveModPlayer(req, res);
      if (!user) return;
      const scope = String(req.query.scope || "mine") === "public" ? "public" : "mine";
      const rooms = await listRoomsForUser(user.id, scope);
      return res.json({ ok: true, rooms });
    } catch (err) {
      console.error("mc chat rooms:", err);
      return res.status(500).json({ ok: false, error: "Server error" });
    }
  });

  app.post("/api/mc/chat/rooms", async (req, res) => {
    try {
      const user = await resolveModPlayer(req, res);
      if (!user) return;
      const type = String(req.body?.type || "").trim();
      const name = req.body?.name;
      let memberIds = Array.isArray(req.body?.memberIds) ? req.body.memberIds : [];
      // Allow nicks from mod
      if (Array.isArray(req.body?.memberNicks) && req.body.memberNicks.length) {
        const ids = [];
        for (const n of req.body.memberNicks) {
          const u = await findUserByNick(n);
          if (u) ids.push(u.id);
        }
        memberIds = ids;
      }
      const room = await createRoom({
        creatorId: user.id,
        name,
        type,
        memberIds,
      });
      io.emit("chat:rooms-updated", { roomId: room.id });
      return res.json({ ok: true, room });
    } catch (err) {
      console.error("mc chat create:", err);
      return res.status(err.status || 500).json({
        ok: false,
        error: err.message || "Server error",
      });
    }
  });

  app.post("/api/mc/chat/rooms/:id/join", async (req, res) => {
    try {
      const user = await resolveModPlayer(req, res);
      if (!user) return;
      const room = await getRoom(req.params.id);
      if (!room) return res.status(404).json({ ok: false, error: "Not found" });
      if (room.type !== "public") {
        return res.status(403).json({ ok: false, error: "Invite only" });
      }
      await addMembers(room.id, [user.id]);
      const full = await serializeRoom(room, user.id);
      full.joined = true;
      io.emit("chat:rooms-updated", { roomId: room.id });
      return res.json({ ok: true, room: full });
    } catch (err) {
      console.error("mc chat join:", err);
      return res.status(500).json({ ok: false, error: "Server error" });
    }
  });

  app.get("/api/mc/chat/rooms/:id/messages", async (req, res) => {
    try {
      const user = await resolveModPlayer(req, res);
      if (!user) return;
      const room = await getRoom(req.params.id);
      if (!room) return res.status(404).json({ ok: false, error: "Not found" });
      if (!(await canAccessRoom(room, user.id, user.role))) {
        return res.status(403).json({ ok: false, error: "Forbidden" });
      }
      if (isSystemRoom(room)) await ensureMembership(room.id, user.id);
      const messages = await loadMessages(room, {
        afterId: req.query.after,
        beforeId: req.query.before,
        limit: req.query.limit,
        viewerId: user.id,
      });
      return res.json({ ok: true, messages });
    } catch (err) {
      console.error("mc chat messages:", err);
      return res.status(500).json({ ok: false, error: "Server error" });
    }
  });

  app.post("/api/mc/chat/messages", async (req, res) => {
    try {
      const user = await resolveModPlayer(req, res);
      if (!user) return;
      let room = null;
      if (req.body?.roomId) room = await getRoom(req.body.roomId);
      if (!room && req.body?.roomSlug) room = await getRoomBySlug(req.body.roomSlug);
      if (!room) return res.status(404).json({ ok: false, error: "Not found" });
      if (!(await canAccessRoom(room, user.id, user.role))) {
        return res.status(403).json({ ok: false, error: "Forbidden" });
      }
      if (isSystemRoom(room)) await ensureMembership(room.id, user.id);
      if (room.type === "ticket") await ensureMembership(room.id, user.id);

      let audienceIds = Array.isArray(req.body?.audienceIds)
        ? req.body.audienceIds
        : [];
      if (Array.isArray(req.body?.audienceNicks) && req.body.audienceNicks.length) {
        for (const n of req.body.audienceNicks) {
          const u = await findUserByNick(n);
          if (u) audienceIds.push(u.id);
        }
      }

      const message = await postMessage({
        room,
        userId: user.id,
        authorNick: user.mc_nick,
        text: req.body?.text,
        source: "mod",
        audienceIds,
      });
      return res.json({ ok: true, message });
    } catch (err) {
      console.error("mc chat post:", err);
      return res.status(err.status || 500).json({
        ok: false,
        error: err.message || "Server error",
      });
    }
  });

  /** Poll new messages across player's rooms (mine + joined public) */
  app.get("/api/mc/chat/sync", async (req, res) => {
    try {
      const user = await resolveModPlayer(req, res);
      if (!user) return;
      // ensure system rooms membership for sync join
      for (const def of SYSTEM_ROOMS) {
        const sys = await getRoomBySlug(def.slug);
        if (sys) await ensureMembership(sys.id, user.id);
      }
      const after = Number(req.query.after) || 0;
      const lim = Math.min(Math.max(Number(req.query.limit) || 100, 1), 300);
      const [rows] = await pool.execute(
        `SELECT msg.id, msg.room_id, msg.user_id, msg.author_nick, msg.body, msg.source, msg.audience_json, msg.created_at
         FROM chat_messages msg
         JOIN chat_members m ON m.room_id = msg.room_id AND m.user_id = :userId
         LEFT JOIN chat_rooms r ON r.id = msg.room_id
         WHERE msg.id > :after
           AND (
             r.slug IS NULL OR r.slug <> 'proximity'
             OR ${proximityVisibilitySql("msg")}
           )
         ORDER BY msg.id ASC
         LIMIT ${lim}`,
        { userId: user.id, after, viewerId: user.id }
      );
      return res.json({
        ok: true,
        messages: rows.map(serializeMessage),
        cursor: rows.length ? Number(rows[rows.length - 1].id) : after,
      });
    } catch (err) {
      console.error("mc chat sync:", err);
      return res.status(500).json({ ok: false, error: "Server error" });
    }
  });

  app.get("/api/mc/chat/directory", async (req, res) => {
    try {
      if (!requireModKey(req, res)) return;
      const [rows] = await pool.execute(
        `SELECT u.id, u.mc_nick, p.site_nick
         FROM users u
         LEFT JOIN profiles p ON p.user_id = u.id
         ORDER BY u.mc_nick ASC
         LIMIT 500`
      );
      return res.json({
        ok: true,
        users: rows.map((r) => ({
          id: Number(r.id),
          mcNick: r.mc_nick || "",
          siteNick: r.site_nick || "",
        })),
      });
    } catch (err) {
      console.error("mc chat directory:", err);
      return res.status(500).json({ ok: false, error: "Server error" });
    }
  });

  function attachChatSocket(socket) {
    socket.on("chat:join", (payload) => {
      const roomId = Number(payload?.roomId);
      if (!Number.isFinite(roomId) || roomId <= 0) return;
      socket.join(`chat:${roomId}`);
    });
    socket.on("chat:leave", (payload) => {
      const roomId = Number(payload?.roomId);
      if (!Number.isFinite(roomId) || roomId <= 0) return;
      socket.leave(`chat:${roomId}`);
    });
  }

  return { attachChatSocket, ensureSystemChatRooms };
}

module.exports = { setupChatRoutes };

(() => {
  const pad = (n, w = 2) => String(n).padStart(w, "0");

  const WIND_FRAMES = Array.from(
    { length: 31 },
    (_, i) => `assets/wind/wind_gust_${pad(i + 1)}.png`
  );
  const STAR_FRAMES = [
    "assets/Star/star_01.png",
    "assets/Star/star_02.png",
    "assets/Star/star_03.png",
  ];

  const STAR_TINTS = [
    "hue-rotate(0deg) brightness(0.85)",
    "hue-rotate(200deg) brightness(0.8) saturate(1.1)",
    "hue-rotate(280deg) brightness(0.75) saturate(1.05)",
    "hue-rotate(40deg) brightness(0.9) saturate(1)",
    "hue-rotate(160deg) brightness(0.7) saturate(0.95)",
    "hue-rotate(320deg) brightness(0.85) saturate(0.85)",
  ];

  const FIREFLY_TINTS = [
    "hue-rotate(50deg) brightness(1.4) saturate(2)",
    "hue-rotate(70deg) brightness(1.35) saturate(1.8)",
    "hue-rotate(30deg) brightness(1.5) saturate(1.6)",
    "hue-rotate(90deg) brightness(1.25) saturate(1.5)",
  ];

  const PLANET_IMAGES = [
    "assets/planets/deimos.png",
    "assets/planets/earth.png",
    "assets/planets/glacio.png",
    "assets/planets/jupiter.png",
    "assets/planets/mars.png",
    "assets/planets/mercury.png",
    "assets/planets/moon.png",
    "assets/planets/neptune.png",
    "assets/planets/phobos.png",
    "assets/planets/saturn.png",
    "assets/planets/uranus.png",
    "assets/planets/venus.png",
    "assets/planets/vicinus.png",
  ];

  function preload(urls) {
    urls.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }

  preload([
    ...WIND_FRAMES,
    ...STAR_FRAMES,
    ...PLANET_IMAGES,
    "assets/fireflye.png",
  ]);

  const rand = (min, max) => min + Math.random() * (max - min);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];

  /* ---------- Planets: one at a time, arc path ---------- */
  // Р”СѓРіР°: (-1000,0) в†’ (0,100) в†’ (1000,0)
  let planet = null;

  function planetPoint(xLogic, baseY, rise, sizePx) {
    const yLogic = 100 * (1 - (xLogic / 1000) ** 2);
    const w = window.innerWidth;
    const margin = sizePx + 24;
    const screenX = ((xLogic + 1000) / 2000) * (w + 2 * margin) - margin;
    const screenY = baseY - (yLogic / 100) * rise;
    return { screenX, screenY };
  }

  function createPlanet(fromSide = null) {
    const root = document.getElementById("planets");
    if (!root) return;

    if (planet?.el) planet.el.remove();

    const el = document.createElement("div");
    el.className = "planet";

    const w = window.innerWidth;
    const sizePct = rand(2, 10);
    const sizePx = (sizePct / 100) * w;
    const side = fromSide ?? (Math.random() < 0.5 ? "left" : "right");
    // СЃР»РµРІР° в†’ x: -1000в†’1000; СЃРїСЂР°РІР° в†’ x: 1000в†’-1000
    const dir = side === "left" ? 1 : -1;
    const xLogic = side === "left" ? -1000 : 1000;
    const baseY = rand(42, 72);
    const rise = rand(18, 36);
    const duration = rand(90, 160);
    const opacity = rand(0.08, 0.38);

    el.style.width = `${sizePx}px`;
    el.style.height = `${sizePx}px`;
    el.style.opacity = String(opacity);
    el.style.backgroundImage = `url("${pick(PLANET_IMAGES)}")`;

    const { screenX, screenY } = planetPoint(xLogic, baseY, rise, sizePx);
    el.style.transform = `translate(${screenX}px, ${screenY}vh)`;
    root.appendChild(el);

    planet = { el, sizePx, dir, xLogic, baseY, rise, duration };
  }

  function updatePlanets(dt) {
    if (!planet) {
      createPlanet();
      return;
    }

    // 2000 РµРґРёРЅРёС† Р»РѕРіРёС‡РµСЃРєРѕР№ РѕСЃРё X Р·Р° duration СЃРµРєСѓРЅРґ
    planet.xLogic += planet.dir * (2000 / planet.duration) * dt;

    const done =
      (planet.dir > 0 && planet.xLogic >= 1000) ||
      (planet.dir < 0 && planet.xLogic <= -1000);

    if (done) {
      createPlanet(Math.random() < 0.5 ? "left" : "right");
      return;
    }

    const { screenX, screenY } = planetPoint(
      planet.xLogic,
      planet.baseY,
      planet.rise,
      planet.sizePx
    );
    planet.el.style.transform = `translate(${screenX}px, ${screenY}vh)`;
  }

  /* ---------- Stars ---------- */
  function spawnStars() {
    const root = document.getElementById("stars");
    if (!root) return;

    const count = window.innerWidth < 640 ? 14 : 22;

    for (let i = 0; i < count; i++) {
      const el = document.createElement("div");
      el.className = "star";
      el.style.backgroundImage = `url("${pick(STAR_FRAMES)}")`;
      el.style.filter = pick(STAR_TINTS);

      const size = rand(10, 20);
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;

      const state = {
        el,
        progress: Math.random(),
        duration: rand(28, 55),
        startY: rand(4, 58),
        arc: rand(6, 18),
        size,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: rand(1.2, 3.2),
        baseOpacity: rand(0.18, 0.42),
      };

      root.appendChild(el);
      stars.push(state);
    }
  }

  const stars = [];

  function updateStars(dt, t) {
    const w = window.innerWidth;
    for (const s of stars) {
      s.progress += dt / s.duration;
      if (s.progress >= 1) {
        s.progress = 0;
        s.duration = rand(28, 55);
        s.startY = rand(4, 58);
        s.arc = rand(6, 18);
        s.el.style.backgroundImage = `url("${pick(STAR_FRAMES)}")`;
        s.el.style.filter = pick(STAR_TINTS);
      }

      const p = s.progress;
      const x = (1 - p) * (w + 40) - 20;
      const y =
        ((s.startY + Math.sin(p * Math.PI) * s.arc) / 100) * window.innerHeight;
      const twinkle =
        s.baseOpacity *
        (0.55 + 0.45 * Math.sin(t * s.twinkleSpeed + s.twinklePhase));

      s.el.style.transform = `translate(${x}px, ${y}px)`;
      s.el.style.opacity = String(Math.max(0.08, twinkle));
    }
  }

  /* ---------- Wind ---------- */
  const winds = [];

  function spawnWind() {
    const root = document.getElementById("wind-layer");
    if (!root) return;

    const count = window.innerWidth < 640 ? 3 : 5;

    for (let i = 0; i < count; i++) {
      const el = document.createElement("div");
      el.className = "wind";

      const state = {
        el,
        frame: (Math.random() * 31) | 0,
        frameTimer: 0,
        frameInterval: rand(0.05, 0.08),
        x: rand(-400, window.innerWidth),
        y: rand(8, 78),
        speed: rand(18, 42),
        scale: rand(0.85, 1.45),
        opacity: rand(0.08, 0.18),
      };

      el.style.opacity = String(state.opacity);
      el.style.transform = `translate(${state.x}px, ${state.y}vh) scale(${state.scale})`;
      el.style.backgroundImage = `url("${WIND_FRAMES[state.frame]}")`;
      root.appendChild(el);
      winds.push(state);
    }
  }

  function updateWind(dt) {
    const limit = window.innerWidth + 420;
    for (const w of winds) {
      w.x += w.speed * dt;
      w.frameTimer += dt;
      if (w.frameTimer >= w.frameInterval) {
        w.frameTimer = 0;
        w.frame = (w.frame + 1) % 31;
        w.el.style.backgroundImage = `url("${WIND_FRAMES[w.frame]}")`;
      }

      if (w.x > limit) {
        w.x = -420;
        w.y = rand(8, 78);
        w.speed = rand(18, 42);
        w.scale = rand(0.85, 1.45);
        w.opacity = rand(0.08, 0.18);
        w.el.style.opacity = String(w.opacity);
      }

      w.el.style.transform = `translate(${w.x}px, ${w.y}vh) scale(${w.scale})`;
    }
  }

  /* ---------- Fireflies ---------- */
  const fireflies = [];

  function spawnFireflies() {
    const root = document.getElementById("fireflies");
    if (!root) return;

    const count = window.innerWidth < 640 ? 18 : 32;

    for (let i = 0; i < count; i++) {
      const el = document.createElement("div");
      el.className = "firefly";

      const size = rand(10, 22);
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.filter = pick(FIREFLY_TINTS);

      const state = {
        el,
        x: rand(0, 100),
        y: rand(62, 96),
        vx: rand(-6, 6),
        vy: rand(-4, 4),
        phase: Math.random() * Math.PI * 2,
        flickerSpeed: rand(2.5, 6),
        baseOpacity: rand(0.35, 0.9),
        drift: rand(0.4, 1.2),
      };

      root.appendChild(el);
      fireflies.push(state);
    }
  }

  function updateFireflies(dt, t) {
    for (const f of fireflies) {
      f.phase += dt;
      f.x += (f.vx + Math.sin(t * f.drift + f.phase) * 3) * dt * 0.35;
      f.y += (f.vy + Math.cos(t * f.drift * 0.8 + f.phase) * 2) * dt * 0.35;

      if (f.x < -2) f.x = 102;
      if (f.x > 102) f.x = -2;
      if (f.y < 58) {
        f.y = 58;
        f.vy = Math.abs(f.vy);
      }
      if (f.y > 98) {
        f.y = 98;
        f.vy = -Math.abs(f.vy);
      }

      const flicker =
        f.baseOpacity *
        (0.25 + 0.75 * Math.max(0, Math.sin(t * f.flickerSpeed + f.phase) ** 2));

      f.el.style.transform = `translate(${f.x}vw, ${f.y}vh)`;
      f.el.style.opacity = String(flicker);
    }
  }
/* ---------- Form / views / catalog ---------- */
  const SERVER_IP = "srv1001.godlike.club:26519";
  const MOD_INSTALLED_KEY = "genesis_mod_installed_version";
  let serverInfo = null;
  let serverInfoPromise = null;
  const STORAGE_KEY = "genesis_race_v1";
  const AUTH_TOKEN_KEY = "genesis_auth_token";
  const AUTH_USER_KEY = "genesis_auth_user";
  const FORM_FIELDS = ["nick", "raceName", "origin", "abilities", "traits", "useful", "mechanics"];
  const raceSkins = [];
  const raceAudio = [];
  const itemTextures = [];
  const itemAudio = [];
  const structureSchematics = [];
  const COMMAND_RE = /^[A-Za-z0-9_\/]+$/;
  let skinIdSeq = 1;
  let contentContext = { mode: "new", prefix: "NEW*", type: "item" };
  let contentStep = 1;
  const CONTENT_STEPS = 2;
  const GMAIL_TO = "nontringle1@gmail.com";

  /* Auth / API / Socket */
  let authToken = localStorage.getItem(AUTH_TOKEN_KEY) || "";
  let authUser = null;
  let rulesDoc = null;
  let rulesLoaded = false;
  let rulesLoadPromise = null;
  let activeRulesSectionId = null;
  let rulesModalMode = null;
  let rulesModalMeta = null;
  let patchesList = [];
  let patchesLoaded = false;
  let patchesLoadPromise = null;
  let patchEditMode = false;
  let patchEditorId = null;
  try {
    if (authToken) {
      const cachedUser = JSON.parse(localStorage.getItem(AUTH_USER_KEY) || "null");
      if (cachedUser && typeof cachedUser === "object") authUser = cachedUser;
    }
  } catch {
    authUser = null;
  }
  let directoryUsers = [];
  let onlineUserIds = new Set();
  let serverOnlineUserIds = new Set();
  let pendingAvatarDataUrl = null;
  let pendingAvatarReset = false;
  let profileCache = { registered: false, form: {} };
  let socket = null;

  async function api(path, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };
    if (authToken) headers.Authorization = `Bearer ${authToken}`;
    const res = await fetch(path, { ...options, headers });
    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    if (!res.ok) {
      const err = new Error(data?.error || `HTTP ${res.status}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  function persistAuthUser(user) {
    if (authToken && user) {
      try {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
      } catch {
        /* ignore quota */
      }
    } else {
      localStorage.removeItem(AUTH_USER_KEY);
    }
  }

  function setAuthSession(token, user) {
    authToken = token || "";
    authUser = user || null;
    if (authToken) localStorage.setItem(AUTH_TOKEN_KEY, authToken);
    else localStorage.removeItem(AUTH_TOKEN_KEY);
    persistAuthUser(authUser);
    connectSocket();
    updateAuthChrome();
  }

  function clearAuthSession() {
    setAuthSession("", null);
    directoryUsers = [];
    onlineUserIds = new Set();
    serverOnlineUserIds = new Set();
    pendingAvatarDataUrl = null;
    pendingAvatarReset = false;
    localStorage.removeItem(AUTH_USER_KEY);
    renderPlayersDirectory();
    profileCache = readLocalStorageFallback();
  }

  function readLocalStorageFallback() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { registered: false, form: {} };
      const data = JSON.parse(raw);
      return {
        registered: Boolean(data.registered),
        form: data.form && typeof data.form === "object" ? data.form : {},
      };
    } catch {
      return { registered: false, form: {} };
    }
  }

  function writeLocalStorageFallback(patch) {
    const current = readLocalStorageFallback();
    const next = {
      registered:
        patch.registered !== undefined ? patch.registered : current.registered,
      form: patch.form !== undefined ? patch.form : current.form,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  }

  function readStorage() {
    return {
      registered: Boolean(profileCache.registered),
      form:
        profileCache.form && typeof profileCache.form === "object"
          ? profileCache.form
          : {},
    };
  }

  function writeStorage(patch) {
    profileCache = {
      registered:
        patch.registered !== undefined
          ? Boolean(patch.registered)
          : Boolean(profileCache.registered),
      form:
        patch.form !== undefined
          ? patch.form
          : profileCache.form && typeof profileCache.form === "object"
            ? profileCache.form
            : {},
    };
    writeLocalStorageFallback(profileCache);
    if (authToken) {
      api("/api/user/profile", {
        method: "PUT",
        body: JSON.stringify({
          registered: profileCache.registered,
          form: profileCache.form,
        }),
      }).catch((err) => {
        console.warn("profile sync failed:", err.message);
      });
    }
    return profileCache;
  }

  async function loadProfileFromServer() {
    if (!authToken) {
      authUser = null;
      persistAuthUser(null);
      profileCache = readLocalStorageFallback();
      directoryUsers = [];
      onlineUserIds = new Set();
      serverOnlineUserIds = new Set();
      renderPlayersDirectory();
      updateAuthChrome();
      return profileCache;
    }
    try {
      const data = await api("/api/user/profile");
      if (data.token) {
        setAuthSession(data.token, data.user || authUser);
        connectSocket();
      }
      const prevAvatar = authUser?.avatarUrl || "";
      const nextUser = data.user || authUser;
      if (nextUser) {
        // сервер — источник правды; если URL пустой, не затираем кэш мгновенно
        authUser = {
          ...nextUser,
          avatarUrl: nextUser.avatarUrl || prevAvatar || "",
        };
        // принудительно обновляем картинку после F5
        if (authUser.avatarUrl && !authUser.avatarUrl.startsWith("data:")) {
          const base = String(authUser.avatarUrl).split("?")[0];
          authUser.avatarUrl = `${base}?v=${Date.now()}`;
        }
      }
      persistAuthUser(authUser);
      profileCache = {
        registered: Boolean(data.registered),
        form: data.form && typeof data.form === "object" ? data.form : {},
      };
      writeLocalStorageFallback(profileCache);
      updateAuthChrome();
      fillHubRaceFields();
      await loadPlayersDirectory();
      return profileCache;
    } catch (err) {
      if (err.status === 401) clearAuthSession();
      else {
        persistAuthUser(authUser);
        updateAuthChrome();
      }
      profileCache = readLocalStorageFallback();
      return profileCache;
    }
  }

  function connectSocket() {
    if (typeof io !== "function") return;
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    socket = io({
      auth: authToken ? { token: authToken } : {},
      transports: ["websocket", "polling"],
    });
    socket.on("presence:update", (payload) => {
      const ids = Array.isArray(payload?.onlineIds)
        ? payload.onlineIds.map((id) => Number(id)).filter((id) => Number.isFinite(id))
        : [];
      onlineUserIds = new Set(ids);
      const serverIds = Array.isArray(payload?.serverOnlineIds)
        ? payload.serverOnlineIds
            .map((id) => Number(id))
            .filter((id) => Number.isFinite(id))
        : [];
      serverOnlineUserIds = new Set(serverIds);
      const el = document.getElementById("auth-online");
      if (el) {
        el.hidden = false;
        el.textContent = `онлайн: ${ids.length || Number(payload?.online) || 0}`;
      }
      applyPlayersPresence();
    });
    socket.on("directory:user", (payload) => {
      const user = payload?.user;
      if (!user || !Number.isFinite(Number(user.id))) return;
      const id = Number(user.id);
      const idx = directoryUsers.findIndex((u) => Number(u.id) === id);
      const prev = idx >= 0 ? directoryUsers[idx] : null;
      const merged = {
        ...(prev || {}),
        ...user,
        // не затираем аватар, если в апдейте его нет
        avatarUrl: user.avatarUrl || prev?.avatarUrl || "",
      };
      if (idx >= 0) directoryUsers[idx] = merged;
      else directoryUsers.push(merged);
      if (Number(authUser?.id) === id) {
        authUser = {
          ...authUser,
          ...merged,
          avatarUrl: merged.avatarUrl || authUser.avatarUrl || "",
        };
        applyAuthUi({ syncHubFields: false });
      }
      renderPlayersDirectory();
    });
    socket.on("rules:updated", (payload) => {
      if (payload?.rules) {
        rulesDoc = payload.rules;
        rulesLoaded = true;
        renderRulesUi();
      }
    });
    socket.on("server:updated", (payload) => {
      if (payload?.server) {
        const prevPass = serverInfo?.accountPassword;
        const prevHas = serverInfo?.hasAccountPassword;
        const prevHash = serverInfo?.hasPasswordHash;
        serverInfo = {
          ...payload.server,
          accountPassword:
            payload.server.accountPassword != null
              ? payload.server.accountPassword
              : prevPass,
          hasAccountPassword:
            payload.server.hasAccountPassword != null
              ? payload.server.hasAccountPassword
              : prevHas,
          hasPasswordHash:
            payload.server.hasPasswordHash != null
              ? payload.server.hasPasswordHash
              : prevHash,
        };
        renderServerTab();
      }
    });
    socket.on("patches:updated", (payload) => {
      if (payload?.patches) {
        patchesList = payload.patches;
        patchesLoaded = true;
        renderPatchesUi();
      }
    });
    socket.on("connect_error", () => {
      /* API может быть недоступен офлайн — UI продолжает работать локально */
    });
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function playerAvatarSrc(url) {
    const raw = String(url || "");
    if (!raw) return "";
    if (raw.startsWith("data:")) return raw;
    const base = raw.split("?")[0];
    // не залипаем на старом ?v=1 из кэша
    if (raw.includes("?v=1") || !raw.includes("?")) {
      return `${base}?v=${Date.now()}`;
    }
    return raw;
  }

  function wirePresenceAvatarImg(img) {
    if (!img || img.dataset.avatarBound === "1") return;
    img.dataset.avatarBound = "1";
    const base = String(img.getAttribute("data-avatar-base") || img.src || "").split(
      "?"
    )[0];
    if (base) img.setAttribute("data-avatar-base", base);
    img.addEventListener("error", () => {
      const root = img.getAttribute("data-avatar-base") || "";
      if (!root) {
        img.hidden = true;
        return;
      }
      const tries = Number(img.dataset.avatarTries || "0");
      if (tries >= 2) {
        img.hidden = true;
        const fallback = img.parentElement?.querySelector(
          ".presence-avatar__fallback"
        );
        if (fallback) fallback.hidden = false;
        return;
      }
      img.dataset.avatarTries = String(tries + 1);
      img.src = `${root}?v=${Date.now()}-r${tries + 1}`;
    });
  }

  function isBannedUser(user) {
    if (!user) return false;
    if (user.banned) return true;
    if (!user.bannedUntil) return false;
    const ts = new Date(user.bannedUntil).getTime();
    return Number.isFinite(ts) && ts > Date.now();
  }

  function isSiteOnlineVisible(user) {
    if (isBannedUser(user)) return false;
    const id = Number(user?.id);
    if (!Number.isFinite(id) || !onlineUserIds.has(id)) return false;
    if (user?.showSiteOnline === false) return false;
    return true;
  }

  function isServerOnlineVisible(user) {
    if (isBannedUser(user)) return false;
    const id = Number(user?.id);
    if (!Number.isFinite(id) || !serverOnlineUserIds.has(id)) return false;
    if (user?.showServerOnline === false) return false;
    return true;
  }

  function presenceRank(user) {
    if (isBannedUser(user)) return -1;
    if (isSiteOnlineVisible(user)) return 2;
    if (isServerOnlineVisible(user)) return 1;
    return 0;
  }

  function presenceClass(user) {
    if (isBannedUser(user)) return "is-banned";
    if (isSiteOnlineVisible(user)) return "is-site";
    if (isServerOnlineVisible(user)) return "is-server";
    return "is-offline";
  }

  function isStaffUser(user) {
    return Boolean(
      user?.isStaff ||
        user?.isFounder ||
        user?.isAdmin ||
        user?.role === "founder" ||
        user?.role === "admin" ||
        user?.role === "helper"
    );
  }

  function sortPresenceUsers(list) {
    return list.slice().sort((a, b) => {
      const banDiff = Number(isBannedUser(a)) - Number(isBannedUser(b));
      if (banDiff) return banDiff;
      const rankDiff = presenceRank(b) - presenceRank(a);
      if (rankDiff) return rankDiff;
      return String(a.mcNick || "").localeCompare(String(b.mcNick || ""), "en", {
        sensitivity: "base",
      });
    });
  }

  function renderPresenceUser(user) {
    const id = Number(user.id);
    const fullNick = String(user.siteNick || user.mcNick || "—").trim() || "—";
    const mcNick = String(user.mcNick || "").trim();
    const nick = escapeHtml(fullNick);
    const tgRaw = String(user.telegram || "").trim();
    const tg = tgRaw
      ? escapeHtml(tgRaw.startsWith("@") ? tgRaw : `@${tgRaw}`)
      : "";
    const avatarUrl = playerAvatarSrc(user.avatarUrl);
    const letter = escapeHtml((fullNick || "?").slice(0, 1).toUpperCase());
    const avatarBase = avatarUrl ? escapeHtml(String(avatarUrl).split("?")[0]) : "";
    const avatarHtml = avatarUrl
      ? `<img src="${escapeHtml(avatarUrl)}" alt="" data-avatar-base="${avatarBase}" /><span class="presence-avatar__fallback" hidden>${letter}</span>`
      : `<span class="presence-avatar__fallback">${letter}</span>`;
    const cls = presenceClass(user);
    const tipParts = [fullNick];
    if (mcNick && mcNick !== fullNick) tipParts.push(`игра: ${mcNick}`);
    tipParts.push(`id ${id}`);
    const tip = escapeHtml(tipParts.join(" · "));
    const avatarAttr = escapeHtml(String(user.avatarUrl || "").split("?")[0]);
    const raceName = escapeHtml(userRaceName(user));
    return `<article class="presence-user ${cls}" data-user-id="${id}" data-nick="${nick}" data-mc-nick="${escapeHtml(mcNick)}" data-avatar="${avatarAttr}" data-race="${raceName}" data-status="${cls}">
      <div class="presence-user__nick">${nick}</div>
      <button type="button" class="presence-avatar" aria-label="${tip}">${avatarHtml}</button>
      <div class="presence-user__tg">${tg || "—"}</div>
    </article>`;
  }

  function wirePresenceUserCard(card) {
    if (!card || card.dataset.presenceWired === "1") return;
    card.dataset.presenceWired = "1";

    card.addEventListener("mousemove", (e) => {
      if (!isDesktopLayout()) {
        hidePresenceMini();
        return;
      }
      const user = userFromPresenceCard(card);
      if (!user) {
        hidePresenceMini();
        return;
      }
      showPresenceMini(user, e.clientX, e.clientY);
    });

    card.addEventListener("mouseenter", (e) => {
      if (!isDesktopLayout()) return;
      const user = userFromPresenceCard(card);
      if (!user) return;
      showPresenceMini(user, e.clientX, e.clientY);
    });

    card.addEventListener("mouseleave", () => {
      hidePresenceMini();
    });

    card.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const user = userFromPresenceCard(card);
      if (!user) return;
      hidePresenceMini();
      setUserProfileDrawerOpen(true, user);
    });
  }

  function renderPlayersDirectory() {
    const staffHost = document.getElementById("presence-staff");
    const othersHost = document.getElementById("presence-others");
    const staffDivider = document.getElementById("presence-staff-divider");
    if (!staffHost || !othersHost) return;

    const myId = Number(authUser?.id);
    const others = directoryUsers.filter((user) => Number(user.id) !== myId);
    const banned = sortPresenceUsers(others.filter(isBannedUser));
    const active = others.filter((user) => !isBannedUser(user));
    const staff = sortPresenceUsers(active.filter(isStaffUser));
    const regular = sortPresenceUsers(active.filter((user) => !isStaffUser(user)));
    const regularWithBanned = regular.concat(banned);

    staffHost.innerHTML = staff.map(renderPresenceUser).join("");
    othersHost.innerHTML = regularWithBanned.map(renderPresenceUser).join("");
    if (staffDivider) {
      staffDivider.hidden = !(staff.length && regularWithBanned.length);
    }
    staffHost.querySelectorAll("img[data-avatar-base]").forEach(wirePresenceAvatarImg);
    othersHost.querySelectorAll("img[data-avatar-base]").forEach(wirePresenceAvatarImg);
    staffHost.querySelectorAll(".presence-user").forEach(wirePresenceUserCard);
    othersHost.querySelectorAll(".presence-user").forEach(wirePresenceUserCard);
  }

  function findDirectoryUser(id) {
    return directoryUsers.find((u) => Number(u.id) === Number(id)) || null;
  }

  function fillProfileAvatar(host, user, statusClass) {
    if (!host) return;
    host.classList.remove("is-site", "is-server", "is-banned", "is-offline");
    host.classList.add(statusClass || "is-offline");
    const img = host.querySelector("img");
    const fallback = host.querySelector(
      ".presence-mini__fallback, .user-profile-card__fallback, .presence-avatar__fallback"
    );
    const nick = String(user?.siteNick || user?.mcNick || "?").trim() || "?";
    const url = playerAvatarSrc(user?.avatarUrl);
    if (img && url) {
      img.hidden = false;
      img.onerror = () => {
        img.hidden = true;
        if (fallback) {
          fallback.hidden = false;
          fallback.textContent = nick.slice(0, 1).toUpperCase();
        }
      };
      img.src = url;
      if (fallback) fallback.hidden = true;
    } else {
      if (img) {
        img.removeAttribute("src");
        img.hidden = true;
      }
      if (fallback) {
        fallback.hidden = false;
        fallback.textContent = nick.slice(0, 1).toUpperCase();
      }
    }
  }

  function userFromPresenceCard(card) {
    if (!card) return null;
    const id = Number(card.getAttribute("data-user-id"));
    const fromDir = findDirectoryUser(id);
    if (fromDir) return fromDir;
    if (!Number.isFinite(id)) return null;
    return {
      id,
      siteNick: card.getAttribute("data-nick") || "",
      mcNick: card.getAttribute("data-mc-nick") || "",
      avatarUrl: card.getAttribute("data-avatar") || "",
      raceName: card.getAttribute("data-race") || "",
      banned: card.getAttribute("data-status") === "is-banned",
    };
  }

  function userRaceName(user) {
    return String(user?.raceName || user?.race?.raceName || "").trim();
  }

  function userRaceInfo(user) {
    const race = user?.race && typeof user.race === "object" ? user.race : {};
    return {
      raceName: userRaceName(user),
      origin: String(race.origin || "").trim(),
      abilities: String(race.abilities || "").trim(),
      traits: String(race.traits || "").trim(),
      useful: String(race.useful || "").trim(),
      mechanics: String(race.mechanics || "").trim(),
    };
  }

  function renderRaceBlocks(race) {
    const rows = [
      ["Название", race.raceName],
      ["Происхождение", race.origin],
      ["Способности", race.abilities],
      ["Особенности", race.traits],
      ["Польза для других", race.useful],
      ["Механики", race.mechanics],
    ].filter(([, text]) => text);
    if (!rows.length) return "";
    return rows
      .map(
        ([label, text]) =>
          `<div class="user-profile-race__block"><div class="user-profile-race__label">${escapeHtml(
            label
          )}</div><div class="user-profile-race__text">${escapeHtml(
            text
          )}</div></div>`
      )
      .join("");
  }

  let profileViewUser = null;

  function isFounderViewer() {
    return String(authUser?.role || "") === "founder";
  }

  function canFounderEditUser(user) {
    if (!isFounderViewer() || !user) return false;
    const viewerId = Number(authUser?.id);
    const targetId = Number(user.id);
    if (!Number.isFinite(viewerId) || !Number.isFinite(targetId)) return false;
    return viewerId !== targetId;
  }

  function setUserProfileEditMode(on) {
    const allowed = Boolean(on) && canFounderEditUser(profileViewUser);
    const canEdit = canFounderEditUser(profileViewUser);
    const view = document.getElementById("user-profile-race");
    const edit = document.getElementById("user-profile-race-edit");
    const avatar = document.getElementById("user-profile-avatar");
    const menu = document.getElementById("user-profile-avatar-menu");
    if (edit) {
      edit.hidden = !allowed;
      edit.setAttribute("aria-hidden", allowed ? "false" : "true");
      if (!canEdit) {
        edit.querySelectorAll("input, textarea, button").forEach((el) => {
          el.disabled = true;
        });
      } else {
        edit.querySelectorAll("input, textarea, button").forEach((el) => {
          el.disabled = false;
        });
      }
    }
    if (view) view.hidden = allowed || !view.innerHTML.trim();
    if (avatar) {
      avatar.classList.toggle("is-editable", canEdit);
      avatar.tabIndex = canEdit ? 0 : -1;
    }
    if (menu) menu.hidden = !allowed;
  }

  const AUTH_MC_NICK_RE = /^[A-Za-z0-9_]{3,16}$/;

  function fillFounderRaceEdit(user) {
    const race = userRaceInfo(user);
    const map = {
      "edit-site-nick": String(user?.siteNick || "").trim(),
      "edit-mc-nick": String(user?.mcNick || "").trim(),
      "edit-race-name": race.raceName,
      "edit-race-origin": race.origin,
      "edit-race-abilities": race.abilities,
      "edit-race-traits": race.traits,
      "edit-race-useful": race.useful,
      "edit-race-mechanics": race.mechanics,
    };
    Object.entries(map).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) el.value = value;
    });
    setHubFieldError("edit-race-error", "");
  }

  function readFounderEditPayload() {
    return {
      siteNick: String(document.getElementById("edit-site-nick")?.value || "").trim(),
      mcNick: String(document.getElementById("edit-mc-nick")?.value || "").trim(),
      form: {
        raceName: String(document.getElementById("edit-race-name")?.value || "").trim(),
        origin: String(document.getElementById("edit-race-origin")?.value || "").trim(),
        abilities: String(document.getElementById("edit-race-abilities")?.value || "").trim(),
        traits: String(document.getElementById("edit-race-traits")?.value || "").trim(),
        useful: String(document.getElementById("edit-race-useful")?.value || "").trim(),
        mechanics: String(document.getElementById("edit-race-mechanics")?.value || "").trim(),
      },
    };
  }

  function applyFounderEditLiveUi() {
    if (!profileViewUser) return;
    const { siteNick, mcNick, form } = readFounderEditPayload();
    const displayNick = siteNick || mcNick || "—";
    const nickEl = document.getElementById("user-profile-nick");
    const metaEl = document.getElementById("user-profile-meta");
    const raceEl = document.getElementById("user-profile-race");
    if (nickEl) nickEl.textContent = displayNick;
    if (metaEl) {
      metaEl.textContent =
        mcNick && mcNick !== displayNick ? `игра: ${mcNick}` : "";
      metaEl.hidden = !metaEl.textContent;
    }
    if (raceEl) {
      raceEl.innerHTML = renderRaceBlocks(form);
    }
    profileViewUser = {
      ...profileViewUser,
      siteNick,
      mcNick,
      raceName: form.raceName,
      race: form,
    };
  }

  let founderEditSaveTimer = null;
  let founderEditSaveToken = 0;

  async function persistFounderProfileEdit() {
    if (!canFounderEditUser(profileViewUser)) return;
    const token = ++founderEditSaveToken;
    const { siteNick, mcNick, form } = readFounderEditPayload();
    if (!mcNick) {
      setHubFieldError("edit-race-error", "Укажи игровой ник");
      return;
    }
    if (!AUTH_MC_NICK_RE.test(mcNick)) {
      setHubFieldError(
        "edit-race-error",
        "Игровой ник: 3–16 символов, латиница, цифры и _"
      );
      return;
    }
    setHubFieldError("edit-race-error", "");
    try {
      const data = await api(`/api/users/${Number(profileViewUser.id)}/profile`, {
        method: "PUT",
        body: JSON.stringify({
          siteNick,
          mcNick,
          form,
          registered: Boolean(
            form.raceName && form.origin && form.abilities && form.useful
          ),
        }),
      });
      if (token !== founderEditSaveToken) return;
      if (data.user) mergeDirectoryUser(data.user);
    } catch (err) {
      if (token !== founderEditSaveToken) return;
      setHubFieldError("edit-race-error", err.message || "Не удалось сохранить");
    }
  }

  function scheduleFounderProfileSave() {
    applyFounderEditLiveUi();
    clearTimeout(founderEditSaveTimer);
    founderEditSaveTimer = setTimeout(() => {
      persistFounderProfileEdit();
    }, 420);
  }

  function hidePresenceMini() {
    const mini = document.getElementById("presence-mini-card");
    if (mini) mini.hidden = true;
  }

  function showPresenceMini(user, clientX, clientY) {
    const mini = document.getElementById("presence-mini-card");
    if (!mini || !user) return;
    const nick = String(user.siteNick || user.mcNick || "—").trim() || "—";
    const id = Number(user.id);
    const raceName = userRaceName(user);
    const status = presenceClass(user);
    fillProfileAvatar(
      document.getElementById("presence-mini-avatar"),
      user,
      status
    );
    const nickEl = document.getElementById("presence-mini-nick");
    const raceEl = document.getElementById("presence-mini-race");
    const idEl = document.getElementById("presence-mini-id");
    if (nickEl) nickEl.textContent = nick;
    if (raceEl) {
      raceEl.textContent = raceName;
      raceEl.hidden = !raceName;
    }
    if (idEl) idEl.textContent = `id ${id}`;
    mini.hidden = false;
    mini.style.left = "0px";
    mini.style.top = "0px";
    const rect = mini.getBoundingClientRect();
    const pad = 14;
    let left = clientX - rect.width - pad;
    let top = clientY - rect.height / 2;
    if (left < 8) left = clientX + pad;
    if (top < 8) top = 8;
    if (top + rect.height > window.innerHeight - 8) {
      top = Math.max(8, window.innerHeight - rect.height - 8);
    }
    mini.style.left = `${Math.round(left)}px`;
    mini.style.top = `${Math.round(top)}px`;
  }

  function setUserProfileDrawerOpen(open, user = null) {
    const drawer = document.getElementById("user-profile-drawer");
    if (!drawer) return;
    const menu = document.getElementById("user-profile-avatar-menu");
    if (menu) menu.hidden = true;
    if (open && user) {
      profileViewUser = user;
      const nick = String(user.siteNick || user.mcNick || "—").trim() || "—";
      const mcNick = String(user.mcNick || "").trim();
      const status = presenceClass(user);
      const race = userRaceInfo(user);
      fillProfileAvatar(
        document.getElementById("user-profile-avatar"),
        user,
        status
      );
      const nickEl = document.getElementById("user-profile-nick");
      const metaEl = document.getElementById("user-profile-meta");
      const idEl = document.getElementById("user-profile-id");
      const raceEl = document.getElementById("user-profile-race");
      if (nickEl) nickEl.textContent = nick;
      if (metaEl) {
        metaEl.textContent =
          mcNick && mcNick !== nick ? `игра: ${mcNick}` : "";
        metaEl.hidden = !metaEl.textContent;
      }
      if (idEl) idEl.textContent = `id ${Number(user.id)}`;
      if (raceEl) {
        const html = renderRaceBlocks(race);
        raceEl.innerHTML = html;
        raceEl.hidden = !html;
      }
      if (canFounderEditUser(user)) fillFounderRaceEdit(user);
      setUserProfileEditMode(false);
      const avatarBtn = document.getElementById("user-profile-avatar");
      if (avatarBtn) {
        const canEdit = canFounderEditUser(user);
        avatarBtn.classList.toggle("is-editable", canEdit);
        avatarBtn.tabIndex = canEdit ? 0 : -1;
        avatarBtn.setAttribute(
          "aria-label",
          canEdit ? "Редактировать профиль" : "Аватар"
        );
      }
      setSettingsDrawerOpen(false);
      setStaffPanelOpen(false);
      drawer.classList.add("is-open");
      drawer.setAttribute("aria-hidden", "false");
      hidePresenceMini();
    } else {
      profileViewUser = null;
      setUserProfileEditMode(false);
      drawer.classList.remove("is-open");
      drawer.setAttribute("aria-hidden", "true");
    }
  }

  function bindPresenceTips() {
    const strip = document.querySelector(".presence-strip");
    const rail =
      document.getElementById("presence-rail") ||
      strip?.querySelector?.(".presence-rail");
    if (!strip || !rail || strip.dataset.presenceBound === "1") return;
    strip.dataset.presenceBound = "1";

    const resolveCard = (target) => {
      const card = target?.closest?.(".presence-user");
      if (!card || !rail.contains(card)) return null;
      return card;
    };

    strip.addEventListener("mousemove", (e) => {
      if (!isDesktopLayout()) {
        hidePresenceMini();
        return;
      }
      const card = resolveCard(e.target);
      if (!card) {
        hidePresenceMini();
        return;
      }
      const user = userFromPresenceCard(card);
      if (!user) {
        hidePresenceMini();
        return;
      }
      showPresenceMini(user, e.clientX, e.clientY);
    });

    strip.addEventListener("mouseleave", () => {
      hidePresenceMini();
    });

    strip.addEventListener("click", (e) => {
      const card = resolveCard(e.target);
      if (!card) return;
      e.preventDefault();
      e.stopPropagation();
      const user = userFromPresenceCard(card);
      if (!user) return;
      hidePresenceMini();
      setUserProfileDrawerOpen(true, user);
    });
  }

  bindPresenceTips();

  function applyPlayersPresence() {
    renderPlayersDirectory();
  }

  async function loadPlayersDirectory() {
    if (!authToken) {
      directoryUsers = [];
      onlineUserIds = new Set();
      serverOnlineUserIds = new Set();
      renderPlayersDirectory();
      return;
    }
    try {
      const data = await api("/api/users/directory");
      directoryUsers = Array.isArray(data.users) ? data.users : [];
      if (Array.isArray(data.onlineIds)) {
        onlineUserIds = new Set(
          data.onlineIds.map((id) => Number(id)).filter((id) => Number.isFinite(id))
        );
      }
      if (Array.isArray(data.serverOnlineIds)) {
        serverOnlineUserIds = new Set(
          data.serverOnlineIds
            .map((id) => Number(id))
            .filter((id) => Number.isFinite(id))
        );
      }
      renderPlayersDirectory();
    } catch (err) {
      console.warn("players directory:", err.message);
    }
  }

  const UI_TRANSITION_MS = 380;

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function setLayerOpen(el, open) {
    if (!el) return Promise.resolve();
    const ms = prefersReducedMotion() ? 0 : UI_TRANSITION_MS;
    if (open) {
      el.hidden = false;
      // reflow so CSS transition runs from closed state
      void el.offsetWidth;
      el.classList.add("is-open");
      return new Promise((resolve) => window.setTimeout(resolve, ms));
    }
    el.classList.remove("is-open");
    return new Promise((resolve) => {
      window.setTimeout(() => {
        el.hidden = true;
        resolve();
      }, ms);
    });
  }

  function applyAuthUi(options = {}) {
    const syncHubFields = Boolean(options.syncHubFields);
    const displayNick = authUser?.mcNick || authUser?.username || "";
    const siteNick = authUser?.siteNick || "";
    const avatarUrl = pendingAvatarDataUrl || authUser?.avatarUrl || "";
    const loggedIn = Boolean(authToken && displayNick);
    const sessionPending = Boolean(authToken && !displayNick);
    const gate = document.getElementById("auth-gate");
    const topbar = document.getElementById("topbar");
    const stage = document.getElementById("app-stage");
    const footer = document.getElementById("app-footer");
    const avatarImg = document.getElementById("profile-avatar-img");
    const avatarFallback = document.getElementById("profile-avatar-fallback");
    const hubAvatarImg = document.getElementById("hub-avatar-img");
    const hubAvatarFallback = document.getElementById("hub-avatar-fallback");
    const adminShell = document.getElementById("admin-shell");
    const hubSiteNick = document.getElementById("hub-site-nick");
    const hubMcNick = document.getElementById("hub-mc-nick");
    const profileFrame = document.getElementById("profile-frame");

    if (stage) stage.hidden = true;
    if (footer) footer.hidden = true;

    const showGate = !(loggedIn || sessionPending);
    if (gate) {
      if (showGate) {
        gate.hidden = false;
        void gate.offsetWidth;
        gate.classList.add("is-open");
      } else {
        gate.classList.remove("is-open");
        window.setTimeout(() => {
          if (!gate.classList.contains("is-open")) gate.hidden = true;
        }, UI_TRANSITION_MS);
      }
    }

    if (topbar) {
      if (loggedIn) {
        topbar.hidden = false;
        void topbar.offsetWidth;
        topbar.classList.add("is-open");
      } else {
        topbar.classList.remove("is-open");
        window.setTimeout(() => {
          if (!topbar.classList.contains("is-open")) topbar.hidden = true;
        }, UI_TRANSITION_MS);
        if (adminShell?.classList.contains("is-open")) {
          setLayerOpen(adminShell, false);
        }
      }
    }

    // Не затираем ники при превью аватара / socket-обновлениях — только после логина/сохранения
    if (syncHubFields) {
      if (hubSiteNick) {
        hubSiteNick.value =
          siteNick || String(authUser?.telegram || "").replace(/^@/, "");
      }
      if (hubMcNick) {
        hubMcNick.value = displayNick;
      }
      fillHubRaceFields();
    }

    if (profileFrame) {
      const shown = authUser?.showOnlineFrame !== false;
      profileFrame.classList.toggle("is-shown", shown);
      profileFrame.classList.toggle("is-hidden", !shown);
    }

    const syncAvatar = (img, fallback, nick) => {
      if (!img || !fallback) return;
      if (avatarUrl) {
        const isData = avatarUrl.startsWith("data:");
        const src = isData
          ? avatarUrl
          : avatarUrl.includes("?")
            ? avatarUrl
            : `${avatarUrl}?v=${Date.now()}`;
        img.onerror = () => {
          if (!img.dataset.avatarRetry && !isData) {
            img.dataset.avatarRetry = "1";
            img.src = `${String(avatarUrl).split("?")[0]}?v=${Date.now()}-r`;
            return;
          }
          img.hidden = true;
          fallback.hidden = false;
          fallback.textContent = (nick || "?").slice(0, 1).toUpperCase();
        };
        img.onload = () => {
          delete img.dataset.avatarRetry;
          img.hidden = false;
          fallback.hidden = true;
        };
        if (img.getAttribute("src") !== src) {
          delete img.dataset.avatarRetry;
          img.src = src;
        }
        img.hidden = false;
        fallback.hidden = true;
      } else {
        delete img.dataset.avatarRetry;
        img.removeAttribute("src");
        img.hidden = true;
        fallback.hidden = false;
        fallback.textContent = (nick || "?").slice(0, 1).toUpperCase();
      }
    };

    syncAvatar(avatarImg, avatarFallback, displayNick);
    syncAvatar(hubAvatarImg, hubAvatarFallback, displayNick);
    syncPrivacyMarks();
    syncPanelAccess();
    // Не перерисовываем весь presence-strip отсюда — это срывает загрузку чужих аватарок
  }

  function syncPanelAccess() {
    const staff = Boolean(authToken && (authUser?.isStaff || isStaffUser(authUser)));
    if (!staff) setStaffPanelOpen(false);
    const canAdmin = Boolean(
      authUser?.isFounder ||
        authUser?.role === "founder" ||
        authUser?.role === "admin"
    );
    const permBlock = document.getElementById("panel-perm-block");
    if (permBlock) permBlock.hidden = !canAdmin;
    document.querySelectorAll(".panel-admin-only").forEach((el) => {
      el.hidden = !canAdmin;
    });
    document.querySelectorAll(".panel-sep--admin").forEach((el) => {
      el.hidden = !canAdmin;
    });
  }

  function setHubTab(tab) {
    const name = String(tab || "profile");
    document.querySelectorAll(".hub-nav__btn[data-hub-tab]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.getAttribute("data-hub-tab") === name);
    });
    document.querySelectorAll(".hub-view[data-hub-view]").forEach((view) => {
      const match = view.getAttribute("data-hub-view") === name;
      view.classList.toggle("is-active", match);
      view.hidden = !match;
    });
  }

  const COMPENDIUM_LINES = [
    "Компендиума пока не доступен.",
    "Подождите пока выйдет обновление.",
  ];
  const COMPENDIUM_BOOK_W = 281;
  const COMPENDIUM_BOOK_H = 173;
  const COMPENDIUM_TEXT_COLOR = "#3f2a1d";
  const COMPENDIUM_FONT_SCALE = 1;
  const COMPENDIUM_BOOK_SRC = "assets/compendium/compendium.png";

  let compendiumFontPromise = null;
  let compendiumGlyphs = null;
  let compendiumBookImg = null;
  let compendiumResizeBound = false;
  let compendiumPaintToken = 0;

  function loadImageEl(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Не удалось загрузить ${src}`));
      img.src = src;
    });
  }

  function measureGlyphWidth(img, sx, sy, cellW, cellH) {
    const canvas = document.createElement("canvas");
    canvas.width = cellW;
    canvas.height = cellH;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.clearRect(0, 0, cellW, cellH);
    ctx.drawImage(img, sx, sy, cellW, cellH, 0, 0, cellW, cellH);
    const { data } = ctx.getImageData(0, 0, cellW, cellH);
    let maxX = -1;
    for (let y = 0; y < cellH; y += 1) {
      for (let x = 0; x < cellW; x += 1) {
        if (data[(y * cellW + x) * 4 + 3] > 16 && x > maxX) maxX = x;
      }
    }
    return maxX < 0 ? 0 : maxX + 1;
  }

  async function ensureCompendiumFont() {
    if (compendiumGlyphs) return compendiumGlyphs;
    if (compendiumFontPromise) return compendiumFontPromise;
    compendiumFontPromise = (async () => {
      const res = await fetch("assets/compendium/font/providers.json");
      if (!res.ok) throw new Error("providers.json");
      const data = await res.json();
      const needed = new Set();
      for (const line of COMPENDIUM_LINES) {
        for (const ch of Array.from(line)) needed.add(ch);
      }
      const glyphs = new Map();
      for (const provider of data.providers || []) {
        const parsedRows = (provider.chars || []).map((row) => Array.from(row));
        if (!parsedRows.length) continue;
        const rowLen = Math.max(...parsedRows.map((chars) => chars.length));
        if (!rowLen) continue;
        const img = await loadImageEl(provider.file);
        const cellW = img.width / rowLen;
        const cellH = img.height / parsedRows.length;
        const glyphH = provider.height || 8;
        const ascent = provider.ascent ?? glyphH;
        for (let row = 0; row < parsedRows.length; row += 1) {
          const chars = parsedRows[row];
          for (let col = 0; col < chars.length; col += 1) {
            const ch = chars[col];
            if (!ch || ch === "\u0000" || glyphs.has(ch)) continue;
            if (!needed.has(ch) && ch !== " ") continue;
            const sx = Math.round(col * cellW);
            const sy = Math.round(row * cellH);
            const cw = Math.max(1, Math.round(cellW));
            const chh = Math.max(1, Math.round(cellH));
            let inkW = 0;
            try {
              inkW = measureGlyphWidth(img, sx, sy, cw, chh);
            } catch (_) {
              inkW = Math.max(1, cw - 1);
            }
            if (ch === " ") inkW = Math.max(inkW, 4);
            glyphs.set(ch, {
              img,
              sx,
              sy,
              cellW: cw,
              cellH: chh,
              width: inkW,
              height: glyphH,
              ascent,
              blank: ch === " " || inkW === 0,
            });
          }
        }
      }
      if (!glyphs.has(" ")) {
        glyphs.set(" ", {
          img: null,
          sx: 0,
          sy: 0,
          cellW: 4,
          cellH: 8,
          width: 4,
          height: 8,
          ascent: 7,
          blank: true,
        });
      }
      compendiumGlyphs = glyphs;
      return glyphs;
    })().catch((err) => {
      compendiumFontPromise = null;
      throw err;
    });
    return compendiumFontPromise;
  }

  function glyphAdvance(g, ch, scale) {
    if (!g) return 6 * scale;
    if (ch === " " || g.blank) return g.width * scale;
    return (g.width + 1) * scale;
  }

  function measureCompendiumLine(glyphs, line, scale) {
    let w = 0;
    for (const ch of Array.from(line)) {
      w += glyphAdvance(glyphs.get(ch), ch, scale);
    }
    return w;
  }

  function drawColoredGlyph(ctx, g, x, y, scale, color) {
    const dw = Math.max(1, Math.round(g.cellW * scale));
    const dh = Math.max(1, Math.round(g.cellH * scale));
    const off = document.createElement("canvas");
    off.width = dw;
    off.height = dh;
    const octx = off.getContext("2d");
    octx.imageSmoothingEnabled = false;
    octx.clearRect(0, 0, dw, dh);
    octx.drawImage(g.img, g.sx, g.sy, g.cellW, g.cellH, 0, 0, dw, dh);
    octx.globalCompositeOperation = "source-in";
    octx.fillStyle = color;
    octx.fillRect(0, 0, dw, dh);
    ctx.drawImage(off, x, y);
  }

  function drawCompendiumLine(ctx, glyphs, line, x, baselineY, scale, color) {
    let cursor = x;
    for (const ch of Array.from(line)) {
      const g = glyphs.get(ch);
      if (!g || !g.img || g.blank) {
        cursor += glyphAdvance(g, ch, scale);
        continue;
      }
      const dy = baselineY - g.ascent * scale;
      drawColoredGlyph(ctx, g, cursor, dy, scale, color);
      cursor += glyphAdvance(g, ch, scale);
    }
  }

  async function ensureCompendiumBookImg() {
    if (compendiumBookImg?.complete) return compendiumBookImg;
    const art = document.getElementById("compendium-art");
    if (art?.complete && art.naturalWidth) {
      compendiumBookImg = art;
      return art;
    }
    compendiumBookImg = await loadImageEl(COMPENDIUM_BOOK_SRC);
    return compendiumBookImg;
  }

  async function renderCompendiumBook() {
    const canvas = document.getElementById("compendium-canvas");
    const book = document.getElementById("compendium-book");
    const art = document.getElementById("compendium-art");
    if (!canvas || !book) return;

    if (!compendiumResizeBound) {
      compendiumResizeBound = true;
      const rerender = () => {
        if (document.getElementById("main-panel-compendium")?.classList.contains("is-active")) {
          renderCompendiumBook();
        }
      };
      window.addEventListener("resize", rerender);
      if (typeof ResizeObserver !== "undefined") {
        new ResizeObserver(rerender).observe(book);
      }
    }

    const token = ++compendiumPaintToken;

    try {
      const [glyphs, bookImg] = await Promise.all([
        ensureCompendiumFont(),
        ensureCompendiumBookImg(),
      ]);
      if (token !== compendiumPaintToken) return;

      await new Promise((resolve) => requestAnimationFrame(resolve));
      if (token !== compendiumPaintToken) return;

      const cssW = Math.max(book.clientWidth || art?.clientWidth || 1, 1);
      const cssH = Math.max(book.clientHeight || art?.clientHeight || 1, 1);
      if (cssW < 2 || cssH < 2) {
        // layout not ready yet
        requestAnimationFrame(() => renderCompendiumBook());
        return;
      }

      const scale = COMPENDIUM_FONT_SCALE;
      const lineGap = 3 * scale;
      const lineHeights = COMPENDIUM_LINES.map((line) => {
        let maxH = 8 * scale;
        for (const ch of Array.from(line)) {
          const g = glyphs.get(ch);
          if (g) maxH = Math.max(maxH, g.height * scale);
        }
        return maxH;
      });
      const blockH =
        lineHeights.reduce((a, b) => a + b, 0) + lineGap * (COMPENDIUM_LINES.length - 1);
      const widths = COMPENDIUM_LINES.map((line) => measureCompendiumLine(glyphs, line, scale));

      // Native book pixels on canvas; CSS scales the element over the art.
      canvas.width = COMPENDIUM_BOOK_W;
      canvas.height = COMPENDIUM_BOOK_H;
      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let y = Math.round((COMPENDIUM_BOOK_H - blockH) / 2);
      for (let i = 0; i < COMPENDIUM_LINES.length; i += 1) {
        const lw = widths[i];
        const lh = lineHeights[i];
        const x = Math.round((COMPENDIUM_BOOK_W - lw) / 2);
        const baseline = y + Math.round(lh * 0.9);
        drawCompendiumLine(
          ctx,
          glyphs,
          COMPENDIUM_LINES[i],
          x,
          baseline,
          scale,
          COMPENDIUM_TEXT_COLOR
        );
        y += lh + lineGap;
      }
    } catch (err) {
      console.warn("Compendium render:", err);
      // Last-resort visible fallback so the tab is never blank of message.
      const canvas2 = document.getElementById("compendium-canvas");
      if (!canvas2) return;
      canvas2.width = COMPENDIUM_BOOK_W;
      canvas2.height = COMPENDIUM_BOOK_H;
      const ctx = canvas2.getContext("2d");
      ctx.fillStyle = "#c6ad8a";
      ctx.fillRect(0, 0, canvas2.width, canvas2.height);
      ctx.fillStyle = COMPENDIUM_TEXT_COLOR;
      ctx.font = "8px monospace";
      ctx.textAlign = "center";
      ctx.fillText(COMPENDIUM_LINES[0], COMPENDIUM_BOOK_W / 2, 80);
      ctx.fillText(COMPENDIUM_LINES[1], COMPENDIUM_BOOK_W / 2, 94);
    }
  }

  function setMainTab(tab) {
    const name = String(tab || "studio");
    const shell = document.getElementById("profile-card");
    document.querySelectorAll(".main-tabs__btn[data-main-tab]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.getAttribute("data-main-tab") === name);
    });
    document.querySelectorAll(".main-tab-panel[data-main-panel]").forEach((panel) => {
      const on = panel.getAttribute("data-main-panel") === name;
      panel.classList.toggle("is-active", on);
      panel.hidden = !on;
    });
    shell?.classList.toggle("is-bare-main", name === "compendium");
    if (name === "compendium") {
      requestAnimationFrame(() => renderCompendiumBook());
    }
    if (name === "rules") {
      ensureRulesLoaded().then(() => {
        if (!activeRulesSectionId && rulesDoc?.sections?.length) {
          openRulesSection(rulesDoc.sections[0].id);
        } else {
          renderRulesUi();
        }
      });
    }
    if (name === "server") {
      const panel = document.getElementById("main-panel-server");
      if (panel) panel.scrollTop = 0;
      ensureServerInfoLoaded().then(() => renderServerTab());
    }
    if (name === "patch") {
      ensurePatchesLoaded().then(() => renderPatchesUi());
    }
  }

  document.getElementById("main-tabs")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".main-tabs__btn[data-main-tab]");
    if (!btn) return;
    setMainTab(btn.getAttribute("data-main-tab"));
  });

  function isDesktopLayout() {
    return window.matchMedia("(min-width: 721px)").matches;
  }

  function setStaffPanelOpen(open) {
    const panel = document.getElementById("staff-panel");
    if (!panel) return;
    const staff = Boolean(authToken && (authUser?.isStaff || isStaffUser(authUser)));
    const next = Boolean(open) && staff;
    if (next) {
      setSettingsDrawerOpen(false);
      setUserProfileDrawerOpen(false);
      hidePresenceMini();
      syncPanelAccess();
      renderConsoleHistory();
      panel.hidden = false;
      void panel.offsetWidth;
      panel.classList.add("is-open");
      panel.setAttribute("aria-hidden", "false");
    } else {
      panel.classList.remove("is-open");
      panel.setAttribute("aria-hidden", "true");
      window.setTimeout(() => {
        if (!panel.classList.contains("is-open")) panel.hidden = true;
      }, UI_TRANSITION_MS);
    }
  }

  function toggleStaffPanel(opts = {}) {
    if (!authToken || !(authUser?.isStaff || isStaffUser(authUser))) {
      if (opts.notify) showToast("Нет доступа к панели");
      return;
    }
    const panel = document.getElementById("staff-panel");
    setStaffPanelOpen(!panel?.classList.contains("is-open"));
  }

  function setSettingsDrawerOpen(open) {
    const drawer = document.getElementById("settings-drawer");
    const btn = document.getElementById("profile-avatar-btn");
    if (!drawer) return;
    const next = Boolean(open);
    if (next) {
      setUserProfileDrawerOpen(false);
      setStaffPanelOpen(false);
    }
    drawer.classList.toggle("is-open", next);
    if (btn) btn.setAttribute("aria-expanded", next ? "true" : "false");
  }

  function toggleSettingsDrawer() {
    const drawer = document.getElementById("settings-drawer");
    setSettingsDrawerOpen(!drawer?.classList.contains("is-open"));
  }

  function setPanelTab(tab) {
    const name = String(tab || "controller");
    document.querySelectorAll(".panel-subnav__btn").forEach((btn) => {
      btn.classList.toggle("is-active", btn.getAttribute("data-panel-tab") === name);
    });
    document.querySelectorAll(".panel-pane").forEach((pane) => {
      const match = pane.getAttribute("data-panel-pane") === name;
      pane.classList.toggle("is-active", match);
      pane.hidden = !match;
    });
  }

  function syncPrivacyMarks() {
    const marks = {
      showSiteOnline: document.getElementById("privacy-site-mark"),
      showServerOnline: document.getElementById("privacy-server-mark"),
      showOnlineFrame: document.getElementById("privacy-frame-mark"),
    };
    const values = {
      showSiteOnline: authUser?.showSiteOnline !== false,
      showServerOnline: authUser?.showServerOnline !== false,
      showOnlineFrame: authUser?.showOnlineFrame !== false,
    };
    Object.keys(marks).forEach((key) => {
      if (marks[key]) marks[key].textContent = values[key] ? "X" : "";
    });
  }

  function updateAuthChrome() {
    applyAuthUi({ syncHubFields: true });
  }

  const PENDING_TG_KEY = "genesis_pending_tg";
  const TG_INTENT_KEY = "genesis_tg_intent";
  let pendingTelegramAuth = null;
  let telegramAuthIntent = "login";

  function readPendingTelegram() {
    try {
      const raw = sessionStorage.getItem(PENDING_TG_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function writePendingTelegram(data) {
    pendingTelegramAuth = data || null;
    if (data) sessionStorage.setItem(PENDING_TG_KEY, JSON.stringify(data));
    else sessionStorage.removeItem(PENDING_TG_KEY);
    updateRegisterTelegramUi();
  }

  function updateRegisterTelegramUi() {
    const status = document.getElementById("reg-tg-status");
    const tgBlock = document.getElementById("reg-tg-block");
    const err = document.getElementById("auth-reg-telegram-error");
    const handle =
      pendingTelegramAuth?.telegram ||
      (pendingTelegramAuth?.telegramAuth?.username
        ? `@${pendingTelegramAuth.telegramAuth.username}`
        : pendingTelegramAuth?.telegramAuth?.id
          ? `id ${pendingTelegramAuth.telegramAuth.id}`
          : "");

    if (pendingTelegramAuth?.telegramAuth) {
      if (status) {
        status.hidden = false;
        status.textContent = handle
          ? `Данные Telegram получены: ${handle}`
          : "Данные Telegram получены";
      }
      if (tgBlock) tgBlock.hidden = true;
      if (err) {
        err.hidden = true;
        err.textContent = "";
      }
    } else {
      if (status) status.hidden = true;
      if (tgBlock) tgBlock.hidden = false;
    }
  }

  async function handleTelegramAuthResult(user, intent = telegramAuthIntent) {
    const data = await api("/api/auth/telegram", {
      method: "POST",
      body: JSON.stringify(user),
    });

    const pending = {
      telegramAuth: data.telegramAuth || user,
      telegram: data.telegram || "",
    };

    if (intent === "register") {
      if (data.registered) {
        showToast("Этот Telegram уже зарегистрирован — войдите");
        openAuthModal("login");
        return;
      }
      writePendingTelegram(pending);
      openAuthModal("register");
      showToast("Telegram подключён");
      return;
    }

    // Вход: только если аккаунт уже есть
    if (data.registered && data.token) {
      writePendingTelegram(null);
      setAuthSession(data.token, data.user);
      await loadProfileFromServer();
      closeAuthModal();
      applyAuthUi();
      showToast("Вход через Telegram");
      return;
    }

    writePendingTelegram(pending);
    openAuthModal("register");
    showAuthStatus("Сначала зарегистрируйте аккаунт с этим Telegram");
    showToast("Сначала зарегистрируйтесь");
  }

  let tgBotUsername = "";
  let tgBotId = null;

  function mountTelegramWidgetIn(hostId, _size = "medium", intent = "login") {
    const host = document.getElementById(hostId);
    if (!host) return;
    host.innerHTML = "";
    sessionStorage.setItem(TG_INTENT_KEY, intent);

    if (!tgBotUsername && !tgBotId) {
      host.innerHTML =
        '<p class="field-hint">Telegram вход не настроен на сервере</p>';
      return;
    }

    const origin = encodeURIComponent(window.location.origin);
    // Без ?intent= в return_to — Telegram ломает query; intent храним в sessionStorage
    const returnTo = encodeURIComponent(
      `${window.location.origin}/telegram-callback.html`
    );

    const btn = document.createElement("a");
    btn.className = "mc-btn mc-btn--ghost tg-oauth-btn";
    btn.textContent =
      intent === "register" ? "ПРИВЯЗАТЬ TELEGRAM" : "ВОЙТИ ЧЕРЕЗ TELEGRAM";

    if (tgBotId) {
      btn.href = `https://oauth.telegram.org/auth?bot_id=${tgBotId}&origin=${origin}&request_access=write&return_to=${returnTo}`;
    } else {
      // Fallback: официальный embed, если bot_id ещё не получен
      const iframe = document.createElement("iframe");
      iframe.src = `https://oauth.telegram.org/embed/${encodeURIComponent(tgBotUsername)}?origin=${origin}&size=medium&request_access=write&lang=ru`;
      iframe.width = "240";
      iframe.height = "50";
      iframe.frameBorder = "0";
      iframe.scrolling = "no";
      iframe.style.border = "none";
      iframe.style.overflow = "hidden";
      host.appendChild(iframe);
      return;
    }

    host.appendChild(btn);
  }

  function remountVisibleTelegramWidgets() {
    if (!tgBotUsername && !tgBotId) return;
    const loginForm = document.getElementById("auth-login-form");
    const regForm = document.getElementById("auth-register-form");
    const regBlock = document.getElementById("reg-tg-block");

    if (loginForm?.classList.contains("is-active") && !loginForm.hidden) {
      telegramAuthIntent = "login";
      mountTelegramWidgetIn("tg-widget-login", "medium", "login");
    }
    if (
      regForm?.classList.contains("is-active") &&
      !regForm.hidden &&
      !pendingTelegramAuth?.telegramAuth &&
      regBlock &&
      !regBlock.hidden
    ) {
      telegramAuthIntent = "register";
      mountTelegramWidgetIn("tg-widget-register", "medium", "register");
    }
  }

  async function mountTelegramWidgets() {
    try {
      const cfg = await api("/api/config");
      tgBotUsername = String(cfg.telegramBotUsername || "").replace(/^@/, "");
      tgBotId = cfg.telegramBotId ? Number(cfg.telegramBotId) : null;
      if (!cfg.telegramLoginEnabled || (!tgBotUsername && !tgBotId)) {
        document.querySelectorAll(".tg-login-block").forEach((el) => {
          el.hidden = true;
        });
        tgBotUsername = "";
        tgBotId = null;
        return;
      }
    } catch {
      document.querySelectorAll(".tg-login-block").forEach((el) => {
        el.hidden = true;
      });
      tgBotUsername = "";
      tgBotId = null;
      return;
    }

    window.onTelegramAuth = async (user) => {
      try {
        await handleTelegramAuthResult(user, telegramAuthIntent);
      } catch (err) {
        showAuthStatus(err.message || "Ошибка Telegram");
        showToast(err.message || "Ошибка Telegram");
      }
    };

    remountVisibleTelegramWidgets();
  }

  function openAuthModal(tab = "login") {
    const modal = document.getElementById("auth-modal");
    if (!modal) return;
    clearAuthFieldErrors();
    setAuthTab(tab);
    const status = document.getElementById("auth-status");
    if (status) status.hidden = true;
    updateRegisterTelegramUi();
    setLayerOpen(modal, true).then(() => {
      window.setTimeout(() => remountVisibleTelegramWidgets(), 80);
    });
  }

  function closeAuthModal() {
    const modal = document.getElementById("auth-modal");
    if (!modal) return;
    setLayerOpen(modal, false);
  }

  function setAuthTab(tab) {
    document.querySelectorAll(".auth-tab").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.authTab === tab);
    });
    const loginForm = document.getElementById("auth-login-form");
    const regForm = document.getElementById("auth-register-form");
    if (loginForm) {
      loginForm.classList.toggle("is-active", tab === "login");
      loginForm.hidden = tab !== "login";
    }
    if (regForm) {
      regForm.classList.toggle("is-active", tab === "register");
      regForm.hidden = tab !== "register";
    }
    clearAuthFieldErrors();
    const status = document.getElementById("auth-status");
    if (status) status.hidden = true;
    updateRegisterTelegramUi();
    window.setTimeout(() => remountVisibleTelegramWidgets(), 60);
  }

  async function openAdminShell() {
    const shell = document.getElementById("admin-shell");
    const statusEl = document.getElementById("admin-status-text");
    const listEl = document.getElementById("admin-users-list");
    if (!shell) return;
    await setLayerOpen(shell, true);
    if (statusEl) statusEl.textContent = "Загрузка…";
    if (listEl) listEl.innerHTML = "";
    try {
      const status = await api("/api/admin/status");
      if (statusEl) {
        statusEl.textContent = `${status.message || "Админ"} · пользователей: ${status.users ?? "—"}`;
      }
      const data = await api("/api/admin/users");
      if (listEl && Array.isArray(data.users)) {
        listEl.innerHTML = data.users
          .map(
            (u) =>
              `<li>${u.mcNick || "—"} · ${u.telegram || "—"} · ${u.accountType || "—"} · ${u.role || "user"}</li>`
          )
          .join("");
      }
    } catch (err) {
      if (statusEl) statusEl.textContent = err.message || "Ошибка админ API";
    }
  }

  function closeAdminShell() {
    setLayerOpen(document.getElementById("admin-shell"), false);
  }

  function showAuthStatus(message, ok = false) {
    const status = document.getElementById("auth-status");
    if (!status) return;
    status.hidden = !message;
    status.classList.toggle("is-ok", ok);
    status.textContent = message || "";
  }

  const AUTH_FIELD_IDS = [
    "auth-login-user",
    "auth-login-pass",
    "auth-reg-nick",
    "auth-reg-pass",
    "auth-reg-pass2",
  ];

  function setFieldError(inputId, message) {
    const input = document.getElementById(inputId);
    const err = document.getElementById(`${inputId}-error`);
    if (input) input.classList.toggle("is-invalid", Boolean(message));
    if (err) {
      err.hidden = !message;
      err.textContent = message || "";
    }
  }

  function setAccountTypeError(message) {
    const err = document.getElementById("auth-reg-account-error");
    if (err) {
      err.hidden = !message;
      err.textContent = message || "";
    }
  }

  function clearAuthFieldErrors() {
    AUTH_FIELD_IDS.forEach((id) => setFieldError(id, ""));
    const tgErr = document.getElementById("auth-reg-telegram-error");
    if (tgErr) {
      tgErr.hidden = true;
      tgErr.textContent = "";
    }
    setAccountTypeError("");
    showAuthStatus("");
  }

  function validateLoginFields(showEmpty = false) {
    const login = document.getElementById("auth-login-user")?.value.trim() || "";
    const password = document.getElementById("auth-login-pass")?.value || "";
    let ok = true;

    if (!login) {
      if (showEmpty) {
        setFieldError("auth-login-user", "Введите ник Minecraft");
        ok = false;
      } else setFieldError("auth-login-user", "");
    } else if (!AUTH_MC_NICK_RE.test(login)) {
      setFieldError("auth-login-user", "3–16 символов · латиница, цифры и _");
      ok = false;
    } else {
      setFieldError("auth-login-user", "");
    }

    if (!password) {
      if (showEmpty) {
        setFieldError("auth-login-pass", "Введите пароль");
        ok = false;
      } else setFieldError("auth-login-pass", "");
    } else {
      setFieldError("auth-login-pass", "");
    }

    return ok && Boolean(login && password && AUTH_MC_NICK_RE.test(login));
  }

  function validateRegisterFields(showEmpty = false) {
    const mcNick = document.getElementById("auth-reg-nick")?.value.trim() || "";
    const accountType =
      document.querySelector('#auth-register-form input[name="accountType"]:checked')
        ?.value || "";
    const password = document.getElementById("auth-reg-pass")?.value || "";
    const passwordConfirm = document.getElementById("auth-reg-pass2")?.value || "";
    let ok = true;
    const tgErr = document.getElementById("auth-reg-telegram-error");

    if (!pendingTelegramAuth?.telegramAuth) {
      if (showEmpty && tgErr) {
        tgErr.hidden = false;
        tgErr.textContent = "Сначала войдите через Telegram";
      }
      ok = false;
    } else if (tgErr) {
      tgErr.hidden = true;
      tgErr.textContent = "";
    }

    if (!mcNick) {
      if (showEmpty) {
        setFieldError("auth-reg-nick", "Укажите ник Minecraft");
        ok = false;
      } else setFieldError("auth-reg-nick", "");
    } else if (!AUTH_MC_NICK_RE.test(mcNick)) {
      setFieldError("auth-reg-nick", "3–16 символов · латиница, цифры и _");
      ok = false;
    } else {
      setFieldError("auth-reg-nick", "");
    }

    if (!accountType) {
      setAccountTypeError("Выберите тип аккаунта");
      ok = false;
    } else {
      setAccountTypeError("");
    }

    if (!password) {
      if (showEmpty) {
        setFieldError("auth-reg-pass", "Введите пароль");
        ok = false;
      } else setFieldError("auth-reg-pass", "");
    } else if (password.length < 6 || password.length > 72) {
      setFieldError("auth-reg-pass", "От 6 до 72 символов");
      ok = false;
    } else {
      setFieldError("auth-reg-pass", "");
    }

    if (!passwordConfirm) {
      if (showEmpty) {
        setFieldError("auth-reg-pass2", "Повторите пароль");
        ok = false;
      } else setFieldError("auth-reg-pass2", "");
    } else if (password && passwordConfirm !== password) {
      setFieldError("auth-reg-pass2", "Пароли не совпадают");
      ok = false;
    } else {
      setFieldError("auth-reg-pass2", "");
    }

    return ok;
  }

  function applyServerFieldError(field, message) {
    if (field === "telegram") {
      const err = document.getElementById("auth-reg-telegram-error");
      if (err) {
        err.hidden = !message;
        err.textContent = message || "";
      } else showAuthStatus(message);
      return;
    }
    const map = {
      mcNick: "auth-reg-nick",
      mc_nick: "auth-reg-nick",
      password: "auth-reg-pass",
      passwordConfirm: "auth-reg-pass2",
      login: "auth-login-user",
      username: "auth-login-user",
    };
    if (field === "accountType") {
      setAccountTypeError(message);
      return;
    }
    const id = map[field];
    if (id) setFieldError(id, message);
    else showAuthStatus(message);
  }

  document.getElementById("gate-login-btn")?.addEventListener("click", () => {
    openAuthModal("login");
  });
  document.getElementById("gate-register-btn")?.addEventListener("click", () => {
    openAuthModal("register");
  });
  document.getElementById("auth-modal-close")?.addEventListener("click", closeAuthModal);

  function setHubFieldError(id, message) {
    const el = document.getElementById(id);
    if (!el) return;
    if (!message) {
      el.hidden = true;
      el.textContent = "";
      return;
    }
    el.hidden = false;
    el.textContent = message;
  }

  function closeHubMenus() {
    const avatarMenu = document.getElementById("hub-avatar-menu");
    const privacyMenu = document.getElementById("hub-privacy-menu");
    if (avatarMenu) avatarMenu.hidden = true;
    if (privacyMenu) privacyMenu.hidden = true;
  }

  function openHubMenu(id) {
    closeHubMenus();
    const menu = document.getElementById(id);
    if (menu) menu.hidden = false;
  }

  document.getElementById("hub-avatar-edit-btn")?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const menu = document.getElementById("hub-avatar-menu");
    if (!menu) return;
    if (menu.hidden) openHubMenu("hub-avatar-menu");
    else menu.hidden = true;
  });

  document.getElementById("profile-frame")?.addEventListener("click", (e) => {
    if (e.target.closest("#hub-avatar-edit-btn") || e.target.closest(".ctx-menu")) return;
    e.preventDefault();
    e.stopPropagation();
    syncPrivacyMarks();
    const menu = document.getElementById("hub-privacy-menu");
    if (!menu) return;
    if (menu.hidden) openHubMenu("hub-privacy-menu");
    else menu.hidden = true;
  });

  document.addEventListener("click", () => closeHubMenus());
  document.getElementById("hub-avatar-menu")?.addEventListener("click", (e) => e.stopPropagation());
  document.getElementById("hub-privacy-menu")?.addEventListener("click", (e) => e.stopPropagation());

  document.getElementById("hub-avatar-upload-btn")?.addEventListener("click", () => {
    closeHubMenus();
    document.getElementById("hub-avatar-file")?.click();
  });

  document.getElementById("hub-avatar-file")?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!/^image\/(png|jpeg|jpg|webp|gif)$/i.test(file.type)) {
      showToast("Нужен файл PNG/JPEG/WebP/GIF");
      return;
    }
    if (file.size > 2.5 * 1024 * 1024) {
      showToast("Файл слишком большой (до 2.5 МБ)");
      return;
    }
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
        reader.readAsDataURL(file);
      });
      pendingAvatarDataUrl = dataUrl;
      pendingAvatarReset = false;
      applyAuthUi({ syncHubFields: false });
      showToast("Аватар выбран — нажми Сохранить");
    } catch (err) {
      showToast(err.message || "Не удалось прочитать файл");
    }
  });

  document.getElementById("hub-avatar-reset-btn")?.addEventListener("click", async () => {
    closeHubMenus();
    pendingAvatarDataUrl = null;
    pendingAvatarReset = true;
    if (authUser) authUser = { ...authUser, avatarUrl: "" };
    applyAuthUi({ syncHubFields: false });
    showToast("Аватар будет сброшен после Сохранить");
  });

  document.querySelectorAll("#hub-privacy-menu [data-privacy]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const key = btn.getAttribute("data-privacy");
      if (!key || !authUser) return;
      const current = authUser[key] !== false;
      const next = !current;
      try {
        const data = await api("/api/user/privacy", {
          method: "PATCH",
          body: JSON.stringify({ [key]: next }),
        });
        const prevAvatar = authUser.avatarUrl || "";
        if (data.user) {
          authUser = {
            ...authUser,
            ...data.user,
            avatarUrl: data.user.avatarUrl || prevAvatar,
          };
        } else {
          authUser = { ...authUser, [key]: next };
        }
        persistAuthUser(authUser);
        const id = Number(authUser.id);
        const idx = directoryUsers.findIndex((u) => Number(u.id) === id);
        if (idx >= 0) {
          directoryUsers[idx] = {
            ...directoryUsers[idx],
            ...authUser,
            avatarUrl: authUser.avatarUrl || directoryUsers[idx].avatarUrl || "",
          };
        }
        applyAuthUi({ syncHubFields: false });
        renderPlayersDirectory();
      } catch (err) {
        showToast(err.message || "Не удалось сохранить");
      }
    });
  });

  document.getElementById("hub-save-btn")?.addEventListener("click", async () => {
    setHubFieldError("hub-site-nick-error", "");
    setHubFieldError("hub-mc-nick-error", "");
    const siteNick = String(document.getElementById("hub-site-nick")?.value || "").trim();
    const mcNick = String(document.getElementById("hub-mc-nick")?.value || "").trim();
    if (mcNick && !/^[A-Za-z0-9_]{3,16}$/.test(mcNick)) {
      setHubFieldError("hub-mc-nick-error", "Ник: 3–16 символов, латиница, цифры и _");
      return;
    }
    const saveBtn = document.getElementById("hub-save-btn");
    if (saveBtn) saveBtn.disabled = true;
    try {
      // Аватар — отдельным запросом (надёжнее лимитов nginx на тело), потом ники
      if (pendingAvatarReset) {
        const avatarData = await api("/api/user/avatar/reset", {
          method: "POST",
          body: "{}",
        });
        if (avatarData.user) authUser = { ...authUser, ...avatarData.user };
        else if (authUser) authUser.avatarUrl = avatarData.avatarUrl || "";
        pendingAvatarReset = false;
        pendingAvatarDataUrl = null;
      } else if (pendingAvatarDataUrl) {
        const avatarData = await api("/api/user/avatar/upload", {
          method: "POST",
          body: JSON.stringify({ image: pendingAvatarDataUrl }),
        });
        if (avatarData.user) authUser = { ...authUser, ...avatarData.user };
        else if (avatarData.avatarUrl && authUser) {
          authUser.avatarUrl = avatarData.avatarUrl;
        }
        pendingAvatarDataUrl = null;
        pendingAvatarReset = false;
      }

      const data = await api("/api/user/save", {
        method: "POST",
        body: JSON.stringify({ siteNick, mcNick }),
      });
      const merged = {
        ...(authUser || {}),
        ...(data.user || {}),
      };
      if (!merged.avatarUrl && authUser?.avatarUrl) {
        merged.avatarUrl = authUser.avatarUrl;
      }
      if (data.token) setAuthSession(data.token, merged);
      else authUser = merged;
      applyAuthUi({ syncHubFields: true });
      showToast("Сохранено");
    } catch (err) {
      const field = err.data?.field;
      if (field === "mcNick") {
        setHubFieldError("hub-mc-nick-error", err.message || "Ошибка ника");
      } else {
        setHubFieldError(
          "hub-site-nick-error",
          err.message || "Не удалось сохранить"
        );
      }
      applyAuthUi({ syncHubFields: false });
    } finally {
      if (saveBtn) saveBtn.disabled = false;
    }
  });

  document.getElementById("hub-site-nick-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    document.getElementById("hub-save-btn")?.click();
  });
  document.getElementById("hub-site-nick")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      document.getElementById("hub-save-btn")?.click();
    }
  });

  document.getElementById("hub-mc-nick-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    document.getElementById("hub-save-btn")?.click();
  });
  document.getElementById("hub-mc-nick")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      document.getElementById("hub-save-btn")?.click();
    }
  });

  document.getElementById("hub-pass-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    setHubFieldError("hub-pass-error", "");
    const newPassword = String(document.getElementById("hub-pass-new")?.value || "");
    const newPasswordConfirm = String(
      document.getElementById("hub-pass-confirm")?.value || ""
    );
    if (newPassword.length < 6 || newPassword.length > 72) {
      setHubFieldError("hub-pass-error", "Новый пароль: 6–72 символа");
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setHubFieldError("hub-pass-error", "Пароли не совпадают");
      return;
    }
    try {
      const data = await api("/api/user/password", {
        method: "PATCH",
        body: JSON.stringify({
          newPassword,
          newPasswordConfirm,
        }),
      });
      const form = document.getElementById("hub-pass-form");
      if (form) form.reset();
      if (serverInfo) {
        serverInfo.accountPassword = data.accountPassword || newPassword;
        serverInfo.hasAccountPassword = true;
        serverInfo.hasPasswordHash = true;
        const passEl = document.getElementById("server-password");
        if (passEl) passEl.setAttribute("data-visible", "0");
        renderServerTab();
      }
      showToast("Пароль изменён");
    } catch (err) {
      setHubFieldError("hub-pass-error", err.message || "Не удалось сменить пароль");
    }
  });

  const HUB_RACE_FIELDS = [
    ["hub-race-name", "raceName"],
    ["hub-race-origin", "origin"],
    ["hub-race-abilities", "abilities"],
    ["hub-race-traits", "traits"],
    ["hub-race-useful", "useful"],
    ["hub-race-mechanics", "mechanics"],
  ];

  function fillHubRaceFields() {
    const form =
      profileCache?.form && typeof profileCache.form === "object"
        ? profileCache.form
        : {};
    HUB_RACE_FIELDS.forEach(([elId, key]) => {
      const el = document.getElementById(elId);
      if (el) el.value = String(form[key] || "");
    });
    setHubFieldError("hub-race-error", "");
  }

  function readHubRaceForm() {
    const form = {};
    HUB_RACE_FIELDS.forEach(([elId, key]) => {
      form[key] = String(document.getElementById(elId)?.value || "")
        .replace(/\r\n/g, "\n")
        .trim();
    });
    form.nick = String(authUser?.mcNick || profileCache?.form?.nick || "").trim();
    return form;
  }

  document.getElementById("hub-race-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    setHubFieldError("hub-race-error", "");
    const form = readHubRaceForm();
    const required = ["raceName", "origin", "abilities", "useful"];
    const missing = required.find((key) => !form[key]);
    if (missing) {
      setHubFieldError("hub-race-error", "Заполни обязательные поля расы");
      return;
    }
    const saveBtn = document.getElementById("hub-race-save-btn");
    if (saveBtn) saveBtn.disabled = true;
    try {
      await api("/api/user/profile", {
        method: "PUT",
        body: JSON.stringify({
          form,
          registered: true,
        }),
      });
      profileCache = {
        ...profileCache,
        registered: true,
        form: { ...(profileCache.form || {}), ...form },
      };
      writeLocalStorageFallback(profileCache);
      showToast("Раса сохранена");
    } catch (err) {
      setHubFieldError("hub-race-error", err.message || "Не удалось сохранить");
    } finally {
      if (saveBtn) saveBtn.disabled = false;
    }
  });

  /* ---------- Staff panel (controller + console) ---------- */
  const PANEL_HISTORY_KEY = "genesis_panel_console_history";
  const PANEL_SITE_COMMANDS = [
    {
      name: "permission",
      usage: "permission <ник> admin|helper|remove",
      hint: "Права панели (только админ)",
      adminOnly: true,
    },
    {
      name: "ban",
      usage: "ban <ник> <число> second|minute|hour|day",
      hint: "Бан на сайте (+ задел на игру)",
    },
    {
      name: "unban",
      usage: "unban <ник>",
      hint: "Снять бан",
    },
    {
      name: "password",
      usage: "password <ник> unset | <пароль> <повтор>",
      hint: "Сменить/сбросить пароль (только админ)",
      adminOnly: true,
    },
    {
      name: "password_show",
      usage: "password_show [ник]",
      hint: "Показать пароли (только админ)",
      adminOnly: true,
    },
    {
      name: "clear",
      usage: "clear",
      hint: "Очистить историю консоли",
      localOnly: true,
    },
  ];
  let consoleSuggestIndex = -1;

  function canUseAdminCmd() {
    return Boolean(
      authUser?.role === "founder" ||
        authUser?.role === "admin" ||
        authUser?.isFounder
    );
  }

  function canUsePermissionCmd() {
    return canUseAdminCmd();
  }

  function readConsoleHistory() {
    try {
      const raw = localStorage.getItem(PANEL_HISTORY_KEY);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list.slice(-200) : [];
    } catch {
      return [];
    }
  }

  function writeConsoleHistory(list) {
    try {
      localStorage.setItem(PANEL_HISTORY_KEY, JSON.stringify(list.slice(-200)));
    } catch {
      /* ignore */
    }
  }

  function renderConsoleHistory() {
    const host = document.getElementById("panel-console-history");
    if (!host) return;
    const list = readConsoleHistory();
    host.innerHTML = list
      .map((item) => {
        const cls =
          item.type === "err"
            ? "console-history__line--err"
            : item.type === "ok"
              ? "console-history__line--ok"
              : item.type === "cmd"
                ? "console-history__line--cmd"
                : "";
        return `<p class="console-history__line ${cls}">${escapeHtml(item.text)}</p>`;
      })
      .join("");
    host.scrollTop = host.scrollHeight;
  }

  function pushConsoleHistory(type, text) {
    const list = readConsoleHistory();
    list.push({ type, text: String(text || ""), at: Date.now() });
    writeConsoleHistory(list);
    renderConsoleHistory();
  }

  function availableSiteCommands() {
    return PANEL_SITE_COMMANDS.filter((cmd) => !cmd.adminOnly || canUsePermissionCmd());
  }

  function getConsoleSuggestions(value) {
    const raw = String(value || "");
    if (!raw.trim() || raw.trimStart().startsWith("/")) return [];
    const parts = raw.trimStart().split(/\s+/);
    const head = String(parts[0] || "").toLowerCase();
    const cmds = availableSiteCommands();
    if (parts.length <= 1) {
      return cmds.filter(
        (cmd) => cmd.name.startsWith(head) || cmd.usage.startsWith(head)
      );
    }
    const cmd = cmds.find((c) => c.name === head);
    if (!cmd) return [];
    if (head === "permission" && parts.length === 2) {
      return ["admin", "helper", "remove"].map((action) => ({
        name: action,
        usage: `permission ${parts[1]} ${action}`,
        hint: action,
        insert: `permission ${parts[1]} ${action}`,
      }));
    }
    if (head === "permission" && parts.length >= 3) {
      return ["admin", "helper", "remove"]
        .filter((a) => a.startsWith(String(parts[2] || "").toLowerCase()))
        .map((action) => ({
          name: action,
          usage: `permission ${parts[1]} ${action}`,
          hint: action,
          insert: `permission ${parts[1]} ${action}`,
        }));
    }
    if (head === "password" && parts.length === 2) {
      return [
        {
          name: "unset",
          usage: `password ${parts[1]} unset`,
          hint: "Сбросить пароль",
          insert: `password ${parts[1]} unset`,
        },
        {
          name: "set",
          usage: `password ${parts[1]} <пароль> <повтор>`,
          hint: "Задать пароль",
          insert: `password ${parts[1]} `,
        },
      ];
    }
    if (head === "ban" && parts.length >= 4) {
      return ["second", "minute", "hour", "day"]
        .filter((u) => u.startsWith(String(parts[3] || "").toLowerCase()))
        .map((unit) => ({
          name: unit,
          usage: `ban ${parts[1]} ${parts[2]} ${unit}`,
          hint: unit,
          insert: `ban ${parts[1]} ${parts[2]} ${unit}`,
        }));
    }
    return [{ ...cmd, insert: cmd.usage.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim() }];
  }

  function hideConsoleSuggest() {
    const box = document.getElementById("panel-console-suggest");
    if (box) {
      box.hidden = true;
      box.innerHTML = "";
    }
    consoleSuggestIndex = -1;
  }

  function renderConsoleSuggest(value) {
    const box = document.getElementById("panel-console-suggest");
    if (!box) return;
    const items = getConsoleSuggestions(value);
    if (!items.length) {
      hideConsoleSuggest();
      return;
    }
    box.hidden = false;
    box.innerHTML = items
      .map((item, idx) => {
        const title = escapeHtml(item.usage || item.name);
        const hint = item.hint ? `<span class="console-suggest__hint">${escapeHtml(item.hint)}</span>` : "";
        return `<button type="button" class="console-suggest__item${idx === consoleSuggestIndex ? " is-active" : ""}" data-suggest-idx="${idx}">${title}${hint}</button>`;
      })
      .join("");
    box.querySelectorAll(".console-suggest__item").forEach((btn) => {
      btn.addEventListener("mousedown", (e) => {
        e.preventDefault();
        const idx = Number(btn.getAttribute("data-suggest-idx"));
        applyConsoleSuggestion(items[idx]);
      });
    });
  }

  function applyConsoleSuggestion(item) {
    const input = document.getElementById("panel-console-input");
    if (!input || !item) return;
    const insert =
      item.insert ||
      item.name ||
      String(item.usage || "").replace(/<[^>]+>/g, "").trim();
    input.value = insert.endsWith(" ") ? insert : `${insert} `;
    input.focus();
    hideConsoleSuggest();
    renderConsoleSuggest(input.value);
  }

  async function runPanelCommand(line, opts = {}) {
    const text = String(line || "").trim();
    if (!text) return null;
    const head = String(text.split(/\s+/)[0] || "").toLowerCase();
    if (head === "clear") {
      writeConsoleHistory([]);
      renderConsoleHistory();
      if (opts.toast !== false) showToast("История очищена");
      return { ok: true, message: "cleared" };
    }
    if (opts.log !== false) pushConsoleHistory("cmd", `> ${text}`);
    try {
      const data = await api("/api/panel/command", {
        method: "POST",
        body: JSON.stringify({ line: text }),
      });
      const msg = data.message || "OK";
      if (opts.log !== false) pushConsoleHistory("ok", msg);
      if (opts.toast !== false) showToast(msg);
      if (data.user) {
        const id = Number(data.user.id);
        const idx = directoryUsers.findIndex((u) => Number(u.id) === id);
        if (idx >= 0) {
          directoryUsers[idx] = {
            ...directoryUsers[idx],
            ...data.user,
            avatarUrl: data.user.avatarUrl || directoryUsers[idx].avatarUrl || "",
          };
        }
        if (Number(authUser?.id) === id) {
          authUser = {
            ...authUser,
            ...data.user,
            avatarUrl: data.user.avatarUrl || authUser.avatarUrl || "",
          };
          applyAuthUi({ syncHubFields: false });
        }
        renderPlayersDirectory();
      }
      return data;
    } catch (err) {
      if (opts.log !== false) pushConsoleHistory("err", err.message || "Ошибка");
      throw err;
    }
  }

  document.querySelectorAll(".hub-nav__btn[data-hub-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.getAttribute("data-hub-tab");
      setHubTab(tab);
      setSettingsDrawerOpen(true);
    });
  });

  document.getElementById("profile-avatar-btn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleSettingsDrawer();
  });

  document.getElementById("settings-drawer-close")?.addEventListener("click", () => {
    setSettingsDrawerOpen(false);
  });

  document.getElementById("settings-close-tab")?.addEventListener("click", () => {
    setSettingsDrawerOpen(false);
  });

  document.getElementById("user-profile-close")?.addEventListener("click", () => {
    setUserProfileDrawerOpen(false);
  });

  document.getElementById("user-profile-close-tab")?.addEventListener("click", () => {
    setUserProfileDrawerOpen(false);
  });

  function mergeDirectoryUser(user) {
    if (!user || !Number.isFinite(Number(user.id))) return;
    const id = Number(user.id);
    const idx = directoryUsers.findIndex((u) => Number(u.id) === id);
    if (idx >= 0) {
      directoryUsers[idx] = {
        ...directoryUsers[idx],
        ...user,
        avatarUrl: user.avatarUrl || directoryUsers[idx].avatarUrl || "",
        race: user.race || directoryUsers[idx].race,
        raceName: user.raceName || user.race?.raceName || directoryUsers[idx].raceName || "",
      };
    } else {
      directoryUsers.push(user);
    }
    if (profileViewUser && Number(profileViewUser.id) === id) {
      profileViewUser = { ...profileViewUser, ...directoryUsers[idx >= 0 ? idx : directoryUsers.length - 1] };
    }
    renderPlayersDirectory();
  }

  document.getElementById("user-profile-avatar")?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canFounderEditUser(profileViewUser)) return;
    const edit = document.getElementById("user-profile-race-edit");
    const menu = document.getElementById("user-profile-avatar-menu");
    const next = Boolean(edit?.hidden);
    setUserProfileEditMode(next);
    if (menu) menu.hidden = !next;
  });

  document.getElementById("user-profile-avatar-upload")?.addEventListener("click", (e) => {
    e.stopPropagation();
    document.getElementById("user-profile-avatar-file")?.click();
  });

  document.getElementById("user-profile-avatar-file")?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !canFounderEditUser(profileViewUser)) return;
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
        reader.readAsDataURL(file);
      });
      const data = await api(`/api/users/${Number(profileViewUser.id)}/avatar/upload`, {
        method: "POST",
        body: JSON.stringify({ image: dataUrl }),
      });
      if (data.user) {
        mergeDirectoryUser(data.user);
        fillProfileAvatar(
          document.getElementById("user-profile-avatar"),
          data.user,
          presenceClass(data.user)
        );
      }
      showToast("Аватар обновлён");
    } catch (err) {
      showToast(err.message || "Не удалось загрузить аватар");
    }
  });

  document.getElementById("user-profile-avatar-reset")?.addEventListener("click", async (e) => {
    e.stopPropagation();
    if (!canFounderEditUser(profileViewUser)) return;
    try {
      const data = await api(`/api/users/${Number(profileViewUser.id)}/avatar/reset`, {
        method: "POST",
        body: "{}",
      });
      if (data.user) {
        mergeDirectoryUser(data.user);
        fillProfileAvatar(
          document.getElementById("user-profile-avatar"),
          data.user,
          presenceClass(data.user)
        );
      }
      showToast("Аватар сброшен");
    } catch (err) {
      showToast(err.message || "Не удалось сбросить аватар");
    }
  });

  document.getElementById("user-profile-race-edit")?.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!canFounderEditUser(profileViewUser)) return;
    clearTimeout(founderEditSaveTimer);
    applyFounderEditLiveUi();
    persistFounderProfileEdit();
  });

  document.getElementById("user-profile-race-edit")?.addEventListener("input", () => {
    if (!canFounderEditUser(profileViewUser)) return;
    scheduleFounderProfileSave();
  });

  document.getElementById("user-profile-avatar-menu")?.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  document.addEventListener("click", () => {
    const menu = document.getElementById("user-profile-avatar-menu");
    if (menu) menu.hidden = true;
  });

  document.getElementById("staff-panel-close")?.addEventListener("click", () => {
    setStaffPanelOpen(false);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "F2") {
      e.preventDefault();
      if (!authToken) return;
      toggleStaffPanel({ notify: true });
      return;
    }
    if (e.key !== "Escape") return;
    setStaffPanelOpen(false);
    setSettingsDrawerOpen(false);
    setUserProfileDrawerOpen(false);
    hidePresenceMini();
  });

  let lastTwoFingerTapAt = 0;
  document.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length !== 2) return;
      if (!authToken) return;
      const now = Date.now();
      if (now - lastTwoFingerTapAt > 0 && now - lastTwoFingerTapAt < 420) {
        lastTwoFingerTapAt = 0;
        e.preventDefault();
        toggleStaffPanel();
      } else {
        lastTwoFingerTapAt = now;
      }
    },
    { passive: false }
  );

  window.matchMedia("(min-width: 721px)").addEventListener("change", () => {
    setSettingsDrawerOpen(false);
    setUserProfileDrawerOpen(false);
    setStaffPanelOpen(false);
    hidePresenceMini();
  });

  document.querySelectorAll(".panel-subnav__btn[data-panel-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setPanelTab(btn.getAttribute("data-panel-tab"));
      if (btn.getAttribute("data-panel-tab") === "console") {
        renderConsoleHistory();
        document.getElementById("panel-console-input")?.focus();
      }
    });
  });

  document.getElementById("panel-console-input")?.addEventListener("input", (e) => {
    consoleSuggestIndex = -1;
    renderConsoleSuggest(e.target.value);
  });

  document.getElementById("panel-console-input")?.addEventListener("keydown", async (e) => {
    const box = document.getElementById("panel-console-suggest");
    const items = box && !box.hidden ? [...box.querySelectorAll(".console-suggest__item")] : [];
    if (e.key === "ArrowDown" && items.length) {
      e.preventDefault();
      consoleSuggestIndex = (consoleSuggestIndex + 1) % items.length;
      items.forEach((el, i) => el.classList.toggle("is-active", i === consoleSuggestIndex));
      return;
    }
    if (e.key === "ArrowUp" && items.length) {
      e.preventDefault();
      consoleSuggestIndex = (consoleSuggestIndex - 1 + items.length) % items.length;
      items.forEach((el, i) => el.classList.toggle("is-active", i === consoleSuggestIndex));
      return;
    }
    if (e.key === "Tab" && items.length) {
      e.preventDefault();
      const idx = consoleSuggestIndex >= 0 ? consoleSuggestIndex : 0;
      items[idx]?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      return;
    }
    if (e.key === "Escape") {
      hideConsoleSuggest();
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      hideConsoleSuggest();
      const input = e.currentTarget;
      const line = String(input.value || "").trim();
      if (!line) return;
      input.value = "";
      try {
        await runPanelCommand(line);
      } catch (err) {
        showToast(err.message || "Ошибка команды");
      }
    }
  });

  document.getElementById("panel-console-run")?.addEventListener("click", async () => {
    const input = document.getElementById("panel-console-input");
    const line = String(input?.value || "").trim();
    if (!line) return;
    if (input) input.value = "";
    hideConsoleSuggest();
    try {
      await runPanelCommand(line);
    } catch (err) {
      showToast(err.message || "Ошибка команды");
    }
  });

  document.getElementById("panel-perm-btn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    const menu = document.getElementById("panel-perm-menu");
    if (!menu) return;
    menu.hidden = !menu.hidden;
  });

  document.querySelectorAll("#panel-perm-menu [data-perm-action]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const action = btn.getAttribute("data-perm-action");
      const nick = String(document.getElementById("panel-perm-nick")?.value || "").trim();
      const errEl = document.getElementById("panel-controller-error");
      const statusEl = document.getElementById("panel-controller-status");
      if (errEl) {
        errEl.hidden = true;
        errEl.textContent = "";
      }
      if (!nick) {
        if (errEl) {
          errEl.hidden = false;
          errEl.textContent = "Укажи ник";
        }
        return;
      }
      document.getElementById("panel-perm-menu").hidden = true;
      try {
        const data = await runPanelCommand(`permission ${nick} ${action}`, {
          toast: true,
        });
        if (statusEl) {
          statusEl.hidden = false;
          statusEl.textContent = data?.message || "Готово";
        }
      } catch (err) {
        if (errEl) {
          errEl.hidden = false;
          errEl.textContent = err.message || "Ошибка";
        }
      }
    });
  });

  document.getElementById("panel-ban-btn")?.addEventListener("click", async () => {
    const nick = String(document.getElementById("panel-ban-nick")?.value || "").trim();
    const amount = String(document.getElementById("panel-ban-amount")?.value || "").trim();
    const unit = String(document.getElementById("panel-ban-unit")?.value || "minute");
    const errEl = document.getElementById("panel-controller-error");
    const statusEl = document.getElementById("panel-controller-status");
    if (errEl) {
      errEl.hidden = true;
      errEl.textContent = "";
    }
    if (!nick || !amount) {
      if (errEl) {
        errEl.hidden = false;
        errEl.textContent = "Укажи ник и срок";
      }
      return;
    }
    try {
      const data = await runPanelCommand(`ban ${nick} ${amount} ${unit}`);
      if (statusEl) {
        statusEl.hidden = false;
        statusEl.textContent = data?.message || "Готово";
      }
    } catch (err) {
      if (errEl) {
        errEl.hidden = false;
        errEl.textContent = err.message || "Ошибка";
      }
    }
  });

  document.getElementById("panel-unban-btn")?.addEventListener("click", async () => {
    const nick = String(document.getElementById("panel-unban-nick")?.value || "").trim();
    const errEl = document.getElementById("panel-controller-error");
    const statusEl = document.getElementById("panel-controller-status");
    if (errEl) {
      errEl.hidden = true;
      errEl.textContent = "";
    }
    if (!nick) {
      if (errEl) {
        errEl.hidden = false;
        errEl.textContent = "Укажи ник";
      }
      return;
    }
    try {
      const data = await runPanelCommand(`unban ${nick}`);
      if (statusEl) {
        statusEl.hidden = false;
        statusEl.textContent = data?.message || "Готово";
      }
    } catch (err) {
      if (errEl) {
        errEl.hidden = false;
        errEl.textContent = err.message || "Ошибка";
      }
    }
  });

  async function runControllerPassword(line) {
    const errEl = document.getElementById("panel-controller-error");
    const statusEl = document.getElementById("panel-controller-status");
    if (errEl) {
      errEl.hidden = true;
      errEl.textContent = "";
    }
    try {
      const data = await runPanelCommand(line);
      if (statusEl) {
        statusEl.hidden = false;
        statusEl.textContent = data?.message || "Готово";
      }
    } catch (err) {
      if (errEl) {
        errEl.hidden = false;
        errEl.textContent = err.message || "Ошибка";
      }
    }
  }

  document.getElementById("panel-password-set-btn")?.addEventListener("click", async () => {
    const nick = String(document.getElementById("panel-password-nick")?.value || "").trim();
    const pass = String(document.getElementById("panel-password-new")?.value || "");
    const confirm = String(document.getElementById("panel-password-confirm")?.value || "");
    const errEl = document.getElementById("panel-controller-error");
    if (!nick || !pass) {
      if (errEl) {
        errEl.hidden = false;
        errEl.textContent = "Укажи ник и пароль";
      }
      return;
    }
    await runControllerPassword(`password ${nick} ${pass} ${confirm}`);
  });

  document.getElementById("panel-password-unset-btn")?.addEventListener("click", async () => {
    const nick = String(document.getElementById("panel-password-nick")?.value || "").trim();
    const errEl = document.getElementById("panel-controller-error");
    if (!nick) {
      if (errEl) {
        errEl.hidden = false;
        errEl.textContent = "Укажи ник";
      }
      return;
    }
    await runControllerPassword(`password ${nick} unset`);
  });

  document.getElementById("panel-password-show-btn")?.addEventListener("click", async () => {
    const nick = String(document.getElementById("panel-password-show-nick")?.value || "").trim();
    await runControllerPassword(nick ? `password_show ${nick}` : "password_show");
  });

  document.addEventListener("click", (e) => {
    if (e.target.closest("#panel-perm-btn") || e.target.closest("#panel-perm-menu")) return;
    const menu = document.getElementById("panel-perm-menu");
    if (menu) menu.hidden = true;
    if (!e.target.closest(".console-input-row")) hideConsoleSuggest();
  });

  renderConsoleHistory();

  document.getElementById("auth-logout-btn")?.addEventListener("click", () => {
    clearAuthSession();
    applyAuthUi();
    showToast("Вы вышли");
  });
  document.querySelectorAll(".auth-tab").forEach((btn) => {
    btn.addEventListener("click", () => setAuthTab(btn.dataset.authTab));
  });
  document.querySelectorAll("[data-toggle-pass]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-toggle-pass");
      const input = document.getElementById(id);
      if (!input) return;
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.textContent = show ? "×" : "*";
      btn.setAttribute("aria-label", show ? "Скрыть пароль" : "Показать пароль");
    });
  });

  ["auth-login-user", "auth-login-pass"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", () => {
      validateLoginFields(false);
      showAuthStatus("");
    });
  });
  ["auth-reg-nick", "auth-reg-pass", "auth-reg-pass2"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", () => {
      validateRegisterFields(false);
      showAuthStatus("");
    });
  });
  document
    .querySelectorAll('#auth-register-form input[name="accountType"]')
    .forEach((el) => {
      el.addEventListener("change", () => validateRegisterFields(false));
    });

  document.getElementById("auth-login-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    showAuthStatus("");
    if (!validateLoginFields(true)) return;
    const login = document.getElementById("auth-login-user")?.value.trim() || "";
    const password = document.getElementById("auth-login-pass")?.value || "";
    try {
      const data = await api("/api/login", {
        method: "POST",
        body: JSON.stringify({ login, password }),
      });
      setAuthSession(data.token, data.user);
      await loadProfileFromServer();
      closeAuthModal();
      applyAuthUi();
      showToast("Вход выполнен");
    } catch (err) {
      const msg = err.message || "Ошибка входа";
      if (err.data?.field) applyServerFieldError(err.data.field, msg);
      else {
        setFieldError("auth-login-user", msg);
        setFieldError("auth-login-pass", msg);
      }
      showAuthStatus(msg);
    }
  });

  document.getElementById("auth-register-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    showAuthStatus("");
    if (!validateRegisterFields(true)) return;
    const mcNick = document.getElementById("auth-reg-nick")?.value.trim() || "";
    const accountType =
      document.querySelector('#auth-register-form input[name="accountType"]:checked')
        ?.value || "";
    const password = document.getElementById("auth-reg-pass")?.value || "";
    const passwordConfirm = document.getElementById("auth-reg-pass2")?.value || "";
    try {
      const data = await api("/api/register", {
        method: "POST",
        body: JSON.stringify({
          telegramAuth: pendingTelegramAuth.telegramAuth,
          mcNick,
          accountType,
          password,
          passwordConfirm,
        }),
      });
      writePendingTelegram(null);
      setAuthSession(data.token, data.user);
      await loadProfileFromServer();
      closeAuthModal();
      applyAuthUi();
      showToast("Аккаунт создан");
    } catch (err) {
      const msg = err.message || "Ошибка регистрации";
      if (err.data?.field) applyServerFieldError(err.data.field, msg);
      showAuthStatus(msg);
    }
  });

  pendingTelegramAuth = readPendingTelegram();
  connectSocket();
  updateAuthChrome();
  updateRegisterTelegramUi();
  profileCache = readLocalStorageFallback();

  (async () => {
    await mountTelegramWidgets();
    if (authToken) return;
    const params = new URLSearchParams(window.location.search);
    const wantRegister =
      params.get("register") === "1" || Boolean(pendingTelegramAuth?.telegramAuth);
    const wantLogin = params.get("login") === "1";
    const tgOk = params.get("tg") === "ok";
    const tgExists = params.get("tg") === "exists";
    const needReg = params.get("needreg") === "1";

    if (wantRegister) {
      openAuthModal("register");
      updateRegisterTelegramUi();
      if (tgOk || pendingTelegramAuth?.telegramAuth) {
        showAuthStatus(
          pendingTelegramAuth?.telegram
            ? `Данные Telegram получены: ${pendingTelegramAuth.telegram}`
            : "Данные Telegram получены",
          true
        );
        showToast("Данные Telegram получены");
      }
      if (needReg) {
        showToast("Сначала зарегистрируйте аккаунт");
      }
    } else if (wantLogin) {
      openAuthModal("login");
      if (tgExists) {
        showAuthStatus("Этот Telegram уже зарегистрирован — войдите", true);
        showToast("Войдите в существующий аккаунт");
      }
    }

    if (
      params.has("register") ||
      params.has("login") ||
      params.has("needreg") ||
      params.has("tg")
    ) {
      window.history.replaceState({}, "", "/");
    }
  })();

  const panels = document.getElementById("panels");
  const stageEl = document.querySelector(".stage");
  const hero = document.getElementById("hero");
  const survey = document.getElementById("survey");
  const submitFlow = document.getElementById("submit-flow");
  const catalog = document.getElementById("catalog");
  const catalogInner = document.getElementById("catalog-inner");
  const contentFlow = document.getElementById("content-flow");
  const rules = document.getElementById("rules");
  const rulesBody = document.getElementById("rules-body");
  const rulesToc = document.getElementById("rules-toc");
  const serverView = document.getElementById("server");
  const serverIpBtn = document.getElementById("server-ip-btn");
  const startBtn = document.getElementById("start-btn");
  const nick = document.getElementById("nick");
  const nickError = document.getElementById("nick-error");
  const formStatus = document.getElementById("form-status");
  const submitProgress = document.getElementById("submit-progress");
  const submitNav = document.getElementById("submit-nav");
  const stepBack = document.getElementById("step-back");
  const stepNext = document.getElementById("step-next");
  const downloadZipBtn = document.getElementById("download-zip-btn");
  const sendTelegramBtn = document.getElementById("send-telegram-btn");
  const sendGmailBtn = document.getElementById("send-gmail-btn");
  const submitCloseBtn = document.getElementById("submit-close");
  const toast = document.getElementById("toast");
  const navRegister = document.getElementById("nav-register");
  const navCatalog = document.getElementById("nav-catalog");
  const NICK_RE = /^[A-Za-z0-9_]{3,16}$/;
  const TOTAL_STEPS = 4;
  let currentStep = 0;
  let toastTimer = 0;

  const CATALOG_MODES = [
    {
      title: "Добавить новый контент",
      mode: "new",
      prefix: "NEW*",
      color: "#4ade80",
    },
    {
      title: "Обновление существующего контента",
      mode: "update",
      prefix: "Update*",
      color: "#38bdf8",
    },
    {
      title: "Сообщить об ошибке в контенте",
      mode: "report",
      prefix: "Report*",
      color: "#fb7185",
    },
  ];

  let catalogMode = "new";

  const CATALOG_TYPES = [
    { id: "mechanic", label: "Механика", icon: "assets/icons/mechanics.png" },
    { id: "item", label: "Предмет", icon: "assets/icons/item.png" },
    { id: "block", label: "Блок", icon: "assets/icons/block.png" },
    { id: "recipe", label: "Рецепт", icon: "assets/icons/recipe.png" },
    { id: "structure", label: "Структура", icon: "assets/icons/structure.png" },
    { id: "biome", label: "Биом", icon: "assets/icons/biome.png" },
    { id: "dimension", label: "Измерение", icon: "assets/icons/dimension.png" },
    { id: "entity", label: "Сущность / Моб", icon: "assets/icons/entity.png" },
    { id: "effect", label: "Эффект", icon: "assets/icons/effect.png" },
    { id: "ui", label: "Интерфейс", icon: "assets/icons/interface.png" },
    { id: "sound", label: "Звуки / Музыка", icon: "assets/icons/sound.png" },
    { id: "command", label: "Консольные команды", icon: "assets/icons/command.png" },
  ];

  function collectFormValues() {
    const form = {};
    FORM_FIELDS.forEach((id) => {
      const el = document.getElementById(id);
      form[id] = el ? el.value : "";
    });
    return form;
  }

  function saveFormToStorage() {
    writeStorage({ form: collectFormValues() });
  }

  function autosizeArea(area) {
    const styles = getComputedStyle(area);
    const lineHeight = parseFloat(styles.lineHeight) || 20;
    const padY =
      parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
    const borderY =
      parseFloat(styles.borderTopWidth) + parseFloat(styles.borderBottomWidth);
    const minRows = area.classList.contains("field-area--sm") ? 2 : 5;
    const minH = lineHeight * minRows + padY + borderY;
    area.style.height = "auto";
    area.style.height = `${Math.max(minH, area.scrollHeight)}px`;
  }

  function loadFormFromStorage() {
    const { form } = readStorage();
    FORM_FIELDS.forEach((id) => {
      const el = document.getElementById(id);
      if (!el || form[id] == null) return;
      el.value = form[id];
    });
    document.querySelectorAll(".field-area").forEach((area) => autosizeArea(area));
  }

  function setNavActive(view) {
    document.querySelectorAll(".nav-item").forEach((item) => {
      const nav = item.dataset.nav;
      const active =
        (view === "catalog" && nav === "catalog") ||
        (view === "rules" && nav === "rules") ||
        (view === "server" && nav === "server") ||
        ((view === "register" ||
          view === "hero" ||
          view === "survey" ||
          view === "submit") &&
          nav === "register");
      item.classList.toggle("is-active", active);
    });
  }

  const VIEW_TRANSITION_MS = 450;
  let activeMainView = "register";
  let viewTransitionTimer = 0;

  const MAIN_VIEWS = {
    register: panels,
    catalog,
    content: contentFlow,
  };

  const STAGE_MODE_BY_VIEW = {
    register: null,
    catalog: "is-catalog",
    content: "is-content",
  };

  function applyStageMode(viewKey) {
    stageEl?.classList.remove("is-catalog", "is-rules", "is-server", "is-content");
    const mode = STAGE_MODE_BY_VIEW[viewKey];
    if (mode) stageEl?.classList.add(mode);
  }

  function activateMainView(viewKey, { animate = true, beforeShow, afterShow } = {}) {
    const nextEl = MAIN_VIEWS[viewKey];
    if (!nextEl) return Promise.resolve();

    window.clearTimeout(viewTransitionTimer);
    beforeShow?.();

    const prevKey = activeMainView;
    const prevEl = MAIN_VIEWS[prevKey];

    applyStageMode(viewKey);

    if (
      prevKey === viewKey &&
      nextEl.classList.contains("is-active") &&
      !nextEl.classList.contains("is-exiting")
    ) {
      afterShow?.();
      return Promise.resolve();
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const doAnimate = animate && !reducedMotion && prevEl && prevEl !== nextEl;

    if (!doAnimate) {
      Object.entries(MAIN_VIEWS).forEach(([key, el]) => {
        if (!el) return;
        const on = key === viewKey;
        el.hidden = !on;
        el.classList.toggle("is-active", on);
        el.classList.remove("is-exiting");
      });
      activeMainView = viewKey;
      afterShow?.();
      return Promise.resolve();
    }

    Object.entries(MAIN_VIEWS).forEach(([key, el]) => {
      if (!el || key === viewKey) return;
      el.classList.remove("is-active", "is-exiting");
      if (el !== prevEl) el.hidden = true;
    });

    nextEl.hidden = false;
    nextEl.classList.remove("is-exiting", "is-active");
    void nextEl.offsetWidth;

    if (prevEl && prevEl !== nextEl) {
      prevEl.hidden = false;
      prevEl.classList.remove("is-active");
      prevEl.classList.add("is-exiting");
    }

    nextEl.classList.add("is-active");

    return new Promise((resolve) => {
      viewTransitionTimer = window.setTimeout(() => {
        Object.entries(MAIN_VIEWS).forEach(([key, el]) => {
          if (!el || key === viewKey) return;
          el.classList.remove("is-exiting", "is-active");
          el.hidden = true;
        });
        activeMainView = viewKey;
        afterShow?.();
        resolve();
      }, VIEW_TRANSITION_MS);
    });
  }

  function updateRegisterChrome() {
    const stored = readStorage();
    const raceName = (stored.form?.raceName || "").trim();
    const registered = stored.registered;

    if (navRegister) {
      navRegister.textContent = registered ? "РАСА" : "РЕГИСТРАЦИЯ";
    }

    const lead = document.getElementById("hero-lead");
    if (lead) {
      lead.textContent = registered
        ? `Зарегистрирована раса (${raceName || "—"}).`
        : "Регистрация расы на сервер";
    }

    if (startBtn) {
      startBtn.textContent = registered ? "ИЗМЕНИТЬ" : "РЕГИСТРАЦИЯ";
    }
  }

  function resetRegistrationPanels() {
    panels?.classList.remove("is-leaving", "is-form", "is-submit");
    if (hero) {
      hero.classList.remove("is-gone");
      hero.removeAttribute("aria-hidden");
      hero.style.animation = "";
      hero.style.visibility = "";
    }
    if (survey) {
      survey.hidden = true;
      survey.classList.remove("is-gone");
      survey.removeAttribute("aria-hidden");
    }
    if (submitFlow) {
      submitFlow.hidden = true;
      submitFlow.classList.remove("is-gone");
    }
    currentStep = 1;
    renderStep();
  }

  function showCatalogView(animate = true) {
    return activateMainView("catalog", {
      animate,
      beforeShow: () => {
        contentFlow?.classList.remove("is-submit");
        setNavActive("catalog");
      },
    });
  }

  function showRulesView(animate = true) {
    setMainTab("rules");
    return Promise.resolve();
  }

  function showServerView(animate = true) {
    setMainTab("server");
    return Promise.resolve();
  }

  function resetSurveyScroll() {
    if (!survey) return;
    survey.scrollTop = 0;
    requestAnimationFrame(() => {
      survey.scrollTop = 0;
    });
  }

  function showRegistrationShell(animate = true) {
    return activateMainView("register", {
      animate,
      beforeShow: () => {
        resetRegistrationPanels();
        resetSurveyScroll();
        setNavActive("register");
      },
    });
  }

  function openSurvey(fromHero = true) {
    if (!panels || !survey) return;
    loadFormFromStorage();

    const animateTab = activeMainView !== "register";

    activateMainView("register", {
      animate: animateTab,
      beforeShow: () => {
        setNavActive("register");

        survey.hidden = false;
        survey.classList.remove("is-gone");
        survey.removeAttribute("aria-hidden");
        panels.classList.remove("is-submit");
        resetSurveyScroll();

        if (!fromHero || !hero || hero.classList.contains("is-gone")) {
          hero?.classList.add("is-gone");
          hero?.setAttribute("aria-hidden", "true");
          panels.classList.add("is-leaving", "is-form");
          nick?.focus({ preventScroll: true });
          resetSurveyScroll();
          return;
        }

        if (panels.classList.contains("is-leaving") && panels.classList.contains("is-form")) {
          nick?.focus({ preventScroll: true });
          resetSurveyScroll();
          return;
        }

        hero.style.animation = "none";
        void hero.offsetWidth;

        requestAnimationFrame(() => {
          panels.classList.add("is-leaving");
          panels.classList.add("is-form");
        });

        const onDone = (e) => {
          if (e.target !== hero) return;
          if (e.propertyName !== "transform" && e.propertyName !== "opacity") return;
          hero.removeEventListener("transitionend", onDone);
          hero.classList.add("is-gone");
          hero.setAttribute("aria-hidden", "true");
          nick?.focus({ preventScroll: true });
          resetSurveyScroll();
        };

        hero.addEventListener("transitionend", onDone);
      },
    });
  }

  startBtn?.addEventListener("click", () => openSurvey(true));

  function openSubmitFlow() {
    if (!panels || !submitFlow || !survey) return;
    if (panels.classList.contains("is-submit")) return;

    saveFormToStorage();
    setNavActive("register");

    submitFlow.hidden = false;
    void submitFlow.offsetWidth;

    requestAnimationFrame(() => {
      panels.classList.add("is-submit");
    });

    const finishHide = () => {
      survey.classList.add("is-gone");
      survey.setAttribute("aria-hidden", "true");
      currentStep = 0;
      renderStep();
    };

    const onDone = (e) => {
      if (e.target !== survey) return;
      if (e.propertyName !== "transform" && e.propertyName !== "opacity") return;
      survey.removeEventListener("transitionend", onDone);
      finishHide();
    };

    survey.addEventListener("transitionend", onDone);
    window.setTimeout(() => {
      if (!survey.classList.contains("is-gone")) finishHide();
    }, 700);
  }

  function completeRegistration() {
    writeStorage({ registered: true, form: collectFormValues() });
    updateRegisterChrome();
    showCatalogView();
  }

  document.querySelectorAll(".field-area").forEach((area) => {
    autosizeArea(area);
    area.addEventListener("input", () => {
      autosizeArea(area);
      saveFormToStorage();
    });
  });

  function sanitizeNick(value) {
    return value.replace(/[^A-Za-z0-9_]/g, "").slice(0, 16);
  }

  function validateNick(showMessage) {
    if (!nick) return false;
    const value = nick.value;
    const ok = NICK_RE.test(value);
    nick.classList.toggle("is-invalid", !ok && (showMessage || value.length > 0));

    if (!nickError) return ok;

    if (ok || (!showMessage && value.length === 0)) {
      nickError.hidden = true;
      nickError.textContent = "";
      return ok;
    }

    let msg = "Ник: 3–16 символов, только A–Z, 0–9 и _";
    if (value.length > 0 && value.length < 3) msg = "Слишком короткий ник (мин. 3)";
    if (/[^A-Za-z0-9_]/.test(value)) msg = "Только латиница, цифры и _";
    nickError.textContent = msg;
    nickError.hidden = false;
    return ok;
  }

  nick?.addEventListener("beforeinput", (e) => {
    if (e.inputType?.startsWith("delete") || e.inputType === "historyUndo") return;
    if (e.data && /[^A-Za-z0-9_]/.test(e.data)) e.preventDefault();
  });

  nick?.addEventListener("input", () => {
    const cleaned = sanitizeNick(nick.value);
    if (nick.value !== cleaned) nick.value = cleaned;
    validateNick(false);
    saveFormToStorage();
  });

  nick?.addEventListener("blur", () => validateNick(true));

  const raceNameInput = document.getElementById("raceName");
  raceNameInput?.addEventListener("input", () => {
    saveFormToStorage();
    updateRegisterChrome();
  });

  function validateRequiredAreas(showMessage) {
    const required = ["raceName", "origin", "abilities", "useful"];
    let ok = true;
    required.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const filled = el.value.trim().length > 0;
      el.classList.toggle("is-invalid", !filled && showMessage);
      if (!filled) ok = false;
    });
    return ok;
  }

  function collectFormFiles() {
    const val = (id) =>
      (document.getElementById(id)?.value ?? "").replace(/\r\n/g, "\n").trim();

    const sections = [
      ["Игровое имя", val("nick")],
      ["Название расы", val("raceName")],
      ["Происхождение расы", val("origin")],
      ["Способности расы", val("abilities")],
      ["Особенности расы", val("traits")],
      ["Чем раса полезна для других", val("useful")],
      ["Особые механики", val("mechanics")],
    ];

    const anketa = sections
      .map(([label, text]) => `${label}:\n${text || "—"}`)
      .join("\n\n---\n\n");

    const files = [
      { name: "анкета.txt", bytes: encodeUtf8(anketa) },
    ];

    raceSkins.forEach((skin, i) => {
      const num = String(i + 1).padStart(2, "0");
      files.push({ name: `skins/skin_${num}.${skin.ext || "png"}`, bytes: skin.bytes });
    });

    raceAudio.forEach((a, i) => {
      const num = String(i + 1).padStart(2, "0");
      files.push({ name: `audio/audio_${num}.${a.ext}`, bytes: a.bytes });
    });

    return files;
  }

  const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[i] = c >>> 0;
    }
    return table;
  })();

  function crc32(bytes) {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) {
      c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function u16(n) {
    return [n & 0xff, (n >>> 8) & 0xff];
  }

  function u32(n) {
    return [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff];
  }

  function encodeUtf8(str) {
    return new TextEncoder().encode(str);
  }

  function buildZip(files) {
    const localParts = [];
    const centralParts = [];
    let offset = 0;

    for (const file of files) {
      const nameBytes = encodeUtf8(file.name);
      const data =
        file.bytes instanceof Uint8Array
          ? file.bytes
          : encodeUtf8(file.text ?? "");
      const crc = crc32(data);
      const size = data.length;
      const local = [
        ...u32(0x04034b50), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
        ...u32(crc), ...u32(size), ...u32(size), ...u16(nameBytes.length), ...u16(0),
        ...nameBytes, ...data,
      ];
      const central = [
        ...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
        ...u32(crc), ...u32(size), ...u32(size), ...u16(nameBytes.length), ...u16(0), ...u16(0),
        ...u16(0), ...u16(0), ...u32(0), ...u32(offset), ...nameBytes,
      ];
      localParts.push(Uint8Array.from(local));
      centralParts.push(Uint8Array.from(central));
      offset += local.length;
    }

    const centralSize = centralParts.reduce((s, p) => s + p.length, 0);
    const end = Uint8Array.from([
      ...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length),
      ...u32(centralSize), ...u32(offset), ...u16(0),
    ]);

    const out = new Uint8Array(offset + centralSize + end.length);
    let pos = 0;
    for (const part of localParts) { out.set(part, pos); pos += part.length; }
    for (const part of centralParts) { out.set(part, pos); pos += part.length; }
    out.set(end, pos);
    return out;
  }

  function triggerDownload(bytes, filename) {
    const blob = new Blob([bytes], { type: "application/zip" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function downloadZip() {
    const files = collectFormFiles();
    const zip = buildZip(files);
    const nickName = sanitizeNick(nick?.value || "race") || "race";
    const filename = `genesis_${nickName}.zip`;
    triggerDownload(zip, filename);
    return filename;
  }

  function openGmailCompose({ subject, body }) {
    const params = new URLSearchParams({
      view: "cm",
      fs: "1",
      to: GMAIL_TO,
      su: subject,
      body,
    });
    window.open(`https://mail.google.com/mail/?${params.toString()}`, "_blank", "noopener,noreferrer");
  }

  function sendRaceViaGmail() {
    const filename = downloadZip();
    const race = document.getElementById("raceName")?.value.trim() || "раса";
    const player = sanitizeNick(nick?.value || "") || "player";
    openGmailCompose({
      subject: `Genesis · регистрация расы · ${player}`,
      body: [
        `Анкета регистрации расы «${race}».`,
        ``,
        `ZIP уже скачан: ${filename}`,
        `Прикрепите этот файл к письму и отправьте.`,
      ].join("\n"),
    });
    showToast("ZIP скачан — прикрепите его в Gmail");
    window.setTimeout(() => completeRegistration(), 600);
  }

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    requestAnimationFrame(() => toast.classList.add("is-show"));
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toast.classList.remove("is-show");
      window.setTimeout(() => { toast.hidden = true; }, 220);
    }, 2200);
  }

  async function copyServerIp() {
    const ip = serverInfo?.ip || SERVER_IP;
    try {
      await navigator.clipboard.writeText(ip);
      showToast("IP скопирован");
    } catch {
      showToast("Не удалось скопировать");
    }
  }

  function readInstalledModVersion() {
    try {
      return String(localStorage.getItem(MOD_INSTALLED_KEY) || "").trim();
    } catch {
      return "";
    }
  }

  function writeInstalledModVersion(version) {
    try {
      localStorage.setItem(MOD_INSTALLED_KEY, String(version || ""));
    } catch {
      /* ignore */
    }
  }

  function hasModUpdate() {
    const current = String(serverInfo?.mod?.version || "").trim();
    if (!current) return false;
    const installed = readInstalledModVersion();
    return Boolean(installed) ? installed !== current : Boolean(serverInfo?.mod?.updatedAt);
  }

  async function ensureServerInfoLoaded(force = false) {
    if (serverInfo && !force) return serverInfo;
    if (serverInfoPromise && !force) return serverInfoPromise;
    if (!authToken) return serverInfo;
    serverInfoPromise = (async () => {
      try {
        const data = await api("/api/server");
        serverInfo = data.server || null;
        return serverInfo;
      } catch (err) {
        console.warn("server info:", err.message);
        return serverInfo;
      } finally {
        serverInfoPromise = null;
      }
    })();
    return serverInfoPromise;
  }

  function renderServerTab() {
    const nameEl = document.getElementById("server-name");
    const passEl = document.getElementById("server-password");
    const passToggle = document.getElementById("server-pass-toggle");
    const ipValue = document.getElementById("server-ip-value");
    const mcVersion = document.getElementById("server-mc-version");
    const modBtn = document.getElementById("server-mod-btn");
    const modVersion = document.getElementById("server-mod-version");
    const founderActions = document.getElementById("server-founder-actions");
    const tabBadge = document.getElementById("server-tab-badge");
    const modMark = document.getElementById("server-mod-update-mark");
    const founder = String(authUser?.role || "") === "founder";

    if (founderActions) founderActions.hidden = !founder;
    if (nameEl) nameEl.textContent = serverInfo?.name || "Genesis";
    if (passEl) {
      const pass = String(serverInfo?.accountPassword || "");
      const visible = passEl.getAttribute("data-visible") === "1";
      passEl.classList.toggle("is-empty", !pass);
      if (!pass) {
        passEl.textContent = serverInfo?.hasPasswordHash
          ? "Пароль скрыт — смените в настройках, чтобы видеть здесь"
          : "Пароль не задан";
        passEl.setAttribute("data-visible", "0");
        if (passToggle) {
          passToggle.disabled = true;
          passToggle.setAttribute("aria-pressed", "false");
          passToggle.textContent = "*";
        }
      } else {
        if (passToggle) passToggle.disabled = false;
        passEl.textContent = visible ? pass : "•".repeat(Math.min(18, Math.max(6, pass.length)));
      }
    }
    if (ipValue) ipValue.textContent = serverInfo?.ip || SERVER_IP;
    if (mcVersion) {
      mcVersion.textContent = serverInfo?.mcVersion || "Minecraft 1.21.11 Fabric";
    }
    const fileName = serverInfo?.mod?.fileName || "genesis.jar";
    const version = serverInfo?.mod?.version || "—";
    const downloadUrl = serverInfo?.mod?.downloadUrl || "#";
    if (modBtn) {
      modBtn.href = downloadUrl;
      modBtn.setAttribute("download", fileName);
      if (downloadUrl.startsWith("http")) {
        modBtn.setAttribute("target", "_blank");
        modBtn.setAttribute("rel", "noopener noreferrer");
      } else {
        modBtn.removeAttribute("target");
        modBtn.removeAttribute("rel");
      }
    }
    if (modVersion) modVersion.textContent = `версия ${version}`;

    const update = hasModUpdate();
    if (tabBadge) tabBadge.hidden = !update;
    if (modMark) modMark.hidden = !update;
  }

  function markModInstalled() {
    const version = String(serverInfo?.mod?.version || "").trim();
    if (version) writeInstalledModVersion(version);
    renderServerTab();
  }

  function renderStep() {
    document.querySelectorAll("#submit-flow .submit-step").forEach((step) => {
      const n = Number(step.dataset.step);
      const active = n === currentStep;
      step.hidden = !active;
      step.classList.toggle("is-active", active);
    });
    if (submitNav) submitNav.hidden = currentStep === 0;
    const progressEls = document.querySelectorAll("#submit-flow .submit-step.is-active .submit-progress");
    progressEls.forEach((el) => {
      el.textContent = `Этап ${currentStep} / ${TOTAL_STEPS}`;
    });
    if (stepNext) stepNext.textContent = currentStep >= TOTAL_STEPS ? "ЗАВЕРШИТЬ" : "ДАЛЕЕ";
  }

  function backToSurvey() {
    if (!panels || !submitFlow || !survey) return;
    if (!panels.classList.contains("is-submit")) return;

    setNavActive("register");
    survey.classList.remove("is-gone");
    survey.hidden = false;
    survey.removeAttribute("aria-hidden");
    void survey.offsetWidth;
    panels.classList.remove("is-submit");

    const onDone = (e) => {
      if (e.target !== submitFlow) return;
      if (e.propertyName !== "transform" && e.propertyName !== "opacity") return;
      submitFlow.removeEventListener("transitionend", onDone);
      submitFlow.hidden = true;
      currentStep = 0;
      renderStep();
    };
    submitFlow.addEventListener("transitionend", onDone);
    window.setTimeout(() => {
      if (!submitFlow.hidden) {
        submitFlow.hidden = true;
        currentStep = 0;
        renderStep();
      }
    }, 700);
  }

  function getCatalogMode() {
    return CATALOG_MODES.find((m) => m.mode === catalogMode) || CATALOG_MODES[0];
  }

  function applyCatalogMode(mode, animate) {
    const next = CATALOG_MODES.find((m) => m.mode === mode) || CATALOG_MODES[0];
    catalogMode = next.mode;
    const section = document.getElementById("catalog-section");
    const title = document.getElementById("catalog-title");
    const grid = document.getElementById("catalog-grid");
    if (!section || !title || !grid) return;

    section.style.setProperty("--section-accent", next.color);
    section.dataset.mode = next.mode;
    section.dataset.prefix = next.prefix;
    title.textContent = next.title;

    document.querySelectorAll(".catalog-mode-btn").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.mode === next.mode);
    });

    grid.querySelectorAll(".catalog-card").forEach((card) => {
      card.dataset.mode = next.mode;
      card.dataset.prefix = next.prefix;
    });

    if (animate) {
      grid.classList.remove("is-switching");
      void grid.offsetWidth;
      grid.classList.add("is-switching");
      window.setTimeout(() => grid.classList.remove("is-switching"), 420);
    }
  }

  function buildCatalog() {
    if (!catalogInner) return;
    catalogInner.innerHTML = "";

    const current = getCatalogMode();
    const wrap = document.createElement("section");
    wrap.className = "catalog-section";
    wrap.id = "catalog-section";
    wrap.dataset.mode = current.mode;
    wrap.dataset.prefix = current.prefix;
    wrap.style.setProperty("--section-accent", current.color);

    const head = document.createElement("div");
    head.className = "catalog-section__head";

    const title = document.createElement("h2");
    title.className = "catalog-section__title";
    title.id = "catalog-title";
    title.textContent = current.title;

    const modes = document.createElement("div");
    modes.className = "catalog-modes";
    modes.setAttribute("role", "tablist");
    modes.setAttribute("aria-label", "Режим каталога");

    CATALOG_MODES.forEach((mode) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "catalog-mode-btn";
      btn.dataset.mode = mode.mode;
      btn.style.setProperty("--mode-color", mode.color);
      btn.title = mode.title;
      btn.setAttribute("aria-label", mode.title);
      if (mode.mode === current.mode) btn.classList.add("is-active");
      btn.addEventListener("click", () => applyCatalogMode(mode.mode, true));
      modes.appendChild(btn);
    });

    const line = document.createElement("div");
    line.className = "catalog-section__line";
    line.setAttribute("aria-hidden", "true");

    head.appendChild(title);
    head.appendChild(modes);
    head.appendChild(line);

    const grid = document.createElement("div");
    grid.className = "catalog-grid";
    grid.id = "catalog-grid";

    CATALOG_TYPES.forEach((type) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "catalog-card";
      btn.dataset.mode = current.mode;
      btn.dataset.prefix = current.prefix;
      btn.dataset.type = type.id;
      btn.innerHTML = `
          <span class="catalog-card__visual" aria-hidden="true">
            <span class="catalog-card__shadow"></span>
            <img class="catalog-card__img" src="${type.icon}" alt="" />
          </span>
          <span class="catalog-card__label">${type.label}</span>
        `;
      btn.addEventListener("click", () => {
        openContentForm({
          type: type.id,
          mode: btn.dataset.mode,
          prefix: btn.dataset.prefix,
          title: type.label,
        });
      });
      grid.appendChild(btn);
    });

    wrap.appendChild(head);
    wrap.appendChild(grid);
    catalogInner.appendChild(wrap);
  }

  function showSpinner(id) {
    document.getElementById(id)?.classList.add("is-active");
  }
  function hideSpinner(id) {
    document.getElementById(id)?.classList.remove("is-active");
  }

  /* ---------- Race skins ---------- */
  const skinGrid = document.getElementById("skin-grid");
  const skinInput = document.getElementById("skin-input");

  function extFromName(name) {
    const m = /\.([a-z0-9]+)$/i.exec(name || "");
    return (m ? m[1] : "png").toLowerCase();
  }

  function renderSkins() {
    if (!skinGrid) return;
    skinGrid.innerHTML = "";
    raceSkins.forEach((skin) => {
      const card = document.createElement("div");
      card.className = "skin-card";
      card.innerHTML = `
        <div class="skin-frame"><img src="${skin.url}" alt="" /></div>
        <button type="button" class="skin-delete" data-id="${skin.id}">УДАЛИТЬ</button>
      `;
      card.querySelector(".skin-delete")?.addEventListener("click", () => {
        const idx = raceSkins.findIndex((s) => s.id === skin.id);
        if (idx >= 0) {
          URL.revokeObjectURL(raceSkins[idx].url);
          raceSkins.splice(idx, 1);
          renderSkins();
        }
      });
      skinGrid.appendChild(card);
    });
  }

  async function addSkinFiles(fileList) {
    const files = [...fileList];
    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      const buffer = new Uint8Array(await file.arrayBuffer());
      const url = URL.createObjectURL(file);
      raceSkins.push({
        id: skinIdSeq++,
        name: file.name,
        ext: extFromName(file.name),
        bytes: buffer,
        url,
      });
    }
    renderSkins();
  }

  skinInput?.addEventListener("change", async () => {
    if (!skinInput.files?.length) return;
    showSpinner("skin-spinner");
    await addSkinFiles(skinInput.files);
    skinInput.value = "";
    hideSpinner("skin-spinner");
  });

  /* ---------- Race audio ---------- */
  const raceAudioList = document.getElementById("race-audio-list");
  const raceAudioInput = document.getElementById("race-audio-input");

  function renderRaceAudio() {
    if (!raceAudioList) return;
    raceAudioList.innerHTML = "";
    raceAudio.forEach((a) => {
      const card = document.createElement("div");
      card.className = "audio-card";
      card.innerHTML = `
        <span class="audio-card__name" title="${a.name}">${a.name}</span>
        <audio src="${a.url}" controls preload="none"></audio>
        <button type="button" class="audio-card__del" data-id="${a.id}">УДАЛИТЬ</button>
      `;
      card.querySelector(".audio-card__del")?.addEventListener("click", () => {
        const idx = raceAudio.findIndex((x) => x.id === a.id);
        if (idx >= 0) { URL.revokeObjectURL(raceAudio[idx].url); raceAudio.splice(idx, 1); }
        renderRaceAudio();
      });
      raceAudioList.appendChild(card);
    });
  }

  raceAudioInput?.addEventListener("change", async () => {
    if (!raceAudioInput.files?.length) return;
    showSpinner("race-audio-spinner");
    for (const file of [...raceAudioInput.files]) {
      if (!file.type.startsWith("audio/")) continue;
      const bytes = new Uint8Array(await file.arrayBuffer());
      const url = URL.createObjectURL(file);
      raceAudio.push({ id: skinIdSeq++, name: file.name, ext: extFromName(file.name), bytes, url });
    }
    raceAudioInput.value = "";
    renderRaceAudio();
    hideSpinner("race-audio-spinner");
  });

  /* ---------- Content form (item) ---------- */
  const contentForm = document.getElementById("content-form");
  const contentSubmit = document.getElementById("content-submit");
  const contentFormMode = document.getElementById("content-form-mode");
  const contentFormTitle = document.getElementById("content-form-title");
  const contentFormStatus = document.getElementById("content-form-status");
  const contentBackBtn = document.getElementById("content-back-btn");
  const contentDownloadZip = document.getElementById("content-download-zip");
  const contentStepBack = document.getElementById("content-step-back");
  const contentStepNext = document.getElementById("content-step-next");
  const contentSubmitProgress = document.getElementById("content-submit-progress");

  /* ---------- Item textures ---------- */
  const itemTextureGrid = document.getElementById("item-texture-grid");
  const itemTextureInput = document.getElementById("item-texture-input");

  function renderItemTextures() {
    if (!itemTextureGrid) return;
    itemTextureGrid.innerHTML = "";
    itemTextures.forEach((tex) => {
      const card = document.createElement("div");
      card.className = "skin-card";
      card.innerHTML = `
        <div class="skin-frame"><img src="${tex.url}" alt="" /></div>
        <button type="button" class="skin-delete" data-id="${tex.id}">УДАЛИТЬ</button>
      `;
      card.querySelector(".skin-delete")?.addEventListener("click", () => {
        const idx = itemTextures.findIndex((x) => x.id === tex.id);
        if (idx >= 0) { URL.revokeObjectURL(itemTextures[idx].url); itemTextures.splice(idx, 1); }
        renderItemTextures();
      });
      itemTextureGrid.appendChild(card);
    });
  }

  itemTextureInput?.addEventListener("change", async () => {
    if (!itemTextureInput.files?.length) return;
    showSpinner("item-texture-spinner");
    for (const file of [...itemTextureInput.files]) {
      if (!file.type.startsWith("image/")) continue;
      const bytes = new Uint8Array(await file.arrayBuffer());
      const url = URL.createObjectURL(file);
      itemTextures.push({ id: skinIdSeq++, name: file.name, ext: extFromName(file.name), bytes, url });
    }
    itemTextureInput.value = "";
    renderItemTextures();
    hideSpinner("item-texture-spinner");
  });

  /* ---------- Item audio ---------- */
  const itemAudioList = document.getElementById("item-audio-list");
  const itemAudioInput = document.getElementById("item-audio-input");

  function renderItemAudio() {
    if (!itemAudioList) return;
    itemAudioList.innerHTML = "";
    itemAudio.forEach((a) => {
      const card = document.createElement("div");
      card.className = "audio-card";
      card.innerHTML = `
        <span class="audio-card__name" title="${a.name}">${a.name}</span>
        <audio src="${a.url}" controls preload="none"></audio>
        <button type="button" class="audio-card__del" data-id="${a.id}">УДАЛИТЬ</button>
      `;
      card.querySelector(".audio-card__del")?.addEventListener("click", () => {
        const idx = itemAudio.findIndex((x) => x.id === a.id);
        if (idx >= 0) { URL.revokeObjectURL(itemAudio[idx].url); itemAudio.splice(idx, 1); }
        renderItemAudio();
      });
      itemAudioList.appendChild(card);
    });
  }

  itemAudioInput?.addEventListener("change", async () => {
    if (!itemAudioInput.files?.length) return;
    showSpinner("item-audio-spinner");
    for (const file of [...itemAudioInput.files]) {
      if (!file.type.startsWith("audio/")) continue;
      const bytes = new Uint8Array(await file.arrayBuffer());
      const url = URL.createObjectURL(file);
      itemAudio.push({ id: skinIdSeq++, name: file.name, ext: extFromName(file.name), bytes, url });
    }
    itemAudioInput.value = "";
    renderItemAudio();
    hideSpinner("item-audio-spinner");
  });

  const schematicList = document.getElementById("schematic-list");
  const schematicInput = document.getElementById("schematic-input");

  function renderSchematics() {
    if (!schematicList) return;
    schematicList.innerHTML = "";
    structureSchematics.forEach((file) => {
      const card = document.createElement("div");
      card.className = "audio-card";
      card.innerHTML = `
        <span class="audio-card__name" title="${file.name}">${file.name}</span>
        <button type="button" class="audio-card__del" data-id="${file.id}">УДАЛИТЬ</button>
      `;
      card.querySelector(".audio-card__del")?.addEventListener("click", () => {
        const idx = structureSchematics.findIndex((x) => x.id === file.id);
        if (idx >= 0) structureSchematics.splice(idx, 1);
        renderSchematics();
      });
      schematicList.appendChild(card);
    });
  }

  schematicInput?.addEventListener("change", async () => {
    if (!schematicInput.files?.length) return;
    showSpinner("schematic-spinner");
    for (const file of [...schematicInput.files]) {
      const ext = extFromName(file.name);
      if (!["schem", "schematic", "litematic", "nbt"].includes(ext)) continue;
      const bytes = new Uint8Array(await file.arrayBuffer());
      structureSchematics.push({ id: skinIdSeq++, name: file.name, ext, bytes });
    }
    schematicInput.value = "";
    renderSchematics();
    hideSpinner("schematic-spinner");
  });

  /* ── Craft block ──────────────────────────────── */
  let craftMode = "none"; // "none" | "smelt" | "craft"
  // craftCells[0..8] — символ в ячейке (1 char or "")
  const craftCells = Array(9).fill("");
  // craftSymMap: Map<symbol, name>
  const craftSymMap = new Map();

  function buildCraftGrid() {
    const grid = document.getElementById("craft-grid");
    if (!grid) return;
    grid.innerHTML = "";
    craftCells.forEach((val, idx) => {
      const cell = document.createElement("div");
      cell.className = "craft-cell";
      const inp = document.createElement("input");
      inp.type = "text";
      inp.maxLength = 1;
      inp.value = craftCells[idx];
      inp.setAttribute("aria-label", `Ячейка ${idx + 1}`);
      inp.addEventListener("input", () => {
        const ch = inp.value.slice(-1).toUpperCase();
        inp.value = ch;
        craftCells[idx] = ch;
        updateCraftLegend();
      });
      cell.appendChild(inp);
      grid.appendChild(cell);
    });
  }

  function updateCraftLegend() {
    const legend = document.getElementById("craft-legend");
    if (!legend) return;

    // collect unique non-empty symbols
    const seen = new Set();
    craftCells.forEach((c) => { if (c) seen.add(c); });

    // remove legend rows for symbols no longer present
    for (const sym of [...craftSymMap.keys()]) {
      if (!seen.has(sym)) craftSymMap.delete(sym);
    }

    legend.innerHTML = "";
    seen.forEach((sym) => {
      const row = document.createElement("div");
      row.className = "craft-legend-row";

      const symBox = document.createElement("div");
      symBox.className = "craft-legend-sym";
      symBox.textContent = sym;

      const nameInp = document.createElement("input");
      nameInp.type = "text";
      nameInp.className = "field-input craft-legend-input";
      nameInp.placeholder = `Название предмета для «${sym}»`;
      nameInp.maxLength = 64;
      nameInp.autocomplete = "off";
      nameInp.value = craftSymMap.get(sym) || "";
      nameInp.addEventListener("input", () => {
        craftSymMap.set(sym, nameInp.value);
      });

      row.appendChild(symBox);
      row.appendChild(nameInp);
      legend.appendChild(row);
    });
  }

  function setCraftMode(mode) {
    craftMode = mode;
    document.querySelectorAll(".craft-tab").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.craft === mode);
    });
    const smelt = document.getElementById("craft-smelt");
    const gridPanel = document.getElementById("craft-grid-panel");
    if (smelt) smelt.hidden = mode !== "smelt";
    if (gridPanel) gridPanel.hidden = mode !== "craft";
  }

  function resetCraft() {
    craftCells.fill("");
    craftSymMap.clear();
    craftMode = "none";
    setCraftMode("none");
    buildCraftGrid();
    updateCraftLegend();
    const smeltInput = document.getElementById("smelt-item");
    if (smeltInput) smeltInput.value = "";
  }

  // Wire tab buttons
  document.getElementById("craft-mode-tabs")?.addEventListener("click", (e) => {
    const tab = e.target.closest(".craft-tab");
    if (!tab) return;
    const mode = tab.dataset.craft;
    setCraftMode(mode);
    if (mode === "craft") buildCraftGrid();
  });

  buildCraftGrid();

  function craftToText() {
    if (craftMode === "none") return "";
    if (craftMode === "smelt") {
      const item = document.getElementById("smelt-item")?.value.trim() || "—";
      return `Плавка: ${item}`;
    }
    // craft grid
    const rows = [];
    for (let r = 0; r < 3; r++) {
      const row = craftCells.slice(r * 3, r * 3 + 3)
        .map((c) => c || "0")
        .join("|");
      rows.push(row);
    }
    const grid = rows.join("\n");

    const legend = [];
    craftSymMap.forEach((name, sym) => {
      legend.push(`${sym} — ${name || "—"}`);
    });

    return [`Крафт:`, grid, ``, `Легенда:`, ...legend].join("\n");
  }

  /* ─────────────────────────────────────────────── */

  function resetContentForm() {
    if (!contentForm) return;
    contentForm.reset();
    const first = contentForm.querySelector('input[name="itemType"][value="item"]');
    if (first) first.checked = true;
    contentForm.querySelectorAll(".field-area").forEach((area) => {
      area.classList.remove("is-invalid");
      autosizeArea(area);
    });
    contentForm.querySelectorAll(".field-input").forEach((el) => {
      el.classList.remove("is-invalid");
    });
    // clear uploaded files
    itemTextures.forEach((t) => URL.revokeObjectURL(t.url));
    itemTextures.length = 0;
    renderItemTextures();
    itemAudio.forEach((a) => URL.revokeObjectURL(a.url));
    itemAudio.length = 0;
    renderItemAudio();
    structureSchematics.length = 0;
    renderSchematics();
    resetCraft();
    const cmdErr = document.getElementById("command-error");
    if (cmdErr) cmdErr.hidden = true;
    if (contentFormStatus) contentFormStatus.hidden = true;
    contentFlow?.classList.remove("is-submit");
    if (contentSubmit) contentSubmit.hidden = true;
    contentStep = 1;
    renderContentStep();
  }

  function applyContentFormLayout(type, mode) {
    const isReport = mode === "report";
    const reportFields = document.getElementById("report-fields");
    const reportDescBlock = document.getElementById("report-desc-block");
    if (reportFields) reportFields.hidden = !isReport;
    if (reportDescBlock) reportDescBlock.hidden = !isReport;

    document.querySelectorAll("[data-type-fields]").forEach((el) => {
      el.hidden = isReport || el.dataset.typeFields !== type;
    });

    const warn = document.getElementById("content-form-warn");
    if (warn) warn.hidden = isReport || type !== "dimension";

    const showTexture = !isReport && (type === "item" || type === "block");
    const showAudio = !isReport && (type === "item" || type === "block");
    const showSchematic = !isReport && type === "structure";
    const showCraft = !isReport && (type === "item" || type === "block" || type === "recipe");
    const craftRequired = type === "recipe";

    const tex = document.getElementById("shared-texture");
    const aud = document.getElementById("shared-audio");
    const sch = document.getElementById("shared-schematic");
    const craft = document.getElementById("craft-block");
    if (tex) tex.hidden = !showTexture;
    if (aud) aud.hidden = !showAudio;
    if (sch) sch.hidden = !showSchematic;
    if (craft) craft.hidden = !showCraft;

    const noneTab = document.querySelector('.craft-tab[data-craft="none"]');
    const craftOpt = document.getElementById("craft-opt");
    if (noneTab) noneTab.hidden = craftRequired;
    if (craftOpt) craftOpt.hidden = craftRequired;
    const craftLabel = document.getElementById("craft-label");
    if (craftLabel && craftRequired) {
      if (!craftLabel.querySelector(".req")) {
        const star = document.createElement("span");
        star.className = "req";
        star.textContent = "*";
        craftLabel.appendChild(star);
      }
    } else if (craftLabel) {
      craftLabel.querySelector(".req")?.remove();
    }

    if (showCraft) {
      setCraftMode(craftRequired ? "craft" : "none");
      if (craftRequired) buildCraftGrid();
    }
  }

  function openContentForm({ type, mode, prefix, title }) {
    contentContext = { type, mode, prefix, title };
    resetContentForm();
    applyContentFormLayout(type, mode);

    if (contentFormMode) {
      const modeInfo = CATALOG_MODES.find((m) => m.mode === mode);
      contentFormMode.textContent = modeInfo?.title || mode;
      contentFormMode.style.color = modeInfo?.color || "";
    }
    if (contentFormTitle) contentFormTitle.textContent = title || "Предмет";

    activateMainView("content", {
      animate: activeMainView !== "content",
      beforeShow: () => setNavActive("catalog"),
      afterShow: () => {
        const first = document.querySelector(
          '.type-fields:not([hidden]) .field-input, .type-fields:not([hidden]) .field-area, #reportName'
        );
        first?.focus({ preventScroll: true });
      },
    });
  }

  function closeContentForm() {
    contentFlow?.classList.remove("is-submit");
    if (contentSubmit) contentSubmit.hidden = true;
    showCatalogView(true);
  }

  function validateContentForm(showMessage) {
    let ok = true;
    const mark = (el, filled) => {
      if (!el) return;
      el.classList.toggle("is-invalid", !filled && showMessage);
      if (!filled) ok = false;
    };
    const filled = (id) => {
      const el = document.getElementById(id);
      mark(el, Boolean(el?.value.trim()));
    };

    if (contentContext.mode === "report") {
      filled("reportName");
      filled("reportDesc");
      return ok;
    }

    const type = contentContext.type;
    const required = {
      item: ["itemName"],
      mechanic: ["mechanicName", "mechanicDesc"],
      block: ["blockName", "blockStats"],
      recipe: ["recipeName"],
      structure: ["structureName", "structureSpawn"],
      biome: ["biomeName", "biomeSpawn"],
      dimension: ["dimensionName", "dimensionEnter"],
      entity: ["entityName", "entitySpawn"],
      effect: ["effectName", "effectGet", "effectDoes"],
      ui: ["uiName", "uiOpen", "uiDoes"],
      sound: ["soundName", "soundPlay"],
      command: ["commandInput", "commandDoes"],
    };

    (required[type] || []).forEach(filled);

    if (type === "item") {
      const typeEl = contentForm?.querySelector('input[name="itemType"]:checked');
      if (!typeEl) ok = false;
    }

    if (type === "command") {
      const cmd = document.getElementById("commandInput");
      const err = document.getElementById("command-error");
      const raw = (cmd?.value || "").trim();
      const latinOk = !raw || COMMAND_RE.test(raw);
      if (cmd && raw && !latinOk) {
        cmd.classList.add("is-invalid");
        if (err && showMessage) {
          err.hidden = false;
          err.textContent = "Только латиница, цифры, _ и /";
        }
        ok = false;
      } else if (err) {
        err.hidden = true;
      }
    }

    if (type === "item" || type === "block" || type === "recipe") {
      const craftRequired = type === "recipe";
      const craftOk = validateCraft(craftRequired);
      if (!craftOk && showMessage) {
        document.getElementById("craft-block")?.classList.add("is-invalid");
        ok = false;
      } else {
        document.getElementById("craft-block")?.classList.remove("is-invalid");
        if (!craftOk) ok = false;
      }
    }

    return ok;
  }

  function validateCraft(required) {
    if (craftMode === "none") return !required;
    if (craftMode === "smelt") {
      return Boolean(document.getElementById("smelt-item")?.value.trim());
    }
    return craftCells.some((c) => c);
  }

  function collectContentFiles() {
    if (contentContext.mode === "report") {
      const contentName = document.getElementById("reportName")?.value.trim() || "";
      const problem = document.getElementById("reportDesc")?.value.replace(/\r\n/g, "\n").trim() || "";
      const typeLabel = contentContext.title || "Контент";
      const text = [
        `${typeLabel}.`,
        ``,
        `Название: ${contentName || "—"}.`,
        ``,
        `Описание проблемы: ${problem || "—"}.`,
      ].join("\n");
      return [{ name: "отчёт.txt", bytes: encodeUtf8(text) }];
    }

    const val = (id) =>
      (document.getElementById(id)?.value ?? "").replace(/\r\n/g, "\n").trim();

    const typePretty = {
      item: "Предмет", tool: "Инструмент", weapon: "Оружие",
      armor: "Броня", accessory: "Аксессуар", ingredient: "Ингредиент", other: "Другое",
    };
    const type = contentContext.type;
    const typeKey = contentForm?.querySelector('input[name="itemType"]:checked')?.value || "item";

    const sectionsByType = {
      item: [
        ["Режим", contentContext.prefix || "NEW*"],
        ["Тип контента", contentContext.title || "Предмет"],
        ["Название предмета", val("itemName")],
        ["Описание (ToolTip)", val("itemTooltip")],
        ["Тип предмета", typePretty[typeKey] || typeKey],
        ["Характеристики", val("itemStats")],
        ["Особенности", val("itemFeatures")],
        ["Для чего используется", val("itemUsage")],
      ],
      mechanic: [
        ["Режим", contentContext.prefix || "NEW*"],
        ["Тип контента", "Механика"],
        ["Название механики", val("mechanicName")],
        ["Описание механики", val("mechanicDesc")],
      ],
      block: [
        ["Режим", contentContext.prefix || "NEW*"],
        ["Тип контента", "Блок"],
        ["Название блока", val("blockName")],
        ["Описание блока (ToolTip)", val("blockTooltip")],
        ["Характеристики", val("blockStats")],
        ["Особенности", val("blockFeatures")],
        ["Для чего используется", val("blockUsage")],
      ],
      recipe: [
        ["Режим", contentContext.prefix || "NEW*"],
        ["Тип контента", "Рецепт"],
        ["Название рецепта", val("recipeName")],
      ],
      structure: [
        ["Режим", contentContext.prefix || "NEW*"],
        ["Тип контента", "Структура"],
        ["Название структуры", val("structureName")],
        ["Условие появления структуры", val("structureSpawn")],
        ["Для чего нужна структура", val("structureUsage")],
      ],
      biome: [
        ["Режим", contentContext.prefix || "NEW*"],
        ["Тип контента", "Биом"],
        ["Название биома", val("biomeName")],
        ["Особенности биома", val("biomeFeatures")],
        ["Условие появления биома", val("biomeSpawn")],
      ],
      dimension: [
        ["Режим", contentContext.prefix || "NEW*"],
        ["Тип контента", "Измерение"],
        ["Название измерения", val("dimensionName")],
        ["Особенности измерения", val("dimensionFeatures")],
        ["Условие попадания в измерение", val("dimensionEnter")],
      ],
      entity: [
        ["Режим", contentContext.prefix || "NEW*"],
        ["Тип контента", "Сущность / Моб"],
        ["Название моба", val("entityName")],
        ["Условие появления моба", val("entitySpawn")],
        ["Особенности моба", val("entityFeatures")],
      ],
      effect: [
        ["Режим", contentContext.prefix || "NEW*"],
        ["Тип контента", "Эффект"],
        ["Название эффекта", val("effectName")],
        ["Условия получения эффекта", val("effectGet")],
        ["Что делает эффект", val("effectDoes")],
      ],
      ui: [
        ["Режим", contentContext.prefix || "NEW*"],
        ["Тип контента", "Интерфейс"],
        ["Название интерфейса", val("uiName")],
        ["Как открыть интерфейс", val("uiOpen")],
        ["Что делает интерфейс", val("uiDoes")],
      ],
      sound: [
        ["Режим", contentContext.prefix || "NEW*"],
        ["Тип контента", "Звуки / Музыка"],
        ["Название звука", val("soundName")],
        ["Условие воспроизведения звука", val("soundPlay")],
      ],
      command: [
        ["Режим", contentContext.prefix || "NEW*"],
        ["Тип контента", "Консольные команды"],
        ["Ввод команды", val("commandInput")],
        ["Компоненты команды", val("commandParts")],
        ["Что делает команда, и развёртка компонентов", val("commandDoes")],
      ],
    };

    const fileNameByType = {
      item: "предмет.txt",
      mechanic: "механика.txt",
      block: "блок.txt",
      recipe: "рецепт.txt",
      structure: "структура.txt",
      biome: "биом.txt",
      dimension: "измерение.txt",
      entity: "моб.txt",
      effect: "эффект.txt",
      ui: "интерфейс.txt",
      sound: "звук.txt",
      command: "команда.txt",
    };

    const sections = sectionsByType[type] || [["Тип контента", contentContext.title || type]];
    let anketa = sections
      .map(([label, text]) => `${label}:\n${text || "—"}`)
      .join("\n\n---\n\n");

    const craftText = craftToText();
    if ((type === "item" || type === "block" || type === "recipe") && craftText) {
      anketa += "\n\n---\n\n" + craftText;
    }

    const files = [
      { name: fileNameByType[type] || "анкета.txt", bytes: encodeUtf8(anketa) },
    ];

    if (type === "item" || type === "block") {
      itemTextures.forEach((tex, i) => {
        const num = String(i + 1).padStart(2, "0");
        files.push({ name: `textures/texture_${num}.${tex.ext}`, bytes: tex.bytes });
      });
      itemAudio.forEach((a, i) => {
        const num = String(i + 1).padStart(2, "0");
        files.push({ name: `audio/audio_${num}.${a.ext}`, bytes: a.bytes });
      });
    }

    if (type === "structure") {
      structureSchematics.forEach((file, i) => {
        const num = String(i + 1).padStart(2, "0");
        files.push({ name: `schematics/schematic_${num}.${file.ext}`, bytes: file.bytes });
      });
    }

    return files;
  }

  function downloadContentZip() {
    const files = collectContentFiles();
    const zip = buildZip(files);
    const nameIds = {
      item: "itemName",
      mechanic: "mechanicName",
      block: "blockName",
      recipe: "recipeName",
      structure: "structureName",
      biome: "biomeName",
      dimension: "dimensionName",
      entity: "entityName",
      effect: "effectName",
      ui: "uiName",
      sound: "soundName",
      command: "commandInput",
    };
    const raw =
      document.getElementById(nameIds[contentContext.type] || "itemName")?.value ||
      contentContext.type ||
      "content";
    const safe = raw.trim().replace(/[^\w\-]+/g, "_").slice(0, 32) || "content";
    const prefix = (contentContext.prefix || "NEW*").replace(/\*/g, "");
    triggerDownload(zip, `${prefix}_${safe}.zip`);
  }

  function renderContentStep() {
    document.querySelectorAll("#content-submit .submit-step").forEach((step) => {
      const n = Number(step.dataset.cstep);
      const active = n === contentStep;
      step.hidden = !active;
      step.classList.toggle("is-active", active);
    });
    if (contentSubmitProgress) {
      contentSubmitProgress.textContent = `Этап ${contentStep} / ${CONTENT_STEPS}`;
    }
    if (contentStepNext) {
      contentStepNext.textContent =
        contentStep >= CONTENT_STEPS ? "ЗАВЕРШИТЬ" : "ДАЛЕЕ";
    }
  }

  function openContentSubmit() {
    if (!contentFlow || !contentSubmit || !contentForm) return;
    contentSubmit.hidden = false;
    contentStep = 1;
    renderContentStep();
    void contentSubmit.offsetWidth;
    contentFlow.classList.add("is-submit");
  }

  function backToContentForm() {
    if (!contentFlow || !contentSubmit) return;
    contentFlow.classList.remove("is-submit");
    window.setTimeout(() => {
      contentSubmit.hidden = true;
      contentStep = 1;
      renderContentStep();
    }, 650);
  }

  contentForm?.querySelectorAll(".field-area").forEach((area) => {
    autosizeArea(area);
    area.addEventListener("input", () => autosizeArea(area));
  });

  contentBackBtn?.addEventListener("click", () => closeContentForm());

  contentForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!validateContentForm(true)) {
      if (contentFormStatus) {
        contentFormStatus.hidden = false;
        contentFormStatus.classList.remove("is-ok");
        contentFormStatus.textContent = "Заполните обязательные поля";
      }
      contentForm.querySelector(".is-invalid")?.focus();
      return;
    }
    if (contentFormStatus) contentFormStatus.hidden = true;
    openContentSubmit();
  });

  contentDownloadZip?.addEventListener("click", downloadContentZip);

  contentStepBack?.addEventListener("click", () => {
    if (contentStep <= 1) {
      backToContentForm();
      return;
    }
    contentStep -= 1;
    renderContentStep();
  });

  contentStepNext?.addEventListener("click", () => {
    if (contentStep >= CONTENT_STEPS) {
      closeContentForm();
      return;
    }
    contentStep += 1;
    renderContentStep();
  });

  downloadZipBtn?.addEventListener("click", downloadZip);

  stepBack?.addEventListener("click", () => {
    if (currentStep <= 1) {
      backToSurvey();
      return;
    }
    currentStep -= 1;
    renderStep();
  });

  stepNext?.addEventListener("click", () => {
    if (currentStep >= TOTAL_STEPS) {
      completeRegistration();
      return;
    }
    currentStep += 1;
    renderStep();
  });

  survey?.addEventListener("submit", (e) => {
    e.preventDefault();
    const nickOk = validateNick(true);
    const areasOk = validateRequiredAreas(true);
    if (!nickOk || !areasOk) {
      if (formStatus) {
        formStatus.hidden = false;
        formStatus.classList.remove("is-ok");
        formStatus.textContent = "Заполните обязательные поля";
      }
      survey.querySelector(".is-invalid")?.focus();
      return;
    }
    if (formStatus) formStatus.hidden = true;
    saveFormToStorage();
    openSubmitFlow();
  });

  navRegister?.addEventListener("click", () => {
    showRegistrationShell();
    loadFormFromStorage();
  });

  navCatalog?.addEventListener("click", () => {
    showCatalogView();
  });

  document.querySelector('.nav-item[data-nav="rules"]')?.addEventListener("click", () => {
    showRulesView();
  });

  document.querySelector('.nav-item[data-nav="server"]')?.addEventListener("click", () => {
    showServerView();
  });

  serverIpBtn?.addEventListener("click", copyServerIp);

  document.getElementById("server-pass-toggle")?.addEventListener("click", () => {
    const el = document.getElementById("server-password");
    const btn = document.getElementById("server-pass-toggle");
    if (!el || !btn || btn.disabled) return;
    const pass = String(serverInfo?.accountPassword || "");
    if (!pass) return;
    const show = el.getAttribute("data-visible") !== "1";
    el.setAttribute("data-visible", show ? "1" : "0");
    el.textContent = show ? pass : "•".repeat(Math.min(18, Math.max(6, pass.length)));
    btn.setAttribute("aria-pressed", show ? "true" : "false");
    btn.setAttribute("aria-label", show ? "Скрыть пароль" : "Показать пароль");
    btn.textContent = show ? "•" : "*";
  });

  document.getElementById("server-open-patch")?.addEventListener("click", () => {
    setMainTab("patch");
  });

  document.getElementById("server-mod-btn")?.addEventListener("click", () => {
    const url = serverInfo?.mod?.downloadUrl;
    if (!url || url === "#") {
      showToast("Файл мода пока не загружен");
      return;
    }
    // локальная установка отмечается сразу при клике скачивания
    markModInstalled();
  });

  document.getElementById("server-mod-upload-btn")?.addEventListener("click", () => {
    if (String(authUser?.role || "") !== "founder") return;
    document.getElementById("server-mod-file")?.click();
  });

  document.getElementById("server-mod-file")?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || String(authUser?.role || "") !== "founder") return;
    if (!/\.jar$/i.test(file.name)) {
      showToast("Нужен файл .jar");
      return;
    }
    try {
      const res = await fetch("/api/server/mod/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/octet-stream",
          "X-Filename": file.name,
        },
        body: file,
      });
      let data = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }
      if (!res.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      if (data?.server) serverInfo = data.server;
      // у основателя после загрузки тоже виден знак обновления, пока сам не скачает
      renderServerTab();
      showToast("Мод обновлён");
    } catch (err) {
      showToast(err.message || "Не удалось загрузить мод");
    }
  });

  function canEditPatches() {
    return String(authUser?.role || "") === "founder";
  }

  function renderMarkdownLite(raw) {
    let text = escapeHtml(String(raw || ""));
    text = text.replace(/^### (.+)$/gm, "<h3>$1</h3>");
    text = text.replace(/^## (.+)$/gm, "<h2>$1</h2>");
    text = text.replace(/^# (.+)$/gm, "<h1>$1</h1>");
    text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    text = text.replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, "$1<em>$2</em>");
    text = text.replace(/`([^`]+)`/g, "<code>$1</code>");
    text = text.replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    );
    text = text.replace(/^(?:- |\* )(.+)$/gm, "<li>$1</li>");
    text = text.replace(/(?:<li>[\s\S]*?<\/li>\s*)+/g, (block) => `<ul>${block}</ul>`);
    text = text
      .split(/\n{2,}/)
      .map((chunk) => {
        const trimmed = chunk.trim();
        if (!trimmed) return "";
        if (/^<(h[1-3]|ul|li)/.test(trimmed)) return trimmed;
        return `<p>${trimmed.replace(/\n/g, "<br>")}</p>`;
      })
      .join("");
    return text || "<p></p>";
  }

  async function ensurePatchesLoaded(force = false) {
    if (patchesLoaded && !force) return patchesList;
    if (patchesLoadPromise && !force) return patchesLoadPromise;
    patchesLoadPromise = (async () => {
      try {
        const data = await api("/api/patches");
        patchesList = Array.isArray(data.patches) ? data.patches : [];
        patchesLoaded = true;
        return patchesList;
      } catch (err) {
        showToast(err.message || "Не удалось загрузить патч-ноут");
        patchesList = patchesList || [];
        return patchesList;
      } finally {
        patchesLoadPromise = null;
      }
    })();
    return patchesLoadPromise;
  }

  function renderPatchesUi() {
    const list = document.getElementById("patch-list");
    const empty = document.getElementById("patch-empty");
    const founderBar = document.getElementById("patch-founder-bar");
    const notes = document.getElementById("patch-notes");
    const editBtn = document.getElementById("patch-edit-mode-btn");
    const founder = canEditPatches();
    if (founderBar) founderBar.hidden = !founder;
    if (notes) notes.classList.toggle("is-editing", Boolean(founder && patchEditMode));
    if (editBtn) {
      editBtn.textContent = patchEditMode ? "Готово" : "Редактировать";
      editBtn.classList.toggle("is-active", patchEditMode);
    }
    if (!list) return;
    const patches = Array.isArray(patchesList) ? patchesList : [];
    if (empty) empty.hidden = patches.length > 0;
    list.innerHTML = patches
      .map((patch) => {
        const open = document
          .getElementById(`patch-item-${patch.id}`)
          ?.classList.contains("is-open");
        return `<article class="patch-item${open ? " is-open" : ""}" id="patch-item-${escapeHtml(
          patch.id
        )}" data-patch-id="${escapeHtml(patch.id)}">
          <button type="button" class="patch-item__head" data-patch-toggle="${escapeHtml(patch.id)}">
            <span class="patch-item__title">${escapeHtml(patch.title || "Патч")}</span>
            <span class="patch-item__version">${escapeHtml(patch.version || "")}</span>
            <span class="patch-item__tri" aria-hidden="true"></span>
          </button>
          <div class="patch-item__body">
            <div class="patch-item__content">${renderMarkdownLite(patch.body)}</div>
            <div class="patch-item__edit-row">
              <button type="button" class="rules-action-btn" data-patch-edit="${escapeHtml(
                patch.id
              )}">Изменить</button>
              <button type="button" class="rules-action-btn rules-action-btn--danger" data-patch-del="${escapeHtml(
                patch.id
              )}">Удалить</button>
            </div>
          </div>
        </article>`;
      })
      .join("");
  }

  function openPatchEditor(patch = null) {
    if (!canEditPatches()) return;
    patchEditorId = patch?.id || null;
    const editor = document.getElementById("patch-editor");
    const title = document.getElementById("patch-editor-title");
    const delBtn = document.getElementById("patch-editor-delete");
    const titleInput = document.getElementById("patch-field-title");
    const versionInput = document.getElementById("patch-field-version");
    const bodyInput = document.getElementById("patch-field-body");
    if (title) title.textContent = patch ? "Редактировать патч" : "Новый патч";
    if (delBtn) delBtn.hidden = !patch;
    if (titleInput) titleInput.value = patch?.title || "";
    if (versionInput) versionInput.value = patch?.version || "";
    if (bodyInput) bodyInput.value = patch?.body || "";
    if (editor) editor.hidden = false;
  }

  function closePatchEditor() {
    const editor = document.getElementById("patch-editor");
    if (editor) editor.hidden = true;
    patchEditorId = null;
  }

  function applyMdToSelection(kind) {
    const ta = document.getElementById("patch-field-body");
    if (!ta) return;
    const start = ta.selectionStart ?? 0;
    const end = ta.selectionEnd ?? 0;
    const value = ta.value;
    const selected = value.slice(start, end);
    let before = "";
    let after = "";
    let insert = selected;
    if (kind === "bold") {
      before = "**";
      after = "**";
      if (!selected) insert = "текст";
    } else if (kind === "italic") {
      before = "*";
      after = "*";
      if (!selected) insert = "текст";
    } else if (kind === "h2") {
      before = "## ";
      after = "";
      if (!selected) insert = "Заголовок";
      if (start > 0 && value[start - 1] !== "\n") before = "\n## ";
    } else if (kind === "ul") {
      const lines = (selected || "пункт").split(/\r?\n/);
      insert = lines.map((l) => `- ${l.replace(/^-\s*/, "")}`).join("\n");
      before = start > 0 && value[start - 1] !== "\n" ? "\n" : "";
      after = "";
    } else if (kind === "code") {
      before = "`";
      after = "`";
      if (!selected) insert = "code";
    } else if (kind === "link") {
      const label = selected || "ссылка";
      insert = `[${label}](https://)`;
      before = "";
      after = "";
    } else {
      return;
    }
    const next = value.slice(0, start) + before + insert + after + value.slice(end);
    ta.value = next;
    const selStart = start + before.length;
    const selEnd = selStart + insert.length;
    ta.focus();
    ta.setSelectionRange(selStart, selEnd);
  }

  document.getElementById("patch-create-btn")?.addEventListener("click", () => {
    openPatchEditor(null);
  });

  document.getElementById("patch-edit-mode-btn")?.addEventListener("click", () => {
    if (!canEditPatches()) return;
    patchEditMode = !patchEditMode;
    renderPatchesUi();
  });

  document.getElementById("patch-list")?.addEventListener("click", async (e) => {
    const toggle = e.target.closest("[data-patch-toggle]");
    if (toggle) {
      const id = toggle.getAttribute("data-patch-toggle");
      const item = document.getElementById(`patch-item-${id}`);
      if (item) item.classList.toggle("is-open");
      return;
    }
    const editBtn = e.target.closest("[data-patch-edit]");
    if (editBtn) {
      const id = editBtn.getAttribute("data-patch-edit");
      const patch = patchesList.find((p) => p.id === id);
      if (patch) openPatchEditor(patch);
      return;
    }
    const delBtn = e.target.closest("[data-patch-del]");
    if (delBtn) {
      if (!canEditPatches()) return;
      const id = delBtn.getAttribute("data-patch-del");
      const patch = patchesList.find((p) => p.id === id);
      if (!patch) return;
      if (!window.confirm(`Удалить патч «${patch.title}»?`)) return;
      try {
        const data = await api(`/api/patches/${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
        patchesList = Array.isArray(data.patches) ? data.patches : [];
        renderPatchesUi();
        showToast("Патч удалён");
      } catch (err) {
        showToast(err.message || "Не удалось удалить");
      }
    }
  });

  document.getElementById("patch-md-toolbar")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-md]");
    if (!btn) return;
    applyMdToSelection(btn.getAttribute("data-md"));
  });

  document.getElementById("patch-editor-close")?.addEventListener("click", closePatchEditor);
  document.getElementById("patch-editor-cancel")?.addEventListener("click", closePatchEditor);
  document.getElementById("patch-editor")?.addEventListener("click", (e) => {
    if (e.target.id === "patch-editor") closePatchEditor();
  });

  document.getElementById("patch-editor-delete")?.addEventListener("click", async () => {
    if (!canEditPatches() || !patchEditorId) return;
    if (!window.confirm("Удалить этот патч?")) return;
    try {
      const data = await api(`/api/patches/${encodeURIComponent(patchEditorId)}`, {
        method: "DELETE",
      });
      patchesList = Array.isArray(data.patches) ? data.patches : [];
      closePatchEditor();
      renderPatchesUi();
      showToast("Патч удалён");
    } catch (err) {
      showToast(err.message || "Не удалось удалить");
    }
  });

  document.getElementById("patch-editor-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!canEditPatches()) return;
    const title = String(document.getElementById("patch-field-title")?.value || "").trim();
    const version = String(document.getElementById("patch-field-version")?.value || "").trim();
    const body = String(document.getElementById("patch-field-body")?.value || "").trim();
    if (!title) {
      showToast("Укажи название патча");
      return;
    }
    try {
      let data;
      if (patchEditorId) {
        data = await api(`/api/patches/${encodeURIComponent(patchEditorId)}`, {
          method: "PATCH",
          body: JSON.stringify({ title, version, body }),
        });
      } else {
        data = await api("/api/patches", {
          method: "POST",
          body: JSON.stringify({ title, version, body }),
        });
      }
      patchesList = Array.isArray(data.patches) ? data.patches : [];
      closePatchEditor();
      renderPatchesUi();
      showToast("Патч сохранён");
    } catch (err) {
      showToast(err.message || "Не удалось сохранить патч");
    }
  });

  function canEditRules() {
    return String(authUser?.role || "") === "founder";
  }

  function uid(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  async function ensureRulesLoaded(force = false) {
    if (rulesLoaded && !force) return rulesDoc;
    if (rulesLoadPromise && !force) return rulesLoadPromise;
    rulesLoadPromise = (async () => {
      try {
        const data = await api("/api/rules");
        rulesDoc = data.rules || { title: "Правила сервера", intro: "", sections: [] };
        rulesLoaded = true;
        return rulesDoc;
      } catch (err) {
        showToast(err.message || "Не удалось загрузить правила");
        rulesDoc = rulesDoc || { title: "Правила сервера", intro: "", sections: [] };
        return rulesDoc;
      } finally {
        rulesLoadPromise = null;
      }
    })();
    return rulesLoadPromise;
  }

  async function saveRulesDoc() {
    if (!canEditRules() || !rulesDoc) return;
    try {
      const data = await api("/api/rules", {
        method: "PUT",
        body: JSON.stringify({ rules: rulesDoc }),
      });
      if (data.rules) rulesDoc = data.rules;
      renderRulesUi();
    } catch (err) {
      showToast(err.message || "Не удалось сохранить правила");
      throw err;
    }
  }

  function getActiveRulesSection() {
    if (!rulesDoc?.sections?.length) return null;
    return (
      rulesDoc.sections.find((s) => s.id === activeRulesSectionId) ||
      rulesDoc.sections[0] ||
      null
    );
  }

  function openRulesSection(sectionId) {
    activeRulesSectionId = sectionId;
    const body = document.getElementById("rules-body");
    if (body) body.scrollTop = 0;
    renderRulesUi();
  }

  function renderRulesUi() {
    const toc = document.getElementById("rules-toc");
    const titleEl = document.getElementById("rules-doc-title");
    const introEl = document.getElementById("rules-doc-intro");
    const view = document.getElementById("rules-section-view");
    const founderSide = document.getElementById("rules-founder-side");
    const founder = canEditRules();
    if (founderSide) founderSide.hidden = !founder;
    if (!rulesDoc) return;

    if (titleEl) titleEl.textContent = rulesDoc.title || "Правила сервера";
    if (introEl) introEl.textContent = rulesDoc.intro || "";

    const sections = Array.isArray(rulesDoc.sections) ? rulesDoc.sections : [];
    if (toc) {
      toc.innerHTML = sections
        .map((sec) => {
          const active = sec.id === activeRulesSectionId ? " is-active" : "";
          return `<button type="button" class="rules-toc__btn${active}" data-section-id="${escapeHtml(
            sec.id
          )}">${escapeHtml(`${sec.number}. ${sec.title}`)}</button>`;
        })
        .join("");
    }

    if (!view) return;
    const section = getActiveRulesSection();
    if (!section) {
      view.innerHTML = `<p class="rules-pick">Выберите раздел слева</p>`;
      return;
    }

    const itemsHtml = (section.items || [])
      .map((item) => {
        const bullets =
          Array.isArray(item.bullets) && item.bullets.length
            ? `<ul class="rule-sublist">${item.bullets
                .map((b) => `<li>${escapeHtml(b)}</li>`)
                .join("")}</ul>`
            : "";
        const actions = founder
          ? `<div class="rule-item__actions">
              <button type="button" class="rules-mini-btn" data-rules-edit-item="${escapeHtml(
                item.id
              )}">Изменить</button>
              <button type="button" class="rules-mini-btn rules-mini-btn--danger" data-rules-del-item="${escapeHtml(
                item.id
              )}">Удалить</button>
            </div>`
          : "";
        return `<article class="rule-item" data-item-id="${escapeHtml(item.id)}">
          <div class="rule-item__row">
            <span class="rule-num">${escapeHtml(item.code)}.</span>
            <div class="rule-item__body">
              <p class="rule-item__text">${escapeHtml(item.text)}</p>
              ${bullets}
            </div>
          </div>
          ${actions}
        </article>`;
      })
      .join("");

    const founderBar = founder
      ? `<div class="rules-section-actions">
          <button type="button" class="rules-action-btn" id="rules-edit-section">Изменить раздел</button>
          <button type="button" class="rules-action-btn" id="rules-add-item">+ Пункт</button>
          <button type="button" class="rules-action-btn rules-action-btn--danger" id="rules-del-section">Удалить раздел</button>
        </div>`
      : "";

    const penalty = section.penalty
      ? `<ul class="rule-penalty"><li><strong>Наказание:</strong> ${escapeHtml(
          section.penalty
        )}${
          section.penaltyNote
            ? ` <em>${escapeHtml(section.penaltyNote)}</em>`
            : ""
        }</li></ul>`
      : "";
    const note = section.note
      ? `<p class="rule-note">${escapeHtml(section.note)}</p>`
      : "";

    view.innerHTML = `
      ${founderBar}
      <article class="rule-block is-active-section">
        <h2 class="rule-block__title">${escapeHtml(
          `${section.number}. ${section.title}`
        )}</h2>
        <div class="rule-list rule-list--cards">${itemsHtml || `<p class="rules-pick">В этом разделе пока нет пунктов</p>`}</div>
        ${penalty}
        ${note}
      </article>`;
  }

  function setRulesModalFields(mode) {
    const map = {
      intro: ["title", "text"],
      section: ["title", "number", "penalty", "penalty-note", "note"],
      item: ["code", "text", "bullets"],
    };
    const show = new Set(map[mode] || []);
    [
      "title",
      "number",
      "code",
      "text",
      "bullets",
      "penalty",
      "penalty-note",
      "note",
    ].forEach((key) => {
      const wrap = document.getElementById(`rules-field-${key}-wrap`);
      if (wrap) wrap.hidden = !show.has(key);
    });
  }

  function openRulesModal(mode, meta = {}) {
    if (!canEditRules()) return;
    rulesModalMode = mode;
    rulesModalMeta = meta;
    const modal = document.getElementById("rules-modal");
    const title = document.getElementById("rules-modal-title");
    setRulesModalFields(mode);
    const titleInput = document.getElementById("rules-field-title");
    const numberInput = document.getElementById("rules-field-number");
    const codeInput = document.getElementById("rules-field-code");
    const textInput = document.getElementById("rules-field-text");
    const bulletsInput = document.getElementById("rules-field-bullets");
    const penaltyInput = document.getElementById("rules-field-penalty");
    const penaltyNoteInput = document.getElementById("rules-field-penalty-note");
    const noteInput = document.getElementById("rules-field-note");

    if (mode === "intro") {
      if (title) title.textContent = "Вступление";
      if (titleInput) titleInput.value = rulesDoc?.title || "";
      if (textInput) textInput.value = rulesDoc?.intro || "";
    } else if (mode === "section") {
      const sec = meta.section || null;
      if (title) title.textContent = sec ? "Изменить раздел" : "Новый раздел";
      if (titleInput) titleInput.value = sec?.title || "";
      if (numberInput) {
        numberInput.value = sec?.number || (rulesDoc?.sections?.length || 0) + 1;
      }
      if (penaltyInput) penaltyInput.value = sec?.penalty || "";
      if (penaltyNoteInput) penaltyNoteInput.value = sec?.penaltyNote || "";
      if (noteInput) noteInput.value = sec?.note || "";
    } else if (mode === "item") {
      const item = meta.item || null;
      const sec = getActiveRulesSection();
      if (title) title.textContent = item ? "Изменить пункт" : "Новый пункт";
      if (codeInput) {
        codeInput.value =
          item?.code ||
          `${sec?.number || 1}.${(sec?.items?.length || 0) + 1}`;
      }
      if (textInput) textInput.value = item?.text || "";
      if (bulletsInput) {
        bulletsInput.value = Array.isArray(item?.bullets)
          ? item.bullets.join("\n")
          : "";
      }
    }
    if (modal) modal.hidden = false;
  }

  function closeRulesModal() {
    const modal = document.getElementById("rules-modal");
    if (modal) modal.hidden = true;
    rulesModalMode = null;
    rulesModalMeta = null;
  }

  document.getElementById("rules-toc")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".rules-toc__btn[data-section-id]");
    if (!btn) return;
    openRulesSection(btn.getAttribute("data-section-id"));
  });

  document.getElementById("rules-add-section")?.addEventListener("click", () => {
    openRulesModal("section", { section: null });
  });

  document.getElementById("rules-edit-intro")?.addEventListener("click", () => {
    openRulesModal("intro");
  });

  document.getElementById("rules-section-view")?.addEventListener("click", (e) => {
    if (!canEditRules()) return;
    if (e.target.closest("#rules-edit-section")) {
      openRulesModal("section", { section: getActiveRulesSection() });
      return;
    }
    if (e.target.closest("#rules-add-item")) {
      openRulesModal("item", { item: null });
      return;
    }
    if (e.target.closest("#rules-del-section")) {
      const sec = getActiveRulesSection();
      if (!sec || !rulesDoc) return;
      if (!window.confirm(`Удалить раздел «${sec.number}. ${sec.title}»?`)) return;
      rulesDoc.sections = rulesDoc.sections.filter((s) => s.id !== sec.id);
      activeRulesSectionId = rulesDoc.sections[0]?.id || null;
      saveRulesDoc();
      return;
    }
    const editItem = e.target.closest("[data-rules-edit-item]");
    if (editItem) {
      const id = editItem.getAttribute("data-rules-edit-item");
      const sec = getActiveRulesSection();
      const item = sec?.items?.find((it) => it.id === id);
      if (item) openRulesModal("item", { item });
      return;
    }
    const delItem = e.target.closest("[data-rules-del-item]");
    if (delItem) {
      const id = delItem.getAttribute("data-rules-del-item");
      const sec = getActiveRulesSection();
      if (!sec) return;
      if (!window.confirm("Удалить этот пункт?")) return;
      sec.items = (sec.items || []).filter((it) => it.id !== id);
      saveRulesDoc();
    }
  });

  document.getElementById("rules-modal-close")?.addEventListener("click", closeRulesModal);
  document.getElementById("rules-modal-cancel")?.addEventListener("click", closeRulesModal);
  document.getElementById("rules-modal")?.addEventListener("click", (e) => {
    if (e.target.id === "rules-modal") closeRulesModal();
  });

  document.getElementById("rules-modal-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!canEditRules() || !rulesDoc || !rulesModalMode) return;
    const title = String(document.getElementById("rules-field-title")?.value || "").trim();
    const number = Number(document.getElementById("rules-field-number")?.value);
    const code = String(document.getElementById("rules-field-code")?.value || "").trim();
    const text = String(document.getElementById("rules-field-text")?.value || "").trim();
    const bullets = String(document.getElementById("rules-field-bullets")?.value || "")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const penalty = String(document.getElementById("rules-field-penalty")?.value || "").trim();
    const penaltyNote = String(
      document.getElementById("rules-field-penalty-note")?.value || ""
    ).trim();
    const note = String(document.getElementById("rules-field-note")?.value || "").trim();

    try {
      if (rulesModalMode === "intro") {
        rulesDoc.title = title || "Правила сервера";
        rulesDoc.intro = text;
      } else if (rulesModalMode === "section") {
        const existing = rulesModalMeta?.section;
        if (existing) {
          existing.title = title || existing.title;
          existing.number = Number.isFinite(number) && number > 0 ? number : existing.number;
          existing.penalty = penalty;
          existing.penaltyNote = penaltyNote;
          existing.note = note;
        } else {
          const sec = {
            id: uid("s"),
            number: Number.isFinite(number) && number > 0 ? number : rulesDoc.sections.length + 1,
            title: title || "Новый раздел",
            penalty,
            penaltyNote,
            note,
            items: [],
          };
          rulesDoc.sections.push(sec);
          activeRulesSectionId = sec.id;
        }
        rulesDoc.sections.sort((a, b) => a.number - b.number);
      } else if (rulesModalMode === "item") {
        const sec = getActiveRulesSection();
        if (!sec) return;
        const existing = rulesModalMeta?.item;
        if (existing) {
          existing.code = code || existing.code;
          existing.text = text;
          existing.bullets = bullets;
        } else {
          sec.items = sec.items || [];
          sec.items.push({
            id: uid("i"),
            code: code || `${sec.number}.${sec.items.length + 1}`,
            text,
            bullets,
          });
        }
      }
      await saveRulesDoc();
      closeRulesModal();
      showToast("Правила сохранены");
    } catch {
      /* toast already shown */
    }
  });

  buildCatalog();
  updateAuthChrome();

  (async () => {
    await loadProfileFromServer();
    loadFormFromStorage();
    updateRegisterChrome();
    applyAuthUi();
    ensureRulesLoaded();
    ensurePatchesLoaded().then(() => renderPatchesUi());
    if (authToken) {
      ensureServerInfoLoaded().then(() => renderServerTab());
    }
  })();

  /* ---------- Main loop ---------- */
  let last = performance.now();

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = now / 1000;

    updateStars(dt, t);
    updateWind(dt);
    updateFireflies(dt, t);
    updatePlanets(dt);

    requestAnimationFrame(frame);
  }

  createPlanet();
  spawnStars();
  spawnWind();
  spawnFireflies();
  requestAnimationFrame(frame);
})();


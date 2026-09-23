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
  let studioTab = "create"; // create | review
  let studioReviewList = [];
  let studioOpenReviewId = null;
  let studioEditReadOnly = false;
  let studioReviewStatusFilter = "all"; // all | pending | rejected | approved | added
  let studioReviewKindFilter = "all"; // all | folder | race | hidden
  let studioReviewSort = "date-desc";

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
    updateStudioSubtabsUi();
    if (authToken) {
      syncStudioMineStatuses().then(() => {
        if (document.querySelector('.main-tab-panel[data-main-panel="studio"].is-active')) {
          renderStudio();
        }
      });
    } else if (studioTab === "review") {
      studioTab = "create";
      studioOpenReviewId = null;
      studioReviewList = [];
      renderStudio();
    }
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
      if (document.querySelector('.main-tab-panel[data-main-panel="studio"].is-active')) {
        renderStudio();
      }
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
    socket.on("chat:message", (payload) => {
      onChatSocketMessage(payload);
    });
    socket.on("chat:rooms-updated", () => {
      if (document.querySelector('.main-tab-panel[data-main-panel="chat"].is-active')) {
        refreshChatRooms({ keepSelection: true });
      } else {
        chatRoomsDirty = true;
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
    const form =
      user?.form && typeof user.form === "object"
        ? user.form
        : race;
    return {
      raceName: userRaceName(user),
      origin: String(race.origin || form.origin || "").trim(),
      abilities: String(race.abilities || form.abilities || "").trim(),
      traits: String(race.traits || form.traits || "").trim(),
      useful: String(race.useful || form.useful || "").trim(),
      mechanics: String(race.mechanics || form.mechanics || "").trim(),
      blocks: Array.isArray(form.blocks)
        ? form.blocks
        : Array.isArray(race.blocks)
          ? race.blocks
          : [],
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
    const main = rows
      .map(
        ([label, text]) =>
          `<div class="user-profile-race__block"><div class="user-profile-race__label">${escapeHtml(
            label
          )}</div><div class="user-profile-race__text">${escapeHtml(
            text
          )}</div></div>`
      )
      .join("");
    const extraBlocks = Array.isArray(race.blocks) ? race.blocks : [];
    const extra = extraBlocks
      .map((b) => {
        if (!b || typeof b !== "object") return "";
        const title = escapeHtml(
          b.title ||
            (b.type === "text" ? "Текст" : b.type === "craft" ? "Рецепт" : "Файл")
        );
        if (b.type === "text" && b.body) {
          return `<div class="user-profile-race__block"><div class="user-profile-race__label">${title}</div><div class="user-profile-race__text">${escapeHtml(
            String(b.body)
          )}</div></div>`;
        }
        if (b.type === "file" && b.fileName) {
          return `<div class="user-profile-race__block"><div class="user-profile-race__label">${title}</div><div class="user-profile-race__text">${escapeHtml(
            String(b.fileName)
          )}</div></div>`;
        }
        if (b.type === "craft") {
          return `<div class="user-profile-race__block"><div class="user-profile-race__label">${title}</div><div class="user-profile-race__text">Рецепт (${escapeHtml(
            String(b.mode || "3x3")
          )})</div></div>`;
        }
        return "";
      })
      .join("");
    if (!main && !extra) return "";
    return (
      main +
      (extra
        ? `<div class="user-profile-race__sep" aria-hidden="true"></div>${extra}`
        : "")
    );
  }

  let profileViewUser = null;
  let profileDrawerTab = "profile";
  let profilePublished = { race: null, folders: [] };
  let profileContentFolder = null;

  function isFounderViewer() {
    return String(authUser?.role || "") === "founder";
  }

  function roleBadgeMeta(role) {
    switch (role) {
      case "founder":
        return { label: "Основатель", cls: "role-badge--founder" };
      case "admin":
        return { label: "Админ", cls: "role-badge--admin" };
      case "helper":
        return { label: "Помощник", cls: "role-badge--helper" };
      default:
        return { label: "Пользователь", cls: "role-badge--user" };
    }
  }

  function normalizeGuideRole(role) {
    const r = String(role || "").toLowerCase();
    if (r === "founder" || r === "admin" || r === "helper") return r;
    return "user";
  }

  function ensureRoleBadgeEl(id, afterEl) {
    let el = document.getElementById(id);
    if (el) return el;
    if (!afterEl || !afterEl.parentNode) return null;
    el = document.createElement("span");
    el.id = id;
    el.className = "role-badge role-badge--user";
    el.hidden = true;
    afterEl.insertAdjacentElement("afterend", el);
    return el;
  }

  function fillRoleBadge(el, role) {
    if (!el) return;
    const meta = roleBadgeMeta(normalizeGuideRole(role));
    el.className = `role-badge ${meta.cls}`;
    el.textContent = meta.label;
    el.hidden = false;
  }

  function canFounderEditUser(user) {
    if (!isFounderViewer() || !user) return false;
    const viewerId = Number(authUser?.id);
    const targetId = Number(user.id);
    if (!Number.isFinite(viewerId) || !Number.isFinite(targetId)) return false;
    return viewerId !== targetId;
  }

  function setUserProfileTab(tab) {
    const name = ["profile", "race", "content"].includes(tab) ? tab : "profile";
    profileDrawerTab = name;
    document.querySelectorAll("#user-profile-tabs [data-profile-tab]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.getAttribute("data-profile-tab") === name);
    });
    document.querySelectorAll("#user-profile-card [data-profile-panel]").forEach((panel) => {
      const on = panel.getAttribute("data-profile-panel") === name;
      panel.classList.toggle("is-active", on);
      panel.hidden = !on;
    });
  }

  function setUserProfileEditMode(on) {
    const allowed = Boolean(on) && canFounderEditUser(profileViewUser);
    const canEdit = canFounderEditUser(profileViewUser);
    const view = document.getElementById("user-profile-race");
    const edit = document.getElementById("user-profile-race-edit");
    const identityEdit = document.getElementById("user-profile-identity-edit");
    const raceEmpty = document.getElementById("user-profile-race-empty");
    const avatar = document.getElementById("user-profile-avatar");
    const menu = document.getElementById("user-profile-avatar-menu");
    if (identityEdit) {
      identityEdit.hidden = !allowed;
      identityEdit.querySelectorAll("input").forEach((el) => {
        el.disabled = !canEdit;
      });
    }
    if (edit) {
      edit.hidden = !allowed;
      edit.setAttribute("aria-hidden", allowed ? "false" : "true");
      edit.querySelectorAll("input, textarea, button").forEach((el) => {
        el.disabled = !canEdit;
      });
    }
    if (view) {
      const hasHtml = Boolean(view.innerHTML.trim());
      view.hidden = allowed || !hasHtml;
    }
    if (raceEmpty) {
      raceEmpty.hidden = allowed || Boolean(view?.innerHTML.trim());
    }
    if (avatar) {
      avatar.classList.toggle("is-editable", canEdit);
      avatar.tabIndex = canEdit ? 0 : -1;
    }
    if (menu) menu.hidden = !allowed;
  }

  function renderProfilePublishedContent() {
    const raceEl = document.getElementById("user-profile-race");
    const raceEmpty = document.getElementById("user-profile-race-empty");
    const grid = document.getElementById("user-profile-content-grid");
    const contentEmpty = document.getElementById("user-profile-content-empty");
    const editing =
      canFounderEditUser(profileViewUser) &&
      Boolean(document.getElementById("user-profile-race-edit")) &&
      !document.getElementById("user-profile-race-edit").hidden;

    const publishedRace = profilePublished?.race?.race || null;
    if (raceEl) {
      if (!editing && publishedRace) {
        const html = renderRaceBlocks(publishedRace);
        raceEl.innerHTML = html;
        raceEl.hidden = !html;
      } else if (!editing) {
        raceEl.innerHTML = "";
        raceEl.hidden = true;
      }
    }
    if (raceEmpty) {
      raceEmpty.hidden = editing || Boolean(publishedRace);
    }

    if (!grid) return;
    grid.innerHTML = "";

    if (profileContentFolder) {
      const back = document.createElement("button");
      back.type = "button";
      back.className = "user-profile-content-back";
      back.textContent = "← Назад";
      back.addEventListener("click", () => {
        profileContentFolder = null;
        renderProfilePublishedContent();
      });
      grid.appendChild(back);

      const items = Array.isArray(profileContentFolder.payload?.items)
        ? profileContentFolder.payload.items
        : [];
      items.forEach((item) => {
        const type = typeof getCatalogType === "function" ? getCatalogType(item.typeId) : null;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "studio-tile catalog-card user-profile-content-tile";
        const accent =
          typeof normalizeStudioColor === "function"
            ? normalizeStudioColor(
                item.color || profileContentFolder.color || "#8ec8ff"
              )
            : item.color || profileContentFolder.color || "#8ec8ff";
        btn.style.setProperty("--section-accent", accent);
        const icon = type?.icon || "assets/icons/item.png";
        btn.innerHTML = `
          <span class="catalog-card__visual" aria-hidden="true">
            <span class="catalog-card__shadow"></span>
            <img class="catalog-card__img" src="${icon}" alt="" draggable="false" />
          </span>
          <span class="catalog-card__label"></span>
        `;
        btn.querySelector(".catalog-card__label").textContent = item.name || "Анкета";
        btn.addEventListener("click", () => openStudioEditModal(item, { readOnly: true }));
        grid.appendChild(btn);
      });
      if (contentEmpty) contentEmpty.hidden = true;
      return;
    }

    const folders = Array.isArray(profilePublished?.folders) ? profilePublished.folders : [];
    folders.forEach((folder) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "studio-tile studio-tile--folder catalog-card user-profile-content-tile";
      const color =
        typeof normalizeStudioColor === "function"
          ? normalizeStudioColor(folder.color)
          : folder.color || "#8ec8ff";
      btn.style.setProperty("--section-accent", color);
      btn.innerHTML = `
        <span class="catalog-card__visual" aria-hidden="true">
          <span class="catalog-card__shadow"></span>
          <img class="catalog-card__img" src="assets/folder.png" alt="" draggable="false" />
        </span>
        <span class="catalog-card__label"></span>
      `;
      btn.querySelector(".catalog-card__label").textContent = studioVersionLabel(
        folder.name || "Папка",
        folder.version
      );
      btn.addEventListener("click", () => {
        profileContentFolder = folder;
        renderProfilePublishedContent();
      });
      grid.appendChild(btn);
    });
    if (contentEmpty) contentEmpty.hidden = folders.length > 0;
  }

  async function loadProfilePublished(userId) {
    profilePublished = { race: null, folders: [] };
    profileContentFolder = null;
    try {
      const data = await api(`/api/users/${Number(userId)}/published`);
      profilePublished = {
        race: data?.race || null,
        folders: Array.isArray(data?.folders) ? data.folders : [],
      };
    } catch (_) {
      profilePublished = { race: null, folders: [] };
    }
    renderProfilePublishedContent();
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
      throw new Error("Укажи игровой ник");
    }
    if (!AUTH_MC_NICK_RE.test(mcNick)) {
      setHubFieldError(
        "edit-race-error",
        "Игровой ник: 3–16 символов, латиница, цифры и _"
      );
      throw new Error("Некорректный игровой ник");
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
      throw err;
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
    const roleEl = ensureRoleBadgeEl("presence-mini-role", nickEl);
    fillRoleBadge(roleEl, user.role);
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
      profileContentFolder = null;
      setUserProfileTab("profile");
      const nick = String(user.siteNick || user.mcNick || "—").trim() || "—";
      const mcNick = String(user.mcNick || "").trim();
      const status = presenceClass(user);
      fillProfileAvatar(
        document.getElementById("user-profile-avatar"),
        user,
        status
      );
      const nickEl = document.getElementById("user-profile-nick");
      const metaEl = document.getElementById("user-profile-meta");
      const idEl = document.getElementById("user-profile-id");
      if (nickEl) nickEl.textContent = nick;
      const roleEl = ensureRoleBadgeEl("user-profile-role", nickEl);
      fillRoleBadge(roleEl, user.role);
      if (metaEl) {
        metaEl.textContent =
          mcNick && mcNick !== nick ? `игра: ${mcNick}` : "";
        metaEl.hidden = !metaEl.textContent;
      }
      if (idEl) idEl.textContent = `id ${Number(user.id)}`;
      if (canFounderEditUser(user)) fillFounderRaceEdit(user);
      setUserProfileEditMode(false);
      loadProfilePublished(user.id);
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
      profilePublished = { race: null, folders: [] };
      profileContentFolder = null;
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
    updateStudioSubtabsUi();
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
    if (name === "sound") renderSoundSettingsUi();
    if (name === "chat") renderChatSettingsUi();
  }

  /* ---------- Sound / music ---------- */
  const SOUND_PREFS_KEY = "genesis_sound_prefs_v2";
  const SOUND_CLICK_SRC = "assets/sound/click.ogg";
  const SOUND_NOTIFY_SRC = "assets/sound/massage.ogg";
  const SOUND_INDEX_SRC = "assets/sound/music-index.json";
  const SOUND_CATALOG_API = "/api/music/catalog";
  const SOUND_DEFAULT_TRACK = "Minecraft Extended/amethyst.ogg";
  const SOUND_CUSTOM_ROOT = "custom";

  let soundPrefs = {
    sfxVolume: 0.5,
    musicVolume: 0.2,
    musicOn: true,
    orderMode: "forward",
    enabled: {},
    order: [],
    collapsed: {},
    customFolders: [],
  };
  let soundCatalog = { folders: [], tracks: [] };
  let soundTracksById = new Map();
  let soundFoldersById = new Map();
  let soundCustomMeta = []; // { id, title, folderId }
  let soundReady = false;
  let soundMusicAudio = null;
  let soundPreviewAudio = null;
  let soundPreviewId = null;
  let soundPreviewLoadingId = null;
  let soundPlaylistCursor = -1;
  let soundShuffleBag = [];
  let soundUnlockBound = false;
  let soundDragId = null;
  let soundUploadTargetFolder = SOUND_CUSTOM_ROOT;

  function loadSoundPrefs() {
    try {
      const raw = localStorage.getItem(SOUND_PREFS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (typeof parsed.sfxVolume === "number") soundPrefs.sfxVolume = clamp01(parsed.sfxVolume);
      if (typeof parsed.musicVolume === "number") soundPrefs.musicVolume = clamp01(parsed.musicVolume);
      if (typeof parsed.musicOn === "boolean") soundPrefs.musicOn = parsed.musicOn;
      if (["forward", "reverse", "shuffle"].includes(parsed.orderMode)) {
        soundPrefs.orderMode = parsed.orderMode;
      }
      if (parsed.enabled && typeof parsed.enabled === "object") soundPrefs.enabled = parsed.enabled;
      if (Array.isArray(parsed.order)) soundPrefs.order = parsed.order.map(String);
      if (parsed.collapsed && typeof parsed.collapsed === "object") soundPrefs.collapsed = parsed.collapsed;
      if (Array.isArray(parsed.customFolders)) soundPrefs.customFolders = parsed.customFolders;
      if (Array.isArray(parsed.customMeta)) soundCustomMeta = parsed.customMeta;
    } catch (_) {
      /* ignore */
    }
  }

  function saveSoundPrefs() {
    try {
      localStorage.setItem(
        SOUND_PREFS_KEY,
        JSON.stringify({
          ...soundPrefs,
          customMeta: soundCustomMeta.map((t) => ({
            id: t.id,
            title: t.title,
            folderId: t.folderId || SOUND_CUSTOM_ROOT,
          })),
        })
      );
    } catch (_) {
      /* ignore */
    }
  }

  function clamp01(n) {
    const x = Number(n);
    if (!Number.isFinite(x)) return 0;
    return Math.max(0, Math.min(1, x));
  }

  function openSoundDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open("genesis_sound_blobs_v1", 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("tracks")) db.createObjectStore("tracks");
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function idbPutTrack(id, blob) {
    const db = await openSoundDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("tracks", "readwrite");
      tx.objectStore("tracks").put(blob, id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function idbGetTrack(id) {
    const db = await openSoundDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("tracks", "readonly");
      const req = tx.objectStore("tracks").get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  function playSfx(src) {
    const vol = soundPrefs.sfxVolume;
    if (vol <= 0.001) return;
    try {
      const a = new Audio(src);
      a.volume = vol;
      a.play().catch(() => {});
    } catch (_) {
      /* ignore */
    }
  }

  function playClickSound() {
    playSfx(SOUND_CLICK_SRC);
  }

  function playNotifySound() {
    playSfx(SOUND_NOTIFY_SRC);
  }

  function bindSoundUnlock() {
    if (soundUnlockBound) return;
    soundUnlockBound = true;
    const unlock = () => {
      ensureMusicPlaying();
      document.removeEventListener("pointerdown", unlock, true);
      document.removeEventListener("keydown", unlock, true);
    };
    document.addEventListener("pointerdown", unlock, true);
    document.addEventListener("keydown", unlock, true);
  }

  function rebuildSoundMaps() {
    soundFoldersById = new Map();
    soundTracksById = new Map();

    // built-in folders from index
    for (const folder of soundCatalog.folders || []) {
      soundFoldersById.set(folder.id, {
        id: folder.id,
        label: folder.label,
        parentId: folder.parentId || null,
        builtin: true,
      });
    }
    // ensure custom root
    if (!soundFoldersById.has(SOUND_CUSTOM_ROOT)) {
      soundFoldersById.set(SOUND_CUSTOM_ROOT, {
        id: SOUND_CUSTOM_ROOT,
        label: "Своя музыка",
        parentId: null,
        builtin: false,
      });
    }
    for (const folder of soundPrefs.customFolders || []) {
      if (!folder?.id) continue;
      soundFoldersById.set(folder.id, {
        id: String(folder.id),
        label: String(folder.label || "Папка"),
        parentId: folder.parentId ? String(folder.parentId) : null,
        builtin: false,
      });
    }

    for (const track of soundCatalog.tracks || []) {
      soundTracksById.set(track.id, {
        ...track,
        folderId: track.folderPath || track.folderId,
        custom: false,
      });
    }
    for (const track of soundCustomMeta) {
      soundTracksById.set(track.id, {
        id: track.id,
        title: track.title,
        folderId: track.folderId || SOUND_CUSTOM_ROOT,
        src: null,
        custom: true,
      });
    }
  }

  function applyDefaultEnabledTracks() {
    const known = [...soundTracksById.keys()];
    const hasAny = Object.keys(soundPrefs.enabled).some((id) => soundTracksById.has(id));
    if (hasAny) return;
    for (const id of known) soundPrefs.enabled[id] = id === SOUND_DEFAULT_TRACK;
    if (soundTracksById.has(SOUND_DEFAULT_TRACK)) {
      soundPrefs.order = [
        SOUND_DEFAULT_TRACK,
        ...known.filter((id) => id !== SOUND_DEFAULT_TRACK),
      ];
    }
  }

  function syncSoundOrderWithCatalog() {
    const known = [...soundTracksById.keys()];
    const knownSet = new Set(known);
    const nextOrder = soundPrefs.order.filter((id) => knownSet.has(id));
    for (const id of known) {
      if (!nextOrder.includes(id)) nextOrder.push(id);
      if (soundPrefs.enabled[id] == null) {
        soundPrefs.enabled[id] = id === SOUND_DEFAULT_TRACK;
      }
    }
    for (const id of Object.keys(soundPrefs.enabled)) {
      if (!knownSet.has(id)) delete soundPrefs.enabled[id];
    }
    soundPrefs.order = nextOrder;
  }

  function getEnabledOrderedIds() {
    const base = soundPrefs.order.filter((id) => soundPrefs.enabled[id]);
    if (soundPrefs.orderMode === "reverse") return [...base].reverse();
    if (soundPrefs.orderMode === "shuffle") {
      if (!soundShuffleBag.length || soundShuffleBag.length !== base.length) {
        soundShuffleBag = [...base];
        for (let i = soundShuffleBag.length - 1; i > 0; i -= 1) {
          const j = Math.floor(Math.random() * (i + 1));
          [soundShuffleBag[i], soundShuffleBag[j]] = [soundShuffleBag[j], soundShuffleBag[i]];
        }
      }
      return soundShuffleBag;
    }
    return base;
  }

  let soundFailToastAt = 0;
  let soundFailSkip = new Set();

  function notifySoundLoadFail(id, src) {
    console.warn("Sound load failed", id, src);
    const now = Date.now();
    if (now - soundFailToastAt > 4000) {
      soundFailToastAt = now;
      if (typeof showToast === "function") {
        showToast("Не удалось загрузить трек с Google Drive");
      }
    }
  }

  function gdriveStreamUrl(driveId) {
    return `/api/music/stream/${encodeURIComponent(driveId)}`;
  }

  async function resolveTrackSrc(track) {
    if (!track) return null;
    if (track.custom) {
      const blob = await idbGetTrack(track.id);
      if (!blob) return null;
      return URL.createObjectURL(blob);
    }
    const driveId =
      track.driveId ||
      (String(track.src || "").startsWith("gdrive:")
        ? String(track.src).slice("gdrive:".length)
        : null);
    if (driveId) return gdriveStreamUrl(driveId);

    // legacy local / relative paths
    const raw = String(track.src || "").replace(/\\/g, "/");
    return raw
      .split("/")
      .map((part) => {
        if (!part || part.includes("%")) return part;
        return encodeURIComponent(part);
      })
      .join("/");
  }

  async function playMusicById(id, { preview = false } = {}) {
    const track = soundTracksById.get(id);
    if (!track) return;
    if (!preview && !soundPrefs.musicOn) return;
    if (soundFailSkip.has(id) && !track.custom) return;

    if (preview) {
      // Pause button: stop preview of this track
      if (
        soundPreviewId === id &&
        !soundPreviewLoadingId &&
        soundPreviewAudio &&
        !soundPreviewAudio.paused
      ) {
        stopMusicPreview();
        ensureMusicPlaying();
        renderSoundSettingsUi();
        return;
      }

      stopMusicPreview();
      soundPreviewId = id;
      soundPreviewLoadingId = id;
      renderSoundSettingsUi();

      const src = await resolveTrackSrc(track);
      if (!src) {
        notifySoundLoadFail(id, null);
        stopMusicPreview();
        renderSoundSettingsUi();
        return;
      }
      // User switched to another preview while we resolved src
      if (soundPreviewLoadingId !== id && soundPreviewId !== id) return;

      soundPreviewAudio = new Audio(src);
      soundPreviewAudio.volume = soundPrefs.musicVolume;
      soundPreviewAudio.preload = "auto";
      soundPreviewAudio.onended = () => {
        stopMusicPreview();
        ensureMusicPlaying();
        renderSoundSettingsUi();
      };
      soundPreviewAudio.onerror = () => {
        notifySoundLoadFail(id, src);
        stopMusicPreview();
        renderSoundSettingsUi();
      };
      soundPreviewAudio.onplaying = () => {
        if (soundPreviewId === id) {
          soundPreviewLoadingId = null;
          renderSoundSettingsUi();
        }
      };

      if (soundMusicAudio && !soundMusicAudio.paused) soundMusicAudio.pause();

      try {
        await soundPreviewAudio.play();
        if (soundPreviewId === id) soundPreviewLoadingId = null;
      } catch (err) {
        console.warn("Sound preview failed", err);
        if (soundPreviewId === id) {
          stopMusicPreview();
        }
      }
      renderSoundSettingsUi();
      return;
    }

    const src = await resolveTrackSrc(track);
    if (!src) {
      notifySoundLoadFail(id, null);
      return;
    }

    stopMusicPreview();
    if (!soundMusicAudio) {
      soundMusicAudio = new Audio();
      soundMusicAudio.preload = "auto";
      soundMusicAudio.addEventListener("ended", () => playNextMusicTrack());
      soundMusicAudio.addEventListener("error", () => {
        const failedId = soundMusicAudio?.dataset.trackId;
        if (failedId) {
          soundFailSkip.add(failedId);
          notifySoundLoadFail(failedId, soundMusicAudio?.currentSrc || src);
        }
        try {
          soundMusicAudio.pause();
          soundMusicAudio.removeAttribute("src");
          soundMusicAudio.load();
        } catch (_) {
          /* ignore */
        }
        delete soundMusicAudio.dataset.trackId;
        const list = getEnabledOrderedIds().filter((tid) => !soundFailSkip.has(tid));
        if (list.length) playNextMusicTrack();
        else stopBackgroundMusic();
      });
    }
    soundMusicAudio.volume = soundPrefs.musicVolume;
    soundMusicAudio.muted = false;
    if (
      soundMusicAudio.dataset.trackId === id &&
      !soundMusicAudio.paused &&
      soundMusicAudio.readyState >= 2
    ) {
      return;
    }
    soundMusicAudio.src = src;
    soundMusicAudio.dataset.trackId = id;
    try {
      await soundMusicAudio.play();
    } catch (err) {
      console.warn("Sound play failed", id, src, err);
      if (err && err.name === "NotAllowedError") return;
      soundFailSkip.add(id);
      notifySoundLoadFail(id, src);
    }
  }

  function stopMusicPreview() {
    if (soundPreviewAudio) {
      soundPreviewAudio.pause();
      soundPreviewAudio = null;
    }
    soundPreviewId = null;
    soundPreviewLoadingId = null;
  }

  function stopBackgroundMusic() {
    if (soundMusicAudio) {
      try {
        soundMusicAudio.pause();
        soundMusicAudio.removeAttribute("src");
        soundMusicAudio.load();
      } catch (_) {
        /* ignore */
      }
      delete soundMusicAudio.dataset.trackId;
    }
    soundPlaylistCursor = -1;
  }

  function playNextMusicTrack() {
    if (!soundPrefs.musicOn) {
      stopBackgroundMusic();
      return;
    }
    const list = getEnabledOrderedIds().filter((id) => !soundFailSkip.has(id));
    if (!list.length) {
      stopBackgroundMusic();
      return;
    }
    soundPlaylistCursor = (soundPlaylistCursor + 1) % list.length;
    playMusicById(list[soundPlaylistCursor]);
  }

  function ensureMusicPlaying() {
    if (!soundPrefs.musicOn) return;
    if (soundPrefs.musicVolume <= 0.001) return;
    if (soundPreviewId) return;
    const list = getEnabledOrderedIds().filter((id) => !soundFailSkip.has(id));
    if (!list.length) {
      stopBackgroundMusic();
      return;
    }
    if (
      soundMusicAudio &&
      !soundMusicAudio.paused &&
      soundMusicAudio.readyState >= 2 &&
      soundMusicAudio.dataset.trackId
    ) {
      return;
    }
    if (soundPlaylistCursor < 0 || soundPlaylistCursor >= list.length) {
      const prefer = list.indexOf(SOUND_DEFAULT_TRACK);
      soundPlaylistCursor = prefer >= 0 ? prefer : 0;
    }
    playMusicById(list[soundPlaylistCursor]);
  }

  function applyMusicVolume() {
    if (soundMusicAudio) soundMusicAudio.volume = soundPrefs.musicVolume;
    if (soundPreviewAudio) soundPreviewAudio.volume = soundPrefs.musicVolume;
    if (soundPrefs.musicVolume <= 0.001) {
      soundMusicAudio?.pause();
      stopMusicPreview();
    } else {
      ensureMusicPlaying();
    }
  }

  function getChildFolders(parentId) {
    return [...soundFoldersById.values()]
      .filter((f) => (f.parentId || null) === (parentId || null))
      .sort((a, b) => a.label.localeCompare(b.label, "ru"));
  }

  function getTracksInFolder(folderId) {
    const ids = soundPrefs.order.filter((id) => {
      const t = soundTracksById.get(id);
      return t && t.folderId === folderId;
    });
    return ids.map((id) => soundTracksById.get(id)).filter(Boolean);
  }

  function getTracksInFolderTree(folderId) {
    const prefix = `${folderId}/`;
    return [...soundTracksById.values()].filter((t) => {
      const fid = t.folderId || "";
      return fid === folderId || fid.startsWith(prefix);
    });
  }

  function toggleFolderPlaylist(folderId) {
    const tracks = getTracksInFolderTree(folderId);
    if (!tracks.length) return;
    const allOn = tracks.every((t) => soundPrefs.enabled[t.id]);
    const next = !allOn;
    for (const t of tracks) soundPrefs.enabled[t.id] = next;
    soundShuffleBag = [];
    saveSoundPrefs();
    const list = getEnabledOrderedIds();
    if (!list.length) {
      stopBackgroundMusic();
      stopMusicPreview();
    } else if (
      soundMusicAudio?.dataset.trackId &&
      !soundPrefs.enabled[soundMusicAudio.dataset.trackId]
    ) {
      playNextMusicTrack();
    } else {
      ensureMusicPlaying();
    }
    renderSoundSettingsUi();
  }

  function createSoundFolder(parentId) {
    const label = String(window.prompt("Название папки:", "Новая папка") || "").trim();
    if (!label) return;
    const id = parentId
      ? `${parentId}/${Date.now().toString(36)}`
      : `custom/${Date.now().toString(36)}`;
    soundPrefs.customFolders.push({
      id,
      label,
      parentId: parentId || null,
    });
    soundPrefs.collapsed[id] = false;
    rebuildSoundMaps();
    saveSoundPrefs();
    renderSoundSettingsUi();
  }

  function makeTrackRow(track, listEl) {
    const row = document.createElement("div");
    row.className = "sound-track";
    row.draggable = true;
    row.dataset.trackId = track.id;

    const isLoading = soundPreviewLoadingId === track.id;
    const isPlaying =
      soundPreviewId === track.id && !isLoading && soundPreviewAudio && !soundPreviewAudio.paused;

    const playBtn = document.createElement("button");
    playBtn.type = "button";
    playBtn.className = "sound-track__play";
    if (isLoading) playBtn.classList.add("is-loading");
    if (isPlaying) playBtn.classList.add("is-active", "is-playing");
    if (isLoading) {
      playBtn.innerHTML =
        '<span class="sound-track__dots" aria-hidden="true"><i></i><i></i><i></i></span>';
      playBtn.title = "Загрузка…";
    } else if (isPlaying) {
      playBtn.textContent = "❚❚";
      playBtn.title = "Пауза";
    } else {
      playBtn.textContent = "▶";
      playBtn.title = "Прослушать";
    }
    playBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (isLoading) return;
      if (isPlaying) {
        stopMusicPreview();
        ensureMusicPlaying();
        renderSoundSettingsUi();
        return;
      }
      playMusicById(track.id, { preview: true });
    });

    const name = document.createElement("div");
    name.className = "sound-track__name";
    name.textContent = track.title || track.id;

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "sound-track__toggle";
    const on = Boolean(soundPrefs.enabled[track.id]);
    toggle.classList.toggle("is-on", on);
    toggle.textContent = on ? "×" : "";
    toggle.title = on ? "Выключить" : "Включить";
    toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      soundPrefs.enabled[track.id] = !soundPrefs.enabled[track.id];
      soundShuffleBag = [];
      saveSoundPrefs();
      const list = getEnabledOrderedIds();
      if (!list.length) {
        stopBackgroundMusic();
        stopMusicPreview();
      } else if (
        !soundPrefs.enabled[track.id] &&
        soundMusicAudio?.dataset.trackId === track.id
      ) {
        playNextMusicTrack();
      } else {
        ensureMusicPlaying();
      }
      renderSoundSettingsUi();
    });

    row.addEventListener("dragstart", (e) => {
      soundDragId = track.id;
      row.classList.add("is-dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", track.id);
    });
    row.addEventListener("dragend", () => {
      soundDragId = null;
      row.classList.remove("is-dragging");
      listEl.querySelectorAll(".sound-track.is-drag-over").forEach((el) => el.classList.remove("is-drag-over"));
    });
    row.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      row.classList.add("is-drag-over");
    });
    row.addEventListener("dragleave", () => row.classList.remove("is-drag-over"));
    row.addEventListener("drop", (e) => {
      e.preventDefault();
      row.classList.remove("is-drag-over");
      const fromId = soundDragId || e.dataTransfer.getData("text/plain");
      const toId = track.id;
      if (!fromId || fromId === toId) return;
      const fromTrack = soundTracksById.get(fromId);
      const toTrack = soundTracksById.get(toId);
      if (fromTrack && toTrack) fromTrack.folderId = toTrack.folderId;
      if (fromTrack?.custom) {
        const meta = soundCustomMeta.find((t) => t.id === fromId);
        if (meta) meta.folderId = toTrack.folderId;
      }
      const order = [...soundPrefs.order];
      const from = order.indexOf(fromId);
      const to = order.indexOf(toId);
      if (from < 0 || to < 0) return;
      order.splice(from, 1);
      order.splice(to, 0, fromId);
      soundPrefs.order = order;
      soundShuffleBag = [];
      saveSoundPrefs();
      renderSoundSettingsUi();
    });

    row.append(playBtn, name, toggle);
    return row;
  }

  function renderSoundFolder(folderId, container, listEl, nested) {
    const folder = soundFoldersById.get(folderId);
    if (!folder) return;
    const section = document.createElement("section");
    section.className = `sound-group${nested ? " is-nested" : ""}`;
    const collapsed = Boolean(soundPrefs.collapsed[folderId]);

    const head = document.createElement("div");
    head.className = "sound-group__head";

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "sound-group__toggle";
    toggle.textContent = collapsed ? "+" : "−";
    toggle.title = collapsed ? "Развернуть" : "Свернуть";
    toggle.addEventListener("click", () => {
      soundPrefs.collapsed[folderId] = !collapsed;
      saveSoundPrefs();
      renderSoundSettingsUi();
    });

    const title = document.createElement("h3");
    title.className = "sound-group__title";
    title.textContent = folder.label;
    title.title = collapsed ? "Развернуть" : "Свернуть";
    title.addEventListener("click", () => {
      soundPrefs.collapsed[folderId] = !collapsed;
      saveSoundPrefs();
      renderSoundSettingsUi();
    });

    const folderEnable = document.createElement("button");
    folderEnable.type = "button";
    folderEnable.className = "sound-group__folder-toggle";
    const folderTracks = getTracksInFolderTree(folderId);
    const folderAllOn =
      folderTracks.length > 0 && folderTracks.every((t) => soundPrefs.enabled[t.id]);
    const folderSomeOn = folderTracks.some((t) => soundPrefs.enabled[t.id]);
    folderEnable.classList.toggle("is-on", folderAllOn);
    folderEnable.classList.toggle("is-partial", folderSomeOn && !folderAllOn);
    folderEnable.textContent = folderAllOn || folderSomeOn ? "×" : "";
    folderEnable.title = folderAllOn
      ? "Выключить всю музыку в папке"
      : "Включить всю музыку в папке";
    folderEnable.disabled = folderTracks.length === 0;
    folderEnable.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFolderPlaylist(folderId);
    });

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "sound-group__add";
    addBtn.textContent = "+";
    addBtn.title = "Подпапка";
    addBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      createSoundFolder(folderId);
    });

    const uploadHere = document.createElement("button");
    uploadHere.type = "button";
    uploadHere.className = "sound-group__add";
    uploadHere.textContent = "♪";
    uploadHere.title = "Загрузить сюда";
    uploadHere.addEventListener("click", (e) => {
      e.stopPropagation();
      soundUploadTargetFolder = folderId;
      document.getElementById("sound-upload-input")?.click();
    });

    head.append(toggle, title, folderEnable, uploadHere, addBtn);
    section.appendChild(head);

    const body = document.createElement("div");
    body.className = "sound-group__body";
    body.hidden = collapsed;

    if (!collapsed) {
      if (folderId === "T_en_M") {
        const ytLink = document.createElement("a");
        ytLink.className = "sound-group__link";
        ytLink.href = "https://www.youtube.com/@TenM";
        ytLink.target = "_blank";
        ytLink.rel = "noopener noreferrer";
        ytLink.textContent = "YouTube · @TenM";
        ytLink.title = "Открыть канал T_en_M";
        body.appendChild(ytLink);
      }
      // Tracks first (e.g. amethyst), then subfolders
      getTracksInFolder(folderId).forEach((track) => {
        body.appendChild(makeTrackRow(track, listEl));
      });
      getChildFolders(folderId).forEach((child) => {
        renderSoundFolder(child.id, body, listEl, true);
      });
    }

    section.appendChild(body);
    container.appendChild(section);
  }

  function renderSoundSettingsUi() {
    const sfxRange = document.getElementById("sound-sfx-volume");
    const musicRange = document.getElementById("sound-music-volume");
    const sfxVal = document.getElementById("sound-sfx-volume-val");
    const musicVal = document.getElementById("sound-music-volume-val");
    if (sfxRange) sfxRange.value = String(Math.round(soundPrefs.sfxVolume * 100));
    if (musicRange) musicRange.value = String(Math.round(soundPrefs.musicVolume * 100));
    if (sfxVal) sfxVal.textContent = `${Math.round(soundPrefs.sfxVolume * 100)}%`;
    if (musicVal) musicVal.textContent = `${Math.round(soundPrefs.musicVolume * 100)}%`;

    document.querySelectorAll("[data-sound-order]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.getAttribute("data-sound-order") === soundPrefs.orderMode);
    });

    const masterBtn = document.getElementById("sound-music-master");
    if (masterBtn) {
      const on = Boolean(soundPrefs.musicOn);
      masterBtn.classList.toggle("is-on", on);
      masterBtn.setAttribute("aria-pressed", on ? "true" : "false");
      masterBtn.textContent = on ? "Музыка: Вкл" : "Музыка: Выкл";
    }

    const listEl = document.getElementById("sound-music-list");
    if (!listEl || !soundReady) return;
    listEl.innerHTML = "";

    getChildFolders(null).forEach((folder) => {
      renderSoundFolder(folder.id, listEl, listEl, false);
    });
  }

  async function initSoundSystem() {
    loadSoundPrefs();
    try {
      let res = await fetch(SOUND_CATALOG_API);
      if (!res.ok) res = await fetch(SOUND_INDEX_SRC);
      if (res.ok) soundCatalog = await res.json();
    } catch (_) {
      try {
        const res = await fetch(SOUND_INDEX_SRC);
        if (res.ok) soundCatalog = await res.json();
      } catch (_) {
        soundCatalog = { folders: [], tracks: [] };
      }
    }
    // migrate old group-based index if needed
    if (!soundCatalog.tracks && Array.isArray(soundCatalog.groups)) {
      const tracks = [];
      const folderSet = new Set();
      for (const g of soundCatalog.groups) {
        folderSet.add(g.id || g.label);
        for (const t of g.tracks || []) {
          const id = String(t.id || "").replace(/\\/g, "/");
          tracks.push({
            ...t,
            id,
            src: String(t.src || "").replace(/\\/g, "/"),
            folderPath: g.id || g.label,
          });
        }
      }
      soundCatalog = {
        folders: [...folderSet].map((id) => ({ id, label: id, parentId: null })),
        tracks,
      };
    }

    rebuildSoundMaps();
    applyDefaultEnabledTracks();
    syncSoundOrderWithCatalog();
    saveSoundPrefs();
    soundReady = true;
    renderSoundSettingsUi();
    bindSoundUnlock();

    document.getElementById("sound-sfx-volume")?.addEventListener("input", (e) => {
      soundPrefs.sfxVolume = clamp01(Number(e.target.value) / 100);
      document.getElementById("sound-sfx-volume-val").textContent = `${e.target.value}%`;
      saveSoundPrefs();
    });
    document.getElementById("sound-music-volume")?.addEventListener("input", (e) => {
      soundPrefs.musicVolume = clamp01(Number(e.target.value) / 100);
      document.getElementById("sound-music-volume-val").textContent = `${e.target.value}%`;
      saveSoundPrefs();
      applyMusicVolume();
    });
    document.querySelectorAll("[data-sound-order]").forEach((btn) => {
      btn.addEventListener("click", () => {
        soundPrefs.orderMode = btn.getAttribute("data-sound-order");
        soundShuffleBag = [];
        soundPlaylistCursor = -1;
        saveSoundPrefs();
        renderSoundSettingsUi();
        ensureMusicPlaying();
      });
    });
    document.getElementById("sound-upload-btn")?.addEventListener("click", () => {
      soundUploadTargetFolder = SOUND_CUSTOM_ROOT;
      document.getElementById("sound-upload-input")?.click();
    });
    document.getElementById("sound-new-folder-btn")?.addEventListener("click", () => {
      createSoundFolder(null);
    });
    document.getElementById("sound-music-master")?.addEventListener("click", () => {
      soundPrefs.musicOn = !soundPrefs.musicOn;
      saveSoundPrefs();
      if (!soundPrefs.musicOn) {
        stopMusicPreview();
        stopBackgroundMusic();
      } else {
        ensureMusicPlaying();
      }
      renderSoundSettingsUi();
    });
    document.getElementById("sound-upload-input")?.addEventListener("change", async (e) => {
      const files = [...(e.target.files || [])];
      e.target.value = "";
      const folderId = soundUploadTargetFolder || SOUND_CUSTOM_ROOT;
      if (!soundFoldersById.has(folderId)) {
        soundPrefs.customFolders.push({
          id: SOUND_CUSTOM_ROOT,
          label: "Своя музыка",
          parentId: null,
        });
      }
      for (const file of files) {
        if (!file.type.startsWith("audio/") && !/\.(ogg|mp3|wav|m4a|flac)$/i.test(file.name)) continue;
        const id = `custom_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
        await idbPutTrack(id, file);
        soundCustomMeta.push({
          id,
          title: file.name.replace(/\.[^.]+$/, ""),
          folderId,
        });
        soundPrefs.enabled[id] = false;
        soundPrefs.order.unshift(id);
      }
      rebuildSoundMaps();
      syncSoundOrderWithCatalog();
      saveSoundPrefs();
      renderSoundSettingsUi();
      showToast("Музыка добавлена");
    });

    document.addEventListener(
      "click",
      (e) => {
        const t = e.target.closest(
          "button, .mc-btn, .hub-nav__btn, .main-tabs__btn, .catalog-card, .studio-tile, .studio-ctx__btn, .sound-track__play, .sound-track__toggle, .sound-order-btn, .sound-group__toggle, .sound-group__add, .sound-group__folder-toggle, .sound-master-toggle, .sound-group__link, a.footer-link"
        );
        if (!t) return;
        if (t.closest("#sound-sfx-volume, #sound-music-volume")) return;
        playClickSound();
      },
      true
    );
  }

  initSoundSystem();

  const COMPENDIUM_LINES = [
    "Компендиума пока не доступен.",
    "Подождите пока выйдет обновление.",
  ];
  const COMPENDIUM_BOOK_W = 281;
  const COMPENDIUM_BOOK_H = 173;
  const COMPENDIUM_TEXT_COLOR = "#3f2a1d";
  // Glyphs stay pixel-crisp; size relative to book ≈ FONT_SCALE / UPSCALE.
  const COMPENDIUM_UPSCALE = 3;
  const COMPENDIUM_FONT_SCALE = 2;
  const COMPENDIUM_BOOK_SRC = "assets/compendium/compendium.png";
  // Content boxes inside each page (native book pixels, away from rings).
  const COMPENDIUM_PAGES = [
    { x: 20, y: 26, w: 108, h: 120 },
    { x: 152, y: 26, w: 108, h: 120 },
  ];

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

      const ups = COMPENDIUM_UPSCALE;
      const scale = COMPENDIUM_FONT_SCALE;
      const lineGap = 4 * scale;
      const page = COMPENDIUM_PAGES[0];

      canvas.width = COMPENDIUM_BOOK_W * ups;
      canvas.height = COMPENDIUM_BOOK_H * ups;
      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

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

      let y = Math.round(page.y * ups + Math.max(0, (page.h * ups - blockH) / 2));
      for (let i = 0; i < COMPENDIUM_LINES.length; i += 1) {
        const line = COMPENDIUM_LINES[i];
        const lh = lineHeights[i];
        const lw = measureCompendiumLine(glyphs, line, scale);
        const maxW = page.w * ups;
        const x = Math.round(page.x * ups + Math.max(0, (maxW - lw) / 2));
        const baseline = y + Math.round(lh * 0.85);
        drawCompendiumLine(ctx, glyphs, line, x, baseline, scale, COMPENDIUM_TEXT_COLOR);
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

  let guideActiveRole = "user";

  const GUIDE_CONTENT = {
    user: {
      label: "Игрок",
      sections: [
        {
          title: "Регистрация и вход",
          paragraphs: [
            "Чтобы пользоваться сайтом, зарегистрируйтесь или войдите через экран авторизации.",
            "После входа доступны студия, заказы, профиль и остальные разделы.",
          ],
          items: [
            "Ник на сайте и игровой ник можно задать в профиле.",
            "Сохраняйте пароль: без входа часть функций недоступна.",
          ],
        },
        {
          title: "Профиль",
          paragraphs: [
            "Откройте свой аватар слева в полоске игроков — откроются настройки и профиль.",
            "В профиле видны ник, id, раса и одобренный контент.",
          ],
          items: [
            "Вкладка «Профиль» — ник, аватар, мета.",
            "Вкладка «Раса» — одобренная расовая анкета.",
            "Вкладка «Контент» — опубликованные папки и файлы.",
          ],
        },
        {
          title: "Раса",
          paragraphs: [
            "Расовая анкета заполняется в студии и проходит модерацию.",
            "После одобрения раса отображается в профиле и в мини-карточке игрока.",
          ],
        },
        {
          title: "Студия",
          paragraphs: [
            "Студия — место для создания контента: папки, файлы и анкеты.",
          ],
          subsections: [
            {
              title: "Папки и файлы",
              items: [
                "Создавайте папки и загружайте материалы в свои проекты.",
                "Организуйте контент так, чтобы модераторам было удобно проверять.",
              ],
            },
            {
              title: "Анкеты и отправка",
              items: [
                "Заполните анкету по выбранному типу контента.",
                "Отправьте на проверку — статус появится в студии.",
              ],
            },
            {
              title: "Звёзды",
              items: [
                "Звезда у пункта показывает готовность или статус проверки.",
                "Следите за подсказками у звёзд — они поясняют текущее состояние.",
              ],
            },
          ],
        },
        {
          title: "Заказы",
          paragraphs: [
            "Во вкладке «Заказы» можно заказать скин или модель.",
          ],
          items: [
            "Выберите тип: скин или модель, заполните форму и отправьте.",
            "В списке анкет видны ваши заказы и их статусы (ожидание, принято, отклонено).",
            "После принятия заказа следите за обновлениями в карточке заказа.",
          ],
        },
        {
          title: "Правила",
          paragraphs: [
            "Раздел «Правила» содержит правила сервера и сайта. Читайте их перед игрой и публикацией контента.",
          ],
        },
        {
          title: "Сервер и мод",
          paragraphs: [
            "Во вкладке «Сервер» — информация о подключении, версии и моде.",
            "Скачивайте актуальный мод оттуда, если он доступен для вашей роли.",
          ],
        },
        {
          title: "Патч-ноут",
          paragraphs: [
            "Патч-ноут — журнал обновлений сервера и сайта. Читайте записи, чтобы знать, что изменилось.",
          ],
        },
        {
          title: "Компендиум",
          paragraphs: [
            "Компендиум — справочник вселенной Genesis. Откройте вкладку и листайте книгу на экране.",
          ],
        },
      ],
    },
    helper: {
      label: "Помощник",
      sections: [
        {
          title: "Права помощника",
          paragraphs: [
            "Помощник видит расширенные разделы студии и панели персонала с ограниченными правами.",
          ],
          items: [
            "Доступна staff-панель, но не все команды и действия — только разрешённые роли.",
            "Можно помогать с проверкой контента в рамках выданных прав.",
            "Нельзя менять роли, банить как админ или править правила/патчи основателя.",
          ],
        },
        {
          title: "Студия и заказы",
          paragraphs: [
            "Помогайте игрокам с анкетами и заказами: подсказывайте статусы и корректное оформление.",
            "Действия модерации выполняйте только если они доступны в интерфейсе вашей роли.",
          ],
        },
        {
          title: "Поведение",
          items: [
            "Будьте вежливы и опирайтесь на правила раздела «Правила».",
            "Спорные случаи передавайте админу или основателю.",
          ],
        },
      ],
    },
    admin: {
      label: "Админ",
      sections: [
        {
          title: "Администрирование",
          paragraphs: [
            "Админ управляет доступом игроков и модерацией поверх прав помощника.",
          ],
          items: [
            "Выдача и снятие прав (permissions) в рамках доступных команд.",
            "Баны и наказания через staff-панель / консоль, если команда доступна.",
            "Проверка студии и заказов наравне со staff-функциями.",
          ],
        },
        {
          title: "Ограничения",
          paragraphs: [
            "Редактирование правил, патч-ноута, загрузка мода и финальное approve/reject/added в полном объёме — зона основателя, если иное не выдано отдельно.",
          ],
        },
      ],
    },
    founder: {
      label: "Основатель",
      sections: [
        {
          title: "Полный доступ",
          paragraphs: [
            "Основатель имеет все возможности игрока, помощника и админа плюс управление контентом платформы.",
          ],
        },
        {
          title: "Проверка студии",
          items: [
            "Approve — одобрить анкету.",
            "Reject — отклонить с причиной при необходимости.",
            "Added — отметить как добавленное на сервер / в каталог.",
          ],
        },
        {
          title: "Заказы",
          paragraphs: [
            "Просмотр и ревью заказов: принять, отклонить, прикрепить готовые скины.",
          ],
        },
        {
          title: "Правила, мод, патчи",
          items: [
            "Редактирование разделов правил.",
            "Загрузка и обновление мода на вкладке «Сервер».",
            "Создание и правка записей патч-ноута.",
          ],
        },
        {
          title: "Профили",
          paragraphs: [
            "Можно редактировать чужие профили и расы (кроме своего аккаунта в режиме founder-edit).",
          ],
        },
      ],
    },
  };

  function guideRolesForViewer() {
    if (!authToken || !authUser) return ["user"];
    const role = normalizeGuideRole(authUser.role);
    if (role === "founder") return ["user", "helper", "admin", "founder"];
    if (role === "admin") return ["user", "helper", "admin"];
    if (role === "helper") return ["user", "helper"];
    return ["user"];
  }

  function renderGuideSection(section) {
    const wrap = document.createElement("section");
    wrap.className = "guide-section";

    const h2 = document.createElement("h2");
    h2.textContent = section.title || "";
    wrap.appendChild(h2);

    (section.paragraphs || []).forEach((text) => {
      const p = document.createElement("p");
      p.textContent = text;
      wrap.appendChild(p);
    });

    if (section.items?.length) {
      const ul = document.createElement("ul");
      section.items.forEach((item) => {
        const li = document.createElement("li");
        li.textContent = item;
        ul.appendChild(li);
      });
      wrap.appendChild(ul);
    }

    (section.subsections || []).forEach((sub) => {
      const h3 = document.createElement("h3");
      h3.textContent = sub.title || "";
      wrap.appendChild(h3);
      (sub.paragraphs || []).forEach((text) => {
        const p = document.createElement("p");
        p.textContent = text;
        wrap.appendChild(p);
      });
      if (sub.items?.length) {
        const ul = document.createElement("ul");
        sub.items.forEach((item) => {
          const li = document.createElement("li");
          li.textContent = item;
          ul.appendChild(li);
        });
        wrap.appendChild(ul);
      }
    });

    return wrap;
  }

  function renderGuideUi() {
    const tabsEl = document.getElementById("guide-role-tabs");
    const bodyEl = document.getElementById("guide-body");
    if (!tabsEl || !bodyEl) return;

    const roles = guideRolesForViewer();
    if (!roles.includes(guideActiveRole)) {
      guideActiveRole = roles[0] || "user";
    }

    tabsEl.replaceChildren();
    const showTabs = roles.length > 1;
    tabsEl.hidden = !showTabs;

    if (showTabs) {
      roles.forEach((role) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "guide-role-tabs__btn";
        btn.classList.toggle("is-active", role === guideActiveRole);
        btn.setAttribute("data-guide-role", role);
        btn.textContent = GUIDE_CONTENT[role]?.label || roleBadgeMeta(role).label;
        btn.addEventListener("click", () => {
          guideActiveRole = role;
          renderGuideUi();
        });
        tabsEl.appendChild(btn);
      });
    }

    const pack = GUIDE_CONTENT[guideActiveRole] || GUIDE_CONTENT.user;
    bodyEl.replaceChildren();
    (pack.sections || []).forEach((section) => {
      bodyEl.appendChild(renderGuideSection(section));
    });
  }

  function setMainTab(tab) {
    const name = String(tab || "studio");
    const prevPanel = document.querySelector(".main-tab-panel.is-active");
    const prevName = prevPanel?.getAttribute("data-main-panel") || "";
    if (prevName === "orders" && name !== "orders") {
      disposeOrdersPreviews();
    }
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
    if (name === "studio") {
      const refresh = async () => {
        await syncStudioMineStatuses();
        if (studioTab === "review" && isStudioStaffViewer()) {
          await loadStudioReviewList();
        }
        renderStudio();
      };
      refresh();
    }
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
    if (name === "orders") {
      onOrdersTabShown();
    }
    if (name === "chat") {
      ensureChatLoaded();
    }
    if (name === "guide") {
      renderGuideUi();
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

  /** @type {any[]} */
  let hubRaceBlocks = [];
  /** @type {Map<string, {name:string,ext:string,bytes:Uint8Array,size:number,dataUrl?:string}>} */
  const hubRaceBlockFiles = new Map();
  let hubRaceBlockFileTargetId = null;
  /** Active content-blocks editor context (studio modal or hub race form).
   * Must be initialized before updateAuthChrome() → fillHubRaceFields(). */
  let blocksCtx = null;

  function fillHubRaceFields() {
    const form =
      profileCache?.form && typeof profileCache.form === "object"
        ? profileCache.form
        : {};
    HUB_RACE_FIELDS.forEach(([elId, key]) => {
      const el = document.getElementById(elId);
      if (el) el.value = String(form[key] || "");
    });
    hubRaceBlockFiles.clear();
    hubRaceBlocks = typeof cloneStudioBlocks === "function"
      ? cloneStudioBlocks(form.blocks)
      : [];
    hubRaceBlocks.forEach((b) => {
      if (b.type === "file" && b.dataUrl) {
        hubRaceBlockFiles.set(b.id, {
          name: b.fileName || "file",
          ext: b.ext || "",
          bytes: new Uint8Array(0),
          size: Number(b.size) || 0,
          dataUrl: b.dataUrl,
        });
      }
    });
    // Defer: updateAuthChrome() can run before studio-block helpers/consts are initialized.
    queueMicrotask(() => {
      try {
        if (typeof renderHubRaceBlocks === "function") renderHubRaceBlocks();
      } catch (err) {
        console.error("[hub-race-blocks]", err);
      }
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
    form.blocks =
      typeof serializeBlocksMeta === "function"
        ? serializeBlocksMeta(hubRaceBlocks, hubRaceBlockFiles)
        : Array.isArray(hubRaceBlocks)
          ? hubRaceBlocks
          : [];
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

  let raceSubmissionStatus = null;
  let raceSubmissionReason = "";

  function updateHubRaceStarUi() {
    const star = document.getElementById("hub-race-star");
    if (!star) return;
    const status = raceSubmissionStatus;
    if (!status) {
      star.hidden = true;
      star.removeAttribute("data-tip");
      star.className = "hub-tab-star";
      return;
    }
    star.hidden = false;
    star.className = `hub-tab-star hub-tab-star--${status}`;
    const tip =
      status === "rejected"
        ? raceSubmissionReason
          ? `Отклонено: ${raceSubmissionReason}`
          : "Отклонено"
        : status === "approved"
          ? "Одобрено"
          : status === "added"
            ? "Добавлено в игру"
            : "В обработке";
    star.setAttribute("data-tip", tip);
    star.setAttribute("aria-label", tip);
  }

  async function syncRaceSubmissionStatus() {
    if (!authToken) {
      raceSubmissionStatus = null;
      raceSubmissionReason = "";
      updateHubRaceStarUi();
      return;
    }
    try {
      const data = await api("/api/studio/submissions/mine");
      const list = Array.isArray(data?.submissions) ? data.submissions : [];
      const race = list.find(
        (s) => s.kind === "race" || s.clientFolderId === "race"
      );
      raceSubmissionStatus = race ? String(race.status || "pending") : null;
      raceSubmissionReason = race ? String(race.reason || "") : "";
    } catch (_) {
      /* ignore */
    }
    updateHubRaceStarUi();
  }

  document.getElementById("hub-race-submit-btn")?.addEventListener("click", async () => {
    setHubFieldError("hub-race-error", "");
    if (!authToken) {
      showToast("Войдите, чтобы отправить расу");
      return;
    }
    const form = readHubRaceForm();
    const required = ["raceName", "origin", "abilities", "useful"];
    if (required.find((key) => !form[key])) {
      setHubFieldError("hub-race-error", "Заполни обязательные поля расы");
      return;
    }
    const ok = window.confirm(
      `Отправить расу «${form.raceName}» на рассмотрение админам и помощникам?`
    );
    if (!ok) return;
    const btn = document.getElementById("hub-race-submit-btn");
    if (btn) btn.disabled = true;
    try {
      await api("/api/user/profile", {
        method: "PUT",
        body: JSON.stringify({ form, registered: true }),
      });
      profileCache = {
        ...profileCache,
        registered: true,
        form: { ...(profileCache.form || {}), ...form },
      };
      writeLocalStorageFallback(profileCache);

      const data = await api("/api/studio/submissions", {
        method: "POST",
        body: JSON.stringify({
          kind: "race",
          clientFolderId: "race",
          folderName: form.raceName,
          folderColor: "#c4ff4d",
          race: form,
          payload: { kind: "race", race: form },
        }),
      });
      const sub = data?.submission;
      raceSubmissionStatus = String(sub?.status || "pending");
      raceSubmissionReason = String(sub?.reason || "");
      updateHubRaceStarUi();
      showToast("Раса отправлена на рассмотрение");
    } catch (err) {
      setHubFieldError("hub-race-error", err.message || "Не удалось отправить");
    } finally {
      if (btn) btn.disabled = false;
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

  document.getElementById("user-profile-tabs")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-profile-tab]");
    if (!btn) return;
    setUserProfileTab(btn.getAttribute("data-profile-tab"));
  });

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
    persistFounderProfileEdit().then(() => showToast("Сохранено"));
  });

  document.getElementById("user-profile-race-edit")?.addEventListener("input", () => {
    if (!canFounderEditUser(profileViewUser)) return;
    scheduleFounderProfileSave();
  });

  document.getElementById("user-profile-identity-edit")?.addEventListener("input", () => {
    if (!canFounderEditUser(profileViewUser)) return;
    scheduleFounderProfileSave();
  });

  document.getElementById("edit-profile-save-btn")?.addEventListener("click", async () => {
    if (!canFounderEditUser(profileViewUser)) return;
    clearTimeout(founderEditSaveTimer);
    applyFounderEditLiveUi();
    try {
      await persistFounderProfileEdit();
      showToast("Сохранено");
    } catch (_) {
      /* error already shown */
    }
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

  const STUDIO_STORAGE_KEY = "genesis_studio_v1";
  const STUDIO_DEFAULT_COLOR = "#8ec8ff";
  const STUDIO_COLOR_SWATCHES = [
    "#8ec8ff",
    "#c4ff4d",
    "#fb7185",
    "#fbbf24",
    "#a78bfa",
    "#34d399",
    "#f472b6",
    "#e2e8f0",
  ];
  let studioDoc = { folders: [] };
  let studioOpenFolderId = null;
  let studioSelectedTypeId = null;
  let studioEditingItemId = null;
  let studioRenamingFolderId = null;
  let studioCtxFolderId = null;
  let studioCtxItemId = null;

  function normalizeStudioColor(value) {
    const raw = String(value || "").trim();
    if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toLowerCase();
    if (/^#[0-9a-fA-F]{3}$/.test(raw)) {
      return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`.toLowerCase();
    }
    return STUDIO_DEFAULT_COLOR;
  }

  function studioUid(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function loadStudioDoc() {
    try {
      const raw = localStorage.getItem(STUDIO_STORAGE_KEY);
      if (!raw) {
        studioDoc = { folders: [] };
        return studioDoc;
      }
      const parsed = JSON.parse(raw);
      studioDoc = {
        folders: Array.isArray(parsed?.folders)
          ? parsed.folders.map((f) => ({
              id: String(f.id || studioUid("folder")),
              name: String(f.name || "Папка"),
              color: normalizeStudioColor(f.color),
              createdAt: Number(f.createdAt) || Date.now(),
              submissionId: f.submissionId != null ? Number(f.submissionId) : null,
              submissionStatus: f.submissionStatus ? String(f.submissionStatus) : null,
              submissionReason: f.submissionReason != null ? String(f.submissionReason) : "",
              submissionVersion: Math.max(1, Number(f.submissionVersion) || 1),
              queueNo: f.queueNo != null ? Number(f.queueNo) : null,
              softDeletedAt: f.softDeletedAt != null ? Number(f.softDeletedAt) : null,
              softDeletedUntil: f.softDeletedUntil != null ? Number(f.softDeletedUntil) : null,
              items: Array.isArray(f.items)
                ? f.items.map((it) => ({
                    id: String(it.id || studioUid("item")),
                    typeId: String(it.typeId || ""),
                    name: String(it.name || "Контент"),
                    color: normalizeStudioColor(it.color || STUDIO_DEFAULT_COLOR),
                    body: String(it.body || ""),
                    blocks: Array.isArray(it.blocks) ? it.blocks : [],
                    updatedAt: Number(it.updatedAt) || Date.now(),
                  }))
                : [],
            }))
          : [],
      };
      const before = studioDoc.folders.length;
      studioDoc.folders = studioDoc.folders.filter((f) => {
        if (!f.softDeletedAt) return true;
        const until = f.softDeletedUntil || f.softDeletedAt + 86400000;
        return until > Date.now();
      });
      if (studioDoc.folders.length !== before) {
        try {
          localStorage.setItem(STUDIO_STORAGE_KEY, JSON.stringify(studioDoc));
        } catch (_) {
          /* ignore */
        }
      }
    } catch (_) {
      studioDoc = { folders: [] };
    }
    return studioDoc;
  }

  function saveStudioDoc() {
    localStorage.setItem(STUDIO_STORAGE_KEY, JSON.stringify(studioDoc));
  }

  function getStudioFolder(id) {
    return studioDoc.folders.find((f) => f.id === id) || null;
  }

  function getCatalogType(typeId) {
    return CATALOG_TYPES.find((t) => t.id === typeId) || null;
  }

  function openStudioModal(id) {
    setLayerOpen(document.getElementById(id), true);
  }

  function closeStudioModal(id) {
    setLayerOpen(document.getElementById(id), false);
  }

  function renderStudioTypeGrid() {
    const grid = document.getElementById("studio-type-grid");
    if (!grid) return;
    grid.innerHTML = "";
    CATALOG_TYPES.forEach((type) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "studio-type-card";
      btn.setAttribute("role", "option");
      btn.dataset.typeId = type.id;
      btn.classList.toggle("is-selected", studioSelectedTypeId === type.id);
      btn.innerHTML = `
        <span class="catalog-card__visual" aria-hidden="true">
          <span class="catalog-card__shadow"></span>
          <img class="catalog-card__img studio-type-card__img" src="${type.icon}" alt="" draggable="false" />
        </span>
        <span class="studio-type-card__label">${type.label}</span>
      `;
      btn.addEventListener("click", () => {
        studioSelectedTypeId = type.id;
        grid.querySelectorAll(".studio-type-card").forEach((card) => {
          card.classList.toggle("is-selected", card.dataset.typeId === type.id);
        });
        const err = document.getElementById("studio-create-error");
        if (err) {
          err.hidden = true;
          err.textContent = "";
        }
      });
      grid.appendChild(btn);
    });
  }

  function setStudioFolderColorInput(color) {
    const input = document.getElementById("studio-folder-color");
    const value = normalizeStudioColor(color);
    if (input) input.value = value;
    document.querySelectorAll("#studio-folder-swatches .studio-color-swatch").forEach((btn) => {
      btn.classList.toggle("is-selected", normalizeStudioColor(btn.dataset.color) === value);
    });
  }

  function setStudioItemColorInput(color) {
    const input = document.getElementById("studio-edit-color");
    const value = normalizeStudioColor(color);
    if (input) input.value = value;
    document.querySelectorAll("#studio-edit-swatches .studio-color-swatch").forEach((btn) => {
      btn.classList.toggle("is-selected", normalizeStudioColor(btn.dataset.color) === value);
    });
  }

  function renderStudioColorSwatches() {
    const wrap = document.getElementById("studio-folder-swatches");
    if (wrap && !wrap.childElementCount) {
      STUDIO_COLOR_SWATCHES.forEach((color) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "studio-color-swatch";
        btn.dataset.color = color;
        btn.style.setProperty("--swatch", color);
        btn.title = color;
        btn.setAttribute("aria-label", `Цвет ${color}`);
        btn.addEventListener("click", () => setStudioFolderColorInput(color));
        wrap.appendChild(btn);
      });
    }
    const itemWrap = document.getElementById("studio-edit-swatches");
    if (itemWrap && !itemWrap.childElementCount) {
      STUDIO_COLOR_SWATCHES.forEach((color) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "studio-color-swatch";
        btn.dataset.color = color;
        btn.style.setProperty("--swatch", color);
        btn.title = color;
        btn.setAttribute("aria-label", `Цвет ${color}`);
        btn.addEventListener("click", () => setStudioItemColorInput(color));
        itemWrap.appendChild(btn);
      });
    }
  }

  function studioVersionLabel(name, version) {
    const ver = Math.max(1, Number(version) || 1);
    const label = String(name || "").trim() || "Папка";
    if (ver <= 1) return label;
    if (/\sV\d+$/i.test(label)) return label;
    return `${label} V${ver}`;
  }

  function hideStudioFolderMenu() {
    const menu = document.getElementById("studio-folder-menu");
    if (menu) menu.hidden = true;
    studioCtxFolderId = null;
  }

  function hideStudioItemMenu() {
    const menu = document.getElementById("studio-item-menu");
    if (menu) menu.hidden = true;
    studioCtxItemId = null;
  }

  function hideStudioMenus() {
    hideStudioFolderMenu();
    hideStudioItemMenu();
  }

  function placeStudioMenu(menu, clientX, clientY) {
    if (!menu) return;
    menu.hidden = false;
    const pad = 8;
    const rect = menu.getBoundingClientRect();
    const w = rect.width || 160;
    const h = rect.height || 120;
    let left = clientX;
    let top = clientY;
    if (left + w > window.innerWidth - pad) left = window.innerWidth - w - pad;
    if (top + h > window.innerHeight - pad) top = window.innerHeight - h - pad;
    menu.style.left = `${Math.max(pad, left)}px`;
    menu.style.top = `${Math.max(pad, top)}px`;
  }

  function showStudioFolderMenu(folderId, clientX, clientY) {
    hideStudioItemMenu();
    studioCtxFolderId = folderId;
    const menu = document.getElementById("studio-folder-menu");
    const folder = getStudioFolder(folderId);
    const soft = Boolean(folder?.softDeletedAt);
    const restoreBtn = menu?.querySelector('[data-studio-act="restore"]');
    const sendBtn = menu?.querySelector('[data-studio-act="send"]');
    const deleteBtn = menu?.querySelector('[data-studio-act="delete"]');
    const hardBtn = menu?.querySelector('[data-studio-act="hard-delete"]');
    const editBtn = menu?.querySelector('[data-studio-act="edit"]');
    if (restoreBtn) restoreBtn.hidden = !soft;
    if (sendBtn) sendBtn.hidden = soft;
    if (deleteBtn) deleteBtn.hidden = soft;
    if (hardBtn) hardBtn.hidden = !soft;
    if (editBtn) editBtn.hidden = soft;
    placeStudioMenu(menu, clientX, clientY);
  }

  function showStudioItemMenu(itemId, clientX, clientY) {
    hideStudioFolderMenu();
    studioCtxItemId = itemId;
    placeStudioMenu(document.getElementById("studio-item-menu"), clientX, clientY);
  }

  function isStudioStaffViewer() {
    return Boolean(authToken && isStaffUser(authUser));
  }

  function studioStatusTip(status, reason) {
    const s = String(status || "");
    if (s === "rejected") {
      const why = String(reason || "").trim();
      return why ? `Отклонено: ${why}` : "Отклонено";
    }
    if (s === "approved") return "Одобрено";
    if (s === "added") return "Добавлено в игру";
    if (s === "pending") return "В обработке";
    return "";
  }

  function appendStudioStar(host, status, reason, queueNo = null) {
    if (!host || !status) return;
    const tip = studioStatusTip(status, reason);
    if (!tip) return;
    const star = document.createElement("span");
    star.className = `studio-tile__star studio-tile__star--${status}`;
    star.textContent = "★";
    star.setAttribute("data-tip", tip);
    star.setAttribute("aria-label", tip);
    star.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    star.addEventListener("pointerdown", (e) => e.stopPropagation());
    host.appendChild(star);
    const qn = Number(queueNo);
    if (Number.isFinite(qn) && qn > 0) {
      const badge = document.createElement("span");
      badge.className = "studio-tile__queue";
      badge.textContent = String(qn);
      badge.setAttribute("aria-label", `Очередь ${qn}`);
      host.appendChild(badge);
    }
  }

  function updateStudioSubtabsUi() {
    const tabs = document.getElementById("studio-subtabs");
    if (!tabs) return;
    const staff = Boolean(authToken && isStaffUser(authUser));
    tabs.hidden = !staff;
    if (!staff && studioTab === "review") {
      studioTab = "create";
      studioOpenReviewId = null;
    }
    tabs.querySelectorAll("[data-studio-tab]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.getAttribute("data-studio-tab") === studioTab);
    });
  }

  function updateStudioReviewActionsUi(sub) {
    const wrap = document.getElementById("studio-review-actions");
    const rejectBtn = document.getElementById("studio-review-reject");
    const approveBtn = document.getElementById("studio-review-approve");
    const addedBtn = document.getElementById("studio-review-added");
    const deleteBtn = document.getElementById("studio-review-delete");
    const hideBtn = document.getElementById("studio-review-hide");
    if (!wrap) return;
    if (studioTab !== "review" || !sub) {
      wrap.hidden = true;
      return;
    }
    wrap.hidden = false;
    if (rejectBtn) rejectBtn.hidden = false;
    const st = String(sub.status || "pending");
    if (approveBtn) approveBtn.hidden = st === "approved" || st === "added";
    if (addedBtn) {
      addedBtn.hidden = st !== "approved" && st !== "added";
      addedBtn.disabled = st === "added";
      addedBtn.textContent = "Добавлено";
    }
    if (hideBtn) {
      const canHide = st === "added" || st === "approved";
      hideBtn.hidden = !canHide;
      hideBtn.textContent = sub.hidden ? "Показать" : "Скрыть";
    }
    if (deleteBtn) {
      deleteBtn.hidden = st !== "rejected";
    }
  }

  function updateStudioReviewToolbarUi() {
    const toolbar = document.getElementById("studio-review-toolbar");
    if (!toolbar) return;
    const show =
      studioTab === "review" &&
      isStudioStaffViewer() &&
      !studioOpenReviewId;
    toolbar.hidden = !show;
    if (!show) return;
    toolbar.querySelectorAll("[data-studio-status]").forEach((btn) => {
      btn.classList.toggle(
        "is-active",
        btn.getAttribute("data-studio-status") === studioReviewStatusFilter
      );
    });
    toolbar.querySelectorAll("[data-studio-kind]").forEach((btn) => {
      btn.classList.toggle(
        "is-active",
        btn.getAttribute("data-studio-kind") === studioReviewKindFilter
      );
    });
    const sort = document.getElementById("studio-review-sort");
    if (sort && sort.value !== studioReviewSort) sort.value = studioReviewSort;
  }

  function isRaceSubmission(s) {
    return (
      s?.kind === "race" ||
      s?.clientFolderId === "race" ||
      s?.payload?.kind === "race"
    );
  }

  function getFilteredSortedReviewList() {
    const statusRank = { pending: 0, approved: 1, rejected: 2, added: 3 };
    let list = Array.isArray(studioReviewList) ? [...studioReviewList] : [];
    if (studioReviewStatusFilter !== "all") {
      list = list.filter(
        (s) => String(s.status || "pending") === studioReviewStatusFilter
      );
    }
    if (studioReviewKindFilter === "race") {
      list = list.filter((s) => isRaceSubmission(s));
    } else if (studioReviewKindFilter === "folder") {
      list = list.filter((s) => !isRaceSubmission(s));
    }
    const nameOf = (s) => String(s.folderName || "").toLowerCase();
    const nickOf = (s) => String(s.submitterMcNick || "").toLowerCase();
    const timeOf = (s) => {
      const t = Date.parse(s.updatedAt || s.createdAt || 0);
      return Number.isFinite(t) ? t : 0;
    };
    list.sort((a, b) => {
      switch (studioReviewSort) {
        case "date-asc":
          return timeOf(a) - timeOf(b);
        case "name-asc":
          return nameOf(a).localeCompare(nameOf(b), "ru", { sensitivity: "base" });
        case "name-desc":
          return nameOf(b).localeCompare(nameOf(a), "ru", { sensitivity: "base" });
        case "nick-asc":
          return nickOf(a).localeCompare(nickOf(b), "ru", { sensitivity: "base" });
        case "nick-desc":
          return nickOf(b).localeCompare(nickOf(a), "ru", { sensitivity: "base" });
        case "status": {
          const d =
            (statusRank[String(a.status || "pending")] ?? 9) -
            (statusRank[String(b.status || "pending")] ?? 9);
          if (d) return d;
          return timeOf(b) - timeOf(a);
        }
        case "date-desc":
        default:
          return timeOf(b) - timeOf(a);
      }
    });
    return list;
  }

  async function syncStudioMineStatuses() {
    if (!authToken) return;
    try {
      const data = await api("/api/studio/submissions/mine");
      const list = Array.isArray(data?.submissions) ? data.submissions : [];
      const race = list.find(
        (s) => s.kind === "race" || s.clientFolderId === "race"
      );
      if (race?.deletedAt) {
        raceSubmissionStatus = null;
        raceSubmissionReason = "";
      } else {
        raceSubmissionStatus = race ? String(race.status || "pending") : null;
        raceSubmissionReason = race ? String(race.reason || "") : "";
      }
      updateHubRaceStarUi();

      loadStudioDoc();
      let changed = false;
      const seenFolderIds = new Set();
      list.forEach((sub) => {
        if (sub.kind === "race" || sub.clientFolderId === "race") return;
        const folder = studioDoc.folders.find((f) => f.id === sub.clientFolderId);
        if (!folder) return;
        seenFolderIds.add(folder.id);

        if (sub.deletedAt) {
          // Soft-deleted on server: only keep gray state if folder still linked
          if (folder.submissionId && Number(folder.submissionId) === Number(sub.id)) {
            const deletedMs = Date.parse(sub.deletedAt) || Date.now();
            const purgeMs = sub.purgeAt
              ? Date.parse(sub.purgeAt) || deletedMs + 86400000
              : deletedMs + 86400000;
            if (
              folder.softDeletedAt !== deletedMs ||
              folder.softDeletedUntil !== purgeMs ||
              folder.submissionStatus !== String(sub.status || "pending")
            ) {
              folder.softDeletedAt = deletedMs;
              folder.softDeletedUntil = purgeMs;
              folder.submissionStatus = String(sub.status || "pending");
              folder.submissionReason = String(sub.reason || "");
              folder.queueNo = null;
              changed = true;
            }
          }
          // If submissionId was cleared (local restore), ignore deleted server row
          return;
        }

        const nextId = Number(sub.id) || null;
        const nextStatus = String(sub.status || "pending");
        const nextReason = String(sub.reason || "");
        const nextVersion = Math.max(1, Number(sub.version) || 1);
        const nextQueue = sub.queueNo != null ? Number(sub.queueNo) : null;
        if (
          folder.submissionId !== nextId ||
          folder.submissionStatus !== nextStatus ||
          folder.submissionReason !== nextReason ||
          folder.submissionVersion !== nextVersion ||
          folder.queueNo !== nextQueue ||
          folder.softDeletedAt != null
        ) {
          folder.submissionId = nextId;
          folder.submissionStatus = nextStatus;
          folder.submissionReason = nextReason;
          folder.submissionVersion = nextVersion;
          folder.queueNo = nextQueue;
          folder.softDeletedAt = null;
          folder.softDeletedUntil = null;
          changed = true;
        }
      });

      // Hard-purged or missing: clear submission fields on linked folders
      studioDoc.folders.forEach((folder) => {
        if (!folder.submissionId) return;
        if (seenFolderIds.has(folder.id)) return;
        folder.submissionId = null;
        folder.submissionStatus = null;
        folder.submissionReason = "";
        folder.queueNo = null;
        folder.softDeletedAt = null;
        folder.softDeletedUntil = null;
        changed = true;
      });

      if (changed) saveStudioDoc();
    } catch (_) {
      /* ignore offline / unauthorized */
    }
  }

  async function loadStudioReviewList() {
    if (!isStudioStaffViewer()) {
      studioReviewList = [];
      return;
    }
    try {
      const path =
        studioReviewKindFilter === "hidden"
          ? "/api/studio/submissions?showHidden=1"
          : "/api/studio/submissions";
      const data = await api(path);
      studioReviewList = Array.isArray(data?.submissions) ? data.submissions : [];
    } catch (err) {
      studioReviewList = [];
      showToast(err.message || "Не удалось загрузить анкеты");
    }
  }

  function getOpenReviewSubmission() {
    if (!studioOpenReviewId) return null;
    return studioReviewList.find((s) => Number(s.id) === Number(studioOpenReviewId)) || null;
  }

  async function submitStudioFolder(folderId) {
    if (!authToken) {
      showToast("Войдите, чтобы отправить папку");
      return;
    }
    loadStudioDoc();
    const folder = getStudioFolder(folderId);
    if (!folder) return;
    if (!folder.items?.length) {
      showToast("В папке нет анкет");
      return;
    }
    const ok = window.confirm(
      `Отправить папку «${folder.name}» на рассмотрение админам и помощникам?`
    );
    if (!ok) return;
    try {
      const payload = {
        items: folder.items.map((it) => ({
          id: it.id,
          typeId: it.typeId,
          name: it.name,
          body: it.body || "",
          blocks: Array.isArray(it.blocks) ? it.blocks : [],
          updatedAt: it.updatedAt || Date.now(),
        })),
      };
      const data = await api("/api/studio/submissions", {
        method: "POST",
        body: JSON.stringify({
          clientFolderId: folder.id,
          folderName: folder.name,
          folderColor: folder.color || STUDIO_DEFAULT_COLOR,
          payload,
        }),
      });
      const sub = data?.submission;
      if (sub) {
        folder.submissionId = Number(sub.id) || null;
        folder.submissionStatus = String(sub.status || "pending");
        folder.submissionReason = String(sub.reason || "");
        folder.submissionVersion = Math.max(1, Number(sub.version) || 1);
        saveStudioDoc();
      }
      showToast("Отправлено на рассмотрение");
      renderStudio();
    } catch (err) {
      showToast(err.message || "Не удалось отправить");
    }
  }

  async function patchStudioSubmission(id, body) {
    const data = await api(`/api/studio/submissions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    const sub = data?.submission;
    if (sub) {
      const idx = studioReviewList.findIndex((s) => Number(s.id) === Number(sub.id));
      if (idx >= 0) studioReviewList[idx] = sub;
      else studioReviewList.unshift(sub);
    }
    return sub;
  }

  function openStudioFolderModal() {
    studioRenamingFolderId = null;
    renderStudioColorSwatches();
    const title = document.getElementById("studio-folder-modal-title");
    const submit = document.getElementById("studio-folder-submit");
    const input = document.getElementById("studio-folder-name");
    if (title) title.textContent = "Новая папка";
    if (submit) submit.textContent = "Создать";
    if (input) input.value = "";
    setStudioFolderColorInput(STUDIO_DEFAULT_COLOR);
    openStudioModal("studio-folder-modal");
    requestAnimationFrame(() => input?.focus());
  }

  function openStudioFolderRenameModal(folderId) {
    const folder = getStudioFolder(folderId);
    if (!folder) return;
    studioRenamingFolderId = folderId;
    renderStudioColorSwatches();
    const title = document.getElementById("studio-folder-modal-title");
    const submit = document.getElementById("studio-folder-submit");
    const input = document.getElementById("studio-folder-name");
    if (title) title.textContent = "Редактировать папку";
    if (submit) submit.textContent = "Сохранить";
    if (input) input.value = folder.name;
    setStudioFolderColorInput(folder.color || STUDIO_DEFAULT_COLOR);
    openStudioModal("studio-folder-modal");
    requestAnimationFrame(() => {
      input?.focus();
      input?.select();
    });
  }

  function openStudioCreateModal() {
    if (!studioOpenFolderId) return;
    studioSelectedTypeId = null;
    const name = document.getElementById("studio-create-name");
    const err = document.getElementById("studio-create-error");
    if (name) name.value = "";
    if (err) {
      err.hidden = true;
      err.textContent = "";
    }
    renderStudioTypeGrid();
    openStudioModal("studio-create-modal");
    requestAnimationFrame(() => name?.focus());
  }

  function openStudioEditModal(item, { readOnly = false } = {}) {
    const type = getCatalogType(item.typeId);
    studioEditingItemId = item.id;
    studioEditReadOnly = Boolean(readOnly);
    const title = document.getElementById("studio-edit-modal-title");
    const meta = document.getElementById("studio-edit-meta");
    const nameInput = document.getElementById("studio-edit-name");
    const colorBlock = document.getElementById("studio-edit-color-block");
    const colorInput = document.getElementById("studio-edit-color");
    const addBtn = document.getElementById("studio-block-add-btn");
    const saveBtn = document.querySelector("#studio-edit-form button[type='submit']");
    if (title) title.textContent = type ? type.label : "Анкета контента";
    if (meta) meta.textContent = type ? type.label : item.typeId || "";
    if (nameInput) {
      nameInput.value = item.name || "";
      nameInput.readOnly = studioEditReadOnly;
      nameInput.disabled = studioEditReadOnly;
    }
    renderStudioColorSwatches();
    setStudioItemColorInput(item.color || STUDIO_DEFAULT_COLOR);
    if (colorBlock) colorBlock.hidden = false;
    if (colorInput) {
      colorInput.disabled = studioEditReadOnly;
      colorInput.readOnly = studioEditReadOnly;
    }
    document.querySelectorAll("#studio-edit-swatches .studio-color-swatch").forEach((btn) => {
      btn.disabled = studioEditReadOnly;
    });
    if (addBtn) addBtn.hidden = studioEditReadOnly;
    if (saveBtn) {
      saveBtn.hidden = false;
      saveBtn.textContent = studioEditReadOnly ? "Закрыть" : "Сохранить";
    }

    studioEditBlocks = migrateItemBodyToBlocks(item);
    studioBlockFiles.clear();
    studioEditBlocks.forEach((b) => {
      if (b.type === "file" && b.dataUrl) {
        studioBlockFiles.set(b.id, {
          name: b.fileName || "file",
          ext: b.ext || "",
          bytes: new Uint8Array(),
          size: b.size || 0,
          dataUrl: b.dataUrl,
        });
      }
    });
    renderStudioBlocks();
    document.getElementById("studio-block-type-menu").hidden = true;
    openStudioModal("studio-edit-modal");
    requestAnimationFrame(() => {
      if (!studioEditReadOnly) nameInput?.focus();
    });
  }

  function renderStudio() {
    loadStudioDoc();
    updateStudioSubtabsUi();
    const grid = document.getElementById("studio-grid");
    const bar = document.getElementById("studio-bar");
    const title = document.getElementById("studio-folder-title");
    if (!grid) return;

    grid.innerHTML = "";
    const reviewMode = studioTab === "review" && isStudioStaffViewer();

    if (reviewMode) {
      updateStudioReviewToolbarUi();
      const sub = studioOpenReviewId ? getOpenReviewSubmission() : null;
      if (!sub) {
        studioOpenReviewId = null;
        if (bar) bar.hidden = true;
        if (title) title.textContent = "";
        updateStudioReviewActionsUi(null);

        const filtered = getFilteredSortedReviewList();
        if (!studioReviewList.length) {
          const empty = document.createElement("p");
          empty.className = "studio-empty";
          empty.textContent = "Пока нет отправленных анкет";
          grid.appendChild(empty);
          return;
        }
        if (!filtered.length) {
          const empty = document.createElement("p");
          empty.className = "studio-empty";
          empty.textContent = "Нет анкет по выбранным фильтрам";
          grid.appendChild(empty);
          return;
        }

        filtered.forEach((s) => {
          const isRace = isRaceSubmission(s);
          const color = isRace
            ? "var(--accent)"
            : normalizeStudioColor(s.folderColor);
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = isRace
            ? "studio-tile catalog-card"
            : "studio-tile studio-tile--folder catalog-card";
          btn.setAttribute("role", "listitem");
          btn.style.setProperty("--section-accent", color);
          const icon = isRace ? "assets/race.png" : "assets/folder.png";
          btn.innerHTML = `
            <span class="catalog-card__visual" aria-hidden="true">
              <span class="catalog-card__shadow"></span>
              <img class="catalog-card__img" src="${icon}" alt="" draggable="false" />
            </span>
            <span class="catalog-card__label studio-tile__label-stack">
              <span class="studio-tile__name"></span>
              <span class="studio-tile__sub"></span>
            </span>
          `;
          appendStudioStar(btn, s.status || "pending", s.reason, s.queueNo);
          btn.querySelector(".studio-tile__name").textContent =
            s.folderName ||
            (s.version > 1
              ? `${s.baseName || (isRace ? "Раса" : "Папка")} V${s.version}`
              : s.baseName || (isRace ? "Раса" : "Папка"));
          btn.querySelector(".studio-tile__sub").textContent = s.submitterMcNick || "—";
          btn.addEventListener("click", () => {
            hideStudioMenus();
            studioOpenReviewId = Number(s.id);
            renderStudio();
          });
          grid.appendChild(btn);
        });
        return;
      }

      updateStudioReviewToolbarUi();
      if (bar) bar.hidden = false;
      const isRaceOpen = isRaceSubmission(sub);
      if (title) {
        title.textContent = `${sub.folderName || (isRaceOpen ? "Раса" : "Папка")} · ${sub.submitterMcNick || ""}`.trim();
      }
      updateStudioReviewActionsUi(sub);

      if (isRaceOpen) {
        const race =
          (sub.payload?.race && typeof sub.payload.race === "object"
            ? sub.payload.race
            : null) || { raceName: sub.folderName };
        const panel = document.createElement("div");
        panel.className = "studio-race-review";
        panel.innerHTML = renderRaceBlocks(race) || `<p class="studio-empty">Нет текста расы</p>`;
        grid.appendChild(panel);
        return;
      }

      const items = Array.isArray(sub.payload?.items) ? sub.payload.items : [];
      if (!items.length) {
        const empty = document.createElement("p");
        empty.className = "studio-empty";
        empty.textContent = "В этой папке нет анкет";
        grid.appendChild(empty);
        return;
      }

      items.forEach((item) => {
        const type = getCatalogType(item.typeId);
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "studio-tile catalog-card";
        btn.setAttribute("role", "listitem");
        btn.style.setProperty(
          "--section-accent",
          normalizeStudioColor(item.color || STUDIO_DEFAULT_COLOR)
        );
        const icon = type?.icon || "assets/icons/item.png";
        btn.innerHTML = `
          <span class="catalog-card__visual" aria-hidden="true">
            <span class="catalog-card__shadow"></span>
            <img class="catalog-card__img" src="${icon}" alt="" draggable="false" />
          </span>
          <span class="catalog-card__label"></span>
        `;
        btn.querySelector(".catalog-card__label").textContent = item.name || "Анкета";
        btn.addEventListener("click", () => {
          hideStudioMenus();
          openStudioEditModal(item, { readOnly: !isFounderViewer() });
        });
        grid.appendChild(btn);
      });
      return;
    }

    updateStudioReviewActionsUi(null);
    updateStudioReviewToolbarUi();
    const folder = studioOpenFolderId ? getStudioFolder(studioOpenFolderId) : null;

    if (!folder) {
      studioOpenFolderId = null;
      if (bar) bar.hidden = true;
      if (title) title.textContent = "";

      const plus = document.createElement("button");
      plus.type = "button";
      plus.className = "studio-tile studio-tile--plus catalog-card";
      plus.setAttribute("role", "listitem");
      plus.innerHTML = `
        <span class="catalog-card__visual" aria-hidden="true">
          <span class="catalog-card__shadow"></span>
          <img class="catalog-card__img" src="assets/add.png" alt="" draggable="false" />
        </span>
        <span class="catalog-card__label">Новая папка</span>
      `;
      plus.addEventListener("click", () => openStudioFolderModal());
      grid.appendChild(plus);

      const foldersSorted = [...studioDoc.folders].sort((a, b) => {
        const aSoft = a.softDeletedAt ? 1 : 0;
        const bSoft = b.softDeletedAt ? 1 : 0;
        if (aSoft !== bSoft) return aSoft - bSoft;
        return (Number(a.createdAt) || 0) - (Number(b.createdAt) || 0);
      });
      foldersSorted.forEach((f) => {
        const color = normalizeStudioColor(f.color);
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "studio-tile studio-tile--folder catalog-card";
        if (f.softDeletedAt) btn.classList.add("studio-tile--soft-deleted");
        btn.setAttribute("role", "listitem");
        btn.style.setProperty("--section-accent", color);
        btn.innerHTML = `
          <span class="catalog-card__visual" aria-hidden="true">
            <span class="catalog-card__shadow"></span>
            <img class="catalog-card__img" src="assets/folder.png" alt="" draggable="false" />
          </span>
          <span class="catalog-card__label studio-tile__label-stack">
            <span class="studio-tile__name"></span>
            <span class="studio-tile__sub"></span>
          </span>
        `;
        const nameEl = btn.querySelector(".studio-tile__name");
        const subEl = btn.querySelector(".studio-tile__sub");
        if (nameEl) {
          nameEl.textContent = studioVersionLabel(f.name, f.submissionVersion);
        }
        if (subEl) {
          if (f.softDeletedAt) {
            subEl.textContent = "Удалено · ПКМ: восстановить";
            subEl.hidden = false;
          } else {
            subEl.textContent = "";
            subEl.hidden = true;
          }
        }
        if (f.softDeletedAt) {
          const until = f.softDeletedUntil || f.softDeletedAt + 86400000;
          appendPurgeClock(btn, until);
        } else if (f.submissionStatus) {
          appendStudioStar(btn, f.submissionStatus, f.submissionReason, f.queueNo);
        }
        btn.addEventListener("click", () => {
          hideStudioMenus();
          studioOpenFolderId = f.id;
          renderStudio();
        });
        btn.addEventListener("contextmenu", (e) => {
          e.preventDefault();
          e.stopPropagation();
          showStudioFolderMenu(f.id, e.clientX, e.clientY);
        });
        grid.appendChild(btn);
      });
      return;
    }

    if (bar) bar.hidden = false;
    if (title) title.textContent = studioVersionLabel(folder.name, folder.submissionVersion);

    const createBtn = document.createElement("button");
    createBtn.type = "button";
    createBtn.className = "studio-tile studio-tile--create catalog-card";
    createBtn.setAttribute("role", "listitem");
    createBtn.innerHTML = `
      <span class="catalog-card__visual" aria-hidden="true">
        <span class="catalog-card__shadow"></span>
        <img class="catalog-card__img" src="assets/add.png" alt="" draggable="false" />
      </span>
      <span class="catalog-card__label">Создать анкету контента</span>
    `;
    createBtn.addEventListener("click", () => openStudioCreateModal());
    grid.appendChild(createBtn);

    folder.items.forEach((item) => {
      const type = getCatalogType(item.typeId);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "studio-tile catalog-card";
      btn.setAttribute("role", "listitem");
      btn.style.setProperty(
        "--section-accent",
        normalizeStudioColor(item.color || STUDIO_DEFAULT_COLOR)
      );
      const icon = type?.icon || "assets/icons/item.png";
      btn.innerHTML = `
        <span class="catalog-card__visual" aria-hidden="true">
          <span class="catalog-card__shadow"></span>
          <img class="catalog-card__img" src="${icon}" alt="" draggable="false" />
        </span>
        <span class="catalog-card__label"></span>
      `;
      btn.querySelector(".catalog-card__label").textContent = item.name;
      btn.addEventListener("click", () => {
        hideStudioMenus();
        openStudioEditModal(item);
      });
      btn.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
        showStudioItemMenu(item.id, e.clientX, e.clientY);
      });
      grid.appendChild(btn);
    });
  }

  function bindStudioUi() {
    document.getElementById("studio-back")?.addEventListener("click", () => {
      if (studioTab === "review") {
        studioOpenReviewId = null;
      } else {
        studioOpenFolderId = null;
      }
      renderStudio();
    });

    document.getElementById("studio-subtabs")?.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-studio-tab]");
      if (!btn) return;
      const next = btn.getAttribute("data-studio-tab");
      if (next !== "create" && next !== "review") return;
      if (next === "review" && !isStudioStaffViewer()) return;
      studioTab = next;
      studioOpenFolderId = null;
      studioOpenReviewId = null;
      if (studioTab === "review") await loadStudioReviewList();
      renderStudio();
    });

    const folderModal = "studio-folder-modal";
    document.getElementById("studio-folder-modal-close")?.addEventListener("click", () => closeStudioModal(folderModal));
    document.getElementById("studio-folder-color")?.addEventListener("input", (e) => {
      setStudioFolderColorInput(e.target.value);
    });
    document.getElementById("studio-edit-color")?.addEventListener("input", (e) => {
      setStudioItemColorInput(e.target.value);
    });
    document.getElementById("studio-folder-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = document.getElementById("studio-folder-name");
      const colorInput = document.getElementById("studio-folder-color");
      const name = String(input?.value || "").trim();
      const color = normalizeStudioColor(colorInput?.value);
      if (!name) {
        input?.focus();
        return;
      }
      loadStudioDoc();
      if (studioRenamingFolderId) {
        const folder = getStudioFolder(studioRenamingFolderId);
        if (folder) {
          folder.name = name;
          folder.color = color;
        }
        studioRenamingFolderId = null;
      } else {
        studioDoc.folders.push({
          id: studioUid("folder"),
          name,
          color,
          createdAt: Date.now(),
          submissionId: null,
          submissionStatus: null,
          submissionReason: "",
          submissionVersion: 1,
          queueNo: null,
          softDeletedAt: null,
          softDeletedUntil: null,
          items: [],
        });
      }
      saveStudioDoc();
      closeStudioModal(folderModal);
      renderStudio();
    });

    document.getElementById("studio-folder-menu")?.addEventListener("click", async (e) => {
      const actBtn = e.target.closest("[data-studio-act]");
      if (!actBtn) return;
      const act = actBtn.getAttribute("data-studio-act");
      const folderId = studioCtxFolderId;
      hideStudioMenus();
      if (!folderId) return;
      loadStudioDoc();
      const folder = getStudioFolder(folderId);
      if (!folder) return;
      if (act === "edit") {
        openStudioFolderRenameModal(folderId);
        return;
      }
      if (act === "send") {
        submitStudioFolder(folderId);
        return;
      }
      if (act === "restore") {
        if (!folder.softDeletedAt) return;
        try {
          if (folder.submissionId && authToken) {
            await api(`/api/studio/submissions/${folder.submissionId}/restore`, {
              method: "POST",
            });
          }
          folder.softDeletedAt = null;
          folder.softDeletedUntil = null;
          folder.submissionId = null;
          folder.submissionStatus = null;
          folder.submissionReason = "";
          folder.queueNo = null;
          saveStudioDoc();
          showToast("Восстановлено как черновик");
          renderStudio();
        } catch (err) {
          showToast(err.message || "Не удалось восстановить");
        }
        return;
      }
      if (act === "hard-delete") {
        if (!folder.softDeletedAt) return;
        const ok = window.confirm(
          `Удалить «${folder.name}» навсегда без восстановления?`
        );
        if (!ok) return;
        try {
          if (folder.submissionId && authToken) {
            await api(`/api/studio/submissions/${folder.submissionId}/hard-delete`, {
              method: "POST",
            });
          }
          studioDoc.folders = studioDoc.folders.filter((x) => x.id !== folderId);
          if (studioOpenFolderId === folderId) studioOpenFolderId = null;
          saveStudioDoc();
          showToast("Удалено навсегда");
          renderStudio();
        } catch (err) {
          showToast(err.message || "Не удалось удалить");
        }
        return;
      }
      if (act === "delete") {
        const ok = window.confirm(
          `Удалить папку «${folder.name}»? Можно восстановить в течение 24ч.`
        );
        if (!ok) return;
        if (folder.submissionId && authToken) {
          try {
            const data = await api(
              `/api/studio/submissions/${folder.submissionId}/soft-delete`,
              { method: "POST" }
            );
            const sub = data?.submission;
            const deletedMs = sub?.deletedAt
              ? Date.parse(sub.deletedAt) || Date.now()
              : Date.now();
            const purgeMs = sub?.purgeAt
              ? Date.parse(sub.purgeAt) || deletedMs + 86400000
              : deletedMs + 86400000;
            folder.softDeletedAt = deletedMs;
            folder.softDeletedUntil = purgeMs;
            folder.queueNo = null;
            saveStudioDoc();
            showToast("Папка удалена — можно восстановить в течение 24ч");
            renderStudio();
            return;
          } catch (err) {
            showToast(err.message || "Не удалось удалить на сервере");
            return;
          }
        }
        const deletedMs = Date.now();
        folder.softDeletedAt = deletedMs;
        folder.softDeletedUntil = deletedMs + 86400000;
        saveStudioDoc();
        showToast("Папка удалена — можно восстановить в течение 24ч");
        renderStudio();
      }
    });

    document.getElementById("studio-item-menu")?.addEventListener("click", (e) => {
      const actBtn = e.target.closest("[data-studio-item-act]");
      if (!actBtn) return;
      const act = actBtn.getAttribute("data-studio-item-act");
      const itemId = studioCtxItemId;
      hideStudioMenus();
      if (!itemId) return;
      loadStudioDoc();
      const folder = getStudioFolder(studioOpenFolderId);
      const item = folder?.items.find((it) => it.id === itemId);
      if (!folder || !item) return;
      if (act === "edit") {
        openStudioEditModal(item);
        return;
      }
      if (act === "delete") {
        const ok = window.confirm(`Удалить анкету «${item.name}»?`);
        if (!ok) return;
        folder.items = folder.items.filter((it) => it.id !== itemId);
        saveStudioDoc();
        renderStudio();
      }
    });

    document.addEventListener("pointerdown", (e) => {
      const folderMenu = document.getElementById("studio-folder-menu");
      const itemMenu = document.getElementById("studio-item-menu");
      if (folderMenu && !folderMenu.hidden && folderMenu.contains(e.target)) return;
      if (itemMenu && !itemMenu.hidden && itemMenu.contains(e.target)) return;
      hideStudioMenus();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") hideStudioMenus();
    });
    window.addEventListener("resize", hideStudioMenus);
    window.addEventListener("scroll", hideStudioMenus, true);

    const createModal = "studio-create-modal";
    document.getElementById("studio-create-modal-close")?.addEventListener("click", () => closeStudioModal(createModal));
    document.getElementById("studio-create-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const nameInput = document.getElementById("studio-create-name");
      const err = document.getElementById("studio-create-error");
      const name = String(nameInput?.value || "").trim();
      if (!name) {
        nameInput?.focus();
        return;
      }
      if (!studioSelectedTypeId) {
        if (err) {
          err.hidden = false;
          err.textContent = "Выберите тип контента";
        }
        return;
      }
      const folder = getStudioFolder(studioOpenFolderId);
      if (!folder) return;
      const item = {
        id: studioUid("item"),
        typeId: studioSelectedTypeId,
        name,
        color: STUDIO_DEFAULT_COLOR,
        body: "",
        blocks: [],
        updatedAt: Date.now(),
      };
      folder.items.push(item);
      saveStudioDoc();
      closeStudioModal(createModal);
      renderStudio();
      openStudioEditModal(item);
    });

    const editModal = "studio-edit-modal";
    document.getElementById("studio-edit-modal-close")?.addEventListener("click", () => closeStudioModal(editModal));
    document.getElementById("studio-edit-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (studioEditReadOnly) {
        closeStudioModal(editModal);
        return;
      }
      const nameInput = document.getElementById("studio-edit-name");
      const name = String(nameInput?.value || "").trim();
      if (!name) {
        nameInput?.focus();
        return;
      }
      const color = normalizeStudioColor(
        document.getElementById("studio-edit-color")?.value || STUDIO_DEFAULT_COLOR
      );
      const blocks = serializeStudioBlocksMeta(studioEditBlocks);
      const bodyText = blocks
        .filter((b) => b.type === "text")
        .map((b) => b.body || "")
        .filter(Boolean)
        .join("\n\n");

      if (studioTab === "review" && studioOpenReviewId) {
        const sub = getOpenReviewSubmission();
        if (!sub || !isFounderViewer()) return;
        const items = Array.isArray(sub.payload?.items) ? [...sub.payload.items] : [];
        const idx = items.findIndex((it) => String(it.id) === String(studioEditingItemId));
        if (idx < 0) return;
        items[idx] = {
          ...items[idx],
          name,
          color,
          blocks,
          body: bodyText,
          updatedAt: Date.now(),
        };
        try {
          await patchStudioSubmission(studioOpenReviewId, {
            payload: { ...sub.payload, items },
          });
          closeStudioModal(editModal);
          renderStudio();
          showToast("Сохранено");
        } catch (err) {
          showToast(err.message || "Не удалось сохранить");
        }
        return;
      }

      const folder = getStudioFolder(studioOpenFolderId);
      const item = folder?.items.find((it) => it.id === studioEditingItemId);
      if (!item) return;
      item.name = name;
      item.color = color;
      item.blocks = blocks;
      item.body = bodyText;
      item.updatedAt = Date.now();
      saveStudioDoc();
      closeStudioModal(editModal);
      renderStudio();
      showToast("Сохранено");
    });

    document.getElementById("studio-review-reject")?.addEventListener("click", () => {
      if (!studioOpenReviewId) return;
      const reason = document.getElementById("studio-reject-reason");
      if (reason) reason.value = "";
      openStudioModal("studio-reject-modal");
      requestAnimationFrame(() => reason?.focus());
    });
    document.getElementById("studio-reject-modal-close")?.addEventListener("click", () => {
      closeStudioModal("studio-reject-modal");
    });
    document.getElementById("studio-reject-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const reasonEl = document.getElementById("studio-reject-reason");
      const reason = String(reasonEl?.value || "").trim();
      if (!reason) {
        reasonEl?.focus();
        return;
      }
      if (!studioOpenReviewId) return;
      try {
        await patchStudioSubmission(studioOpenReviewId, { status: "rejected", reason });
        closeStudioModal("studio-reject-modal");
        showToast("Отклонено");
        renderStudio();
      } catch (err) {
        showToast(err.message || "Не удалось отклонить");
      }
    });
    document.getElementById("studio-review-approve")?.addEventListener("click", async () => {
      if (!studioOpenReviewId) return;
      try {
        await patchStudioSubmission(studioOpenReviewId, { status: "approved" });
        showToast("Одобрено");
        renderStudio();
      } catch (err) {
        showToast(err.message || "Не удалось одобрить");
      }
    });
    document.getElementById("studio-review-added")?.addEventListener("click", async () => {
      if (!studioOpenReviewId) return;
      try {
        await patchStudioSubmission(studioOpenReviewId, { status: "added" });
        showToast("Отмечено как добавлено");
        renderStudio();
      } catch (err) {
        showToast(err.message || "Не удалось обновить");
      }
    });
    document.getElementById("studio-review-delete")?.addEventListener("click", async () => {
      if (!studioOpenReviewId) return;
      const sub = getOpenReviewSubmission();
      const st = String(sub?.status || "");
      if (st !== "rejected") {
        showToast("Удалить можно только отклонённые анкеты");
        return;
      }
      const isRace = isRaceSubmission(sub);
      const label = sub?.folderName || (isRace ? "расу" : "анкету");
      const ok = window.confirm(
        `Убрать «${label}» из списка анкет? Папка пользователя сохранится.`
      );
      if (!ok) return;
      try {
        await api(`/api/studio/submissions/${studioOpenReviewId}`, { method: "DELETE" });
        studioReviewList = studioReviewList.filter(
          (s) => Number(s.id) !== Number(studioOpenReviewId)
        );
        studioOpenReviewId = null;
        showToast("Убрано из анкет");
        renderStudio();
      } catch (err) {
        showToast(err.message || "Не удалось удалить");
      }
    });

    document.getElementById("studio-review-hide")?.addEventListener("click", async () => {
      if (!studioOpenReviewId) return;
      const sub = getOpenReviewSubmission();
      if (!sub) return;
      const st = String(sub.status || "");
      if (st !== "approved" && st !== "added") {
        showToast("Скрыть можно только одобренные или добавленные");
        return;
      }
      const nextHidden = !sub.hidden;
      try {
        await patchStudioSubmission(studioOpenReviewId, { hidden: nextHidden });
        showToast(nextHidden ? "Скрыто" : "Показано");
        if (nextHidden && studioReviewKindFilter !== "hidden") {
          studioReviewList = studioReviewList.filter(
            (s) => Number(s.id) !== Number(studioOpenReviewId)
          );
          studioOpenReviewId = null;
        } else if (!nextHidden && studioReviewKindFilter === "hidden") {
          studioReviewList = studioReviewList.filter(
            (s) => Number(s.id) !== Number(studioOpenReviewId)
          );
          studioOpenReviewId = null;
        }
        renderStudio();
      } catch (err) {
        showToast(err.message || "Не удалось обновить");
      }
    });

    document.getElementById("studio-review-toolbar")?.addEventListener("click", async (e) => {
      const statusBtn = e.target.closest("[data-studio-status]");
      if (statusBtn) {
        studioReviewStatusFilter = statusBtn.getAttribute("data-studio-status") || "all";
        renderStudio();
        return;
      }
      const kindBtn = e.target.closest("[data-studio-kind]");
      if (kindBtn) {
        const next = kindBtn.getAttribute("data-studio-kind") || "all";
        const prevHidden = studioReviewKindFilter === "hidden";
        studioReviewKindFilter = next;
        const nextHidden = next === "hidden";
        if (prevHidden !== nextHidden) {
          await loadStudioReviewList();
        }
        renderStudio();
      }
    });
    document.getElementById("studio-review-sort")?.addEventListener("change", (e) => {
      studioReviewSort = String(e.target.value || "date-desc");
      renderStudio();
    });
  }

  bindStudioUi();
  loadStudioDoc();
  syncStudioMineStatuses().then(() => renderStudio());
  renderStudio();

  /* ─── Orders (Заказы) ─── */
  let ordersTab = "main"; // main | review
  let ordersList = [];
  let ordersReviewList = [];
  let ordersOpenId = null;
  let ordersCtxId = null;
  let ordersFormKind = "skin";
  /** @type {{ name: string, dataUrl: string, role?: string }[]} */
  let ordersFormRefs = [];
  let ordersSkinUrls = [];
  let ordersAssets = {
    skins: [],
    skinModel: "/assets/model/skin/model.obj",
    costumeModel: "/assets/model/model/model.obj",
    modelTexture: "/assets/model/model/texture.png",
  };
  let ordersSkinLoaded = false;
  let ordersPreviewMod = null;
  let ordersPreviewsReady = false;
  let ordersPreviewSkinUrl = null;
  /** @type {Map<number, HTMLCanvasElement>} */
  const ordersTilePreviewCanvases = new Map();
  /** @type {Map<number, { setCropFeet?: (v: boolean) => void, stop?: () => void }>} */
  const ordersTilePreviewHandles = new Map();
  const ordersDetailPreviewCanvases = new Set();
  /** @type {Set<number>} */
  const ordersDismissedIds = new Set();
  let ordersReviewStatusFilter = "all";
  let ordersReviewKindFilter = "all";
  let ordersReviewSort = "date-desc";
  let ordersShowHidden = false;
  /** @type {{ name: string, dataUrl: string, role?: string }[]} */
  let ordersOwnerExtraRefs = [];

  function isOrdersFounder() {
    return Boolean(authToken && isFounderViewer());
  }

  function orderStatusTip(status, reason) {
    const s = String(status || "");
    if (s === "rejected") {
      const why = String(reason || "").trim();
      return why ? `Отклонено: ${why}` : "Отклонено";
    }
    if (s === "approved") return "Принято";
    if (s === "ready") return "Готово";
    if (s === "pending") return "В обработке";
    return "";
  }

  function appendOrderStar(host, status, reason, queueNo = null) {
    if (!host || !status) return;
    const tip = orderStatusTip(status, reason);
    if (!tip) return;
    const star = document.createElement("span");
    const starStatus = status === "ready" ? "ready" : status;
    star.className = `studio-tile__star studio-tile__star--${starStatus}`;
    star.textContent = "★";
    star.setAttribute("data-tip", tip);
    star.setAttribute("aria-label", tip);
    star.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    star.addEventListener("pointerdown", (e) => e.stopPropagation());
    host.appendChild(star);
    const qn = Number(queueNo);
    if (status === "approved" && Number.isFinite(qn) && qn > 0) {
      const badge = document.createElement("span");
      badge.className = "studio-tile__queue";
      badge.textContent = String(qn);
      badge.setAttribute("aria-label", `Очередь ${qn}`);
      host.appendChild(badge);
    }
  }

  function kindLabel(kind) {
    if (kind === "model") return "Модель";
    if (kind === "build") return "Постройка";
    return "Скин";
  }

  function kindAccent(kind) {
    if (kind === "model") return "#c4a0ff";
    if (kind === "build") return "#fbbf24";
    return "#7dd3fc";
  }

  function isOrderImageFile(f) {
    if (!f) return false;
    const src = f.path || f.dataUrl || "";
    return Boolean(src) && /\.(png|jpe?g|webp)$/i.test(f.name || f.path || src);
  }

  function orderCoverInfo(order) {
    const kind = String(order?.kind || "skin");
    const refs = Array.isArray(order?.refs) ? order.refs : [];
    const results = Array.isArray(order?.results) ? order.results : [];
    const st = String(order?.status || "");

    if (kind === "skin") {
      if (st === "ready" && results.length) {
        const first = results.find((r) => r?.path) || results[0];
        if (first?.path) {
          return { type: "skin3d", textureUrl: first.path, file: first, folder: "results" };
        }
      }
      const skinRef = refs.find((r) => String(r.role || "").toLowerCase() === "skin");
      if (skinRef?.path) {
        return { type: "skin3d", textureUrl: skinRef.path, file: skinRef, folder: "refs" };
      }
      const img = refs.find(isOrderImageFile);
      if (img?.path) return { type: "image", coverUrl: img.path };
      return { type: "race" };
    }

    const img = refs.find(isOrderImageFile);
    if (img?.path) return { type: "image", coverUrl: img.path };
    return { type: "race" };
  }

  function formatPurgeLeft(purgeAt) {
    const t = Date.parse(purgeAt || 0);
    if (!Number.isFinite(t)) return "24ч";
    const left = Math.max(0, t - Date.now());
    const hrs = Math.ceil(left / 3600000);
    if (hrs <= 0) return "скоро";
    return `~${hrs}ч`;
  }

  function formatPurgeCountdown(untilMs) {
    const left = Math.max(0, Number(untilMs) - Date.now());
    const totalSec = Math.floor(left / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function appendPurgeClock(host, untilMs) {
    if (!host || !Number.isFinite(Number(untilMs))) return null;
    const clock = document.createElement("span");
    clock.className = "studio-tile__purge-clock";
    clock.textContent = "⏱";
    clock.setAttribute("data-purge-until", String(untilMs));
    const tip = `Удаление через ${formatPurgeCountdown(untilMs)}`;
    clock.setAttribute("data-tip", tip);
    clock.setAttribute("aria-label", tip);
    clock.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    clock.addEventListener("pointerdown", (e) => e.stopPropagation());
    host.appendChild(clock);
    return clock;
  }

  function tickPurgeClocks() {
    document.querySelectorAll(".studio-tile__purge-clock[data-purge-until]").forEach((el) => {
      const until = Number(el.getAttribute("data-purge-until"));
      if (!Number.isFinite(until)) return;
      const tip = `Удаление через ${formatPurgeCountdown(until)}`;
      el.setAttribute("data-tip", tip);
      el.setAttribute("aria-label", tip);
    });
  }

  if (!window.__genesisPurgeClockTimer) {
    window.__genesisPurgeClockTimer = setInterval(tickPurgeClocks, 1000);
  }

  async function ensureOrdersPreviewMod() {
    if (ordersPreviewMod) return ordersPreviewMod;
    ordersPreviewMod = await import(`/assets/orders-preview.js?v=93`);
    return ordersPreviewMod;
  }

  async function disposeOrdersTilePreviews() {
    const handles = [...ordersTilePreviewHandles.values()];
    ordersTilePreviewHandles.clear();
    const canvases = [...ordersTilePreviewCanvases.values()];
    ordersTilePreviewCanvases.clear();
    handles.forEach((h) => {
      try {
        h?.stop?.();
      } catch (_) {
        /* ignore */
      }
    });
    try {
      const mod = ordersPreviewMod || (await ensureOrdersPreviewMod().catch(() => null));
      if (mod?.stopOrdersPreview) {
        canvases.forEach((c) => {
          try {
            mod.stopOrdersPreview(c);
          } catch (_) {
            /* ignore */
          }
        });
      }
    } catch (_) {
      /* ignore */
    }
  }

  async function disposeOrdersDetailPreviews() {
    const canvases = [...ordersDetailPreviewCanvases];
    ordersDetailPreviewCanvases.clear();
    try {
      const mod = ordersPreviewMod || (await ensureOrdersPreviewMod().catch(() => null));
      if (mod?.stopOrdersPreview) {
        canvases.forEach((c) => {
          try {
            mod.stopOrdersPreview(c);
          } catch (_) {
            /* ignore */
          }
        });
      }
    } catch (_) {
      /* ignore */
    }
  }

  async function disposeOrdersPreviews() {
    await disposeOrdersTilePreviews();
    await disposeOrdersDetailPreviews();
    const skinCanvas = document.getElementById("orders-skin-preview");
    const modelCanvas = document.getElementById("orders-model-preview");
    try {
      const mod = ordersPreviewMod || (await ensureOrdersPreviewMod().catch(() => null));
      if (mod?.stopOrdersPreview) {
        if (skinCanvas) mod.stopOrdersPreview(skinCanvas);
        if (modelCanvas) mod.stopOrdersPreview(modelCanvas);
      }
    } catch (_) {
      /* ignore */
    }
    ordersPreviewsReady = false;
  }

  async function ensureOrdersSkinAssets() {
    if (ordersSkinLoaded) return ordersAssets;
    try {
      const data = await api("/api/orders/assets");
      ordersSkinUrls = Array.isArray(data?.skins) ? data.skins : [];
      ordersAssets = {
        skins: ordersSkinUrls,
        skinModel: data?.skinModel || "/assets/model/skin/model.obj",
        costumeModel: data?.costumeModel || "/assets/model/model/model.obj",
        modelTexture: data?.modelTexture || "/assets/model/model/texture.png",
      };
    } catch {
      ordersSkinUrls = [1, 2, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17].map(
        (n) => `/assets/model/skin/${n}.png`
      );
      ordersAssets.skins = ordersSkinUrls;
    }
    ordersSkinLoaded = true;
    return ordersAssets;
  }

  function pickRandomOrderSkin() {
    const list = ordersSkinUrls;
    if (!list.length) return null;
    return list[Math.floor(Math.random() * list.length)];
  }

  async function loadOrdersPreviews({ force = false } = {}) {
    if (ordersPreviewsReady && !force) return;
    const assets = await ensureOrdersSkinAssets();
    const mod = await ensureOrdersPreviewMod();
    const skinCanvas = document.getElementById("orders-skin-preview");
    const modelCanvas = document.getElementById("orders-model-preview");
    if (!ordersPreviewSkinUrl || force) {
      ordersPreviewSkinUrl = pickRandomOrderSkin();
    }
    const skinUrl = ordersPreviewSkinUrl;
    const tasks = [];
    if (skinCanvas && skinUrl) {
      tasks.push(
        mod
          .mountOrdersPreview(skinCanvas, {
            objUrl: assets.skinModel,
            textureUrl: skinUrl,
            yaw: Math.PI,
            yOffset: -0.14,
            cropFeet: true,
            mode: "button",
            lookHost: skinCanvas.closest(".orders-type-card") || skinCanvas,
          })
          .catch((err) => console.warn("orders skin preview", err))
      );
    }
    if (modelCanvas) {
      tasks.push(
        mod
          .mountOrdersPreview(modelCanvas, {
            objUrl: assets.costumeModel,
            textureUrl: assets.modelTexture,
            yaw: Math.PI,
            cropFeet: true,
            mode: "button",
            lookHost: modelCanvas.closest(".orders-type-card") || modelCanvas,
          })
          .catch((err) => console.warn("orders model preview", err))
      );
    }
    await Promise.all(tasks);
    ordersPreviewsReady = true;
  }

  async function mountOrderTileSkinPreview(canvas, textureUrl, orderId, { cropFeet = true, lookHost = null } = {}) {
    if (!canvas || !textureUrl) return null;
    try {
      const assets = await ensureOrdersSkinAssets();
      const mod = await ensureOrdersPreviewMod();
      const handle = await mod.mountOrdersPreview(canvas, {
        objUrl: assets.skinModel,
        textureUrl,
        yaw: Math.PI,
        yOffset: 0,
        cropFeet,
        mode: "anketa",
        lookHost,
      });
      ordersTilePreviewCanvases.set(Number(orderId), canvas);
      if (handle) ordersTilePreviewHandles.set(Number(orderId), handle);
      return handle;
    } catch (err) {
      console.warn("orders tile preview", err);
      return null;
    }
  }

  function collectOrderSkinFiles(order) {
    const refs = Array.isArray(order?.refs) ? order.refs : [];
    const results = Array.isArray(order?.results) ? order.results : [];
    const files = [];
    const push = (f, folder) => {
      const path = f?.path || f?.dataUrl;
      if (!path) return;
      if (files.some((x) => (x.path || x.dataUrl) === path)) return;
      if (String(f.role || "").toLowerCase() === "ref") return;
      files.push({ ...f, folder });
    };
    refs.forEach((f) => {
      if (String(f.role || "").toLowerCase() === "skin") push(f, "refs");
    });
    if (String(order?.kind || "") === "skin") {
      results.forEach((f) => {
        if (isOrderImageFile(f)) push(f, "results");
      });
    } else {
      results.forEach((f) => {
        if (String(f.role || "").toLowerCase() === "skin") push(f, "results");
      });
    }
    return files;
  }

  async function filterExactSkinFiles(files) {
    const out = [];
    for (const f of files || []) {
      const src = f?.path || f?.dataUrl;
      if (!src) continue;
      const size = await probeImageSize(src);
      if (size && isLikelySkinDimensions(size.w, size.h)) out.push(f);
    }
    return out;
  }

  function fillOrderTileCoverImage(visual, coverUrl) {
    visual.classList.add("orders-tile-visual--cover");
    const img = document.createElement("img");
    img.className = "orders-cover-img";
    img.src = coverUrl;
    img.alt = "";
    img.draggable = false;
    visual.appendChild(img);
  }

  function fillOrderTileVisual(visual, order) {
    const cover = orderCoverInfo(order);
    visual.innerHTML = "";
    visual.classList.remove(
      "orders-tile-visual--skin",
      "orders-tile-visual--cover",
      "is-skin-full",
      "is-cover-full"
    );
    if (cover.type === "skin3d" && cover.textureUrl) {
      visual.classList.add("orders-tile-visual--skin");
      const canvas = document.createElement("canvas");
      canvas.className = "orders-tile-canvas";
      canvas.width = 96;
      canvas.height = 128;
      canvas.setAttribute("aria-hidden", "true");
      visual.appendChild(canvas);
      // Verify 64×64 before mounting 3D; otherwise show as flat cover
      void (async () => {
        const size = await probeImageSize(cover.textureUrl);
        if (!size || !isLikelySkinDimensions(size.w, size.h)) {
          visual.classList.remove("orders-tile-visual--skin");
          visual.innerHTML = "";
          fillOrderTileCoverImage(visual, cover.textureUrl);
          return;
        }
        mountOrderTileSkinPreview(canvas, cover.textureUrl, order.id, {
          cropFeet: true,
          lookHost: visual.closest(".studio-tile") || visual,
        });
      })();
      return "skin";
    }
    if (cover.type === "image" && cover.coverUrl) {
      fillOrderTileCoverImage(visual, cover.coverUrl);
      return "cover";
    }
    const img = document.createElement("img");
    img.className = "catalog-card__img orders-cover-img";
    img.src = "assets/race.png";
    img.alt = "";
    img.draggable = false;
    visual.appendChild(img);
    return null;
  }

  async function downloadOrderSingleFile(order, file, folder = "refs") {
    if (!order || !file) return;
    const folderName = folder === "results" ? "results" : "refs";
    try {
      if (file.id) {
        const res = await fetch(
          `/api/orders/${order.id}/files/${folderName}/${file.id}`,
          {
            headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
          }
        );
        if (res.ok) {
          const blob = await res.blob();
          const a = document.createElement("a");
          const url = URL.createObjectURL(blob);
          a.href = url;
          a.download = file.name || `skin-${file.id}.png`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
          showToast("Скин скачан");
          return;
        }
      }
      if (file.path || file.dataUrl) {
        const a = document.createElement("a");
        a.href = file.path || file.dataUrl;
        a.download = file.name || "skin.png";
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        a.remove();
        showToast("Скин скачан");
        return;
      }
    } catch (_) {
      /* fall through */
    }
    showToast("Не удалось скачать скин");
  }

  async function mountOrdersDetailSkinPreviews(host, order, files) {
    if (!host || !files?.length) return;
    const assets = await ensureOrdersSkinAssets();
    const mod = await ensureOrdersPreviewMod();
    const skins = await filterExactSkinFiles(files);
    if (!skins.length) return;
    for (const file of skins.slice(0, 6)) {
      const url = file.path || file.dataUrl;
      if (!url) continue;
      const card = document.createElement("div");
      card.className = "orders-preview-card orders-preview-card--install";
      const frame = document.createElement("div");
      frame.className = "orders-preview-card__frame";
      const canvas = document.createElement("canvas");
      canvas.className = "orders-preview-card__canvas";
      canvas.width = 180;
      canvas.height = 300;
      canvas.setAttribute("aria-hidden", "true");
      frame.appendChild(canvas);
      card.appendChild(frame);
      const action = document.createElement("button");
      action.type = "button";
      action.className = "mc-btn mc-btn--compact orders-preview-card__action";
      action.textContent = "Скачать";
      action.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        void downloadOrderSingleFile(order, file, file.folder || "refs");
      });
      card.appendChild(action);
      host.appendChild(card);
      ordersDetailPreviewCanvases.add(canvas);
      try {
        await mod.mountOrdersPreview(canvas, {
          objUrl: assets.skinModel,
          textureUrl: url,
          yaw: Math.PI,
          yOffset: 0,
          cropFeet: false,
          mode: "install",
          lookHost: frame,
        });
      } catch (err) {
        console.warn("orders detail skin", err);
      }
    }
  }

  async function onOrdersTabShown() {
    updateOrdersSubtabsUi();
    if (ordersTab === "main") {
      await loadOrdersPreviews();
      if (authToken) await loadOrdersMine();
      renderOrdersUi();
    } else if (ordersTab === "review" && isOrdersFounder()) {
      await disposeOrdersPreviews();
      await loadOrdersReview();
      renderOrdersUi();
    } else {
      ordersTab = "main";
      await loadOrdersPreviews();
      if (authToken) await loadOrdersMine();
      renderOrdersUi();
    }
  }

  function updateOrdersSubtabsUi() {
    const tabs = document.getElementById("orders-subtabs");
    if (!tabs) return;
    const founder = isOrdersFounder();
    tabs.hidden = !founder;
    if (!founder && ordersTab === "review") {
      ordersTab = "main";
      ordersOpenId = null;
    }
    tabs.querySelectorAll("[data-orders-tab]").forEach((btn) => {
      btn.classList.toggle(
        "is-active",
        btn.getAttribute("data-orders-tab") === ordersTab
      );
    });
  }

  function hideOrdersItemMenu() {
    const menu = document.getElementById("orders-item-menu");
    if (menu) menu.hidden = true;
    ordersCtxId = null;
  }

  function showOrdersItemMenu(orderId, clientX, clientY, listSource) {
    const list = listSource || ordersList;
    const order = list.find((o) => Number(o.id) === Number(orderId));
    const menu = document.getElementById("orders-item-menu");
    if (!menu || !order) return;
    ordersCtxId = Number(orderId);
    const soft = Boolean(order.deletedAt);
    const ready =
      String(order.status) === "ready" &&
      Array.isArray(order.results) &&
      order.results.length > 0;
    const openBtn = menu.querySelector('[data-orders-act="open"]');
    const dl = menu.querySelector('[data-orders-act="download"]');
    const restoreBtn = menu.querySelector('[data-orders-act="restore"]');
    const softBtn = menu.querySelector('[data-orders-act="soft-delete"]');
    const hardBtn = menu.querySelector('[data-orders-act="hard-delete"]');
    if (openBtn) openBtn.hidden = false;
    if (dl) dl.hidden = !ready || soft;
    if (restoreBtn) restoreBtn.hidden = !soft;
    if (softBtn) {
      softBtn.hidden = soft || String(order.status) === "ready";
    }
    if (hardBtn) hardBtn.hidden = !soft;
    placeStudioMenu(menu, clientX, clientY);
  }

  function renderOrdersRefsChips() {
    const list = document.getElementById("orders-form-refs-list");
    if (!list) return;
    list.innerHTML = "";
    ordersFormRefs.forEach((file, idx) => {
      const chip = document.createElement("span");
      chip.className = "orders-ref-chip";
      const roleMark = file.role === "skin" ? " [скин]" : "";
      chip.textContent = `${file.name || `файл ${idx + 1}`}${roleMark}`;
      const rm = document.createElement("button");
      rm.type = "button";
      rm.setAttribute("aria-label", "Убрать");
      rm.textContent = "×";
      rm.addEventListener("click", () => {
        ordersFormRefs.splice(idx, 1);
        renderOrdersRefsChips();
      });
      chip.appendChild(rm);
      list.appendChild(chip);
    });
  }

  function openOrdersForm(kind) {
    if (!authToken) {
      openAuthModal("login");
      showToast("Войдите, чтобы оформить заказ");
      return;
    }
    ordersFormKind = kind === "model" ? "model" : kind === "build" ? "build" : "skin";
    ordersFormRefs = [];
    const title = document.getElementById("orders-form-modal-title");
    if (title) {
      title.textContent =
        ordersFormKind === "model"
          ? "Заказ модели"
          : ordersFormKind === "build"
            ? "Заказ постройки"
            : "Заказ скина";
    }
    const desc = document.getElementById("orders-form-desc");
    if (desc) {
      desc.value = "";
      desc.placeholder =
        ordersFormKind === "model"
          ? "Опишите костюмную модель: форма, детали, цвета, стиль…"
          : ordersFormKind === "build"
            ? "Опишите постройку…"
            : "Опишите скин: внешность, одежда, цвета, стиль…";
    }
    const refsBtn = document.getElementById("orders-form-refs-btn");
    if (refsBtn) {
      refsBtn.textContent =
        ordersFormKind === "skin"
          ? "Прикрепить референсы / скин"
          : "Прикрепить референсы";
    }
    const err = document.getElementById("orders-form-error");
    if (err) {
      err.hidden = true;
      err.textContent = "";
    }
    const input = document.getElementById("orders-form-refs-input");
    if (input) input.value = "";
    renderOrdersRefsChips();
    openStudioModal("orders-form-modal");
    requestAnimationFrame(() => desc?.focus());
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
      reader.readAsDataURL(file);
    });
  }

  function probeImageSize(dataUrl) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () =>
        resolve({ w: img.naturalWidth || 0, h: img.naturalHeight || 0 });
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    });
  }

  function isLikelySkinDimensions(w, h) {
    return Number(w) === 64 && Number(h) === 64;
  }

  async function filesToOrderPayload(fileList, max = 8, { detectSkinRole = false } = {}) {
    const files = Array.from(fileList || []).slice(0, max);
    const out = [];
    for (const file of files) {
      if (!file || file.size > 4 * 1024 * 1024) continue;
      try {
        const dataUrl = await readFileAsDataUrl(file);
        const entry = { name: file.name || "file.png", dataUrl };
        if (detectSkinRole) {
          const size = await probeImageSize(dataUrl);
          entry.role =
            size && isLikelySkinDimensions(size.w, size.h) ? "skin" : "ref";
        }
        out.push(entry);
      } catch {
        /* skip */
      }
    }
    return out;
  }

  async function loadOrdersMine() {
    if (!authToken) {
      ordersList = [];
      return;
    }
    try {
      const data = await api("/api/orders/mine");
      const raw = Array.isArray(data?.orders) ? data.orders : [];
      ordersList = raw.filter((o) => {
        const id = Number(o.id);
        if (ordersDismissedIds.has(id) && o.deletedAt) return false;
        return true;
      });
    } catch (err) {
      ordersList = [];
      showToast(err.message || "Не удалось загрузить заказы");
    }
  }

  async function loadOrdersReview() {
    if (!isOrdersFounder()) {
      ordersReviewList = [];
      return;
    }
    try {
      const path = ordersShowHidden ? "/api/orders?showHidden=1" : "/api/orders";
      const data = await api(path);
      ordersReviewList = Array.isArray(data?.orders) ? data.orders : [];
    } catch (err) {
      ordersReviewList = [];
      showToast(err.message || "Не удалось загрузить анкеты заказов");
    }
  }

  function getOpenOrder() {
    const fromMine = ordersList.find((o) => Number(o.id) === Number(ordersOpenId));
    if (fromMine) return fromMine;
    return ordersReviewList.find((o) => Number(o.id) === Number(ordersOpenId)) || null;
  }

  function getFilteredSortedOrdersReview() {
    const statusRank = { pending: 0, approved: 1, ready: 2, rejected: 3 };
    let list = Array.isArray(ordersReviewList) ? [...ordersReviewList] : [];
    if (ordersReviewStatusFilter !== "all") {
      list = list.filter(
        (o) => String(o.status || "pending") === ordersReviewStatusFilter
      );
    }
    if (ordersReviewKindFilter !== "all") {
      list = list.filter((o) => String(o.kind || "skin") === ordersReviewKindFilter);
    }
    const nameOf = (o) => kindLabel(o.kind).toLowerCase();
    const nickOf = (o) => String(o.submitterMcNick || "").toLowerCase();
    const timeOf = (o) => {
      const t = Date.parse(o.updatedAt || o.createdAt || 0);
      return Number.isFinite(t) ? t : 0;
    };
    list.sort((a, b) => {
      switch (ordersReviewSort) {
        case "date-asc":
          return timeOf(a) - timeOf(b);
        case "name-asc":
          return nameOf(a).localeCompare(nameOf(b), "ru", { sensitivity: "base" });
        case "name-desc":
          return nameOf(b).localeCompare(nameOf(a), "ru", { sensitivity: "base" });
        case "nick-asc":
          return nickOf(a).localeCompare(nickOf(b), "ru", { sensitivity: "base" });
        case "nick-desc":
          return nickOf(b).localeCompare(nickOf(a), "ru", { sensitivity: "base" });
        case "status": {
          const d =
            (statusRank[String(a.status || "pending")] ?? 9) -
            (statusRank[String(b.status || "pending")] ?? 9);
          if (d) return d;
          return timeOf(b) - timeOf(a);
        }
        case "date-desc":
        default:
          return timeOf(b) - timeOf(a);
      }
    });
    return list;
  }

  function updateOrdersReviewToolbarUi() {
    const toolbar = document.getElementById("orders-review-toolbar");
    if (!toolbar) return;
    toolbar.querySelectorAll("[data-orders-status]").forEach((btn) => {
      btn.classList.toggle(
        "is-active",
        !ordersShowHidden &&
          btn.getAttribute("data-orders-status") === ordersReviewStatusFilter
      );
    });
    const hiddenBtn = toolbar.querySelector("[data-orders-hidden]");
    if (hiddenBtn) hiddenBtn.classList.toggle("is-active", ordersShowHidden);
    toolbar.querySelectorAll("[data-orders-kind]").forEach((btn) => {
      btn.classList.toggle(
        "is-active",
        btn.getAttribute("data-orders-kind") === ordersReviewKindFilter
      );
    });
    const sort = document.getElementById("orders-review-sort");
    if (sort && sort.value !== ordersReviewSort) sort.value = ordersReviewSort;
  }

  function renderOrdersFiles(files, emptyText) {
    const wrap = document.createElement("div");
    wrap.className = "orders-files";
    const list = Array.isArray(files) ? files : [];
    if (!list.length) {
      const empty = document.createElement("p");
      empty.className = "orders-empty";
      empty.style.padding = "0";
      empty.textContent = emptyText || "Нет файлов";
      wrap.appendChild(empty);
      return wrap;
    }
    list.forEach((f) => {
      const src = f.path || "";
      if (src && /\.(png|jpe?g|webp)$/i.test(f.name || src)) {
        const img = document.createElement("img");
        img.className = "orders-file-thumb";
        img.src = src;
        img.alt = f.name || "";
        img.title = f.name || "";
        wrap.appendChild(img);
      } else {
        const a = document.createElement("a");
        a.className = "orders-file-link";
        a.href = src || "#";
        a.target = "_blank";
        a.rel = "noopener";
        a.textContent = f.name || "файл";
        wrap.appendChild(a);
      }
    });
    return wrap;
  }

  function updateOrdersDetailActions(order) {
    const wrap = document.getElementById("orders-detail-actions");
    const rejectBtn = document.getElementById("orders-reject-btn");
    const approveBtn = document.getElementById("orders-approve-btn");
    const attachLabel = document.getElementById("orders-attach-label");
    const downloadBtn = document.getElementById("orders-download-btn");
    const ownerSave = document.getElementById("orders-owner-save-btn");
    const ownerSubmit = document.getElementById("orders-owner-submit-btn");
    const hideBtn = document.getElementById("orders-hide-btn");
    const deleteBtn = document.getElementById("orders-delete-btn");
    if (!wrap) return;
    if (!order) {
      wrap.hidden = true;
      return;
    }
    const st = String(order.status || "pending");
    const soft = Boolean(order.deletedAt);
    const isOwner =
      authUser && Number(order.submitterId) === Number(authUser.id);
    const founder = isOrdersFounder();
    const reviewMode = ordersTab === "review" && founder;

    wrap.hidden = false;

    if (downloadBtn) {
      downloadBtn.hidden = !(
        st === "ready" &&
        Array.isArray(order.results) &&
        order.results.length > 0 &&
        !soft
      );
    }

    const ownerEditable =
      isOwner &&
      !reviewMode &&
      !soft &&
      (st === "pending" || st === "rejected");
    if (ownerSave) ownerSave.hidden = !ownerEditable;
    if (ownerSubmit) ownerSubmit.hidden = !ownerEditable;

    if (rejectBtn) rejectBtn.hidden = !reviewMode || soft || st === "rejected";
    if (approveBtn) {
      approveBtn.hidden =
        !reviewMode || soft || st === "approved" || st === "ready";
    }
    if (attachLabel) {
      attachLabel.hidden =
        !reviewMode || soft || (st !== "approved" && st !== "ready");
    }
    if (hideBtn) {
      const canHide = reviewMode && !soft && st === "ready";
      hideBtn.hidden = !canHide;
      hideBtn.textContent = order.hidden ? "Показать" : "Скрыть";
    }
    if (deleteBtn) {
      deleteBtn.hidden = !reviewMode || soft || st !== "rejected";
    }

    const anyVisible = [
      downloadBtn,
      ownerSave,
      ownerSubmit,
      rejectBtn,
      approveBtn,
      attachLabel,
      hideBtn,
      deleteBtn,
    ].some((el) => el && !el.hidden);
    wrap.hidden = !anyVisible;
  }

  async function renderOrdersDetail() {
    await disposeOrdersDetailPreviews();
    const order = getOpenOrder();
    const body = document.getElementById("orders-detail-body");
    const title = document.getElementById("orders-detail-title");
    if (!body) return;
    body.innerHTML = "";
    ordersOwnerExtraRefs = [];
    if (!order) {
      if (title) title.textContent = "";
      updateOrdersDetailActions(null);
      return;
    }
    if (title) {
      title.textContent = `${kindLabel(order.kind)} · ${order.submitterMcNick || "—"}`;
    }
    const meta = document.createElement("div");
    meta.className = "orders-detail__meta";
    const queueBit =
      order.status === "approved" && order.queueNo != null
        ? `<span>Очередь: №${order.queueNo}</span>`
        : "";
    meta.innerHTML = `
      <span>Статус: ${orderStatusTip(order.status, order.reason) || order.status}</span>
      <span>ID: #${order.id}</span>
      ${queueBit}
    `;
    body.appendChild(meta);

    const skinFiles = collectOrderSkinFiles(order);
    if (skinFiles.length) {
      const skinTitle = document.createElement("h3");
      skinTitle.className = "orders-detail__section-title";
      skinTitle.textContent = "Превью на модели";
      body.appendChild(skinTitle);
      const skinRow = document.createElement("div");
      skinRow.className = "orders-detail-skins";
      body.appendChild(skinRow);
      void mountOrdersDetailSkinPreviews(skinRow, order, skinFiles);
    }

    const st = String(order.status || "pending");
    const soft = Boolean(order.deletedAt);
    const isOwner =
      authUser && Number(order.submitterId) === Number(authUser.id);
    const founder = isOrdersFounder();
    const reviewMode = ordersTab === "review" && founder;
    const ownerEditable =
      isOwner &&
      !reviewMode &&
      !soft &&
      (st === "pending" || st === "rejected");

    const descTitle = document.createElement("h3");
    descTitle.className = "orders-detail__section-title";
    descTitle.textContent = "Описание";
    body.appendChild(descTitle);

    if (ownerEditable) {
      const area = document.createElement("textarea");
      area.className = "field-area";
      area.id = "orders-detail-desc";
      area.rows = 5;
      area.value = order.description || "";
      body.appendChild(area);

      const refsRow = document.createElement("div");
      refsRow.className = "orders-refs-row";
      const addRefs = document.createElement("button");
      addRefs.type = "button";
      addRefs.className = "mc-btn mc-btn--compact";
      addRefs.textContent = "Добавить файлы";
      const refsInput = document.createElement("input");
      refsInput.type = "file";
      refsInput.accept = "image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp";
      refsInput.multiple = true;
      refsInput.hidden = true;
      addRefs.addEventListener("click", () => refsInput.click());
      const chips = document.createElement("div");
      chips.className = "orders-refs-list";
      chips.id = "orders-detail-refs-chips";
      const renderOwnerChips = () => {
        chips.innerHTML = "";
        ordersOwnerExtraRefs.forEach((file, idx) => {
          const chip = document.createElement("span");
          chip.className = "orders-ref-chip";
          chip.textContent = file.name || `файл ${idx + 1}`;
          const rm = document.createElement("button");
          rm.type = "button";
          rm.textContent = "×";
          rm.addEventListener("click", () => {
            ordersOwnerExtraRefs.splice(idx, 1);
            renderOwnerChips();
          });
          chip.appendChild(rm);
          chips.appendChild(chip);
        });
      };
      refsInput.addEventListener("change", async () => {
        const added = await filesToOrderPayload(refsInput.files, 8, {
          detectSkinRole: order.kind === "skin",
        });
        ordersOwnerExtraRefs = [...ordersOwnerExtraRefs, ...added].slice(0, 8);
        refsInput.value = "";
        renderOwnerChips();
      });
      refsRow.appendChild(addRefs);
      refsRow.appendChild(refsInput);
      body.appendChild(refsRow);
      body.appendChild(chips);
    } else {
      const desc = document.createElement("p");
      desc.className = "orders-detail__desc";
      desc.textContent = order.description || "";
      body.appendChild(desc);
    }

    if (order.status === "rejected" && order.reason) {
      const rTitle = document.createElement("h3");
      rTitle.className = "orders-detail__section-title";
      rTitle.textContent = "Причина отклонения";
      body.appendChild(rTitle);
      const reason = document.createElement("p");
      reason.className = "orders-detail__desc";
      reason.textContent = order.reason;
      body.appendChild(reason);
    }

    const refsTitle = document.createElement("h3");
    refsTitle.className = "orders-detail__section-title";
    refsTitle.textContent = "Референсы";
    body.appendChild(refsTitle);
    body.appendChild(renderOrdersFiles(order.refs, "Референсы не прикреплены"));

    const resTitle = document.createElement("h3");
    resTitle.className = "orders-detail__section-title";
    resTitle.textContent =
      order.kind === "model" ? "Готовые файлы" : "Готовые скины";
    body.appendChild(resTitle);
    body.appendChild(renderOrdersFiles(order.results, "Пока нет готовых файлов"));

    updateOrdersDetailActions(order);
  }

  function createOrderTile(order, listSource) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "studio-tile catalog-card";
    if (order.deletedAt) btn.classList.add("orders-tile--soft-deleted");
    btn.setAttribute("role", "listitem");
    btn.style.setProperty("--section-accent", kindAccent(order.kind));

    const visual = document.createElement("div");
    visual.className = "catalog-card__visual";
    const coverKind = fillOrderTileVisual(visual, order);
    btn.appendChild(visual);
    if (order.deletedAt) {
      const until =
        Date.parse(order.purgeAt || 0) ||
        (Date.parse(order.deletedAt) || Date.now()) + 86400000;
      appendPurgeClock(btn, until);
    } else {
      appendOrderStar(btn, order.status, order.reason, order.queueNo);
    }

    if (coverKind === "skin") {
      btn.addEventListener("pointerenter", () => {
        visual.classList.add("is-skin-full");
        ordersTilePreviewHandles.get(Number(order.id))?.setCropFeet?.(false);
      });
      btn.addEventListener("pointerleave", () => {
        visual.classList.remove("is-skin-full");
        ordersTilePreviewHandles.get(Number(order.id))?.setCropFeet?.(true);
      });
    } else if (coverKind === "cover") {
      btn.addEventListener("pointerenter", () => {
        visual.classList.add("is-cover-full");
      });
      btn.addEventListener("pointerleave", () => {
        visual.classList.remove("is-cover-full");
      });
    }

    const stack = document.createElement("div");
    stack.className = "studio-tile__label-stack catalog-card__label";
    const name = document.createElement("span");
    name.className = "studio-tile__name";
    name.textContent = kindLabel(order.kind);
    const sub = document.createElement("span");
    sub.className = "studio-tile__sub";
    if (order.deletedAt) {
      sub.textContent = "Удалено · ПКМ: восстановить";
    } else if (isOrdersFounder() && ordersTab === "review") {
      sub.textContent = order.submitterMcNick || "—";
    } else {
      sub.textContent = orderStatusTip(order.status, order.reason) || order.status;
    }
    stack.appendChild(name);
    stack.appendChild(sub);
    btn.appendChild(stack);

    btn.addEventListener("click", () => {
      ordersOpenId = Number(order.id);
      renderOrdersUi();
    });
    btn.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
      showOrdersItemMenu(order.id, e.clientX, e.clientY, listSource);
    });
    return btn;
  }

  async function renderOrdersBoard() {
    await disposeOrdersTilePreviews();
    const readyGrid = document.getElementById("orders-ready-grid");
    const activeGrid = document.getElementById("orders-active-grid");
    const readyEmpty = document.getElementById("orders-ready-empty");
    const activeEmpty = document.getElementById("orders-active-empty");
    if (!readyGrid || !activeGrid) return;
    readyGrid.innerHTML = "";
    activeGrid.innerHTML = "";

    if (!authToken) {
      if (readyEmpty) {
        readyEmpty.hidden = false;
        readyEmpty.textContent = "Войдите, чтобы видеть заказы";
      }
      if (activeEmpty) {
        activeEmpty.hidden = false;
        activeEmpty.textContent = "Войдите, чтобы видеть заказы";
      }
      return;
    }

    const ready = [];
    const active = [];
    const soft = [];
    ordersList.forEach((o) => {
      if (o.deletedAt) {
        soft.push(o);
        return;
      }
      if (String(o.status) === "ready") ready.push(o);
      else active.push(o);
    });
    soft.sort((a, b) => {
      const ta = Date.parse(a.deletedAt || 0) || 0;
      const tb = Date.parse(b.deletedAt || 0) || 0;
      return ta - tb;
    });

    if (readyEmpty) {
      readyEmpty.hidden = ready.length > 0;
      readyEmpty.textContent = "Пока нет готовых";
    }
    if (activeEmpty) {
      activeEmpty.hidden = active.length + soft.length > 0;
      activeEmpty.textContent = "Нет активных заказов";
    }

    ready.forEach((o) => readyGrid.appendChild(createOrderTile(o, ordersList)));
    active.forEach((o) => activeGrid.appendChild(createOrderTile(o, ordersList)));
    soft.forEach((o) => activeGrid.appendChild(createOrderTile(o, ordersList)));
  }

  async function renderOrdersReviewGrid() {
    await disposeOrdersTilePreviews();
    const grid = document.getElementById("orders-review-grid");
    const empty = document.getElementById("orders-review-empty");
    if (!grid) return;
    grid.innerHTML = "";
    updateOrdersReviewToolbarUi();
    const filtered = getFilteredSortedOrdersReview();
    if (!ordersReviewList.length) {
      if (empty) {
        empty.hidden = false;
        empty.textContent = ordersShowHidden
          ? "Нет скрытых заказов"
          : "Пока никто не отправил заказы";
      }
      return;
    }
    if (!filtered.length) {
      if (empty) {
        empty.hidden = false;
        empty.textContent = "Нет заказов по выбранным фильтрам";
      }
      return;
    }
    if (empty) empty.hidden = true;
    filtered.forEach((o) =>
      grid.appendChild(createOrderTile(o, ordersReviewList))
    );
  }

  function renderOrdersUi() {
    updateOrdersSubtabsUi();
    const mainPanel = document.getElementById("orders-main-panel");
    const reviewPanel = document.getElementById("orders-review-panel");
    const detail = document.getElementById("orders-detail");
    const typeFrame = document.getElementById("orders-type-frame");
    const board = document.getElementById("orders-board");

    if (ordersOpenId) {
      if (mainPanel) mainPanel.hidden = true;
      if (reviewPanel) reviewPanel.hidden = true;
      if (detail) detail.hidden = false;
      renderOrdersDetail();
      return;
    }

    if (detail) detail.hidden = true;

    if (ordersTab === "review" && isOrdersFounder()) {
      if (mainPanel) mainPanel.hidden = true;
      if (reviewPanel) reviewPanel.hidden = false;
      renderOrdersReviewGrid();
      return;
    }

    if (reviewPanel) reviewPanel.hidden = true;
    if (mainPanel) mainPanel.hidden = false;
    if (typeFrame) typeFrame.hidden = false;
    if (board) board.hidden = false;
    renderOrdersBoard();
  }

  function upsertOrderInLists(order) {
    if (!order) return;
    const merge = (list) => {
      const idx = list.findIndex((o) => Number(o.id) === Number(order.id));
      if (idx >= 0) list[idx] = order;
      else list.unshift(order);
    };
    merge(ordersList);
    merge(ordersReviewList);
  }

  async function patchOrder(id, body) {
    const data = await api(`/api/orders/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    const order = data?.order;
    if (order) upsertOrderInLists(order);
    return order;
  }

  async function downloadOrderResults(order) {
    const files = Array.isArray(order?.results) ? order.results : [];
    if (!files.length) {
      showToast("Нет файлов для скачивания");
      return;
    }
    for (const file of files) {
      try {
        const res = await fetch(`/api/orders/${order.id}/files/results/${file.id}`, {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        });
        if (!res.ok) throw new Error("fail");
        const blob = await res.blob();
        const a = document.createElement("a");
        const url = URL.createObjectURL(blob);
        a.href = url;
        a.download = file.name || `file-${file.id}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch {
        if (file.path) {
          const a = document.createElement("a");
          a.href = file.path;
          a.download = file.name || "file.png";
          a.target = "_blank";
          document.body.appendChild(a);
          a.click();
          a.remove();
        }
      }
    }
    showToast(files.length > 1 ? "Скачивание начато" : "Файл скачан");
  }

  async function softDeleteOrder(id) {
    const data = await api(`/api/orders/${id}/soft-delete`, { method: "POST" });
    if (data?.order) upsertOrderInLists(data.order);
    return data?.order;
  }

  async function restoreOrderLocal(id) {
    const data = await api(`/api/orders/${id}/restore`, { method: "POST" });
    if (data?.order) upsertOrderInLists(data.order);
    ordersDismissedIds.delete(Number(id));
    return data?.order;
  }

  async function hardDeleteOrder(id) {
    await api(`/api/orders/${id}/hard-delete`, { method: "POST" });
    ordersList = ordersList.filter((o) => Number(o.id) !== Number(id));
    ordersReviewList = ordersReviewList.filter((o) => Number(o.id) !== Number(id));
    ordersDismissedIds.add(Number(id));
    if (Number(ordersOpenId) === Number(id)) ordersOpenId = null;
  }

  function bindOrdersUi() {
    document.getElementById("orders-subtabs")?.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-orders-tab]");
      if (!btn) return;
      const next = btn.getAttribute("data-orders-tab");
      if (next !== "main" && next !== "review") return;
      if (next === "review" && !isOrdersFounder()) return;
      ordersTab = next;
      ordersOpenId = null;
      hideOrdersItemMenu();
      if (ordersTab === "review") {
        await disposeOrdersPreviews();
        await loadOrdersReview();
      } else {
        await loadOrdersPreviews();
        if (authToken) await loadOrdersMine();
      }
      renderOrdersUi();
    });

    document.getElementById("orders-type-skin")?.addEventListener("click", () =>
      openOrdersForm("skin")
    );
    document.getElementById("orders-type-model")?.addEventListener("click", () =>
      openOrdersForm("model")
    );
    document.getElementById("orders-type-build")?.addEventListener("click", () => {
      showToast('Раздел «Постройка» скоро');
    });

    document.getElementById("orders-form-modal-close")?.addEventListener("click", () => {
      closeStudioModal("orders-form-modal");
    });
    document.getElementById("orders-form-refs-btn")?.addEventListener("click", () => {
      document.getElementById("orders-form-refs-input")?.click();
    });
    document
      .getElementById("orders-form-refs-input")
      ?.addEventListener("change", async (e) => {
        const input = e.target;
        const added = await filesToOrderPayload(input?.files, 8, {
          detectSkinRole: ordersFormKind === "skin",
        });
        ordersFormRefs = [...ordersFormRefs, ...added].slice(0, 8);
        if (input) input.value = "";
        renderOrdersRefsChips();
      });
    document.getElementById("orders-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const descEl = document.getElementById("orders-form-desc");
      const err = document.getElementById("orders-form-error");
      const description = String(descEl?.value || "").trim();
      if (!description) {
        descEl?.focus();
        if (err) {
          err.hidden = false;
          err.textContent = "Опишите заказ";
        }
        return;
      }
      const submitBtn = document.getElementById("orders-form-submit");
      if (submitBtn) submitBtn.disabled = true;
      try {
        const data = await api("/api/orders", {
          method: "POST",
          body: JSON.stringify({
            kind: ordersFormKind,
            description,
            refs: ordersFormRefs,
          }),
        });
        if (data?.order) {
          ordersList.unshift(data.order);
        }
        closeStudioModal("orders-form-modal");
        showToast("Заказ отправлен");
        ordersTab = "main";
        ordersOpenId = null;
        await loadOrdersMine();
        renderOrdersUi();
      } catch (ex) {
        if (err) {
          err.hidden = false;
          err.textContent = ex.message || "Не удалось отправить";
        } else {
          showToast(ex.message || "Не удалось отправить");
        }
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });

    document.getElementById("orders-detail-back")?.addEventListener("click", async () => {
      ordersOpenId = null;
      if (ordersTab === "main") await loadOrdersPreviews();
      renderOrdersUi();
    });

    document.getElementById("orders-download-btn")?.addEventListener("click", async () => {
      const order = getOpenOrder();
      if (!order) return;
      await downloadOrderResults(order);
    });

    const ownerPatch = async ({ submit }) => {
      if (!ordersOpenId) return;
      const descEl = document.getElementById("orders-detail-desc");
      const description = String(descEl?.value || "").trim();
      if (!description) {
        descEl?.focus();
        showToast("Опишите заказ");
        return;
      }
      const body = { description };
      if (ordersOwnerExtraRefs.length) body.refs = ordersOwnerExtraRefs;
      if (submit) body.status = "pending";
      try {
        await patchOrder(ordersOpenId, body);
        ordersOwnerExtraRefs = [];
        showToast(submit ? "Отправлено" : "Сохранено");
        await loadOrdersMine();
        renderOrdersUi();
      } catch (err) {
        showToast(err.message || "Не удалось сохранить");
      }
    };
    document
      .getElementById("orders-owner-save-btn")
      ?.addEventListener("click", () => ownerPatch({ submit: false }));
    document
      .getElementById("orders-owner-submit-btn")
      ?.addEventListener("click", () => ownerPatch({ submit: true }));

    document.getElementById("orders-reject-btn")?.addEventListener("click", () => {
      if (!ordersOpenId) return;
      const reason = document.getElementById("orders-reject-reason");
      if (reason) reason.value = "";
      openStudioModal("orders-reject-modal");
      requestAnimationFrame(() => reason?.focus());
    });
    document.getElementById("orders-reject-modal-close")?.addEventListener("click", () => {
      closeStudioModal("orders-reject-modal");
    });
    document.getElementById("orders-reject-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const reasonEl = document.getElementById("orders-reject-reason");
      const reason = String(reasonEl?.value || "").trim();
      if (!reason) {
        reasonEl?.focus();
        return;
      }
      if (!ordersOpenId) return;
      try {
        await patchOrder(ordersOpenId, { status: "rejected", reason });
        closeStudioModal("orders-reject-modal");
        showToast("Отклонено");
        renderOrdersUi();
      } catch (err) {
        showToast(err.message || "Не удалось отклонить");
      }
    });
    document.getElementById("orders-approve-btn")?.addEventListener("click", async () => {
      if (!ordersOpenId) return;
      try {
        await patchOrder(ordersOpenId, { status: "approved" });
        showToast("Принято");
        renderOrdersUi();
      } catch (err) {
        showToast(err.message || "Не удалось принять");
      }
    });
    document.getElementById("orders-attach-input")?.addEventListener("change", async (e) => {
      const input = e.target;
      if (!ordersOpenId || !input?.files?.length) return;
      const files = await filesToOrderPayload(input.files, 12);
      input.value = "";
      if (!files.length) {
        showToast("Не удалось прочитать файлы");
        return;
      }
      try {
        const data = await api(`/api/orders/${ordersOpenId}/results`, {
          method: "POST",
          body: JSON.stringify({ files }),
        });
        if (data?.order) upsertOrderInLists(data.order);
        showToast("Файлы прикреплены");
        renderOrdersUi();
      } catch (err) {
        showToast(err.message || "Не удалось прикрепить");
      }
    });
    document.getElementById("orders-hide-btn")?.addEventListener("click", async () => {
      if (!ordersOpenId) return;
      const order = getOpenOrder();
      if (!order) return;
      const nextHidden = !order.hidden;
      try {
        await patchOrder(ordersOpenId, { hidden: nextHidden });
        showToast(nextHidden ? "Скрыто" : "Показано");
        if (nextHidden && !ordersShowHidden) {
          ordersReviewList = ordersReviewList.filter(
            (o) => Number(o.id) !== Number(ordersOpenId)
          );
          ordersOpenId = null;
        } else if (!nextHidden && ordersShowHidden) {
          ordersReviewList = ordersReviewList.filter(
            (o) => Number(o.id) !== Number(ordersOpenId)
          );
          ordersOpenId = null;
        }
        renderOrdersUi();
      } catch (err) {
        showToast(err.message || "Не удалось обновить");
      }
    });
    document.getElementById("orders-delete-btn")?.addEventListener("click", async () => {
      if (!ordersOpenId) return;
      const order = getOpenOrder();
      if (String(order?.status || "") !== "rejected") {
        showToast("Удалить можно только отклонённые заказы");
        return;
      }
      const ok = window.confirm(
        `Убрать заказ #${ordersOpenId} из списка анкет? У пользователя заказ останется.`
      );
      if (!ok) return;
      try {
        const data = await api(`/api/orders/${ordersOpenId}`, { method: "DELETE" });
        if (data?.order) upsertOrderInLists(data.order);
        ordersReviewList = ordersReviewList.filter(
          (o) => Number(o.id) !== Number(ordersOpenId)
        );
        ordersOpenId = null;
        showToast("Убрано из анкет");
        renderOrdersUi();
      } catch (err) {
        showToast(err.message || "Не удалось удалить");
      }
    });

    document.getElementById("orders-review-toolbar")?.addEventListener("click", async (e) => {
      const statusBtn = e.target.closest("[data-orders-status]");
      if (statusBtn) {
        ordersReviewStatusFilter = statusBtn.getAttribute("data-orders-status") || "all";
        if (ordersShowHidden) {
          ordersShowHidden = false;
          await loadOrdersReview();
        }
        renderOrdersUi();
        return;
      }
      const hiddenBtn = e.target.closest("[data-orders-hidden]");
      if (hiddenBtn) {
        ordersShowHidden = !ordersShowHidden;
        await loadOrdersReview();
        renderOrdersUi();
        return;
      }
      const kindBtn = e.target.closest("[data-orders-kind]");
      if (kindBtn) {
        ordersReviewKindFilter = kindBtn.getAttribute("data-orders-kind") || "all";
        renderOrdersUi();
      }
    });
    document.getElementById("orders-review-sort")?.addEventListener("change", (e) => {
      ordersReviewSort = String(e.target.value || "date-desc");
      renderOrdersUi();
    });

    document.getElementById("orders-item-menu")?.addEventListener("click", async (e) => {
      const actBtn = e.target.closest("[data-orders-act]");
      if (!actBtn) return;
      const act = actBtn.getAttribute("data-orders-act");
      const id = ordersCtxId;
      hideOrdersItemMenu();
      if (!id) return;
      const order =
        ordersList.find((o) => Number(o.id) === Number(id)) ||
        ordersReviewList.find((o) => Number(o.id) === Number(id));
      if (!order) return;
      if (act === "open") {
        ordersOpenId = Number(id);
        renderOrdersUi();
        return;
      }
      if (act === "download") {
        await downloadOrderResults(order);
        return;
      }
      if (act === "soft-delete") {
        if (String(order.status) === "ready") return;
        const ok = window.confirm("Удалить заказ? Можно восстановить в течение 24ч.");
        if (!ok) return;
        try {
          await softDeleteOrder(id);
          showToast("Заказ удалён");
          if (Number(ordersOpenId) === Number(id)) ordersOpenId = null;
          renderOrdersUi();
        } catch (err) {
          showToast(err.message || "Не удалось удалить");
        }
        return;
      }
      if (act === "restore") {
        try {
          await restoreOrderLocal(id);
          showToast("Заказ восстановлен");
          renderOrdersUi();
        } catch (err) {
          showToast(err.message || "Не удалось восстановить");
        }
        return;
      }
      if (act === "hard-delete") {
        if (!order.deletedAt) return;
        const ok = window.confirm("Удалить заказ навсегда без восстановления?");
        if (!ok) return;
        try {
          await hardDeleteOrder(id);
          showToast("Удалено навсегда");
          renderOrdersUi();
        } catch (err) {
          showToast(err.message || "Не удалось удалить");
        }
      }
    });

    document.addEventListener("pointerdown", (e) => {
      const menu = document.getElementById("orders-item-menu");
      if (menu && !menu.hidden && menu.contains(e.target)) return;
      if (menu && !menu.hidden) hideOrdersItemMenu();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") hideOrdersItemMenu();
    });
  }

  bindOrdersUi();

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
    try {
      playNotifySound();
    } catch (_) {
      /* sound may init later */
    }
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

  function readInstalledModStamp() {
    try {
      return String(localStorage.getItem(MOD_INSTALLED_KEY) || "").trim();
    } catch {
      return "";
    }
  }

  function writeInstalledModStamp(stamp) {
    try {
      localStorage.setItem(MOD_INSTALLED_KEY, String(stamp || ""));
    } catch {
      /* ignore */
    }
  }

  function currentModStamp() {
    const version = String(serverInfo?.mod?.version || "").trim();
    const updatedAt = String(serverInfo?.mod?.updatedAt || "").trim();
    if (!version && !updatedAt) return "";
    return `${version}|${updatedAt}`;
  }

  function hasModUpdate() {
    const current = currentModStamp();
    if (!current) return false;
    const installed = readInstalledModStamp();
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
    const stamp = currentModStamp();
    if (stamp) writeInstalledModStamp(stamp);
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

  /* ---------- Studio content blocks ---------- */
  const STUDIO_BLOCK_FILE_MAX = 8 * 1024 * 1024;
  let studioBlockIdSeq = 1;
  let studioBlockFileTargetId = null;
  /** Working copy while edit modal is open */
  let studioEditBlocks = [];
  /** @type {Map<string, {name:string,ext:string,bytes:Uint8Array,size:number,dataUrl?:string}>} */
  const studioBlockFiles = new Map();

  function formatBytes(n) {
    if (!Number.isFinite(n) || n < 0) return "0 Б";
    if (n < 1024) return `${n} Б`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} КБ`;
    return `${(n / (1024 * 1024)).toFixed(1)} МБ`;
  }

  function createStudioBlock(type) {
    const id = `sb_${Date.now().toString(36)}_${studioBlockIdSeq++}`;
    const defaultTitle =
      type === "text" ? "Текст" : type === "craft" ? "Рецепт" : "Файл";
    if (type === "text") return { id, type: "text", title: defaultTitle, body: "" };
    if (type === "craft") {
      return {
        id,
        type: "craft",
        title: defaultTitle,
        mode: "3x3",
        cells: Array(9).fill(""),
        legend: {},
        smeltItem: "",
      };
    }
    return { id, type: "file", title: defaultTitle, fileName: "", ext: "", size: 0, dataUrl: "" };
  }

  function cloneStudioBlocks(blocks) {
    return (Array.isArray(blocks) ? blocks : []).map((b) => {
      if (!b || typeof b !== "object") return null;
      const defaultTitle =
        b.type === "text" ? "Текст" : b.type === "craft" ? "Рецепт" : "Файл";
      if (b.type === "text") {
        return {
          id: String(b.id || createStudioBlock("text").id),
          type: "text",
          title: String(b.title || defaultTitle),
          body: String(b.body || ""),
        };
      }
      if (b.type === "craft") {
        return {
          id: String(b.id || createStudioBlock("craft").id),
          type: "craft",
          title: String(b.title || defaultTitle),
          mode: normalizeCraftMode(b.mode || "3x3") === "none" ? "3x3" : normalizeCraftMode(b.mode || "3x3"),
          cells: Array.isArray(b.cells) ? b.cells.map((c) => String(c || "")) : Array(9).fill(""),
          legend: b.legend && typeof b.legend === "object" ? { ...b.legend } : {},
          smeltItem: String(b.smeltItem || ""),
        };
      }
      if (b.type === "file") {
        return {
          id: String(b.id || createStudioBlock("file").id),
          type: "file",
          title: String(b.title || defaultTitle),
          fileName: String(b.fileName || ""),
          ext: String(b.ext || ""),
          size: Number(b.size) || 0,
          dataUrl: String(b.dataUrl || ""),
        };
      }
      return null;
    }).filter(Boolean);
  }

  function serializeBlocksMeta(blocks, filesMap = studioBlockFiles) {
    return cloneStudioBlocks(blocks).map((b) => {
      if (b.type === "file") {
        const stored = filesMap.get(b.id);
        return {
          ...b,
          dataUrl: stored?.dataUrl || b.dataUrl || "",
        };
      }
      return b;
    });
  }

  function serializeStudioBlocksMeta(blocks) {
    return serializeBlocksMeta(blocks, studioBlockFiles);
  }

  function migrateItemBodyToBlocks(item) {
    const blocks = cloneStudioBlocks(item.blocks);
    if (blocks.length) return blocks;
    const body = String(item.body || "").trim();
    if (!body) return [];
    const block = createStudioBlock("text");
    block.body = body;
    return [block];
  }

  function syncStudioCraftLegend(block, legendEl) {
    if (!legendEl) return;
    const readOnly = Boolean(getBlocksCtx().readOnly());
    if (!block.legend || typeof block.legend !== "object") block.legend = {};
    const cells = Array.isArray(block.cells) ? block.cells : [];
    const seen = new Set(cells.filter(Boolean));
    Object.keys(block.legend).forEach((sym) => {
      if (!seen.has(sym)) delete block.legend[sym];
    });
    legendEl.innerHTML = "";
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
      nameInp.value = block.legend[sym] || "";
      nameInp.disabled = readOnly;
      nameInp.readOnly = readOnly;
      nameInp.addEventListener("input", () => {
        block.legend[sym] = nameInp.value;
      });
      row.append(symBox, nameInp);
      legendEl.appendChild(row);
    });
  }

  function renderStudioBlockCraft(block, bodyEl) {
    const ctx = getBlocksCtx();
    const readOnly = Boolean(ctx.readOnly());
    const mode = normalizeCraftMode(block.mode || "3x3");
    block.mode = mode === "none" ? "3x3" : mode;

    const tabs = document.createElement("div");
    tabs.className = "craft-mode-tabs race-block-craft-tabs";
    tabs.setAttribute("role", "tablist");
    [
      ["smelt", "Плавка"],
      ["2x2", "2×2"],
      ["3x3", "3×3"],
    ].forEach(([m, label]) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `craft-tab${block.mode === m ? " is-active" : ""}`;
      btn.dataset.craft = m;
      btn.textContent = label;
      btn.disabled = readOnly;
      btn.addEventListener("click", () => {
        if (readOnly) return;
        const prev = block.mode;
        block.mode = m;
        if (m === "2x2" || m === "3x3") {
          const count = m === "2x2" ? 4 : 9;
          const next = Array(count).fill("");
          const prevCells = Array.isArray(block.cells) ? block.cells : [];
          for (let i = 0; i < Math.min(count, prevCells.length); i += 1) next[i] = prevCells[i] || "";
          block.cells = next;
        }
        if (prev !== m) ctx.rerender();
      });
      tabs.appendChild(btn);
    });
    bodyEl.appendChild(tabs);

    if (block.mode === "smelt") {
      const label = document.createElement("label");
      label.className = "craft-sub-label";
      label.textContent = "Название предмета для плавки";
      const inp = document.createElement("input");
      inp.className = "field-input";
      inp.type = "text";
      inp.maxLength = 64;
      inp.placeholder = "Например: железная руда";
      inp.value = block.smeltItem || "";
      inp.disabled = readOnly;
      inp.readOnly = readOnly;
      inp.addEventListener("input", () => {
        block.smeltItem = inp.value;
      });
      bodyEl.append(label, inp);
      return;
    }

    const size = block.mode === "2x2" ? 2 : 3;
    const count = size * size;
    if (!Array.isArray(block.cells) || block.cells.length !== count) {
      const next = Array(count).fill("");
      const prev = Array.isArray(block.cells) ? block.cells : [];
      for (let i = 0; i < Math.min(count, prev.length); i += 1) next[i] = prev[i] || "";
      block.cells = next;
    }
    if (!block.legend || typeof block.legend !== "object") block.legend = {};

    const grid = document.createElement("div");
    grid.className = `craft-grid craft-grid--${size}`;
    const legend = document.createElement("div");
    legend.className = "craft-legend";

    block.cells.forEach((val, idx) => {
      const cell = document.createElement("div");
      cell.className = "craft-cell";
      const inp = document.createElement("input");
      inp.type = "text";
      inp.maxLength = 1;
      inp.value = val || "";
      inp.disabled = readOnly;
      inp.readOnly = readOnly;
      inp.addEventListener("input", () => {
        const ch = inp.value.slice(-1).toUpperCase();
        inp.value = ch;
        block.cells[idx] = ch;
        syncStudioCraftLegend(block, legend);
      });
      cell.appendChild(inp);
      grid.appendChild(cell);
    });
    bodyEl.appendChild(grid);
    syncStudioCraftLegend(block, legend);
    bodyEl.appendChild(legend);
  }

  function getBlocksCtx() {
    return (
      blocksCtx || {
        listId: "studio-blocks-list",
        getBlocks: () => studioEditBlocks,
        setBlocks: (next) => {
          studioEditBlocks = next;
        },
        filesMap: studioBlockFiles,
        readOnly: () => studioEditReadOnly,
        fileInputId: "studio-block-file-input",
        setFileTarget: (id) => {
          studioBlockFileTargetId = id;
        },
        rerender: () => renderStudioBlocks(),
      }
    );
  }

  function renderStudioBlocks() {
    const ctx = getBlocksCtx();
    const list = document.getElementById(ctx.listId);
    if (!list) return;
    list.innerHTML = "";
    const readOnly = Boolean(ctx.readOnly());
    const blocks = ctx.getBlocks();
    const filesMap = ctx.filesMap;

    blocks.forEach((block) => {
      const card = document.createElement("section");
      card.className = "race-block";
      card.dataset.blockId = block.id;

      const head = document.createElement("div");
      head.className = "race-block__head";
      const title = document.createElement("input");
      title.type = "text";
      title.className = "race-block__title-input";
      title.maxLength = 64;
      title.value =
        block.title ||
        (block.type === "text" ? "Текст" : block.type === "craft" ? "Рецепт" : "Файл");
      title.disabled = readOnly;
      title.addEventListener("input", () => {
        block.title = title.value;
      });
      const del = document.createElement("button");
      del.type = "button";
      del.className = "race-block__del";
      del.textContent = "×";
      del.title = "Удалить блок";
      del.hidden = readOnly;
      del.addEventListener("click", () => {
        filesMap.delete(block.id);
        ctx.setBlocks(blocks.filter((b) => b.id !== block.id));
        ctx.rerender();
      });
      head.append(title, del);
      card.appendChild(head);

      const body = document.createElement("div");
      body.className = "race-block__body";

      if (block.type === "text") {
        const toolbar = document.createElement("div");
        toolbar.className = "patch-md-toolbar";
        toolbar.setAttribute("role", "toolbar");
        toolbar.hidden = readOnly;
        [
          ["bold", "B", "Жирный"],
          ["italic", "I", "Курсив"],
          ["h2", "H", "Заголовок"],
          ["ul", "•≡", "Список"],
          ["code", "</>", "Код"],
          ["link", "URL", "Ссылка"],
        ].forEach(([kind, label, tip]) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "patch-md-btn";
          btn.dataset.md = kind;
          btn.title = tip;
          btn.textContent = label;
          if (kind === "italic") btn.innerHTML = "<em>I</em>";
          toolbar.appendChild(btn);
        });
        const ta = document.createElement("textarea");
        ta.className = "field-area race-block__textarea";
        ta.rows = 5;
        ta.placeholder = "Опишите контент…";
        ta.value = block.body || "";
        ta.readOnly = readOnly;
        ta.addEventListener("input", () => {
          block.body = ta.value;
          autosizeArea(ta);
        });
        toolbar.addEventListener("click", (e) => {
          if (readOnly) return;
          const btn = e.target.closest("[data-md]");
          if (!btn) return;
          applyMdToSelection(btn.getAttribute("data-md"), ta);
          block.body = ta.value;
          autosizeArea(ta);
        });
        body.append(toolbar, ta);
        requestAnimationFrame(() => autosizeArea(ta));
      } else if (block.type === "craft") {
        renderStudioBlockCraft(block, body);
      } else {
        const hint = document.createElement("p");
        hint.className = "field-hint";
        hint.textContent = `Текстура, звук, модель, схематика или любой файл · до ${formatBytes(STUDIO_BLOCK_FILE_MAX)}`;
        const fileRow = document.createElement("div");
        fileRow.className = "race-block__file-row";
        const hasBytes = filesMap.has(block.id) || Boolean(block.dataUrl);
        if (block.fileName) {
          const name = document.createElement("div");
          name.className = "race-block__file-name";
          name.textContent = hasBytes
            ? `${block.fileName} · ${formatBytes(block.size || 0)}`
            : `${block.fileName} · нужно выбрать файл снова`;
          if (!hasBytes) name.classList.add("is-missing");
          fileRow.appendChild(name);
          if (!readOnly) {
            const clear = document.createElement("button");
            clear.type = "button";
            clear.className = "mc-btn mc-btn--compact mc-btn--ghost";
            clear.textContent = hasBytes ? "Убрать" : "Выбрать";
            clear.addEventListener("click", () => {
              if (hasBytes) {
                filesMap.delete(block.id);
                block.fileName = "";
                block.ext = "";
                block.size = 0;
                block.dataUrl = "";
                ctx.rerender();
              } else {
                ctx.setFileTarget(block.id);
                document.getElementById(ctx.fileInputId)?.click();
              }
            });
            fileRow.appendChild(clear);
          }
        } else if (!readOnly) {
          const pick = document.createElement("button");
          pick.type = "button";
          pick.className = "mc-btn mc-btn--compact";
          pick.textContent = "Выбрать файл";
          pick.addEventListener("click", () => {
            ctx.setFileTarget(block.id);
            document.getElementById(ctx.fileInputId)?.click();
          });
          fileRow.appendChild(pick);
        } else {
          const empty = document.createElement("div");
          empty.className = "race-block__file-name";
          empty.textContent = "Файл не прикреплён";
          fileRow.appendChild(empty);
        }
        body.append(hint, fileRow);
      }

      card.appendChild(body);
      list.appendChild(card);
    });
  }

  function renderHubRaceBlocks() {
    blocksCtx = {
      listId: "hub-race-blocks-list",
      getBlocks: () => hubRaceBlocks,
      setBlocks: (next) => {
        hubRaceBlocks = next;
      },
      filesMap: hubRaceBlockFiles,
      readOnly: () => false,
      fileInputId: "hub-race-block-file-input",
      setFileTarget: (id) => {
        hubRaceBlockFileTargetId = id;
      },
      rerender: () => renderHubRaceBlocks(),
    };
    try {
      renderStudioBlocks();
    } finally {
      blocksCtx = null;
    }
  }

  function addStudioBlock(type) {
    studioEditBlocks.push(createStudioBlock(type));
    renderStudioBlocks();
  }

  function addHubRaceBlock(type) {
    hubRaceBlocks.push(createStudioBlock(type));
    renderHubRaceBlocks();
  }

  function bytesToDataUrl(bytes, mime) {
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return `data:${mime || "application/octet-stream"};base64,${btoa(binary)}`;
  }

  document.getElementById("studio-block-add-btn")?.addEventListener("click", () => {
    if (studioEditReadOnly) return;
    const menu = document.getElementById("studio-block-type-menu");
    if (!menu) return;
    menu.hidden = !menu.hidden;
  });

  document.getElementById("studio-block-type-menu")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-studio-block-type]");
    if (!btn) return;
    addStudioBlock(btn.getAttribute("data-studio-block-type"));
    document.getElementById("studio-block-type-menu").hidden = true;
  });

  document.addEventListener("click", (e) => {
    const menu = document.getElementById("studio-block-type-menu");
    const addBtn = document.getElementById("studio-block-add-btn");
    if (!menu || menu.hidden) return;
    if (menu.contains(e.target) || addBtn?.contains(e.target)) return;
    menu.hidden = true;
  });

  document.getElementById("studio-block-file-input")?.addEventListener("change", async (e) => {
    const input = e.target;
    const file = input.files?.[0];
    input.value = "";
    const block = studioEditBlocks.find((b) => b.id === studioBlockFileTargetId);
    studioBlockFileTargetId = null;
    if (!file || !block || block.type !== "file") return;
    if (file.size > STUDIO_BLOCK_FILE_MAX) {
      showToast(`Файл слишком большой (до ${formatBytes(STUDIO_BLOCK_FILE_MAX)})`);
      return;
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const dataUrl = bytesToDataUrl(bytes, file.type || "application/octet-stream");
    studioBlockFiles.set(block.id, {
      name: file.name,
      ext: extFromName(file.name),
      bytes,
      size: file.size,
      dataUrl,
    });
    block.fileName = file.name;
    block.ext = extFromName(file.name);
    block.size = file.size;
    block.dataUrl = dataUrl;
    renderStudioBlocks();
    showToast("Файл добавлен");
  });

  document.getElementById("hub-race-block-add-btn")?.addEventListener("click", () => {
    const menu = document.getElementById("hub-race-block-type-menu");
    if (!menu) return;
    menu.hidden = !menu.hidden;
  });

  document.getElementById("hub-race-block-type-menu")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-hub-race-block-type]");
    if (!btn) return;
    addHubRaceBlock(btn.getAttribute("data-hub-race-block-type"));
    document.getElementById("hub-race-block-type-menu").hidden = true;
  });

  document.addEventListener("click", (e) => {
    const menu = document.getElementById("hub-race-block-type-menu");
    const addBtn = document.getElementById("hub-race-block-add-btn");
    if (!menu || menu.hidden) return;
    if (menu.contains(e.target) || addBtn?.contains(e.target)) return;
    menu.hidden = true;
  });

  document.getElementById("hub-race-block-file-input")?.addEventListener("change", async (e) => {
    const input = e.target;
    const file = input.files?.[0];
    input.value = "";
    const block = hubRaceBlocks.find((b) => b.id === hubRaceBlockFileTargetId);
    hubRaceBlockFileTargetId = null;
    if (!file || !block || block.type !== "file") return;
    if (file.size > STUDIO_BLOCK_FILE_MAX) {
      showToast(`Файл слишком большой (до ${formatBytes(STUDIO_BLOCK_FILE_MAX)})`);
      return;
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const dataUrl = bytesToDataUrl(bytes, file.type || "application/octet-stream");
    hubRaceBlockFiles.set(block.id, {
      name: file.name,
      ext: extFromName(file.name),
      bytes,
      size: file.size,
      dataUrl,
    });
    block.fileName = file.name;
    block.ext = extFromName(file.name);
    block.size = file.size;
    block.dataUrl = dataUrl;
    renderHubRaceBlocks();
    showToast("Файл добавлен");
  });

  /* ---------- Content form (item) ---------- */
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

  /* ── Craft block (content form) ───────────────── */
  let craftMode = "none"; // "none" | "smelt" | "2x2" | "3x3"
  let craftCells = Array(9).fill("");
  const craftSymMap = new Map();

  function craftGridSize(mode = craftMode) {
    return mode === "2x2" ? 2 : 3;
  }

  function craftCellCount(mode = craftMode) {
    const n = craftGridSize(mode);
    return n * n;
  }

  function isCraftGridMode(mode = craftMode) {
    return mode === "2x2" || mode === "3x3" || mode === "craft";
  }

  function normalizeCraftMode(mode) {
    if (mode === "craft") return "3x3";
    if (["none", "smelt", "2x2", "3x3"].includes(mode)) return mode;
    return "none";
  }

  function buildCraftGrid() {
    const grid = document.getElementById("craft-grid");
    if (!grid) return;
    const size = craftGridSize();
    const count = size * size;
    if (craftCells.length !== count) {
      const next = Array(count).fill("");
      for (let i = 0; i < Math.min(count, craftCells.length); i += 1) next[i] = craftCells[i] || "";
      craftCells = next;
    }
    grid.className = `craft-grid craft-grid--${size}`;
    grid.innerHTML = "";
    craftCells.forEach((val, idx) => {
      const cell = document.createElement("div");
      cell.className = "craft-cell";
      const inp = document.createElement("input");
      inp.type = "text";
      inp.maxLength = 1;
      inp.value = craftCells[idx] || "";
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

    const seen = new Set();
    craftCells.forEach((c) => {
      if (c) seen.add(c);
    });

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
    craftMode = normalizeCraftMode(mode);
    document.querySelectorAll("#craft-mode-tabs .craft-tab").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.craft === craftMode);
    });
    const smelt = document.getElementById("craft-smelt");
    const gridPanel = document.getElementById("craft-grid-panel");
    if (smelt) smelt.hidden = craftMode !== "smelt";
    if (gridPanel) gridPanel.hidden = !isCraftGridMode(craftMode);
    if (isCraftGridMode(craftMode)) buildCraftGrid();
  }

  function resetCraft() {
    craftSymMap.clear();
    craftMode = "none";
    craftCells = Array(9).fill("");
    setCraftMode("none");
    updateCraftLegend();
    const smeltInput = document.getElementById("smelt-item");
    if (smeltInput) smeltInput.value = "";
  }

  document.getElementById("craft-mode-tabs")?.addEventListener("click", (e) => {
    const tab = e.target.closest(".craft-tab");
    if (!tab) return;
    setCraftMode(tab.dataset.craft);
    if (isCraftGridMode(craftMode)) {
      buildCraftGrid();
      updateCraftLegend();
    }
  });

  buildCraftGrid();

  function craftToText() {
    if (craftMode === "none") return "";
    if (craftMode === "smelt") {
      const item = document.getElementById("smelt-item")?.value.trim() || "—";
      return `Плавка: ${item}`;
    }
    const size = craftGridSize();
    const rows = [];
    for (let r = 0; r < size; r += 1) {
      const row = craftCells
        .slice(r * size, r * size + size)
        .map((c) => c || "0")
        .join("|");
      rows.push(row);
    }
    const grid = rows.join("\n");
    const legend = [];
    craftSymMap.forEach((name, sym) => {
      legend.push(`${sym} — ${name || "—"}`);
    });
    return [`Крафт ${size}×${size}:`, grid, ``, `Легенда:`, ...legend].join("\n");
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
      setCraftMode(craftRequired ? "3x3" : "none");
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

  document.getElementById("server-mod-btn")?.addEventListener("click", async (e) => {
    e.preventDefault();
    const url = serverInfo?.mod?.downloadUrl;
    const fileName = serverInfo?.mod?.fileName || "genesis.jar";
    if (!url || url === "#") {
      showToast("Файл мода пока не загружен");
      return;
    }
    try {
      if (String(url).startsWith("/")) {
        const res = await fetch(url, {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        });
        if (!res.ok) {
          let data = null;
          try {
            data = await res.json();
          } catch {
            data = null;
          }
          throw new Error(data?.error || `HTTP ${res.status}`);
        }
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
      markModInstalled();
    } catch (err) {
      showToast(err.message || "Не удалось скачать мод");
    }
  });

  document.getElementById("server-mod-notify-btn")?.addEventListener("click", async () => {
    if (String(authUser?.role || "") !== "founder") return;
    const ok = window.confirm(
      "Уведомить всех об обновлении мода?\n\nВ папке Google Drive должен лежать один .jar (ты уже залил его вручную)."
    );
    if (!ok) return;
    showToast("Читаю папку Google Drive…");
    try {
      const data = await api("/api/server/mod/notify", { method: "POST", body: "{}" });
      if (data?.server) serverInfo = data.server;
      renderServerTab();
      const name = data?.drive?.name || serverInfo?.mod?.fileName || "мод";
      showToast(`Обновление опубликовано: ${name}`);
    } catch (err) {
      showToast(err.message || "Не удалось уведомить об обновлении");
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

  function applyMdToSelection(kind, textarea) {
    const ta = textarea || document.getElementById("patch-field-body");
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
    ta.dispatchEvent(new Event("input", { bubbles: true }));
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

  /* ---------- Chat tab ---------- */
  const CHAT_NOTIFY_PREFS_KEY = "genesis_chat_notify_prefs_v1";
  let chatScope = "mine"; // mine | public
  let chatRooms = [];
  let chatActiveRoomId = null;
  let chatMessages = [];
  let chatRoomsDirty = true;
  let chatLoading = false;
  /** @type {Map<number, any>} */
  const chatRoomsById = new Map();
  /** @type {Set<number>} */
  const chatUnreadRoomIds = new Set();
  /** @type {Set<number>} */
  const chatSeenMsgIds = new Set();
  let chatNotifyPrefs = {
    all: true,
    public: false,
    personal: true,
    mutedRooms: {},
  };
  let chatSettingsMine = [];
  let chatSettingsPublic = [];

  function loadChatNotifyPrefs() {
    try {
      const raw = localStorage.getItem(CHAT_NOTIFY_PREFS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return;
      chatNotifyPrefs = {
        all: parsed.all !== false,
        public: Boolean(parsed.public),
        personal: parsed.personal !== false,
        mutedRooms:
          parsed.mutedRooms && typeof parsed.mutedRooms === "object"
            ? { ...parsed.mutedRooms }
            : {},
      };
    } catch {
      /* ignore */
    }
  }

  function saveChatNotifyPrefs() {
    try {
      localStorage.setItem(CHAT_NOTIFY_PREFS_KEY, JSON.stringify(chatNotifyPrefs));
    } catch {
      /* ignore */
    }
  }

  function isChatRoomMuted(roomId) {
    return Boolean(chatNotifyPrefs.mutedRooms[String(roomId)]);
  }

  function setChatRoomMuted(roomId, muted) {
    const key = String(roomId);
    if (muted) chatNotifyPrefs.mutedRooms[key] = true;
    else delete chatNotifyPrefs.mutedRooms[key];
    saveChatNotifyPrefs();
  }

  function shouldNotifyChatMessage(room, message) {
    if (!chatNotifyPrefs.all) return false;
    if (!room || !message) return false;
    const myId = Number(authUser?.id);
    if (myId && Number(message.userId) === myId) return false;
    if (isChatRoomMuted(room.id)) return false;
    const type = String(room.type || "");
    if (type === "public") {
      if (!chatNotifyPrefs.public) return false;
    } else {
      // dm + group = личные
      if (!chatNotifyPrefs.personal) return false;
    }
    const chatTabOpen = Boolean(
      document.querySelector('.main-tab-panel[data-main-panel="chat"].is-active')
    );
    if (chatTabOpen && Number(chatActiveRoomId) === Number(room.id)) return false;
    return true;
  }

  function updateChatTabBadge() {
    const badge = document.getElementById("chat-tab-badge");
    if (badge) badge.hidden = chatUnreadRoomIds.size === 0;
  }

  function rememberChatRoom(room) {
    if (!room?.id) return;
    chatRoomsById.set(Number(room.id), room);
  }

  function escapeChat(s) {
    return escapeHtml(String(s || ""));
  }

  function chatRoomTitle(room) {
    if (!room) return "Чат";
    return room.title || room.name || `Чат #${room.id}`;
  }

  function chatTypeLabel(type) {
    if (type === "dm") return "ЛС";
    if (type === "group") return "Группа";
    if (type === "public") return "Общий";
    return type || "";
  }

  function formatChatTime(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return "";
    return d.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function setChatNotifyToggleUi(btn, on, labelOn, labelOff) {
    if (!btn) return;
    btn.classList.toggle("is-on", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.textContent = on ? labelOn : labelOff;
  }

  function renderChatSettingsRoomList(hostId, emptyId, rooms) {
    const host = document.getElementById(hostId);
    const empty = document.getElementById(emptyId);
    if (!host) return;
    host.innerHTML = "";
    if (!rooms.length) {
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;
    rooms.forEach((room) => {
      const row = document.createElement("div");
      row.className = "chat-settings-room";
      const name = document.createElement("span");
      name.className = "chat-settings-room__name";
      name.textContent = chatRoomTitle(room);
      const muteBtn = document.createElement("button");
      muteBtn.type = "button";
      const muted = isChatRoomMuted(room.id);
      muteBtn.className = `chat-settings-room__mute${muted ? "" : " is-on"}`;
      muteBtn.dataset.roomId = String(room.id);
      muteBtn.textContent = muted ? "Выкл" : "Вкл";
      muteBtn.setAttribute("aria-pressed", muted ? "false" : "true");
      muteBtn.title = muted ? "Уведомления выключены" : "Уведомления включены";
      row.append(name, muteBtn);
      host.appendChild(row);
    });
  }

  async function renderChatSettingsUi() {
    loadChatNotifyPrefs();
    setChatNotifyToggleUi(
      document.getElementById("chat-notify-all"),
      chatNotifyPrefs.all,
      "Все уведомления: Вкл",
      "Все уведомления: Выкл"
    );
    setChatNotifyToggleUi(
      document.getElementById("chat-notify-public"),
      chatNotifyPrefs.public,
      "Общие чаты: Вкл",
      "Общие чаты: Выкл"
    );
    setChatNotifyToggleUi(
      document.getElementById("chat-notify-personal"),
      chatNotifyPrefs.personal,
      "Личные чаты: Вкл",
      "Личные чаты: Выкл"
    );

    if (!authToken) {
      chatSettingsMine = [];
      chatSettingsPublic = [];
      renderChatSettingsRoomList("chat-settings-mine", "chat-settings-mine-empty", []);
      renderChatSettingsRoomList(
        "chat-settings-public",
        "chat-settings-public-empty",
        []
      );
      return;
    }

    try {
      const [mineData, publicData] = await Promise.all([
        api("/api/chat/rooms?scope=mine"),
        api("/api/chat/rooms?scope=public"),
      ]);
      chatSettingsMine = Array.isArray(mineData.rooms) ? mineData.rooms : [];
      chatSettingsPublic = (Array.isArray(publicData.rooms) ? publicData.rooms : []).filter(
        (r) => r.joined
      );
      chatSettingsMine.forEach(rememberChatRoom);
      chatSettingsPublic.forEach(rememberChatRoom);
    } catch (err) {
      console.warn("chat settings rooms:", err.message);
    }

    renderChatSettingsRoomList(
      "chat-settings-mine",
      "chat-settings-mine-empty",
      chatSettingsMine
    );
    renderChatSettingsRoomList(
      "chat-settings-public",
      "chat-settings-public-empty",
      chatSettingsPublic
    );
  }

  async function ensureChatLoaded() {
    if (!authToken) {
      showToast("Войди, чтобы открыть чат");
      return;
    }
    await loadPlayersDirectory();
    await refreshChatRooms();
  }

  async function refreshChatRooms({ keepSelection = false } = {}) {
    if (!authToken || chatLoading) return;
    chatLoading = true;
    try {
      const data = await api(`/api/chat/rooms?scope=${chatScope === "public" ? "public" : "mine"}`);
      chatRooms = Array.isArray(data.rooms) ? data.rooms : [];
      chatRooms.forEach(rememberChatRoom);
      chatRoomsDirty = false;
      if (keepSelection && chatActiveRoomId) {
        const still = chatRooms.find((r) => Number(r.id) === Number(chatActiveRoomId));
        if (!still) chatActiveRoomId = null;
      }
      renderChatRoomList();
      if (chatActiveRoomId) {
        const room = chatRooms.find((r) => Number(r.id) === Number(chatActiveRoomId));
        renderChatMain(room || null);
      } else {
        renderChatMain(null);
      }
    } catch (err) {
      showToast(err.message || "Не удалось загрузить чаты");
    } finally {
      chatLoading = false;
    }
  }

  function renderChatRoomList() {
    const list = document.getElementById("chat-room-list");
    const empty = document.getElementById("chat-room-empty");
    if (!list) return;
    list.innerHTML = "";
    if (!chatRooms.length) {
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;
    chatRooms.forEach((room) => {
      const btn = document.createElement("button");
      btn.type = "button";
      const unread = chatUnreadRoomIds.has(Number(room.id));
      btn.className = `chat-room${Number(room.id) === Number(chatActiveRoomId) ? " is-active" : ""}${unread ? " is-unread" : ""}`;
      btn.setAttribute("role", "listitem");
      btn.dataset.roomId = String(room.id);
      const preview = room.lastMessage
        ? `${room.lastMessage.authorNick}: ${room.lastMessage.text}`
        : chatScope === "public" && !room.joined
          ? "Нажми, чтобы вступить"
          : "Нет сообщений";
      btn.innerHTML = `<span class="chat-room__name">${escapeChat(chatRoomTitle(room))}${unread ? " !" : ""}</span>
        <span class="chat-room__meta">${escapeChat(chatTypeLabel(room.type))} · ${escapeChat(preview)}</span>`;
      list.appendChild(btn);
    });
  }

  function renderChatMessages() {
    const box = document.getElementById("chat-messages");
    if (!box) return;
    const myId = Number(authUser?.id);
    box.innerHTML = "";
    chatMessages.forEach((msg) => {
      const mine = myId && Number(msg.userId) === myId;
      const el = document.createElement("article");
      el.className = `chat-msg${mine ? " is-mine" : ""}`;
      el.dataset.msgId = String(msg.id);
      const src =
        msg.source === "mod"
          ? `<span class="chat-msg__source">игра</span>`
          : "";
      el.innerHTML = `<div class="chat-msg__meta">
          <span class="chat-msg__nick">${escapeChat(msg.authorNick)}</span>
          <span>${escapeChat(formatChatTime(msg.createdAt))}</span>
          ${src}
        </div>
        <div class="chat-msg__body">${escapeChat(msg.text)}</div>`;
      box.appendChild(el);
    });
    box.scrollTop = box.scrollHeight;
  }

  function renderChatMain(room) {
    const title = document.getElementById("chat-main-title");
    const joinBtn = document.getElementById("chat-join-btn");
    const form = document.getElementById("chat-compose");
    if (!room) {
      if (title) title.textContent = "Выбери чат";
      if (joinBtn) joinBtn.hidden = true;
      if (form) form.hidden = true;
      chatMessages = [];
      renderChatMessages();
      return;
    }
    if (title) title.textContent = chatRoomTitle(room);
    const needJoin = room.type === "public" && !room.joined;
    if (joinBtn) joinBtn.hidden = !needJoin;
    if (form) form.hidden = needJoin;
    if (needJoin) {
      chatMessages = [];
      renderChatMessages();
    }
  }

  async function openChatRoom(roomId) {
    const id = Number(roomId);
    const room = chatRooms.find((r) => Number(r.id) === id);
    if (!room) return;
    if (chatActiveRoomId && socket) {
      socket.emit("chat:leave", { roomId: chatActiveRoomId });
    }
    chatActiveRoomId = id;
    chatUnreadRoomIds.delete(id);
    updateChatTabBadge();
    renderChatRoomList();
    renderChatMain(room);
    if (socket) socket.emit("chat:join", { roomId: id });
    if (room.type === "public" && !room.joined) return;
    try {
      const data = await api(`/api/chat/rooms/${id}/messages?limit=100`);
      chatMessages = Array.isArray(data.messages) ? data.messages : [];
      chatMessages.forEach((m) => chatSeenMsgIds.add(Number(m.id)));
      renderChatMessages();
    } catch (err) {
      showToast(err.message || "Не удалось загрузить сообщения");
    }
  }

  function onChatSocketMessage(payload) {
    const roomId = Number(payload?.roomId);
    const message = payload?.message;
    if (!roomId || !message) return;
    const msgId = Number(message.id);
    if (Number.isFinite(msgId) && msgId > 0) {
      if (chatSeenMsgIds.has(msgId)) {
        // already handled (user: + chat: duplicate)
        if (Number(chatActiveRoomId) === roomId) {
          /* still ok */
        }
        return;
      }
      chatSeenMsgIds.add(msgId);
      if (chatSeenMsgIds.size > 400) {
        const keep = [...chatSeenMsgIds].slice(-200);
        chatSeenMsgIds.clear();
        keep.forEach((id) => chatSeenMsgIds.add(id));
      }
    }

    let room =
      chatRooms.find((r) => Number(r.id) === roomId) ||
      chatRoomsById.get(roomId) ||
      null;
    if (room) {
      room.lastMessage = message;
      rememberChatRoom(room);
    } else {
      room = {
        id: roomId,
        type: "group",
        name: `Чат #${roomId}`,
        title: `Чат #${roomId}`,
        lastMessage: message,
        joined: true,
      };
      rememberChatRoom(room);
    }

    if (Number(chatActiveRoomId) === roomId) {
      if (!chatMessages.some((m) => Number(m.id) === Number(message.id))) {
        chatMessages.push(message);
        renderChatMessages();
      }
      chatUnreadRoomIds.delete(roomId);
    } else {
      const myId = Number(authUser?.id);
      if (!(myId && Number(message.userId) === myId)) {
        chatUnreadRoomIds.add(roomId);
      }
    }
    updateChatTabBadge();
    renderChatRoomList();

    if (shouldNotifyChatMessage(room, message)) {
      const preview = String(message.text || "").slice(0, 80);
      showToast(`${message.authorNick}: ${preview}`);
    }
  }

  loadChatNotifyPrefs();
  updateChatTabBadge();

  function syncChatCreateTypeUi() {
    const type =
      document.querySelector('input[name="chat-create-type"]:checked')?.value ||
      "dm";
    const nameBlock = document.getElementById("chat-create-name-block");
    const membersBlock = document.getElementById("chat-create-members-block");
    const nameInput = document.getElementById("chat-create-name");
    if (nameBlock) nameBlock.hidden = type === "dm";
    if (membersBlock) membersBlock.hidden = type === "public";
    if (nameInput) {
      nameInput.required = type !== "dm";
      if (type === "dm") nameInput.value = "";
    }
    renderChatCreateMembers(type);
  }

  function renderChatCreateMembers(type) {
    const box = document.getElementById("chat-create-members");
    const filterEl = document.getElementById("chat-create-members-filter");
    if (!box) return;
    const q = String(filterEl?.value || "")
      .trim()
      .toLowerCase();
    const myId = Number(authUser?.id);
    const users = (directoryUsers || []).filter((u) => Number(u.id) !== myId);
    const filtered = users.filter((u) => {
      if (!q) return true;
      const nick = String(u.mcNick || u.siteNick || "").toLowerCase();
      return nick.includes(q);
    });
    box.innerHTML = "";
    if (!filtered.length) {
      box.innerHTML = `<p class="chat-room-empty">Никого не найдено</p>`;
      return;
    }
    filtered.forEach((u) => {
      const label = document.createElement("label");
      label.className = "chat-member-row";
      const input = document.createElement("input");
      input.type = type === "dm" ? "radio" : "checkbox";
      input.name = "chat-create-member";
      input.value = String(u.id);
      const span = document.createElement("span");
      span.textContent =
        String(u.siteNick || u.mcNick || `id ${u.id}`).trim() || `id ${u.id}`;
      if (u.mcNick && u.siteNick && u.siteNick !== u.mcNick) {
        span.textContent += ` (${u.mcNick})`;
      }
      label.append(input, span);
      box.appendChild(label);
    });
  }

  function openChatCreateModal() {
    const err = document.getElementById("chat-create-error");
    if (err) {
      err.hidden = true;
      err.textContent = "";
    }
    const nameInput = document.getElementById("chat-create-name");
    const filterEl = document.getElementById("chat-create-members-filter");
    if (nameInput) nameInput.value = "";
    if (filterEl) filterEl.value = "";
    const dmRadio = document.querySelector('input[name="chat-create-type"][value="dm"]');
    if (dmRadio) dmRadio.checked = true;
    syncChatCreateTypeUi();
    openStudioModal("chat-create-modal");
  }

  function closeChatCreateModal() {
    closeStudioModal("chat-create-modal");
  }

  document.getElementById("chat-scope-tabs")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-chat-scope]");
    if (!btn) return;
    chatScope = btn.getAttribute("data-chat-scope") === "public" ? "public" : "mine";
    document.querySelectorAll("#chat-scope-tabs [data-chat-scope]").forEach((el) => {
      el.classList.toggle("is-active", el === btn);
    });
    chatActiveRoomId = null;
    refreshChatRooms();
  });

  document.getElementById("chat-room-list")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".chat-room[data-room-id]");
    if (!btn) return;
    openChatRoom(btn.getAttribute("data-room-id"));
  });

  document.getElementById("chat-create-btn")?.addEventListener("click", async () => {
    if (!authToken) {
      showToast("Войди, чтобы создать чат");
      return;
    }
    await loadPlayersDirectory();
    openChatCreateModal();
  });

  document.getElementById("chat-create-modal-close")?.addEventListener("click", closeChatCreateModal);
  document.getElementById("chat-create-cancel")?.addEventListener("click", closeChatCreateModal);

  document.getElementById("chat-notify-all")?.addEventListener("click", () => {
    chatNotifyPrefs.all = !chatNotifyPrefs.all;
    saveChatNotifyPrefs();
    renderChatSettingsUi();
  });
  document.getElementById("chat-notify-public")?.addEventListener("click", () => {
    chatNotifyPrefs.public = !chatNotifyPrefs.public;
    saveChatNotifyPrefs();
    renderChatSettingsUi();
  });
  document.getElementById("chat-notify-personal")?.addEventListener("click", () => {
    chatNotifyPrefs.personal = !chatNotifyPrefs.personal;
    saveChatNotifyPrefs();
    renderChatSettingsUi();
  });
  document.getElementById("chat-settings-mine")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".chat-settings-room__mute[data-room-id]");
    if (!btn) return;
    const id = btn.getAttribute("data-room-id");
    setChatRoomMuted(id, !isChatRoomMuted(id));
    renderChatSettingsUi();
  });
  document.getElementById("chat-settings-public")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".chat-settings-room__mute[data-room-id]");
    if (!btn) return;
    const id = btn.getAttribute("data-room-id");
    setChatRoomMuted(id, !isChatRoomMuted(id));
    renderChatSettingsUi();
  });

  document.querySelectorAll('input[name="chat-create-type"]').forEach((el) => {
    el.addEventListener("change", syncChatCreateTypeUi);
  });

  document.getElementById("chat-create-members-filter")?.addEventListener("input", () => {
    const type =
      document.querySelector('input[name="chat-create-type"]:checked')?.value ||
      "dm";
    renderChatCreateMembers(type);
  });

  document.getElementById("chat-create-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = document.getElementById("chat-create-error");
    const setErr = (msg) => {
      if (!err) return;
      err.textContent = msg || "";
      err.hidden = !msg;
    };
    setErr("");
    const type =
      document.querySelector('input[name="chat-create-type"]:checked')?.value ||
      "dm";
    const name = String(document.getElementById("chat-create-name")?.value || "").trim();
    const memberIds = [
      ...document.querySelectorAll('input[name="chat-create-member"]:checked'),
    ].map((el) => Number(el.value));
    if (type === "dm" && memberIds.length !== 1) {
      setErr("Выбери одного пользователя для личных сообщений");
      return;
    }
    if ((type === "group" || type === "public") && !name) {
      setErr("Укажи название чата");
      return;
    }
    try {
      const data = await api("/api/chat/rooms", {
        method: "POST",
        body: JSON.stringify({ type, name, memberIds }),
      });
      closeChatCreateModal();
      if (type === "public") {
        chatScope = "public";
        document.querySelectorAll("#chat-scope-tabs [data-chat-scope]").forEach((el) => {
          el.classList.toggle(
            "is-active",
            el.getAttribute("data-chat-scope") === "public"
          );
        });
      } else {
        chatScope = "mine";
        document.querySelectorAll("#chat-scope-tabs [data-chat-scope]").forEach((el) => {
          el.classList.toggle(
            "is-active",
            el.getAttribute("data-chat-scope") === "mine"
          );
        });
      }
      await refreshChatRooms();
      if (data?.room?.id) await openChatRoom(data.room.id);
      showToast("Чат создан");
    } catch (ex) {
      setErr(ex.message || "Не удалось создать чат");
    }
  });

  document.getElementById("chat-join-btn")?.addEventListener("click", async () => {
    if (!chatActiveRoomId) return;
    try {
      const data = await api(`/api/chat/rooms/${chatActiveRoomId}/join`, {
        method: "POST",
        body: "{}",
      });
      if (data?.room) {
        const idx = chatRooms.findIndex((r) => Number(r.id) === Number(data.room.id));
        if (idx >= 0) chatRooms[idx] = data.room;
        else chatRooms.push(data.room);
      }
      await openChatRoom(chatActiveRoomId);
      showToast("Ты в чате");
    } catch (err) {
      showToast(err.message || "Не удалось вступить");
    }
  });

  document.getElementById("chat-compose")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = document.getElementById("chat-compose-input");
    const text = String(input?.value || "").trim();
    if (!text || !chatActiveRoomId) return;
    try {
      const data = await api(`/api/chat/rooms/${chatActiveRoomId}/messages`, {
        method: "POST",
        body: JSON.stringify({ text }),
      });
      if (input) input.value = "";
      if (data?.message) {
        onChatSocketMessage({ roomId: chatActiveRoomId, message: data.message });
      }
    } catch (err) {
      showToast(err.message || "Не удалось отправить");
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


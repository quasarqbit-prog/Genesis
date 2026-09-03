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
  const STORAGE_KEY = "genesis_race_v1";
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
  const stepBack = document.getElementById("step-back");
  const stepNext = document.getElementById("step-next");
  const downloadZipBtn = document.getElementById("download-zip-btn");
  const toast = document.getElementById("toast");
  const navRegister = document.getElementById("nav-register");
  const navCatalog = document.getElementById("nav-catalog");
  const NICK_RE = /^[A-Za-z0-9_]{3,16}$/;
  const TOTAL_STEPS = 4;
  let currentStep = 1;
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

  function readStorage() {
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

  function writeStorage(patch) {
    const current = readStorage();
    const next = {
      registered:
        patch.registered !== undefined ? patch.registered : current.registered,
      form: patch.form !== undefined ? patch.form : current.form,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  }

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
    rules,
    server: serverView,
    content: contentFlow,
  };

  const STAGE_MODE_BY_VIEW = {
    register: null,
    catalog: "is-catalog",
    rules: "is-rules",
    server: "is-server",
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
    return activateMainView("rules", {
      animate,
      beforeShow: () => {
        if (rulesBody) rulesBody.scrollTop = 0;
        setActiveRuleToc("rule-1");
        setNavActive("rules");
      },
    });
  }

  function showServerView(animate = true) {
    return activateMainView("server", {
      animate,
      beforeShow: () => {
        if (serverView) serverView.scrollTop = 0;
        setNavActive("server");
      },
    });
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
      currentStep = 1;
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
    triggerDownload(zip, `genesis_${nickName}.zip`);
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
    try {
      await navigator.clipboard.writeText(SERVER_IP);
      showToast("IP скопирован");
    } catch {
      showToast("Не удалось скопировать");
    }
  }

  function renderStep() {
    document.querySelectorAll(".submit-step").forEach((step) => {
      const n = Number(step.dataset.step);
      const active = n === currentStep;
      step.hidden = !active;
      step.classList.toggle("is-active", active);
    });
    if (submitProgress) submitProgress.textContent = `Этап ${currentStep} / ${TOTAL_STEPS}`;
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
      currentStep = 1;
      renderStep();
    };
    submitFlow.addEventListener("transitionend", onDone);
    window.setTimeout(() => {
      if (!submitFlow.hidden) {
        submitFlow.hidden = true;
        currentStep = 1;
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

  function setActiveRuleToc(id) {
    rulesToc?.querySelectorAll(".rules-toc__btn").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.rule === id);
    });
  }

  if (rulesBody) {
    // id принудительно выбранного раздела; шпион его не перезаписывает пока идёт скрол
    let forcedRuleId = null;
    let spyUnlockTimer = 0;

    function unlockSpy() {
      forcedRuleId = null;
    }

    // scrollend — стандартный способ детектировать конец скрола
    const supportsScrollEnd = "onscrollend" in rulesBody;

    if (supportsScrollEnd) {
      rulesBody.addEventListener("scrollend", unlockSpy);
    } else {
      // fallback: таймер сбрасывается при каждом scroll-событии
      rulesBody.addEventListener("scroll", () => {
        window.clearTimeout(spyUnlockTimer);
        spyUnlockTimer = window.setTimeout(unlockSpy, 150);
      });
    }

    rulesBody.addEventListener("scroll", () => {
      if (forcedRuleId !== null) return; // заблокировано кликом
      const blocks = [...rulesBody.querySelectorAll(".rule-block")];
      if (!blocks.length) return;
      const top = rulesBody.scrollTop + 24;
      let current = blocks[0].id;
      for (const block of blocks) {
        if (block.offsetTop <= top) current = block.id;
      }
      setActiveRuleToc(current);
    });

    rulesToc?.addEventListener("click", (e) => {
      const btn = e.target.closest(".rules-toc__btn");
      if (!btn) return;
      const id = btn.dataset.rule;
      const target = document.getElementById(id);
      if (!target) return;

      // Принудительно фиксируем нужный пункт — шпион не перезапишет
      forcedRuleId = id;
      window.clearTimeout(spyUnlockTimer);
      setActiveRuleToc(id);

      const targetTop = target.offsetTop;
      rulesBody.scrollTo({ top: Math.max(0, targetTop - 12), behavior: "smooth" });

      // Страховочный разблок если scrollend не сработает (напр. уже в нужной позиции)
      spyUnlockTimer = window.setTimeout(unlockSpy, 1200);
    });
  }

  buildCatalog();
  loadFormFromStorage();
  updateRegisterChrome();

  if (readStorage().registered) showCatalogView(false);
  else showRegistrationShell(false);

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


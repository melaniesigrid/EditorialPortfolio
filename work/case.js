/* ══════════════════════════════════════════════════════════════════════════
   CASE STUDIES — shared behaviour

   Mirrors the index's i18n contract exactly: the same data-i18n attributes,
   the same RTL list, and the same `mb_lang` storage key — so a visitor who
   picked Português on the home page lands here already in Português.

   Chrome that repeats on every case page (section headings, Visit / Source,
   the folio word) lives in SHARED below. Page-specific copy is set by
   work/i18n/<slug>.js as window.CASE_I18N and merged over it.

   Where the index already has wording for a label — Live, Visit, Source,
   Independent Work — that exact wording is reused rather than re-translated,
   so the two halves of the site never disagree with each other.
   ══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var STORAGE_KEY = 'mb_lang';
  var RTL_LANGS = ['he', 'ar', 'fa', 'ur'];
  var CODES = {
    en: 'EN', es: 'ES', de: 'DE', fr: 'FR', he: 'HE',
    ru: 'RU', pt: 'PT', uk: 'UK', zh: 'ZH', ar: 'AR'
  };
  var NAMES = {
    en: 'English', es: 'Español', de: 'Deutsch', fr: 'Français', he: 'עברית',
    ru: 'Русский', pt: 'Português', uk: 'Українська', zh: '中文', ar: 'العربية'
  };

  var SHARED = {
    en: {
      'ui.skip': 'Skip to content',
      'ui.back': 'Independent Work',
      'ui.case': 'Case',
      'ui.live': 'Live',
      'ui.local': 'Runs locally',
      'ui.visit': 'Visit',
      'ui.source': 'Source',
      'ui.app': 'Open the app',
      'lang.aria': 'Language',
      'h.where': 'Where it lives',
      'h.howin': 'How to sign in',
      'sec.entry': 'Getting in',
      'sec.how': 'How it works',
      'sec.arch': 'How the pieces fit',
      'sec.data': 'What it remembers',
      'sec.code': 'How the code is laid out',
      'sec.langs': 'Languages used',
      'sec.stack': 'Technical skills',
      'sec.figures': 'By the numbers',
      'sec.did': 'Key achievements',
      'sec.keywords': 'Skills & keywords',
      'ui.footBack': 'The press run',
      'ui.footNote': 'Melanie Baratto · Case study'
    },
    es: {
      'ui.skip': 'Saltar al contenido',
      'ui.back': 'Trabajo independiente',
      'ui.case': 'Caso',
      'ui.live': 'Activo',
      'ui.local': 'Se ejecuta en local',
      'ui.visit': 'Visitar',
      'ui.source': 'Código',
      'ui.app': 'Abrir la app',
      'lang.aria': 'Idioma',
      'h.where': 'Dónde vive',
      'h.howin': 'Cómo iniciar sesión',
      'sec.entry': 'Cómo entrar',
      'sec.how': 'Cómo funciona',
      'sec.arch': 'Cómo encajan las piezas',
      'sec.data': 'Qué guarda',
      'sec.code': 'Cómo está organizado el código',
      'sec.langs': 'Lenguajes usados',
      'sec.stack': 'Competencias técnicas',
      'sec.figures': 'En cifras',
      'sec.did': 'Logros clave',
      'sec.keywords': 'Habilidades y palabras clave',
      'ui.footBack': 'La tirada',
      'ui.footNote': 'Melanie Baratto · Estudio de caso'
    },
    de: {
      'ui.skip': 'Zum Inhalt springen',
      'ui.back': 'Eigenständige Arbeit',
      'ui.case': 'Fallstudie',
      'ui.live': 'Live',
      'ui.local': 'Läuft lokal',
      'ui.visit': 'Ansehen',
      'ui.source': 'Quellcode',
      'ui.app': 'App öffnen',
      'lang.aria': 'Sprache',
      'h.where': 'Wo es liegt',
      'h.howin': 'So meldet man sich an',
      'sec.entry': 'Zugang',
      'sec.how': 'So funktioniert es',
      'sec.arch': 'Wie die Teile zusammenpassen',
      'sec.data': 'Was gespeichert wird',
      'sec.code': 'Aufbau des Codes',
      'sec.langs': 'Verwendete Sprachen',
      'sec.stack': 'Technische Kenntnisse',
      'sec.figures': 'In Zahlen',
      'sec.did': 'Wichtigste Ergebnisse',
      'sec.keywords': 'Fähigkeiten & Schlagwörter',
      'ui.footBack': 'Der Druckgang',
      'ui.footNote': 'Melanie Baratto · Fallstudie'
    },
    fr: {
      'ui.skip': 'Aller au contenu',
      'ui.back': 'Travail indépendant',
      'ui.case': 'Étude',
      'ui.live': 'En ligne',
      'ui.local': 'Fonctionne en local',
      'ui.visit': 'Visiter',
      'ui.source': 'Code source',
      'ui.app': 'Ouvrir l’app',
      'lang.aria': 'Langue',
      'h.where': 'Où cela vit',
      'h.howin': 'Comment se connecter',
      'sec.entry': 'Y accéder',
      'sec.how': 'Comment ça marche',
      'sec.arch': 'Comment les pièces s’assemblent',
      'sec.data': 'Ce qui est conservé',
      'sec.code': 'Organisation du code',
      'sec.langs': 'Langages utilisés',
      'sec.stack': 'Compétences techniques',
      'sec.figures': 'En chiffres',
      'sec.did': 'Réalisations clés',
      'sec.keywords': 'Compétences et mots-clés',
      'ui.footBack': 'Le tirage',
      'ui.footNote': 'Melanie Baratto · Étude de cas'
    },
    he: {
      'ui.skip': 'דלג לתוכן',
      'ui.back': 'עבודה עצמאית',
      'ui.case': 'מקרה בוחן',
      'ui.live': 'באוויר',
      'ui.local': 'רץ מקומית',
      'ui.visit': 'לאתר',
      'ui.source': 'קוד מקור',
      'ui.app': 'לפתוח את האפליקציה',
      'lang.aria': 'בחירת שפה',
      'h.where': 'היכן זה נמצא',
      'h.howin': 'איך מתחברים',
      'sec.entry': 'איך נכנסים',
      'sec.how': 'איך זה עובד',
      'sec.arch': 'איך החלקים מתחברים',
      'sec.data': 'מה נשמר',
      'sec.code': 'מבנה הקוד',
      'sec.langs': 'שפות בשימוש',
      'sec.stack': 'מיומנויות טכניות',
      'sec.figures': 'במספרים',
      'sec.did': 'הישגים מרכזיים',
      'sec.keywords': 'מיומנויות ומילות מפתח',
      'ui.footBack': 'המהדורה',
      'ui.footNote': 'Melanie Baratto · מקרה בוחן'
    },
    ru: {
      'ui.skip': 'Перейти к содержанию',
      'ui.back': 'Самостоятельные проекты',
      'ui.case': 'Кейс',
      'ui.live': 'В сети',
      'ui.local': 'Запускается локально',
      'ui.visit': 'Открыть',
      'ui.source': 'Исходники',
      'ui.app': 'Открыть приложение',
      'lang.aria': 'Язык',
      'h.where': 'Где это живёт',
      'h.howin': 'Как войти',
      'sec.entry': 'Как получить доступ',
      'sec.how': 'Как это работает',
      'sec.arch': 'Как связаны части',
      'sec.data': 'Что хранится',
      'sec.code': 'Как устроен код',
      'sec.langs': 'Используемые языки',
      'sec.stack': 'Технические навыки',
      'sec.figures': 'В цифрах',
      'sec.did': 'Ключевые результаты',
      'sec.keywords': 'Навыки и ключевые слова',
      'ui.footBack': 'Тираж',
      'ui.footNote': 'Melanie Baratto · Кейс'
    },
    pt: {
      'ui.skip': 'Saltar para o conteúdo',
      'ui.back': 'Trabalho independente',
      'ui.case': 'Caso',
      'ui.live': 'No ar',
      'ui.local': 'Corre localmente',
      'ui.visit': 'Visitar',
      'ui.source': 'Código',
      'ui.app': 'Abrir a app',
      'lang.aria': 'Idioma',
      'h.where': 'Onde vive',
      'h.howin': 'Como entrar na conta',
      'sec.entry': 'Como aceder',
      'sec.how': 'Como funciona',
      'sec.arch': 'Como as peças encaixam',
      'sec.data': 'O que fica guardado',
      'sec.code': 'Como o código está organizado',
      'sec.langs': 'Linguagens usadas',
      'sec.stack': 'Competências técnicas',
      'sec.figures': 'Em números',
      'sec.did': 'Principais resultados',
      'sec.keywords': 'Competências e palavras-chave',
      'ui.footBack': 'A tiragem',
      'ui.footNote': 'Melanie Baratto · Estudo de caso'
    },
    uk: {
      'ui.skip': 'Перейти до вмісту',
      'ui.back': 'Самостійні проєкти',
      'ui.case': 'Кейс',
      'ui.live': 'У мережі',
      'ui.local': 'Працює локально',
      'ui.visit': 'Відкрити',
      'ui.source': 'Код',
      'ui.app': 'Відкрити застосунок',
      'lang.aria': 'Мова',
      'h.where': 'Де це живе',
      'h.howin': 'Як увійти',
      'sec.entry': 'Як отримати доступ',
      'sec.how': 'Як це працює',
      'sec.arch': 'Як поєднані частини',
      'sec.data': 'Що зберігається',
      'sec.code': 'Як влаштований код',
      'sec.langs': 'Використані мови',
      'sec.stack': 'Технічні навички',
      'sec.figures': 'У цифрах',
      'sec.did': 'Ключові результати',
      'sec.keywords': 'Навички та ключові слова',
      'ui.footBack': 'Тираж',
      'ui.footNote': 'Melanie Baratto · Кейс'
    },
    zh: {
      'ui.skip': '跳至内容',
      'ui.back': '独立作品',
      'ui.case': '案例',
      'ui.live': '已上线',
      'ui.local': '本地运行',
      'ui.visit': '访问',
      'ui.source': '源码',
      'ui.app': '打开应用',
      'lang.aria': '语言',
      'h.where': '部署在哪里',
      'h.howin': '如何登录',
      'sec.entry': '如何进入',
      'sec.how': '工作原理',
      'sec.arch': '各部分如何衔接',
      'sec.data': '数据库记录了什么',
      'sec.code': '代码结构',
      'sec.langs': '使用的语言',
      'sec.stack': '技术能力',
      'sec.figures': '数据一览',
      'sec.did': '关键成果',
      'sec.keywords': '技能与关键词',
      'ui.footBack': '独立作品',
      'ui.footNote': 'Melanie Baratto · 案例研究'
    },
    ar: {
      'ui.skip': 'تخطَّ إلى المحتوى',
      'ui.back': 'عمل مستقل',
      'ui.case': 'دراسة حالة',
      'ui.live': 'مباشر',
      'ui.local': 'يعمل محليًا',
      'ui.visit': 'زيارة',
      'ui.source': 'الكود',
      'ui.app': 'افتح التطبيق',
      'lang.aria': 'اللغة',
      'h.where': 'أين يعمل',
      'h.howin': 'كيفية تسجيل الدخول',
      'sec.entry': 'كيفية الدخول',
      'sec.how': 'كيف يعمل',
      'sec.arch': 'كيف تترابط الأجزاء',
      'sec.data': 'ما الذي يُحفظ',
      'sec.code': 'بنية الكود',
      'sec.langs': 'اللغات المستخدمة',
      'sec.stack': 'المهارات التقنية',
      'sec.figures': 'بالأرقام',
      'sec.did': 'أبرز الإنجازات',
      'sec.keywords': 'المهارات والكلمات المفتاحية',
      'ui.footBack': 'عمل مستقل',
      'ui.footNote': 'Melanie Baratto · دراسة حالة'
    }
  };

  /* ── Merge shared chrome with this page's copy ─────────────────────── */

  var PAGE = window.CASE_I18N || {};
  var i18n = {};
  Object.keys(SHARED).forEach(function (lang) {
    var merged = {};
    var k;
    for (k in SHARED[lang]) merged[k] = SHARED[lang][k];
    if (PAGE[lang]) for (k in PAGE[lang]) merged[k] = PAGE[lang][k];
    i18n[lang] = merged;
  });

  var htmlEl = document.documentElement;
  var currentLang = 'en';

  function getT(key, lang) {
    var dict = i18n[lang] || i18n.en;
    if (dict && dict[key] !== undefined) return dict[key];
    if (i18n.en && i18n.en[key] !== undefined) return i18n.en[key];
    return undefined;
  }

  function bind(attr, apply) {
    var nodes = document.querySelectorAll('[' + attr + ']');
    for (var i = 0; i < nodes.length; i++) {
      var v = getT(nodes[i].getAttribute(attr), currentLang);
      if (v !== undefined) apply(nodes[i], v);
    }
  }

  function applyLang(lang) {
    if (!i18n[lang]) lang = 'en';
    currentLang = lang;

    htmlEl.setAttribute('lang', lang);
    htmlEl.setAttribute('dir', RTL_LANGS.indexOf(lang) !== -1 ? 'rtl' : 'ltr');

    bind('data-i18n', function (el, v) { el.textContent = v; });
    bind('data-i18n-html', function (el, v) { el.innerHTML = v; });
    bind('data-i18n-content', function (el, v) { el.setAttribute('content', v); });
    bind('data-i18n-alt', function (el, v) { el.setAttribute('alt', v); });
    bind('data-i18n-aria-label', function (el, v) { el.setAttribute('aria-label', v); });

    // <title> lives outside the body but takes the same treatment.
    var t = getT('meta.title', lang);
    if (t !== undefined) document.title = t;

    var cur = document.querySelector('[data-lang-current]');
    if (cur) cur.textContent = CODES[lang] || lang.toUpperCase();

    var opts = document.querySelectorAll('[data-lang-set]');
    for (var i = 0; i < opts.length; i++) {
      opts[i].classList.toggle('active', opts[i].getAttribute('data-lang-set') === lang);
    }

    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* private mode */ }
  }

  /* ── Build the switcher from the same list the index uses ──────────── */

  function buildSwitch() {
    var menu = document.querySelector('.lang-menu');
    if (!menu) return;
    var html = '';
    Object.keys(CODES).forEach(function (lang) {
      html += '<button type="button" data-lang-set="' + lang + '">' +
        '<span>' + NAMES[lang] + '</span>' +
        '<span class="code">' + CODES[lang] + '</span></button>';
    });
    menu.innerHTML = html;
  }

  function wireSwitch() {
    var wrap = document.querySelector('.lang');
    var btn = document.querySelector('.lang-current');
    if (!wrap || !btn) return;

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = wrap.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    wrap.addEventListener('click', function (e) {
      var opt = e.target.closest('[data-lang-set]');
      if (!opt) return;
      applyLang(opt.getAttribute('data-lang-set'));
      wrap.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    });

    document.addEventListener('click', function () {
      wrap.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        wrap.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ── Reveal on scroll, matching the plates ─────────────────────────── */

  function wireReveal() {
    var nodes = document.querySelectorAll('.rise');
    if (!('IntersectionObserver' in window)) {
      for (var i = 0; i < nodes.length; i++) nodes[i].classList.add('on');
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('on');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    for (var j = 0; j < nodes.length; j++) io.observe(nodes[j]);
  }

  /* ── Boot ──────────────────────────────────────────────────────────── */

  function init() {
    buildSwitch();
    wireSwitch();
    wireReveal();

    var stored = null;
    try { stored = localStorage.getItem(STORAGE_KEY); } catch (e) { /* private mode */ }
    var initial = stored && i18n[stored]
      ? stored
      : (function () {
        var b = (navigator.language || 'en').slice(0, 2).toLowerCase();
        return i18n[b] ? b : 'en';
      })();

    applyLang(initial);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

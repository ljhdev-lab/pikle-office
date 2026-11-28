/* =========================================================
   별이 비서실 — app logic (no dependencies, no build step)
   4인 체제: 별이(총괄) · GPT(콘텐츠·기획) · 클로드(조사·분석) · 제미나이(디자인·검수)
   ========================================================= */
(function () {
  'use strict';

  var STORAGE_KEY = 'byeol-office-v2';
  var LEGACY_KEY = 'byeol-office-v1';
  var WEEK = ['일', '월', '화', '수', '목', '금', '토'];

  /* 좌표는 assets/office-map-v4.webp (864×1152, 3:4) 안의 위치를 % 로 적은 값.
     home 은 캐릭터 **발바닥 중앙**, tag·bubble 은 머리 위 라벨/말풍선 기준점이다.
     w 는 무대 가로 대비 캐릭터 폭. 이미지를 바꾸면 이 값만 다시 맞추면 된다. */
  var PARTS = [
    { id: 'byeol', room: '총괄 지휘실', name: '별이', role: '비서실장 · 총괄 지휘', task: '총괄',
      color: '#6790d0', deep: '#4a68a6', soft: '#eaf1fb',
      home: [47.5, 46.4], w: 17.0, tag: [47.5, 31.6], bubble: [47.5, 29.2], tail: 'down', delay: 0,
      paces: [[42.6, 48.8], [53.0, 49.6]], emoji: ['🗂', '✨', '☕'] },
    { id: 'gpt', room: '콘텐츠·기획실', name: 'GPT', role: '콘텐츠 · 기획', task: '콘텐츠·기획',
      color: '#52b394', deep: '#2f8a6e', soft: '#e6f7f0',
      home: [20.4, 60.2], w: 15.4, tag: [20.4, 46.6], bubble: [20.4, 43.9], tail: 'down', delay: 0.6,
      paces: [[24.6, 62.8], [15.8, 62.4]], emoji: ['💡', '✍', '✨'] },
    { id: 'claude', room: '조사·분석실', name: '클로드', role: '조사 · 분석 · 문서', task: '조사·분석',
      color: '#e27f5f', deep: '#b25a3a', soft: '#fdeee7',
      home: [76.6, 60.2], w: 15.0, tag: [76.6, 46.8], bubble: [76.6, 44.1], tail: 'down', delay: 1.2,
      paces: [[71.8, 62.8], [81.4, 62.4]], emoji: ['🔎', '📄', '🧩'] },
    { id: 'gemini', room: '디자인·검수실', name: '제미나이', role: '디자인 · 검수 · 이미지', task: '디자인·검수',
      color: '#6f8fe0', deep: '#5a6bb8', soft: '#eef1fb',
      dot: 'conic-gradient(from 210deg, #ea4335, #fbbc04, #34a853, #4285f4, #ea4335)',
      home: [18.6, 88.4], w: 15.0, tag: [18.6, 74.8], bubble: [18.6, 72.1], tail: 'down', delay: 1.8,
      paces: [[24.8, 90.6], [12.2, 90.2]], emoji: ['🎨', '🖼', '✨'] }
  ];
  var PART_MAP = {};
  PARTS.forEach(function (p) { PART_MAP[p.id] = p; });

  var FILTERS = [{ id: 'all', label: '전체' }].concat(PARTS.map(function (p) {
    return { id: p.id, label: p.task };
  }));

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ---------------------------------------------------------
     state
     --------------------------------------------------------- */

  function defaultState() {
    var now = Date.now();
    return {
      v: 2,
      nick: '대표님',
      motion: true,
      envTime: 'auto',
      envWeather: 'auto',
      today: '오늘은 콘텐츠 한 편이랑 예약 확인 하나만 끝내면 돼요.',
      tab: 'map',
      focus: 'byeol',
      parts: {
        byeol: { status: '오늘 할 일 정리해 두었어요', active: true },
        gpt: { status: '새 글 기획안 쓰는 중', active: true },
        claude: { status: '자료 조사해서 정리 중', active: true },
        gemini: { status: '표지 이미지 다듬는 중', active: true }
      },
      agenda: [
        { id: 'a1', title: '이번 주 블로그 글 순서 정하기', done: false, at: now - 7200000 },
        { id: 'a2', title: '주말 가족 일정 확정하기', done: false, at: now - 5400000 },
        { id: 'a3', title: '다음 주 장보기 목록 정리', done: true, at: now - 86400000 }
      ],
      tasks: [
        { id: 't1', title: '인스타 카드뉴스 다음 편 기획안 정리', part: 'gpt', done: false, at: now - 3600000 },
        { id: 't2', title: '블로그 새 글 소재 세 개 추리기', part: 'gpt', done: false, at: now - 3000000 },
        { id: 't3', title: '이번 주 영수증·지출 정리', part: 'claude', done: false, at: now - 2400000 },
        { id: 't4', title: '블로그 커버 이미지 후보 세 장 뽑기', part: 'gemini', done: false, at: now - 1800000 },
        { id: 't5', title: '다음 주 일정 한 번에 훑기', part: 'byeol', done: true, at: now - 900000 }
      ],
      memo: '',
      updatedAt: now
    };
  }

  function readJSON(key) {
    try {
      var raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  var LEGACY_PARTS = { etc: 'byeol', content: 'gpt', living: 'gpt', schedule: 'claude' };

  function normalize(raw) {
    var base = defaultState();
    if (!raw || typeof raw !== 'object') return base;

    if (typeof raw.nick === 'string' && raw.nick.trim()) base.nick = raw.nick.trim().slice(0, 12);
    if (typeof raw.today === 'string') base.today = raw.today.slice(0, 120);
    if (typeof raw.memo === 'string') base.memo = raw.memo.slice(0, 4000);
    base.motion = raw.motion !== false;
    if (['auto', 'morning', 'day', 'sunset', 'night'].indexOf(raw.envTime) >= 0) base.envTime = raw.envTime;
    if (['auto', 'clear', 'cloudy', 'rain', 'snow'].indexOf(raw.envWeather) >= 0) base.envWeather = raw.envWeather;
    if (['map', 'meeting', 'work', 'team', 'memo'].indexOf(raw.tab) >= 0) base.tab = raw.tab;
    if (PART_MAP[raw.focus]) base.focus = raw.focus;

    if (raw.parts && typeof raw.parts === 'object') {
      PARTS.forEach(function (p) {
        var s = raw.parts[p.id];
        if (!s || typeof s !== 'object') return;
        if (typeof s.status === 'string') base.parts[p.id].status = s.status.slice(0, 40);
        if (typeof s.active === 'boolean') base.parts[p.id].active = s.active;
      });
    }

    var clean = function (list, hasPart) {
      var out = [];
      if (!Array.isArray(list)) return out;
      list.forEach(function (item, i) {
        if (!item || typeof item !== 'object') return;
        if (typeof item.title !== 'string' || !item.title.trim()) return;
        var row = {
          id: typeof item.id === 'string' && item.id ? item.id : 'i' + i,
          title: item.title.trim().slice(0, 80),
          done: !!item.done,
          at: typeof item.at === 'number' ? item.at : Date.now()
        };
        if (hasPart) {
          row.part = PART_MAP[item.part] ? item.part : (LEGACY_PARTS[item.part] || 'byeol');
        }
        out.push(row);
      });
      return out;
    };

    if (Array.isArray(raw.agenda)) base.agenda = clean(raw.agenda, false);
    if (Array.isArray(raw.tasks)) base.tasks = clean(raw.tasks, true);

    return base;
  }

  /* 2026-11 이전(v1, 4개 파트) 저장값이 있으면 옮겨 온다. */
  function migrateLegacy() {
    var old = readJSON(LEGACY_KEY);
    if (!old || typeof old !== 'object') return null;
    var out = {
      v: 2,
      nick: old.nick,
      motion: old.motion,
      today: old.today,
      tab: old.tab,
      parts: {},
      agenda: old.agenda,
      tasks: old.tasks,
      memo: old.memo
    };
    if (old.parts && typeof old.parts === 'object') {
      Object.keys(old.parts).forEach(function (k) {
        var to = LEGACY_PARTS[k];
        if (!to || !old.parts[k]) return;
        // 역할이 그대로인 '기타 → 총괄(별이)'만 상태 문구를 넘기고,
        // 나머지는 새 담당의 기본 문구를 쓴다.
        out.parts[to] = {
          active: old.parts[k].active !== false
        };
        if (k === 'etc' && typeof old.parts[k].status === 'string') {
          out.parts[to].status = old.parts[k].status;
        }
      });
    }
    return out;
  }

  var stored = readJSON(STORAGE_KEY);
  var state = normalize(stored || migrateLegacy());
  if (!stored && window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    state.motion = false;
  }

  var ui = { filter: 'all', sheet: null };
  var saveTimer = null;
  var toastTimer = null;
  var closeTimer = null;
  var bubbleTimer = null;
  var focusHold = 0;
  var uidCount = 0;

  function uid() {
    uidCount += 1;
    return 'x' + Date.now().toString(36) + uidCount.toString(36);
  }

  function save() {
    state.updatedAt = Date.now();
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { /* private mode or full storage */ }
    updateStorageInfo();
  }

  function saveSoon(cb) {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(function () {
      save();
      if (cb) cb();
    }, 400);
  }

  /* ---------------------------------------------------------
     small helpers
     --------------------------------------------------------- */

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function pad2(n) { return n < 10 ? '0' + n : String(n); }

  function shortDate(ts) {
    var d = new Date(ts || Date.now());
    return (d.getMonth() + 1) + '.' + d.getDate();
  }

  function timeLabel(ts) {
    var d = new Date(ts || Date.now());
    var h = d.getHours();
    var m = d.getMinutes();
    var ap = h < 12 ? '오전' : '오후';
    var hh = h % 12 || 12;
    return ap + ' ' + hh + ':' + pad2(m);
  }

  function greeting() {
    var h = new Date().getHours();
    if (h >= 5 && h < 11) return '좋은 아침이에요';
    if (h >= 11 && h < 17) return '좋은 오후예요';
    if (h >= 17 && h < 22) return '좋은 저녁이에요';
    return '조용한 밤이에요';
  }

  function toast(msg) {
    var el = $('#toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('is-on');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () { el.classList.remove('is-on'); }, 1900);
  }

  function autosize(el) {
    if (!el) return;
    el.style.height = 'auto';
    var h = el.scrollHeight;
    if (h > 0) el.style.height = h + 'px';
  }

  function tasksOf(partId, includeDone) {
    return state.tasks.filter(function (t) {
      return t.part === partId && (includeDone || !t.done);
    });
  }

  function sortTask(a, b) {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return (b.at || 0) - (a.at || 0);
  }

  function statusOf(partId) {
    var s = state.parts[partId] && state.parts[partId].status;
    s = (s || '').trim();
    return s || '잠깐 쉬는 중';
  }

  function isActive(partId) {
    return !!(state.parts[partId] && state.parts[partId].active);
  }

  function activeParts() {
    return PARTS.filter(function (p) { return isActive(p.id); });
  }

  /* ---------------------------------------------------------
     mini mascot avatars (inline pixel SVG)
     픽셀 오피스맵과 같은 결이 나도록 네 캐릭터를 도트로 옮긴다.
       별이  : 파란 'ㅂ' 픽셀 실루엣 (위가 트인 홈, 아래 구멍, 두 발)
       GPT   : 에메랄드 꽃매듭 (OpenAI Blossom 모티프)
       클로드 : Claw'd — 테라코타 블록 몸통 + 옆 팔 + 네 다리 + 검은 사각 눈
       제미나이: 구글 4색 4각 반짝이 별
     --------------------------------------------------------- */

  var EYE = '#3f3a4d';
  var avatarSeq = 0;

  /* 픽셀 느낌을 위해 눈은 각진 사각형, 입은 짧은 선으로 찍는다. */
  function faceDots(cx, cy, gap, r, mouthW) {
    var s = r * 1.9;
    return '<rect x="' + (cx - gap - s / 2) + '" y="' + (cy - s / 2) + '" width="' + s +
        '" height="' + s + '" fill="' + EYE + '"/>' +
      '<rect x="' + (cx + gap - s / 2) + '" y="' + (cy - s / 2) + '" width="' + s +
        '" height="' + s + '" fill="' + EYE + '"/>' +
      '<path d="M' + (cx - mouthW) + ' ' + (cy + s / 2 + 1.4) + 'q' + mouthW + ' 2.2 ' + (mouthW * 2) +
        ' 0" fill="none" stroke="' + EYE + '" stroke-width="1.4" stroke-linecap="round"/>';
  }

  /* 문자 격자를 4단위 정사각형(도트)으로 찍어 픽셀 스프라이트를 만든다. */
  var PX = 4;
  function pixelSprite(rows, colors) {
    var cells = '';
    for (var y = 0; y < rows.length; y += 1) {
      var row = rows[y];
      for (var x = 0; x < row.length; x += 1) {
        var fill = colors[row.charAt(x)];
        if (!fill) continue;
        cells += '<rect x="' + (x * PX) + '" y="' + (y * PX) + '" width="' + PX +
          '" height="' + PX + '" fill="' + fill + '"/>';
      }
    }
    return cells;
  }

  function svgOpen(box) {
    return '<svg class="mini-char" viewBox="0 0 ' + box + ' ' + box +
      '" shape-rendering="crispEdges" aria-hidden="true" focusable="false">';
  }

  /* GPT — 6갈래 고리가 맞물린 꽃매듭 */
  function blossomSVG(color, soft) {
    var petals = '';
    for (var i = 0; i < 6; i += 1) {
      petals += '<ellipse cx="26" cy="17.2" rx="5.1" ry="8.1" transform="rotate(' + (i * 60) +
        ' 26 26)"/>';
    }
    return svgOpen(52) +
      '<g fill="' + color + '" stroke="' + soft + '" stroke-width="3.4">' + petals +
        '<circle cx="26" cy="26" r="5.4"/></g>' +
      faceDots(26, 25.2, 2.7, 1.2, 2.1) +
      '</svg>';
  }

  /* 클로드 — Claw'd 픽셀 마스코트 (블록 몸통 + 짧은 옆 팔 + 네 다리 + 검은 사각 눈) */
  function clawdSVG(color) {
    var rows = [
      '...............',
      '.CCCCCCCCCCCCC.',
      '.CCCCCCCCCCCCC.',
      '.CCCCCCCCCCCCC.',
      '.CCCEECCCEECCC.',
      '.CCCCCCCCCCCCC.',
      'CCCCCCCCCCCCCCC',
      'CCCCCCCCCCCCCCC',
      '.CCCCCCCCCCCCC.',
      '.CCCCCCCCCCCCC.',
      '.CCCCCCCCCCCCC.',
      '.CCCCCCCCCCCCC.',
      '.CC..CC.CC..CC.',
      '.CC..CC.CC..CC.',
      '.CC.........CC.'
    ];
    var colors = { C: color, E: '#2e2a28' };
    return svgOpen(60) + pixelSprite(rows, colors) + '</svg>';
  }

  /* 별이 — 파란 'ㅂ' 픽셀 실루엣: 위가 트인 홈, 얼굴 아래 구멍, 두 발 */
  function byeolSVG(color) {
    var rows = [
      '...............',
      '.BBBB.....BBBB.',
      '.BBBB.....BBBB.',
      '.BBBBBBBBBBBBB.',
      '.BBEEBBBBBEEBB.',
      '.BBEEBBBBBEEBB.',
      '.BBBBBBBBBBBBB.',
      '.BBBBBBMMBBBBB.',
      '.BBBBBBBBBBBBB.',
      '.BBBBBBBBBBBBB.',
      '.BBBBB...BBBBB.',
      '.BBBBB...BBBBB.',
      '.BBBBBBBBBBBBB.',
      '..BBB.....BBB..',
      '..BBB.....BBB..'
    ];
    var colors = { B: color, E: '#2f3d57', M: '#2f3d57' };
    return svgOpen(64) + pixelSprite(rows, colors) + '</svg>';
  }

  function avatarSVG(partId) {
    var p = PART_MAP[partId] || PARTS[0];

    if (partId === 'gpt') return blossomSVG(p.color, p.soft);
    if (partId === 'claude') return clawdSVG(p.color);

    if (partId === 'gemini') {
      avatarSeq += 1;
      var gid = 'gemAvatar' + avatarSeq;
      var star = 'M26 4.5C27.7 17.2 34.8 24.3 47.5 26 34.8 27.7 27.7 34.8 26 47.5 ' +
        '24.3 34.8 17.2 27.7 4.5 26 17.2 24.3 24.3 17.2 26 4.5Z';
      return svgOpen(52) +
        '<defs><clipPath id="' + gid + '"><path d="' + star + '"/></clipPath></defs>' +
        '<g clip-path="url(#' + gid + ')">' +
          '<rect x="0" y="0" width="26" height="26" fill="#fbbc04"/>' +
          '<rect x="26" y="0" width="26" height="26" fill="#ea4335"/>' +
          '<rect x="0" y="26" width="26" height="26" fill="#34a853"/>' +
          '<rect x="26" y="26" width="26" height="26" fill="#4285f4"/>' +
        '</g>' +
        faceDots(26, 25.4, 2.5, 1.15, 2.1) +
        '</svg>';
    }

    return byeolSVG(p.color);
  }

  /* ---------------------------------------------------------
     map overlay
     --------------------------------------------------------- */

  function overlayHTML() {
    var tags = PARTS.map(function (p) {
      return '<span class="tag' + (isActive(p.id) ? '' : ' is-off') + '" style="left:' + p.tag[0] +
        '%;top:' + p.tag[1] + '%">' +
        '<i class="tag__dot" style="background:' + (p.dot || p.color) + '"></i>' +
        '<span class="tag__name">' + esc(p.name) + '</span></span>';
    }).join('');

    return tags + '<span class="bubble" id="mapBubble" hidden><span class="bubble__txt"></span></span>';
  }

  function spriteHTML(p) {
    return '<button class="sprite' + (isActive(p.id) ? '' : ' is-off') + '" type="button" ' +
      'data-part="' + p.id + '" data-action="open-room" ' +
      'style="left:' + p.home[0] + '%;top:' + p.home[1] + '%;--w:' + p.w + '%;z-index:' +
        Math.round(p.home[1] * 10) + '" ' +
      'aria-label="' + esc(p.room) + ' · ' + esc(p.name) + ' 열기">' +
      '<span class="sprite__shadow"></span>' +
      '<span class="sprite__inner">' + avatarSVG(p.id) + '</span>' +
      '</button>';
  }

  var spriteEls = {};

  function renderSprites() {
    var layer = $('#spriteLayer');
    if (!layer) return;
    layer.innerHTML = PARTS.map(spriteHTML).join('');
    spriteEls = {};
    $$('.sprite', layer).forEach(function (el) {
      spriteEls[el.getAttribute('data-part')] = el;
    });
  }

  function placeBubble(partId, animate) {
    var el = $('#mapBubble');
    if (!el) return;
    var p = PART_MAP[partId];
    if (!p) { el.hidden = true; return; }
    el.style.left = p.bubble[0] + '%';
    el.style.top = p.bubble[1] + '%';
    el.className = 'bubble bubble--' + p.tail + (isActive(partId) ? '' : ' is-off');
    $('.bubble__txt', el).textContent = statusOf(partId);
    el.hidden = false;
    var stage = $('#mapStage');
    if (stage) {
      var sw = stage.clientWidth;
      var bw = el.offsetWidth;
      var cx = sw * p.bubble[0] / 100;
      var half = bw / 2 + 6;
      if (cx < half) el.style.left = (half / sw * 100) + '%';
      else if (cx > sw - half) el.style.left = ((sw - half) / sw * 100) + '%';
    }
    if (animate) {
      el.classList.remove('is-pop');
      void el.offsetWidth;
      el.classList.add('is-pop');
    }
  }

  function syncBubble() {
    if (!state.motion) { var b = $('#mapBubble'); if (b) b.hidden = true; return; }
    placeBubble(state.focus, true);
  }

  function refreshFocus() {
    $$('.tag').forEach(function (tag, i) {
      tag.classList.toggle('is-focus', PARTS[i] && PARTS[i].id === state.focus);
    });
    Object.keys(spriteEls).forEach(function (id) {
      spriteEls[id].classList.toggle('is-focus', id === state.focus);
    });
  }

  function startBubbleLoop() {
    window.clearInterval(bubbleTimer);
    bubbleTimer = window.setInterval(function () {
      if (!state.motion || document.hidden || ui.sheet) return;
      if (Date.now() - focusHold < 14000) return;
      var act = activeParts();
      if (!act.length) return;
      var i = act.map(function (p) { return p.id; }).indexOf(state.focus);
      var next = act[(i + 1) % act.length];
      if (next.id === state.focus && act.length > 1) next = act[(i + 2) % act.length];
      state.focus = next.id;
      refreshFocus();
      placeBubble(state.focus, true);
    }, 5200);
  }

  /* ---------------------------------------------------------
     캐릭터 모션 — 한 번에 한 명만 걷고, 나머지는 자리에서 일한다
     --------------------------------------------------------- */

  var walkGen = 0;
  var walker = null;
  var motionTimer = null;

  function moveSprite(id, point, dur) {
    var el = spriteEls[id];
    if (!el) return;
    el.style.transitionDuration = dur + 's';
    el.style.left = point[0] + '%';
    el.style.top = point[1] + '%';
    el.style.zIndex = Math.round(point[1] * 10);
  }

  function popEmoji(id) {
    var el = spriteEls[id];
    var p = PART_MAP[id];
    if (!el || !p || !p.emoji || !state.motion) return;
    if (el.querySelector('.sprite__emoji')) return;
    var span = document.createElement('span');
    span.className = 'sprite__emoji';
    span.textContent = p.emoji[Math.floor(Math.random() * p.emoji.length)];
    el.appendChild(span);
    window.setTimeout(function () {
      if (span.parentNode) span.parentNode.removeChild(span);
    }, 2300);
  }

  function setTyping(id, on) {
    var el = spriteEls[id];
    if (!el) return;
    el.classList.toggle('is-typing', !!on);
  }

  function startWalk(id) {
    var p = PART_MAP[id];
    var el = spriteEls[id];
    if (!p || !el || walker) return;
    var gen = ++walkGen;
    walker = id;
    var out = p.paces[Math.floor(Math.random() * p.paces.length)];
    setTyping(id, false);
    el.classList.add('is-walk');
    moveSprite(id, out, 1.3);
    window.setTimeout(function () {
      if (gen !== walkGen) return;
      el.classList.remove('is-walk');
      popEmoji(id);
    }, 1360);
    window.setTimeout(function () {
      if (gen !== walkGen) return;
      el.classList.add('is-walk');
      moveSprite(id, p.home, 1.35);
    }, 3600);
    window.setTimeout(function () {
      if (gen !== walkGen) return;
      el.classList.remove('is-walk');
      setTyping(id, true);
      window.setTimeout(function () { if (gen === walkGen) setTyping(id, false); }, 2400);
    }, 5000);
    window.setTimeout(function () {
      if (gen !== walkGen) return;
      walker = null;
    }, 5200);
  }

  function motionTick() {
    if (!state.motion || document.hidden || ui.sheet) return;
    var act = activeParts();
    if (!act.length) return;

    if (!walker && Math.random() < 0.5) {
      var pick = act[Math.floor(Math.random() * act.length)];
      if (pick.id !== state.focus || Math.random() < 0.4) startWalk(pick.id);
    }

    if (Math.random() < 0.42) {
      popEmoji(act[Math.floor(Math.random() * act.length)].id);
    }

    if (!walker && Math.random() < 0.55) {
      var t = act[Math.floor(Math.random() * act.length)].id;
      setTyping(t, true);
      window.setTimeout(function () { setTyping(t, false); }, 1800 + Math.random() * 2200);
    }
  }

  function startMotionLoop() {
    window.clearInterval(motionTimer);
    motionTimer = window.setInterval(motionTick, 2600);
  }

  function resetMotion() {
    walkGen += 1;
    walker = null;
    Object.keys(spriteEls).forEach(function (id) {
      var p = PART_MAP[id];
      var el = spriteEls[id];
      if (!p || !el) return;
      el.classList.remove('is-walk', 'is-typing');
      el.style.transitionDuration = '0s';
      el.style.left = p.home[0] + '%';
      el.style.top = p.home[1] + '%';
    });
  }

  /* ---------------------------------------------------------
     시간대 · 날씨 — 하늘(창문 뒤), 조명 세척, 모니터·스탠드 불빛, 비·눈
     --------------------------------------------------------- */

  var WEATHER_KEY = 'byeol-office-weather';
  var HOME_LAT = 37.3948;   // 경기 안양시 동안구 (기본 위치)
  var HOME_LON = 126.9568;
  var DEFAULT_SUNRISE = 7.0;
  var DEFAULT_SUNSET = 17.3;

  var env = {
    sunrise: DEFAULT_SUNRISE,
    sunset: DEFAULT_SUNSET,
    temp: null,
    code: null,
    cloud: null,
    fetchedAt: 0,
    weatherSource: 'estimate'
  };

  var TIME_OPTIONS = [
    { id: 'auto', label: '실시간' },
    { id: 'morning', label: '아침' },
    { id: 'day', label: '낮' },
    { id: 'sunset', label: '노을' },
    { id: 'night', label: '밤' }
  ];
  var WEATHER_OPTIONS = [
    { id: 'auto', label: '실시간' },
    { id: 'clear', label: '맑음' },
    { id: 'cloudy', label: '흐림' },
    { id: 'rain', label: '비' },
    { id: 'snow', label: '눈' }
  ];
  var WEATHER_LABEL = { clear: '맑음', cloudy: '흐림', rain: '비', snow: '눈' };
  var WEATHER_ICON = { clear: '☀', cloudy: '☁', rain: '☂', snow: '❄' };
  var NIGHT_ICON = { clear: '☾', cloudy: '☁', rain: '☂', snow: '❄' };
  var PHASE_LABEL = { dawn: '아침', day: '낮', sunset: '노을', night: '밤' };

  function hexToRgb(hex) {
    var h = hex.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }

  function rgbStr(c) {
    return 'rgb(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ')';
  }

  function mixRgb(a, b, t) {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  }

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function envKeys() {
    var sr = env.sunrise;
    var ss = env.sunset;
    var raw = [
      { t: sr - 2.2, sky: [16, 23, 46], wash: '#1a2344', op: 0.70 },
      { t: sr - 0.7, sky: [52, 52, 88], wash: '#433d6c', op: 0.52 },
      { t: sr + 0.1, sky: [198, 134, 124], wash: '#ffbf94', op: 0.30 },
      { t: sr + 0.9, sky: [250, 198, 152], wash: '#ffd6a8', op: 0.18 },
      { t: sr + 2.6, sky: [190, 218, 240], wash: '#fff4e4', op: 0.07 },
      { t: (sr + ss) / 2, sky: [179, 214, 242], wash: '#ffffff', op: 0.02 },
      { t: ss - 2.2, sky: [196, 222, 242], wash: '#ffffff', op: 0.04 },
      { t: ss - 0.5, sky: [252, 182, 120], wash: '#ffb27a', op: 0.22 },
      { t: ss + 0.4, sky: [214, 124, 112], wash: '#ff9a72', op: 0.30 },
      { t: ss + 1.4, sky: [70, 66, 110], wash: '#6a5a86', op: 0.44 },
      { t: ss + 2.6, sky: [22, 30, 58], wash: '#1f2848', op: 0.66 },
      { t: ss + 4.0, sky: [16, 23, 46], wash: '#1a2344', op: 0.70 }
    ];
    raw.sort(function (a, b) { return a.t - b.t; });
    var out = [];
    raw.forEach(function (k) {
      var t = clamp(k.t, -6, 30);
      if (out.length && t <= out[out.length - 1].t + 0.01) return;
      out.push({ t: t, sky: k.sky, wash: hexToRgb(k.wash), op: k.op });
    });
    return out;
  }

  function sampleEnv(keys, h) {
    var n = keys.length;
    var x = ((h % 24) + 24) % 24;
    for (var i = 0; i < n; i += 1) {
      var a = keys[i];
      var b = keys[(i + 1) % n];
      var at = a.t;
      var bt = (i + 1 === n) ? b.t + 24 : b.t;
      var xt = x;
      if (xt < at) { xt += 24; }
      if (xt >= at && xt <= bt) {
        var f = bt === at ? 0 : (xt - at) / (bt - at);
        return {
          sky: mixRgb(a.sky, b.sky, f),
          wash: mixRgb(a.wash, b.wash, f),
          op: a.op + (b.op - a.op) * f
        };
      }
    }
    return { sky: keys[0].sky, wash: keys[0].wash, op: keys[0].op };
  }

  function weatherKind() {
    if (state.envWeather !== 'auto') return state.envWeather;
    var c = env.code;
    if (c == null) return 'clear';
    if (c === 0 || c === 1) return 'clear';
    if ((c >= 71 && c <= 77) || c === 85 || c === 86) return 'snow';
    if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82) || c >= 95) return 'rain';
    return 'cloudy';
  }

  function baseHour() {
    var now = new Date();
    var h = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
    if (state.envTime === 'morning') return env.sunrise + 0.8;
    if (state.envTime === 'day') return clamp((env.sunrise + env.sunset) / 2, 11, 14);
    if (state.envTime === 'sunset') return env.sunset - 0.2;
    if (state.envTime === 'night') return 22.5;
    return h;
  }

  function phaseOf(h) {
    var sr = env.sunrise;
    var ss = env.sunset;
    if (h < sr - 0.6 || h >= ss + 2.6) return 'night';
    if (h < sr + 1.6) return 'dawn';
    if (h < ss - 1.6) return 'day';
    if (h < ss + 0.8) return 'sunset';
    return 'night';
  }

  function darknessOf(op) {
    return clamp((op - 0.24) / 0.46, 0, 1);
  }

  var lightOn = false;

  function applyEnv() {
    var stage = $('#mapStage');
    if (!stage) return;

    var h = baseHour();
    var keys = envKeys();
    var s = sampleEnv(keys, h);
    var kind = weatherKind();
    var phase = phaseOf(h);

    var sky = s.sky;
    var wash = s.wash;
    var op = s.op;
    var cloud = 0;

    if (kind === 'cloudy') {
      sky = mixRgb(sky, [192, 198, 208], 0.68);
      wash = mixRgb(wash, [226, 233, 240], 0.45);
      op = clamp(op + 0.07, 0, 0.66);
      cloud = 0.8;
    } else if (kind === 'rain') {
      sky = mixRgb(sky, [112, 124, 144], 0.80);
      wash = mixRgb(wash, [206, 215, 226], 0.5);
      op = clamp(op + 0.14, 0, 0.72);
      cloud = 1;
    } else if (kind === 'snow') {
      sky = mixRgb(sky, [156, 170, 192], 0.72);
      wash = mixRgb(wash, [230, 238, 246], 0.55);
      op = clamp(op + 0.07, 0, 0.68);
      cloud = 1;
    }

    var skyEl = $('#sky');
    if (skyEl) {
      skyEl.style.background = 'linear-gradient(180deg, ' + rgbStr(mixRgb(sky, [255, 255, 255], 0.18)) +
        ' 0%, ' + rgbStr(sky) + ' 62%, ' + rgbStr(mixRgb(sky, [255, 255, 255], 0.12)) + ' 100%)';
    }

    var washEl = $('#lightWash');
    if (washEl) {
      washEl.style.backgroundColor = rgbStr(wash);
      washEl.style.opacity = op.toFixed(3);
    }

    var d = darknessOf(op);
    var lampEl = $('#lampLayer');
    if (lampEl) {
      var monitors = [[50, 26.5], [14.2, 45.4], [85.2, 45.6], [13.4, 73.4]];
      var lights = [];
      monitors.forEach(function (m) {
        lights.push('radial-gradient(circle 62px at ' + m[0] + '% ' + m[1] + '%, rgba(150,205,255,' +
          (0.42 * d + 0.03).toFixed(2) + ') 0%, rgba(120,180,240,' + (0.16 * d).toFixed(2) + ') 45%, rgba(90,140,210,0) 100%)');
      });
      PARTS.forEach(function (p) {
        if (!isActive(p.id)) return;
        lights.push('radial-gradient(circle 44px at ' + p.home[0] + '% ' + (p.home[1] - 4) + '%, rgba(255,208,140,' +
          (0.20 * d).toFixed(2) + ') 0%, rgba(255,200,120,0) 100%)');
      });
      lampEl.style.backgroundImage = lights.join(',');
      lampEl.style.opacity = d > 0.02 ? d.toFixed(2) : '0';
    }

    var orb = $('#skyOrb');
    if (orb) {
      var isNight = phase === 'night';
      var arc;
      var t;
      if (!isNight) {
        t = clamp((h - env.sunrise) / Math.max(0.5, env.sunset - env.sunrise), 0, 1);
        arc = 8 + t * 84;
        orb.style.background = 'radial-gradient(circle at 50% 50%, #fff8e2 0%, #ffe9a8 55%, rgba(255,226,140,0) 72%)';
        orb.style.width = '44px'; orb.style.height = '44px';
      } else {
        var nightLen = 24 - (env.sunset - env.sunrise);
        var hn = h > env.sunset ? h : h + 24;
        t = clamp((hn - env.sunset) / Math.max(0.5, nightLen), 0, 1);
        arc = 10 + t * 80;
        orb.style.background = 'radial-gradient(circle at 50% 50%, #ffffff 0%, #e8eeff 55%, rgba(230,238,255,0) 72%)';
        orb.style.width = '26px'; orb.style.height = '26px';
      }
      orb.style.left = arc.toFixed(1) + '%';
      orb.style.top = isNight ? (26 - Math.sin(t * Math.PI) * 20).toFixed(1) + '%'
        : (24 - Math.sin(t * Math.PI) * 21).toFixed(1) + '%';
      orb.style.opacity = cloud > 0.5 ? '0.12' : '.92';
    }

    stage.setAttribute('data-phase', phase);
    stage.setAttribute('data-weather', kind);

    var label = (state.envTime === 'auto' ? '' : '미리보기 ') + PHASE_LABEL[phase] +
      ' · ' + WEATHER_LABEL[kind];
    var tempTxt = (state.envWeather === 'auto' && env.temp != null) ? ' ' + Math.round(env.temp) + '°' : '';
    var txt = $('#envText');
    if (txt) txt.textContent = label + tempTxt;
    var ico = $('#envIcon');
    if (ico) ico.textContent = (phase === 'night' ? NIGHT_ICON : WEATHER_ICON)[kind];

    setFx(kind);
  }

  /* 비·눈 파티클 (캔버스는 배경 이미지 뒤에 있어 창문으로만 보인다) */
  var fxCtx = null;
  var fxKind = 'clear';
  var fxParts = [];
  var fxRaf = null;
  var fxLast = 0;

  function fxResize() {
    var c = $('#fxCanvas');
    if (!c) return;
    var r = c.getBoundingClientRect();
    c.width = Math.max(1, Math.round(r.width));
    c.height = Math.max(1, Math.round(r.height));
    fxCtx = c.getContext('2d');
  }

  function seedFx(kind) {
    var c = $('#fxCanvas');
    if (!c) return;
    var w = c.width;
    var h = c.height;
    fxParts = [];
    if (kind === 'rain') {
      for (var i = 0; i < 84; i += 1) {
        fxParts.push({ x: Math.random() * w, y: Math.random() * h, s: 240 + Math.random() * 180,
          l: 8 + Math.random() * 8, a: 0.42 + Math.random() * 0.34 });
      }
    } else if (kind === 'snow') {
      for (var j = 0; j < 62; j += 1) {
        fxParts.push({ x: Math.random() * w, y: Math.random() * h, s: 14 + Math.random() * 18,
          r: 1.8 + Math.random() * 1.6, d: Math.random() * Math.PI * 2, a: 0.7 + Math.random() * 0.3 });
      }
    }
  }

  function fxFrame(ts) {
    if (!fxCtx) return;
    var dt = Math.min(50, ts - fxLast || 16) / 1000;
    fxLast = ts;
    var c = fxCtx.canvas;
    var w = c.width;
    var h = c.height;
    fxCtx.clearRect(0, 0, w, h);

    if (fxKind === 'rain') {
      fxCtx.strokeStyle = 'rgba(240,250,255,.95)';
      fxCtx.lineWidth = 1.3;
      for (var i = 0; i < fxParts.length; i += 1) {
        var p = fxParts[i];
        p.y += p.s * dt;
        p.x -= 26 * dt;
        if (p.y > h) { p.y = -10; p.x = Math.random() * w; }
        if (p.x < -4) p.x = w + 2;
        fxCtx.globalAlpha = p.a;
        fxCtx.beginPath();
        fxCtx.moveTo(Math.round(p.x), Math.round(p.y));
        fxCtx.lineTo(Math.round(p.x - 1), Math.round(p.y + p.l));
        fxCtx.stroke();
      }
    } else if (fxKind === 'snow') {
      fxCtx.fillStyle = 'rgba(255,255,255,.95)';
      for (var k = 0; k < fxParts.length; k += 1) {
        var f = fxParts[k];
        f.y += f.s * dt;
        f.d += dt * 1.6;
        f.x += Math.sin(f.d) * 10 * dt;
        if (f.y > h + 3) { f.y = -4; f.x = Math.random() * w; }
        if (f.x < -3) f.x = w; else if (f.x > w + 3) f.x = 0;
        fxCtx.globalAlpha = f.a;
        fxCtx.fillRect(Math.round(f.x), Math.round(f.y), Math.round(f.r + 0.6), Math.round(f.r + 0.6));
      }
    }
    fxCtx.globalAlpha = 1;
    fxRaf = window.requestAnimationFrame(fxFrame);
  }

  function setFx(kind) {
    if (kind === fxKind) return;
    fxKind = kind;
    seedFx(kind);
    window.cancelAnimationFrame(fxRaf);
    fxRaf = null;
    var animated = (kind === 'rain' || kind === 'snow') && !document.hidden && state.motion;
    if (animated) {
      fxLast = 0;
      fxRaf = window.requestAnimationFrame(fxFrame);
    } else if (fxCtx) {
      fxCtx.clearRect(0, 0, fxCtx.canvas.width, fxCtx.canvas.height);
    }
  }

  function refreshFxRun() {
    window.cancelAnimationFrame(fxRaf);
    fxRaf = null;
    if (fxCtx) fxCtx.clearRect(0, 0, fxCtx.canvas.width, fxCtx.canvas.height);
    if ((fxKind === 'rain' || fxKind === 'snow') && !document.hidden && state.motion) {
      fxLast = 0;
      fxRaf = window.requestAnimationFrame(fxFrame);
    }
  }

  /* Open-Meteo (키 없이 호출) — 30분 캐시 */
  function applyWeatherData(d) {
    if (!d) return;
    env.code = typeof d.code === 'number' ? d.code : env.code;
    env.temp = typeof d.temp === 'number' ? d.temp : env.temp;
    env.cloud = typeof d.cloud === 'number' ? d.cloud : env.cloud;
    if (d.sunrise) { var a = d.sunrise.split('T'); if (a[1]) env.sunrise = parseFloat(a[1].slice(0, 2)) + parseFloat(a[1].slice(3, 5)) / 60; }
    if (d.sunset) { var b = d.sunset.split('T'); if (b[1]) env.sunset = parseFloat(b[1].slice(0, 2)) + parseFloat(b[1].slice(3, 5)) / 60; }
    env.fetchedAt = d.at || Date.now();
    env.weatherSource = 'open-meteo';
  }

  function loadWeather() {
    var cached = readJSON(WEATHER_KEY);
    if (cached && cached.at && Date.now() - cached.at < 30 * 60 * 1000) {
      applyWeatherData(cached);
      applyEnv();
      return;
    }
    var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + HOME_LAT + '&longitude=' + HOME_LON +
      '&current=temperature_2m,weather_code,cloud_cover' +
      '&daily=sunrise,sunset&timezone=auto&forecast_days=1';

    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = window.setTimeout(function () { if (ctrl) ctrl.abort(); }, 7000);

    fetch(url, ctrl ? { signal: ctrl.signal } : undefined).then(function (res) {
      return res.json();
    }).then(function (json) {
      window.clearTimeout(timer);
      var cur = json && json.current;
      var daily = json && json.daily;
      if (!cur) return;
      var d = {
        at: Date.now(),
        temp: cur.temperature_2m,
        code: cur.weather_code,
        cloud: cur.cloud_cover,
        sunrise: daily && daily.sunrise && daily.sunrise[0],
        sunset: daily && daily.sunset && daily.sunset[0]
      };
      try { window.localStorage.setItem(WEATHER_KEY, JSON.stringify(d)); } catch (e) {}
      applyWeatherData(d);
      applyEnv();
    }).catch(function () {
      window.clearTimeout(timer);
      applyEnv();
    });
  }

  function renderEnvPanel() {
    var tRow = $('#envTimeRow');
    var wRow = $('#envWeatherRow');
    if (!tRow || !wRow) return;
    tRow.innerHTML = TIME_OPTIONS.map(function (o) {
      return '<button class="env-opt' + (state.envTime === o.id ? ' is-on' : '') +
        '" type="button" data-action="env-time" data-env="' + o.id + '">' + o.label + '</button>';
    }).join('');
    wRow.innerHTML = WEATHER_OPTIONS.map(function (o) {
      return '<button class="env-opt' + (state.envWeather === o.id ? ' is-on' : '') +
        '" type="button" data-action="env-weather" data-env="' + o.id + '">' + o.label + '</button>';
    }).join('');
    var foot = $('#envFoot');
    if (foot) {
      foot.textContent = (state.envTime === 'auto' && state.envWeather === 'auto')
        ? '지금은 실시간 시각과 날씨를 따르고 있어요.'
        : '미리보기 중이에요. ‘실시간’을 고르면 실제 시간·날씨로 돌아갑니다.';
    }
  }

  function openEnvPanel(open) {
    var panel = $('#envPanel');
    var chip = $('#envChip');
    if (!panel || !chip) return;
    panel.hidden = !open;
    chip.setAttribute('aria-expanded', open ? 'true' : 'false');
    chip.style.visibility = open ? 'hidden' : '';
    if (open) renderEnvPanel();
  }

  function setEnv(kind, value) {
    if (kind === 'time') state.envTime = value; else state.envWeather = value;
    save();
    applyEnv();
    renderEnvPanel();
  }


  /* ---------------------------------------------------------
     renderers
     --------------------------------------------------------- */

  function renderHeader() {
    var act = activeParts().length;
    var txt = act ? act + '인 체제 가동 중' : '모두 휴식 중';
    $('#brandSub').textContent = txt;
    $('#todayBadge').textContent = txt;
    $('#liveDot').classList.toggle('is-off', act === 0);

    var openAgenda = state.agenda.filter(function (a) { return !a.done; }).length;
    $('#meetingDot').hidden = openAgenda === 0;
    $('#meetingMeta').textContent = openAgenda ? '안건 ' + openAgenda + '건' : '지금은 한가해요';

    var openTasks = state.tasks.filter(function (t) { return !t.done; }).length;
    $('#workMeta').textContent = openTasks ? '할 일 ' + openTasks + '건' : '전부 정리됨';

    var d = new Date();
    $('#brandDate').textContent = (d.getMonth() + 1) + '.' + d.getDate() + ' ' + WEEK[d.getDay()];

    $('#todayEyebrow').innerHTML = '<b class="eyebrow__nick">' + esc(state.nick || '대표님') +
      '</b> · ' + esc(greeting());

    $('#todayStats').textContent = '할 일 ' + openTasks + ' · 안건 ' + openAgenda;
  }

  function renderMap() {
    var overlay = $('#mapOverlay');
    if (!overlay) return;
    renderSprites();
    overlay.innerHTML = overlayHTML();
    refreshFocus();
    syncBubble();
  }

  function crewHTML(p) {
    var st = state.parts[p.id];
    var n = tasksOf(p.id, false).length;
    return '<button class="crew-card' + (st.active ? '' : ' is-off') + '" type="button" ' +
      'data-action="open-room" data-part="' + p.id + '" style="--c:' + p.color + ';--soft:' + p.soft + '">' +
      '<span class="crew-card__avatar">' + avatarSVG(p.id) + '</span>' +
      '<span class="crew-card__body">' +
        '<span class="crew-card__top"><b>' + esc(p.name) + '</b>' +
          (n ? '<i class="pill-count">' + n + '</i>' : '') + '</span>' +
        '<span class="crew-card__status">' + esc(statusOf(p.id)) + '</span>' +
      '</span>' +
      '</button>';
  }

  function renderCrew() {
    var el = $('#crewList');
    if (el) el.innerHTML = PARTS.map(crewHTML).join('');
  }

  function taskItemHTML(t) {
    var p = PART_MAP[t.part] || PARTS[0];
    return '<li class="item' + (t.done ? ' item--done' : '') + '">' +
      '<button class="check" type="button" role="checkbox" aria-checked="' + (t.done ? 'true' : 'false') +
        '" data-action="toggle-task" data-id="' + t.id + '" aria-label="완료 표시"></button>' +
      '<div class="item__body">' +
        '<p class="item__title">' + esc(t.title) + '</p>' +
        '<p class="item__meta"><span class="tag-chip" style="background:' + p.soft + ';color:' + p.deep + '">' +
          esc(p.name) + '</span>' + shortDate(t.at) + '</p>' +
      '</div>' +
      '<button class="icon-btn" type="button" data-action="del-task" data-id="' + t.id + '" ' +
        'aria-label="삭제">✕</button>' +
    '</li>';
  }

  function agendaItemHTML(a) {
    return '<li class="item' + (a.done ? ' item--done' : '') + '">' +
      '<button class="check" type="button" role="checkbox" aria-checked="' + (a.done ? 'true' : 'false') +
        '" data-action="toggle-agenda" data-id="' + a.id + '" aria-label="결정 완료"></button>' +
      '<div class="item__body">' +
        '<p class="item__title">' + esc(a.title) + '</p>' +
        '<p class="item__meta">' + (a.done ? '정리됨' : '결정 대기') + ' · ' + shortDate(a.at) + '</p>' +
      '</div>' +
      '<button class="icon-btn" type="button" data-action="del-agenda" data-id="' + a.id + '" ' +
        'aria-label="삭제">✕</button>' +
    '</li>';
  }

  function renderAgenda() {
    var list = state.agenda.slice().sort(function (a, b) {
      if (a.done !== b.done) return a.done ? 1 : -1;
      return (b.at || 0) - (a.at || 0);
    });
    $('#agendaList').innerHTML = list.map(agendaItemHTML).join('');
    $('#agendaEmpty').hidden = list.length > 0;
  }

  function renderTasks() {
    var list = state.tasks.slice().sort(sortTask);
    if (ui.filter !== 'all') {
      list = list.filter(function (t) { return t.part === ui.filter; });
    }
    $('#taskList').innerHTML = list.map(taskItemHTML).join('');
    $('#taskEmpty').hidden = list.length > 0;

    var total = state.tasks.length;
    var done = state.tasks.filter(function (t) { return t.done; }).length;
    $('#taskProgressBar').style.width = total ? (done / total * 100) + '%' : '0%';
    $('#taskProgressText').textContent = done + ' / ' + total + ' 완료';

    $('#taskFilters').innerHTML = FILTERS.map(function (f) {
      var n = f.id === 'all' ? state.tasks.length
        : state.tasks.filter(function (t) { return t.part === f.id; }).length;
      return '<button class="chip' + (ui.filter === f.id ? ' is-on' : '') + '" type="button" ' +
        'data-action="filter" data-filter="' + f.id + '">' + esc(f.label) + '<small>' + n + '</small></button>';
    }).join('');
  }

  function agentHTML(p) {
    var st = state.parts[p.id];
    var n = tasksOf(p.id, false).length;
    return '<article class="agent' + (st.active ? '' : ' is-off') + '" style="--c:' + p.color +
      ';--soft:' + p.soft + '">' +
      '<div class="agent__top">' +
        '<div class="agent__avatar">' + avatarSVG(p.id) + '</div>' +
        '<div class="agent__id">' +
          '<h3 class="agent__name">' + esc(p.name) + '</h3>' +
          '<p class="agent__role">' + esc(p.room) + ' · ' + esc(p.role) + '</p>' +
        '</div>' +
        '<button class="switch" type="button" data-action="toggle-active" data-part="' + p.id + '" ' +
          'aria-pressed="' + (st.active ? 'true' : 'false') + '" aria-label="' + esc(p.name) + ' 가동"></button>' +
      '</div>' +
      '<input class="agent__status" data-status="' + p.id + '" maxlength="40" value="' + esc(st.status) +
        '" aria-label="' + esc(p.name) + ' 상태 문구">' +
      '<div class="agent__foot">' +
        '<span class="pill-soft">' + (st.active ? '가동 중' : '휴식 중') + '</span>' +
        '<span class="pill-soft">진행 ' + n + '건</span>' +
        '<button class="link" type="button" data-action="go-work" data-part="' + p.id + '">할 일 보기 →</button>' +
      '</div>' +
    '</article>';
  }

  function renderTeam() {
    $('#teamList').innerHTML = PARTS.map(agentHTML).join('');
  }

  function updateStorageInfo() {
    var el = $('#storageInfo');
    if (!el) return;
    var when = state.updatedAt ? timeLabel(state.updatedAt) : '아직 없음';
    el.textContent = '마지막 저장 ' + when + ' · 할 일 ' + state.tasks.length +
      '개 · 안건 ' + state.agenda.length + '개';
  }

  function renderSettings() {
    var memo = $('#memo');
    var nick = $('#nickInput');
    if (memo && document.activeElement !== memo) memo.value = state.memo;
    if (nick && document.activeElement !== nick) nick.value = state.nick;
    $('#nickPreview').textContent = '“' + (state.nick || '대표님') + ', 오늘도 화이팅!”';
    updateStorageInfo();
  }

  function renderAll() {
    renderHeader();
    renderMap();
    renderCrew();
    renderAgenda();
    renderTasks();
    renderTeam();
    renderSettings();
  }

  function syncStatusTexts() {
    $$('.crew-card').forEach(function (card) {
      var id = card.getAttribute('data-part');
      var s = card.querySelector('.crew-card__status');
      if (s && id) s.textContent = statusOf(id);
    });
    var b = $('#mapBubble .bubble__txt');
    if (b) b.textContent = statusOf(state.focus);
  }

  /* ---------------------------------------------------------
     sheet
     --------------------------------------------------------- */

  function openRoom(id) {
    if (!PART_MAP[id]) return;
    state.focus = id;
    focusHold = Date.now();
    save();
    ui.sheet = { type: 'part', id: id };
    refreshFocus();
    placeBubble(id, true);
    renderSheet();
    var wrap = $('#sheetWrap');
    window.clearTimeout(closeTimer);
    wrap.hidden = false;
    document.body.style.overflow = 'hidden';
    window.requestAnimationFrame(function () { wrap.classList.add('is-open'); });
  }

  function closeSheet() {
    var wrap = $('#sheetWrap');
    if (wrap.hidden) return;
    wrap.classList.remove('is-open');
    document.body.style.overflow = '';
    ui.sheet = null;
    window.clearTimeout(closeTimer);
    closeTimer = window.setTimeout(function () { wrap.hidden = true; }, 340);
  }

  function renderSheet() {
    var target = ui.sheet;
    if (!target) return;
    var head = $('#sheetHead');
    var body = $('#sheetBody');

    var p = PART_MAP[target.id];
    if (!p) return;
    var st = state.parts[p.id];
    var list = tasksOf(p.id, true).sort(sortTask);
    var openN = list.filter(function (t) { return !t.done; }).length;

    head.style.setProperty('--c', p.color);
    head.innerHTML = '<div class="sheet__avatar" style="background:' + p.soft + '">' + avatarSVG(p.id) + '</div>' +
      '<div class="sheet__id"><h3 class="sheet__title" id="sheetTitle">' + esc(p.name) + '</h3>' +
      '<p class="sheet__sub">' + esc(p.room) + ' · ' + esc(p.role) + '</p></div>' +
      '<button class="switch" type="button" data-action="toggle-active" data-part="' + p.id + '" ' +
        'aria-pressed="' + (st.active ? 'true' : 'false') + '" aria-label="' + esc(p.name) + ' 가동"></button>';

    body.innerHTML =
      '<label class="field"><span class="field__label">한 줄 상태</span>' +
        '<input class="input input--soft" data-status="' + p.id + '" maxlength="40" value="' + esc(st.status) +
          '" aria-label="상태 문구"></label>' +
      '<div class="sheet__row"><h4 class="sheet__h4">할 일</h4>' +
        '<span class="sheet__count">' + (openN ? openN + '건 진행 중' : '전부 정리됨') + '</span></div>' +
      (list.length
        ? '<ul class="list list--compact">' + list.map(taskItemHTML).join('') + '</ul>'
        : '<p class="field__hint">아직 할 일이 없어요.</p>') +
      '<form class="addbar" data-add="' + p.id + '" autocomplete="off">' +
        '<input class="input" maxlength="80" placeholder="' + esc(p.name) + '에게 할 일 맡기기" aria-label="할 일 추가">' +
        '<button class="btn-add" type="submit" aria-label="추가">＋</button>' +
      '</form>' +
      '<button class="btn btn--ghost btn--full" type="button" data-action="go-work" data-part="' +
        p.id + '">작업실에서 전체 보기</button>';
  }

  /* ---------------------------------------------------------
     actions
     --------------------------------------------------------- */

  function setTab(name, silent) {
    if (['map', 'meeting', 'work', 'team', 'memo'].indexOf(name) < 0) name = 'map';
    state.tab = name;
    $$('.tab').forEach(function (b) {
      var on = b.getAttribute('data-tab') === name;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    $$('.view').forEach(function (v) {
      var on = v.id === 'view-' + name;
      v.classList.toggle('is-active', on);
      v.hidden = !on;
    });
    if (!silent) {
      save();
      window.scrollTo(0, 0);
    }
    if (name === 'map') window.requestAnimationFrame(function () { autosize($('#todayLine')); });
  }

  function setMotion(on) {
    state.motion = !!on;
    document.body.classList.toggle('motion', state.motion);
    document.body.classList.toggle('no-motion', !state.motion);
    $('#motionBtn').setAttribute('aria-checked', state.motion ? 'true' : 'false');
    $('#motionState').textContent = state.motion ? 'ON' : 'OFF';
    save();
    if (state.motion) {
      syncBubble();
    } else {
      resetMotion();
      setTypingAllOff();
    }
    refreshFxRun();
  }

  function setTypingAllOff() {
    Object.keys(spriteEls).forEach(function (id) { setTyping(id, false); });
  }

  function addTask(partId, title) {
    var text = (title || '').trim();
    if (!text) { toast('할 일을 먼저 적어 주세요'); return; }
    if (!PART_MAP[partId]) partId = 'byeol';
    state.tasks.unshift({ id: uid(), title: text.slice(0, 80), part: partId, done: false, at: Date.now() });
    save();
    renderCrew();
    renderTasks();
    renderTeam();
    renderHeader();
    if (ui.sheet) {
      renderSheet();
      var box = $('#sheetBody .addbar input');
      if (box) box.focus();
    }
    toast('할 일을 추가했어요');
  }

  function addAgenda(title) {
    var text = (title || '').trim();
    if (!text) { toast('안건을 먼저 적어 주세요'); return; }
    state.agenda.unshift({ id: uid(), title: text.slice(0, 80), done: false, at: Date.now() });
    save();
    renderAgenda();
    renderHeader();
    if (ui.sheet) renderSheet();
    toast('안건을 올렸어요');
  }

  function toggleTask(id) {
    state.tasks.forEach(function (t) { if (t.id === id) t.done = !t.done; });
    save();
    renderCrew();
    renderTasks();
    renderTeam();
    renderHeader();
    if (ui.sheet) renderSheet();
  }

  function toggleAgenda(id) {
    state.agenda.forEach(function (a) { if (a.id === id) a.done = !a.done; });
    save();
    renderAgenda();
    renderHeader();
    if (ui.sheet) renderSheet();
  }

  function removeTask(id) {
    state.tasks = state.tasks.filter(function (t) { return t.id !== id; });
    save();
    renderCrew();
    renderTasks();
    renderTeam();
    renderHeader();
    if (ui.sheet) renderSheet();
    toast('할 일을 지웠어요');
  }

  function removeAgenda(id) {
    state.agenda = state.agenda.filter(function (a) { return a.id !== id; });
    save();
    renderAgenda();
    renderHeader();
    if (ui.sheet) renderSheet();
    toast('안건을 지웠어요');
  }

  function toggleActive(id) {
    if (!state.parts[id]) return;
    state.parts[id].active = !state.parts[id].active;
    save();
    renderMap();
    renderCrew();
    renderTeam();
    renderHeader();
    if (ui.sheet) renderSheet();
    toast(state.parts[id].active ? PART_MAP[id].name + ' 가동 시작' : PART_MAP[id].name + ' 잠깐 휴식');
  }

  /* ---------------------------------------------------------
     backup / restore
     --------------------------------------------------------- */

  function exportJSON() {
    var blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    var d = new Date();
    a.href = url;
    a.download = 'byeol-office-' + d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate()) + '.json';
    document.body.appendChild(a);
    a.click();
    window.setTimeout(function () {
      URL.revokeObjectURL(url);
      if (a.parentNode) a.parentNode.removeChild(a);
    }, 1500);
    toast('백업 파일을 내려받았어요');
  }

  function importJSON(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      var obj = null;
      try {
        obj = JSON.parse(String(reader.result));
      } catch (e) {
        window.alert('파일을 읽을 수 없어요. 별이 비서실에서 내보낸 JSON 파일인지 확인해 주세요.');
        return;
      }
      if (!obj || typeof obj !== 'object' || (!obj.parts && !obj.tasks && !obj.agenda)) {
        window.alert('별이 비서실 백업 파일이 아니에요.');
        return;
      }
      if (!window.confirm('지금 내용을 불러온 파일로 바꿀까요?\n지금 기록은 덮어써져요.')) return;
      state = normalize(obj);
      save();
      applyState();
      toast('백업을 불러왔어요');
    };
    reader.readAsText(file);
  }

  function resetAll() {
    if (!window.confirm('모든 내용을 처음 상태로 되돌릴까요?\n메모와 할 일이 모두 사라져요.')) return;
    state = defaultState();
    save();
    applyState();
    toast('처음 상태로 돌아왔어요');
  }

  function applyState() {
    document.body.classList.toggle('motion', state.motion);
    document.body.classList.toggle('no-motion', !state.motion);
    $('#motionBtn').setAttribute('aria-checked', state.motion ? 'true' : 'false');
    $('#motionState').textContent = state.motion ? 'ON' : 'OFF';
    var tl = $('#todayLine');
    tl.value = state.today;
    autosize(tl);
    $('#memo').value = state.memo;
    $('#nickInput').value = state.nick;
    $('#memoHint').textContent = '자동 저장';
    renderAll();
    setTab(state.tab || 'map', true);
    applyEnv();
  }

  /* ---------------------------------------------------------
     events
     --------------------------------------------------------- */

  function bind() {
    $('#motionBtn').addEventListener('click', function () {
      setMotion(!state.motion);
      toast(state.motion ? '말풍선을 켰어요' : '말풍선을 껐어요');
    });

    $('#tabs').addEventListener('click', function (e) {
      var btn = e.target.closest('.tab');
      if (!btn) return;
      setTab(btn.getAttribute('data-tab'));
    });

    var today = $('#todayLine');
    today.addEventListener('input', function () {
      state.today = today.value.slice(0, 120);
      autosize(today);
      saveSoon();
    });

    var memo = $('#memo');
    var memoTimer = null;
    memo.addEventListener('input', function () {
      state.memo = memo.value.slice(0, 4000);
      $('#memoHint').textContent = '저장 중…';
      window.clearTimeout(memoTimer);
      saveSoon(function () {
        $('#memoHint').textContent = '저장했어요';
        memoTimer = window.setTimeout(function () {
          $('#memoHint').textContent = '자동 저장';
        }, 1800);
      });
    });

    var nick = $('#nickInput');
    nick.addEventListener('input', function () {
      state.nick = nick.value.slice(0, 12);
      $('#nickPreview').textContent = '“' + (state.nick.trim() || '대표님') + ', 오늘도 화이팅!”';
      var eyebrow = $('#todayEyebrow');
      if (eyebrow) {
        eyebrow.innerHTML = '<b class="eyebrow__nick">' + esc(state.nick.trim() || '대표님') +
          '</b> · ' + esc(greeting());
      }
      saveSoon();
    });
    nick.addEventListener('blur', function () {
      var v = nick.value.trim();
      if (!v) {
        state.nick = '대표님';
        nick.value = '대표님';
        renderHeader();
        save();
      } else if (v !== state.nick) {
        state.nick = v;
        nick.value = v;
        renderHeader();
        save();
      }
    });

    $('#exportBtn').addEventListener('click', exportJSON);
    $('#importBtn').addEventListener('click', function () { $('#importFile').click(); });
    $('#importFile').addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0];
      importJSON(f);
      e.target.value = '';
    });
    $('#resetBtn').addEventListener('click', resetAll);

    $('#agendaForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var input = $('#agendaInput');
      addAgenda(input.value);
      input.value = '';
      input.focus();
    });

    $('#taskForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var input = $('#taskInput');
      addTask($('#taskPart').value, input.value);
      input.value = '';
      input.focus();
    });

    document.addEventListener('click', function (e) {
      var el = e.target.closest ? e.target.closest('[data-action]') : null;
      if (!el) return;
      var action = el.getAttribute('data-action');

      switch (action) {
        case 'open-room':
          openRoom(el.getAttribute('data-part'));
          break;
        case 'close-sheet':
          closeSheet();
          break;
        case 'env-time':
          setEnv('time', el.getAttribute('data-env'));
          break;
        case 'env-weather':
          setEnv('weather', el.getAttribute('data-env'));
          break;
        case 'toggle-task':
          toggleTask(el.getAttribute('data-id'));
          break;
        case 'del-task':
          removeTask(el.getAttribute('data-id'));
          break;
        case 'toggle-agenda':
          toggleAgenda(el.getAttribute('data-id'));
          break;
        case 'del-agenda':
          removeAgenda(el.getAttribute('data-id'));
          break;
        case 'toggle-active':
          toggleActive(el.getAttribute('data-part'));
          break;
        case 'go-work':
          ui.filter = el.getAttribute('data-part') || 'all';
          closeSheet();
          setTab('work');
          renderTasks();
          break;
        case 'go-work-all':
          ui.filter = 'all';
          setTab('work');
          renderTasks();
          break;
        case 'go-meeting':
          setTab('meeting');
          break;
        case 'filter':
          ui.filter = el.getAttribute('data-filter');
          if (ui.filter !== 'all') $('#taskPart').value = ui.filter;
          renderTasks();
          break;
        default:
          break;
      }
    });

    document.addEventListener('submit', function (e) {
      var form = e.target;
      if (!form || !form.getAttribute) return;
      var part = form.getAttribute('data-add');
      if (!part) return;
      e.preventDefault();
      var input = form.querySelector('input');
      addTask(part, input.value);
      input.value = '';
      input.focus();
    });

    document.addEventListener('input', function (e) {
      var t = e.target;
      if (!t || !t.getAttribute) return;
      var id = t.getAttribute('data-status');
      if (!id || !state.parts[id]) return;
      state.parts[id].status = t.value.slice(0, 40);
      syncStatusTexts();
      saveSoon();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && ui.sheet) closeSheet();
    });

    window.addEventListener('resize', function () {
      autosize($('#todayLine'));
      fxResize();
      seedFx(fxKind);
      refreshFxRun();
    });

    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && state.motion) placeBubble(state.focus, false);
      refreshFxRun();
    });

    var envChip = $('#envChip');
    if (envChip) {
      envChip.addEventListener('click', function (e) {
        e.stopPropagation();
        openEnvPanel($('#envPanel').hidden);
      });
    }
    var envClose = $('#envClose');
    if (envClose) {
      envClose.addEventListener('click', function (e) {
        e.stopPropagation();
        openEnvPanel(false);
      });
    }
    document.addEventListener('click', function (e) {
      var panel = $('#envPanel');
      if (!panel || panel.hidden) return;
      if (panel.contains(e.target) || e.target === $('#envChip')) return;
      openEnvPanel(false);
    });

    window.addEventListener('beforeunload', function () {
      window.clearTimeout(saveTimer);
      save();
    });
  }

  /* ---------------------------------------------------------
     init
     --------------------------------------------------------- */

  function init() {
    $('#taskPart').innerHTML = PARTS.map(function (p) {
      return '<option value="' + p.id + '">' + esc(p.task) + '</option>';
    }).join('');
    $('#taskPart').value = 'gpt';

    document.body.classList.toggle('motion', state.motion);
    document.body.classList.toggle('no-motion', !state.motion);
    $('#motionBtn').setAttribute('aria-checked', state.motion ? 'true' : 'false');
    $('#motionState').textContent = state.motion ? 'ON' : 'OFF';

    var today = $('#todayLine');
    today.value = state.today;
    autosize(today);
    $('#memo').value = state.memo;
    $('#nickInput').value = state.nick;

    bind();
    renderAll();
    setTab(state.tab || 'map', true);
    startBubbleLoop();
    startMotionLoop();

    fxResize();
    applyEnv();
    loadWeather();
    window.setInterval(applyEnv, 60000);
    window.setInterval(loadWeather, 30 * 60 * 1000);

    var img = $('#mapImg');
    if (img && img.complete && img.naturalWidth) {
      document.body.classList.add('map-ready');
    } else if (img) {
      img.addEventListener('load', function () { document.body.classList.add('map-ready'); });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* =========================================================
   별이 비서실 — app logic (no dependencies, no build step)
   4인 체제: 별이(총괄) · GPT(콘텐츠·기획) · 클로드(조사·분석) · 제미나이(디자인·검수)
   ========================================================= */
(function () {
  'use strict';

  var STORAGE_KEY = 'byeol-office-v2';
  var LEGACY_KEY = 'byeol-office-v1';
  var WEEK = ['일', '월', '화', '수', '목', '금', '토'];

  /* 좌표는 assets/office-map-v1.webp (864×1152) 안의 위치를 % 로 적은 값.
     이미지를 바꾸면 이 값만 다시 맞추면 된다. */
  var PARTS = [
    { id: 'byeol', room: '총괄 지휘실', name: '별이', role: '비서실장 · 총괄 지휘', task: '총괄',
      color: '#4f6ee8', deep: '#3149b8', soft: '#eaf0ff',
      spot: [53, 31], tag: [53, 18], bubble: [53, 16], tail: 'down', delay: 0 },
    { id: 'gpt', room: '콘텐츠·기획실', name: 'GPT', role: '콘텐츠 · 기획', task: '콘텐츠·기획',
      color: '#4fc7a4', deep: '#2a9377', soft: '#e6f8f1',
      spot: [18, 53], tag: [18, 41], bubble: [20, 39], tail: 'down', delay: 0.6 },
    { id: 'claude', room: '조사·분석실', name: '클로드', role: '조사 · 분석 · 문서', task: '조사·분석',
      color: '#ef8f6b', deep: '#c2603f', soft: '#fdece4',
      spot: [85, 52], tag: [84, 40], bubble: [81, 38], tail: 'down', delay: 1.2 },
    { id: 'gemini', room: '디자인·검수실', name: '제미나이', role: '디자인 · 검수 · 이미지', task: '디자인·검수',
      color: '#a98bf2', deep: '#7752d0', soft: '#f1ebff',
      spot: [52, 68], tag: [52, 85], bubble: [52, 58], tail: 'down', delay: 1.8 }
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
        out.parts[to] = {
          status: old.parts[k].status,
          active: old.parts[k].active !== false
        };
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
     mini clay avatars (inline SVG, 52×52)
     --------------------------------------------------------- */

  function avatarSVG(partId) {
    var p = PART_MAP[partId] || PARTS[0];
    var body = '';
    var face = '<circle cx="21" cy="26" r="1.8" fill="#3f3a4d"/>' +
               '<circle cx="31" cy="26" r="1.8" fill="#3f3a4d"/>' +
               '<path d="M22.6 30.6q3.4 2.6 6.8 0" fill="none" stroke="#3f3a4d" stroke-width="1.6" stroke-linecap="round"/>';

    if (partId === 'byeol') {
      body = '<g fill="none" stroke="' + p.color + '" stroke-width="6.4" stroke-linecap="round">' +
               '<path d="M17.4 17v18M34.6 17v18M17.4 18.6h17.2M17.4 26h17.2M17.4 33.4h17.2"/>' +
             '</g>' +
             '<circle cx="23.4" cy="26" r="1.5" fill="#3f3a4d"/>' +
             '<circle cx="29" cy="26" r="1.5" fill="#3f3a4d"/>' +
             '<path d="M24.4 28.6q1.8 1.4 3.6 0" fill="none" stroke="#3f3a4d" stroke-width="1.3" stroke-linecap="round"/>';
    } else if (partId === 'gpt') {
      body = '<ellipse cx="26" cy="28" rx="13" ry="12.4" fill="' + p.color + '"/>' +
             '<ellipse cx="26" cy="22.6" rx="12" ry="7" fill="#ffffff" opacity=".22"/>';
      var pencil = '<g transform="rotate(32 37 17)">' +
        '<rect x="34.6" y="8" width="4.6" height="13" rx="2" fill="#f6b64c"/>' +
        '<rect x="34.6" y="8" width="4.6" height="3.2" rx="1.6" fill="#ffd9a0"/>' +
        '<path d="M34.6 21h4.6l-2.3 4.4z" fill="#e8a08c"/></g>';
      return '<svg class="mini-char" viewBox="0 0 52 52" aria-hidden="true" focusable="false">' +
        body + face + pencil + '</svg>';
    } else if (partId === 'claude') {
      body = '<ellipse cx="26" cy="28" rx="13" ry="12.4" fill="' + p.color + '"/>' +
             '<ellipse cx="26" cy="22.6" rx="12" ry="7" fill="#ffffff" opacity=".2"/>';
      var glasses = '<g fill="none" stroke="#8a4a33" stroke-width="1.6">' +
        '<circle cx="21" cy="26" r="3.6"/><circle cx="31" cy="26" r="3.6"/>' +
        '<path d="M24.6 26h2.8M17.4 25l-3-1M34.6 25l3-1"/></g>';
      var lens = '<g transform="rotate(38 42 40)">' +
        '<circle cx="42" cy="40" r="4.4" fill="none" stroke="#c96a45" stroke-width="2"/>' +
        '<path d="M45.4 43.4l3.6 3.6" stroke="#c96a45" stroke-width="2.4" stroke-linecap="round"/></g>';
      return '<svg class="mini-char" viewBox="0 0 52 52" aria-hidden="true" focusable="false">' +
        body + face + glasses + lens + '</svg>';
    } else {
      body = '<ellipse cx="26" cy="28" rx="13" ry="12.4" fill="' + p.color + '"/>' +
             '<ellipse cx="26" cy="22.6" rx="12" ry="7" fill="#ffffff" opacity=".24"/>';
      var stylus = '<g transform="rotate(-24 16 18)">' +
        '<rect x="13" y="7" width="4.2" height="14" rx="2.1" fill="#efe6ff"/>' +
        '<path d="M13 21h4.2l-2.1 4z" fill="#6c4bb8"/></g>' +
        '<path d="M38.6 10.4l1 2.2 2.3.4-1.7 1.7.5 2.3-2.1-1.2-2 1.2.4-2.3-1.7-1.7 2.4-.4z" fill="#ffe08a"/>';
      return '<svg class="mini-char" viewBox="0 0 52 52" aria-hidden="true" focusable="false">' +
        body + face + stylus + '</svg>';
    }
    return '<svg class="mini-char" viewBox="0 0 52 52" aria-hidden="true" focusable="false">' + body + '</svg>';
  }

  /* ---------------------------------------------------------
     map overlay
     --------------------------------------------------------- */

  function overlayHTML() {
    var tags = PARTS.map(function (p) {
      return '<span class="tag' + (isActive(p.id) ? '' : ' is-off') + '" style="left:' + p.tag[0] +
        '%;top:' + p.tag[1] + '%">' +
        '<i class="tag__dot" style="background:' + p.color + '"></i>' +
        '<span class="tag__name">' + esc(p.name) + '</span></span>';
    }).join('');

    var spots = PARTS.map(function (p) {
      return '<button class="spot" type="button" data-action="open-room" data-part="' + p.id + '" ' +
        'style="left:' + p.spot[0] + '%;top:' + p.spot[1] + '%;--c:' + p.color + '" ' +
        'aria-label="' + esc(p.room) + ' · ' + esc(p.name) + ' 열기"><span class="spot__ring"></span></button>';
    }).join('');

    return tags + spots + '<span class="bubble" id="mapBubble" hidden><span class="bubble__txt"></span></span>';
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
    $$('.spot').forEach(function (s) {
      s.classList.toggle('is-focus', s.getAttribute('data-part') === state.focus);
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
    syncBubble();
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

    window.addEventListener('resize', function () { autosize($('#todayLine')); });

    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && state.motion) placeBubble(state.focus, false);
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

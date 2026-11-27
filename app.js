/* =========================================================
   별이 비서실 — app logic (no dependencies, no build step)
   ========================================================= */
(function () {
  'use strict';

  var STORAGE_KEY = 'byeol-office-v1';
  var WEEK = ['일', '월', '화', '수', '목', '금', '토'];

  var PARTS = [
    { id: 'etc', room: '지휘실', name: '별이', role: '총괄 지휘 · 기타 잡무', task: '기타',
      color: '#7f9bff', deep: '#5f7ae6', soft: '#eef2ff', delay: 0, bubble: [58, 9] },
    { id: 'content', room: '콘텐츠 작업실', name: '몽글', role: '블로그 · 인스타', task: '콘텐츠',
      color: '#a291f7', deep: '#8674ea', soft: '#f1eeff', delay: 0.5, bubble: [59, 8] },
    { id: 'living', room: '생활·쇼핑실', name: '보들', role: '리뷰 · 예약', task: '생활·쇼핑',
      color: '#f9ab92', deep: '#ec957a', soft: '#fff0ea', delay: 1, bubble: [50, 8] },
    { id: 'schedule', room: '일정·메일방', name: '똑딱', role: '일정 · 메일', task: '일정·메일',
      color: '#74c6d2', deep: '#57aebb', soft: '#eaf8fa', delay: 1.5, bubble: [66, 8] }
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
      v: 1,
      nick: '대표님',
      motion: true,
      today: '오늘은 콘텐츠 두 편이랑 예약 확인 하나만 끝내면 돼요.',
      tab: 'map',
      parts: {
        etc: { status: '오늘 할 일 정리해 두었어요', active: true },
        content: { status: '새 글 초안 쓰는 중', active: true },
        living: { status: '리뷰 적립금 계산 중', active: true },
        schedule: { status: '내일 일정 확인 중', active: true }
      },
      agenda: [
        { id: 'a1', title: '블로그 글 발행 순서 정하기', done: false, at: now - 7200000 },
        { id: 'a2', title: '주간 메일 정리 요일 정하기', done: false, at: now - 5400000 },
        { id: 'a3', title: '리뷰 적립금 사용처 정하기', done: true, at: now - 86400000 }
      ],
      tasks: [
        { id: 't1', title: '인스타 카드뉴스 2편 초안 잡기', part: 'content', done: false, at: now - 3600000 },
        { id: 't2', title: '블로그 사진 정리하고 올리기', part: 'content', done: false, at: now - 3000000 },
        { id: 't3', title: '예약 확인 문자 보내기', part: 'living', done: false, at: now - 2400000 },
        { id: 't4', title: '이번 주 일정표 만들기', part: 'schedule', done: false, at: now - 1800000 },
        { id: 't5', title: '메모 백업 파일 정리하기', part: 'etc', done: true, at: now - 900000 }
      ],
      memo: '',
      updatedAt: now
    };
  }

  function readStored() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function normalize(raw) {
    var base = defaultState();
    if (!raw || typeof raw !== 'object') return base;

    if (typeof raw.nick === 'string' && raw.nick.trim()) base.nick = raw.nick.trim().slice(0, 12);
    if (typeof raw.today === 'string') base.today = raw.today.slice(0, 120);
    if (typeof raw.memo === 'string') base.memo = raw.memo.slice(0, 4000);
    base.motion = raw.motion !== false;
    if (['map', 'meeting', 'work', 'team', 'memo'].indexOf(raw.tab) >= 0) base.tab = raw.tab;

    if (raw.parts && typeof raw.parts === 'object') {
      PARTS.forEach(function (p) {
        var s = raw.parts[p.id];
        if (!s || typeof s !== 'object') return;
        if (typeof s.status === 'string') base.parts[p.id].status = s.status.slice(0, 40);
        if (typeof s.active === 'boolean') base.parts[p.id].active = s.active;
      });
    }

    var clean = function (list, fields) {
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
        if (fields.part) {
          row.part = PART_MAP[item.part] ? item.part : 'etc';
        }
        out.push(row);
      });
      return out;
    };

    if (Array.isArray(raw.agenda)) base.agenda = clean(raw.agenda, {});
    if (Array.isArray(raw.tasks)) base.tasks = clean(raw.tasks, { part: true });

    return base;
  }

  var state = normalize(readStored());
  if (!readStored() && window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    state.motion = false;
  }

  var ui = { filter: 'all', sheet: null };
  var saveTimer = null;
  var toastTimer = null;
  var closeTimer = null;
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

  function activeParts() {
    return PARTS.filter(function (p) { return state.parts[p.id].active; });
  }

  /* ---------------------------------------------------------
     office scenes (inline SVG, 200x150 or 400x150)
     --------------------------------------------------------- */

  function books(x, baseY, colors) {
    var out = '';
    var cx = x;
    colors.forEach(function (c, i) {
      var h = 12 + (i % 3) * 3;
      out += '<rect x="' + cx + '" y="' + (baseY - h) + '" width="6" height="' + h +
             '" rx="1.6" fill="' + c + '"/>';
      cx += 7.4;
    });
    return out;
  }

  function charSVG(partId, x, y) {
    var p = PART_MAP[partId] || PARTS[0];
    var c = p.color;
    var d = p.deep;
    var acc = '';

    if (partId === 'etc') {
      acc = '<path d="M0 -47.4l2.6 5.4 6 .9-4.4 4.2 1.1 6-5.3-2.8-5.3 2.8 1.1-6-4.4-4.2 6-.9z" ' +
            'fill="#ffd35c" stroke="#efb93c" stroke-width="1.1" stroke-linejoin="round"/>';
    } else if (partId === 'content') {
      acc = '<g transform="rotate(20 15 -30)">' +
              '<rect x="12.4" y="-45" width="5.4" height="15" rx="2.2" fill="#f7b955"/>' +
              '<rect x="12.4" y="-45" width="5.4" height="3.4" rx="1.7" fill="#ffd9a8"/>' +
              '<path d="M12.4 -30h5.4l-2.7 5.2z" fill="#e8a08c"/>' +
            '</g>';
    } else if (partId === 'living') {
      acc = '<path d="M0 -33.4c0-6.4 3.6-10 8.4-10.6 0 6.4-3.2 10-8.4 10.6z" fill="#8ed0a2"/>' +
            '<path d="M0 -33.4c0-6.4-3.6-10-8.4-10.6 0 6.4 3.2 10 8.4 10.6z" fill="#a8dfb8"/>' +
            '<path d="M0 -33.4v-6.4" stroke="#6cb884" stroke-width="1.3" stroke-linecap="round"/>';
    } else {
      acc = '<g>' +
              '<circle cx="0" cy="-45" r="6.2" fill="#fffdf8" stroke="' + d + '" stroke-width="1.6"/>' +
              '<path d="M0 -45v-3.2M0 -45l2.4 1.6" stroke="' + d + '" stroke-width="1.4" stroke-linecap="round"/>' +
              '<path d="M-5.6 -50.4l-2.2-2M5.6 -50.4l2.2-2" stroke="' + d + '" stroke-width="1.5" stroke-linecap="round"/>' +
            '</g>';
    }

    return '<g transform="translate(' + x + ',' + y + ')">' +
      '<ellipse cx="0" cy="1" rx="17" ry="3.4" fill="#000000" opacity=".07"/>' +
      '<g class="char" style="animation-delay:' + p.delay + 's">' +
        '<circle cx="-12.5" cy="-32" r="6.2" fill="' + d + '"/>' +
        '<circle cx="12.5" cy="-32" r="6.2" fill="' + d + '"/>' +
        '<rect x="-19" y="-35" width="38" height="36" rx="16" fill="' + c + '"/>' +
        '<ellipse cx="-11.2" cy="-16.6" rx="3.6" ry="2.2" fill="#ff9db1" opacity=".42"/>' +
        '<ellipse cx="11.2" cy="-16.6" rx="3.6" ry="2.2" fill="#ff9db1" opacity=".42"/>' +
        '<circle cx="-6" cy="-21" r="2.4" fill="#3f3a4d"/>' +
        '<circle cx="6" cy="-21" r="2.4" fill="#3f3a4d"/>' +
        '<circle cx="-5.2" cy="-21.9" r=".9" fill="#ffffff"/>' +
        '<circle cx="6.8" cy="-21.9" r=".9" fill="#ffffff"/>' +
        '<path d="M-4 -14.4q4 3.4 8 0" fill="none" stroke="#3f3a4d" stroke-width="1.5" stroke-linecap="round"/>' +
        acc +
      '</g>' +
    '</g>';
  }

  function charAvatar(partId) {
    return '<svg class="mini-char" viewBox="-26 -62 52 66" aria-hidden="true" focusable="false">' +
      charSVG(partId, 0, 0) + '</svg>';
  }

  function catAvatar() {
    return '<svg class="mini-char" viewBox="0 0 44 44" aria-hidden="true" focusable="false">' +
      '<ellipse cx="22" cy="30" rx="14" ry="10" fill="#f7c9a8"/>' +
      '<circle cx="22" cy="19" r="11" fill="#f7c9a8"/>' +
      '<path d="M12 12l-2-7 8 3z" fill="#f7c9a8"/>' +
      '<path d="M32 12l2-7-8 3z" fill="#f7c9a8"/>' +
      '<path d="M17 19q1.8 1.8 3.6 0M24.4 19q1.8 1.8 3.6 0" stroke="#c98f6c" stroke-width="1.6" fill="none" stroke-linecap="round"/>' +
      '<circle cx="22" cy="23.4" r="1.4" fill="#dd9a86"/>' +
      '<path d="M19.4 26q2.6 2 5.2 0" stroke="#c98f6c" stroke-width="1.3" fill="none" stroke-linecap="round"/>' +
      '<ellipse cx="13" cy="22" rx="2.4" ry="1.6" fill="#ff9db1" opacity=".4"/>' +
      '<ellipse cx="31" cy="22" rx="2.4" ry="1.6" fill="#ff9db1" opacity=".4"/>' +
    '</svg>';
  }

  function sceneChief() {
    return '<svg class="scene" viewBox="0 0 400 150" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false">' +
      '<rect width="400" height="150" fill="#f8f2e7"/>' +
      '<ellipse cx="200" cy="2" rx="250" ry="62" fill="#fffdf8" opacity=".55"/>' +
      '<rect y="70" width="400" height="80" fill="#efe1cb"/>' +
      '<rect y="67" width="400" height="3.5" fill="#e2d0b3"/>' +

      '<rect x="26" y="18" width="106" height="42" rx="7" fill="#d8e8ff"/>' +
      '<circle cx="111" cy="30" r="6.5" fill="#ffe28a"/>' +
      '<ellipse cx="52" cy="29" rx="13" ry="5" fill="#ffffff" opacity=".9"/>' +
      '<path d="M26 49Q48 39 70 46Q92 53 132 44L132 60L26 60Z" fill="#c2e0c6"/>' +
      '<path d="M79 18v42M26 39h106" stroke="#fffdf8" stroke-width="4"/>' +
      '<rect x="26" y="18" width="106" height="42" rx="7" fill="none" stroke="#fffdf8" stroke-width="5"/>' +

      '<rect x="296" y="38" width="84" height="5" rx="2.5" fill="#e6d2b2"/>' +
      books(302, 38, ['#f2b3a3', '#a8c7ea', '#f7d68e', '#b6dcbe', '#d3bce8', '#f2b3a3']) +

      '<ellipse cx="210" cy="141" rx="142" ry="13" fill="#f7ead5" opacity=".95"/>' +
      '<ellipse cx="210" cy="141" rx="118" ry="9" fill="none" stroke="#efdfc5" stroke-width="1.6"/>' +

      '<rect x="72.5" y="98" width="3" height="42" fill="#d9c7ad"/>' +
      '<path d="M60 98h28l-5-15h-18z" fill="#f8ddb0"/>' +
      '<ellipse cx="74" cy="140" rx="10" ry="3" fill="#d9c7ad"/>' +

      '<g>' +
        '<path d="M352 117h26l-4 20h-18z" fill="#e7aa7f"/>' +
        '<path d="M365 117c0-13-8-19-15-21 0 11 6 19 15 21z" fill="#8fcf9a"/>' +
        '<path d="M365 117c0-15 8-22 15-24 0 13-6 21-15 24z" fill="#a9ddb3"/>' +
        '<path d="M365 117v-15" stroke="#6cb884" stroke-width="1.6" stroke-linecap="round"/>' +
      '</g>' +

      '<rect x="150" y="74" width="60" height="34" rx="5" fill="#8d99b8"/>' +
      '<rect x="154" y="78" width="52" height="26" rx="3" fill="#dce9ff"/>' +
      '<path d="M160 98l8-6 6 3 9-9" fill="none" stroke="#7fa6e8" stroke-width="1.8" ' +
        'stroke-linecap="round" stroke-linejoin="round"/>' +

      charSVG('etc', 232, 116) +

      '<rect x="132" y="118" width="134" height="16" rx="3" fill="#f0cba2"/>' +
      '<rect x="176" y="122" width="46" height="8" rx="4" fill="#e3b88b"/>' +
      '<circle cx="199" cy="126" r="1.8" fill="#c99a6d"/>' +
      '<rect x="130" y="118" width="9" height="23" fill="#dcb182"/>' +
      '<rect x="268" y="118" width="9" height="23" fill="#dcb182"/>' +
      '<rect x="120" y="108" width="166" height="10" rx="5" fill="#e8bd8f"/>' +
      '<rect x="120" y="108" width="166" height="4" rx="2" fill="#f4d6b1"/>' +

      '<rect x="134" y="96" width="26" height="7" rx="2" fill="#fffdf8" stroke="#e9dfd0" stroke-width=".9"/>' +
      '<rect x="130" y="100" width="30" height="7" rx="2" fill="#fffdf8" stroke="#e9dfd0" stroke-width=".9"/>' +
      '<rect x="258" y="97" width="12" height="11" rx="3" fill="#fffdf8" stroke="#e2d6c6" stroke-width="1"/>' +
      '<path d="M270 100q5 0 5 3.5t-5 3.5" fill="none" stroke="#e2d6c6" stroke-width="1.2"/>' +
    '</svg>';
  }

  function sceneContent() {
    return '<svg class="scene" viewBox="0 0 200 150" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false">' +
      '<rect width="200" height="150" fill="#eef5ee"/>' +
      '<rect y="70" width="200" height="80" fill="#e2ebe1"/>' +
      '<rect y="67" width="200" height="3.5" fill="#d5e2d3"/>' +

      '<rect x="14" y="22" width="48" height="34" rx="5" fill="#d9eaff"/>' +
      '<circle cx="52" cy="33" r="5" fill="#ffe28a"/>' +
      '<path d="M14 45q12-6 22-1t26-3v15H14z" fill="#c6e4c8"/>' +
      '<path d="M38 22v34M14 39h48" stroke="#fffdf8" stroke-width="3"/>' +
      '<rect x="14" y="22" width="48" height="34" rx="5" fill="none" stroke="#fffdf8" stroke-width="4"/>' +

      '<rect x="104" y="14" width="24" height="18" rx="3" fill="#fffdf8" stroke="#e3d8c6" stroke-width="1.4"/>' +
      '<path d="M109 27l5-6 4 4 3-2" fill="none" stroke="#b9c8ea" stroke-width="1.4" stroke-linecap="round"/>' +
      '<rect x="132" y="18" width="22" height="16" rx="3" fill="#fffdf8" stroke="#e3d8c6" stroke-width="1.4"/>' +
      '<path d="M137 29h12M137 25h8" stroke="#e3b7a6" stroke-width="1.4" stroke-linecap="round"/>' +

      '<rect x="100" y="56" width="90" height="4" rx="2" fill="#dcd2c0"/>' +
      books(106, 56, ['#f2b3a3', '#a8c7ea', '#f7d68e', '#b6dcbe', '#d3bce8']) +

      '<ellipse cx="100" cy="142" rx="84" ry="10" fill="#f4eee2" opacity=".9"/>' +

      '<g>' +
        '<path d="M176 118h18l-3 16h-12z" fill="#e7aa7f"/>' +
        '<path d="M185 118c0-10-5-14-10-16 0 9 4 14 10 16z" fill="#8fcf9a"/>' +
        '<path d="M185 118c0-11 5-16 10-17 0 10-4 15-10 17z" fill="#a9ddb3"/>' +
      '</g>' +

      '<rect x="42" y="78" width="48" height="32" rx="4" fill="#8d99b8"/>' +
      '<rect x="46" y="82" width="40" height="24" rx="3" fill="#dce9ff"/>' +
      '<path d="M51 100l7-6 5 3 8-8" fill="none" stroke="#7fa6e8" stroke-width="1.7" ' +
        'stroke-linecap="round" stroke-linejoin="round"/>' +

      charSVG('content', 118, 116) +

      '<rect x="38" y="118" width="8" height="22" fill="#dcb182"/>' +
      '<rect x="152" y="118" width="8" height="22" fill="#dcb182"/>' +
      '<rect x="28" y="110" width="144" height="9" rx="4.5" fill="#e8bd8f"/>' +
      '<rect x="28" y="110" width="144" height="3.6" rx="1.8" fill="#f4d6b1"/>' +

      '<rect x="32" y="103" width="24" height="7" rx="2" fill="#fffdf8" stroke="#e9dfd0" stroke-width=".9"/>' +
      '<rect x="150" y="99" width="11" height="11" rx="3" fill="#fffdf8" stroke="#e2d6c6" stroke-width="1"/>' +
    '</svg>';
  }

  function sceneLiving() {
    return '<svg class="scene" viewBox="0 0 200 150" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false">' +
      '<rect width="200" height="150" fill="#fdf2ec"/>' +
      '<rect y="70" width="200" height="80" fill="#f7e4d7"/>' +
      '<rect y="67" width="200" height="3.5" fill="#eed6c6"/>' +

      '<rect x="16" y="46" width="70" height="4" rx="2" fill="#e3cfae"/>' +
      '<rect x="22" y="32" width="13" height="14" rx="4" fill="#ffe0d2" stroke="#f0c6b3" stroke-width="1.2"/>' +
      '<rect x="22" y="30" width="13" height="4" rx="2" fill="#e6a98f"/>' +
      '<rect x="41" y="28" width="12" height="18" rx="4" fill="#e2eefb" stroke="#c5d9ee" stroke-width="1.2"/>' +
      '<rect x="41" y="26" width="12" height="4" rx="2" fill="#9dbbdc"/>' +
      '<rect x="59" y="34" width="14" height="12" rx="4" fill="#f6ecc0" stroke="#e6d69a" stroke-width="1.2"/>' +
      '<rect x="59" y="32" width="14" height="4" rx="2" fill="#d9c277"/>' +

      '<rect x="126" y="40" width="56" height="5" rx="2.5" fill="#e3cfae"/>' +
      '<rect x="132" y="30" width="20" height="10" rx="3" fill="#dbe6f7"/>' +
      '<rect x="156" y="34" width="18" height="6" rx="2" fill="#f6d9c8"/>' +
      '<rect x="156" y="28" width="18" height="6" rx="2" fill="#e2efd8"/>' +

      '<ellipse cx="98" cy="142" rx="84" ry="10" fill="#fbf0e6" opacity=".95"/>' +

      '<g>' +
        '<path d="M172 119h18l-3 16h-12z" fill="#e7aa7f"/>' +
        '<path d="M181 119c0-10-5-14-10-16 0 9 4 14 10 16z" fill="#8fcf9a"/>' +
        '<path d="M181 119c0-11 5-16 10-17 0 10-4 15-10 17z" fill="#a9ddb3"/>' +
      '</g>' +

      '<path d="M12 122h22l-3 15H15z" fill="#e5c69d"/>' +
      '<path d="M17 122q6-8 12 0" fill="none" stroke="#cba97b" stroke-width="1.6"/>' +

      charSVG('living', 100, 116) +

      '<rect x="54" y="121" width="8" height="20" fill="#d8ac7c"/>' +
      '<rect x="142" y="121" width="8" height="20" fill="#d8ac7c"/>' +
      '<rect x="44" y="112" width="116" height="9" rx="4.5" fill="#e9c9a4"/>' +
      '<rect x="44" y="112" width="116" height="3.6" rx="1.8" fill="#f5dcbd"/>' +
      '<rect x="46" y="92" width="30" height="18" rx="2.5" fill="#f1cda9" stroke="#dfb488" stroke-width="1"/>' +
      '<rect x="58" y="92" width="6" height="18" fill="#e6bd94"/>' +
      '<path d="M124 92h26v18h-26z" fill="#ffd9a0"/>' +
      '<path d="M129 92q8-9 16 0" fill="none" stroke="#e0b070" stroke-width="1.8"/>' +
    '</svg>';
  }

  function sceneSchedule() {
    return '<svg class="scene" viewBox="0 0 200 150" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false">' +
      '<rect width="200" height="150" fill="#eef1fb"/>' +
      '<rect y="70" width="200" height="80" fill="#e2e6f4"/>' +
      '<rect y="67" width="200" height="3.5" fill="#d5dbf0"/>' +

      '<circle cx="34" cy="38" r="15" fill="#fffdf8" stroke="#ccd5f0" stroke-width="2"/>' +
      '<path d="M34 26v2M46 38h-2M34 50v-2M22 38h2" stroke="#c3cbe6" stroke-width="1.4" stroke-linecap="round"/>' +
      '<path d="M34 38V29.5M34 38l6 4" stroke="#7b8dc4" stroke-width="1.8" stroke-linecap="round"/>' +
      '<circle cx="34" cy="38" r="1.6" fill="#7b8dc4"/>' +

      '<rect x="114" y="14" width="70" height="48" rx="6" fill="#fffdf8" stroke="#d9dfef" stroke-width="1.4"/>' +
      '<path d="M114 20a6 6 0 0 1 6-6h58a6 6 0 0 1 6 6v8h-70z" fill="#c9d4f2"/>' +
      '<path d="M129 14v5M169 14v5" stroke="#8b9dd6" stroke-width="2" stroke-linecap="round"/>' +
      '<g fill="#dde3f3">' +
        '<rect x="122" y="32" width="6" height="5" rx="1.4"/>' +
        '<rect x="134" y="32" width="6" height="5" rx="1.4"/>' +
        '<rect x="146" y="32" width="6" height="5" rx="1.4"/>' +
        '<rect x="158" y="32" width="6" height="5" rx="1.4"/>' +
        '<rect x="170" y="32" width="6" height="5" rx="1.4"/>' +
        '<rect x="122" y="42" width="6" height="5" rx="1.4"/>' +
        '<rect x="134" y="42" width="6" height="5" rx="1.4"/>' +
        '<rect x="146" y="42" width="6" height="5" rx="1.4"/>' +
        '<rect x="158" y="42" width="6" height="5" rx="1.4"/>' +
        '<rect x="170" y="42" width="6" height="5" rx="1.4"/>' +
        '<rect x="122" y="52" width="6" height="5" rx="1.4"/>' +
        '<rect x="158" y="52" width="6" height="5" rx="1.4"/>' +
      '</g>' +
      '<circle cx="149" cy="44.5" r="3.4" fill="#f7a98f"/>' +

      '<g>' +
        '<path d="M12 120h16l-3 15h-10z" fill="#e7aa7f"/>' +
        '<path d="M20 120c0-9-4-13-9-15 0 8 3 13 9 15z" fill="#8fcf9a"/>' +
        '<path d="M20 120c0-10 5-15 9-16 0 9-4 14-9 16z" fill="#a9ddb3"/>' +
      '</g>' +

      '<rect x="38" y="80" width="42" height="26" rx="3" fill="#8fa2cf"/>' +
      '<rect x="41" y="83" width="36" height="20" rx="2" fill="#e7edff"/>' +
      '<path d="M46 97l7-5 5 3 8-7" fill="none" stroke="#93a9d8" stroke-width="1.6" ' +
        'stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M36 106h46l3 6H33z" fill="#cdd6ee"/>' +

      charSVG('schedule', 132, 116) +

      '<rect x="32" y="118" width="8" height="22" fill="#dcb182"/>' +
      '<rect x="164" y="118" width="8" height="22" fill="#dcb182"/>' +
      '<rect x="30" y="110" width="142" height="9" rx="4.5" fill="#e8bd8f"/>' +
      '<rect x="30" y="110" width="142" height="3.6" rx="1.8" fill="#f4d6b1"/>' +

      '<rect x="90" y="96" width="21" height="6" rx="1.4" fill="#fdf7ea" stroke="#e6ddc9" stroke-width=".9"/>' +
      '<rect x="88" y="101" width="23" height="8" rx="1.4" fill="#fffdf8" stroke="#e2d9c8" stroke-width=".9"/>' +
    '</svg>';
  }

  function sceneLounge() {
    return '<svg class="scene" viewBox="0 0 200 150" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false">' +
      '<rect width="200" height="150" fill="#f9f3ea"/>' +
      '<rect y="70" width="200" height="80" fill="#f1e6d6"/>' +
      '<rect y="67" width="200" height="3.5" fill="#e8d9c4"/>' +

      '<rect x="18" y="16" width="44" height="32" rx="4" fill="#fffdf8" stroke="#e6d9c6" stroke-width="2"/>' +
      '<path d="M26 40q8-13 16-5t14 0" fill="none" stroke="#b9c8ea" stroke-width="2.4" stroke-linecap="round"/>' +
      '<circle cx="52" cy="24" r="4" fill="#f6cf9d"/>' +

      '<rect x="112" y="20" width="64" height="34" rx="4" fill="#fffdf8" stroke="#e0d6c6" stroke-width="1.6"/>' +
      '<path d="M120 32h20M120 40h30" stroke="#cfd9ee" stroke-width="2" stroke-linecap="round"/>' +
      '<rect x="152" y="28" width="12" height="12" rx="2" fill="#ffe1a8"/>' +

      '<ellipse cx="104" cy="142" rx="86" ry="9" fill="#faf0e2"/>' +

      '<g>' +
        '<path d="M176 116h20l-3 20h-14z" fill="#e7aa7f"/>' +
        '<path d="M186 116c0-11-6-16-12-18 0 9 5 16 12 18z" fill="#8fcf9a"/>' +
        '<path d="M186 116c0-12 6-18 12-19 0 11-5 17-12 19z" fill="#a9ddb3"/>' +
      '</g>' +

      '<rect x="20" y="80" width="92" height="28" rx="11" fill="#c8d6f0"/>' +
      '<rect x="28" y="86" width="36" height="22" rx="8" fill="#dde7fa"/>' +
      '<rect x="68" y="86" width="36" height="22" rx="8" fill="#e8eefb"/>' +
      '<rect x="14" y="104" width="104" height="21" rx="9" fill="#d5e0f6"/>' +
      '<rect x="6" y="96" width="18" height="30" rx="9" fill="#c8d6f0"/>' +
      '<rect x="106" y="96" width="18" height="30" rx="9" fill="#c8d6f0"/>' +
      '<rect x="20" y="125" width="5" height="8" fill="#cbaa83"/>' +
      '<rect x="104" y="125" width="5" height="8" fill="#cbaa83"/>' +

      '<ellipse cx="86" cy="102" rx="13" ry="7" fill="#f7c9a8"/>' +
      '<path d="M74 104q-7 2-4 8" stroke="#efb991" stroke-width="2.8" fill="none" stroke-linecap="round"/>' +
      '<circle cx="97" cy="96" r="6.6" fill="#f7c9a8"/>' +
      '<path d="M92.5 90.5l-2-5.4 5.4 2.6z" fill="#f7c9a8"/>' +
      '<path d="M101 90.5l2-5.4-5.4 2.6z" fill="#f7c9a8"/>' +
      '<path d="M94 96q1.4 1.4 2.8 0M99.6 96q1.4 1.4 2.8 0" stroke="#c98f6c" ' +
        'stroke-width="1.2" fill="none" stroke-linecap="round"/>' +
      '<circle cx="98.4" cy="99.4" r="1" fill="#d98f7a"/>' +
      '<ellipse cx="91.4" cy="99" rx="1.8" ry="1.1" fill="#ff9db1" opacity=".4"/>' +

      '<rect x="128" y="114" width="56" height="7" rx="3.5" fill="#e7c39c"/>' +
      '<rect x="134" y="121" width="4" height="15" fill="#d8b189"/>' +
      '<rect x="172" y="121" width="4" height="15" fill="#d8b189"/>' +
      '<rect x="146" y="104" width="10" height="10" rx="2" fill="#fffdf8" stroke="#e2d6c6" stroke-width="1"/>' +
      '<rect x="160" y="107" width="18" height="6" rx="1.5" fill="#cfe0d2"/>' +
    '</svg>';
  }

  var SCENES = {
    etc: sceneChief,
    content: sceneContent,
    living: sceneLiving,
    schedule: sceneSchedule,
    lounge: sceneLounge
  };

  /* ---------------------------------------------------------
     renderers
     --------------------------------------------------------- */

  function renderHeader() {
    var act = activeParts().length;
    var txt = act ? act + '개 파트 가동 중' : '모든 파트 휴식 중';
    $('#brandSub').textContent = txt;
    $('#todayBadge').textContent = txt;
    $('#liveDot').classList.toggle('is-off', act === 0);

    var openAgenda = state.agenda.filter(function (a) { return !a.done; }).length;
    $('#meetingDot').hidden = openAgenda === 0;

    var d = new Date();
    $('#brandDate').textContent = (d.getMonth() + 1) + '.' + d.getDate() + ' ' + WEEK[d.getDay()];

    $('#todayEyebrow').innerHTML = '<b class="eyebrow__nick">' + esc(state.nick || '대표님') +
      '</b> · ' + esc(greeting());

    var openTasks = state.tasks.filter(function (t) { return !t.done; }).length;
    $('#todayStats').textContent = '할 일 ' + openTasks + ' · 안건 ' + openAgenda;
  }

  function roomHTML(part) {
    var p = PART_MAP[part.id];
    var st = state.parts[p.id];
    var active = st.active !== false;
    var count = tasksOf(p.id, false).length;
    var bubble = '';
    if (active && state.motion) {
      bubble = '<span class="bubble" style="left:' + p.bubble[0] + '%;top:' + p.bubble[1] + '%">' +
        '<span class="bubble__txt">' + esc(statusOf(p.id)) + '</span></span>';
    }
    var meta = active ? (count ? p.name + ' · ' + count + '건' : p.name + ' · 여유')
                      : p.name + ' · 휴식';
    return '<button class="room" type="button" data-action="open-room" data-part="' + p.id + '" ' +
      'style="--c:' + p.color + '" aria-label="' + p.room + ' 열기">' +
      '<span class="room__scene' + (active ? '' : ' is-resting') + '">' + SCENES[p.id]() + bubble + '</span>' +
      '<span class="room__foot">' +
        '<span class="room__dot"></span>' +
        '<span class="room__name">' + p.room + '</span>' +
        '<span class="room__count">' + esc(meta) + '</span>' +
      '</span></button>';
  }

  function loungeHTML() {
    var open = state.agenda.filter(function (a) { return !a.done; }).length;
    return '<button class="room" type="button" data-action="open-room" data-part="lounge" ' +
      'style="--c:#b9c8ea" aria-label="회의실 라운지 열기">' +
      '<span class="room__scene">' + sceneLounge() + '</span>' +
      '<span class="room__foot">' +
        '<span class="room__dot"></span>' +
        '<span class="room__name">회의실 · 라운지</span>' +
        '<span class="room__count">' + (open ? '안건 ' + open + '건' : '한가해요') + '</span>' +
      '</span></button>';
  }

  function renderMap() {
    var html = '';
    html += '<button class="room room--wide" type="button" data-action="open-room" data-part="etc" ' +
      'style="--c:' + PART_MAP.etc.color + '" aria-label="지휘실 열기">' +
      '<span class="room__scene' + (state.parts.etc.active ? '' : ' is-resting') + '">' +
        sceneChief() +
        (state.parts.etc.active && state.motion
          ? '<span class="bubble" style="left:' + PART_MAP.etc.bubble[0] + '%;top:' + PART_MAP.etc.bubble[1] +
            '%"><span class="bubble__txt">' + esc(statusOf('etc')) + '</span></span>'
          : '') +
      '</span>' +
      '<span class="room__foot">' +
        '<span class="room__dot"></span><span class="room__name">지휘실</span>' +
        '<span class="room__count">' + esc(roomMeta('etc')) + '</span>' +
      '</span></button>';

    html += roomHTML(PART_MAP.content);
    html += roomHTML(PART_MAP.living);
    html += roomHTML(PART_MAP.schedule);
    html += loungeHTML();

    $('#mapGrid').innerHTML = html;
  }

  function roomMeta(id) {
    var p = PART_MAP[id];
    var st = state.parts[id];
    if (st.active === false) return p.name + ' · 휴식';
    var n = tasksOf(id, false).length;
    return n ? p.name + ' · ' + n + '건' : p.name + ' · 여유';
  }

  function taskItemHTML(t) {
    var p = PART_MAP[t.part] || PARTS[0];
    return '<li class="item' + (t.done ? ' item--done' : '') + '">' +
      '<button class="check" type="button" role="checkbox" aria-checked="' + (t.done ? 'true' : 'false') +
        '" data-action="toggle-task" data-id="' + t.id + '" aria-label="완료 표시"></button>' +
      '<div class="item__body">' +
        '<p class="item__title">' + esc(t.title) + '</p>' +
        '<p class="item__meta"><span class="tag" style="background:' + p.soft + ';color:' + p.deep + '">' +
          p.task + '</span>' + shortDate(t.at) + '</p>' +
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
        'data-action="filter" data-filter="' + f.id + '">' + f.label + '<small>' + n + '</small></button>';
    }).join('');
  }

  function agentHTML(p) {
    var st = state.parts[p.id];
    var n = tasksOf(p.id, false).length;
    return '<article class="agent' + (st.active ? '' : ' is-off') + '" style="--c:' + p.color +
      ';--soft:' + p.soft + '">' +
      '<div class="agent__top">' +
        '<div class="agent__avatar">' + charAvatar(p.id) + '</div>' +
        '<div class="agent__id">' +
          '<h3 class="agent__name">' + p.name + '</h3>' +
          '<p class="agent__role">' + p.room + ' · ' + p.role + '</p>' +
        '</div>' +
        '<button class="switch" type="button" data-action="toggle-active" data-part="' + p.id + '" ' +
          'aria-pressed="' + (st.active ? 'true' : 'false') + '" aria-label="' + p.name + ' 가동"></button>' +
      '</div>' +
      '<input class="agent__status" data-status="' + p.id + '" maxlength="40" value="' + esc(st.status) +
        '" aria-label="' + p.name + ' 상태 문구">' +
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
    renderAgenda();
    renderTasks();
    renderTeam();
    renderSettings();
  }

  /* ---------------------------------------------------------
     speech bubbles sync (while typing a status)
     --------------------------------------------------------- */

  function syncBubbles() {
    $$('.room[data-part]').forEach(function (room) {
      var id = room.getAttribute('data-part');
      if (!id || id === 'lounge' || !PART_MAP[id]) return;
      var b = room.querySelector('.bubble__txt');
      if (b) b.textContent = statusOf(id);
      var c = room.querySelector('.room__count');
      if (c) c.textContent = roomMeta(id);
    });
  }

  /* ---------------------------------------------------------
     sheet
     --------------------------------------------------------- */

  function openRoom(id) {
    ui.sheet = { type: id === 'lounge' ? 'lounge' : 'part', id: id };
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

    if (target.type === 'lounge') {
      var open = state.agenda.filter(function (a) { return !a.done; });
      head.innerHTML = '<div class="sheet__avatar" style="background:#eef2fb">' + catAvatar() + '</div>' +
        '<div class="sheet__id"><h3 class="sheet__title" id="sheetTitle">회의실 · 라운지</h3>' +
        '<p class="sheet__sub">소파에서 잠깐 쉬는 중이에요</p></div>';
      body.innerHTML = '<p class="field__label">결정을 기다리는 안건 ' + open.length + '건</p>' +
        (open.length
          ? '<ul class="mini-list">' + open.slice(0, 4).map(function (a) {
              return '<li>' + esc(a.title) + '</li>';
            }).join('') + '</ul>'
          : '<p class="field__hint">지금은 비어 있어요. 아주 평화롭네요.</p>') +
        '<button class="btn btn--ghost btn--full" type="button" data-action="go-meeting">회의실 열기</button>';
      return;
    }

    var p = PART_MAP[target.id];
    if (!p) return;
    var st = state.parts[p.id];
    var list = tasksOf(p.id, true).sort(sortTask);
    var openN = list.filter(function (t) { return !t.done; }).length;

    head.innerHTML = '<div class="sheet__avatar" style="background:' + p.soft + '">' + charAvatar(p.id) + '</div>' +
      '<div class="sheet__id"><h3 class="sheet__title" id="sheetTitle">' + p.name + '</h3>' +
      '<p class="sheet__sub">' + p.room + ' · ' + p.role + '</p></div>' +
      '<button class="switch" type="button" data-action="toggle-active" data-part="' + p.id + '" ' +
        'aria-pressed="' + (st.active ? 'true' : 'false') + '" aria-label="' + p.name + ' 가동"></button>';

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
        '<input class="input" maxlength="80" placeholder="' + p.name + '에게 할 일 맡기기" aria-label="할 일 추가">' +
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
    renderMap();
  }

  function addTask(partId, title) {
    var text = (title || '').trim();
    if (!text) { toast('할 일을 먼저 적어 주세요'); return; }
    if (!PART_MAP[partId]) partId = 'etc';
    state.tasks.unshift({ id: uid(), title: text.slice(0, 80), part: partId, done: false, at: Date.now() });
    save();
    renderMap();
    renderTasks();
    renderTeam();
    renderHeader();
    if (ui.sheet && ui.sheet.type === 'part') {
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
    renderMap();
    renderTasks();
    renderTeam();
    renderHeader();
    if (ui.sheet && ui.sheet.type === 'part') renderSheet();
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
    renderMap();
    renderTasks();
    renderTeam();
    renderHeader();
    if (ui.sheet && ui.sheet.type === 'part') renderSheet();
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
      toast(state.motion ? '움직임을 켰어요' : '움직임을 껐어요');
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
        case 'go-meeting':
          closeSheet();
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
      syncBubbles();
      saveSoon();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && ui.sheet) closeSheet();
    });

    window.addEventListener('resize', function () { autosize($('#todayLine')); });

    window.addEventListener('beforeunload', function () {
      window.clearTimeout(saveTimer);
      save();
    });
  }

  /* ---------------------------------------------------------
     init
     --------------------------------------------------------- */

  function init() {
    // part picker options (콘텐츠 → 생활·쇼핑 → 일정·메일 → 기타)
    $('#taskPart').innerHTML = [PART_MAP.content, PART_MAP.living, PART_MAP.schedule, PART_MAP.etc]
      .map(function (p) {
        return '<option value="' + p.id + '">' + p.task + '</option>';
      }).join('');
    $('#taskPart').value = 'content';

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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

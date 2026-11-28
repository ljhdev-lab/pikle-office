/* =========================================================
   별이 비서실 — app logic (no dependencies, no build step)
   4인 체제: 별이(총괄) · GPT(콘텐츠·기획) · 클로드(조사·분석) · 제미나이(디자인·검수)
   ========================================================= */
(function () {
  'use strict';

  var STORAGE_KEY = 'byeol-office-v2';
  var LEGACY_KEY = 'byeol-office-v1';
  var WEEK = ['일', '월', '화', '수', '목', '금', '토'];

  /* 좌표는 assets/office-map-v5.webp (864×1152, 3:4) 안의 위치를 % 로 적은 값.
     home 은 캐릭터 **발바닥 중앙**, tag·bubble 은 머리 위 라벨/말풍선 기준점이다.
     w 는 무대 가로 대비 캐릭터 폭. seat 은 회의실에서 앉는 자리 키다.
     meet 은 회의실에 앉았을 때 말풍선이 설 자리 [x%, y%, 꼬리방향] — 좌석이
     가까워 머리 위에 그대로 두면 넷이 겹치므로, 좌석 바깥(위·왼쪽·오른쪽)으로 뻗는다.
     이미지를 바꾸면 이 값만 다시 맞추면 된다. */
  var PARTS = [
    { id: 'byeol', room: '총괄 지휘실', name: '별이', role: '비서실장 · 총괄 지휘', task: '총괄',
      color: '#6790d0', deep: '#4a68a6', soft: '#eaf1fb',
      home: [47.5, 42.2], seat: 'L1', w: 17.0, tag: [47.5, 27.8], bubble: [47.5, 25.4], tail: 'down', delay: 0,
      meet: [25, 44, 'down'],
      paces: [[43.2, 43.2], [52.4, 43.4]], emoji: ['🗂', '✨', '☕'],
      persona: '당차고 야무진 주디 홉스 스타일 — 오늘 할 일부터 챙기는 비서실장',
      moods: [
        { e: 'hype', t: '오늘도 야무지게!' },
        { e: 'sigh', t: '후우… 일정이 산더미' },
        { e: 'idea', t: '오, 이거 괜찮은데?' },
        { e: 'proud', t: '대표님, 믿고 맡겨요' },
        { e: 'tired', t: '밤에도 열일 중 ✨' },
        { e: 'focus', t: '하나씩 정리하면 돼요' },
        { e: 'coffee', t: '잠깐 커피 한 모금' },
        { e: 'worry', t: '이건 여쭐까요?' },
        { e: 'relief', t: '좋아, 이건 끝!' },
        { e: 'catch', t: '여기 하나 빠졌어요' }
      ] },
    { id: 'gpt', room: '콘텐츠·기획실', name: 'GPT', role: '콘텐츠 · 기획', task: '콘텐츠·기획',
      color: '#52b394', deep: '#2f8a6e', soft: '#e6f7f0',
      home: [20.4, 60.2], seat: 'L2', w: 15.4, tag: [20.4, 46.6], bubble: [20.4, 43.9], tail: 'down', delay: 0.6,
      meet: [31, 76.2, 'up'],
      paces: [[24.6, 62.8], [15.8, 62.4]], emoji: ['💡', '✍', '✨'],
      persona: '아이디어가 샘솟는 텐션 높은 기획자 · 숫자로 기획안을 다듬는 열정 만렙',
      moods: [
        { e: 'idea', t: '이거다! 대박 아이디어!' },
        { e: 'worry', t: '음… 이건 좀 더 보자' },
        { e: 'focus', t: '기획안 뽑아내는 중!' },
        { e: 'sigh', t: '아… 수정 또 수정…' },
        { e: 'coffee', t: '커피 없인 못 살아' },
        { e: 'focus', t: '숫자는 거짓말 안 해!' },
        { e: 'tired', t: '머리가 안 돌아가…' },
        { e: 'hype', t: '잠깐만요! 해결 중!' },
        { e: 'proud', t: '역시 내 기획이 최고!' },
        { e: 'tired', t: '오늘도 야근 각인가…' }
      ] },
    { id: 'claude', room: '조사·분석실', name: '클로드', role: '조사 · 분석 · 문서', task: '조사·분석',
      color: '#e27f5f', deep: '#b25a3a', soft: '#fdeee7',
      home: [76.6, 60.2], seat: 'R1', w: 15.0, tag: [76.6, 46.8], bubble: [76.6, 44.1], tail: 'down', delay: 1.2,
      meet: [72, 44, 'down'],
      paces: [[71.8, 62.8], [81.4, 62.4]], emoji: ['🔎', '📄', '🧩'],
      persona: '차분하고 꼼꼼한 분석가 · 근거 없으면 작게 한숨 쉬고 끝까지 확인',
      moods: [
        { e: 'sigh', t: '휴, 출처가 없네요' },
        { e: 'focus', t: '잠시만요, 대조 중' },
        { e: 'hype', t: '검수는 제게 맡겨요' },
        { e: 'worry', t: '음… 이 숫자 맞나요?' },
        { e: 'catch', t: '어, 오타 찾았어요' },
        { e: 'alarm', t: '원문이랑 다른데요?!' },
        { e: 'tired', t: '표가 두 겹으로 보여…' },
        { e: 'focus', t: '한 번만 더 볼게요' },
        { e: 'proud', t: '팩트체크 통과예요' },
        { e: 'relief', t: '근거 확실, 좋아요' }
      ] },
    { id: 'gemini', room: '디자인·검수실', name: '제미나이', role: '디자인 · 검수 · 이미지', task: '디자인·검수',
      color: '#6f8fe0', deep: '#5a6bb8', soft: '#eef1fb',
      dot: 'conic-gradient(from 210deg, #ea4335, #fbbc04, #34a853, #4285f4, #ea4335)',
      home: [18.6, 88.4], seat: 'R2', w: 15.0, tag: [18.6, 74.8], bubble: [18.6, 72.1], tail: 'down', delay: 1.8,
      meet: [69, 76.2, 'up'],
      paces: [[24.8, 90.6], [12.2, 90.2]], emoji: ['🎨', '🖼', '✨'],
      persona: '1px도 놓치지 않는 감각적인 아트 디렉터 겸 깐깐한 최종 검수자',
      moods: [
        { e: 'idea', t: '오, 이 무드 딱인데?' },
        { e: 'focus', t: '1픽셀까지 혼 갈아넣는 중' },
        { e: 'eyes', t: '내 눈… 블루라이트 과다…' },
        { e: 'sigh', t: '폰트 자간이 왜 이래' },
        { e: 'catch', t: '여기 오타 하나 숨었네?' },
        { e: 'focus', t: '건드리지 마, 감 잡았어' },
        { e: 'idea', t: '요즘 이 컬러가 대세지~' },
        { e: 'proud', t: '완벽해, 역시 내 안목!' },
        { e: 'proud', t: '이 퀄리티면 무조건 통과!' }
      ] }
  ];
  var PART_MAP = {};
  PARTS.forEach(function (p) { PART_MAP[p.id] = p; });

  /* 회의실 — v5 배경 가운데 유리 파티션 안의 좌석 4곳과, 각자 책상 앞에서
     그 좌석까지 걷는 경유점(발바닥 좌표 %). 가구와 유리벽을 뚫지 않도록
     통로를 따라 꺾어 가고, 마지막에 자기 좌석으로 붙는다. */
  var ROOM = {
    seats: {
      L1: [36.6, 58.4],   // 왼쪽 먼 자리 (별이)
      R1: [59.6, 57.8],   // 오른쪽 먼 자리 (클로드)
      L2: [40.6, 66.2],   // 왼쪽 가까운 자리 (GPT)
      R2: [61.0, 65.6]    // 오른쪽 가까운 자리 (제미나이)
    },
    /* home → 회의실 입구까지. 넷이 서로 다른 입구(왼쪽·왼앞·오른쪽·아래)로 들어간다. */
    route: {
      byeol: [[47.5, 42.2], [41.0, 45.0], [33.0, 49.0], [27.2, 53.0], [31.8, 56.6]],
      gpt: [[20.4, 60.2], [24.2, 63.6], [29.0, 65.4], [33.6, 66.4], [36.4, 69.0]],
      claude: [[76.6, 60.2], [75.6, 55.4], [74.0, 52.8], [69.4, 54.2], [64.6, 55.8]],
      gemini: [[18.6, 88.4], [26.6, 90.4], [35.6, 89.4], [44.0, 88.2],
        [48.6, 83.4], [50.8, 79.2], [52.4, 72.6], [56.0, 69.6], [59.0, 67.4]]
    }
  };

  /* 감정 말풍선 — 감정마다 작은 아이콘과 파스텔 톤을 하나씩.
     e 는 moods 의 감정 키, cls 는 CSS 톤 클래스 접미사다. */
  var EMOTIONS = {
    idea:   { icon: '💡', cls: 'idea' },
    worry:  { icon: '🤔', cls: 'worry' },
    focus:  { icon: '🎯', cls: 'focus' },
    hype:   { icon: '🔥', cls: 'hype' },
    sigh:   { icon: '😮‍💨', cls: 'sigh' },
    coffee: { icon: '☕', cls: 'coffee' },
    tired:  { icon: '🫠', cls: 'tired' },
    proud:  { icon: '✨', cls: 'proud' },
    eyes:   { icon: '😵‍💫', cls: 'eyes' },
    catch:  { icon: '🔍', cls: 'catch' },
    alarm:  { icon: '😲', cls: 'alarm' },
    relief: { icon: '😌', cls: 'relief' }
  };

  var FILTERS = [{ id: 'all', label: '전체' }].concat(PARTS.map(function (p) {
    return { id: p.id, label: p.task };
  }));

  /* 사용 가이드 — 평소에는 숨겨 두고 헤더의 ? 를 누를 때만 연다.
     core 는 한 줄 요약, steps 는 바로 따라 하는 세 단계, routine 은 언제
     쓰면 좋은지, note 는 실제 동작 중 알아 두면 좋은 것 하나.
     문구는 ChatGPT·클로드·제미나이 3사 협의안을 다듬은 것이다. */
  var GUIDE_ORDER = ['map', 'meeting', 'work', 'team', 'memo'];

  var GUIDE = {
    map: {
      title: '오피스 맵',
      core: '네 사람의 지금 상태를 한눈에 봐요.',
      steps: [
        '오늘의 한마디를 적으면 바로 저장돼요.',
        '파티 칸에서 남은 일감과 게이지를 봐요.',
        '칸이나 캐릭터를 누르면 그 비서 방이 열려요.'
      ],
      routine: '아침에 한마디를 남기고 남은 일감을 확인해요.',
      note: '회의 소집은 모션이 켜져 있을 때 장면이 보이고, 시간·날씨 칩은 미리보기예요.'
    },
    meeting: {
      title: '회의실',
      core: '결정할 일을 안건으로 모아 둬요.',
      steps: [
        '결정이 필요한 일을 안건으로 추가해요.',
        '결정이 끝난 안건은 완료로 체크해요.',
        '더 필요 없는 안건은 삭제해요.'
      ],
      routine: '하루를 마칠 때 완료한 안건부터 체크해요.',
      note: '모션이 켜져 있으면 안건을 추가할 때 모이고, 완료하면 흩어져요.'
    },
    work: {
      title: '작업실',
      core: '할 일을 담당별로 나눠 굴러가게 해요.',
      steps: [
        '담당을 고르고 할 일을 추가해요.',
        '담당 칩으로 필요한 일만 골라 봐요.',
        '끝나면 완료, 필요 없으면 삭제해요.'
      ],
      routine: '아침에 할 일을 넣고 저녁에 진행률을 봐요.',
      note: '모션이 켜져 있으면 할 일을 추가할 때 네 사람이 회의실로 모여요.'
    },
    team: {
      title: '비서현황',
      core: '비서별 상태와 가동을 정리해요.',
      steps: [
        '카드에 한 줄 상태를 적어 둬요.',
        '쉬게 할 비서는 가동 스위치를 꺼요.',
        '[할 일 보기]로 맡은 일을 확인해요.'
      ],
      routine: '하루를 시작할 때 가동 여부와 진행 건수를 봐요.',
      note: '휴식 중인 비서는 말풍선과 모션에서 빠져요.'
    },
    memo: {
      title: '메모·백업',
      core: '메모를 남기고 데이터를 지켜요.',
      steps: [
        '메모는 쓰는 대로 자동 저장돼요.',
        'JSON 내보내기로 파일을 받아 둬요.',
        '복원할 땐 JSON을 불러와요.'
      ],
      routine: '주 1회, 그리고 초기화 전에 내보내 두세요.',
      note: '호칭을 바꾸면 첫 인사말에 바로 반영돼요.'
    }
  };

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
  var bubbleTimers = {};
  var bubbleTurn = {};
  var bubbleEls = {};
  var lastMood = {};
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
     감정 말풍선 — 지금 모션 상태(걷기·타이핑)·시간대·날씨·일감에
     어울리는 대사를 가중치로 골라 낸다. 같은 대사가 연달아 나오지 않게
     직전 선택은 무게를 크게 줄인다.
     --------------------------------------------------------- */

  function moodContext(id) {
    var el = spriteEls[id];
    return {
      phase: phaseOf(baseHour()),
      weather: weatherKind(),
      walking: !!(el && el.classList.contains('is-walk')),
      typing: !!(el && el.classList.contains('is-typing')),
      busy: tasksOf(id, false).length > 0
    };
  }

  function moodWeight(m, c) {
    var e = m.e;
    var w = 1;
    if (c.phase === 'night') {
      if (e === 'tired' || e === 'coffee') w += 2.6;
      else if (e === 'sigh' || e === 'relief') w += 1.8;
    } else if (c.phase === 'sunset') {
      if (e === 'sigh' || e === 'tired' || e === 'coffee') w += 1.6;
      else if (e === 'proud' || e === 'relief') w += 1.0;
    } else if (c.phase === 'dawn') {
      if (e === 'hype' || e === 'idea') w += 2.0;
      else if (e === 'focus' || e === 'coffee') w += 1.2;
    } else if (e === 'focus' || e === 'idea' || e === 'catch') {
      w += 0.8;
    }
    if (c.weather === 'rain') {
      if (e === 'sigh' || e === 'coffee' || e === 'tired' || e === 'relief') w += 1.4;
    } else if (c.weather === 'snow') {
      if (e === 'eyes' || e === 'worry' || e === 'coffee' || e === 'relief') w += 1.2;
    }
    if (c.walking && (e === 'hype' || e === 'coffee' || e === 'idea')) w += 1.1;
    if (c.typing && (e === 'focus' || e === 'hype' || e === 'sigh' || e === 'catch')) w += 1.3;
    if (c.busy && (e === 'focus' || e === 'tired' || e === 'worry')) w += 0.9;
    if (!c.busy && (e === 'relief' || e === 'proud' || e === 'coffee')) w += 0.7;
    return w;
  }

  /* want — 우선 고를 감정 키 목록(예: 할 일을 끝냈을 때 ['proud','relief']). */
  function pickMood(partId, want) {
    var p = PART_MAP[partId];
    if (!p || !p.moods || !p.moods.length) return null;
    var pool = p.moods;
    if (want && want.length) {
      var hit = pool.filter(function (m) { return want.indexOf(m.e) >= 0; });
      if (hit.length) pool = hit;
    }
    var c = moodContext(partId);
    var prev = lastMood[partId];
    var rows = pool.map(function (m) {
      var w = moodWeight(m, c);
      if (prev && prev.t === m.t) w *= 0.12;
      return { m: m, w: w };
    });
    var total = rows.reduce(function (a, r) { return a + r.w; }, 0);
    var r = Math.random() * total;
    for (var i = 0; i < rows.length; i += 1) {
      r -= rows[i].w;
      if (r <= 0) { lastMood[partId] = rows[i].m; return rows[i].m; }
    }
    lastMood[partId] = rows[rows.length - 1].m;
    return rows[rows.length - 1].m;
  }

  /* 할 일을 마쳤을 때처럼 특정 감정을 골라 머리 위에 잠깐 띄운다.
     그 캐릭터의 말풍선만 바뀎고, 다른 캐릭터의 말풍선은 그대로 둔다. */
  function showMood(partId, want) {
    if (!state.motion || document.hidden || ui.sheet || inMeeting()) return;
    if (!PART_MAP[partId] || !isActive(partId)) return;
    var mood = pickMood(partId, want);
    if (!mood) return;
    placeBubble(partId, true, mood);
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
      return '<span class="tag' + (isActive(p.id) ? '' : ' is-off') + '" data-part="' + p.id +
        '" style="left:' + p.tag[0] +
        '%;top:' + p.tag[1] + '%">' +
        '<i class="tag__dot" style="background:' + (p.dot || p.color) + '"></i>' +
        '<span class="tag__name">' + esc(p.name) + '</span></span>';
    }).join('');

    return tags + PARTS.map(function (p) {
      /* 말풍선은 넷이 각자 하나씩 — 한 번에 하나만 돌아가며 뜨지 않고
         가동 중인 캐릭터의 머리 위에 4개가 동시에 떠 있다. */
      return '<span class="bubble bubble--down bubble--status" data-part="' + p.id + '" hidden>' +
        '<span class="bubble__ico" hidden></span><span class="bubble__txt"></span></span>';
    }).join('');
  }

  function spriteHTML(p) {
    return '<button class="sprite' + (isActive(p.id) ? '' : ' is-off') + '" type="button" ' +
      'data-part="' + p.id + '" data-action="open-room" ' +
      'style="left:' + p.home[0] + '%;top:' + p.home[1] + '%;--w:' + p.w + '%;z-index:' +
        Math.round(p.home[1] * 10) + '" ' +
      'aria-label="' + esc(p.room) + ' · ' + esc(p.name) + ' 열기">' +
      '<span class="sprite__shadow"></span>' +
      '<span class="sprite__glow"></span>' +
      '<span class="sprite__inner">' + avatarSVG(p.id) + '</span>' +
      '<span class="sprite__keys"></span>' +
      '<span class="sprite__tap"></span>' +
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

  /* ---------------------------------------------------------
     말풍선 · 이름표 — 캐릭터의 지금 발 위치를 따라간다
     --------------------------------------------------------- */

  function pointOf(id) {
    var el = spriteEls[id];
    var p = PART_MAP[id];
    if (!el || !p) return p ? p.home.slice() : [50, 50];
    var x = parseFloat(el.style.left);
    var y = parseFloat(el.style.top);
    return [isNaN(x) ? p.home[0] : x, isNaN(y) ? p.home[1] : y];
  }

  /* 책상 앞(home)에서 머리 위 라벨까지의 높이 차이를 그대로 유지하며,
     지금 발 위치 위로 올린다. 회의실에 앉았을 때는 작아진 만큼 덜 띄운다. */
  function anchorOf(partId, which) {
    var p = PART_MAP[partId];
    if (!p) return [50, 50];
    var pt = pointOf(partId);
    var el = spriteEls[partId];
    var k = el && el.classList.contains('is-seated') ? 0.72 : 1;
    return [pt[0], pt[1] - (p.home[1] - p[which][1]) * k];
  }

  function bubbleElsReady() {
    bubbleEls = {};
    $$('.bubble[data-part]').forEach(function (el) {
      bubbleEls[el.getAttribute('data-part')] = el;
    });
  }

  /* 말풍선이 설 자리 — 책상 앞에서는 그 캐릭터의 머리 위를 따라가고,
     회의실에 앉으면 좌석 바깥으로 뻗은 자리(PARTS[].meet)를 쓴다.
     ax·ay 는 꼬리가 가리킬 캐릭터 머리 좌표(%)다. */
  function bubbleSpot(partId) {
    var p = PART_MAP[partId];
    var el = spriteEls[partId];
    var head = anchorOf(partId, 'bubble');
    var seated = !!(el && el.classList.contains('is-seated'));
    var spot = seated && p.meet ? p.meet : null;
    return {
      x: spot ? spot[0] : head[0],
      y: spot ? spot[1] : head[1],
      tail: spot ? spot[2] : 'down',
      ax: head[0],
      ay: head[1]
    };
  }

  /* 말풍선을 무대 안에 두고, 잘려서 밀렸을 때도 꼬리가 캐릭터를 가리키게 한다. */
  function moveBubble(partId, dur) {
    var el = bubbleEls[partId];
    var stage = $('#mapStage');
    if (!el || el.hidden || !stage) return;
    var sw = stage.clientWidth;
    var sh = stage.clientHeight;
    if (!sw || !sh) return;
    var spot = bubbleSpot(partId);
    var bw = el.offsetWidth;
    var bh = el.offsetHeight;
    if (dur == null) el.style.transitionDuration = '';
    else el.style.transitionDuration = dur + 's';
    if (!bw || !bh) {
      el.style.left = spot.x + '%';
      el.style.top = spot.y + '%';
      return;
    }
    var cx = sw * spot.x / 100;
    var cy = sh * spot.y / 100;
    var ax = sw * spot.ax / 100;
    var ay = sh * spot.ay / 100;
    var pad = 3;
    var gap = 5;   /* 머리와 말풍선 사이 여백 */
    var left;
    var top;
    if (spot.tail === 'down' || spot.tail === 'up') {
      left = cx - bw / 2;
      top = spot.tail === 'down' ? cy - bh - gap : cy + gap;
      left = Math.max(pad, Math.min(sw - bw - pad, left));
      top = Math.max(pad, Math.min(sh - bh - pad, top));
      var tx = Math.max(13, Math.min(bw - 13, ax - left));
      el.style.setProperty('--tail-x', tx + 'px');
    } else {
      /* 꼬리 방향은 꼬리가 붙은 쪽 — 'right' 꼬리면 말풍선은 캐릭터 왼쪽에 선다 */
      left = spot.tail === 'right' ? cx - bw - gap : cx + gap;
      top = cy - bh / 2;
      left = Math.max(pad, Math.min(sw - bw - pad, left));
      top = Math.max(pad, Math.min(sh - bh - pad, top));
      var ty = Math.max(11, Math.min(bh - 11, ay - top));
      el.style.setProperty('--tail-y', ty + 'px');
    }
    el.style.left = left + 'px';
    el.style.top = top + 'px';
  }

  /* mood 를 주지 않으면 지금 상태 문구(할 일 안내) 말풍선이 뜨고,
     mood 를 주면 감정 아이콘과 함께 감정 말풍선이 뜬다.
     캐릭터마다 자기 말풍선 하나만 건드린다. */
  function placeBubble(partId, animate, mood) {
    var el = bubbleEls[partId];
    var p = PART_MAP[partId];
    if (!el || !p) return;
    if (!state.motion || !isActive(partId)) { el.hidden = true; return; }
    var emo = mood && EMOTIONS[mood.e] ? EMOTIONS[mood.e] : null;
    var spot = bubbleSpot(partId);
    el.className = 'bubble bubble--' + spot.tail +
      (emo ? ' bubble--mood m-' + emo.cls : ' bubble--status');
    var ico = $('.bubble__ico', el);
    if (ico) {
      ico.hidden = !emo;
      ico.textContent = emo ? emo.icon : '';
    }
    $('.bubble__txt', el).textContent = emo ? mood.t : statusOf(partId);
    el.hidden = false;
    moveBubble(partId, animate ? null : 0);
    if (animate) {
      el.classList.remove('is-pop');
      void el.offsetWidth;
      el.classList.add('is-pop');
    }
  }

  /* 가동 중인 캐릭터 넷의 말풍선을 한꺼번에 띄운다(휴식 중인 캐릭터는 숨김). */
  function renderBubbles(animate) {
    PARTS.forEach(function (p) {
      if (state.motion && isActive(p.id)) placeBubble(p.id, !!animate);
      else if (bubbleEls[p.id]) bubbleEls[p.id].hidden = true;
    });
  }

  function hideBubbles() {
    Object.keys(bubbleEls).forEach(function (id) { bubbleEls[id].hidden = true; });
  }

  /* 이름표를 캐릭터 위치에 맞춰 옮기고, 그 캐릭터 말풍선도 함께 옮긴다. */
  function syncAnchor(id, dur) {
    var p = PART_MAP[id];
    if (!p) return;
    var pt = pointOf(id);
    var tag = $('.tag[data-part="' + id + '"]');
    if (tag) {
      tag.style.transitionDuration = (dur == null ? 0.4 : dur) + 's';
      tag.style.left = pt[0] + '%';
      tag.style.top = (pt[1] - (p.home[1] - p.tag[1])).toFixed(2) + '%';
    }
    moveBubble(id, dur == null ? 0.4 : dur);
  }

  /* 위치만 다시 잡는다(말풍선 내용은 그대로). */
  function syncBubble() {
    if (!state.motion || document.hidden) { hideBubbles(); return; }
    PARTS.forEach(function (p) { moveBubble(p.id, 0); });
  }

  function refreshFocus() {
    /* 이름표 강조는 그 비서의 방이 열려 있을 때만 */
    var openId = ui.sheet && ui.sheet.type === 'part' ? ui.sheet.id : null;
    $$('.tag').forEach(function (tag) {
      var id = tag.getAttribute('data-part');
      tag.classList.toggle('is-focus', !!id && id === openId);
    });
    Object.keys(spriteEls).forEach(function (id) {
      spriteEls[id].classList.toggle('is-focus', id === openId);
    });
  }

  /* ---------------------------------------------------------
     말풍선 대사 교체 — 넷이 각자 다른 박자로 자기 대사를 바꾼다
     (4.6~6.9초, 회의 중에는 3.2~5.2초). 한꺼번에 바뀌지 않는다.
     --------------------------------------------------------- */

  var BUBBLE_CADENCE = {
    desk: { byeol: 4600, gpt: 5300, claude: 6100, gemini: 6900 },
    meet: { byeol: 3200, gpt: 3900, claude: 4600, gemini: 5300 }
  };

  function bubbleCadence(partId) {
    var row = meeting.state === 'meeting' ? BUBBLE_CADENCE.meet : BUBBLE_CADENCE.desk;
    return row[partId] || 5200;
  }

  function stopBubbleLoop() {
    Object.keys(bubbleTimers).forEach(function (id) { window.clearTimeout(bubbleTimers[id]); });
    bubbleTimers = {};
  }

  function bubbleTick(partId) {
    var base = bubbleCadence(partId);
    var wait = base * (0.85 + Math.random() * 0.32);
    bubbleTimers[partId] = window.setTimeout(function () { bubbleTick(partId); }, wait);

    if (!state.motion || document.hidden || ui.sheet) return;
    if (!isActive(partId)) {
      if (bubbleEls[partId]) bubbleEls[partId].hidden = true;
      return;
    }
    if (meeting.state === 'meeting') {
      /* 회의 중 — 각자 자기 박자로 한마디씩, 말할 때 살짝 끄덕인다 */
      placeBubble(partId, true, pickMood(partId));
      var sp = spriteEls[partId];
      if (sp && sp.classList.contains('is-seated')) {
        sp.classList.add('is-talking');
        window.setTimeout(function () { sp.classList.remove('is-talking'); }, 1500);
        if (Math.random() < 0.3) popEmoji(partId);
      }
      return;
    }
    bubbleTurn[partId] = (bubbleTurn[partId] || 0) + 1;
    /* 상태 문구 ↔ 감정 말풍선을 번갈아 띄운다 */
    placeBubble(partId, true, bubbleTurn[partId] % 2 === 0 ? null : pickMood(partId));
  }

  function startBubbleLoop() {
    stopBubbleLoop();
    PARTS.forEach(function (p) {
      /* 캐릭터마다 첫 대사 시점도 조금씩 다르게 — 넷이 동시에 깜빡이지 않게 */
      var first = bubbleCadence(p.id) * (0.15 + Math.random() * 0.35);
      bubbleTimers[p.id] = window.setTimeout(function () { bubbleTick(p.id); }, first);
    });
  }

  /* ---------------------------------------------------------
     캐릭터 모션 — 한 번에 한 명만 걷고, 나머지는 자리에서 일한다
     --------------------------------------------------------- */

  var walkGen = {};
  var walkTimer = {};
  var typeTimer = {};
  var walker = null;
  var motionTimer = null;

  /* 회의 상태 — idle → gather(걸어가기) → meeting(마주 앉기) → return → idle.
     회의 중에는 일반 순찰·타이핑 틱을 멈추고 회의 연출이 화면을 맡는다. */
  var meeting = {
    state: 'idle',
    attendees: [],
    seats: {},
    gatherGen: 0,
    endTimer: null
  };

  function inMeeting() {
    return meeting.state === 'gather' || meeting.state === 'meeting' || meeting.state === 'return';
  }

  function moveSprite(id, point, dur) {
    var el = spriteEls[id];
    if (!el) return;
    el.style.transitionDuration = dur + 's';
    el.style.left = point[0] + '%';
    el.style.top = point[1] + '%';
    el.style.zIndex = Math.round(point[1] * 10);
    syncAnchor(id, dur);
  }

  /* 경유점 배열을 순서대로 걸어간다. 거리에 따라 한 걸음 시간이 달라지고,
     중간에 새 이동이 시작되면 옛 이동은 조용히 멈춘다. */
  function walkPath(id, path, done) {
    var el = spriteEls[id];
    if (!el) { if (done) done(); return; }
    var gen = (walkGen[id] = (walkGen[id] || 0) + 1);
    var i = 0;
    el.classList.add('is-walk');
    el.classList.remove('is-seated', 'is-talking', 'is-typing');
    var tagEl = $('.tag[data-part="' + id + '"]');
    if (tagEl) tagEl.classList.remove('is-seated');
    window.clearTimeout(typeTimer[id]);
    syncPartyStates();

    function next() {
      if (gen !== walkGen[id]) return;
      if (i >= path.length) {
        el.classList.remove('is-walk');
        syncPartyStates();
        if (done) done();
        return;
      }
      var from = pointOf(id);
      var to = path[i];
      i += 1;
      var dx = to[0] - from[0];
      var dy = (to[1] - from[1]) * 4 / 3;   /* 무대는 3:4라 세로 1%가 가로 1%보다 길다 */
      var d = Math.sqrt(dx * dx + dy * dy);
      var dur = Math.max(0.3, Math.min(1.2, 0.2 + d * 0.072));
      moveSprite(id, to, dur);
      window.clearTimeout(walkTimer[id]);
      walkTimer[id] = window.setTimeout(next, dur * 1000 + 40);
    }
    next();
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
    syncPartyStates();
  }

  /* 자리에서 타자를 치는 시간을 한 번에 길게 잡아, 390px 폭에서도
     '지금 일하는 중'이 금방 읽히게 한다. */
  function startTyping(id, ms) {
    if (!state.motion || document.hidden) return;
    var el = spriteEls[id];
    if (!el || el.classList.contains('is-walk') || el.classList.contains('is-seated')) return;
    setTyping(id, true);
    window.clearTimeout(typeTimer[id]);
    typeTimer[id] = window.setTimeout(function () { setTyping(id, false); }, ms || 3400);
    /* 가끔 작은 '타닥' 글자를 띄워 자리에서 일하는 느낌을 더한다 */
    if (Math.random() < 0.5) {
      window.setTimeout(function () {
        if (!el.classList.contains('is-typing') || !state.motion) return;
        if (el.querySelector('.sprite__word')) return;
        var w = document.createElement('span');
        w.className = 'sprite__word';
        w.textContent = '타닥';
        el.appendChild(w);
        window.setTimeout(function () { if (w.parentNode) w.parentNode.removeChild(w); }, 1400);
      }, 700 + Math.random() * 1800);
    }
  }

  function stopTyping(id) {
    window.clearTimeout(typeTimer[id]);
    setTyping(id, false);
  }

  function startWalk(id) {
    var p = PART_MAP[id];
    var el = spriteEls[id];
    if (!p || !el || walker || inMeeting()) return;
    walker = id;
    stopTyping(id);
    var out = p.paces[Math.floor(Math.random() * p.paces.length)];
    walkPath(id, [out], function () {
      if (walker !== id) return;
      popEmoji(id);
      window.setTimeout(function () {
        if (walker !== id || inMeeting()) { if (walker === id) walker = null; return; }
        walkPath(id, [p.home], function () {
          if (walker !== id) return;
          walker = null;
          startTyping(id, 1800 + Math.random() * 2200);
        });
      }, 1900);
    });
  }

  function motionTick() {
    if (!state.motion || document.hidden || ui.sheet || inMeeting()) return;
    var act = activeParts();
    if (!act.length) return;

    if (!walker && Math.random() < 0.45) {
      var pick = act[Math.floor(Math.random() * act.length)];
      if (pick.id !== state.focus || Math.random() < 0.35) startWalk(pick.id);
    }

    if (Math.random() < 0.5) {
      var e = act[Math.floor(Math.random() * act.length)];
      var el = spriteEls[e.id];
      if (el && !el.classList.contains('is-walk')) popEmoji(e.id);
    }

    if (!walker) {
      var free = act.filter(function (p) {
        var el2 = spriteEls[p.id];
        return el2 && !el2.classList.contains('is-walk') && !el2.classList.contains('is-typing');
      });
      if (free.length && Math.random() < 0.75) {
        startTyping(free[Math.floor(Math.random() * free.length)].id, 3200 + Math.random() * 3200);
      }
    }
  }

  function startMotionLoop() {
    window.clearInterval(motionTimer);
    motionTimer = window.setInterval(motionTick, 2400);
  }

  function resetMotion() {
    Object.keys(spriteEls).forEach(function (id) {
      var p = PART_MAP[id];
      var el = spriteEls[id];
      if (!p || !el) return;
      walkGen[id] = (walkGen[id] || 0) + 1;
      window.clearTimeout(walkTimer[id]);
      window.clearTimeout(typeTimer[id]);
      el.classList.remove('is-walk', 'is-typing', 'is-seated', 'is-talking');
      var tagEl = $('.tag[data-part="' + id + '"]');
      if (tagEl) tagEl.classList.remove('is-seated');
      el.style.transitionDuration = '0s';
      el.style.left = p.home[0] + '%';
      el.style.top = p.home[1] + '%';
      el.style.zIndex = Math.round(p.home[1] * 10);
      syncAnchor(id, 0);
    });
    walker = null;
    meeting.state = 'idle';
    meeting.attendees = [];
    meeting.gatherGen += 1;
    window.clearTimeout(meeting.endTimer);
    document.body.classList.remove('is-meeting');
    syncMeetChip();
  }

  /* ---------------------------------------------------------
     회의실 모임 — 일이나 안건이 생기면 넷이 걸어가 마주 앉는다
     --------------------------------------------------------- */

  function seatPath(id) {
    var p = PART_MAP[id];
    var route = ROOM.route[id] || [p.home];
    return route.slice(1).concat([ROOM.seats[p.seat] || route[route.length - 1]]);
  }

  function backPath(id) {
    var p = PART_MAP[id];
    var route = ROOM.route[id] || [p.home];
    var seat = ROOM.seats[p.seat] || route[route.length - 1];
    return [seat].concat(route.slice(1).reverse()).concat([[p.home[0], p.home[1]]]);
  }

  function syncMeetChip() {
    var chip = $('#meetChip');
    var txt = $('#meetChipText');
    var hint = $('#mapFootHint');
    if (!chip || !txt) return;
    var on = meeting.state === 'gather' || meeting.state === 'meeting';
    chip.classList.toggle('is-on', on);
    chip.setAttribute('aria-pressed', on ? 'true' : 'false');
    txt.textContent = meeting.state === 'gather' ? '회의실로 모이는 중' :
      meeting.state === 'meeting' ? '회의 중 · 해산' : '회의 소집';
    if (hint) {
      hint.textContent = meeting.state === 'meeting' ? '회의실에 모여 안건을 보고 있어요 · 탭하면 해산' :
        meeting.state === 'gather' ? '하나둘씩 회의실로 걸어가는 중이에요' :
        meeting.state === 'return' ? '각자 자리로 돌아가는 중이에요' :
        '캐릭터를 누르면 그 비서의 오늘 일정이 열려요';
    }
    syncPartyStates();
  }

  function conveneToRoom(quiet) {
    if (!state.motion) { toast('모션을 켜면 회의 장면이 보여요'); return; }
    if (inMeeting()) {
      if (meeting.state === 'meeting') extendMeeting();
      return;
    }
    var act = activeParts();
    if (!act.length) return;
    meeting.state = 'gather';
    meeting.attendees = act.map(function (p) { return p.id; });
    meeting.seats = {};
    var gen = (meeting.gatherGen += 1);
    walker = null;
    document.body.classList.add('is-meeting');
    syncMeetChip();
    var arrived = 0;
    act.forEach(function (p, i) {
      meeting.seats[p.id] = p.seat;
      window.setTimeout(function () {
        if (gen !== meeting.gatherGen) return;
        walkPath(p.id, seatPath(p.id), function () {
          if (gen !== meeting.gatherGen) return;
          var el = spriteEls[p.id];
          if (el) el.classList.add('is-seated');
          var tag = $('.tag[data-part="' + p.id + '"]');
          if (tag) tag.classList.add('is-seated');
          /* 앉은 자리 기준 말풍선 자리로 옮긴다 */
          moveBubble(p.id, 0.4);
          popEmoji(p.id);
          arrived += 1;
          if (arrived === meeting.attendees.length) beginMeeting(gen);
        });
      }, i * 260);
    });
    if (!quiet) toast(act.length + '명이 회의실로 모여요');
  }

  function beginMeeting(gen) {
    if (gen !== meeting.gatherGen) return;
    meeting.state = 'meeting';
    syncMeetChip();
    /* 넷이 각자 자기 박자로 대사를 바꾸며 회의한다 — 말풍선은 넷 다 계속 떠 있다 */
    startBubbleLoop();
    renderBubbles(false);
    window.clearTimeout(meeting.endTimer);
    meeting.endTimer = window.setTimeout(function () { dismissMeeting(); }, 36000 + Math.random() * 12000);
  }

  function extendMeeting() {
    window.clearTimeout(meeting.endTimer);
    meeting.endTimer = window.setTimeout(function () { dismissMeeting(); }, 34000);
  }

  function dismissMeeting(silent) {
    if (meeting.state === 'idle' || meeting.state === 'return') return;
    window.clearTimeout(meeting.endTimer);
    meeting.state = 'return';
    var gen = (meeting.gatherGen += 1);
    var ids = meeting.attendees.slice();
    document.body.classList.remove('is-meeting');
    syncMeetChip();
    ids.forEach(function (id, i) {
      var el = spriteEls[id];
      if (el) el.classList.remove('is-seated', 'is-talking');
      window.setTimeout(function () {
        if (gen !== meeting.gatherGen) return;
        walkPath(id, backPath(id), function () {
          if (gen !== meeting.gatherGen) return;
          startTyping(id, 2200 + Math.random() * 1800);
        });
      }, i * 220);
    });
    window.setTimeout(function () {
      if (gen !== meeting.gatherGen) return;
      meeting.state = 'idle';
      meeting.attendees = [];
      meeting.seats = {};
      syncMeetChip();
      if (state.motion) { renderBubbles(false); startBubbleLoop(); }
    }, 5400);
    if (!silent) toast('회의를 마치고 각자 자리로 돌아가요');
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

  /* 칩에 쓰는 시계 — 요일 + 시:분 (실시간이면 지금 시각, 미리보기면 그 시간대) */
  function clockLabel(h) {
    var hh = Math.floor(((h % 24) + 24) % 24);
    var mm = Math.min(59, Math.round(((h % 1) + 1) % 1 * 60));
    return WEEK[new Date().getDay()] + ' ' + pad2(hh) + ':' + pad2(mm);
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

    var label = (state.envTime === 'auto' ? '' : '미리보기 ') + clockLabel(h) +
      ' · ' + WEATHER_LABEL[kind];
    var tempTxt = (state.envWeather === 'auto' && env.temp != null) ? ' ' + Math.round(env.temp) + '°' : '';
    var txt = $('#envText');
    if (txt) txt.textContent = label + tempTxt;
    var chipEl = $('#envChip');
    if (chipEl) chipEl.setAttribute('aria-label', label + tempTxt + ' · 시간·날씨 미리보기 열기');
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

    renderParty();
  }

  function renderMap() {
    var overlay = $('#mapOverlay');
    if (!overlay) return;
    renderSprites();
    overlay.innerHTML = overlayHTML();
    bubbleElsReady();
    refreshFocus();
    renderBubbles(false);
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

  /* ---------------------------------------------------------
     파티 도트 바 — 오피스 맵 위 4인 상태창
     이름·상태점·남은 일감·오늘 일 진행 게이지를 한 칸에 담고,
     누르면 그 비서의 방(시트)이 열린다.
     --------------------------------------------------------- */

  var PARTY_STATE = {
    on:      { label: '가동 중', long: '가동 중' },
    typing:  { label: '타자 중', long: '타자 중' },
    walk:    { label: '이동 중', long: '이동 중' },
    meeting: { label: '회의 중', long: '회의 중' },
    off:     { label: '휴식', long: '휴식 중' }
  };

  function partyStateOf(id) {
    if (!isActive(id)) return 'off';
    var el = spriteEls[id];
    if (el && el.classList.contains('is-seated')) return 'meeting';
    if (meeting.state === 'gather' || meeting.state === 'meeting') {
      if (meeting.attendees.indexOf(id) >= 0) return 'meeting';
    }
    if (el && el.classList.contains('is-typing')) return 'typing';
    if (el && el.classList.contains('is-walk')) return 'walk';
    return 'on';
  }

  /* 남은 일이 적을수록 게이지가 차오른다 — 0건이면 가득 */
  function partyGauge(p) {
    var open = tasksOf(p.id, false).length;
    return Math.max(25, 100 - open * 22);
  }

  function partyCellHTML(p) {
    var key = partyStateOf(p.id);
    var meta = PARTY_STATE[key];
    var open = tasksOf(p.id, false).length;
    return '<button class="pm" type="button" data-action="open-room" data-part="' + p.id +
      '" data-state="' + key + '"' +
      ' style="--c:' + p.color + ';--soft:' + p.soft + ';--edge:' + p.color + '55;--fill:' +
        partyGauge(p) + '%"' +
      ' aria-label="' + esc(p.name + ' ' + meta.long + ' · 남은 일 ' + open + '건 · 방 열기') + '">' +
      '<span class="pm__top">' +
        '<span class="pm__ico">' + avatarSVG(p.id) + '</span>' +
        '<span class="pm__name">' + esc(p.name) + '</span>' +
        '<i class="pm__dot"></i>' +
      '</span>' +
      '<span class="pm__meta"><span class="pm__st">' + meta.label + '</span>' +
        '<span class="pm__n">' + open + '건</span></span>' +
      '<span class="pm__bar"><i></i></span>' +
    '</button>';
  }

  function renderParty() {
    var el = $('#partyBar');
    if (!el) return;
    var act = activeParts().length;
    var open = state.tasks.filter(function (t) { return !t.done; }).length;
    el.innerHTML = '<div class="party__frame"><div class="party__in">' +
      '<div class="party__head"><span class="party__title">비서 파티</span>' +
        '<span class="party__meta">' + (act ? act + '인 가동' : '전원 휴식') +
        ' · 일감 ' + open + '건</span></div>' +
      '<div class="party__row">' + PARTS.map(partyCellHTML).join('') + '</div>' +
    '</div></div>';
  }

  /* 모션·회의처럼 상태만 바뀔 때는 칸을 다시 그리지 않고 표시만 갱신한다. */
  function syncPartyStates() {
    var row = $('#partyBar .party__row');
    if (!row) return;
    $$('.pm', row).forEach(function (cell) {
      var id = cell.getAttribute('data-part');
      var p = PART_MAP[id];
      if (!p) return;
      var key = partyStateOf(id);
      var meta = PARTY_STATE[key];
      var open = tasksOf(id, false).length;
      cell.setAttribute('data-state', key);
      cell.style.setProperty('--fill', partyGauge(p) + '%');
      var st = $('.pm__st', cell);
      if (st) st.textContent = meta.label;
      var n = $('.pm__n', cell);
      if (n) n.textContent = open + '건';
      cell.setAttribute('aria-label', p.name + ' ' + meta.long + ' · 남은 일 ' + open + '건 · 방 열기');
    });
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
      '<p class="agent__persona">' + esc(p.persona) + '</p>' +
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
    /* 상태 문구를 보여 주는 중인 말풍선은 글자만 바로 바꾸고 자리를 다시 잡는다 */
    Object.keys(bubbleEls).forEach(function (id) {
      var b = bubbleEls[id];
      if (!b || b.hidden || b.classList.contains('bubble--mood')) return;
      var btxt = $('.bubble__txt', b);
      if (btxt) btxt.textContent = statusOf(id);
      moveBubble(id, 0.2);
    });
  }

  /* ---------------------------------------------------------
     sheet
     --------------------------------------------------------- */

  function openRoom(id) {
    if (!PART_MAP[id]) return;
    state.focus = id;
    save();
    ui.sheet = { type: 'part', id: id };
    refreshFocus();
    renderSheet();
    showSheet();
  }

  /* 가이드 시트 — 지금 보고 있는 탭의 설명이 기본으로 열린다.
     칩으로 다른 탭 설명만 바뀔 뿐 앱 탭은 그대로다. */
  function openHelp(key) {
    openEnvPanel(false);
    ui.sheet = { type: 'help', gtab: GUIDE[key] ? key : 'map' };
    renderSheet();
    showSheet();
  }

  function showSheet() {
    var wrap = $('#sheetWrap');
    var sheet = $('#sheetWrap .sheet');
    var btn = $('#helpBtn');
    if (sheet) sheet.classList.toggle('sheet--guide', !!(ui.sheet && ui.sheet.type === 'help'));
    if (btn) btn.setAttribute('aria-expanded', (ui.sheet && ui.sheet.type === 'help') ? 'true' : 'false');
    window.clearTimeout(closeTimer);
    wrap.hidden = false;
    document.body.style.overflow = 'hidden';
    window.requestAnimationFrame(function () { wrap.classList.add('is-open'); });
  }

  function closeSheet() {
    var wrap = $('#sheetWrap');
    if (wrap.hidden) return;
    var wasHelp = !!(ui.sheet && ui.sheet.type === 'help');
    var sheet = $('#sheetWrap .sheet');
    var btn = $('#helpBtn');
    wrap.classList.remove('is-open');
    document.body.style.overflow = '';
    ui.sheet = null;
    if (btn) btn.setAttribute('aria-expanded', 'false');
    refreshFocus();
    window.clearTimeout(closeTimer);
    closeTimer = window.setTimeout(function () {
      wrap.hidden = true;
      if (sheet) sheet.classList.remove('sheet--guide');
      if (wasHelp && btn) { try { btn.focus({ preventScroll: true }); } catch (e) { btn.focus(); } }
    }, 340);
  }

  /* 첫 방문에만 ? 옆에 점을 하나 찍고 한 번만 살짝 커졌다 작아진다.
     한 번 열면 다시 뜨지 않으며, 백업 JSON 과는 섞이지 않게 따로 저장한다. */
  var GUIDE_SEEN_KEY = 'byeol-office-guide-seen';

  function guideSeen() {
    try { return window.localStorage.getItem(GUIDE_SEEN_KEY) === '1'; } catch (e) { return true; }
  }

  function markGuideSeen() {
    try { window.localStorage.setItem(GUIDE_SEEN_KEY, '1'); } catch (e) { /* ignore */ }
    var dot = $('#helpDot');
    var btn = $('#helpBtn');
    if (dot) dot.hidden = true;
    if (btn) btn.classList.remove('is-new');
  }

  function renderGuide(key) {
    var g = GUIDE[key] || GUIDE.map;
    var head = $('#sheetHead');
    var body = $('#sheetBody');
    head.style.removeProperty('--c');
    head.innerHTML =
      '<div class="guide-head">' +
        '<span class="guide-head__ico" aria-hidden="true">?</span>' +
        '<div class="guide-head__id">' +
          '<h3 class="sheet__title" id="sheetTitle">' + esc(g.title) + ' 가이드</h3>' +
          '<p class="sheet__sub">이렇게 쓰면 편해요</p>' +
        '</div>' +
        '<button class="guide-close" type="button" data-action="close-sheet" aria-label="가이드 닫기">✕</button>' +
      '</div>' +
      '<div class="guide-tabs" role="group" aria-label="탭별 가이드">' +
        GUIDE_ORDER.map(function (k) {
          var on = k === key;
          return '<button class="guide-chip' + (on ? ' is-on' : '') + '" type="button" ' +
            'aria-pressed="' + (on ? 'true' : 'false') + '" data-action="guide-tab" data-gtab="' + k + '">' +
            esc(GUIDE[k].title) + '</button>';
        }).join('') +
      '</div>';

    body.innerHTML =
      '<p class="guide-core">' + esc(g.core) + '</p>' +
      '<p class="guide-label">이렇게 써요</p>' +
      '<div class="guide-steps">' +
        g.steps.map(function (t, i) {
          return '<div class="guide-step"><span class="guide-step__n">' + (i + 1) + '</span>' +
            '<span class="guide-step__t">' + esc(t) + '</span></div>';
        }).join('') +
      '</div>' +
      '<div class="guide-routine"><b>추천 루틴</b><p>' + esc(g.routine) + '</p></div>' +
      (g.note ? '<p class="guide-note"><i aria-hidden="true">💡</i><span>' + esc(g.note) + '</span></p>' : '');
    body.scrollTop = 0;
  }

  function renderSheet() {
    var target = ui.sheet;
    if (!target) return;
    if (target.type === 'help') { renderGuide(target.gtab); return; }

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
      '<p class="sheet__sub">' + esc(p.room) + ' · ' + esc(p.role) + '</p>' +
      '<p class="sheet__persona"><i aria-hidden="true">“</i>' + esc(p.persona) + '<i aria-hidden="true">”</i></p></div>' +
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
    if (!silent && ui.sheet && ui.sheet.type === 'help') closeSheet();
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
    if (name === 'map') window.requestAnimationFrame(function () {
      autosize($('#todayLine'));
      syncBubble();     /* 숨어 있는 동안에도 대사가 바뀌었을 수 있어 자리만 다시 잡는다 */
    });
  }

  function setMotion(on) {
    state.motion = !!on;
    document.body.classList.toggle('motion', state.motion);
    document.body.classList.toggle('no-motion', !state.motion);
    $('#motionBtn').setAttribute('aria-checked', state.motion ? 'true' : 'false');
    $('#motionState').textContent = state.motion ? 'ON' : 'OFF';
    save();
    if (state.motion) {
      renderBubbles(false);
      startBubbleLoop();
    } else {
      resetMotion();
      setTypingAllOff();
      stopBubbleLoop();
      hideBubbles();
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
    if (!ui.sheet) showMood(partId, ['focus', 'hype']);
    conveneToRoom(true);
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
    conveneToRoom(true);
  }

  function toggleTask(id) {
    state.tasks.forEach(function (t) { if (t.id === id) t.done = !t.done; });
    save();
    renderCrew();
    renderTasks();
    renderTeam();
    renderHeader();
    if (ui.sheet) renderSheet();
    var hit = null;
    state.tasks.forEach(function (t) { if (t.id === id) hit = t; });
    if (hit && hit.done) showMood(hit.part, ['proud', 'relief']);
  }

  function toggleAgenda(id) {
    state.agenda.forEach(function (a) { if (a.id === id) a.done = !a.done; });
    save();
    renderAgenda();
    renderHeader();
    if (ui.sheet) renderSheet();
    var hit = null;
    state.agenda.forEach(function (a) { if (a.id === id) hit = a; });
    if (hit && hit.done && state.motion) dismissMeeting(true);
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
      toast(state.motion ? '모션을 켰어요' : '모션을 껐어요');
    });

    var chip = $('#meetChip');
    if (chip) {
      chip.addEventListener('click', function (e) {
        e.stopPropagation();
        if (meeting.state === 'meeting' || meeting.state === 'gather') dismissMeeting();
        else conveneToRoom();
      });
    }

    $('#tabs').addEventListener('click', function (e) {
      var btn = e.target.closest('.tab');
      if (!btn) return;
      setTab(btn.getAttribute('data-tab'));
    });

    var helpBtn = $('#helpBtn');
    if (helpBtn) {
      helpBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        markGuideSeen();
        openHelp(state.tab);
      });
    }

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
        case 'guide-tab':
          if (!ui.sheet || ui.sheet.type !== 'help') break;
          ui.sheet.gtab = el.getAttribute('data-gtab');
          renderSheet();
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
      PARTS.forEach(function (p) { moveBubble(p.id, 0); });
    });

    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && state.motion) {
        PARTS.forEach(function (p) { if (isActive(p.id)) placeBubble(p.id, false); });
      }
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

    if (!guideSeen()) {
      var dot = $('#helpDot');
      var btn = $('#helpBtn');
      if (dot) dot.hidden = false;
      if (btn) {
        btn.classList.add('is-new');
        window.setTimeout(function () { btn.classList.remove('is-new'); }, 1400);
      }
    }

    fxResize();
    applyEnv();
    loadWeather();
    syncMeetChip();
    window.setInterval(applyEnv, 30000);
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

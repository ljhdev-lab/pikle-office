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

  /* 각 AI의 토큰(한도) 기본값.
     Claude(Pro) 만 실제 화면에서 확인한 측정값이다 — 2026-11-28 15:00
     claude.ai › 설정 › 사용량 에서 주간 3% 사용 = 잔여 97%. 같은 화면의
     현재 세션(10% 사용, 잔여 90%)과 초기화 시각은 안내문에 적는다.
     별이·GPT·제미나이는 정량 %를 화면에 주지 않지만, 쓰는 만큼 대략 얼마나
     줄었는지 보이도록 기준값을 두고 시킨 작업 수로 어림한다. 그 값은
     측정값이 아니므로 est: true 로 두고 화면에 '~17%' 처럼 표시한다.
       · 별이: 11.28 15:37 일일 한도 83% 사용 = 잔여 17%
       · GPT : 오늘 작업량으로 어림한 92%
       · 제미나이: 오늘 작업량으로 어림한 90% */
  var QUOTA_DEFAULTS = {
    byeol: { plan: '무료', pct: 17, est: true, level: 'plenty', checkedAt: Date.parse('2026-11-28T15:37:00+09:00') },
    gpt: { plan: '무료', pct: 92, est: true, level: 'plenty', checkedAt: Date.parse('2026-11-28T15:35:00+09:00') },
    claude: { plan: 'Pro', pct: 97, est: false, level: 'plenty', checkedAt: Date.parse('2026-11-28T15:00:00+09:00') },
    gemini: { plan: '무료', pct: 90, est: true, level: 'plenty', checkedAt: Date.parse('2026-11-28T15:35:00+09:00') }
  };

  /* 한도가 다시 차는 시점 — 별이는 매일 04:00, 클로드는 매주 토요일 05:00,
     제미나이는 매일 00:00, GPT 는 마지막 사용에서 5시간 뒤(정해진 시각 없음).
     기기 시간대(한국) 기준으로 계산한다. */
  var QUOTA_RESET = {
    byeol: { kind: 'daily', hour: 4 },
    claude: { kind: 'weekly', dow: 6, hour: 5 },
    gpt: { kind: 'rolling', hours: 5 },
    gemini: { kind: 'daily', hour: 0 }
  };

  /* 작업 1건을 넣거나 끝낼 때 까는 대략치(%). 정확한 사용량이 아니라
     '이만큼쯤 썃을 것'이라는 추정이다. 클로드는 부스터(Opus)일 때 두 배. */
  var QUOTA_COST = { byeol: 8, gpt: 10, gemini: 8, claude: 4, claudeBoost: 8 };

  var QUOTA_RECOVER = {
    byeol: '매일 04:00에 100%로 회복 · 작업 1건당 -8% 추정',
    gpt: '마지막 사용 5시간 뒤 100%로 회복 · 작업 1건당 -10% 추정',
    claude: '매주 토 05:00에 100%로 회복 · 작업 1건당 -4%, 부스터 -8% 추정',
    gemini: '매일 00:00에 100%로 회복 · 작업 1건당 -8% 추정'
  };

  function defaultQuota(id) {
    var q = QUOTA_DEFAULTS[id] || QUOTA_DEFAULTS.byeol;
    return {
      plan: q.plan, pct: q.pct, level: q.level, checkedAt: q.checkedAt || 0,
      est: q.est === true, lastResetAt: 0, lastUsedAt: 0
    };
  }

  /* %가 없는 플랜에서 고를 수 있는 한도 상태 — 막대 길이와 색도 여기서 나온다. */
  var QUOTA_LEVEL = {
    plenty: { label: '여유', fill: 100, tone: 'high' },
    ok: { label: '보통', fill: 62, tone: 'mid' },
    low: { label: '부족', fill: 30, tone: 'low' }
  };

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

  /* 담당 필터 칩 — 390px 폭에서 다섯 개가 한 줄에 들어가도록 이름을 쓴다. */
  var FILTERS = [{ id: 'all', label: '전체' }].concat(PARTS.map(function (p) {
    return { id: p.id, label: p.name };
  }));

  /* 사용 가이드 — 평소에는 숨겨 두고 헤더의 ? 를 누를 때만 연다.
     core 는 한 줄 요약, steps 는 화면에서 바로 하는 일, routine 은 언제
     보면 좋은지, note 는 알아 두면 좋은 것 하나.
     이 앱은 보기 전용 모니터링 현황판이라, 모든 문구에서 추가·체크·
     삭제 같은 조작 표현을 쓰지 않고 '채팅에서 시키고 여기서 확인한다'로 통일한다. */
  var GUIDE_ORDER = ['map', 'meeting', 'work', 'team', 'info'];

  var GUIDE = {
    map: {
      title: '오피스 맵',
      core: '네 사람의 상태와 토큰 한도를 한눈에 봐요.',
      steps: [
        '위 파티 바에서 상태·토큰 잔여·남은 일감을 봐요.',
        '캐릭터나 파티 칸을 누르면 그 비서의 현황이 열려요.',
        '모션·회의 소집·시간 날씨 칩은 화면 연출을 보는 기능이에요.'
      ],
      routine: '앱을 열 때 파티 바의 잔여 한도부터 확인해요.',
      note: '체력바는 각 AI의 남은 토큰(한도)이에요. 30% 이하는 주황, 15% 이하는 빨강이고, ⚡ 부스터는 클로드가 Opus로 일하는 중이라는 표시예요. 측정값이 없는 AI는 시킨 작업 수로 어림한 추정치라 ~17%처럼 물결표가 붙고, 회복 시각(별이 매일 04:00 · 클로드 매주 토 05:00 · GPT 마지막 사용 5시간 뒤 · 제미나이 매일 00:00)이 지나면 100%로 돌아와요.'
    },
    meeting: {
      title: '회의실',
      core: '채팅에서 논의 중인 주요 안건을 모아서 봐요.',
      steps: [
        '채팅에서 정한 안건이 여기에 올라와요.',
        '결정을 기다리는 안건은 진하게, 정리된 안건은 흐리게 보여요.',
        '안건을 정하고 마무리하는 건 피클 채팅에서 해요.'
      ],
      routine: '하루를 마칠 때 남은 안건이 있는지 한 번 봐요.',
      note: '모션을 켜 두면 회의 소집으로 네 사람이 회의실에 모이는 연출을 볼 수 있어요. 안건의 실제 논의는 채팅에서 이뤄져요.'
    },
    work: {
      title: '작업실',
      core: '채팅에서 맡긴 일의 진행 현황을 확인해요.',
      steps: [
        '진행 중·완료 상태와 담당 비서, 날짜를 한 줄씩 봐요.',
        '담당 칩으로 그 비서의 일만 골라 봐요.',
        '값이 늦으면 새로고침을 눌러 다시 읽어요.'
      ],
      routine: '오전에 한 번, 저녁에 한 번 진행률을 확인해요.',
      note: '여기는 보기만 하는 화면이에요. 일을 맡기거나 끝난 일을 정리하는 건 피클 채팅에서 해요. 💬 채팅 배지가 붙은 항목이 채팅에서 맡긴 일이에요.'
    },
    team: {
      title: '비서현황',
      core: '네 사람의 상태·일감·한도를 팀 현황판으로 봐요.',
      steps: [
        '지금 상태(가동·타자·회의·휴식)와 남은 일감을 봐요.',
        '토큰 막대와 회복 시각으로 한도가 언제 차는지 봐요.',
        '클로드 카드의 ⚡ 부스터는 지금 어느 모델로 일하는지 표시예요.'
      ],
      routine: '아침에 토큰 잔여와 진행 건수를 한 번 훑어요.',
      note: '상태 문구를 고치거나 가동을 끄는 조작은 없어요. 한도를 다시 맞추거나 쉬게 하려면 채팅에서 말해 주세요.'
    },
    info: {
      title: '동기화·안내',
      core: '현황판이 어디서 값을 받는지 확인해요.',
      steps: [
        '마지막 동기화 시각과 받은 작업·안건 수를 봐요.',
        '새로고침을 누르면 최신 파일을 다시 읽어요.',
        '한도 회복 주기와 모니터링 사용법을 여기서 봐요.'
      ],
      routine: '값이 이상하면 새로고침부터 한 번 눌러요.',
      note: '여기는 보기만 하는 화면이에요. 무엇이든 바꾸려면 피클 채팅에서 별이에게 말하면 돼요.'
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
      today: '채팅에서 맡긴 일은 작업실에서, 한도는 위 파티 바에서 확인할 수 있어요.',
      tab: 'map',
      focus: 'byeol',
      parts: {
        byeol: { status: '오늘 할 일 정리해 두었어요', active: true, boost: false, quota: defaultQuota('byeol') },
        gpt: { status: '새 글 기획안 쓰는 중', active: true, boost: false, quota: defaultQuota('gpt') },
        claude: { status: '자료 조사해서 정리 중', active: true, boost: false, quota: defaultQuota('claude') },
        gemini: { status: '표지 이미지 다듬는 중', active: true, boost: false, quota: defaultQuota('gemini') }
      },
      agenda: [],
      tasks: [],
      chatSyncedAt: 0,
      chatSyncedLabel: '',
      /* 예전 버전에서 지운 채팅 항목 기억 — 지금은 화면에서 지우지 않으므로 참고용으로만 남긴다 */
      dismissedChatIds: [],
      demoCleared: false,
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
    if (typeof raw.today === 'string' && raw.today.trim()) base.today = raw.today.slice(0, 120);
    base.motion = raw.motion !== false;
    if (['auto', 'morning', 'day', 'sunset', 'night'].indexOf(raw.envTime) >= 0) base.envTime = raw.envTime;
    if (['auto', 'clear', 'cloudy', 'rain', 'snow'].indexOf(raw.envWeather) >= 0) base.envWeather = raw.envWeather;
    if (['map', 'meeting', 'work', 'team', 'info'].indexOf(raw.tab) >= 0) base.tab = raw.tab;
    if (raw.tab === 'memo') base.tab = 'info';   /* 예전 5번째 탭 이름 */
    if (PART_MAP[raw.focus]) base.focus = raw.focus;

    if (raw.parts && typeof raw.parts === 'object') {
      PARTS.forEach(function (p) {
        var s = raw.parts[p.id];
        if (!s || typeof s !== 'object') return;
        if (typeof s.status === 'string') base.parts[p.id].status = s.status.slice(0, 40);
        if (typeof s.active === 'boolean') base.parts[p.id].active = s.active;
        if (typeof s.boost === 'boolean') base.parts[p.id].boost = s.boost;
        var q = s.quota;
        if (!q || typeof q !== 'object') return;
        var tq = base.parts[p.id].quota;
        if (typeof q.plan === 'string' && q.plan.trim()) tq.plan = q.plan.trim().slice(0, 12);
        if (typeof q.pct === 'number' && isFinite(q.pct)) tq.pct = clamp(Math.round(q.pct), 0, 100);
        else if (q.pct === null) {
          /* 한도가 '상태(여유·보통·부족)'만 있던 예전 값 — 확인 시각도 비워 둔다 */
          tq.pct = null;
          if (!(typeof q.checkedAt === 'number' && q.checkedAt > 0)) tq.checkedAt = 0;
        }
        if (QUOTA_LEVEL[q.level]) tq.level = q.level;
        if (typeof q.checkedAt === 'number' && q.checkedAt > 0) tq.checkedAt = q.checkedAt;
        if (q.est === true) tq.est = true;
        else if (q.est === false) tq.est = false;
        if (typeof q.lastResetAt === 'number' && q.lastResetAt > 0) tq.lastResetAt = q.lastResetAt;
        if (typeof q.lastUsedAt === 'number' && q.lastUsedAt > 0) tq.lastUsedAt = q.lastUsedAt;
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
        if (typeof item.date === 'string' && item.date) row.date = item.date.slice(0, 5);
        if (hasPart) {
          row.part = PART_MAP[item.part] ? item.part : (LEGACY_PARTS[item.part] || 'byeol');
          if (item.chat) row.chat = true;
        }
        out.push(row);
      });
      return out;
    };

    if (Array.isArray(raw.agenda)) base.agenda = clean(raw.agenda, false);
    if (Array.isArray(raw.tasks)) base.tasks = clean(raw.tasks, true);
    if (typeof raw.chatSyncedAt === 'number' && raw.chatSyncedAt > 0) base.chatSyncedAt = raw.chatSyncedAt;
    if (typeof raw.chatSyncedLabel === 'string') base.chatSyncedLabel = raw.chatSyncedLabel.slice(0, 16);
    if (raw.demoCleared === true) base.demoCleared = true;
    if (Array.isArray(raw.dismissedChatIds)) {
      base.dismissedChatIds = raw.dismissedChatIds.filter(function (id) {
        return typeof id === 'string' && !!id;
      }).slice(0, 300);
    }

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

  /* 화면 설정(모션·탭·시간 날씨 미리보기·필터)만 이 기기에 기억해 둔다.
     일·안건·한도는 data/office-state.json 이 정본이다. */
  function save() {
    state.updatedAt = Date.now();
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { /* private mode or full storage */ }
  }

  /* ---------------------------------------------------------
     채팅 작업 동기화 — 공개 JSON(data/office-state.json)
     채팅에서 맡긴 일은 저장소의 이 파일에 일반 작업명으로만 적힌다.
     앱은 열릴 때 한 번 읽어서 작업실 목록에 💬 채팅 배지로 합치고,
     작업실 위 새로고침으로 다시 읽는다. 파일이 없거나 네트워크가
     막히면 조용히 로컬 상태만 쓰고 앱은 그대로 동작한다.
     --------------------------------------------------------- */

  var CHAT_URL = './data/office-state.json';
  /* 처음 설치할 때 들어 있는 예시 할 일 — 사용자가 손대지 않았을 때만 걷어 낸다. */
  var DEMO_TASK_IDS = { t1: 1, t2: 1, t3: 1, t4: 1, t5: 1 };
  var chatBusy = false;

  function hhmm(ts) {
    var d = new Date(ts || Date.now());
    return pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }

  /* '11.28 15:35' — JSON 에 적힌 시각을 그대로 보여 준다(보는 기기의
     시간대에 따라 달라지지 않게). */
  function isoLabel(iso) {
    var m = /^\d{4}-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso || '');
    if (!m) return '';
    return Number(m[1]) + '.' + Number(m[2]) + ' ' + m[3] + ':' + m[4];
  }

  /* '11.28' 같은 날짜를 그날 09:00 으로 옮긴다. 연도가 적혀 있지 않으니
     올해·지난해·내년 중 지금과 가장 가까운 날로 본다(12.01 예정 일감이
     지난해로 밀리지 않게). */
  function chatTaskAt(dateStr, fallback, idx) {
    var m = /^(\d{1,2})\.(\d{1,2})$/.exec(dateStr || '');
    if (m) {
      var now = new Date();
      var nowTs = now.getTime();
      var best = 0;
      for (var k = -1; k <= 1; k++) {
        var d = new Date(now.getFullYear() + k, Number(m[1]) - 1, Number(m[2]), 9, 0, 0, 0);
        var ts = d.getTime();
        if (!best || Math.abs(ts - nowTs) < Math.abs(best - nowTs)) best = ts;
      }
      return best;
    }
    return (fallback || Date.now()) - idx * 60000;
  }

  function mergeRemote(data) {
    var out = { ok: false, added: 0, changed: false };
    if (!data || typeof data !== 'object') return out;
    out.ok = true;
    var remoteAt = Date.parse(data.updatedAt || '') || Date.now();

    /* 토큰 잔여 — 파일의 tokens(또는 예전 형식인 claudeTokenPct)가 로컬에서
       마지막으로 맞긴 시각보다 최신일 때만 반영한다. 사용자가 방금 손으로
       맞긴 값을 원격이 덮어쓰지 않게 하는 기준이다. */
    var tokens = (data.tokens && typeof data.tokens === 'object') ? data.tokens : null;
    PARTS.forEach(function (p) {
      var t = tokens ? tokens[p.id] : null;
      if (!t && p.id === 'claude' && data.claudeTokenPct != null) {
        t = { pct: data.claudeTokenPct, asOf: data.claudeCheckedAt, basis: 'measured' };
      }
      if (!t || typeof t !== 'object') return;
      if (typeof t.pct !== 'number' || !isFinite(t.pct)) return;
      if (!state.parts[p.id]) return;
      var q = state.parts[p.id].quota;
      var asOf = Date.parse(t.asOf || data.updatedAt || '') || remoteAt;
      /* 같은 시각이면 값 비교로 넘어간다(기본값과 파일 값이 같은 순간에 찍힌 경우) */
      if (asOf < (q.checkedAt || 0)) return;
      var nextPct = clamp(Math.round(t.pct), 0, 100);
      var nextEst = t.basis ? t.basis === 'estimate' : !!q.est;
      if (nextPct === q.pct && nextEst === !!q.est) return;
      q.pct = nextPct;
      q.est = nextEst;
      q.checkedAt = asOf;
      out.changed = true;
    });

    /* 모니터링 현황판은 채팅이 적어 둔 값을 그대로 보여 준다.
       예전 버전이 넣어 둔 예시 할 일(t1~t5)은 실제 일이 아니므로 걷어 낸다. */
    var before = state.tasks.length;
    state.tasks = state.tasks.filter(function (t) { return !DEMO_TASK_IDS[t.id]; });
    if (state.tasks.length !== before) out.changed = true;

    /* 오늘의 브리핑 요약 — 파일의 brief(또는 예전 이름 today)를 읽기 전용으로 보여 준다. */
    var brief = typeof data.brief === 'string' ? data.brief
      : (typeof data.today === 'string' ? data.today : '');
    brief = brief.replace(/\s+/g, ' ').trim().slice(0, 160);
    if (brief && brief !== state.today) { state.today = brief; out.changed = true; }

    /* 부스터 모드 표시 — 채팅에서 정한 값이 파일에 실려 오면 그대로 따른다. */
    var boost = (data.boost && typeof data.boost === 'object') ? data.boost : null;
    if (boost) PARTS.forEach(function (p) {
      if (typeof boost[p.id] !== 'boolean' || !state.parts[p.id]) return;
      if (state.parts[p.id].boost === boost[p.id]) return;
      state.parts[p.id].boost = boost[p.id];
      out.changed = true;
    });

    /* 안건 — 채팅에서 오간 주요 안건을 목록째 받아 보여 준다. 안건의
       내용과 진행 상태는 채팅이 정하고, 앱은 그대로 비추기만 한다. */
    if (Array.isArray(data.agenda)) {
      var nextAgenda = [];
      data.agenda.forEach(function (row, i) {
        if (!row || typeof row !== 'object') return;
        var aTitle = typeof row.title === 'string' ? row.title.trim().slice(0, 80) : '';
        if (!aTitle) return;
        var aDate = typeof row.date === 'string' ? row.date.slice(0, 5) : '';
        nextAgenda.push({
          id: typeof row.id === 'string' && row.id ? row.id : 'ag' + i,
          title: aTitle,
          done: row.done === true,
          date: aDate,
          at: chatTaskAt(aDate, remoteAt, i)
        });
      });
      var sig = function (a) { return [a.id, a.title, !!a.done, a.date || '']; };
      if (JSON.stringify(nextAgenda.map(sig)) !== JSON.stringify(state.agenda.map(sig))) {
        state.agenda = nextAgenda;
        out.changed = true;
      }
    }

    var rows = Array.isArray(data.tasks) ? data.tasks : [];
    rows.forEach(function (row, i) {
      if (!row || typeof row !== 'object') return;
      if (row.source && row.source !== 'chat') return;
      if (typeof row.id !== 'string' || !row.id) return;
      var title = typeof row.title === 'string' ? row.title.trim().slice(0, 80) : '';
      if (!title) return;
      var part = PART_MAP[row.owner] ? row.owner : 'byeol';
      var done = row.done === true;
      var date = typeof row.date === 'string' ? row.date.slice(0, 5) : '';

      var hit = null;
      state.tasks.forEach(function (t) { if (t.id === row.id) hit = t; });
      if (hit) {
        /* 이미 있는 항목은 완료 쪽으로만 맞춘다 — 로컬에서 체크한 것을
           원격이 되돌리지 않는다. */
        if (!hit.chat) { hit.chat = true; out.changed = true; }
        if (hit.title !== title) { hit.title = title; out.changed = true; }
        if (done && !hit.done) { hit.done = true; out.changed = true; }
        if (date && hit.date !== date) { hit.date = date; out.changed = true; }
        return;
      }

      state.tasks.push({
        id: row.id,
        title: title,
        part: part,
        done: done,
        at: chatTaskAt(date, remoteAt, i),
        date: date,
        chat: true
      });
      out.added += 1;
      out.changed = true;
    });

    if (remoteAt > state.chatSyncedAt) {
      state.chatSyncedAt = remoteAt;
      state.chatSyncedLabel = isoLabel(data.updatedAt) || (shortDate(remoteAt) + ' ' + hhmm(remoteAt));
      out.changed = true;
    }
    return out;
  }

  /* 마지막 동기화 시각과 건수 — 작업실·회의실·동기화·안내가 같은 값을 함께 쓴다. */
  function chatSyncText() {
    var label = state.chatSyncedLabel
      || (state.chatSyncedAt ? shortDate(state.chatSyncedAt) + ' ' + hhmm(state.chatSyncedAt) : '');

    var el = $('#syncText');
    if (el) {
      el.textContent = label ? '채팅 동기화 · ' + label : '채팅 동기화 · 대기 중';
      var n = state.tasks.filter(function (t) { return t.chat && !t.done; }).length;
      var cnt = $('#syncCount');
      if (cnt) cnt.textContent = n ? n + '건 진행' : '모두 완료';
    }

    var open = state.tasks.filter(function (t) { return !t.done; }).length;
    var done = state.tasks.length - open;
    var when = $('#infoSyncWhen');
    if (when) when.textContent = label || '대기 중';
    var counts = $('#infoSyncCounts');
    if (counts) counts.textContent = state.tasks.length ? '진행 ' + open + ' · 완료 ' + done : '없음';

    var openA = state.agenda.filter(function (a) { return !a.done; }).length;
    var agCounts = $('#infoAgendaCounts');
    if (agCounts) {
      agCounts.textContent = state.agenda.length
        ? '진행 ' + openA + ' · 정리 ' + (state.agenda.length - openA) : '없음';
    }
    var agTxt = $('#agendaSyncText');
    if (agTxt) agTxt.textContent = label ? '동기화 · ' + label : '동기화 · 대기 중';
    var agCnt = $('#agendaSyncCount');
    if (agCnt) agCnt.textContent = state.agenda.length ? openA + '건 진행' : '';
  }

  function setChatBusy(on) {
    chatBusy = !!on;
    var bar = $('#syncBar');
    if (bar) bar.classList.toggle('is-busy', chatBusy);
    $$('.syncbar__btn, .btn-mini').forEach(function (btn) {
      btn.disabled = chatBusy;
      btn.textContent = chatBusy ? '불러오는 중' : '새로고침';
    });
  }

  function renderAfterSync() {
    renderHeader();
    renderCrew();
    renderAgenda();
    renderTasks();
    renderTeam();
    renderInfo();
    chatSyncText();
    if (ui.sheet) renderSheet();
  }

  function syncChatTasks(manual) {
    if (chatBusy || typeof window.fetch !== 'function') return;
    setChatBusy(true);
    var finish = function (msg) {
      setChatBusy(false);
      if (manual && msg) toast(msg);
    };
    window.fetch(CHAT_URL + '?t=' + Date.now(), { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        var out = mergeRemote(data);
        if (out.changed) {
          save();
          renderAfterSync();
        } else {
          chatSyncText();
        }
        finish(manual
          ? (out.added ? '채팅 작업 ' + out.added + '건을 새로 받았어요' : '이미 최신 목록이에요')
          : '');
      })
      .catch(function () {
        /* 파일이 없거나 오프라인이면 조용히 로컬 상태로 둔다 */
        finish('채팅 목록을 못 불러왔어요 · 저장된 목록으로 보여드릴게요');
      });
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
        '캐릭터를 누르면 그 비서의 현황이 열려요';
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
    var txt = act ? act + '인 가동 중' : '전원 휴식';
    $('#brandSub').textContent = '실시간 현황판 · ' + txt;
    $('#todayBadge').textContent = '모니터링 중';
    $('#liveDot').classList.toggle('is-off', act === 0);

    var openAgenda = state.agenda.filter(function (a) { return !a.done; }).length;
    $('#meetingDot').hidden = openAgenda === 0;
    $('#meetingMeta').textContent = openAgenda ? '안건 ' + openAgenda + '건' : '지금은 한가해요';

    var openTasks = state.tasks.filter(function (t) { return !t.done; }).length;
    $('#workMeta').textContent = openTasks ? '진행 ' + openTasks + '건' : '전부 정리됨';

    var d = new Date();
    $('#brandDate').textContent = (d.getMonth() + 1) + '.' + d.getDate() + ' ' + WEEK[d.getDay()];

    $('#todayEyebrow').innerHTML = '<b class="eyebrow__nick">' + esc(state.nick || '대표님') +
      '</b> · ' + esc(greeting());

    var brief = $('#todayBrief');
    if (brief) {
      brief.textContent = state.today ||
        '채팅에서 맡긴 일은 작업실에서, 한도는 위 파티 바에서 확인할 수 있어요.';
    }

    $('#todayStats').textContent = '진행 ' + openTasks + ' · 안건 ' + openAgenda;

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
     이름·상태점·남은 일감과 함께, 게이지는 '남은 일감'이 아니라
     각 AI의 토큰(사용 한도) 잔여를 보여 준다. 한도 %를 주는 계정
     (클로드)은 실제 잔여 %, %가 없는 무료 플랜은 상태(여유·보통·부족)를
     게이지 길이로 옮긴다. 30% 이하는 주황, 15% 이하는 빨강.
     칸을 누르면 그 비서의 방(시트)이 열린다.
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

  /* 남은 토큰 — pct 가 있으면 그 값이, 없으면 고른 상태가 게이지가 된다. */
  function quotaOf(id) {
    return (state.parts[id] && state.parts[id].quota) || defaultQuota(id);
  }

  function quotaView(q) {
    if (q.pct == null) {
      var lv = QUOTA_LEVEL[q.level] || QUOTA_LEVEL.plenty;
      return { fill: lv.fill, tone: lv.tone, pct: null, text: lv.label };
    }
    var pct = clamp(Math.round(q.pct), 0, 100);
    /* 추정치는 앞에 '~' 를 붙여 실측값과 구분한다 */
    var txt = (q.est ? '~' : '') + pct + '%';
    return { fill: pct, tone: pct <= 15 ? 'low' : pct <= 30 ? 'mid' : 'high', pct: pct, text: txt };
  }

  function boostOn(id) {
    return !!(state.parts[id] && state.parts[id].boost);
  }

  /* ---------------------------------------------------------
     토큰 잔여 어림 + 회복
     측정값이 없는 AI(별이·GPT·제미나이)는 기준값에서 시작해, 작업을
     한 건 맡길 때마다 대략치만큼 까는다. 정해진 회복 시각(별이 매일
     04:00 · 클로드 매주 토 05:00 · 제미나이 매일 00:00)이 지나거나
     GPT 는 마지막 사용에서 5시간이 지나면 100% 로 돌아온다.
     --------------------------------------------------------- */

  /* 가장 최근에 지난 회복 시각(일간·주간). 기기 시간대 기준. */
  function lastResetBoundary(rule, now) {
    var d = new Date(now);
    var base = new Date(d.getFullYear(), d.getMonth(), d.getDate(), rule.hour, 0, 0, 0);
    if (rule.kind === 'daily') {
      if (base.getTime() > now) base.setDate(base.getDate() - 1);
      return base.getTime();
    }
    var diff = (base.getDay() - rule.dow + 7) % 7;
    base.setDate(base.getDate() - diff);
    if (base.getTime() > now) base.setDate(base.getDate() - 7);
    return base.getTime();
  }

  /* 회복 시각이 지났으면 100% 로 되돌리고, 안 지났으면 그대로 둔다.
     lastResetAt 이 비어 있으면 지금 기준선만 기억해(처음 열 때 깎인
     값을 바로 100% 로 날리지 않으려고). */
  function refreshQuota(id, now) {
    var q = quotaOf(id);
    var rule = QUOTA_RESET[id];
    if (!rule) return false;
    now = now || Date.now();
    if (rule.kind === 'rolling') {
      if (!q.lastUsedAt) {
        q.lastUsedAt = q.checkedAt || now;
        return true;
      }
      if (q.pct != null && q.pct < 100 && now - q.lastUsedAt >= rule.hours * 3600000) {
        q.pct = 100;
        q.est = false;   /* 회복 시점의 100%는 짐작이 아니라 확정값 */
        q.checkedAt = q.lastUsedAt + rule.hours * 3600000;
        q.lastResetAt = q.checkedAt;
        return true;
      }
      return false;
    }
    var b = lastResetBoundary(rule, now);
    if (!q.lastResetAt) {
      q.lastResetAt = b;
      return true;
    }
    if (b > q.lastResetAt) {
      q.lastResetAt = b;
      if (q.pct != null && q.pct < 100) {
        q.pct = 100;
        q.est = false;   /* 회복 시점의 100%는 확정값 */
        q.checkedAt = b;
      }
      return true;
    }
    return false;
  }

  function refreshAllQuotas() {
    var changed = false;
    PARTS.forEach(function (p) {
      if (refreshQuota(p.id)) changed = true;
    });
    return changed;
  }

  /* 칸 아래 한 줄 — 'Pro 97%' / '무료 ~17%' / '무료 · 여유'
     부스터 배지가 함께 서면 자리가 좁아 플랜 이름은 빼고 잔여만 남긴다. */
  function quotaLabel(q, v, boost) {
    if (v.pct == null) return q.plan + ' · ' + v.text;
    return (boost ? '' : q.plan + ' ') + v.text;
  }

  function quotaAria(q, v) {
    if (v.pct == null) return '무료 ' + v.text;
    return (q.est ? '추정 ' : '') + v.pct + '% 남음';
  }

  function partyCellHTML(p) {
    var key = partyStateOf(p.id);
    var meta = PARTY_STATE[key];
    var open = tasksOf(p.id, false).length;
    var q = quotaOf(p.id);
    var v = quotaView(q);
    var boost = boostOn(p.id);
    var aria = p.name + (boost ? ' 부스터 모드' : '') + ' ' + meta.long + ' · 토큰 ' +
      quotaAria(q, v) + ' · 남은 일 ' + open + '건 · 방 열기';
    return '<button class="pm' + (boost ? ' is-boost' : '') + '" type="button" data-action="open-room" data-part="' +
      p.id + '" data-state="' + key + '" data-tone="' + v.tone + '"' +
      ' style="--c:' + p.color + ';--soft:' + p.soft + ';--edge:' + p.color + '55;--fill:' + v.fill + '%"' +
      ' aria-label="' + esc(aria) + '">' +
      '<span class="pm__top">' +
        '<span class="pm__ico">' + avatarSVG(p.id) + '</span>' +
        '<span class="pm__name">' + esc(p.name) + '</span>' +
        '<i class="pm__dot"></i>' +
      '</span>' +
      '<span class="pm__meta"><span class="pm__st">' + meta.label + '</span>' +
        '<span class="pm__n">' + open + '건</span></span>' +
      '<span class="pm__bar"><i></i></span>' +
      '<span class="pm__tk"><span class="pm__tk-t">' + esc(quotaLabel(q, v, boost)) + '</span>' +
        (boost ? '<i class="pm__boost" aria-hidden="true">⚡ 부스터</i>' : '') + '</span>' +
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
        ' · 토큰 잔여</span></div>' +
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
      var q = quotaOf(id);
      var v = quotaView(q);
      var boost = boostOn(id);
      cell.setAttribute('data-state', key);
      cell.setAttribute('data-tone', v.tone);
      cell.style.setProperty('--fill', v.fill + '%');
      cell.classList.toggle('is-boost', boost);
      var st = $('.pm__st', cell);
      if (st) st.textContent = meta.label;
      var n = $('.pm__n', cell);
      if (n) n.textContent = open + '건';
      var tk = $('.pm__tk-t', cell);
      if (tk) tk.textContent = quotaLabel(q, v, boost);
      cell.setAttribute('aria-label', p.name + (boost ? ' 부스터 모드' : '') + ' ' + meta.long +
        ' · 토큰 ' + quotaAria(q, v) + ' · 남은 일 ' + open + '건 · 방 열기');
    });
  }

  /* ---------------------------------------------------------
     토큰 한도 패널 — 방 시트와 비서현황에서 같은 것을 쓴다.
     %를 주는 계정은 슬라이더로 실제 잔여 %를 맞추고, 무료 플랜은
     여유·보통·부족 셋 중 하나를 고른다.
     --------------------------------------------------------- */

  var QUOTA_HINT = {
    claude: '11.28 15:00 claude.ai › 설정 › 사용량 확인: 이번 주 3% 사용(잔여 97%, 12.5 05:00 초기화) · 현재 세션 10% 사용(잔여 90%, 오늘 16:30 초기화). 이 값은 그렇게 확인한 실측값이고, 채팅에서 작업을 맡길 때마다 1건당 대략 -4%(부스터 -8%)씩 깎인 추정치로 바뀝니다.',
    byeol: '별이(피클)는 일일 한도를 %로 보여 주지 않아요. 11.28 15:37 확인한 일일 잔여 17%를 기준으로, 맡긴 작업 수만큼 대략 -8%씩 깎은 추정치입니다. 매일 04:00에 100%로 회복합니다.',
    gpt: 'ChatGPT 무료 플랜은 한도 %를 보여 주지 않아요. 오늘 작업량으로 잰 92%에서 작업 1건당 대략 -10%씩 깎은 추정치이고, 마지막 사용에서 5시간이 지나면 100%로 회복합니다.',
    gemini: '제미나이 무료 플랜은 한도 %를 보여 주지 않아요. 오늘 작업량으로 잰 90%에서 작업 1건당 대략 -8%씩 깎은 추정치이고, 매일 00:00에 100%로 회복합니다.',
    free: '무료 플랜은 사용량 %를 보여 주지 않아 지어내지 않고 상태만 표시해요.'
  };

  /* 토큰 한도 패널 — 보기 전용. 막대와 숫자, 기준 시각, 회복 주기만 보여 준다.
     잔여 %는 채팅에서 확인한 값을 data/office-state.json 의 tokens 로 받아 온다. */
  function quotaPanelHTML(p, compact) {
    var q = quotaOf(p.id);
    var v = quotaView(q);
    var pctMode = q.pct != null;
    var when = (q.est ? '추정 ' : '실측 ') +
      (q.checkedAt ? shortDate(q.checkedAt) + ' ' + timeLabel(q.checkedAt) : '확인 전') + ' 기준';
    return '<div class="quota' + (compact ? ' quota--compact' : '') + '" data-quota-box="' + p.id + '">' +
      '<div class="quota__head">' +
        '<span class="quota__plan">' + esc(p.name) + ' · ' + esc(q.plan) + '</span>' +
        '<span class="quota__num" data-quota-val="' + p.id + '">' +
          esc(v.pct == null ? v.text : v.text + ' 남음') + '</span>' +
      '</div>' +
      '<div class="quota__bar" data-quota-bar="' + p.id + '" data-tone="' + v.tone + '">' +
        '<i style="width:' + v.fill + '%"></i></div>' +
      (compact ? '' : '<p class="quota__hint">' + esc(QUOTA_HINT[p.id] || QUOTA_HINT.free) + '</p>') +
      (pctMode ? '<div class="quota__foot">' +
          (p.id === 'claude'
            ? '<a class="quota__btn" href="https://claude.ai/settings/usage" target="_blank" rel="noopener">사용량 열어 확인</a>'
            : '') +
        '</div>' : '') +
      (pctMode ? '<p class="quota__when">' + esc(when) + '</p>' : '') +
      (pctMode && QUOTA_RECOVER[p.id]
        ? '<p class="quota__when quota__when--reset">' + esc(QUOTA_RECOVER[p.id]) + '</p>' : '') +
    '</div>';
  }

  /* 클로드 부스터 모드 — 지금 Opus(상위 모델)로 일하는 중이라는 표시.
     켜고 끄는 건 채팅에서 '부스터 모드'라고 말하면 된다. */
  function boostPanelHTML(p) {
    var on = boostOn(p.id);
    return '<div class="boost' + (on ? ' is-on' : '') + '">' +
      '<div class="boost__top">' +
        '<span class="boost__title"><i aria-hidden="true">⚡</i>부스터 모드</span>' +
        '<span class="state-badge' + (on ? ' is-on' : '') + '">' + (on ? 'ON' : 'OFF') + '</span>' +
      '</div>' +
      '<p class="boost__desc">Opus 부스터 모드 · 고난도 분석/작성</p>' +
      '<p class="boost__hint">' + (on
        ? '지금 클로드가 Opus로 일하고 있어요. 파티 칸에도 ⚡ 부스터 배지가 붙습니다.'
        : '켜고 끄는 건 채팅에서 "부스터 모드로 해줘"처럼 말하면 돼요. 여기서는 상태만 보여요.') + '</p>' +
    '</div>';
  }

  /* 여기서부터는 전부 읽기 전용 렌더다 — 체크·삭제·입력 버튼을 만들지 않는다.
     값은 채팅이 적어 둔 data/office-state.json 을 따른다. */

  function taskItemHTML(t) {
    var p = PART_MAP[t.part] || PARTS[0];
    return '<li class="item item--read' + (t.done ? ' item--done' : '') + '">' +
      '<span class="state-pill' + (t.done ? ' is-done' : '') + '">' + (t.done ? '완료' : '진행 중') + '</span>' +
      '<div class="item__body">' +
        '<p class="item__title">' + esc(t.title) + '</p>' +
        '<p class="item__meta">' +
          '<span class="tag-chip" style="background:' + p.soft + ';color:' + p.deep + '">' +
          esc(p.name) + '</span>' +
          '<span>' + esc(t.date || shortDate(t.at)) + '</span>' +
          (t.chat ? '<span class="chat-badge">💬 채팅</span>' : '') +
        '</p>' +
      '</div>' +
    '</li>';
  }

  function agendaItemHTML(a) {
    return '<li class="item item--read' + (a.done ? ' item--done' : '') + '">' +
      '<span class="state-pill' + (a.done ? ' is-done' : '') + '">' + (a.done ? '정리됨' : '결정 대기') + '</span>' +
      '<div class="item__body">' +
        '<p class="item__title">' + esc(a.title) + '</p>' +
        '<p class="item__meta"><span>' + esc(a.date || shortDate(a.at)) + '</span>' +
          '<span>💬 채팅 안건</span></p>' +
      '</div>' +
    '</li>';
  }

  function renderAgenda() {
    var list = state.agenda.slice().sort(function (a, b) {
      if (a.done !== b.done) return a.done ? 1 : -1;
      return (b.at || 0) - (a.at || 0);
    });
    var ul = $('#agendaList');
    if (ul) ul.innerHTML = list.map(agendaItemHTML).join('');
    var empty = $('#agendaEmpty');
    if (empty) empty.hidden = list.length > 0;
    chatSyncText();
  }

  function renderTasks() {
    var ul = $('#taskList');
    if (!ul) return;
    var list = state.tasks.slice().sort(sortTask);
    if (ui.filter !== 'all') {
      list = list.filter(function (t) { return t.part === ui.filter; });
    }
    ul.innerHTML = list.map(taskItemHTML).join('');
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

    chatSyncText();
  }

  /* 회복 시각 짧은 표기 — 비서현황과 안내 탭에서 쓴다. */
  var RESET_LABEL = {
    byeol: '매일 04:00',
    gpt: '마지막 사용 5시간 뒤',
    claude: '매주 토 05:00',
    gemini: '매일 00:00'
  };

  function agentHTML(p) {
    var st = state.parts[p.id];
    var n = tasksOf(p.id, false).length;
    var q = quotaOf(p.id);
    var v = quotaView(q);
    var key = partyStateOf(p.id);
    var meta = PARTY_STATE[key];
    return '<article class="agent' + (st.active ? '' : ' is-off') + '" style="--c:' + p.color +
      ';--soft:' + p.soft + '">' +
      '<div class="agent__top">' +
        '<div class="agent__avatar">' + avatarSVG(p.id) + '</div>' +
        '<div class="agent__id">' +
          '<h3 class="agent__name">' + esc(p.name) + '</h3>' +
          '<p class="agent__role">' + esc(p.room) + ' · ' + esc(p.role) + '</p>' +
        '</div>' +
        '<span class="state-badge" data-state="' + key + '">' + esc(meta.label) + '</span>' +
      '</div>' +
      '<p class="agent__persona">' + esc(p.persona) + '</p>' +
      '<p class="agent__line"><span class="agent__line-k">지금</span>' + esc(st.status) + '</p>' +
      quotaPanelHTML(p, true) +
      '<div class="agent__foot">' +
        '<span class="pill-soft">남은 일 ' + n + '건</span>' +
        '<span class="pill-soft">회복 ' + esc(RESET_LABEL[p.id] || '') + '</span>' +
        (p.id === 'claude'
          ? '<span class="boost-chip' + (boostOn(p.id) ? ' is-on' : '') + '">⚡ 부스터 ' +
            (boostOn(p.id) ? 'ON' : 'OFF') + '</span>'
          : '') +
        '<button class="link" type="button" data-action="go-work" data-part="' + p.id + '">일 보기 →</button>' +
      '</div>' +
    '</article>';
  }

  function renderTeam() {
    var el = $('#teamList');
    if (el) el.innerHTML = PARTS.map(agentHTML).join('');
  }

  /* 동기화·안내 탭 — 한도 회복 주기 표 */
  function renderResetList() {
    var el = $('#resetList');
    if (!el) return;
    el.innerHTML = PARTS.map(function (p) {
      var q = quotaOf(p.id);
      var v = quotaView(q);
      var cost = QUOTA_COST[p.id] || 0;
      return '<div class="reset-row" style="--c:' + p.color + ';--soft:' + p.soft + '">' +
        '<span class="reset-row__ico">' + avatarSVG(p.id) + '</span>' +
        '<span class="reset-row__id"><b>' + esc(p.name) + '</b>' +
          '<small>' + esc(q.plan) + ' · 작업 1건당 -' + cost + '%' +
          (p.id === 'claude' ? ' (부스터 -' + QUOTA_COST.claudeBoost + '%)' : '') + '</small></span>' +
        '<span class="reset-row__v"><b>' + esc(v.text) + '</b>' +
          '<small>회복 ' + esc(RESET_LABEL[p.id] || '') + '</small></span>' +
      '</div>';
    }).join('');
  }

  function renderInfo() {
    renderResetList();
    chatSyncText();
  }

  function renderAll() {
    renderHeader();
    renderMap();
    renderCrew();
    renderAgenda();
    renderTasks();
    renderTeam();
    renderInfo();
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

  /* 방 시트 — 비서 한 명의 현황을 보기만 하는 화면.
     상태 문구·할 일 입력, 완료 체크, 삭제, 가동 스위치는 없다. */
  function renderSheet() {
    var target = ui.sheet;
    if (!target) return;
    if (target.type === 'help') { renderGuide(target.gtab); return; }

    var head = $('#sheetHead');
    var body = $('#sheetBody');

    var p = PART_MAP[target.id];
    if (!p) return;
    var st = state.parts[p.id];
    var q = quotaOf(p.id);
    var v = quotaView(q);
    var key = partyStateOf(p.id);
    var meta = PARTY_STATE[key];
    var list = tasksOf(p.id, true).sort(sortTask);
    var openN = list.filter(function (t) { return !t.done; }).length;

    head.style.setProperty('--c', p.color);
    head.innerHTML = '<div class="sheet__avatar" style="background:' + p.soft + '">' + avatarSVG(p.id) + '</div>' +
      '<div class="sheet__id"><h3 class="sheet__title" id="sheetTitle">' + esc(p.name) + '</h3>' +
      '<p class="sheet__sub">' + esc(p.room) + ' · ' + esc(p.role) + '</p>' +
      '<p class="sheet__persona"><i aria-hidden="true">“</i>' + esc(p.persona) + '<i aria-hidden="true">”</i></p></div>' +
      '<span class="state-badge" data-state="' + key + '">' + esc(meta.label) + '</span>';

    body.innerHTML =
      '<p class="sheet__status"><span class="sheet__status-k">지금</span>' + esc(st.status) + '</p>' +
      '<div class="sheet__row"><h4 class="sheet__h4">토큰 한도</h4>' +
        '<span class="sheet__count">' + esc(q.plan) + (v.pct == null ? ' · 상태 표시' : ' · 남은 한도') + '</span></div>' +
      quotaPanelHTML(p) +
      (p.id === 'claude' ? boostPanelHTML(p) : '') +
      '<div class="sheet__row"><h4 class="sheet__h4">배정된 작업</h4>' +
        '<span class="sheet__count">' + (openN ? openN + '건 진행 중' : '전부 정리됨') + '</span></div>' +
      (list.length
        ? '<ul class="list list--compact">' + list.map(taskItemHTML).join('') + '</ul>'
        : '<p class="field__hint">아직 배정된 작업이 없어요.</p>') +
      '<p class="sheet__note">여기서는 보기만 해요. 작업 지시와 상태 변경은 피클 채팅에서 해 주세요.</p>' +
      '<button class="btn btn--ghost btn--full" type="button" data-action="go-work" data-part="' +
        p.id + '">작업실에서 전체 보기</button>';
  }

  /* ---------------------------------------------------------
     actions
     --------------------------------------------------------- */

  function setTab(name, silent) {
    if (['map', 'meeting', 'work', 'team', 'info'].indexOf(name) < 0) name = 'map';
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

    /* 이 화면에는 입력·수정·삭제 조작이 없다. 클릭은 탭 이동·조회·
       새로고침·화면 연출(모션·회의·시간 날씨)뿐이다. */
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
        case 'sync-chat':
          syncChatTasks(true);
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
          renderTasks();
          break;
        default:
          break;
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && ui.sheet) closeSheet();
    });

    window.addEventListener('resize', function () {
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
    document.body.classList.toggle('motion', state.motion);
    document.body.classList.toggle('no-motion', !state.motion);
    $('#motionBtn').setAttribute('aria-checked', state.motion ? 'true' : 'false');
    $('#motionState').textContent = state.motion ? 'ON' : 'OFF';

    bind();
    if (refreshAllQuotas()) save();
    renderAll();
    setTab(state.tab || 'map', true);
    startBubbleLoop();
    startMotionLoop();
    syncChatTasks();
    /* 회복 시각이 지나면 앱을 켜 둔 상태에서도 막대가 저절로 찬다 */
    window.setInterval(function () {
      if (!refreshAllQuotas()) return;
      save();
      renderParty();
      renderTeam();
      renderInfo();
      if (ui.sheet) renderSheet();
    }, 60000);

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

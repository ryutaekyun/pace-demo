/* ══════════════════════════════════════════════════════════
   PACE 통합 인증 — 데모용 클라이언트 시뮬레이션
   이 사이트는 GitHub Pages(정적 호스팅)로 서버·DB가 없다.
   계정 데이터는 이 브라우저의 localStorage에만 저장되며,
   다른 사람의 브라우저·기기와 공유되지 않는다. 실제 인증 보안이
   아니라 회원가입→승인→로그인 흐름을 보여주기 위한 시연 장치이다.
   실서비스 전환 시 서버 인증·회원 DB로 반드시 교체해야 한다.
   ══════════════════════════════════════════════════════════ */
(function (global) {
  const UKEY = 'pace-users-v1';
  const SKEY = 'pace-session-v1';

  async function sha256(text) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function seed() {
    const s = [
      {id:'U-ADMIN', org:'TENOPA', bizno:'', name:'홍길동', email:'admin@tenopa.co.kr', username:'admin',
       pw:'240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', role:'admin', status:'approved',
       createdAt:'2026-08-01', note:'시연용 관리자 계정 · 비밀번호 admin123'},
      {id:'U-001', org:'㈜퓨처센싱', bizno:'312-81-00008', name:'류태경', email:'contact@futuresensing.example', username:'futuresensing',
       pw:'0ead2060b65992dca4769af601a1b3a35ef38cfad2c2c465bb160ea764157c5d', role:'company', status:'approved',
       createdAt:'2026-08-10', note:'시연용 응답기업 계정 · 비밀번호 demo1234'},
      {id:'U-002', org:'㈜대한소재과학', bizno:'214-86-00002', name:'김담당', email:'kim@daehan.example', username:'daehan',
       pw:null, role:'company', status:'pending', createdAt:'2026-08-28', note:'승인 대기 시연용 신청 건(비밀번호 미설정 — 승인 후 재가입 필요)'},
    ];
    localStorage.setItem(UKEY, JSON.stringify(s));
    return s;
  }

  function loadUsers() {
    try {
      const raw = localStorage.getItem(UKEY);
      if (!raw) return seed();
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || !parsed.length) return seed();
      return parsed;
    } catch (e) { return seed(); }
  }
  function saveUsers(u) { try { localStorage.setItem(UKEY, JSON.stringify(u)); } catch (e) {} }

  function currentUser() {
    try {
      const id = localStorage.getItem(SKEY);
      if (!id) return null;
      return loadUsers().find(u => u.id === id) || null;
    } catch (e) { return null; }
  }

  async function signup({org, bizno, name, email, username, password}) {
    org = (org || '').trim(); name = (name || '').trim(); username = (username || '').trim();
    if (!org || !name || !username || !password) return {ok:false, error:'기관명·담당자명·아이디·비밀번호는 필수입니다.'};
    if (password.length < 4) return {ok:false, error:'비밀번호는 4자 이상이어야 합니다.'};
    const users = loadUsers();
    if (users.some(u => u.username === username)) return {ok:false, error:'이미 사용 중인 아이디입니다.'};
    const pw = await sha256(password);
    const u = {id:'U-' + Date.now(), org, bizno:(bizno || '').trim(), name, email:(email || '').trim(),
               username, pw, role:'company', status:'pending', createdAt:new Date().toISOString().slice(0, 10)};
    users.push(u); saveUsers(users);
    return {ok:true, user:u};
  }

  async function login(username, password) {
    username = (username || '').trim();
    const users = loadUsers();
    const u = users.find(x => x.username === username);
    if (!u) return {ok:false, error:'존재하지 않는 아이디입니다.'};
    if (u.status === 'pending') return {ok:false, error:'관리자 승인 대기 중인 계정입니다. 승인 후 다시 시도하세요.'};
    if (u.status === 'rejected') return {ok:false, error:'승인이 거절된 계정입니다. 관리자에게 문의하세요.'};
    const pw = await sha256(password || '');
    if (u.pw !== pw) return {ok:false, error:'비밀번호가 일치하지 않습니다.'};
    try { localStorage.setItem(SKEY, u.id); } catch (e) {}
    return {ok:true, user:u};
  }

  function logout() { try { localStorage.removeItem(SKEY); } catch (e) {} }

  function listUsers() { return loadUsers(); }
  function setStatus(id, status) {
    const users = loadUsers();
    const u = users.find(x => x.id === id);
    if (u) { u.status = status; saveUsers(users); }
    return u;
  }
  function removeUser(id) { saveUsers(loadUsers().filter(x => x.id !== id)); }

  function requireAuth(redirectTo) {
    if (!currentUser()) { location.replace(redirectTo || 'index.html'); return false; }
    return true;
  }

  global.PaceAuth = {
    signup, login, logout, currentUser, listUsers, setStatus, removeUser, requireAuth,
    ROLE_NM: {admin:'관리자', company:'응답기업', verifier:'검증담당자'},
  };
})(window);

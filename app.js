window.APP_LOADED=1;
// ================================================================
// ERROR OVERLAY — catches uncaught errors and unhandled rejections
// ================================================================
(function(){
  function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
  function showErr(msg,src,line,col,err){
    if(document.getElementById('_err-overlay'))return;
    var where=src?src.replace(location.origin,'')+(line?':'+line:'')+(col?':'+col:''):'';
    var stack=err&&err.stack?err.stack:'';
    var d=document.createElement('div');
    d.id='_err-overlay';
    d.style.cssText='position:fixed;inset:0;background:rgba(20,0,0,0.97);color:#ff6b6b;font-family:"IBM Plex Mono",monospace;font-size:13px;padding:2rem;overflow:auto;z-index:999999;box-sizing:border-box';
    d.innerHTML=
      '<div style="max-width:800px;margin:0 auto">'
      +'<div style="font-size:1.1rem;font-weight:700;color:#ff4444;margin-bottom:0.75rem">&#9888; JavaScript Error</div>'
      +'<div style="font-size:0.95rem;color:#ffaaaa;margin-bottom:0.5rem">'+esc(msg)+'</div>'
      +(where?'<div style="font-size:0.8rem;color:#ff8888;margin-bottom:1rem">'+esc(where)+'</div>':'')
      +(stack?'<pre style="font-size:0.75rem;color:#cc6666;white-space:pre-wrap;word-break:break-all;margin:0 0 1.5rem">'+esc(stack)+'</pre>':'')
      +'<button onclick="document.getElementById(\'_err-overlay\').remove()" style="padding:0.35rem 1rem;background:#2a0000;color:#ccc;border:1px solid #663333;border-radius:4px;cursor:pointer;font-size:0.8rem">Dismiss</button>'
      +'</div>';
    if(document.body)document.body.appendChild(d);
    else document.addEventListener('DOMContentLoaded',function(){document.body.appendChild(d);});
  }
  window.onerror=function(msg,src,line,col,err){showErr(msg,src,line,col,err);};
  window.addEventListener('unhandledrejection',function(ev){
    var r=ev.reason;
    showErr(r instanceof Error?'Unhandled Promise Rejection: '+r.message:'Unhandled Promise Rejection: '+String(r),'',null,null,r instanceof Error?r:null);
  });
})();
// ================================================================
// CONFIG
// ================================================================
var APP_VERSION = 'v1.6.4  ·  2026-06-14';
var WORKER_URL = 'https://mbb-enquiry-proxy.paul-winick.workers.dev';
var F = {
  SR_NO:        'SR. No.',
  DATE:         'Enquiry Date',
  PROJECT:      'Name of Project',
  CONTRACTOR:   'Contractor',
  MAIN_CONT:    'Main Contractor',
  CLIENT:       'Client',
  RTU:          'RTU Substations',
  STATUS:       'Status',
  PROPOSAL:     'Proposal Submitted On',
  QUOTATION:    'Quotation',
  TECH_PROP:    'Technical Proposal',
  LPO_CLIENT:   'LPO (Client)',
  LPO_SUPPLIER: 'LPO (MBB to Supplier)',
  LAST_UPDATE:  'Last_Update',
  DEADLINE:     'Deadline',
  ACTIVE:       'Active',
  DOCS:         'Docs'
};
// ================================================================

var HEADERS = {'Content-Type':'application/json'};
function getHeaders(){ return {'Content-Type':'application/json','X-App-Password':appPassword}; }
var allRecords = [], items = [], filtered = [];
var currentStatus = 'ALL';
var currentPage = 1;
var PER_PAGE = 15;
var editingId = null;
var pendingDeleteId = null;
var showLost = false;
var showCancelled = false;
var dateFrom = null;
var dateTo = null;
var sortField = 'sr_no';
var sortDir = 'desc';
var appPassword  = sessionStorage.getItem('mbb_pwd') || null;
var currentUser  = JSON.parse(sessionStorage.getItem('mbb_user') || 'null');
var userRole     = currentUser ? currentUser.role : null;
var userName     = currentUser ? currentUser.name : '';

var IC_PENCIL = '<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M11.013 1.427a1.75 1.75 0 012.474 2.474L4.92 12.47l-3.795.505.505-3.794 8.383-8.754zM13 3.5L12 2.5 3 11.5l-.25 1.75 1.75-.25L13 3.5z" fill="currentColor"/></svg>';
var IC_SAVE   = '<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" fill="currentColor"/></svg>';
var IC_CANCEL = '<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" fill="currentColor"/></svg>';
var IC_TRASH  = '<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M6.5 1h3a.5.5 0 010 1h-3a.5.5 0 010-1zM2 4.5A.5.5 0 012.5 4h11a.5.5 0 010 1H13l-.8 8.02A2 2 0 0110.21 15H5.79a2 2 0 01-1.99-1.98L3 5H2.5A.5.5 0 012 4.5z" fill="currentColor"/></svg>';
var IC_COPY   = '<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 010 1.5h-1.5a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-1.5a.75.75 0 011.5 0v1.5A1.75 1.75 0 019.25 16h-7.5A1.75 1.75 0 010 14.25v-7.5z" fill="currentColor"/><path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0114.25 11h-7.5A1.75 1.75 0 015 9.25v-7.5zm1.75-.25a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25h-7.5z" fill="currentColor"/></svg>';
var IC_DOCS   = '<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 2.5A2.5 2.5 0 014.5 0h7A2.5 2.5 0 0114 2.5v11a2.5 2.5 0 01-2.5 2.5h-7A2.5 2.5 0 012 13.5V2.5zm2.5-1A1.5 1.5 0 003 2.5v11A1.5 1.5 0 004.5 15h7a1.5 1.5 0 001.5-1.5v-11A1.5 1.5 0 0011.5 1.5h-7zM4.75 8a.75.75 0 01.75-.75h5a.75.75 0 010 1.5h-5A.75.75 0 014.75 8zm0 2.5a.75.75 0 01.75-.75h5a.75.75 0 010 1.5h-5a.75.75 0 01-.75-.75zM5.5 4a.75.75 0 000 1.5h2a.75.75 0 000-1.5h-2z" fill="currentColor"/></svg>';

// ── Helpers ──────────────────────────────────────────────────────
function s(v) { return (v === null || v === undefined) ? '' : String(v).trim(); }
function e(v) { return String(v||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function normStatus(v) { if(!v) return ''; if(v.indexOf('Under Process')!==-1||v==='Pipeline'||v==='PIPELINE') return 'PIPELINE'; return v; }

function parseDMY(str) {
  if(!str) return null;
  var p = str.trim().split('.');
  if(p.length!==3) return null;
  var d=parseInt(p[0]),mo=parseInt(p[1]),y=parseInt(p[2]);
  if(!d||!mo||!y||y<2000) return null;
  return new Date(y,mo-1,d);
}
function parseISO(str) {
  if(!str) return null;
  var d=new Date(str+'T00:00:00');
  return isNaN(d.getTime())?null:d;
}
function parseDateStr(str) {
  if(!str) return null;
  if(/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    var p=str.split('-');
    return new Date(parseInt(p[0]),parseInt(p[1])-1,parseInt(p[2]));
  }
  return parseISO(str);
}
function fmtDeadline(str) {
  var d=parseDateStr(str);
  if(!d||isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
}
function businessDaysUntil(str) {
  if(!str) return null;
  var target=parseDateStr(str);
  if(!target||isNaN(target.getTime())) return null;
  var today=new Date(); today.setHours(0,0,0,0); target.setHours(0,0,0,0);
  if(target<today) return -1;
  if(target.getTime()===today.getTime()) return 0;
  var count=0,cur=new Date(today);
  while(cur<target){cur.setDate(cur.getDate()+1);var d=cur.getDay();if(d!==0&&d!==6)count++;}
  return count;
}
function renderDeadline(deadline) {
  if(!deadline) return '';
  var lbl=fmtDeadline(deadline);
  if(!lbl) return '';
  var bd=businessDaysUntil(deadline);
  if(bd===-1) return '<span class="dl-overdue">&#9888; '+lbl+' (overdue)</span>';
  if(bd!==null) return '<span class="dl-soon">&#9200; '+lbl+'</span>';
  return '<span class="dl-normal">'+lbl+'</span>';
}

function setSave(state) {
  var ind=document.getElementById('save-ind');
  var txt=document.getElementById('save-txt');
  ind.className='save-ind'+(state==='saved'?' saved':state==='saving'?' saving':state==='err'?' err':'');
  var msgs={loading:'loading\u2026',saving:'saving\u2026',saved:'saved \u2714',err:'save failed',ready:'connected'};
  txt.textContent=msgs[state]||state;
}
async function updateRowCount() {
  var tables = [
    {n:'Enquiry',     u:WORKER_URL+'?pageSize=100'},
    {n:'Quotes',      u:WORKER_URL+'/quotes?pageSize=100'},
    {n:'Invoices',    u:WORKER_URL+'/invoices?pageSize=100'},
    {n:'Activity',    u:WORKER_URL+'/activity?pageSize=100'},
    {n:'Bidders',     u:WORKER_URL+'/bidders?pageSize=100'},
    {n:'Suppliers',   u:WORKER_URL+'/suppliers?pageSize=100'},
    {n:'Contractors', u:WORKER_URL+'/contractors?pageSize=100'},
    {n:'Renewals',    u:WORKER_URL+'/renewals?pageSize=100'},
    {n:'Employees',   u:WORKER_URL+'/employees?pageSize=100'},
    {n:'Docs',        u:WORKER_URL+'/company-docs?pageSize=100'},
    {n:'Petty Cash',  u:WORKER_URL+'/petty-cash?pageSize=100'},
    {n:'QA',          u:WORKER_URL+'/quality-objectives?pageSize=100'},
  ];
  async function countTable(url) {
    var total=0, offset=null;
    do {
      var fetchUrl = offset ? url+'&offset='+offset : url;
      var d = await fetch(fetchUrl,{headers:getHeaders()}).then(function(r){return r.json();}).catch(function(){return {};});
      total += (d.records||[]).length;
      offset = d.offset || null;
    } while(offset);
    return total;
  }
  var results=[]; var breakdown=[];
  for(var i=0;i<tables.length;i++){
    var n = await countTable(tables[i].u).catch(function(){return 0;});
    results.push(n); breakdown.push(tables[i].n+': '+n);
  }
  var total=results.reduce(function(a,b){return a+b;},0);
  var color=total>=900?'var(--red)':total>=750?'var(--amber)':'var(--txt3)';
  var html='<span style="color:'+color+';cursor:help">'+total+'/1k rows</span>';
  ['row-count-badge','row-count-home'].forEach(function(id){
    var el=document.getElementById(id); if(el) el.innerHTML=html;
  });
}

function toggleNavMenu() {
  event.stopPropagation();
  var btn = event.currentTarget || event.target;
  var wrap = btn.closest ? (btn.closest('.app-nav-wrap') || btn.closest('#app-nav-menu')) : null;
  var d = wrap ? (wrap.querySelector('.nav-dropdown-shared') || wrap.querySelector('[id^=nav-dropdown]')) : null;
  if(!d) return;
  var isOpen = d.style.display !== 'none';
  closeNavMenu();
  if(!isOpen) d.style.display = 'block';
}
function closeNavMenu() {
  document.querySelectorAll('.nav-dropdown-shared,[id^=nav-dropdown]').forEach(function(x){x.style.display='none';});
}

// Close nav on outside click (single listener)
document.addEventListener('click',function(e){if(!e.target.closest('.app-nav-wrap')&&!e.target.closest('#app-nav-menu'))closeNavMenu();});
function setProgress(pct, msg) {
  var bar = document.getElementById('lc-bar');
  var txt = document.getElementById('lc-txt');
  if(bar) bar.style.width = Math.min(pct,100)+'%';
  if(txt) txt.textContent = msg || '';
}

async function attemptLogin() {
  var username = document.getElementById('login-user').value.trim();
  var pwd      = document.getElementById('login-pwd').value.trim();
  var errEl    = document.getElementById('login-error');
  var btn      = document.querySelector('.lbtn');
  errEl.textContent = '';
  if(!username){ errEl.textContent='Please enter your username.'; return; }
  if(!pwd)     { errEl.textContent='Please enter your password.';  return; }

  btn.textContent = 'Signing in…'; btn.disabled = true;
  try {
    // Validate by hitting the Worker with username + password
    var res  = await fetch(WORKER_URL+'/auth', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({username: username, password: pwd})
    });
    var data = await res.json();
    if(!res.ok || !data.role) {
      errEl.textContent = data.error || 'Invalid username or password.';
      btn.textContent = 'Sign in'; btn.disabled = false;
      return;
    }
    // Success
    appPassword = pwd;
    currentUser = {name: data.name, role: data.role, username: username};
    userRole    = data.role;
    userName    = data.name;
    sessionStorage.setItem('mbb_pwd',  pwd);
    sessionStorage.setItem('mbb_user', JSON.stringify(currentUser));
    document.getElementById('login-screen').style.display='none';
    applyRoleRestrictions();
    updateAllUserLabels();
    if(data.role === 'admin') {
      showLoadingOverlay('Welcome back, '+data.name+'…');
    } else {
      showHome();
    }
  } catch(err) {
    errEl.textContent = 'Connection error. Please try again.';
  }
  btn.textContent = 'Sign in'; btn.disabled = false;
}

function toast(msg, type) {
  var t = document.getElementById('toast-el');
  if(!t){
    t = document.createElement('div');
    t.id = 'toast-el';
    t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);padding:10px 20px;border-radius:8px;font-size:13px;font-weight:500;z-index:9999;pointer-events:none;transition:opacity .3s;white-space:nowrap';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.background = type==='err' ? '#f85149' : type==='ok' ? '#3fb950' : 'var(--amber)';
  t.style.color = '#fff';
  t.style.opacity = '1';
  clearTimeout(t._to);
  t._to = setTimeout(function(){ t.style.opacity='0'; }, 2800);
}

function applyRoleRestrictions() {
  var isAdmin   = (userRole === 'admin');
  var isViewer  = userRole === 'viewer';
  var isEngineer= userRole === 'engineer';
  var style = document.getElementById('role-restrictions-style');
  if(!style){ style = document.createElement('style'); style.id='role-restrictions-style'; document.head.appendChild(style); }
  var rules = [];
  // Diagnostics & admin nav items
  ['diag-nav-btn','diag-nav-btn2'].forEach(function(id){var el=document.getElementById(id);if(el)el.style.display=isAdmin?'':'none';});
  // Nav menu: hide admin-only items for non-admins
  document.querySelectorAll('.nav-admin-only').forEach(function(el){el.style.display=isAdmin?'':'none';});
  if(isViewer) {
    rules = rules.concat([
      '.btn-pri:not(.viewer-ok){display:none!important}',
      '.icon-btn.edit{display:none!important}',
      '.icon-btn.del{display:none!important}',
      'button[onclick*="showModal"]{display:none!important}',
      'button[onclick*="showContractorModal"]{display:none!important}',
      'button[onclick*="showSupplierModal"]{display:none!important}',
      'button[onclick*="showVendorModal"]{display:none!important}',
    ]);
  }
  if(isViewer || isEngineer) {
    // Hide Quotes tab for viewers and engineers
    rules.push('.modal-tab[data-tab="tab-quotes"]{display:none!important}');
    rules.push('#tab-quotes{display:none!important}');
    // Hide Invoices tab for non-admins
    rules.push('.modal-tab[data-tab="tab-invoices"]{display:none!important}');
    rules.push('#tab-invoices{display:none!important}');
    // Hide admin-only home sections
    rules.push('.hs-tile-employees{display:none!important}');
    rules.push('.hs-tile-emp-leave{display:none!important}');
    rules.push('#upcoming-group{display:none!important}');
    rules.push('#passport-alert-group{display:none!important}');
    rules.push('#hs-quality-people{display:none!important}');
    rules.push('#tile-pettycash{display:none!important}');
    rules.push('#hs-compliance{display:none!important}');
    rules.push('#hs-security{display:none!important}');
    rules.push('#hs-finance{display:none!important}');
  }
  style.textContent = rules.join('\n');
}

// Auto-login if cached
if(appPassword && currentUser) {
  HEADERS['X-App-Password']=appPassword;
  document.getElementById('login-screen').style.display='none';
  applyRoleRestrictions();
  var lastScreen = sessionStorage.getItem('mbb_screen') || 'home';
  if(lastScreen === 'opportunities') showOpportunities();
  else if(lastScreen === 'vendors') showVendors();
  else if(lastScreen === 'dashboard') { showDashboard(); }
  else if(lastScreen === 'contractors') { showContractors(); }
  else if(lastScreen === 'suppliers') { showSuppliers(); }
  else if(lastScreen === 'quality')   { showQualityObjectives(); }
  else if(lastScreen === 'employees') { showEmployees(); }
  else if(lastScreen === 'renewals')    { showRenewals(); }
  else if(lastScreen === 'company-docs') { showCompanyDocs(); }
  else if(lastScreen === 'petty-cash')   { showPettyCash(); }
  else if(lastScreen === 'passwords')       { showPasswords(); }
  else if(lastScreen === 'employee-leave')  { showEmployeeLeave(); }
  else if(lastScreen === 'employee-leave')  { showEmployeeLeave(); }
  else showHome();
} else {
  sessionStorage.removeItem('mbb_pwd');
  sessionStorage.removeItem('mbb_user');
  document.getElementById('login-screen').style.display='flex';
}

// ── Load ─────────────────────────────────────────────────────────
async function loadAll() {
  setProgress(10,'Connecting\u2026');
  var loadTimeout=setTimeout(function(){
    document.getElementById('loading').style.display='none';
    document.getElementById('app').style.display='flex';
    showError('<b>Connection timed out.</b> <a href="#" onclick="sessionStorage.clear();location.reload();return false;" style="color:var(--red)">Clear session &amp; reload</a>');
  },20000);
  try {
    var records=[],offset=null,page=0;
    do {
      page++;
      if(page>20) break;
      setProgress(Math.min(10+page*30,85),'Loading records\u2026');
      var url=WORKER_URL+'?pageSize=100'+(offset?'&offset='+encodeURIComponent(offset):'');
      var ctrl=new AbortController();
      var timer=setTimeout(function(){ctrl.abort();},15000);
      var res;
      try{res=await fetch(url,{headers:getHeaders(),signal:ctrl.signal});}finally{clearTimeout(timer);}
      if(!res.ok){var er=await res.json().catch(function(){return{};});throw new Error((er.error&&er.error.message)||'HTTP '+res.status);}
      var data=await res.json();
      records=records.concat(data.records||[]);
      offset=data.offset||null;
    } while(offset);
    clearTimeout(loadTimeout);
    allRecords=records;
    parseItems();
    setProgress(100,'Done!');
    await new Promise(function(r){setTimeout(r,200);});
    document.getElementById('loading').style.display='none';
    document.getElementById('app').style.display='flex';
    renderKPIs(); applyFilters(); setSave('ready');
  updateRowCount();
    toast(items.length+' enquiries loaded','ok');
  } catch(err) {
    clearTimeout(loadTimeout);
    document.getElementById('loading').style.display='none';
    document.getElementById('app').style.display='flex';
    showError('<b>Failed to load:</b> '+err.message);
    setSave('err');
  }
}

// ── Parse ────────────────────────────────────────────────────────
function parseItems() {
  items=allRecords.map(function(rec){
    var f=rec.fields;
    return {
      _id:rec.id, sr_no:s(f[F.SR_NO]), date:s(f[F.DATE]), project:s(f[F.PROJECT]),
      contractor:s(f[F.CONTRACTOR]), main_cont:s(f[F.MAIN_CONT]), client:s(f[F.CLIENT]),
      rtu:s(f[F.RTU])||'--', status:normStatus(s(f[F.STATUS])), proposal:s(f[F.PROPOSAL]),
      quotation:s(f[F.QUOTATION]), tech_prop:s(f[F.TECH_PROP]),
      lpo_client:s(f[F.LPO_CLIENT]), lpo_supplier:s(f[F.LPO_SUPPLIER]),
      last_update:s(f[F.LAST_UPDATE]), last_update_date:'', deadline:s(f[F.DEADLINE]), active:s(f[F.ACTIVE]),
      docs:s(f[F.DOCS])
    };
  });
  sortItems();
}
function sortItems() {
  items.sort(function(a,b){
    var av=a[sortField]||'',bv=b[sortField]||'';
    if(sortField==='sr_no'){av=parseInt(av)||0;bv=parseInt(bv)||0;return sortDir==='asc'?av-bv:bv-av;}
    if(sortField==='date'){var da=parseDMY(av),db=parseDMY(bv);if(!da&&!db)return 0;if(!da)return sortDir==='asc'?1:-1;if(!db)return sortDir==='asc'?-1:1;return sortDir==='asc'?da-db:db-da;}
    if(sortField==='deadline'){var da2=av?parseDateStr(av):null,db2=bv?parseDateStr(bv):null;if(!da2&&!db2)return 0;if(!da2)return 1;if(!db2)return -1;return sortDir==='asc'?da2-db2:db2-da2;}
    return sortDir==='asc'?av.localeCompare(bv,undefined,{sensitivity:'base'}):bv.localeCompare(av,undefined,{sensitivity:'base'});
  });
}

// ── API ──────────────────────────────────────────────────────────
async function patchRecord(id,fields) {
  setSave('saving');
  var clean={};
  Object.keys(fields).forEach(function(k){
    // Keep null explicitly (clears field in Airtable), skip only undefined and empty string
    if(fields[k]===undefined) return;
    if(fields[k]==='') return;
    clean[k]=fields[k];
  });
  // Deadline: if empty string was passed, send null to clear it
  if(fields[F.DEADLINE]===''||fields[F.DEADLINE]===undefined) clean[F.DEADLINE]=null;
  else if(fields[F.DEADLINE]) clean[F.DEADLINE]=fields[F.DEADLINE];
  try {
    var res=await fetch(WORKER_URL+'/'+id,{method:'PATCH',headers:getHeaders(),body:JSON.stringify({fields:clean})});
    var d=await res.json().catch(function(){return{};});
    if(!res.ok){var msg=(d.error&&d.error.message)||'HTTP '+res.status;showError('<b>Save failed:</b> '+msg);throw new Error(msg);}
    setSave('saved'); hideError();
  } catch(err){setSave('err');toast('Save failed: '+err.message,'err');}
}
async function postRecord(fields) {
  setSave('saving');
  try {
    var clean={};Object.keys(fields).forEach(function(k){if(fields[k]!==undefined)clean[k]=fields[k];});
    var res=await fetch(WORKER_URL,{method:'POST',headers:getHeaders(),body:JSON.stringify({fields:clean})});
    var data=await res.json();
    if(!res.ok) throw new Error((data.error&&data.error.message)||'HTTP '+res.status);
    allRecords.push(data); parseItems(); setSave('saved');
    currentStatus='ACTIVE_ONLY'; currentPage=1;
    renderKPIs(); applyFilters();
    toast('SR-'+fields[F.SR_NO]+' added — opening Activity tab…','ok');
    // Open edit modal on Activity tab so user can add first note
    setTimeout(function(){
      openEditModal(data.id);
      setTimeout(function(){ switchTab('tab-activity'); }, 80);
    }, 300);
  } catch(err){setSave('err');showError('<b>Failed to add:</b> '+err.message);toast('Failed','err');}
}
async function deleteRecord(id) {
  setSave('saving');
  try {
    var res=await fetch(WORKER_URL+'/'+id,{method:'DELETE',headers:getHeaders()});
    if(!res.ok) throw new Error('HTTP '+res.status);
    allRecords=allRecords.filter(function(r){return r.id!==id;});
    parseItems(); setSave('saved');
    var maxPage=Math.max(1,Math.ceil(filtered.length/PER_PAGE));
    if(currentPage>maxPage) currentPage=maxPage;
    renderKPIs(); applyFilters();
    toast('Enquiry deleted','ok');
  } catch(err){setSave('err');toast('Delete failed: '+err.message,'err');}
}

// ── Ticks ────────────────────────────────────────────────────────
function toggleTick(id,itemField,airtableField) {
  var item=items.find(function(i){return i._id===id;});
  if(!item) return;
  var cur=item[itemField];
  if(airtableField===F.ACTIVE){
    item[itemField]=cur==='Yes'?'No':'Yes';
    var rec=allRecords.find(function(r){return r.id===id;});
    if(rec) rec.fields[F.ACTIVE]=item[itemField];
    renderTable(); renderKPIs();
    patchRecord(id,{[airtableField]:item[itemField]});
  } else {
    item[itemField]=cur==='✔'?'✖':cur==='✖'?null:'✔';
    var rec=allRecords.find(function(r){return r.id===id;});
    if(rec) rec.fields[airtableField]=item[itemField];
    renderTable();
    patchRecord(id,{[airtableField]:item[itemField]===null?null:item[itemField]});
  }
}
function mkTick(id,itemField,af,val) {
  var isActive=af===F.ACTIVE;
  var on=isActive?(val==='Yes'):(val==='✔');
  var off=isActive?(val==='No'):(val==='✖');
  if(isActive) {
    var chkd=on?'checked':'';
    return '<label class="active-chk" title="'+(on?'Active':'Not active')+'" onclick="event.stopPropagation()">'+
      '<input type="checkbox" '+chkd+' onchange="toggleTick(\''+id+'\',\''+itemField+'\',\''+af+'\')">'+
      '<span class="chk-box"></span></label>';
  }
  var cls=on?'on':off?'off':'na';
  var icon=on?'✔':off?'✖':'–';
  return '<button class="tick '+cls+'" onclick="toggleTick(\''+id+'\',\''+itemField+'\',\''+af+'\')">'+icon+'</button>';
}

// ── Edit ─────────────────────────────────────────────────────────
function startEdit(id){editingId=id;renderTable();setTimeout(function(){var el=document.getElementById('ei-proj');if(el){el.focus();el.select();}},50);}
function cancelEdit(){if(!editingId)return;editingId=null;renderTable();}
async function saveEditRow(){
  if(!editingId) return;
  function gi(id){var el=document.getElementById(id);return el?el.value.trim():'';}
  var fields={};
  fields[F.DATE]=gi('ei-date'); fields[F.PROJECT]=gi('ei-proj');
  fields[F.MAIN_CONT]=gi('ei-mc'); fields[F.CLIENT]=gi('ei-client');
  fields[F.RTU]=gi('ei-rtu')||'--'; fields[F.STATUS]=gi('ei-status');
  fields[F.DEADLINE]=gi('ei-deadline')||null; // Last Update is driven by Activity tab only
  var item=items.find(function(i){return i._id===editingId;});
  if(item){
    item.date=fields[F.DATE]; item.project=fields[F.PROJECT]; item.main_cont=fields[F.MAIN_CONT];
    item.client=fields[F.CLIENT]; item.rtu=fields[F.RTU]; item.status=normStatus(fields[F.STATUS]);
    item.deadline=fields[F.DEADLINE];
    var rec=allRecords.find(function(r){return r.id===editingId;});
    if(rec){rec.fields[F.DATE]=fields[F.DATE];rec.fields[F.PROJECT]=fields[F.PROJECT];rec.fields[F.MAIN_CONT]=fields[F.MAIN_CONT];rec.fields[F.CLIENT]=fields[F.CLIENT];rec.fields[F.RTU]=fields[F.RTU];rec.fields[F.STATUS]=fields[F.STATUS];rec.fields[F.DEADLINE]=fields[F.DEADLINE];}
  }
  var savedId=editingId; editingId=null;
  renderKPIs(); applyFilters();
  await patchRecord(savedId,fields);
  toast('Changes saved','ok');
}

// ── Delete ───────────────────────────────────────────────────────
function promptDelete(id,srNo,proj){
  pendingDeleteId=id;
  document.getElementById('confirm-body').innerHTML='This will permanently delete SR <b>'+e(srNo)+'</b>:<br><b>'+e(proj||'(no name)')+'</b><br><br>This cannot be undone.';
  document.getElementById('confirm-modal').style.display='flex';
}
function closeConfirm(){pendingDeleteId=null;document.getElementById('confirm-modal').style.display='none';}
function confirmDelete(){
  if(pendingSupDeleteId)      { confirmDeleteSupplier(); return; }
  if(pendingCdocDeleteId)     { confirmDeleteCompanyDoc(); return; }
  if(pendingRenDeleteId)      { confirmDeleteRenewal(); return; }
  if(pendingEmpDeleteId)      { confirmDeleteEmployee(); return; }
  if(pendingQODeleteId)       { confirmDeleteQO(); return; }
  if(pendingInvoiceDeleteId)  { confirmDeleteInvoice(); return; }
  if(pendingQuoteDeleteId)    { confirmDeleteQuote(); return; }
  if(pendingBidderDeleteId)   { confirmDeleteBidder(); return; }
  if(pendingActivityDeleteId) { confirmDeleteActivityNote(); return; }
  if(pendingPCDeleteId)       { confirmDeletePCTransaction(); return; }
  if(!pendingDeleteId) return;
  var id=pendingDeleteId; pendingDeleteId=null;
  closeConfirm(); deleteRecord(id);
}

// ── KPIs ─────────────────────────────────────────────────────────
function renderKPIs(){
  var c={ALL:items.length,ACTIVE_ONLY:0,WON:0,LOST:0,CANCELLED:0,PIPELINE:0,CLOSED:0};
  items.forEach(function(r){
    if(r.active==='Yes') c.ACTIVE_ONLY++;
    if(c[r.status]!==undefined) c[r.status]++;
  });
  var cards=[
    {k:'ALL',label:'All Opportunities',cls:''},
    {k:'ACTIVE_ONLY',label:'Active (working on)',cls:'activefilter'},
    {k:'WON',label:'Won',cls:'won'},
    {k:'PIPELINE',label:'Pipeline',cls:'process'},
    {k:'LOST',label:'Lost',cls:'lost'},
    {k:'CANCELLED',label:'Cancelled',cls:'cancelled'},
    {k:'CLOSED',label:'Closed',cls:'closed'}
  ];
  var el=document.getElementById('kpis');
  el.innerHTML=cards.map(function(x){
    return '<div class="kpi '+x.cls+' '+(currentStatus===x.k?'active':'')+'" onclick="setStatus(\''+x.k+'\')"><div class="kpi-lbl">'+x.label+'</div><div class="kpi-val">'+c[x.k]+'</div></div>';
  }).join('');
}
function setStatus(s){cancelEdit();currentStatus=s;currentPage=1;applyFilters();renderKPIs();}

// ── Filter & table ────────────────────────────────────────────────
function applyFilters(){
  var q=document.getElementById('search').value.toLowerCase();
  var showLost=document.getElementById('show-lost').checked;
  var showCancelled=document.getElementById('show-cancelled').checked;
  filtered=items.filter(function(r){
    var isActive=r.active==='Yes';
    var ms=currentStatus==='ALL'||(currentStatus==='ACTIVE_ONLY'?isActive:r.status===currentStatus);
    var mq=!q||[r.project,r.client,r.main_cont,r.sr_no,r.contractor].some(function(f){return (f||'').toLowerCase().indexOf(q)!==-1;});
    var inDate=true;
    if(dateFrom||dateTo){var rd=parseDMY(r.date);if(!rd){inDate=!dateFrom;}else{if(dateFrom&&rd<dateFrom)inDate=false;if(dateTo&&rd>dateTo)inDate=false;}}
    var hideLost=currentStatus==='ALL'&&r.status==='LOST'&&!showLost;
    var hideCancelled=currentStatus==='ALL'&&r.status==='CANCELLED'&&!showCancelled;
    return ms&&mq&&inDate&&!hideLost&&!hideCancelled;
  });
  renderTable(); renderPagination();
}

function badgeCls(st){return st==='WON'?'b-won':st==='LOST'?'b-lost':st==='CANCELLED'?'b-cancelled':st==='CLOSED'?'b-closed':'b-process';}
function badgeLbl(st){return st==='Under Process'?'Pipeline':(st||'&mdash;');}

var STATUS_OPTS=['PIPELINE','WON','LOST','CANCELLED','CLOSED'];

function mkDisplayRow(r){
  return '<tr data-id="'+r._id+'" style="cursor:pointer">'+
    '<td class="c-sr">'+e(r.sr_no)+'</td>'+
    '<td class="c-date">'+e(r.date)+'</td>'+
    '<td class="c-proj">'+e(r.project)+'</td>'+
    '<td class="c-mc">'+e(r.main_cont||'&mdash;')+'</td>'+
    '<td class="c-client">'+e(r.client||'&mdash;')+'</td>'+
    '<td class="c-rtu">'+e(r.rtu)+'</td>'+
    '<td class="c-status"><span class="badge '+badgeCls(r.status)+'">'+badgeLbl(r.status)+'</span></td>'+
    '<td class="c-chk">'+mkTick(r._id,'quotation',F.QUOTATION,r.quotation)+'</td>'+
    '<td class="c-chk">'+mkTick(r._id,'tech_prop',F.TECH_PROP,r.tech_prop)+'</td>'+
    '<td class="c-chk">'+mkTick(r._id,'lpo_client',F.LPO_CLIENT,r.lpo_client)+'</td>'+
    '<td class="c-chk">'+mkTick(r._id,'lpo_supplier',F.LPO_SUPPLIER,r.lpo_supplier)+'</td>'+
    '<td class="c-active">'+mkTick(r._id,'active',F.ACTIVE,r.active)+'</td>'+
    '<td class="c-deadline">'+renderDeadline(r.deadline)+'</td>'+
    (function(){
      var lu = r.last_update || '';
      var sep = lu.indexOf(' - ');
      var datePart = sep !== -1 ? lu.substring(0, sep) : '';
      var notePart = sep !== -1 ? lu.substring(sep + 3) : lu;
      return '<td class="c-update">'+(datePart ? '<div style="font-size:11px;font-weight:500;color:var(--txt)">'+e(datePart)+'</div>' : '')+(notePart ? '<div style="font-size:10px;color:var(--txt3);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+e(notePart)+'</div>' : '')+'</td>';
    })()+
      '<td class="c-actions"><div class="row-actions">'+
      (r.docs ? '<a class="icon-btn docs-link has-link" href="'+r.docs+'" target="_blank" rel="noopener">'+IC_DOCS+'</a>' : '<span class="icon-btn docs-link">'+IC_DOCS+'</span>')+
      '<button class="icon-btn" data-quote-id="'+r._id+'" style="color:var(--blue);opacity:1">&#128196;</button>'+
      '<button class="icon-btn edit" onclick="startEdit(\''+r._id+'\')">'+IC_PENCIL+'</button>'+
      '<button class="icon-btn del" onclick="promptDelete(\''+r._id+'\',\''+e(r.sr_no)+'\',\''+e(r.project)+'\')">'+IC_TRASH+'</button>'+
    '</div></td>'+
  '</tr>';
}

function mkEditRow(r){
  var opts=STATUS_OPTS.map(function(st){return '<option value="'+st+'"'+(r.status===st?' selected':'')+'>'+( st==='PIPELINE'?'Pipeline':st)+'</option>';}).join('');
  return '<tr class="editing" data-id="'+r._id+'">'+
    '<td class="c-sr" style="font-family:monospace;font-size:11px;color:var(--txt3)">'+e(r.sr_no)+'</td>'+
    '<td class="c-date" style="overflow:visible"><input class="ei" id="ei-date" value="'+e(r.date)+'" placeholder="DD.MM.YYYY" style="width:88px"></td>'+
    '<td class="c-proj" style="overflow:visible"><input class="ei" id="ei-proj" value="'+e(r.project)+'" style="width:100%"></td>'+
    '<td class="c-mc" style="overflow:visible"><input class="ei" id="ei-mc" value="'+e(r.main_cont)+'" style="width:112px"></td>'+
    '<td class="c-client" style="overflow:visible"><input class="ei" id="ei-client" value="'+e(r.client)+'" style="width:80px"></td>'+
    '<td class="c-rtu" style="overflow:visible"><input class="ei" id="ei-rtu" value="'+e(r.rtu)+'" style="width:50px;text-align:center"></td>'+
    '<td class="c-status" style="overflow:visible"><select class="ei-sel" id="ei-status" style="width:108px">'+opts+'</select></td>'+
    '<td class="c-chk">'+mkTick(r._id,'quotation',F.QUOTATION,r.quotation)+'</td>'+
    '<td class="c-chk">'+mkTick(r._id,'tech_prop',F.TECH_PROP,r.tech_prop)+'</td>'+
    '<td class="c-chk">'+mkTick(r._id,'lpo_client',F.LPO_CLIENT,r.lpo_client)+'</td>'+
    '<td class="c-chk">'+mkTick(r._id,'lpo_supplier',F.LPO_SUPPLIER,r.lpo_supplier)+'</td>'+
    '<td class="c-active">'+mkTick(r._id,'active',F.ACTIVE,r.active)+'</td>'+
    '<td class="c-deadline" style="overflow:visible"><input class="ei" id="ei-deadline" type="date" value="'+e(r.deadline)+'" style="width:130px"></td>'+
    '<td class="c-update"><span style="font-size:12px;color:var(--txt3);font-style:italic">'+e(r.last_update||'—')+'</span></td>'+
    '<td class="c-actions"><div class="row-actions">'+
      '<button class="icon-btn save" onclick="saveEditRow()">'+IC_SAVE+'</button>'+
      '<button class="icon-btn cancel-edit" onclick="cancelEdit()">'+IC_CANCEL+'</button>'+
    '</div></td>'+
  '</tr>';
}

function renderTable(){
  renderMobileCards(filtered);
  var start=(currentPage-1)*PER_PAGE;
  var page=filtered.slice(start,start+PER_PAGE);
  var total=filtered.length;
  document.getElementById('meta').textContent=total===0?'No results':(start+1)+'\u2013'+Math.min(start+PER_PAGE,total)+' of '+total;
  var tbody=document.getElementById('tbody');
  tbody.innerHTML=page.map(function(r){return r._id===editingId?mkEditRow(r):mkDisplayRow(r);}).join('');
  // Single-click quote button
  tbody.addEventListener('click', function(ev) {
    var qb = ev.target.closest('[data-quote-id]');
    if(qb) { ev.stopPropagation(); openQuoteFromRow(qb.dataset.quoteId); return; }
  });
  // Double-click anywhere on a row to open edit modal
  tbody.addEventListener('dblclick', function(ev) {
    var row = ev.target.closest('tr[data-id]');
    if(row && !row.classList.contains('editing')) {
      openEditModal(row.dataset.id);
    }
  });
  initSortHeaders();
  initColumnResize();
}

function renderPagination(){
  var total=Math.ceil(filtered.length/PER_PAGE);
  var info=document.getElementById('pag-info');
  var btns=document.getElementById('pag-btns');
  info.textContent=total>1?'Page '+currentPage+' of '+total:'';
  if(total<=1){btns.innerHTML='';return;}
  var pages=[];for(var i=1;i<=total;i++)pages.push(i);
  var vis=pages.filter(function(p){return p===1||p===total||Math.abs(p-currentPage)<=1;});
  var h='<button class="pag-btn" onclick="goPage('+(currentPage-1)+')" '+(currentPage===1?'disabled':'')+'>&#8249; prev</button>';
  var prev=0;
  vis.forEach(function(p){
    if(prev&&p-prev>1) h+='<span class="pag-ellipsis">\u2026</span>';
    h+='<button class="pag-btn '+(p===currentPage?'active':'')+'" onclick="goPage('+p+')">'+p+'</button>';
    prev=p;
  });
  h+='<button class="pag-btn" onclick="goPage('+(currentPage+1)+')" '+(currentPage===total?'disabled':'')+'>next &#8250;</button>';
  btns.innerHTML=h;
}
function goPage(p){var total=Math.ceil(filtered.length/PER_PAGE);if(p<1||p>total)return;cancelEdit();currentPage=p;renderTable();renderPagination();}

// ── Sort headers ─────────────────────────────────────────────────
function initSortHeaders(){
  document.querySelectorAll('thead th[data-sort]').forEach(function(th){
    var newTh=th.cloneNode(true); th.parentNode.replaceChild(newTh,th);
    newTh.classList.toggle('sort-asc',newTh.dataset.sort===sortField&&sortDir==='asc');
    newTh.classList.toggle('sort-desc',newTh.dataset.sort===sortField&&sortDir==='desc');
    var icon=newTh.querySelector('.sort-icon');
    if(icon) icon.textContent=newTh.dataset.sort===sortField?(sortDir==='asc'?'\u2191':'\u2193'):'\u2195';
    newTh.addEventListener('click',function(ev){
      if(_resizing) return;
      var field=newTh.dataset.sort;
      if(sortField===field){sortDir=sortDir==='asc'?'desc':'asc';}
      else{sortField=field;sortDir=(field==='sr_no'||field==='date'||field==='deadline')?'desc':'asc';}
      sortItems(); applyFilters();
    });
  });
}

// ── Column resize ─────────────────────────────────────────────────
var _resizing = false;

function initColumnResize(){
  document.querySelectorAll('thead th').forEach(function(th){
    var resizer=th.querySelector('.col-resizer');
    if(!resizer) return;

    resizer.addEventListener('mousedown',function(ev){
      var startX=ev.clientX, startW=th.offsetWidth, moved=false;
      resizer.classList.add('active');
      document.body.style.cursor='col-resize';
      document.body.style.userSelect='none';

      function onMove(e){
        if(!moved && Math.abs(e.clientX - startX) < 3) return; // ignore tiny jitter
        moved = true;
        _resizing = true;
        var w = Math.max(40, startW + (e.clientX - startX));
        th.style.width = w+'px';
        th.style.minWidth = w+'px';
        var col = th.dataset.col;
        if(col) document.querySelectorAll('td.'+col).forEach(function(td){
          td.style.width=w+'px'; td.style.maxWidth=w+'px';
        });
      }

      function onUp(){
        resizer.classList.remove('active');
        document.body.style.cursor='';
        document.body.style.userSelect='';
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        // Suppress the click that fires after mouseup
        if(_resizing){
          setTimeout(function(){ _resizing = false; }, 10);
        }
      }

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      ev.preventDefault();
      ev.stopPropagation();
    });

    // Block click on the th if a resize just happened
    th.addEventListener('click', function(ev){
      if(_resizing){ ev.stopImmediatePropagation(); }
    }, true); // capture phase — fires before sort listener
  });
}

// ── Date range ────────────────────────────────────────────────────
document.getElementById('date-from').addEventListener('change',function(ev){dateFrom=parseISO(ev.target.value);currentPage=1;applyFilters();});
document.getElementById('date-to').addEventListener('change',function(ev){var d=parseISO(ev.target.value);if(d)d.setHours(23,59,59);dateTo=d;currentPage=1;applyFilters();});
function clearDates(){document.getElementById('date-from').value='';document.getElementById('date-to').value='';dateFrom=null;dateTo=null;currentPage=1;applyFilters();}

// Keyboard shortcuts
document.addEventListener('keydown',function(ev){
  if(ev.key==='Escape'){cancelEdit();closeConfirm();closeModal();closeEditModal();}
  if(ev.key==='Enter'&&editingId) saveEditRow();
});

// ── Modal ─────────────────────────────────────────────────────────
function showModal(){
  var maxSr=Math.max.apply(null,items.map(function(i){return parseInt(i.sr_no)||0;}).concat([17062]));
  var next=maxSr+1;
  var now=new Date();
  var pad=function(n){return String(n).padStart(2,'0');};
  document.getElementById('f-sr').value=next;
  document.getElementById('modal-sr-lbl').textContent='SR-'+next;
  document.getElementById('f-date').value=pad(now.getDate())+'.'+pad(now.getMonth()+1)+'.'+now.getFullYear();
  document.getElementById('f-cont').value='MBB';
  document.getElementById('f-status').value='PIPELINE';
  ['f-proj','f-mc','f-client','f-rtu','f-prop'].forEach(function(id){document.getElementById(id).value='';});
  document.getElementById('f-deadline').value='';
  document.getElementById('modal').style.display='flex';
  if(ctrRecords.length === 0) {
    loadContractors().then(function(){ populateMainContractorDropdown('f-mc',''); });
  } else {
    populateMainContractorDropdown('f-mc','');
  }
  setTimeout(function(){document.getElementById('f-proj').focus();},50);
}
function closeModal(){document.getElementById('modal').style.display='none';}
// modal click-outside disabled
// confirm-modal click-outside disabled

function saveEntry(){
  function g(id){return document.getElementById(id).value.trim();}
  var proj=g('f-proj');
  if(!proj){document.getElementById('f-proj').focus();return;}
  closeModal();
  var fields={};
  fields[F.SR_NO]=g('f-sr'); fields[F.DATE]=g('f-date'); fields[F.PROJECT]=proj;
  fields[F.CONTRACTOR]=g('f-cont')||'MBB'; fields[F.MAIN_CONT]=g('f-mc');
  fields[F.CLIENT]=g('f-client'); fields[F.RTU]=g('f-rtu')||'--';
  fields[F.STATUS]=g('f-status'); fields[F.PROPOSAL]=g('f-prop')||'--';
  var dlVal=document.getElementById('f-deadline').value; if(dlVal) fields[F.DEADLINE]=dlVal;
  fields[F.QUOTATION]=''; fields[F.TECH_PROP]=''; fields[F.LPO_CLIENT]=''; fields[F.LPO_SUPPLIER]='';
  postRecord(fields);
}

// ── Debug ─────────────────────────────────────────────────────────
async function showFieldNames(){
  try{
    var res=await fetch(WORKER_URL+'?maxRecords=1',{headers:getHeaders()});
    var data=await res.json();
    var flds=Object.keys((data.records&&data.records[0]&&data.records[0].fields)||{});
    showError('<b>Airtable column names:</b><br><br>'+flds.map(function(f){return '&nbsp;&nbsp;<code style="background:#eee;padding:1px 5px;border-radius:3px;font-size:12px">'+f+'</code>';}).join('<br>'));
  }catch(err){showError('Could not fetch: '+err.message);}
}


// ── Edit Modal (double-click) ─────────────────────────────────────
function openEditModal(id) {
  var item = items.find(function(i){ return i._id === id; });
  if(!item) return;
  document.getElementById('edit-modal').dataset.id = id;
  document.getElementById('edit-sr-lbl').textContent = 'SR-' + item.sr_no;
  document.getElementById('ef-sr').value       = item.sr_no;
  document.getElementById('ef-date').value     = item.date;
  document.getElementById('ef-proj').value     = item.project;
  document.getElementById('ef-cont').value     = item.contractor;
  if(ctrRecords.length === 0) {
    loadContractors().then(function(){ populateMainContractorDropdown('ef-mc', item.main_cont); });
  } else {
    populateMainContractorDropdown('ef-mc', item.main_cont);
  }
  document.getElementById('ef-client').value   = item.client;
  document.getElementById('ef-rtu').value      = item.rtu === '--' ? '' : item.rtu;
  document.getElementById('ef-status').value   = item.status;
  document.getElementById('ef-prop').value     = item.proposal;
  document.getElementById('ef-deadline').value = item.deadline || '';
  document.getElementById('ef-docs').value     = item.docs || '';
  document.getElementById('edit-modal').style.display = 'flex';
  setTimeout(function(){ document.getElementById('ef-proj').focus(); }, 50);
}
function closeEditModal() {
  document.getElementById('edit-modal').style.display = 'none';
}
async function saveEditModal() {
  var id = document.getElementById('edit-modal').dataset.id;
  if(!id) return;
  function g(eid){ var el=document.getElementById(eid); return el?el.value.trim():''; }
  var proj = g('ef-proj');
  if(!proj){ document.getElementById('ef-proj').focus(); return; }
  var fields = {};
  fields[F.DATE]        = g('ef-date');
  fields[F.PROJECT]     = proj;
  fields[F.CONTRACTOR]  = g('ef-cont') || 'MBB';
  fields[F.MAIN_CONT]   = g('ef-mc');
  fields[F.CLIENT]      = g('ef-client');
  fields[F.RTU]         = g('ef-rtu') || '--';
  fields[F.STATUS]      = g('ef-status');
  fields[F.PROPOSAL]    = g('ef-prop');
  var docsVal = g('ef-docs'); if(docsVal) fields[F.DOCS] = docsVal;
  var dlVal = document.getElementById('ef-deadline').value;
  fields[F.DEADLINE] = dlVal || null;
  // Update local item
  var item = items.find(function(i){ return i._id === id; });
  if(item){
    item.date=fields[F.DATE]; item.project=fields[F.PROJECT];
    item.contractor=fields[F.CONTRACTOR]; item.main_cont=fields[F.MAIN_CONT];
    item.client=fields[F.CLIENT]; item.rtu=fields[F.RTU]||'--';
    item.status=normStatus(fields[F.STATUS]); item.proposal=fields[F.PROPOSAL];
    // Preserve last_update (driven by activity log, not edited directly)
    if(docsVal) item.docs=docsVal;
    item.deadline = dlVal || '';
    var rec=allRecords.find(function(r){return r.id===id;});
    if(rec){
      Object.keys(fields).forEach(function(k){ rec.fields[k]=fields[k]; });
    }
  }
  closeEditModal();
  renderKPIs(); applyFilters();
  await patchRecord(id, fields);
  toast('Changes saved','ok');
}
// edit-modal click-outside disabled


// ================================================================
// NAVIGATION
// ================================================================
var VENDOR_TABLE = 'Vendor%20Equipment%20Pricing';
var vndRecords = [];
var vndSortField = 'Vendor';
var vndSortDir = 'asc';
var vndPage = 1;
var VND_PER_PAGE = 20;
var vndEditId    = null;
var vndJumpFilter = null;

function showHome() {
  sessionStorage.setItem('mbb_screen','home');
  ['login-screen','app','vendor-screen','dashboard-screen','contractors-screen','suppliers-screen','quality-screen','employees-screen','renewals-screen','company-docs-screen','loading','petty-cash-screen','diag-screen','passwords-screen','leave-requests-screen'].forEach(function(id){
    var el=document.getElementById(id); if(el) el.style.display='none';
  });
  document.getElementById('home-screen').style.display='flex';
  if(userRole === 'admin') loadUpcomingEvents();
  updateRowCount();
}
function showOpportunities() {
  sessionStorage.setItem('mbb_screen','opportunities');
  setActivePage('opportunities');
  ['login-screen','home-screen','app','vendor-screen','dashboard-screen','contractors-screen','suppliers-screen','quality-screen','employees-screen','renewals-screen','company-docs-screen','loading'].forEach(function(id){
    document.getElementById(id).style.display='none';
  });
  document.getElementById('loading').style.display = 'flex';
  loadAll();
}
function showVendors() {
  sessionStorage.setItem('mbb_screen','vendors');
  setActivePage('vendors');
  ['login-screen','home-screen','app','vendor-screen','dashboard-screen','contractors-screen','suppliers-screen','quality-screen','employees-screen','renewals-screen','company-docs-screen','loading'].forEach(function(id){
    document.getElementById(id).style.display='none';
  });
  document.getElementById('vendor-screen').style.display='flex';
  if(!vndJumpFilter) document.getElementById('vnd-search').value = '';
  loadVendors();
}

// Override initApp to show home screen instead of going straight to opportunities
function initApp() {
  HEADERS['X-App-Password'] = appPassword;
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('loading').style.display = 'none';
  showHome();
}

// ================================================================
// VENDOR DATA
// ================================================================
async function loadVendors() {
  setVndSave('loading');
  // Show loading state in table immediately
  var tbody = document.getElementById('vnd-tbody');
  if(tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--txt3);font-size:13px">Loading…</td></tr>';
  var errBanner = document.getElementById('vnd-err-banner');
  try {
    var records = [], offset = null;
    do {
      var url = WORKER_URL+'/vendor?pageSize=100'+(offset?'&offset='+encodeURIComponent(offset):'');
      var res = await fetch(url, { headers: getHeaders() });
      if(!res.ok){ var er=await res.json().catch(function(){return{};}); throw new Error((er.error&&er.error.message)||'HTTP '+res.status); }
      var data = await res.json();
      records = records.concat(data.records||[]);
      offset = data.offset||null;
    } while(offset);
    vndRecords = records;
    setVndSave('ready');
    renderVendorKPIs();
    // Apply jump filter from supplier page if set
    if(vndJumpFilter){
      var f = vndJumpFilter; vndJumpFilter = null;
      document.getElementById('vnd-search').value = f;
    }
    renderVendorTable();
  } catch(err) {
    setVndSave('err');
    if(errBanner){ errBanner.innerHTML='<b>Failed to load vendor data:</b> '+err.message; errBanner.style.display='block'; }
    toast('Failed to load vendors: '+err.message,'err');
  }
}

function setVndSave(state) {
  var ind = document.getElementById('vnd-save-ind');
  var txt = document.getElementById('vnd-save-txt');
  if(!ind || !txt) return;
  ind.className = 'save-ind' + (state==='ready'?' saved':state==='loading'?' saving':state==='err'?' err':'');
  var msgs = {loading:'loading…', ready:'connected ✔', err:'error', saving:'saving…', saved:'saved ✔'};
  txt.textContent = msgs[state] || state;
}

function renderVendorKPIs() {
  var vendors = {};
  vndRecords.forEach(function(r){ var v = r.fields['Vendor']||''; if(v) vendors[v] = true; });
  var el = document.getElementById('vnd-kpis');
  if(!el) return;
  el.innerHTML = [
    {label:'Total Items', val: vndRecords.length, cls:''},
    {label:'Vendors', val: Object.keys(vendors).length, cls:'process'},
    {label:'Showing', val: document.getElementById('vnd-tbody') ? document.getElementById('vnd-tbody').querySelectorAll('tr').length : 0, cls:'won'},
  ].map(function(x){
    return '<div class="kpi '+x.cls+'"><div class="kpi-lbl">'+x.label+'</div><div class="kpi-val">'+x.val+'</div></div>';
  }).join('');
}

function renderVendorTable() {
  var q = (document.getElementById('vnd-search')||{value:''}).value.toLowerCase();
  var rows = vndRecords.filter(function(r){
    var f = r.fields;
    var supName = (f['Supplier Name (from Supplier)']||[])[0]||'';
    return !q || ['Vendor','Product Type','Product Make','Item','Description'].some(function(k){ return (f[k]||'').toLowerCase().indexOf(q)!==-1; }) || supName.toLowerCase().indexOf(q)!==-1;
  });

  // Sort
  rows.sort(function(a, b){
    var av = String(a.fields[vndSortField]||''), bv = String(b.fields[vndSortField]||'');
    if(vndSortField === 'Price' || vndSortField === 'Unit Price') {
      av = parseFloat(av.replace(/[^0-9.-]/g,''))||0;
      bv = parseFloat(bv.replace(/[^0-9.-]/g,''))||0;
      return vndSortDir==='asc' ? av-bv : bv-av;
    }
    return vndSortDir==='asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  var total = rows.length;
  var start = (vndPage-1)*VND_PER_PAGE;
  var page  = rows.slice(start, start+VND_PER_PAGE);

  var meta = document.getElementById('vnd-meta');
  if(meta) meta.textContent = total===0?'No results':(start+1)+'–'+Math.min(start+VND_PER_PAGE,total)+' of '+total;

  var tbody = document.getElementById('vnd-tbody');
  if(!tbody) return;
  tbody.innerHTML = page.map(function(r, i){
    var f = r.fields;
    var price = f['Price'] ? parseFloat(String(f['Price']).replace(/[^0-9.-]/g,'')).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}) : '—';
    return '<tr data-vnd-id="'+r.id+'" style="cursor:pointer">'+
      '<td class="c-vendor">'+( (f['Supplier Name (from Supplier)'] && f['Supplier Name (from Supplier)'][0]) ? '<span class="sup-link" data-vnd-sup="'+r.id+'">'+e(f['Supplier Name (from Supplier)'][0])+'</span>' : e(f['Vendor']||'') )+'</td>'+
      '<td class="c-pmake">'+e(f['Product Make']||'')+'</td>'+
      '<td class="c-ptype">'+e(f['Product Type']||'')+'</td>'+
      '<td class="c-item">'+e(f['Item']||'')+'</td>'+
      '<td class="c-desc" title="'+e(f['Description']||'')+'">'+e(f['Description']||'')+'</td>'+
      '<td class="c-price">'+price+'</td>'+
      '<td class="c-actions"><div class="row-actions">'+
        '<button class="icon-btn edit" data-vnd-edit="'+r.id+'">'+IC_PENCIL+'</button>'+
        '<button class="icon-btn del" data-vnd-del="'+r.id+'" data-vnd-vendor="'+e(f['Vendor']||'')+'" data-vnd-item="'+e(f['Item']||'')+'">'+IC_TRASH+'</button>'+
      '</div></td>'+
    '</tr>';
  }).join('') || '<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--txt3);font-size:13px">No items found</td></tr>';

  // Pagination
  renderVendorPagination(total);

  // Row interactions via delegation
  tbody.addEventListener('dblclick', function(ev){
    var row = ev.target.closest('tr[data-vnd-id]');
    if(row) openVendorModal(row.dataset.vndId);
  });
  tbody.addEventListener('click', function(ev){
    var eb = ev.target.closest('[data-vnd-edit]');
    if(eb){ openVendorModal(eb.dataset.vndEdit); return; }
    var db = ev.target.closest('[data-vnd-del]');
    if(db){ deleteVendorItem(db.dataset.vndDel, db.dataset.vndVendor, db.dataset.vndItem); return; }
  });

  // Sort headers
  document.querySelectorAll('th[data-vnd-sort]').forEach(function(th){
    var newTh = th.cloneNode(true);
    th.parentNode.replaceChild(newTh, th);
    var field = newTh.dataset.vndSort;
    newTh.classList.toggle('sort-asc',  field===vndSortField && vndSortDir==='asc');
    newTh.classList.toggle('sort-desc', field===vndSortField && vndSortDir==='desc');
    var icon = newTh.querySelector('.sort-icon');
    if(icon) icon.textContent = field===vndSortField ? (vndSortDir==='asc'?'↑':'↓') : '↕';
    newTh.addEventListener('click', function(){
      if(_resizing) return;
      if(vndSortField===field){ vndSortDir = vndSortDir==='asc'?'desc':'asc'; }
      else { vndSortField=field; vndSortDir='asc'; }
      renderVendorTable();
    });
  });

  // Column resize — must run after sort headers replaces th elements
  initColumnResize();

  renderVendorKPIs();
}

function renderVendorPagination(total) {
  var pages = Math.ceil(total/VND_PER_PAGE);
  var info = document.getElementById('vnd-pag-info');
  var btns = document.getElementById('vnd-pag-btns');
  if(info) info.textContent = pages>1?'Page '+vndPage+' of '+pages:'';
  if(!btns) return;
  if(pages<=1){btns.innerHTML='';return;}
  var h='<button class="pag-btn" onclick="vndGoPage('+(vndPage-1)+')" '+(vndPage===1?'disabled':'')+'>&#8249; prev</button>';
  for(var p=1;p<=pages;p++){
    if(p===1||p===pages||Math.abs(p-vndPage)<=1) h+='<button class="pag-btn '+(p===vndPage?'active':'')+'" onclick="vndGoPage('+p+')">'+p+'</button>';
    else if(Math.abs(p-vndPage)===2) h+='<span class="pag-ellipsis">…</span>';
  }
  h+='<button class="pag-btn" onclick="vndGoPage('+(vndPage+1)+')" '+(vndPage===pages?'disabled':'')+'>next &#8250;</button>';
  btns.innerHTML=h;
}
function vndGoPage(p){vndPage=p;renderVendorTable();}

// ── Vendor Modal ──────────────────────────────────────────────────

function setActivePage(screen) {
  // Remove all active-page classes
  document.querySelectorAll('.btn-ghost').forEach(function(b){ b.classList.remove('active-page'); });
  // Map screen name to onclick function name
  var map = {
    'opportunities': 'showOpportunities',
    'dashboard':     'showDashboard',
    'vendors':       'showVendors',
    'contractors':   'showContractors',
    'suppliers':     'showSuppliers',
  };
  var fn = map[screen];
  if(fn){
    document.querySelectorAll('.btn-ghost').forEach(function(b){
      if(b.getAttribute('onclick') && b.getAttribute('onclick').indexOf(fn) !== -1){
        b.classList.add('active-page');
      }
    });
  }
  // Also update bsub subtitle to show current module name
  var names = {
    'opportunities':'Customer Enquiry Log',
    'dashboard':    'Management Dashboard',
    'vendors':      'Supplier Equipment Pricing',
    'contractors':  'Contractors',
    'suppliers':    'Suppliers',
  };
}

function populateMainContractorDropdown(selectId, selectedValue) {
  var sel = document.getElementById(selectId);
  if(!sel) return;
  // Build sorted list of unique company names
  var names = ctrRecords
    .map(function(r){ return r.fields['Company Name']||''; })
    .filter(Boolean)
    .sort(function(a,b){ return a.localeCompare(b); });
  // Remove dupes
  names = names.filter(function(v,i,a){ return a.indexOf(v)===i; });
  sel.innerHTML = '<option value="">— Select Contractor —</option>' +
    names.map(function(n){
      return '<option value="'+e(n)+'"'+(n===selectedValue?' selected':'')+'>'+e(n)+'</option>';
    }).join('');
  // Allow freetext if the existing value isn't in the list
  if(selectedValue && names.indexOf(selectedValue) === -1 && selectedValue !== '') {
    var opt = document.createElement('option');
    opt.value = selectedValue;
    opt.textContent = selectedValue + ' (existing)';
    opt.selected = true;
    sel.insertBefore(opt, sel.children[1]);
  }
}

function populateSupplierDropdown(selectedId) {
  var sel = document.getElementById('vf-supplier-id');
  if(!sel) return;
  sel.innerHTML = '<option value="">\u2014 Select Supplier \u2014</option>';
  supRecords.slice().sort(function(a,b){
    return (a.fields['Supplier Name']||'').localeCompare(b.fields['Supplier Name']||'');
  }).forEach(function(r){
    var opt = document.createElement('option');
    opt.value = r.id;
    opt.textContent = r.fields['Supplier Name']||'';
    if(r.id === selectedId) opt.selected = true;
    sel.appendChild(opt);
  });
}
function showVendorModal() {
  vndEditId = null;
  document.getElementById('vendor-modal-title').textContent = 'Add Vendor Item';
  ['vf-vendor','vf-item','vf-desc','vf-rate','vf-price'].forEach(function(id){
    var el = document.getElementById(id); if(el) el.value='';
  });
  document.getElementById('vendor-modal').style.display = 'flex';
  setTimeout(function(){ var el=document.getElementById('vf-vendor'); if(el) el.focus(); }, 50);
}

function openVendorModal(id) {
  var rec = vndRecords.find(function(r){ return r.id===id; });
  if(!rec) return;
  vndEditId = id;
  var f = rec.fields;
  document.getElementById('vendor-modal-title').textContent = 'Edit Vendor Item';
  document.getElementById('vf-vendor').value  = f['Vendor']||'';
  var linkedSupId = (f['Supplier']||[])[0] || null;
  populateSupplierDropdown(linkedSupId);
  document.getElementById('vf-item').value    = f['Item']||'';
  document.getElementById('vf-ptype').value   = f['Product Type']||'';
  document.getElementById('vf-pmake').value   = f['Product Make']||'';
  document.getElementById('vf-desc').value    = f['Description']||'';
  document.getElementById('vf-price').value   = f['Price']||'';
  document.getElementById('vendor-modal').style.display = 'flex';
}

function closeVendorModal() {
  document.getElementById('vendor-modal').style.display = 'none';
  vndEditId = null;
}

async function saveVendorItem() {
  var supId  = document.getElementById('vf-supplier-id').value;
  var vendor = document.getElementById('vf-vendor').value.trim();
  var item   = document.getElementById('vf-item').value.trim();
  if(!supId && !vendor) {
    document.getElementById('vf-supplier-id').focus(); return;
  }
  if(!item) { document.getElementById('vf-item').focus(); return; }
  var fields = {};
  if(supId)  fields['Supplier'] = [supId];
  fields['Vendor'] = vendor || null;
  fields['Item'] = item || null;
  var ptype = document.getElementById('vf-ptype').value.trim();
  var pmake = document.getElementById('vf-pmake').value.trim();
  var desc  = document.getElementById('vf-desc').value.trim();
  var price = document.getElementById('vf-price').value.trim();
  fields['Product Type'] = ptype || null;
  fields['Product Make'] = pmake || null;
  fields['Description'] = desc || null;
  fields['Price'] = price || null;

  var savedEditId = vndEditId;
  closeVendorModal();
  setVndSave('saving');

  try {
    var url    = savedEditId ? WORKER_URL+'/vendor/'+savedEditId : WORKER_URL+'/vendor';
    var method = savedEditId ? 'PATCH' : 'POST';
    var res    = await fetch(url, { method:method, headers:getHeaders(), body:JSON.stringify({fields:fields}) });
    var data   = await res.json();
    if(!res.ok) throw new Error((data.error&&data.error.message)||'HTTP '+res.status);

    if(savedEditId) {
      var idx = vndRecords.findIndex(function(r){return r.id===savedEditId;});
      if(idx !== -1) vndRecords[idx] = data;
    } else {
      vndRecords.push(data);
    }
    setVndSave('saved');
    renderVendorKPIs();
    renderVendorTable();
    toast((savedEditId?'Item updated':'Item added'),'ok');
  } catch(err) {
    setVndSave('err');
    document.getElementById('vnd-err-banner').innerHTML = '<b>Save failed:</b> '+err.message;
    document.getElementById('vnd-err-banner').style.display = 'block';
    toast('Save failed: '+err.message,'err');
  }
}

async function deleteVendorItem(id, vendor, item) {
  if(!confirm('Delete "'+item+'" from '+vendor+'? This cannot be undone.')) return;
  setVndSave('saving');
  try {
    var res = await fetch(WORKER_URL+'/vendor/'+id, { method:'DELETE', headers:getHeaders() });
    if(!res.ok) throw new Error('HTTP '+res.status);
    vndRecords = vndRecords.filter(function(r){return r.id!==id;});
    setVndSave('saved');
    renderVendorKPIs();
    renderVendorTable();
    toast('Item deleted','ok');
  } catch(err) {
    setVndSave('err');
    toast('Delete failed: '+err.message,'err');
  }
}

// vendor-modal click-outside disabled
document.getElementById('vendor-modal').addEventListener('keydown', function(ev){
  if(ev.key==='Enter'){ ev.preventDefault(); saveVendorItem(); }
});


// ================================================================
// DASHBOARD
// ================================================================
function showDashboard() {
  sessionStorage.setItem('mbb_screen','dashboard');
  setActivePage('dashboard');
  ['login-screen','home-screen','app','vendor-screen','dashboard-screen','contractors-screen','suppliers-screen','quality-screen','employees-screen','renewals-screen','company-docs-screen','loading'].forEach(function(id){
    document.getElementById(id).style.display='none';
  });
  if(items.length === 0) {
    // Data not loaded yet — load it, then show dashboard
    document.getElementById('loading').style.display='flex';
    loadDataForDashboard();
  } else {
    document.getElementById('dashboard-screen').style.display='flex';
    Promise.all([
      ctrRecords.length===0 ? loadContractors() : Promise.resolve(),
      supRecords.length===0 ? loadSuppliers()   : Promise.resolve(),
      vndRecords.length===0 ? loadVendors()     : Promise.resolve(),
    ]).catch(function(){}).then(renderDashboard);
  }
}

async function loadDataForDashboard() {
  // Load activity log for dashboard
  try {
    var aRes = await fetch(WORKER_URL+'/activity?pageSize=100', {headers:getHeaders()});
    if(aRes.ok) { var aData=await aRes.json(); activityCache=(aData.records||[]); }
  } catch(e2){}
  try {
    var records = [], offset = null, page = 0;
    do {
      page++; if(page>20) break;
      setProgress(Math.min(10+page*30,85),'Loading data…');
      var url = WORKER_URL+'?pageSize=100'+(offset?'&offset='+encodeURIComponent(offset):'');
      var ctrl = new AbortController();
      var timer = setTimeout(function(){ctrl.abort();},15000);
      var res;
      try { res = await fetch(url,{headers:getHeaders(),signal:ctrl.signal}); } finally { clearTimeout(timer); }
      if(!res.ok){ var er=await res.json().catch(function(){return{};}); throw new Error((er.error&&er.error.message)||'HTTP '+res.status); }
      var data = await res.json();
      records = records.concat(data.records||[]);
      offset = data.offset||null;
    } while(offset);
    allRecords = records;
    parseItems();
    setProgress(100,'Done!');
    await new Promise(function(r){setTimeout(r,150);});
    document.getElementById('loading').style.display='none';
    document.getElementById('dashboard-screen').style.display='flex';
    // Load contractors + suppliers in parallel for dashboard
    Promise.all([
      ctrRecords.length===0 ? loadContractors() : Promise.resolve(),
      supRecords.length===0 ? loadSuppliers()   : Promise.resolve(),
      vndRecords.length===0 ? loadVendors()     : Promise.resolve(),
    ]).catch(function(){}).then(renderDashboard);
  } catch(err) {
    document.getElementById('loading').style.display='none';
    document.getElementById('dashboard-screen').style.display='flex';
    document.getElementById('dash-kpis').innerHTML='<div style="color:var(--red);font-size:13px">Failed to load data: '+err.message+'</div>';
  }
}

var activityCache = [];
async function renderDashboard() {
  // Always fetch fresh activity data
  var actErr = '';
  try {
    var aRes = await fetch(WORKER_URL+'/activity?pageSize=100',{headers:getHeaders()});
    var aText = await aRes.text();
    if(aRes.ok){ activityCache=(JSON.parse(aText).records||[]); }
    else { actErr = 'HTTP'+aRes.status+':'+aText.substring(0,60); }
  } catch(e2){ actErr = String(e2).substring(0,60); }
  // Re-render calendar if it's the active tab
  var calPane = document.getElementById('dash-calendar');
  if(calPane && calPane.classList.contains('active')) {
    setTimeout(renderCalendar, 50);
    return;
  }
  var all     = items;
  var won      = all.filter(function(r){return r.status==='WON';});
  var lost     = all.filter(function(r){return r.status==='LOST';});
  var pipeline = all.filter(function(r){return r.status==='PIPELINE';});
  var cancelled= all.filter(function(r){return r.status==='CANCELLED';});
  var closed   = all.filter(function(r){return r.status==='CLOSED';});
  var active   = all.filter(function(r){return r.active==='Yes';});
  var decided  = won.length + lost.length;
  var winRate  = decided > 0 ? Math.round((won.length/decided)*100) : 0;

  // Total RTU across pipeline + won
  var activeRtu = pipeline.concat(won).reduce(function(s,r){return s+(parseInt(r.rtu)||0);},0);

  // Overdue + upcoming deadlines
  var withDeadline = all.filter(function(r){
    return r.deadline && r.status!=='LOST'&&r.status!=='CANCELLED'&&r.status!=='CLOSED';
  });
  var overdue  = withDeadline.filter(function(r){return businessDaysUntil(r.deadline)===-1;});
  var upcoming = withDeadline.filter(function(r){var bd=businessDaysUntil(r.deadline);return bd!==null&&bd>=0&&bd<=5;});

  // ── KPI cards ─────────────────────────────────────────────────
  // Directory KPIs
  var dirEl = document.getElementById('dash-dir-kpis');
  if(dirEl) dirEl.innerHTML = [
    {label:'Contractors',  val:ctrRecords.length, sub:'in directory', cls:''},
    {label:'Suppliers',    val:supRecords.length, sub:'in directory', cls:'process'},
    {label:'Pricing Items',val:vndRecords.length, sub:'catalogued',   cls:''},
  ].map(function(k){
    return '<div class="dash-kpi '+k.cls+'">'+
      '<div class="dash-kpi-lbl">'+k.label+'</div>'+
      '<div class="dash-kpi-val">'+k.val+'</div>'+
      '<div class="dash-kpi-sub">'+k.sub+'</div>'+
    '</div>';
  }).join('');

  document.getElementById('dash-kpis').innerHTML = [
    {label:'Total Opportunities', val:all.length,         sub:'all time',        cls:''},
    {label:'Active (Working On)', val:active.length,      sub:'in progress',     cls:'blue'},
    {label:'Pipeline',            val:pipeline.length,    sub:'submitted',       cls:''},
    {label:'Won',                 val:won.length,         sub:'opportunities',   cls:'green'},
    {label:'Win Rate',            val:winRate+'%',        sub:decided+' decided',cls:'green'},
    {label:'Overdue Deadlines',   val:overdue.length,     sub:'need attention',  cls:overdue.length>0?'red':''},
  ].map(function(k){
    return '<div class="dash-kpi '+k.cls+'">'+
      '<div class="dash-kpi-lbl">'+k.label+'</div>'+
      '<div class="dash-kpi-val">'+k.val+'</div>'+
      '<div class="dash-kpi-sub">'+k.sub+'</div>'+
    '</div>';
  }).join('');

  // ── Status bar chart ──────────────────────────────────────────
  var statusData = [
    {label:'Pipeline',   count:pipeline.length,  color:'var(--blue)'},
    {label:'Won',        count:won.length,        color:'var(--green)'},
    {label:'Lost',       count:lost.length,       color:'var(--red)'},
    {label:'Cancelled',  count:cancelled.length,  color:'var(--txt3)'},
    {label:'Closed',     count:closed.length,     color:'var(--purple)'},
  ];
  var maxStatus = Math.max.apply(null, statusData.map(function(d){return d.count;})) || 1;
  document.getElementById('dash-bar-chart').innerHTML = statusData.map(function(d){
    var pct = Math.round((d.count/maxStatus)*100);
    return '<div class="bar-row">'+
      '<div class="bar-label">'+d.label+'</div>'+
      '<div class="bar-track"><div class="bar-fill" style="width:'+pct+'%;background:'+d.color+'"></div></div>'+
      '<div class="bar-val">'+d.count+'</div>'+
    '</div>';
  }).join('');

  // ── Win rate display ──────────────────────────────────────────
  document.getElementById('dash-win-rate').innerHTML =
    '<div class="rate-ring">'+
      '<div class="rate-ring-val">'+winRate+'%</div>'+
      '<div class="rate-ring-lbl">Win Rate</div>'+
      '<div style="margin-top:16px;font-size:12px;color:var(--txt3);text-align:center;line-height:1.8">'+
        '<span style="color:var(--green);font-weight:600">'+won.length+'</span> won &nbsp;&middot;&nbsp; '+
        '<span style="color:var(--red);font-weight:600">'+lost.length+'</span> lost<br>'+
        '<span style="color:var(--txt3)">'+decided+' decided total</span>'+
      '</div>'+
    '</div>';

  // ── RTU by status ─────────────────────────────────────────────
  var rtuData = [
    {label:'Pipeline', count:pipeline.reduce(function(s,r){return s+(parseInt(r.rtu)||0);},0), color:'var(--blue)'},
    {label:'Won',      count:won.reduce(function(s,r){return s+(parseInt(r.rtu)||0);},0),      color:'var(--green)'},
    {label:'Lost',     count:lost.reduce(function(s,r){return s+(parseInt(r.rtu)||0);},0),     color:'var(--red)'},
  ];
  var maxRtu = Math.max.apply(null, rtuData.map(function(d){return d.count;})) || 1;
  document.getElementById('dash-rtu-chart').innerHTML = rtuData.map(function(d){
    var pct = Math.round((d.count/maxRtu)*100);
    return '<div class="bar-row">'+
      '<div class="bar-label">'+d.label+'</div>'+
      '<div class="bar-track"><div class="bar-fill" style="width:'+pct+'%;background:'+d.color+'"></div></div>'+
      '<div class="bar-val">'+d.count+'</div>'+
    '</div>';
  }).join('') + '<div style="font-size:10px;color:var(--txt3);font-family:monospace;margin-top:12px">Total RTUs: '+
    rtuData.reduce(function(s,d){return s+d.count;},0)+'</div>';

  // ── Deadlines ─────────────────────────────────────────────────
  var deadlineItems = overdue.concat(upcoming).sort(function(a,b){
    var da=parseDateStr(a.deadline),db=parseDateStr(b.deadline);
    return da&&db?da-db:0;
  }).slice(0,8);
  document.getElementById('dash-deadline-count').textContent = deadlineItems.length + ' items';
  document.getElementById('dash-deadlines').innerHTML = deadlineItems.length === 0
    ? '<div style="font-size:13px;color:var(--txt3);padding:16px 0;text-align:center">No upcoming deadlines</div>'
    : deadlineItems.map(function(r){
        var bd  = businessDaysUntil(r.deadline);
        var lbl = fmtDeadline(r.deadline);
        var isOver = bd === -1;
        var pill = isOver
          ? '<span class="deadline-pill overdue">Overdue</span>'
          : '<span class="deadline-pill soon">'+bd+' day'+(bd===1?'':'s')+'</span>';
        return '<div class="deadline-item '+(isOver?'overdue':'soon')+'">'+
          '<div class="deadline-proj">'+e(r.project)+'</div>'+
          '<div class="deadline-date">'+lbl+'</div>'+
          pill+
        '</div>';
      }).join('');

  // ── Top clients ───────────────────────────────────────────────
  var clientMap = {};
  all.filter(function(r){return r.client&&r.client!=='—';}).forEach(function(r){
    clientMap[r.client] = (clientMap[r.client]||0)+1;
  });
  var topClients = Object.keys(clientMap)
    .map(function(k){return {label:k,count:clientMap[k]};})
    .sort(function(a,b){return b.count-a.count;})
    .slice(0,6);
  var maxClient = topClients.length > 0 ? topClients[0].count : 1;
  document.getElementById('dash-client-chart').innerHTML = topClients.length === 0
    ? '<div style="font-size:13px;color:var(--txt3);padding:16px 0">No client data</div>'
    : topClients.map(function(d){
        var pct = Math.round((d.count/maxClient)*100);
        return '<div class="bar-row">'+
          '<div class="bar-label" style="font-size:10px">'+d.label+'</div>'+
          '<div class="bar-track"><div class="bar-fill" style="width:'+pct+'%;background:var(--amber)"></div></div>'+
          '<div class="bar-val">'+d.count+'</div>'+
        '</div>';
      }).join('');

  // ── Recent activity ───────────────────────────────────────────
  // Build actMap: latest activity per opportunity (keyed by opp record ID)
  var actMap = {};
  (activityCache||[]).forEach(function(ar){
    var oppIds = ar.fields['Opportunity']||[];
    var dateStr = ar.fields['Date']||'';
    var note    = ar.fields['Note']||'';
    // Skip if no linked opportunity
    if(!oppIds.length) return;
    var oppId = oppIds[0];
    if(!actMap[oppId] || dateStr > actMap[oppId].date) {
      actMap[oppId] = {date:dateStr, note:note||'(no note)', author:ar.fields['Author']||''};
    }
  });
  // Build recent: match actMap keys against allRecords (not just items)
  var recentIds = Object.keys(actMap)
    .sort(function(a,b){ return actMap[b].date.localeCompare(actMap[a].date); })
    .slice(0,5);
  var recMap = {};
  allRecords.forEach(function(r){ recMap[r.id]=r; });
  var recent = recentIds.map(function(id){
    var rec = recMap[id];
    if(!rec) return null;
    var f = rec.fields;
    return {
      _id: rec.id,
      sr_no:   f['SR. No.']||'—',
      project: f['Name of Project']||'—',
      status:  f['Status']||'PIPELINE',
      act:     actMap[id]
    };
  }).filter(Boolean);
  var badgeStyle = {
    'WON':           'background:#d1fae5;color:#065f46',
    'LOST':          'background:#fee2e2;color:#7f1d1d',
    'CANCELLED':     'background:#f3f4f6;color:#374151',
    'PIPELINE':      'background:#dbeafe;color:#1e3a5f',
    'CLOSED':        'background:#ede9fe;color:#4c1d95',
  };
  // ── Recently added contractors ─────────────────────────────────
    document.getElementById('dash-recent').innerHTML = recent.length === 0
    ? '<tr><td colspan="5" style="padding:8px;color:var(--txt3);text-align:center;font-size:11px;font-family:monospace">'+'ac:'+activityCache.length+' ak:'+Object.keys(actMap).length+' ri:'+recentIds.length+' ar:'+allRecords.length+' e:'+(actErr||'ok')+'</td></tr>'
    : recent.map(function(r){
        var statusKey = (r.status||'').toUpperCase().replace(/\s+/g,'_');
        var bs  = badgeStyle[statusKey] || badgeStyle[r.status] || badgeStyle['PIPELINE'];
        var act = r.act || {};
        var actDate = act.date ? new Date(act.date).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'2-digit'}) : '—';
        return '<tr>'+
          '<td style="font-family:monospace;font-size:11px;color:var(--txt3);white-space:nowrap">'+e(r.sr_no)+'</td>'+
          '<td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+e(r.project)+'</td>'+
          '<td><span class="kpi-badge" style="'+bs+'">'+e(r.status)+'</span></td>'+
          '<td style="font-size:11px;color:var(--txt3);white-space:nowrap">'+actDate+'</td>'+
          '<td style="max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--txt2);font-size:12px">'+e(act.note||'—')+'</td>'+
        '</tr>';
      }).join('');
}

// ================================================================
// CONTRACTORS
// ================================================================
var ctrRecords  = [];
var ctrSortField = 'Company Name';
var ctrSortDir   = 'asc';
var ctrPage      = 1;
var CTR_PER_PAGE = 50;
var ctrEditId    = null;

function showContractors() {
  sessionStorage.setItem('mbb_screen','contractors');
  setActivePage('contractors');
  ['login-screen','home-screen','app','vendor-screen','dashboard-screen','contractors-screen','suppliers-screen','quality-screen','employees-screen','renewals-screen','company-docs-screen','loading'].forEach(function(id){
    document.getElementById(id).style.display='none';
  });
  document.getElementById('contractors-screen').style.display='flex';
  loadContractors();
}

function setCtrSave(state) {
  var ind=document.getElementById('ctr-save-ind');
  var txt=document.getElementById('ctr-save-txt');
  if(!ind||!txt) return;
  ind.className='save-ind'+(state==='ready'?' saved':state==='loading'?' saving':state==='err'?' err':'');
  var msgs={loading:'loading…',ready:'connected ✔',err:'error',saving:'saving…',saved:'saved ✔'};
  txt.textContent=msgs[state]||state;
}

async function loadContractors() {
  setCtrSave('loading');
  var tbody=document.getElementById('ctr-tbody');
  if(tbody) tbody.innerHTML='<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--txt3);font-size:13px">Loading…</td></tr>';
  var errBanner=document.getElementById('ctr-err-banner');
  try {
    var records=[],offset=null;
    do {
      var url=WORKER_URL+'/contractors?pageSize=100'+(offset?'&offset='+encodeURIComponent(offset):'');
      var res=await fetch(url,{headers:getHeaders()});
      if(!res.ok){var er=await res.json().catch(function(){return{};});throw new Error((er.error&&er.error.message)||'HTTP '+res.status);}
      var data=await res.json();
      records=records.concat(data.records||[]);
      offset=data.offset||null;
    } while(offset);
    ctrRecords=records;
    setCtrSave('ready');
    renderContractorKPIs();
    renderContractorsTable();
  } catch(err) {
    setCtrSave('err');
    if(errBanner){errBanner.innerHTML='<b>Failed to load contractors:</b> '+err.message;errBanner.style.display='block';}
    toast('Failed to load contractors: '+err.message,'err');
  }
}

function renderContractorKPIs() {
  var el=document.getElementById('ctr-kpis');
  if(!el) return;
  var withEmail=ctrRecords.filter(function(r){return r.fields['Contact Email'];}).length;
  el.innerHTML=[
    {label:'Total Contractors', val:ctrRecords.length, cls:''},
    {label:'With Email',        val:withEmail,          cls:'process'},
    {label:'Showing',           val:Math.min(ctrRecords.length, CTR_PER_PAGE), cls:'won'},
  ].map(function(k){
    return '<div class="kpi '+k.cls+'"><div class="kpi-lbl">'+k.label+'</div><div class="kpi-val">'+k.val+'</div></div>';
  }).join('');
}

function renderContractorsTable() {
  var q=(document.getElementById('ctr-search')||{value:''}).value.toLowerCase();
  var rows=ctrRecords.filter(function(r){
    var f=r.fields;
    return !q||['Company Name','Contact Name','Contact Email','Comments'].some(function(k){
      return (f[k]||'').toLowerCase().indexOf(q)!==-1;
    });
  });

  // Sort
  rows.sort(function(a,b){
    var av=String(a.fields[ctrSortField]||''),bv=String(b.fields[ctrSortField]||'');
    return ctrSortDir==='asc'?av.localeCompare(bv):bv.localeCompare(av);
  });

  var total=rows.length;
  var start=(ctrPage-1)*CTR_PER_PAGE;
  var page=rows.slice(start,start+CTR_PER_PAGE);

  var meta=document.getElementById('ctr-meta');
  if(meta) meta.textContent=total===0?'No results':(start+1)+'–'+Math.min(start+CTR_PER_PAGE,total)+' of '+total;

  var tbody=document.getElementById('ctr-tbody');
  if(!tbody) return;

  tbody.innerHTML=page.map(function(r){
    var f=r.fields;
    var email=f['Contact Email']||'';
    var emailCell=email?'<a href="mailto:'+e(email)+'" style="color:var(--blue);text-decoration:none">'+e(email)+'</a>':'<span style="color:var(--txt3)">—</span>';
    var phone=f['Contact Number']||'';
    var phoneCell=phone?'<a href="tel:'+e(phone)+'" style="color:var(--txt);text-decoration:none">'+e(phone)+'</a>':'<span style="color:var(--txt3)">—</span>';
    return '<tr data-ctr-id="'+r.id+'" style="cursor:pointer">'+
      '<td class="c-company">'+e(f['Company Name']||'')+'</td>'+
      '<td class="c-contact">'+e(f['Contact Name']||'—')+'</td>'+
      '<td class="c-phone">'+phoneCell+'</td>'+
      '<td class="c-email">'+emailCell+'</td>'+
      '<td class="c-website">'+ (f['Website'] ? '<a href="'+e(f['Website'])+'" target="_blank" rel="noopener" style="color:var(--blue);text-decoration:none;font-size:11px">'+e(f['Website'].replace(/^https?:\/\//,''))+'</a>' : '<span style="color:var(--txt3)">—</span>') +'</td>'+
      '<td class="c-comments">'+e(f['Comments']||'')+'</td>'+
      '<td class="c-actions"><div class="row-actions">'+
        '<button class="icon-btn edit" data-ctr-edit="'+r.id+'">'+IC_PENCIL+'</button>'+
        '<button class="icon-btn del" data-ctr-del="'+r.id+'" data-ctr-name="'+e(f['Company Name']||'')+'">'+IC_TRASH+'</button>'+
      '</div></td>'+
    '</tr>';
  }).join('')||'<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--txt3);font-size:13px">No contractors found</td></tr>';

  // Pagination
  renderCtrPagination(total);

  // Sort headers
  document.querySelectorAll('th[data-ctr-sort]').forEach(function(th){
    var newTh=th.cloneNode(true); th.parentNode.replaceChild(newTh,th);
    var field=newTh.dataset.ctrSort;
    newTh.classList.toggle('sort-asc',  field===ctrSortField&&ctrSortDir==='asc');
    newTh.classList.toggle('sort-desc', field===ctrSortField&&ctrSortDir==='desc');
    var icon=newTh.querySelector('.sort-icon');
    if(icon) icon.textContent=field===ctrSortField?(ctrSortDir==='asc'?'↑':'↓'):'↕';
    newTh.addEventListener('click',function(){
      if(_resizing) return;
      if(ctrSortField===field){ctrSortDir=ctrSortDir==='asc'?'desc':'asc';}
      else{ctrSortField=field;ctrSortDir='asc';}
      renderContractorsTable();
    });
  });

  // Row interactions
  tbody.addEventListener('dblclick',function(ev){
    var row=ev.target.closest('tr[data-ctr-id]');
    if(row) openContractorModal(row.dataset.ctrId);
  });
  tbody.addEventListener('click',function(ev){
    var eb=ev.target.closest('[data-ctr-edit]');
    if(eb){openContractorModal(eb.dataset.ctrEdit);return;}
    var db=ev.target.closest('[data-ctr-del]');
    if(db){deleteContractor(db.dataset.ctrDel,db.dataset.ctrName);return;}
  });

  renderContractorKPIs();
}

function renderCtrPagination(total) {
  var pages=Math.ceil(total/CTR_PER_PAGE);
  var info=document.getElementById('ctr-pag-info');
  var btns=document.getElementById('ctr-pag-btns');
  if(info) info.textContent=pages>1?'Page '+ctrPage+' of '+pages:'';
  if(!btns) return;
  if(pages<=1){btns.innerHTML='';return;}
  var h='<button class="pag-btn" onclick="ctrGoPage('+(ctrPage-1)+')" '+(ctrPage===1?'disabled':'')+'>&#8249; prev</button>';
  for(var p=1;p<=pages;p++){
    if(p===1||p===pages||Math.abs(p-ctrPage)<=1) h+='<button class="pag-btn '+(p===ctrPage?'active':'')+'" onclick="ctrGoPage('+p+')">'+p+'</button>';
    else if(Math.abs(p-ctrPage)===2) h+='<span class="pag-ellipsis">…</span>';
  }
  h+='<button class="pag-btn" onclick="ctrGoPage('+(ctrPage+1)+')" '+(ctrPage===pages?'disabled':'')+'>next &#8250;</button>';
  btns.innerHTML=h;
}
function ctrGoPage(p){ctrPage=p;renderContractorsTable();}

// ── Contractor Modal ──────────────────────────────────────────────
function showContractorModal() {
  ctrEditId=null;
  document.getElementById('ctr-modal-title').textContent='Add Contractor';
  ['cf-company','cf-contact','cf-phone','cf-email','cf-website','cf-comments'].forEach(function(id){
    var el=document.getElementById(id); if(el) el.value='';
  });
  document.getElementById('contractor-modal').style.display='flex';
  setTimeout(function(){var el=document.getElementById('cf-company');if(el)el.focus();},50);
}

function openContractorModal(id) {
  var rec=ctrRecords.find(function(r){return r.id===id;});
  if(!rec) return;
  ctrEditId=id;
  var f=rec.fields;
  document.getElementById('ctr-modal-title').textContent='Edit Contractor';
  document.getElementById('cf-company').value  = f['Company Name']||'';
  document.getElementById('cf-contact').value  = f['Contact Name']||'';
  document.getElementById('cf-phone').value    = f['Contact Number']||'';
  document.getElementById('cf-email').value    = f['Contact Email']||'';
  document.getElementById('cf-website').value  = f['Website']||'';
  document.getElementById('cf-comments').value = f['Comments']||'';
  document.getElementById('contractor-modal').style.display='flex';
  setTimeout(function(){var el=document.getElementById('cf-company');if(el)el.focus();},50);
}

function closeContractorModal() {
  document.getElementById('contractor-modal').style.display='none';
  ctrEditId=null;
}

async function saveContractor() {
  var company=document.getElementById('cf-company').value.trim();
  if(!company){document.getElementById('cf-company').focus();return;}
  var savedId=ctrEditId;
  closeContractorModal();
  setCtrSave('saving');
  var fields={};
  fields['Company Name']  = company;
  var contact=document.getElementById('cf-contact').value.trim();
  var phone  =document.getElementById('cf-phone').value.trim();
  var email  =document.getElementById('cf-email').value.trim();
  var comments=document.getElementById('cf-comments').value.trim();
  fields['Contact Name'] = contact || null;
  fields['Contact Number'] = phone || null;
  fields['Contact Email'] = email || null;
  var website =document.getElementById('cf-website').value.trim();
  fields['Website'] = website || null;
  fields['Comments'] = comments || null;
  try {
    var url    = savedId ? WORKER_URL+'/contractors/'+savedId : WORKER_URL+'/contractors';
    var method = savedId ? 'PATCH' : 'POST';
    var res    = await fetch(url,{method:method,headers:getHeaders(),body:JSON.stringify({fields:fields})});
    var data   = await res.json();
    if(!res.ok) throw new Error((data.error&&data.error.message)||'HTTP '+res.status);
    if(savedId){
      var idx=ctrRecords.findIndex(function(r){return r.id===savedId;});
      if(idx!==-1) ctrRecords[idx]=data;
    } else {
      ctrRecords.push(data);
    }
    setCtrSave('saved');
    renderContractorKPIs();
    renderContractorsTable();
    toast((savedId?'Contractor updated':'Contractor added'),'ok');
  } catch(err) {
    setCtrSave('err');
    var eb=document.getElementById('ctr-err-banner');
    if(eb){eb.innerHTML='<b>Save failed:</b> '+err.message;eb.style.display='block';}
    toast('Save failed: '+err.message,'err');
  }
}

async function deleteContractor(id,name) {
  if(!confirm('Delete "'+name+'"? This cannot be undone.')) return;
  setCtrSave('saving');
  try {
    var res=await fetch(WORKER_URL+'/contractors/'+id,{method:'DELETE',headers:getHeaders()});
    if(!res.ok) throw new Error('HTTP '+res.status);
    ctrRecords=ctrRecords.filter(function(r){return r.id!==id;});
    setCtrSave('saved');
    renderContractorKPIs();
    renderContractorsTable();
    toast('Contractor deleted','ok');
  } catch(err) {
    setCtrSave('err');
    toast('Delete failed: '+err.message,'err');
  }
}

// contractor-modal click-outside disabled
document.getElementById('contractor-modal').addEventListener('keydown',function(ev){if(ev.key==='Enter'){ev.preventDefault();saveContractor();}});

// ================================================================
// SUPPLIERS
// ================================================================
var supRecords   = [];
var supSortField = 'Supplier Name';
var supSortDir   = 'asc';
var supPage      = 1;
var SUP_PER_PAGE = 50;
var supEditId    = null;

function showSuppliers() {
  sessionStorage.setItem('mbb_screen','suppliers');
  setActivePage('suppliers');
  ['login-screen','home-screen','app','vendor-screen','dashboard-screen','contractors-screen','suppliers-screen','quality-screen','employees-screen','renewals-screen','company-docs-screen','loading'].forEach(function(id){
    document.getElementById(id).style.display='none';
  });
  document.getElementById('suppliers-screen').style.display='flex';
  loadSuppliers();
}

function setSupSave(state) {
  var ind=document.getElementById('sup-save-ind');
  var txt=document.getElementById('sup-save-txt');
  if(!ind||!txt) return;
  ind.className='save-ind'+(state==='ready'?' saved':state==='loading'?' saving':state==='err'?' err':'');
  var msgs={loading:'loading…',ready:'connected ✔',err:'error',saving:'saving…',saved:'saved ✔'};
  txt.textContent=msgs[state]||state;
}

async function loadSuppliers() {
  setSupSave('loading');
  var tbody=document.getElementById('sup-tbody');
  if(tbody) tbody.innerHTML='<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--txt3);font-size:13px">Loading…</td></tr>';
  try {
    var records=[],offset=null;
    do {
      var url=WORKER_URL+'/suppliers?pageSize=100'+(offset?'&offset='+encodeURIComponent(offset):'');
      var res=await fetch(url,{headers:getHeaders()});
      if(!res.ok){var er=await res.json().catch(function(){return{};});throw new Error((er.error&&er.error.message)||'HTTP '+res.status);}
      var data=await res.json();
      records=records.concat(data.records||[]);
      offset=data.offset||null;
    } while(offset);
    supRecords=records;
    setSupSave('ready');
    renderSupplierKPIs();
    renderSuppliersTable();
  } catch(err) {
    setSupSave('err');
    var eb=document.getElementById('sup-err-banner');
    if(eb){eb.innerHTML='<b>Failed to load suppliers:</b> '+err.message;eb.style.display='block';}
    toast('Failed to load suppliers: '+err.message,'err');
  }
}

function renderSupplierKPIs() {
  var el=document.getElementById('sup-kpis');
  if(!el) return;
  var withProducts=supRecords.filter(function(r){return r.fields['Approved Products/Services'];}).length;
  el.innerHTML=[
    {label:'Total Suppliers', val:supRecords.length, cls:''},
    {label:'With Products',   val:withProducts,       cls:'process'},
    {label:'Showing',         val:Math.min(supRecords.length,SUP_PER_PAGE), cls:'won'},
  ].map(function(k){
    return '<div class="kpi '+k.cls+'"><div class="kpi-lbl">'+k.label+'</div><div class="kpi-val">'+k.val+'</div></div>';
  }).join('');
}

function renderSuppliersTable() {
  var q=(document.getElementById('sup-search')||{value:''}).value.toLowerCase();
  var rows=supRecords.filter(function(r){
    var f=r.fields;
    return !q||['Supplier Name','Contact Person','Email','Approved Products/Services'].some(function(k){
      return (f[k]||'').toLowerCase().indexOf(q)!==-1;
    });
  });
  rows.sort(function(a,b){
    var av=String(a.fields[supSortField]||''),bv=String(b.fields[supSortField]||'');
    return supSortDir==='asc'?av.localeCompare(bv):bv.localeCompare(av);
  });
  var total=rows.length;
  var start=(supPage-1)*SUP_PER_PAGE;
  var page=rows.slice(start,start+SUP_PER_PAGE);
  var meta=document.getElementById('sup-meta');
  if(meta) meta.textContent=total===0?'No results':(start+1)+'–'+Math.min(start+SUP_PER_PAGE,total)+' of '+total;
  var tbody=document.getElementById('sup-tbody');
  if(!tbody) return;
  tbody.innerHTML=page.map(function(r){
    var f=r.fields;
    var email=f['Email']||'';
    var emailCell=email?'<a href="mailto:'+e(email)+'" style="color:var(--blue);text-decoration:none">'+e(email)+'</a>':'<span style="color:var(--txt3)">—</span>';
    var phone=f['Contact Number']||'';
    var phoneCell=phone?'<a href="tel:'+e(phone)+'" style="color:var(--txt);text-decoration:none">'+e(phone)+'</a>':'<span style="color:var(--txt3)">—</span>';
    return '<tr data-sup-id="'+r.id+'" style="cursor:pointer">'+
      '<td class="c-supplier">'+e(f['Supplier Name']||'')+'</td>'+
      '<td class="c-sup-person">'+e(f['Contact Person']||'—')+'</td>'+
      '<td class="c-sup-phone">'+phoneCell+'</td>'+
      '<td class="c-sup-email">'+emailCell+'</td>'+
      '<td class="c-sup-products" title="'+e(f['Approved Products/Services']||'')+'">'+e(f['Approved Products/Services']||'')+'</td>'+
      '<td class="c-website">'+(f['Website']?'<a href="'+e(f['Website'])+'" target="_blank" rel="noopener" onclick="event.stopPropagation()" style="color:var(--blue);text-decoration:none;font-size:12px">'+e(f['Website'].replace(/^https?:\/\//,''))+'</a>':'—')+'</td>'+
      '<td style="text-align:center;width:40px">'+(f['Link to Evaluation']?'<a href="'+e(f['Link to Evaluation'])+'" target="_blank" rel="noopener" onclick="event.stopPropagation()" style="color:var(--blue);font-size:18px;text-decoration:none">&#128279;</a>':'<span style="opacity:.15;font-size:18px">&#128279;</span>')+'</td>'+
      '<td class="c-actions"><div class="row-actions">'+
        '<button class="icon-btn" data-sup-drawer-id="'+r.id+'" data-sup-drawer-name="'+e(f['Supplier Name']||'')+'" style="opacity:1;color:var(--amber)">'+IC_DOCS+'</button>'+
        '<button class="icon-btn edit" data-sup-edit="'+r.id+'">'+IC_PENCIL+'</button>'+
        '<button class="icon-btn del" data-sup-del="'+r.id+'" data-sup-name="'+e(f['Supplier Name']||'')+'">'+IC_TRASH+'</button>'+
      '</div></td>'+
    '</tr>';
  }).join('')||'<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--txt3);font-size:13px">No suppliers found</td></tr>';

  renderSupPagination(total);

  document.querySelectorAll('th[data-sup-sort]').forEach(function(th){
    var newTh=th.cloneNode(true); th.parentNode.replaceChild(newTh,th);
    var field=newTh.dataset.supSort;
    newTh.classList.toggle('sort-asc',  field===supSortField&&supSortDir==='asc');
    newTh.classList.toggle('sort-desc', field===supSortField&&supSortDir==='desc');
    var icon=newTh.querySelector('.sort-icon');
    if(icon) icon.textContent=field===supSortField?(supSortDir==='asc'?'↑':'↓'):'↕';
    newTh.addEventListener('click',function(){
      if(_resizing) return;
      if(supSortField===field){supSortDir=supSortDir==='asc'?'desc':'asc';}
      else{supSortField=field;supSortDir='asc';}
      renderSuppliersTable();
    });
  });

  tbody.addEventListener('dblclick',function(ev){
    var row=ev.target.closest('tr[data-sup-id]');
    if(row) openSupplierModal(row.dataset.supId);
  });
  tbody.addEventListener('click',function(ev){
    var pb=ev.target.closest('[data-sup-drawer-id]');
    if(pb){ openPricingDrawer(pb.dataset.supDrawerId, pb.dataset.supDrawerName); return; }
    var eb=ev.target.closest('[data-sup-edit]');
    if(eb){openSupplierModal(eb.dataset.supEdit);return;}
    var db=ev.target.closest('[data-sup-del]');
    if(db){deleteSupplier(db.dataset.supDel,db.dataset.supName);return;}
  });

  renderSupplierKPIs();
}

function renderSupPagination(total) {
  var pages=Math.ceil(total/SUP_PER_PAGE);
  var info=document.getElementById('sup-pag-info');
  var btns=document.getElementById('sup-pag-btns');
  if(info) info.textContent=pages>1?'Page '+supPage+' of '+pages:'';
  if(!btns||pages<=1){if(btns)btns.innerHTML='';return;}
  var h='<button class="pag-btn" onclick="supGoPage('+(supPage-1)+')" '+(supPage===1?'disabled':'')+'>&#8249; prev</button>';
  for(var p=1;p<=pages;p++){
    if(p===1||p===pages||Math.abs(p-supPage)<=1) h+='<button class="pag-btn '+(p===supPage?'active':'')+'" onclick="supGoPage('+p+')">'+p+'</button>';
    else if(Math.abs(p-supPage)===2) h+='<span class="pag-ellipsis">…</span>';
  }
  h+='<button class="pag-btn" onclick="supGoPage('+(supPage+1)+')" '+(supPage===pages?'disabled':'')+'>next &#8250;</button>';
  btns.innerHTML=h;
}
function supGoPage(p){supPage=p;renderSuppliersTable();}

function showSupplierModal() {
  supEditId=null;
  document.getElementById('sup-modal-title').textContent='Add Supplier';
  ['sf-name','sf-person','sf-phone','sf-email','sf-products'].forEach(function(id){
    var el=document.getElementById(id); if(el) el.value='';
  });
  document.getElementById('supplier-modal').style.display='flex';
  setTimeout(function(){var el=document.getElementById('sf-name');if(el)el.focus();},50);
}

function openSupplierModal(id) {
  var rec=supRecords.find(function(r){return r.id===id;});
  if(!rec) return;
  supEditId=id;
  var f=rec.fields;
  document.getElementById('sup-modal-title').textContent='Edit Supplier';
  document.getElementById('sf-name').value     = f['Supplier Name']||'';
  document.getElementById('sf-person').value   = f['Contact Person']||'';
  document.getElementById('sf-phone').value    = f['Contact Number']||'';
  document.getElementById('sf-email').value    = f['Email']||'';
  document.getElementById('sf-products').value = f['Approved Products/Services']||'';
  document.getElementById('sf-website').value  = f['Website']||'';
  document.getElementById('sf-eval').value     = f['Link to Evaluation']||'';
  document.getElementById('supplier-modal').style.display='flex';
  setTimeout(function(){var el=document.getElementById('sf-name');if(el)el.focus();},50);
}

function closeSupplierModal() {
  document.getElementById('supplier-modal').style.display='none';
  supEditId=null;
}

async function saveSupplier() {
  var name=document.getElementById('sf-name').value.trim();
  if(!name){document.getElementById('sf-name').focus();return;}
  var savedId=supEditId;
  closeSupplierModal();
  setSupSave('saving');
  var fields={'Supplier Name':name};
  var person  =document.getElementById('sf-person').value.trim();
  var phone   =document.getElementById('sf-phone').value.trim();
  var email   =document.getElementById('sf-email').value.trim();
  var products=document.getElementById('sf-products').value.trim();
  fields['Contact Person'] = person || null;
  fields['Contact Number'] = phone || null;
  fields['Email'] = email || null;
  fields['Approved Products/Services'] = products || null;
  var evalLink=document.getElementById('sf-eval').value.trim();
  var website = document.getElementById('sf-website').value.trim();
  fields['Website'] = website || null;
  fields['Link to Evaluation'] = evalLink || null;
  try {
    var url   =savedId?WORKER_URL+'/suppliers/'+savedId:WORKER_URL+'/suppliers';
    var method=savedId?'PATCH':'POST';
    var res   =await fetch(url,{method:method,headers:getHeaders(),body:JSON.stringify({fields:fields})});
    var data  =await res.json();
    if(!res.ok) throw new Error((data.error&&data.error.message)||'HTTP '+res.status);
    if(savedId){
      var idx=supRecords.findIndex(function(r){return r.id===savedId;});
      if(idx!==-1) supRecords[idx]=data;
    } else {
      supRecords.push(data);
      sendSupplierEvalEmail(
        fields['Supplier Name']||'New Supplier',
        fields['Contact Person']||''
      );
    }
    setSupSave('saved');
    renderSupplierKPIs();
    renderSuppliersTable();
    toast(savedId?'Supplier updated':'Supplier added','ok');
  } catch(err) {
    setSupSave('err');
    var eb=document.getElementById('sup-err-banner');
    if(eb){eb.innerHTML='<b>Save failed:</b> '+err.message;eb.style.display='block';}
    toast('Save failed: '+err.message,'err');
  }
}

var pendingSupDeleteId = null;

function deleteSupplier(id, name) {
  pendingSupDeleteId = id;
  document.getElementById('confirm-title').textContent = 'Delete supplier?';
  document.getElementById('confirm-body').innerHTML = 'This will permanently delete <b>'+e(name)+'</b> and all associated records.<br><br>This cannot be undone.';
  document.getElementById('confirm-modal').style.display = 'flex';
}

async function confirmDeleteSupplier() {
  if(!pendingSupDeleteId) return;
  var id = pendingSupDeleteId; pendingSupDeleteId = null;
  closeConfirm();
  setSupSave('saving');
  try {
    var res = await fetch(WORKER_URL+'/suppliers/'+id, {method:'DELETE', headers:getHeaders()});
    if(!res.ok) throw new Error('HTTP '+res.status);
    supRecords = supRecords.filter(function(r){ return r.id !== id; });
    setSupSave('saved');
    renderSupplierKPIs();
    renderSuppliersTable();
    toast('Supplier deleted','ok');
  } catch(err) {
    setSupSave('err');
    toast('Delete failed: '+err.message,'err');
  }
}

// supplier-modal click-outside disabled
document.getElementById('supplier-modal').addEventListener('keydown',function(ev){if(ev.key==='Enter'){ev.preventDefault();saveSupplier();}});

function jumpToSupplierFromVendor(vndRecordId) {
  var rec = vndRecords.find(function(r){ return r.id===vndRecordId; });
  if(!rec) return;
  var linkedIds = rec.fields['Supplier'] || [];
  var supplierName = (rec.fields['Supplier Name (from Supplier)']||[])[0] || '';
  if(!supplierName) return;
  // Navigate to suppliers, then highlight/filter to this supplier
  showSuppliers();
  // After load, filter to this supplier
  sessionStorage.setItem('mbb_sup_filter', supplierName);
}

// ================================================================
// PRICING DRAWER
// ================================================================
var drawerSupplierId   = null;
var pendingActivityDeleteId = null;
var drawerSupplierName = null;

function openPricingDrawer(supplierId, supplierName) {
  drawerSupplierId   = supplierId;
  drawerSupplierName = supplierName;

  document.getElementById('drawer-title').textContent    = supplierName || 'Supplier Pricing';
  document.getElementById('drawer-subtitle').textContent = 'Equipment & pricing records';
  document.getElementById('drawer-body').innerHTML       = '<div class="drawer-empty">Loading…</div>';

  // Wire up add button
  var addBtn = document.getElementById('drawer-add-btn');
  addBtn.onclick = function() { openDrawerAddModal(supplierId, supplierName); };

  document.getElementById('pricing-drawer').classList.add('open');
  document.getElementById('pricing-overlay').classList.add('open');

  // Load vendor records if not yet loaded, then render
  if(vndRecords.length === 0) {
    loadVendors().then(function(){
      renderPricingDrawer(supplierId);
    }).catch(function(err){
      document.getElementById('drawer-body').innerHTML = '<div class="drawer-empty">Failed to load: ' + err.message + '</div>';
    });
  } else {
    renderPricingDrawer(supplierId);
  }
}

function closePricingDrawer() {
  document.getElementById('pricing-drawer').classList.remove('open');
  document.getElementById('pricing-overlay').classList.remove('open');
  drawerSupplierId = null;
  drawerSupplierName = null;
}

function renderPricingDrawer(supplierId) {
  var body = document.getElementById('drawer-body');
  if(!body) return;

  // Filter vendor records by this supplier's linked ID
  // Airtable returns linked records as array of record ID strings
  var items = vndRecords.filter(function(r) {
    var linked = r.fields['Supplier'] || [];
    // Handle both array of strings and array of objects
    return linked.some(function(v){
      return v === supplierId || (v && v.id && v.id === supplierId);
    });
  });
  // Show count in subtitle + debug first record fields
  var fieldNames = items.length > 0 ? Object.keys(items[0].fields).join(', ') : 'no records';
  document.getElementById('drawer-subtitle').textContent =
    items.length + ' pricing record' + (items.length===1?'':'s');
  console.log('[Drawer] Fields in first record:', fieldNames);
  console.log('[Drawer] First record price field:', items.length > 0 ? items[0].fields['Price'] : 'N/A');

  if(items.length === 0) {
    body.innerHTML = '<div class="drawer-empty">No pricing records found for this supplier.<br><br>Use the button below to add one.</div>';
    return;
  }

  var rows = items.map(function(r) {
    var f = r.fields;
    var price = f['Price'] ? parseFloat(String(f['Price']).replace(/[^0-9.-]/g,'')).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}) : '—';
    return '<tr data-drawer-edit="'+r.id+'" style="cursor:pointer">'+
      '<td style="padding:7px 10px;font-size:12px;color:var(--txt2);border-bottom:1px solid var(--bdr);white-space:nowrap">'+e(f['Product Make']||'—')+'</td>'+
      '<td style="padding:7px 10px;font-size:12px;color:var(--txt2);border-bottom:1px solid var(--bdr);white-space:nowrap">'+e(f['Product Type']||'—')+'</td>'+
      '<td style="padding:7px 10px;font-size:12px;color:var(--txt);border-bottom:1px solid var(--bdr);white-space:nowrap">'+e(f['Item']||'—')+'</td>'+
      '<td style="padding:7px 10px;font-size:12px;color:var(--green);font-family:monospace;border-bottom:1px solid var(--bdr);text-align:right;white-space:nowrap">'+price+'</td>'+
    '</tr>';
  }).join('');
  body.innerHTML =
    '<table style="width:auto;min-width:100%;border-collapse:collapse;font-size:12px;table-layout:auto">'+
    '<thead><tr>'+
      '<th style="padding:6px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.7px;color:var(--txt3);font-family:monospace;text-align:left;border-bottom:2px solid var(--bdr2);white-space:nowrap">Product Make</th>'+
      '<th style="padding:6px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.7px;color:var(--txt3);font-family:monospace;text-align:left;border-bottom:2px solid var(--bdr2);white-space:nowrap">Product Type</th>'+
      '<th style="padding:6px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.7px;color:var(--txt3);font-family:monospace;text-align:left;border-bottom:2px solid var(--bdr2)">Item</th>'+
      '<th style="padding:6px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.7px;color:var(--txt3);font-family:monospace;text-align:right;border-bottom:2px solid var(--bdr2);white-space:nowrap">Unit Price</th>'+
    '</tr></thead>'+
    '<tbody>'+rows+'</tbody>'+
    '</table>';
  // Click row to edit
  body.addEventListener('click', function(ev){
    var row = ev.target.closest('tr[data-drawer-edit]');
    if(row) openVendorModalFromDrawer(row.dataset.drawerEdit);
  });
}

function openVendorModalFromDrawer(recordId) {
  // Load vendor records if not yet loaded, then open modal
  if(vndRecords.length === 0) {
    loadVendors().then(function(){ openVendorModal(recordId); });
  } else {
    openVendorModal(recordId);
    // After save, re-render the drawer
    var origClose = closeVendorModal;
    closeVendorModal = function() {
      origClose();
      closeVendorModal = origClose;
      if(drawerSupplierId) setTimeout(function(){ renderPricingDrawer(drawerSupplierId); }, 300);
    };
  }
}

function openDrawerAddModal(supplierId, supplierName) {
  // Load vendors if needed, then open new item modal with supplier pre-selected
  vndJumpFilter = null;
  if(vndRecords.length === 0) {
    loadVendors().then(function(){
      showVendorModal();
      setTimeout(function(){
        populateSupplierDropdown(supplierId);
      }, 50);
    });
  } else {
    showVendorModal();
    setTimeout(function(){
      populateSupplierDropdown(supplierId);
    }, 50);
  }
}

// Close drawer on Escape
document.addEventListener('keydown', function(ev) {
  if(ev.key === 'Escape') {
    if(document.getElementById('pricing-drawer').classList.contains('open')){ closePricingDrawer(); return; }
    if(document.getElementById('vendor-modal').style.display==='flex')      { closeVendorModal(); return; }
    if(document.getElementById('contractor-modal').style.display==='flex')  { closeContractorModal(); return; }
    if(document.getElementById('supplier-modal').style.display==='flex')    { closeSupplierModal(); return; }
    if(document.getElementById('confirm-modal').style.display==='flex')     { closeConfirm(); return; }
    if(document.getElementById('edit-modal').style.display==='flex')        { closeEditModal(); return; }
    if(document.getElementById('modal').style.display==='flex')             { closeModal(); return; }
  }
});

// ================================================================
// ACTIVITY LOG
// ================================================================
var ACT_TABLE   = 'Activity%20Log';
var actRecords  = {};   // keyed by opportunity record ID
var activeTabId = 'tab-details';
var currentEditId = null;  // track which opportunity is open in edit modal
var noteAuthorCache = localStorage.getItem('mbb_author') || '';

function switchTab(tabId) {
  activeTabId = tabId;
  // Tab buttons: details=0, quotes=1, bidders=2, activity=3
  var order = ['tab-details','tab-invoices','tab-quotes','tab-bidders','tab-activity'];
  document.querySelectorAll('.modal-tab').forEach(function(t, i) {
    t.classList.toggle('active', order[i] === tabId);
  });
  document.querySelectorAll('.tab-pane').forEach(function(p) {
    p.classList.toggle('active', p.id === tabId);
  });
  if(tabId === 'tab-activity' && currentEditId) loadActivityForOpportunity(currentEditId);
  if(tabId === 'tab-bidders'  && currentEditId) loadBidders(currentEditId);
  if(tabId === 'tab-quotes'   && currentEditId) loadQuotes(currentEditId);
}

function typeIcon(type) {
  var icons = {Update:'\ud83d\udcdd', Call:'\ud83d\udcde', Meeting:'\ud83d\udc65', Email:'\u2709\ufe0f', 'Site Visit':'\ud83d\udccd', Other:'\ud83d\udccc'};
  return icons[type] || '\ud83d\udccc';
}

function typeCls(type) {
  var map = {Update:'type-update', Call:'type-call', Meeting:'type-meeting', Email:'type-email', 'Site Visit':'type-site', Other:'type-other'};
  return map[type] || 'type-other';
}

function fmtFriendlyDate(isoStr) {
  if(!isoStr) return '';
  var d = new Date(isoStr);
  if(isNaN(d.getTime())) return isoStr;
  var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var day = d.getDate();
  var suffix = (day===1||day===21||day===31)?'st':(day===2||day===22)?'nd':(day===3||day===23)?'rd':'th';
  return months[d.getMonth()] + ' ' + day + suffix + ' ' + d.getFullYear();
}

function fmtActivityDate(isoStr) {
  if(!isoStr) return '';
  var d = new Date(isoStr);
  if(isNaN(d.getTime())) return isoStr;
  return d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) + ' ' +
         d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
}

async function loadActivityForOpportunity(opportunityId) {
  var list = document.getElementById('activity-list');
  if(!list) return;
  list.innerHTML = '<div class="activity-empty">Loading…</div>';

  try {
    // Paginate through all activity records
    var allRecs = [], offset = null;
    do {
      var url = WORKER_URL + '/activity?pageSize=100' + (offset ? '&offset=' + encodeURIComponent(offset) : '');
      var res = await fetch(url, {headers: getHeaders()});
      if(!res.ok) { var er=await res.json().catch(function(){return{};}); throw new Error((er.error&&er.error.message)||'HTTP '+res.status); }
      var data = await res.json();
      allRecs = allRecs.concat(data.records || []);
      offset = data.offset || null;
    } while(offset);

    // Filter client-side by opportunity ID
    var records = allRecs.filter(function(r) {
      var opp = r.fields['Opportunity'] || [];
      return opp.indexOf(opportunityId) !== -1;
    });
    actRecords[opportunityId] = records;

    // Update badge
    var badge = document.getElementById('activity-count-badge');
    if(badge) badge.textContent = records.length > 0 ? records.length : '';

    // Set last_update_date on item from most recent activity
    if(records.length > 0) {
      var latestDate = records[0].fields['Date'] || ''; // already sorted desc
      var item = items.find(function(i){return i._id===opportunityId;});
      if(item) item.last_update_date = latestDate;
    }

    if(records.length === 0) {
      list.innerHTML = '<div class="activity-empty">No activity yet.<br>Add the first note above.</div>';
      return;
    }

    list.innerHTML = records.map(function(r) {
      var f = r.fields;
      var type = f['Type'] || 'Update';
      return '<div class="activity-item" data-act-id="'+r.id+'">'+
        '<div class="activity-dot">'+typeIcon(type)+'</div>'+
        '<div class="activity-body">'+
          '<div class="activity-header">'+
            '<span class="activity-type '+typeCls(type)+'">'+type+'</span>'+
            (f['Author'] ? '<span class="activity-author">'+e(f['Author'])+'</span>' : '')+
            '<span class="activity-meta">'+fmtActivityDate(f['Date'])+'</span>'+
            '<button class="icon-btn edit" data-act-edit="'+r.id+'" style="opacity:1;margin-left:auto;color:var(--txt3)">'+IC_PENCIL+'</button>'+'<button class="icon-btn del" data-act-del="'+r.id+'" style="opacity:1;color:var(--txt3)">'+IC_TRASH+'</button>'+
          '</div>'+
          '<div class="activity-note" id="act-note-'+r.id+'">'+e(f['Note']||'')+'</div>'+
          '<div class="act-edit-form" id="act-edit-'+r.id+'" style="display:none;margin-top:8px">'+
            '<textarea style="width:100%;min-height:60px;margin:0;padding:8px 10px;font-size:13px;border:1px solid var(--amber);border-radius:var(--r);outline:none;resize:vertical;background:var(--bg);color:var(--txt);font-family:sans-serif" id="act-edit-text-'+r.id+'">'+e(f['Note']||'')+'</textarea>'+
            '<div style="display:flex;gap:8px;margin-top:8px;align-items:center">'+
              '<label style="font-size:11px;color:var(--txt3);white-space:nowrap">Date:</label>'+
              '<input type="date" id="act-edit-date-'+r.id+'" value="'+((f['Date']||'').substring(0,10))+'" style="background:var(--bg);border:1px solid var(--bdr2);border-radius:var(--r);padding:5px 8px;font-size:12px;color:var(--txt);outline:none;flex:1">'+
              '<button class="btn-pri" style="font-size:12px;padding:5px 12px" data-act-save="'+r.id+'">Save</button>'+
              '<button class="btn-cancel" style="font-size:12px;padding:5px 12px" data-act-cancel="'+r.id+'">Cancel</button>'+
            '</div>'+
          '</div>'+
        '</div>'+
      '</div>'+
      '</div>';
    }).join('');

    // Delegation handled by global edit-modal listener
  } catch(err) {
    list.innerHTML = '<div class="activity-empty" style="color:var(--red)">Failed to load: '+err.message+'</div>';
  }
}

function toggleActivityEdit(recordId, show) {
  var noteEl = document.getElementById('act-note-'+recordId);
  var formEl = document.getElementById('act-edit-'+recordId);
  if(!noteEl || !formEl) return;
  noteEl.style.display = show ? 'none' : '';
  formEl.style.display = show ? 'block' : 'none';
  if(show) {
    var ta = document.getElementById('act-edit-text-'+recordId);
    if(ta) { ta.focus(); ta.selectionStart = ta.value.length; }
  }
}

async function saveActivityEdit(recordId) {
  var ta = document.getElementById('act-edit-text-'+recordId);
  if(!ta) return;
  var newNote = ta.value.trim();
  if(!newNote) return;

  var saveBtn = document.querySelector('[data-act-save="'+recordId+'"]');
  if(saveBtn) { saveBtn.textContent = 'Saving…'; saveBtn.disabled = true; }

  try {
    var dateEl = document.getElementById('act-edit-date-'+recordId);
    var editFields = {'Note': newNote};
    if(dateEl && dateEl.value) editFields['Date'] = new Date(dateEl.value).toISOString();
    var res  = await fetch(WORKER_URL+'/activity/'+recordId, {method:'PATCH', headers:getHeaders(), body:JSON.stringify({fields:editFields})});
    var data = await res.json();
    if(!res.ok) throw new Error((data.error&&data.error.message)||'HTTP '+res.status);

    // Update local cache
    if(currentEditId && actRecords[currentEditId]) {
      var rec = actRecords[currentEditId].find(function(r){return r.id===recordId;});
      if(rec) {
        rec.fields['Note'] = newNote;
        if(dateEl && dateEl.value) rec.fields['Date'] = new Date(dateEl.value).toISOString();
      }
    }

    // Re-render
    toggleActivityEdit(recordId, false);
    var noteEl = document.getElementById('act-note-'+recordId);
    if(noteEl) noteEl.textContent = newNote;

    // Update Last Update in main table with latest note (silently)
    updateLastUpdateFromActivity(currentEditId);
    toast('Note updated','ok');
  } catch(err) {
    toast('Failed to update: '+err.message,'err');
    if(saveBtn) { saveBtn.textContent = 'Save'; saveBtn.disabled = false; }
  }
}

function updateLastUpdateFromActivity(opportunityId) {
  if(!opportunityId || !actRecords[opportunityId]) return;
  var sorted = actRecords[opportunityId].slice().sort(function(a,b){
    return new Date(b.fields['Date']||0) - new Date(a.fields['Date']||0);
  });
  if(!sorted.length) return;
  var latest = sorted[0].fields;
  var latestDate = latest['Date'] || '';
  var friendlyDate = latestDate ? fmtFriendlyDate(latestDate) : '';
  var noteText = (latest['Note']||'').substring(0,80) + ((latest['Note']||'').length>80?'…':'');
  var preview = friendlyDate ? friendlyDate + ' - ' + noteText : noteText;
  var item = items.find(function(i){return i._id===opportunityId;});
  if(item){
    item.last_update = preview;
    item.last_update_date = latestDate;
    var rec = allRecords.find(function(r){return r.id===opportunityId;});
    if(rec) rec.fields[F.LAST_UPDATE] = preview;
  }
  // Silent patch - don't show saving indicator for background update
  fetch(WORKER_URL+'/'+opportunityId, {
    method:'PATCH',
    headers:getHeaders(),
    body:JSON.stringify({fields:{[F.LAST_UPDATE]: preview}})
  }).catch(function(){});
  renderTable();
}

function deleteActivityNote(recordId) {
  pendingActivityDeleteId = recordId;
  document.getElementById('confirm-title').textContent = 'Delete note?';
  document.getElementById('confirm-body').innerHTML = 'This will permanently delete this note.<br><br>This cannot be undone.';
  document.getElementById('confirm-modal').style.display = 'flex';
}

async function confirmDeleteActivityNote() {
  if(!pendingActivityDeleteId) return;
  var recordId = pendingActivityDeleteId;
  pendingActivityDeleteId = null;
  closeConfirm();
  try {
    var res = await fetch(WORKER_URL+'/activity/'+recordId, {method:'DELETE', headers:getHeaders()});
    if(!res.ok) throw new Error('HTTP '+res.status);
    if(currentEditId && actRecords[currentEditId]) {
      actRecords[currentEditId] = actRecords[currentEditId].filter(function(r){return r.id!==recordId;});
    }
    await loadActivityForOpportunity(currentEditId);
    updateLastUpdateFromActivity(currentEditId);
    toast('Note deleted','ok');
  } catch(err) {
    toast('Failed to delete: '+err.message,'err');
  }
}

async function saveNote() {
  var note   = (document.getElementById('note-text').value||'').trim();
  var type   = document.getElementById('note-type').value;
  var author = (document.getElementById('note-author').value||'').trim();
  if(!note) { document.getElementById('note-text').focus(); return; }
  if(!currentEditId) return;

  // Cache author name
  if(author) localStorage.setItem('mbb_author', author);

  var btn = document.querySelector('#tab-activity .btn-pri');
  if(btn) { btn.textContent = 'Saving…'; btn.disabled = true; }

  try {
    var fields = {
      'Opportunity': [currentEditId],
      'Date':        (document.getElementById('note-date').value ? new Date(document.getElementById('note-date').value).toISOString() : new Date().toISOString()),
      'Note':        note,
      'Type':        type,
    };
    fields['Author'] = author || null;

    var res  = await fetch(WORKER_URL+'/activity', {method:'POST', headers:getHeaders(), body:JSON.stringify({fields:fields})});
    var data = await res.json();
    if(!res.ok) throw new Error((data.error&&data.error.message)||'HTTP '+res.status);

    // Clear form
    document.getElementById('note-text').value = '';
    document.getElementById('note-date').value = '';

    // Reload activity
    await loadActivityForOpportunity(currentEditId);

    // Update Last Update from most recent note
    updateLastUpdateFromActivity(currentEditId);
    toast('Note added','ok');
  } catch(err) {
    toast('Failed to save note: '+err.message,'err');
  } finally {
    if(btn) { btn.textContent = '+ Add Note'; btn.disabled = false; }
  }
}

// Patch openEditModal to set currentEditId, load activity count and restore author
var _origOpenEditModal = openEditModal;
openEditModal = function(id) {
  currentEditId = id;
  activeTabId   = 'tab-details';
  _origOpenEditModal(id);
  // Pre-fill author from cache
  var authorEl = document.getElementById('note-author');
  if(authorEl) authorEl.value = userName || noteAuthorCache || '';
  // Reset tabs
  document.querySelectorAll('.modal-tab').forEach(function(t,i){t.classList.toggle('active',i===0);});
  document.querySelectorAll('.tab-pane').forEach(function(p){p.classList.toggle('active',p.id==='tab-details');});
  // Clear stale data from previous opportunity
  ['activity-list','bidders-list','quotes-list','invoices-list'].forEach(function(elId){
    var el = document.getElementById(elId);
    if(el) el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--txt3);font-size:13px">Loading…</div>';
  });
  var sumEls = ['quotes-summary','invoices-summary'];
  sumEls.forEach(function(elId){ var el=document.getElementById(elId); if(el) el.style.display='none'; });
  // Clear caches for this opportunity so fresh data is always fetched
  delete actRecords[id];
  delete bidderRecords[id];
  delete quoteRecords[id];
  delete invoiceRecords[id];
  // Reset badges
  ['activity-count-badge','bidders-count-badge','quotes-count-badge','invoices-count-badge'].forEach(function(bid){
    var el=document.getElementById(bid); if(el) el.textContent='';
  });
  loadActivityForOpportunity(id).then(function(){});
  loadBidders(id);
  if(userRole !== 'engineer' && userRole !== 'viewer') loadQuotes(id);
  if(userRole === 'admin') loadInvoices(id);
};

// Also patch closeEditModal to reset currentEditId
var _origCloseEditModal = closeEditModal;
closeEditModal = function() {
  currentEditId = null;
  _origCloseEditModal();
};

// Global delegation on stable modal element (handles both activity and bidders)
document.getElementById('edit-modal').addEventListener('click', function(ev) {
  // Activity
  var editBtn = ev.target.closest('[data-act-edit]');
  if(editBtn) { toggleActivityEdit(editBtn.dataset.actEdit, true); return; }
  var saveBtn = ev.target.closest('[data-act-save]');
  if(saveBtn) { saveActivityEdit(saveBtn.dataset.actSave); return; }
  var cancelBtn = ev.target.closest('[data-act-cancel]');
  if(cancelBtn) { toggleActivityEdit(cancelBtn.dataset.actCancel, false); return; }
  var delBtn = ev.target.closest('[data-act-del]');
  if(delBtn) { deleteActivityNote(delBtn.dataset.actDel); return; }
  // Bidders
  var bidEdit = ev.target.closest('[data-bid-edit]');
  if(bidEdit) { openEditBidder(bidEdit.dataset.bidEdit); return; }
  var bidDel  = ev.target.closest('[data-bid-del]');
  if(bidDel)  { deleteBidder(bidDel.dataset.bidDel); return; }
  // Quotes
  var qteEdit = ev.target.closest('[data-qte-edit]');
  if(qteEdit) { openEditQuote(qteEdit.dataset.qteEdit); return; }
  var qteDel  = ev.target.closest('[data-qte-del]');
  if(qteDel)  { deleteQuote(qteDel.dataset.qteDel); return; }
  // Invoices
  var invEdit = ev.target.closest('[data-inv-edit]');
  if(invEdit) { openEditInvoice(invEdit.dataset.invEdit); return; }
  var invDel  = ev.target.closest('[data-inv-del]');
  if(invDel)  { deleteInvoice(invDel.dataset.invDel); return; }
});

// ── Contractors Export ────────────────────────────────────────────
function exportContractors() {
  var rows = ctrRecords.slice().sort(function(a,b){
    return (a.fields['Company Name']||'').localeCompare(b.fields['Company Name']||'');
  });
  var now = new Date();
  var dateStr = now.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
  var html = '<!DOCTYPE html><html><head><meta charset="UTF-8">'+
    '<title>mBELLAb Contractors</title>'+
    '<style>'+
      'body{font-family:Helvetica Neue,Arial,sans-serif;font-size:12px;color:#1c2128;padding:32px;max-width:960px;margin:0 auto}'+
      'h1{font-size:20px;font-weight:600;margin-bottom:4px}'+
      '.sub{font-size:11px;color:#8c959f;margin-bottom:24px}'+
      'table{width:100%;border-collapse:collapse}'+
      'th{font-size:10px;text-transform:uppercase;letter-spacing:0.7px;color:#57606a;padding:8px 10px;text-align:left;border-bottom:2px solid #eaeef2;font-weight:600}'+
      'td{padding:8px 10px;border-bottom:1px solid #eaeef2;vertical-align:top}'+
      'tr:nth-child(even) td{background:#f6f8fa}'+
      'a{color:#0969da;text-decoration:none}'+
      '@media print{body{padding:16px}}'+
    '</style></head><body>'+
    '<h1>mBELLAb &mdash; Contractors</h1>'+
    '<div class="sub">Exported '+dateStr+' &nbsp;&middot;&nbsp; '+rows.length+' contractors</div>'+
    '<table><thead><tr>'+
      '<th>Company Name</th><th>Contact Name</th><th>Contact Number</th><th>Email</th><th>Website</th><th>Comments</th>'+
    '</tr></thead><tbody>'+
    rows.map(function(r){
      var f=r.fields;
      return '<tr>'+
        '<td><b>'+e(f['Company Name']||'')+'</b></td>'+
        '<td>'+e(f['Contact Name']||'—')+'</td>'+
        '<td>'+e(f['Contact Number']||'—')+'</td>'+
        '<td>'+(f['Contact Email']?'<a href="mailto:'+e(f['Contact Email'])+'">'+e(f['Contact Email'])+'</a>':'—')+'</td>'+
        '<td>'+(f['Website']?'<a href="'+e(f['Website'])+'" target="_blank">'+e((f['Website']||'').replace(/^https?:\/\//,''))+'</a>':'—')+'</td>'+
        '<td>'+e(f['Comments']||'')+'</td>'+
      '</tr>'+notesRow;
    }).join('')+
    '</tbody></table>';
}

// ================================================================
// BIDDERS
// ================================================================
var bidderRecords  = {};  // keyed by opportunity ID
var bidderEditId   = null;

function showAddBidderForm() {
  bidderEditId = null;
  document.getElementById('add-bidder-form').style.display = 'block';
  document.getElementById('bidder-comments').value = '';
  document.getElementById('bidder-status-sel').value = 'Bidding';
  if(ctrRecords.length === 0) {
    loadContractors().then(function(){ populateBidderContractorDropdown(null); });
  } else {
    populateBidderContractorDropdown(null);
  }
}

function populateBidderContractorDropdown(selectedId) {
  // Populate contractor dropdown
  var sel = document.getElementById('bidder-contractor-sel');
  var names = ctrRecords
    .map(function(r){ return {id: r.id, name: r.fields['Company Name']||''}; })
    .filter(function(c){ return c.name; })
    .sort(function(a,b){ return a.name.localeCompare(b.name); });
  sel.innerHTML = '<option value="">— Select Contractor —</option>' +
    names.map(function(c){
      return '<option value="'+c.id+'"'+(c.id===selectedId?' selected':'')+'>'+e(c.name)+'</option>';
    }).join('');
}

function hideAddBidderForm() {
  document.getElementById('add-bidder-form').style.display = 'none';
  bidderEditId = null;
}

async function loadBidders(opportunityId) {
  var list = document.getElementById('bidders-list');
  if(!list) return;

  try {
    var url = WORKER_URL + '/bidders?pageSize=100';
    var res = await fetch(url, {headers: getHeaders()});
    if(!res.ok) throw new Error('HTTP '+res.status);
    var data = await res.json();
    var all = data.records || [];
    // Filter client-side by opportunity
    var records = all.filter(function(r){
      return (r.fields['Opportunity']||[]).indexOf(opportunityId) !== -1;
    });
    bidderRecords[opportunityId] = records;

    // Update badge
    var badge = document.getElementById('bidders-count-badge');
    if(badge) badge.textContent = records.length > 0 ? records.length : '';

    renderBiddersList(opportunityId);
  } catch(err) {
    if(list) list.innerHTML = '<div style="color:var(--red);font-size:13px;padding:16px 0">Failed to load bidders: '+err.message+'</div>';
  }
}

function statusBadgeStyle(status) {
  var map = {
    'Bidding':   'background:var(--blue-bg);color:var(--blue);border:1px solid var(--blue-bdr)',
    'Won':       'background:var(--green-bg);color:var(--green);border:1px solid var(--green-bdr)',
    'Lost':      'background:var(--red-bg);color:var(--red);border:1px solid var(--red-bdr)',
    'Withdrawn': 'background:var(--grey-bg);color:var(--txt2);border:1px solid var(--grey-bdr)',
  };
  return map[status] || map['Bidding'];
}

function renderBiddersList(opportunityId) {
  var list = document.getElementById('bidders-list');
  if(!list) return;
  var records = bidderRecords[opportunityId] || [];

  if(records.length === 0) {
    list.innerHTML = '<div style="text-align:center;padding:40px 0;color:var(--txt3);font-size:13px">No bidders added yet.<br>Use the button above to add one.</div>';
    return;
  }

  var TH = 'padding:5px 8px;font-size:10px;text-transform:uppercase;letter-spacing:.7px;color:var(--txt3);font-family:monospace;text-align:left;border-bottom:2px solid var(--bdr2);white-space:nowrap';
  list.innerHTML = '<table style="width:100%;border-collapse:collapse;font-size:12px;table-layout:fixed">'+
    '<colgroup>'+
      '<col style="width:130px">'+
      '<col style="width:76px">'+
      '<col style="">'+
      '<col style="width:56px">'+
    '</colgroup>'+
    '<thead><tr>'+
      '<th style="'+TH+'">Contractor</th>'+
      '<th style="'+TH+'">Status</th>'+
      '<th style="'+TH+'">Comments</th>'+
      '<th style="border-bottom:2px solid var(--bdr2)"></th>'+
    '</tr></thead><tbody>'+
    records.map(function(r){
      var f = r.fields;
      // Contractor name comes from lookup field
      // Look up contractor name from local ctrRecords by linked ID
      var ctrId  = (f['Contractor']||[])[0] || null;
      var ctrRec = ctrId ? ctrRecords.find(function(r){ return r.id===ctrId; }) : null;
      var cName  = ctrRec ? (ctrRec.fields['Company Name']||'Unknown') : (f['Contractor']||'—');
      var status = f['Status']||'Bidding';
      return '<tr data-bid-id="'+r.id+'">'+
        '<td style="padding:10px;font-weight:500;color:var(--txt);border-bottom:1px solid var(--bdr)">'+e(cName)+'</td>'+
        '<td style="padding:10px;border-bottom:1px solid var(--bdr)">'+
          '<span style="font-size:10px;font-family:monospace;padding:2px 8px;border-radius:20px;font-weight:600;'+statusBadgeStyle(status)+'">'+status+'</span>'+
        '</td>'+
        '<td style="padding:10px;color:var(--txt2);border-bottom:1px solid var(--bdr)">'+e(f['Comments']||'')+'</td>'+
        '<td style="padding:10px;border-bottom:1px solid var(--bdr);white-space:nowrap;text-align:right">'+
          '<button class="icon-btn edit" data-bid-edit="'+r.id+'" style="opacity:1">'+IC_PENCIL+'</button>'+
          '<button class="icon-btn del" data-bid-del="'+r.id+'" style="opacity:1">'+IC_TRASH+'</button>'+
        '</td>'+
      '</tr>';
    }).join('')+
    '</tbody></table>';

  // Delegation handled by global edit-modal listener below
}

function openEditBidder(recordId) {
  var opp = currentEditId;
  var rec = (bidderRecords[opp]||[]).find(function(r){ return r.id===recordId; });
  if(!rec) return;
  bidderEditId = recordId;
  var f = rec.fields;
  var cName = (f['Company Name (from Contractor)']||[])[0] || '';
  // Show form
  document.getElementById('add-bidder-form').style.display = 'block';
  document.getElementById('bidder-status-sel').value = f['Status']||'Bidding';
  document.getElementById('bidder-comments').value  = f['Comments']||'';
  // Populate and select contractor
  var sel = document.getElementById('bidder-contractor-sel');
  var linkedId = (f['Contractor']||[])[0] || '';
  populateBidderContractorDropdown(linkedId);
}

async function saveBidder() {
  var sel      = document.getElementById('bidder-contractor-sel');
  var ctrId    = sel.value;
  var status   = document.getElementById('bidder-status-sel').value;
  var comments = document.getElementById('bidder-comments').value.trim();

  if(!ctrId) { sel.focus(); return; }

  var savedEditId = bidderEditId;
  hideAddBidderForm();

  var fields = {
    'Opportunity': [currentEditId],
    'Contractor':  [ctrId],
    'Status':      status,
  };
  fields['Comments'] = comments || null;

  try {
    var url    = savedEditId ? WORKER_URL+'/bidders/'+savedEditId : WORKER_URL+'/bidders';
    var method = savedEditId ? 'PATCH' : 'POST';
    var res    = await fetch(url, {method:method, headers:getHeaders(), body:JSON.stringify({fields:fields})});
    var data   = await res.json();
    if(!res.ok) throw new Error((data.error&&data.error.message)||'HTTP '+res.status);
    await loadBidders(currentEditId);
    toast((savedEditId?'Bidder updated':'Bidder added'),'ok');
  } catch(err) {
    toast('Failed: '+err.message,'err');
  }
}

var pendingBidderDeleteId = null;

function deleteBidder(recordId) {
  pendingBidderDeleteId = recordId;
  document.getElementById('confirm-title').textContent = 'Remove bidder?';
  document.getElementById('confirm-body').innerHTML = 'This will remove this contractor from the bidders list.<br><br>This cannot be undone.';
  document.getElementById('confirm-modal').style.display = 'flex';
}

async function confirmDeleteBidder() {
  if(!pendingBidderDeleteId) return;
  var recordId = pendingBidderDeleteId;
  pendingBidderDeleteId = null;
  closeConfirm();
  try {
    var res = await fetch(WORKER_URL+'/bidders/'+recordId, {method:'DELETE', headers:getHeaders()});
    if(!res.ok) throw new Error('HTTP '+res.status);
    await loadBidders(currentEditId);
    toast('Bidder removed','ok');
  } catch(err) {
    toast('Failed: '+err.message,'err');
  }
}

// ================================================================
// QUOTE TRACKER
// ================================================================
var quoteRecords = {};  // keyed by opportunity ID
var quoteEditId  = null;

function showAddQuoteForm() {
  quoteEditId = null;
  ['qf-desc','qf-notes'].forEach(function(id){ document.getElementById(id).value=''; });
  ['qf-quote','qf-awarded'].forEach(function(id){ document.getElementById(id).value=''; });
  document.getElementById('qf-date').value   = new Date().toISOString().substring(0,10);
  document.getElementById('qf-status').value = 'Submitted';
  document.getElementById('add-quote-form').style.display = 'block';
  setTimeout(function(){ document.getElementById('qf-desc').focus(); }, 50);
}

function hideAddQuoteForm() {
  document.getElementById('add-quote-form').style.display = 'none';
  quoteEditId = null;
}

async function loadQuotes(opportunityId) {
  var list = document.getElementById('quotes-list');
  if(!list) return;
  try {
    var url = WORKER_URL+'/quotes?pageSize=100';
    var res = await fetch(url, {headers:getHeaders()});
    if(!res.ok) throw new Error('HTTP '+res.status);
    var data = await res.json();
    var all  = data.records||[];
    var recs = all.filter(function(r){
      return (r.fields['Opportunity']||[]).indexOf(opportunityId) !== -1;
    });
    quoteRecords[opportunityId] = recs;
    var badge = document.getElementById('quotes-count-badge');
    if(badge) badge.textContent = recs.length > 0 ? recs.length : '';
    renderQuotesList(opportunityId);
  } catch(err) {
    if(list) list.innerHTML = '<div style="color:var(--red);font-size:13px;padding:16px 0">Failed to load quotes: '+err.message+'</div>';
  }
}

function fmtAED(val) {
  if(!val && val!==0) return '—';
  var n = parseFloat(val);
  if(isNaN(n)) return '—';
  return 'AED '+n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
}

function quoteStatusStyle(s) {
  var map = {
    'Submitted':'background:var(--blue-bg);color:var(--blue);border:1px solid var(--blue-bdr)',
    'Awarded':  'background:var(--green-bg);color:var(--green);border:1px solid var(--green-bdr)',
    'Lost':     'background:var(--red-bg);color:var(--red);border:1px solid var(--red-bdr)',
    'Pending':  'background:var(--amber-bg);color:var(--amber);border:1px solid var(--amber-bdr)',
  };
  return map[s]||map['Pending'];
}

function renderQuotesList(opportunityId) {
  var list = document.getElementById('quotes-list');
  var sumEl = document.getElementById('quotes-summary');
  if(!list) return;
  var recs = quoteRecords[opportunityId]||[];

  // Summary bar
  if(recs.length > 0 && sumEl) {
    var totalQ = recs.filter(function(r){ var s=r.fields['Status']||''; return s!=='Lost'&&s!=='Rejected'; }).reduce(function(t,r){ return t+(parseFloat(r.fields['Quote Amount'])||0); },0);
    var totalA = recs.reduce(function(t,r){ return t+(parseFloat(r.fields['Awarded Amount'])||0); },0);
    var awarded = recs.filter(function(r){ return r.fields['Status']==='Awarded'; }).length;
    sumEl.style.display = 'flex';
    sumEl.innerHTML = [
      {label:'Total Quoted',   val:fmtAED(totalQ), cls:'color:var(--txt)'},
      {label:'Total Awarded',  val:fmtAED(totalA), cls:'color:var(--green);font-weight:600'},
      {label:'Awarded',        val:awarded+' / '+recs.length, cls:'color:var(--txt2)'},
    ].map(function(k){
      return '<div style="display:flex;flex-direction:column;gap:2px">'+
        '<div style="font-size:10px;text-transform:uppercase;letter-spacing:.7px;color:var(--txt3);font-family:monospace">'+k.label+'</div>'+
        '<div style="font-size:15px;'+k.cls+'">'+k.val+'</div>'+
      '</div>';
    }).join('');
  } else if(sumEl) {
    sumEl.style.display = 'none';
  }

  if(recs.length === 0) {
    list.innerHTML = '<div style="text-align:center;padding:40px 0;color:var(--txt3);font-size:13px">No quotes yet. Use the button above to add one.</div>';
    return;
  }

  // Card layout — one card per quote
  list.innerHTML = recs.map(function(r){
    var f = r.fields;
    var status = f['Status']||'';
    var statusColors = {
      'Submitted':  'background:var(--blue-bg);color:var(--blue)',
      'Awarded':    'background:var(--green-bg);color:var(--green)',
      'Not Awarded':'background:var(--grey-bg);color:var(--txt3)',
      'Rejected':    'background:var(--red-bg);color:var(--red)',
      'Lost':        'background:var(--red-bg);color:var(--red)',
      'Draft':      'background:var(--amber-bg);color:var(--amber)',
    };
    var sc = statusColors[status] || 'background:var(--bg2);color:var(--txt3)';
    var dateStr = f['Date Submitted'] ? new Date(f['Date Submitted']).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—';
    return '<div style="border:1px solid var(--bdr2);border-radius:var(--r);padding:12px 14px;margin-bottom:8px;background:var(--bg)">'+
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:6px">'+
        '<div style="flex:1;min-width:0">'+
          '<div style="font-weight:600;font-size:13px;color:var(--txt);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+e(f['Description']||'—')+'</div>'+
          (f['Notes']?'<div style="font-size:11px;color:var(--txt3);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+e(f['Notes'])+'</div>':'')+
        '</div>'+
        '<div style="display:flex;gap:4px;flex-shrink:0">'+
          '<button class="icon-btn edit" data-q-edit="'+r.id+'" style="opacity:1">'+IC_PENCIL+'</button>'+
          '<button class="icon-btn del" data-q-del="'+r.id+'" style="opacity:1">'+IC_TRASH+'</button>'+
        '</div>'+
      '</div>'+
      '<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center">'+
        '<span style="font-size:11px;padding:2px 7px;border-radius:20px;font-family:monospace;font-weight:600;'+sc+'">'+e(status)+'</span>'+
        '<span style="font-size:12px;font-family:monospace;color:var(--txt2)">Quoted: <b>'+fmtAED(parseFloat(f['Quote Amount'])||0)+'</b></span>'+
        (parseFloat(f['Awarded Amount'])>0?'<span style="font-size:12px;font-family:monospace;color:var(--green)">Awarded: <b>'+fmtAED(parseFloat(f['Awarded Amount']))+'</b></span>':'')+
        '<span style="font-size:11px;color:var(--txt3)">'+dateStr+'</span>'+
      '</div>'+
    '</div>';
  }).join('');

  // Delegation
  list.onclick = function(ev){
    var eb = ev.target.closest('[data-q-edit]');
    var db = ev.target.closest('[data-q-del]');
    if(eb){ openEditQuote(eb.dataset.qEdit); return; }
    if(db){ deleteQuote(db.dataset.qDel); return; }
  };
}

function openEditQuote(recordId) {
  var rec = (quoteRecords[currentEditId]||[]).find(function(r){ return r.id===recordId; });
  if(!rec) return;
  quoteEditId = recordId;
  var f = rec.fields;
  document.getElementById('qf-desc').value    = f['Description']||'';
  document.getElementById('qf-quote').value   = f['Quote Amount']||'';
  document.getElementById('qf-awarded').value = f['Awarded Amount']||'';
  document.getElementById('qf-date').value    = (f['Date Submitted']||'').substring(0,10);
  document.getElementById('qf-status').value  = f['Status']||'Pending';
  document.getElementById('qf-notes').value   = f['Notes']||'';
  document.getElementById('add-quote-form').style.display = 'block';
  setTimeout(function(){ document.getElementById('qf-desc').focus(); }, 50);
}

async function saveQuote() {
  var desc = document.getElementById('qf-desc').value.trim();
  if(!desc) { document.getElementById('qf-desc').focus(); return; }
  var savedId = quoteEditId;
  hideAddQuoteForm();
  var fields = {
    'Opportunity':    [currentEditId],
    'Description':    desc,
    'Status':         document.getElementById('qf-status').value,
  };
  var q = parseFloat(document.getElementById('qf-quote').value);
  var a = parseFloat(document.getElementById('qf-awarded').value);
  var d = document.getElementById('qf-date').value;
  var n = document.getElementById('qf-notes').value.trim();
  if(!isNaN(q) && q>0) fields['Quote Amount']    = q;
  if(!isNaN(a) && a>0) fields['Awarded Amount']  = a;
  fields['Date Submitted'] = d || null;
  fields['Notes'] = n || null;
  try {
    var url    = savedId ? WORKER_URL+'/quotes/'+savedId : WORKER_URL+'/quotes';
    var method = savedId ? 'PATCH' : 'POST';
    var res    = await fetch(url, {method:method, headers:getHeaders(), body:JSON.stringify({fields:fields})});
    var data   = await res.json();
    if(!res.ok) throw new Error((data.error&&data.error.message)||'HTTP '+res.status);
    await loadQuotes(currentEditId);
    toast((savedId?'Quote updated':'Quote added'),'ok');
  } catch(err) {
    toast('Failed: '+err.message,'err');
  }
}

var pendingQuoteDeleteId = null;

function deleteQuote(recordId) {
  pendingQuoteDeleteId = recordId;
  document.getElementById('confirm-title').textContent = 'Delete quote?';
  document.getElementById('confirm-body').innerHTML    = 'This will permanently delete this quote record.<br><br>This cannot be undone.';
  document.getElementById('confirm-modal').style.display = 'flex';
}

async function confirmDeleteQuote() {
  if(!pendingQuoteDeleteId) return;
  var id = pendingQuoteDeleteId; pendingQuoteDeleteId = null;
  closeConfirm();
  try {
    var res = await fetch(WORKER_URL+'/quotes/'+id, {method:'DELETE', headers:getHeaders()});
    if(!res.ok) throw new Error('HTTP '+res.status);
    await loadQuotes(currentEditId);
    toast('Quote deleted','ok');
  } catch(err) { toast('Failed: '+err.message,'err'); }
}

// ================================================================
// DUPLICATE OPPORTUNITY
// ================================================================
async function duplicateOpportunity(id) {
  var item = items.find(function(i){ return i._id===id; });
  if(!item) return;
  var rec  = allRecords.find(function(r){ return r.id===id; });
  if(!rec) return;
  var f    = rec.fields;
  // Build next SR number
  var maxSr = Math.max.apply(null, items.map(function(i){ return parseInt(i.sr_no)||0; }).concat([17062]));
  var fields = {};
  fields[F.SR_NO]     = String(maxSr+1);
  fields[F.DATE]      = new Date().toLocaleDateString('en-GB').split('/').join('.');
  fields[F.PROJECT]   = 'COPY - '+(f[F.PROJECT]||'');
  fields[F.CONTRACTOR]= f[F.CONTRACTOR]||'';
  fields[F.MAIN_CONT] = f[F.MAIN_CONT]||'';
  fields[F.CLIENT]    = f[F.CLIENT]||'';
  fields[F.RTU]       = f[F.RTU]||'--';
  fields[F.STATUS]    = 'PIPELINE';
  fields[F.PROPOSAL]  = '--';
  fields[F.QUOTATION] = '';
  fields[F.TECH_PROP] = '';
  fields[F.LPO_CLIENT]= '';
  fields[F.LPO_SUPPLIER]='';
  try {
    setSave('saving');
    var res  = await fetch(WORKER_URL, {method:'POST', headers:getHeaders(), body:JSON.stringify({fields:cleanFields})});
    var data = await res.json();
    if(!res.ok) throw new Error((data.error&&data.error.message)||'HTTP '+res.status);
    allRecords.push(data); parseItems();
    setSave('saved');
    renderKPIs(); applyFilters();
    toast('Opportunity duplicated — SR-'+fields[F.SR_NO],'ok');
    // Open the new record in edit mode
    setTimeout(function(){ openEditModal(data.id); }, 300);
  } catch(err) {
    setSave('err');
    toast('Duplicate failed: '+err.message,'err');
  }
}

// ── User / Auth helpers ───────────────────────────────────────────
function updateAllUserLabels() {
  var display = userName ? userName + (userRole && userRole !== 'admin' ? ' (' + userRole + ')' : '') : '';
  ['home-user-label','opp-user-label'].forEach(function(id){
    var el = document.getElementById(id);
    if(el) el.textContent = display;
  });
  document.querySelectorAll('.hdr-user-label').forEach(function(el){
    el.textContent = display;
  });
}

function signOut() {
  sessionStorage.removeItem('mbb_pwd');
  sessionStorage.removeItem('mbb_user');
  sessionStorage.removeItem('mbb_screen');
  appPassword = null; currentUser = null; userRole = null; userName = '';
  // Reset role restrictions
  var style = document.getElementById('role-restrictions-style');
  if(style) style.textContent = '';
  // Clear all screens
  ['login-screen','home-screen','app','vendor-screen','dashboard-screen','contractors-screen','suppliers-screen','quality-screen','employees-screen','renewals-screen','company-docs-screen','loading'].forEach(function(id){
    document.getElementById(id).style.display='none';
  });
  document.getElementById('login-screen').style.display='flex';
  document.getElementById('login-pwd').value  = '';
  document.getElementById('login-user').value = '';
  document.getElementById('login-error').textContent = '';
}

function updateAllUserLabels() {
  var label = document.getElementById('home-user-label');
  if(label && userName) label.textContent = userName + (userRole==='viewer' ? ' (viewer)' : '');
  // Also auto-fill note author
  var authorEl = document.getElementById('note-author');
  if(authorEl && userName && !authorEl.value) authorEl.value = userName;
}

// Call after login and on screen show
var _origShowHome = showHome;
showHome = function() {
  _origShowHome();
  updateAllUserLabels();
};

// ================================================================
// DASHBOARD TABS + TENDER CALENDAR
// ================================================================
var calYear  = new Date().getFullYear();
var calMonth = new Date().getMonth(); // 0-based

function switchDashTab(tabId) {
  var dashOrder=['dash-overview','dash-calendar','dash-finance'];
  document.querySelectorAll('.dash-tab').forEach(function(t, i) {
    t.classList.toggle('active', dashOrder[i]===tabId);
  });
  document.querySelectorAll('.dash-pane').forEach(function(p) {
    p.classList.toggle('active', p.id === tabId);
  });
  if(tabId === 'dash-calendar') renderCalendar();
  if(tabId === 'dash-finance')  { if(userRole==='admin') renderFinanceDashboard(); else { var fp=document.getElementById('dash-finance'); if(fp) fp.innerHTML='<div style="padding:40px;text-align:center;color:var(--txt3)">Finance data is visible to Admin users only.</div>'; } }
}

function calPrev()  { calMonth--; if(calMonth<0){calMonth=11;calYear--;} renderCalendar(); }
function calNext()  { calMonth++; if(calMonth>11){calMonth=0;calYear++;} renderCalendar(); }
function calToday() { calYear=new Date().getFullYear(); calMonth=new Date().getMonth(); renderCalendar(); }

function calEventClass(item) {
  var bd = businessDaysUntil(item.deadline);
  if(bd === -1 && item.status === 'PIPELINE') return 'overdue';
  var map = {PIPELINE:'status-pipeline', WON:'status-won', LOST:'status-lost', CANCELLED:'status-cancelled', CLOSED:'status-closed'};
  return map[item.status] || 'status-pipeline';
}

function renderCalendar() {
  var grid   = document.getElementById('cal-grid');
  var lbl    = document.getElementById('cal-month-lbl');
  if(!grid || !lbl) return;

  var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  lbl.textContent = months[calMonth] + ' ' + calYear;

  // Get items with deadlines in YYYY-MM-DD format
  var withDeadlines = items.filter(function(r){ return r.deadline && r.deadline.match(/^\d{4}-\d{2}-\d{2}$/); });

  // Build a map: 'YYYY-MM-DD' -> [items]
  var dayMap = {};
  withDeadlines.forEach(function(r){
    var key = r.deadline;
    if(!dayMap[key]) dayMap[key] = [];
    dayMap[key].push(r);
  });

  // First day of month and total days
  var firstDay = new Date(calYear, calMonth, 1).getDay(); // 0=Sun
  // Start from Monday: adjust so Monday=0
  var startOffset = (firstDay === 0) ? 6 : firstDay - 1;
  var daysInMonth = new Date(calYear, calMonth+1, 0).getDate();
  var daysInPrev  = new Date(calYear, calMonth, 0).getDate();
  var today       = new Date();
  today.setHours(0,0,0,0);

  var html = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(function(d){
    return '<div class="cal-dow">'+d+'</div>';
  }).join('');

  var totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  for(var i=0; i<totalCells; i++) {
    var dayNum, dateObj, isThisMonth = true;
    if(i < startOffset) {
      dayNum  = daysInPrev - startOffset + i + 1;
      dateObj = new Date(calYear, calMonth-1, dayNum);
      isThisMonth = false;
    } else if(i >= startOffset + daysInMonth) {
      dayNum  = i - startOffset - daysInMonth + 1;
      dateObj = new Date(calYear, calMonth+1, dayNum);
      isThisMonth = false;
    } else {
      dayNum  = i - startOffset + 1;
      dateObj = new Date(calYear, calMonth, dayNum);
    }

    var isToday = dateObj.getTime() === today.getTime();
    var dateKey = dateObj.getFullYear()+'-'+String(dateObj.getMonth()+1).padStart(2,'0')+'-'+String(dateObj.getDate()).padStart(2,'0');
    var cellItems = dayMap[dateKey] || [];

    var cellCls = 'cal-cell' + (isThisMonth?'':' other-month') + (isToday?' today':'');
    var events = cellItems.slice(0,3).map(function(r){
      var cls = calEventClass(r);
      var proj = r.project.length>22 ? r.project.substring(0,20)+'…' : r.project;
      return '<div class="cal-event '+cls+'" title="'+e(r.project)+' ('+r.status+')" data-cal-id="'+r._id+'">'+e(proj)+'</div>';
    }).join('');
    if(cellItems.length > 3) {
      events += '<div style="font-size:9px;color:var(--txt3);padding:1px 4px">+' + (cellItems.length-3) + ' more</div>';
    }

    html += '<div class="'+cellCls+'"><div class="cal-day-num">'+dayNum+'</div>'+events+'</div>';
  }

  grid.innerHTML = html;
  // Delegation for event clicks
  grid.addEventListener('click', function(ev){
    var ev2 = ev.target.closest('[data-cal-id]');
    if(ev2) openEditModal(ev2.dataset.calId);
  });
}

// ================================================================
// INVOICES
// ================================================================
var invoiceRecords = {};  // keyed by opportunity ID
var invoiceEditId  = null;

function showAddInvoiceForm() {
  invoiceEditId = null;
  ['inf-number','inf-notes'].forEach(function(id){ document.getElementById(id).value=''; });
  document.getElementById('inf-amount').value = '';
  document.getElementById('inf-link').value   = '';
  document.getElementById('inf-date').value   = new Date().toISOString().substring(0,10);
  document.getElementById('inf-status').value = 'Draft';
  document.getElementById('add-invoice-form').style.display = 'block';
  setTimeout(function(){ document.getElementById('inf-number').focus(); }, 50);
}

function hideAddInvoiceForm() {
  document.getElementById('add-invoice-form').style.display = 'none';
  invoiceEditId = null;
}

async function loadInvoices(opportunityId) {
  var list = document.getElementById('invoices-list');
  if(!list) return;
  try {
    var url  = WORKER_URL+'/invoices?pageSize=100';
    var res  = await fetch(url, {headers:getHeaders()});
    if(!res.ok) throw new Error('HTTP '+res.status);
    var data = await res.json();
    var all  = data.records||[];
    var recs = all.filter(function(r){
      return (r.fields['Opportunity']||[]).indexOf(opportunityId) !== -1;
    });
    invoiceRecords[opportunityId] = recs;
    var badge = document.getElementById('invoices-count-badge');
    if(badge) badge.textContent = recs.length > 0 ? recs.length : '';
    renderInvoicesList(opportunityId);
  } catch(err) {
    if(list) list.innerHTML = '<div style="color:var(--red);font-size:13px;padding:16px 0">Failed to load invoices: '+err.message+'</div>';
  }
}

function invStatusStyle(s) {
  var map = {
    'Draft':   'background:var(--grey-bg);color:var(--txt2);border:1px solid var(--grey-bdr)',
    'Sent':    'background:var(--blue-bg);color:var(--blue);border:1px solid var(--blue-bdr)',
    'Paid':    'background:var(--green-bg);color:var(--green);border:1px solid var(--green-bdr)',
    'Overdue': 'background:var(--red-bg);color:var(--red);border:1px solid var(--red-bdr)',
  };
  return map[s]||map['Draft'];
}

function renderInvoicesList(opportunityId) {
  var list  = document.getElementById('invoices-list');
  var sumEl = document.getElementById('invoices-summary');
  if(!list) return;
  var recs = invoiceRecords[opportunityId]||[];

  // Summary bar
  if(recs.length > 0 && sumEl) {
    var totalAmt = recs.reduce(function(t,r){ return t+(parseFloat(r.fields['Amount'])||0); },0);
    var paid     = recs.filter(function(r){ return r.fields['Status']==='Paid'; }).length;
    var overdue  = recs.filter(function(r){ return r.fields['Status']==='Overdue'; }).length;
    sumEl.style.display = 'flex';
    sumEl.innerHTML = [
      {label:'Total Invoiced', val:fmtAED(totalAmt), cls:'color:var(--txt)'},
      {label:'Paid',           val:paid+' / '+recs.length, cls:'color:var(--green);font-weight:600'},
      {label:'Overdue',        val:overdue, cls:overdue>0?'color:var(--red);font-weight:600':'color:var(--txt2)'},
    ].map(function(k){
      return '<div style="display:flex;flex-direction:column;gap:2px">'+
        '<div style="font-size:10px;text-transform:uppercase;letter-spacing:.7px;color:var(--txt3);font-family:monospace">'+k.label+'</div>'+
        '<div style="font-size:15px;'+k.cls+'">'+k.val+'</div>'+
      '</div>';
    }).join('');
  } else if(sumEl) { sumEl.style.display='none'; }

  if(recs.length === 0) {
    list.innerHTML = '<div style="text-align:center;padding:40px 0;color:var(--txt3);font-size:13px">No invoices yet. Use the button above to add one.</div>';
    return;
  }

  // Card-style rows — no table, everything fits
  list.innerHTML = recs.map(function(r){
    var f      = r.fields;
    var status = f['Status']||'Draft';
    var dated  = f['Date'] ? new Date(f['Date']).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—';
    var docBtn = f['SharePoint Link']
      ? '<a href="'+e(f['SharePoint Link'])+'" target="_blank" rel="noopener" style="color:var(--blue);display:inline-flex;align-items:center">'+IC_DOCS+'</a>'
      : '<span style="opacity:.25;display:inline-flex;align-items:center">'+IC_DOCS+'</span>';
    return '<div style="border-bottom:1px solid var(--bdr);padding:10px 0" data-inv-id="'+r.id+'">'+
      // Main row: invoice no + amount + date + status + doc + actions
      '<div style="display:flex;align-items:center;gap:8px;flex-wrap:nowrap">'+
        '<div style="font-weight:600;font-size:13px;color:var(--txt);min-width:80px;flex-shrink:0">'+e(f['Invoice Number']||'—')+'</div>'+
        '<div style="font-size:12px;font-family:monospace;color:var(--txt2);white-space:nowrap;flex-shrink:0">'+fmtAED(f['Amount'])+'</div>'+
        '<div style="font-size:11px;color:var(--txt3);white-space:nowrap;flex-shrink:0">'+dated+'</div>'+
        '<span style="font-size:10px;font-family:monospace;padding:2px 6px;border-radius:20px;font-weight:600;flex-shrink:0;'+invStatusStyle(status)+'">'+status+'</span>'+
        '<div style="flex:1"></div>'+
        '<div style="flex-shrink:0">'+docBtn+'</div>'+
        '<button class="icon-btn edit" data-inv-edit="'+r.id+'" style="opacity:1;flex-shrink:0">'+IC_PENCIL+'</button>'+
        '<button class="icon-btn del" data-inv-del="'+r.id+'" style="opacity:1;flex-shrink:0">'+IC_TRASH+'</button>'+
      '</div>'+
      // Notes row below if present
      (f['Notes'] ? '<div style="font-size:11px;color:var(--txt3);font-style:italic;margin-top:4px;padding-left:2px">'+e(f['Notes'])+'</div>' : '')+
    '</div>';
  }).join('');
}

function openEditInvoice(recordId) {
  var rec = (invoiceRecords[currentEditId]||[]).find(function(r){ return r.id===recordId; });
  if(!rec) return;
  invoiceEditId = recordId;
  var f = rec.fields;
  document.getElementById('inf-number').value = f['Invoice Number']||'';
  document.getElementById('inf-amount').value = f['Amount']||'';
  document.getElementById('inf-date').value   = (f['Date']||'').substring(0,10);
  document.getElementById('inf-status').value = f['Status']||'Draft';
  document.getElementById('inf-link').value   = f['SharePoint Link']||'';
  document.getElementById('inf-notes').value  = f['Notes']||'';
  document.getElementById('add-invoice-form').style.display = 'block';
  setTimeout(function(){ document.getElementById('inf-number').focus(); }, 50);
}

async function saveInvoice() {
  var num = document.getElementById('inf-number').value.trim();
  if(!num){ document.getElementById('inf-number').focus(); return; }
  var savedId = invoiceEditId;
  hideAddInvoiceForm();
  var fields = {
    'Opportunity':    [currentEditId],
    'Invoice Number': num,
    'Status':         document.getElementById('inf-status').value,
  };
  var amt  = parseFloat(document.getElementById('inf-amount').value);
  var d    = document.getElementById('inf-date').value;
  var link = document.getElementById('inf-link').value.trim();
  var note = document.getElementById('inf-notes').value.trim();
  fields['Amount']         = (!isNaN(amt) && amt > 0) ? amt : null;
  fields['Date']           = d || null;
  fields['SharePoint Link']= link || null;
  fields['Notes']          = note || null;
  try {
    var url    = savedId ? WORKER_URL+'/invoices/'+savedId : WORKER_URL+'/invoices';
    var method = savedId ? 'PATCH' : 'POST';
    var res    = await fetch(url,{method:method,headers:getHeaders(),body:JSON.stringify({fields:fields})});
    var data   = await res.json();
    if(!res.ok) throw new Error((data.error&&data.error.message)||'HTTP '+res.status);
    await loadInvoices(currentEditId);
    toast((savedId?'Invoice updated':'Invoice added'),'ok');
  } catch(err) { toast('Failed: '+err.message,'err'); }
}

var pendingInvoiceDeleteId = null;

function deleteInvoice(recordId) {
  pendingInvoiceDeleteId = recordId;
  document.getElementById('confirm-title').textContent = 'Delete invoice?';
  document.getElementById('confirm-body').innerHTML    = 'This will permanently delete this invoice record.<br><br>This cannot be undone.';
  document.getElementById('confirm-modal').style.display = 'flex';
}

async function confirmDeleteInvoice() {
  if(!pendingInvoiceDeleteId) return;
  var id = pendingInvoiceDeleteId; pendingInvoiceDeleteId = null;
  closeConfirm();
  try {
    var res = await fetch(WORKER_URL+'/invoices/'+id,{method:'DELETE',headers:getHeaders()});
    if(!res.ok) throw new Error('HTTP '+res.status);
    await loadInvoices(currentEditId);
    toast('Invoice deleted','ok');
  } catch(err) { toast('Failed: '+err.message,'err'); }
}

// ================================================================
// FINANCE DASHBOARD
// ================================================================
async function renderFinanceDashboard() {
  // Load invoices and quotes if not already cached
  // We need ALL invoices and quotes across all opportunities
  var allInvoices = [], allQuotes = [];

  try {
    // Fetch all invoices
    var iRes = await fetch(WORKER_URL+'/invoices?pageSize=100', {headers:getHeaders()});
    if(iRes.ok) { var iData = await iRes.json(); allInvoices = iData.records||[]; }
    // Fetch all quotes
    var qRes = await fetch(WORKER_URL+'/quotes?pageSize=100', {headers:getHeaders()});
    if(qRes.ok) { var qData = await qRes.json(); allQuotes = qData.records||[]; }
  } catch(err) {
    console.warn('Finance data load error:', err);
  }

  // ── KPI Cards ─────────────────────────────────────────────────
  var totalInvoiced = allInvoices.reduce(function(t,r){ return t+(parseFloat(r.fields['Amount'])||0); },0);
  var totalPaid     = allInvoices.filter(function(r){ return r.fields['Status']==='Paid'; })
                       .reduce(function(t,r){ return t+(parseFloat(r.fields['Amount'])||0); },0);
  var totalOverdue  = allInvoices.filter(function(r){ return r.fields['Status']==='Overdue'; })
                       .reduce(function(t,r){ return t+(parseFloat(r.fields['Amount'])||0); },0);
  var totalAwarded  = allQuotes.filter(function(r){ return r.fields['Status']==='Awarded'; })
                       .reduce(function(t,r){ return t+(parseFloat(r.fields['Awarded Amount'])||0); },0);

  var kpiEl = document.getElementById('fin-kpis');
  if(kpiEl) kpiEl.innerHTML = [
    {label:'Total Invoiced',  val:'AED '+fmtNum(totalInvoiced), sub:allInvoices.length+' invoices',    cls:''},
    {label:'Total Paid',      val:'AED '+fmtNum(totalPaid),     sub:allInvoices.filter(function(r){return r.fields['Status']==='Paid';}).length+' paid',   cls:'green'},
    {label:'Overdue',         val:'AED '+fmtNum(totalOverdue),  sub:allInvoices.filter(function(r){return r.fields['Status']==='Overdue';}).length+' invoices', cls:totalOverdue>0?'red':''},
    {label:'Total Awarded',   val:'AED '+fmtNum(totalAwarded),  sub:allQuotes.filter(function(r){return r.fields['Status']==='Awarded';}).length+' quotes',  cls:'blue'},
  ].map(function(k){
    return '<div class="dash-kpi '+k.cls+'">'+
      '<div class="dash-kpi-lbl">'+k.label+'</div>'+
      '<div class="dash-kpi-val" style="font-size:18px;letter-spacing:-.5px">'+k.val+'</div>'+
      '<div class="dash-kpi-sub">'+k.sub+'</div>'+
    '</div>';
  }).join('');

  // ── Invoice status bar chart ──────────────────────────────────
  var statusCounts = {Draft:0,Sent:0,Paid:0,Overdue:0};
  var statusAmounts = {Draft:0,Sent:0,Paid:0,Overdue:0};
  allInvoices.forEach(function(r){
    var s=r.fields['Status']||'Draft'; var a=parseFloat(r.fields['Amount'])||0;
    if(statusCounts[s]!==undefined){ statusCounts[s]++; statusAmounts[s]+=a; }
  });
  var invColors = {Draft:'var(--txt3)',Sent:'var(--blue)',Paid:'var(--green)',Overdue:'var(--red)'};
  var maxInv = Math.max.apply(null, Object.values(statusAmounts))||1;
  var invBarEl = document.getElementById('fin-invoice-bar');
  if(invBarEl) invBarEl.innerHTML = Object.keys(statusCounts).map(function(s){
    var pct = Math.round((statusAmounts[s]/maxInv)*100);
    return '<div class="bar-row">'+
      '<div class="bar-label">'+s+'</div>'+
      '<div class="bar-track"><div class="bar-fill" style="width:'+pct+'%;background:'+invColors[s]+'"></div></div>'+
      '<div class="bar-val" style="width:100px;font-size:10px">'+statusCounts[s]+' · AED '+fmtNum(statusAmounts[s])+'</div>'+
    '</div>';
  }).join('');

  // ── Quote vs Awarded ──────────────────────────────────────────
  var totalQuoted = allQuotes.reduce(function(t,r){ return t+(parseFloat(r.fields['Quote Amount'])||0); },0);
  var qChartEl = document.getElementById('fin-quote-chart');
  if(qChartEl) {
    var convRate = totalQuoted>0 ? Math.round((totalAwarded/totalQuoted)*100) : 0;
    qChartEl.innerHTML =
      '<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--txt2);margin-bottom:6px">'+
        '<span>Total Quoted</span><span style="font-family:monospace;font-weight:500">AED '+fmtNum(totalQuoted)+'</span>'+
      '</div>'+
      '<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--green);margin-bottom:12px">'+
        '<span>Total Awarded</span><span style="font-family:monospace;font-weight:600">AED '+fmtNum(totalAwarded)+'</span>'+
      '</div>'+
      '<div style="background:var(--bg3);border-radius:20px;height:10px;overflow:hidden;margin-bottom:8px">'+
        '<div style="height:100%;border-radius:20px;background:var(--green);width:'+convRate+'%;transition:width .6s ease"></div>'+
      '</div>'+
      '<div style="font-size:11px;color:var(--txt3);text-align:center;font-family:monospace">'+
        convRate+'% conversion rate · '+allQuotes.length+' quotes total'+
      '</div>';
  }

  // ── Overdue invoices list ─────────────────────────────────────
  var overdueInvs = allInvoices.filter(function(r){ return r.fields['Status']==='Overdue'; });
  var overdueEl  = document.getElementById('fin-overdue-list');
  var overdueCount = document.getElementById('fin-overdue-count');
  if(overdueCount) overdueCount.textContent = overdueInvs.length+' items';
  if(overdueEl) overdueEl.innerHTML = overdueInvs.length===0
    ? '<div style="font-size:13px;color:var(--txt3);padding:16px 0;text-align:center">No overdue invoices ✓</div>'
    : overdueInvs.map(function(r){
        var f=r.fields;
        // Find opportunity name
        var oppId = (f['Opportunity']||[])[0]||'';
        var oppItem = items.find(function(i){ return i._id===oppId; });
        var oppName = oppItem ? oppItem.project : 'Unknown';
        return '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--bdr)">'+
          '<div>'+
            '<div style="font-size:12px;font-weight:500;color:var(--txt)">'+e(f['Invoice Number']||'—')+'</div>'+
            '<div style="font-size:11px;color:var(--txt3)">'+e(oppName)+'</div>'+
          '</div>'+
          '<div style="font-size:13px;font-weight:600;color:var(--red);font-family:monospace">AED '+fmtNum(parseFloat(f['Amount'])||0)+'</div>'+
        '</div>';
      }).join('');

  // ── Top invoiced opportunities bar chart ─────────────────────
  var oppTotals = {};
  allInvoices.forEach(function(r){
    var oppId = (r.fields['Opportunity']||[])[0]||'';
    if(!oppId) return;
    var oppItem = items.find(function(i){ return i._id===oppId; });
    var name = oppItem ? (oppItem.project.length>25?oppItem.project.substring(0,23)+'…':oppItem.project) : oppId;
    oppTotals[name] = (oppTotals[name]||0)+(parseFloat(r.fields['Amount'])||0);
  });
  var topOpps = Object.keys(oppTotals).map(function(k){ return {label:k,val:oppTotals[k]}; })
    .sort(function(a,b){ return b.val-a.val; }).slice(0,6);
  var maxOpp = topOpps.length>0 ? topOpps[0].val : 1;
  var topEl = document.getElementById('fin-top-opps');
  if(topEl) topEl.innerHTML = topOpps.length===0
    ? '<div style="font-size:13px;color:var(--txt3);padding:16px 0">No invoice data yet</div>'
    : topOpps.map(function(d){
        var pct = Math.round((d.val/maxOpp)*100);
        return '<div class="bar-row">'+
          '<div class="bar-label" style="font-size:10px;width:110px">'+d.label+'</div>'+
          '<div class="bar-track"><div class="bar-fill" style="width:'+pct+'%;background:var(--amber)"></div></div>'+
          '<div class="bar-val" style="width:80px;font-size:10px">AED '+fmtNum(d.val)+'</div>'+
        '</div>';
      }).join('');

  // ── Recent invoices table ─────────────────────────────────────
  var recent = allInvoices.slice().sort(function(a,b){
    return new Date(b.fields['Date']||0)-new Date(a.fields['Date']||0);
  }).slice(0,10);
  var invColors2 = {Draft:'background:#f3f4f6;color:#374151',Sent:'background:var(--blue-bg);color:var(--blue)',Paid:'background:var(--green-bg);color:var(--green)',Overdue:'background:var(--red-bg);color:var(--red)'};
  var recentEl = document.getElementById('fin-recent-invoices');
  if(recentEl) recentEl.innerHTML = recent.length===0
    ? '<tr><td colspan="5" style="padding:20px 0;color:var(--txt3);text-align:center">No invoices yet</td></tr>'
    : recent.map(function(r){
        var f=r.fields;
        var oppId=(f['Opportunity']||[])[0]||'';
        var oppItem=items.find(function(i){return i._id===oppId;});
        var oppName=oppItem?(oppItem.project.length>30?oppItem.project.substring(0,28)+'…':oppItem.project):'—';
        var dated=f['Date']?new Date(f['Date']).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'—';
        var s=f['Status']||'Draft';
        return '<tr>'+
          '<td style="font-family:monospace;font-size:11px">'+e(f['Invoice Number']||'—')+'</td>'+
          '<td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+e(oppItem?oppItem.project:'')+'">'+e(oppName)+'</td>'+
          '<td style="font-family:monospace;font-size:11px;text-align:right;white-space:nowrap">AED '+fmtNum(parseFloat(f['Amount'])||0)+'</td>'+
          '<td style="white-space:nowrap;font-size:11px;color:var(--txt2)">'+dated+'</td>'+
          '<td><span style="font-size:10px;padding:2px 8px;border-radius:20px;font-weight:600;font-family:monospace;'+(invColors2[s]||invColors2['Draft'])+'">'+s+'</span></td>'+
        '</tr>';
      }).join('');
}

function fmtNum(n) {
  return n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
}

// ── Mobile card view ─────────────────────────────────────────────
function renderMobileCards(rows) {
  var container = document.getElementById('mobile-cards');
  if(!container) return;
  if(rows.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:48px 0;color:var(--txt3);font-size:13px">No opportunities found</div>';
    return;
  }
  // Delegation on container (re-added each render since innerHTML replaces DOM)
  container.onclick = function(ev){
    var eb   = ev.target.closest('[data-card-edit]');
    var db   = ev.target.closest('[data-card-del]');
    var card = ev.target.closest('[data-opp-id]');
    if(eb){ openEditModal(eb.dataset.cardEdit); return; }
    if(db){ promptDelete(db.dataset.cardDel, db.dataset.cardSr, db.dataset.cardProj); return; }
    if(card && !ev.target.closest('a')){ openEditModal(card.dataset.oppId); }
  };
  container.innerHTML = rows.map(function(r) {
    var dlHtml = '';
    if(r.deadline) {
      var bd = businessDaysUntil(r.deadline);
      var lbl = fmtDeadline(r.deadline);
      if(bd === -1) dlHtml = '<span class="dl-overdue">'+lbl+'</span>';
      else if(bd <= 5) dlHtml = '<span class="dl-soon">'+lbl+'</span>';
      else dlHtml = '<span class="dl-normal">'+lbl+'</span>';
    }
    // Split last_update into date + note
    var lu = r.last_update || '';
    var sep = lu.indexOf(' - ');
    var luText = sep !== -1 ? lu.substring(sep+3) : lu;
    var luDate = sep !== -1 ? lu.substring(0,sep) : '';
    var docsBtn = r.docs
      ? '<a class="icon-btn docs-link has-link" href="'+r.docs+'" target="_blank" rel="noopener" onclick="event.stopPropagation()">'+IC_DOCS+'</a>'
      : '';
    return '<div class="opp-card" data-opp-id="'+r._id+'">'+
      '<div class="opp-card-top">'+
        '<div>'+
          '<div class="opp-card-sr">SR-'+e(r.sr_no)+'</div>'+
          '<div class="opp-card-proj">'+e(r.project)+'</div>'+
        '</div>'+
        '<span class="badge '+badgeCls(r.status)+'">'+badgeLbl(r.status)+'</span>'+
      '</div>'+
      '<div class="opp-card-meta">'+
        (r.client&&r.client!=='—'?'<span class="opp-card-client">'+e(r.client)+'</span>':'') +
        (r.main_cont&&r.main_cont!=='—'?'<span class="opp-card-client" style="color:var(--txt3)">· '+e(r.main_cont)+'</span>':'') +
        (r.rtu&&r.rtu!=='--'?'<span class="opp-card-rtu">'+e(r.rtu)+' RTU</span>':'') +
        (dlHtml?dlHtml:'') +
      '</div>'+
      (luDate||luText?
        '<div class="opp-card-bottom">'+
          '<div class="opp-card-update">'+
            (luDate?'<span style="font-weight:500;color:var(--txt2)">'+e(luDate)+'</span> ':'') +
            (luText?'<span>'+e(luText)+'</span>':'') +
          '</div>'+
          '<div class="opp-card-actions">'+
            docsBtn+
            '<button class="icon-btn edit" data-card-edit="'+r._id+'" onclick="event.stopPropagation()">'+IC_PENCIL+'</button>'+
            '<button class="icon-btn del" data-card-del="'+r._id+'" data-card-sr="'+e(r.sr_no)+'" data-card-proj="'+e(r.project)+'" onclick="event.stopPropagation()">'+IC_TRASH+'</button>'+
          '</div>'+
        '</div>'
      :'')+
    '</div>';
  }).join('');
}

// ── Mobile nav drawer ─────────────────────────────────────────────
function openMobNav() {
  var drawer = document.getElementById('mob-nav-drawer');
  if(drawer) {
    drawer.style.display = 'block';
    var ul = document.getElementById('mob-user-line');
    if(ul && userName) ul.textContent = userName + (userRole && userRole!=='admin' ? ' · '+userRole : '');
  }
}
function closeMobNav() {
  var drawer = document.getElementById('mob-nav-drawer');
  if(drawer) drawer.style.display = 'none';
}

// ================================================================
// QUALITY OBJECTIVES
// ================================================================
var qoRecords  = [];
var qoLoaded   = false;
var qoEditId   = null;

function showQualityObjectives() {
  sessionStorage.setItem('mbb_screen','quality');
  ['login-screen','home-screen','app','vendor-screen','dashboard-screen','contractors-screen','suppliers-screen','quality-screen','employees-screen','renewals-screen','company-docs-screen','loading'].forEach(function(id){
    var el=document.getElementById(id); if(el) el.style.display='none';
  });
  document.getElementById('quality-screen').style.display='flex';
  if(!qoLoaded) loadQualityObjectives();
  else renderQO();
}

var pendingQODeleteId = null;

function deleteQO(recordId) {
  pendingQODeleteId = recordId;
  var rec = qoRecords.find(function(r){return r.id===recordId;});
  var lbl = rec ? (rec.fields['Year']||'')+'-'+(rec.fields['Objective Number']||'') : 'this objective';
  document.getElementById('confirm-title').textContent = 'Delete objective?';
  document.getElementById('confirm-body').innerHTML    = 'This will permanently delete objective <b>'+lbl+'</b>.<br><br>This cannot be undone.';
  document.getElementById('confirm-modal').style.display = 'flex';
}

async function confirmDeleteQO() {
  if(!pendingQODeleteId) return;
  var id = pendingQODeleteId; pendingQODeleteId = null;
  closeConfirm();
  try {
    var res = await fetch(WORKER_URL+'/quality-objectives/'+id, {method:'DELETE', headers:getHeaders()});
    if(!res.ok) throw new Error('HTTP '+res.status);
    qoRecords = qoRecords.filter(function(r){return r.id!==id;});
    renderQO();
    toast('Objective deleted','ok');
  } catch(err) { toast('Failed: '+err.message,'err'); }
}

async function loadQualityObjectives() {
  var tbody = document.getElementById('qo-tbody');
  if(tbody) tbody.innerHTML = '<tr><td colspan="11" style="padding:40px;text-align:center;color:var(--txt3)">Loading…</td></tr>';
  try {
    var res  = await fetch(WORKER_URL+'/quality-objectives?pageSize=100', {headers:getHeaders()});
    if(!res.ok) throw new Error('HTTP '+res.status);
    var data = await res.json();
    qoRecords = (data.records||[]).sort(function(a,b){
      var ya=a.fields['Year']||'', yb=b.fields['Year']||'';
      if(ya!==yb) return ya.localeCompare(yb);
      return (a.fields['Objective Number']||0)-(b.fields['Objective Number']||0);
    });
    qoLoaded = true;
    renderQO();
  } catch(err) {
    if(tbody) tbody.innerHTML = '<tr><td colspan="11" style="padding:20px;color:var(--red)">Failed to load: '+err.message+'</td></tr>';
  }
}

function renderQO() {
  var tbody  = document.getElementById('qo-tbody');
  var kpiEl  = document.getElementById('qo-kpis');
  var cntEl  = document.getElementById('qo-count');
  if(!tbody) return;

  var filterYear   = document.getElementById('qo-filter-year').value;
  var filterDept   = document.getElementById('qo-filter-dept').value;
  var filterStatus = document.getElementById('qo-filter-status').value;

  var recs = qoRecords.filter(function(r){
    var f = r.fields;
    if(filterYear   && f['Year']!==filterYear)     return false;
    if(filterDept   && f['Department']!==filterDept) return false;
    if(filterStatus && f['Status']!==filterStatus) return false;
    return true;
  });

  // KPIs (always across all records)
  var all      = qoRecords;
  var achieved = all.filter(function(r){return r.fields['Status']==='Achieved';}).length;
  var avgPct   = all.length>0 ? Math.round(all.reduce(function(t,r){return t+(parseFloat(r.fields['Completion %'])||0);},0)/all.length*100) : 0;
  if(kpiEl) kpiEl.innerHTML = [
    {label:'Total Objectives', val:all.length,         sub:'2025 + 2026',       cls:''},
    {label:'Achieved',         val:achieved,            sub:'fully completed',   cls:'green'},
    {label:'In Progress',      val:all.length-achieved, sub:'under process',     cls:'process'},
    {label:'Avg Completion',   val:avgPct+'%',          sub:'across all',        cls:'blue'},
  ].map(function(k){
    return '<div class="dash-kpi '+k.cls+'">'+
      '<div class="dash-kpi-lbl">'+k.label+'</div>'+
      '<div class="dash-kpi-val">'+k.val+'</div>'+
      '<div class="dash-kpi-sub">'+k.sub+'</div>'+
    '</div>';
  }).join('');

  if(cntEl) cntEl.textContent = recs.length+' objectives';

  if(recs.length===0){
    tbody.innerHTML='<tr><td colspan="11" style="padding:40px;text-align:center;color:var(--txt3)">No objectives match the selected filters</td></tr>';
    return;
  }

  var deptColors = {
    'Management':       'background:var(--blue-bg);color:var(--blue)',
    'Sales':            'background:var(--green-bg);color:var(--green)',
    'Project Management':'background:var(--purple-bg);color:var(--purple)',
  };

  tbody.innerHTML = recs.map(function(r){
    var f      = r.fields;
    var pct    = Math.round((parseFloat(f['Completion %'])||0)*100);
    var status = f['Status']||'Under Process';
    var achieved = status==='Achieved';
    var startD = f['Start Date'] ? new Date(f['Start Date']).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'2-digit'}) : '—';
    var endD   = f['End Date']   ? new Date(f['End Date']).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'2-digit'})   : '—';
    var deptStyle = deptColors[f['Department']]||'background:var(--grey-bg);color:var(--txt2)';

    // Find linked SR
    var objText = f['Objective']||'';
    var srMatch = objText.match(/(1[0-9]{4})/);
    var linkedSR = srMatch ? srMatch[1] : null;
    var linkedItem = linkedSR ? items.find(function(i){return i.sr_no===linkedSR;}) : null;

    return '<tr style="border-bottom:1px solid var(--bdr);cursor:pointer" data-qo-id="'+r.id+'">'+
      '<td style="padding:9px 10px;font-family:monospace;font-size:11px;color:var(--txt3);white-space:nowrap">'+
        (f['Year']||'')+'–'+(f['Objective Number']||'')+
      '</td>'+
      '<td style="padding:9px 10px;font-size:11px;color:var(--txt3);font-family:monospace;white-space:nowrap">'+e(f['Year']||'')+'</td>'+
      '<td style="padding:9px 10px;white-space:nowrap">'+
        '<span style="font-size:10px;padding:2px 7px;border-radius:20px;font-family:monospace;font-weight:600;'+deptStyle+'">'+e(f['Department']||'')+'</span>'+
      '</td>'+
      '<td style="padding:9px 10px;color:var(--txt);line-height:1.5">'+
        e(objText)+
        (linkedItem?'<div style="margin-top:3px"><span style="font-size:10px;color:var(--blue);font-family:monospace;cursor:pointer" data-qo-opp="'+linkedItem._id+'">&#128203; SR-'+linkedSR+'</span></div>':'')+
      '</td>'+
      '<td style="padding:9px 10px;white-space:nowrap">'+
        '<span style="font-size:10px;font-family:monospace;padding:2px 8px;border-radius:20px;font-weight:600;'+
          (achieved?'background:var(--green-bg);color:var(--green);border:1px solid var(--green-bdr)':'background:var(--amber-bg);color:var(--amber);border:1px solid var(--amber-bdr)')+
        '">'+(achieved?'&#10003; Achieved':'In Progress')+'</span>'+
      '</td>'+
      '<td style="padding:9px 10px;font-size:11px;color:var(--txt3);white-space:nowrap">'+startD+'</td>'+
      '<td style="padding:9px 10px;font-size:11px;color:var(--txt3);white-space:nowrap">'+endD+'</td>'+
      '<td style="padding:9px 10px;font-size:11px;color:var(--txt3);white-space:nowrap">'+e(f['Monitoring Frequency']||'—')+'</td>'+
      '<td style="padding:9px 10px;text-align:center">'+
        '<div style="font-size:11px;font-family:monospace;font-weight:600;color:'+(pct===100?'var(--green)':pct>=50?'var(--amber)':'var(--red)')+'">'+pct+'%</div>'+
        '<div style="background:var(--bg3);border-radius:20px;height:3px;margin-top:3px;overflow:hidden">'+
          '<div style="height:100%;border-radius:20px;background:'+(pct===100?'var(--green)':pct>=50?'var(--amber)':'var(--red)')+';width:'+pct+'%"></div>'+
        '</div>'+
      '</td>'+
      '<td style="padding:9px 10px;font-size:11px;color:var(--txt2)">'+e(f['Responsibility']||'')+'</td>'+
      '<td style="padding:9px 6px;text-align:right;white-space:nowrap">'+
        '<button class="icon-btn edit" data-qo-edit="'+r.id+'" style="opacity:1">'+IC_PENCIL+'</button>'+
        '<button class="icon-btn del" data-qo-del="'+r.id+'" style="opacity:1">'+IC_TRASH+'</button>'+
      '</td>'+
    '</tr>';
  }).join('');

  // Delegation
  tbody.onclick = function(ev) {
    var eb  = ev.target.closest('[data-qo-edit]');
    var db  = ev.target.closest('[data-qo-del]');
    var opp = ev.target.closest('[data-qo-opp]');
    if(eb)  { openQOModal(eb.dataset.qoEdit); return; }
    if(db)  { deleteQO(db.dataset.qoDel); return; }
    if(opp) { ev.stopPropagation(); openEditModal(opp.dataset.qoOpp); }
  };
  // Double-click row to edit
  tbody.ondblclick = function(ev) {
    var row = ev.target.closest('tr[data-qo-id]');
    if(row) openQOModal(row.dataset.qoId);
  };
}

function openQOModal(recordId) {
  qoEditId = recordId;
  var isNew = !recordId;
  var f = isNew ? {} : (qoRecords.find(function(r){return r.id===recordId;})||{}).fields || {};
  document.getElementById('qo-modal-title').textContent = isNew ? 'New Objective' : 'Edit Objective '+((f['Year']||'')+'-'+(f['Objective Number']||''));
  // Auto-number new objectives
  var nextNum = isNew ? (Math.max.apply(null, qoRecords.filter(function(r){return r.fields['Year']==='2026';}).map(function(r){return parseInt(r.fields['Objective Number'])||0;}).concat([0]))+1) : f['Objective Number']||'';
  document.getElementById('qo-ef-num').value    = nextNum;
  document.getElementById('qo-ef-year').value   = f['Year']||'2026';
  document.getElementById('qo-ef-dept').value   = f['Department']||'Sales';
  document.getElementById('qo-ef-status').value = f['Status']||'Under Process';
  document.getElementById('qo-ef-obj').value    = f['Objective']||'';
  document.getElementById('qo-ef-start').value  = (f['Start Date']||'').substring(0,10);
  document.getElementById('qo-ef-end').value    = (f['End Date']||'').substring(0,10);
  document.getElementById('qo-ef-freq').value   = f['Monitoring Frequency']||'Monthly';
  document.getElementById('qo-ef-pct').value    = Math.round((parseFloat(f['Completion %'])||0)*100);
  document.getElementById('qo-ef-resp').value   = f['Responsibility']||'';
  // Populate opportunity dropdown — load data first if needed
  function _populateQOOppDropdown(linkedId) {
    var qoOppSel = document.getElementById('qo-ef-opp');
    qoOppSel.innerHTML = '<option value="">— Not linked —</option>' +
      items.slice().sort(function(a,b){return (parseInt(b.sr_no)||0)-(parseInt(a.sr_no)||0);})
      .map(function(i){
        return '<option value="'+i._id+'"'+(i._id===linkedId?' selected':'')+'>SR-'+i.sr_no+' · '+e(i.project.substring(0,45))+'</option>';
      }).join('');
    qoOppSel.value = linkedId || '';
  }
  var linkedOppIds = f['Opportunity']||[];
  var linkedId = linkedOppIds.length>0 ? linkedOppIds[0] : '';
  document.getElementById('qo-modal').style.display='flex';
  if(items.length > 0) {
    _populateQOOppDropdown(linkedId);
  } else {
    // Load opportunities first then populate
    document.getElementById('qo-ef-opp').innerHTML = '<option value="">Loading…</option>';
    // Silent background fetch — don't disturb current screen
    (async function(){
      try {
        var url = WORKER_URL+'?pageSize=100';
        var allRecs = [], offset = null;
        do {
          var res = await fetch(url+(offset?'&offset='+encodeURIComponent(offset):''), {headers:getHeaders()});
          if(!res.ok) throw new Error('HTTP '+res.status);
          var data = await res.json();
          allRecs = allRecs.concat(data.records||[]);
          offset = data.offset||null;
        } while(offset);
        allRecords = allRecs;
        parseItems();
        _populateQOOppDropdown(linkedId);
      } catch(err) {
        document.getElementById('qo-ef-opp').innerHTML = '<option value="">— Not linked —</option>';
      }
    })();
  }
}

function closeQOModal() {
  document.getElementById('qo-modal').style.display='none';
  qoEditId = null;
}

async function saveQOModal() {
  if(!qoEditId) return;
  var pct = parseInt(document.getElementById('qo-ef-pct').value)||0;
  var fields = {
    'Objective Number':    parseInt(document.getElementById('qo-ef-num').value)||0,
    'Year':                document.getElementById('qo-ef-year').value,
    'Department':          document.getElementById('qo-ef-dept').value,
    'Status':              document.getElementById('qo-ef-status').value,
    'Objective':           document.getElementById('qo-ef-obj').value.trim(),
    'Monitoring Frequency':document.getElementById('qo-ef-freq').value.trim(),
    'Completion %':        pct/100,
    'Responsibility':      document.getElementById('qo-ef-resp').value.trim(),
  };
  var s = document.getElementById('qo-ef-start').value;
  var en= document.getElementById('qo-ef-end').value;
  fields['Start Date'] = s || null;
  fields['End Date'] = en || null;
  var oppSel = document.getElementById('qo-ef-opp').value;
  if(oppSel) fields['Opportunity'] = [oppSel];

  var savedId = qoEditId;
  var isNew   = !savedId;
  closeQOModal();
  try {
    var url    = isNew ? WORKER_URL+'/quality-objectives' : WORKER_URL+'/quality-objectives/'+savedId;
    var method = isNew ? 'POST' : 'PATCH';
    var res    = await fetch(url, {method:method,headers:getHeaders(),body:JSON.stringify({fields:fields})});
    var data   = await res.json();
    if(!res.ok) throw new Error((data.error&&data.error.message)||'HTTP '+res.status);
    if(isNew) {
      qoRecords.push(data);
    } else {
      var rec = qoRecords.find(function(r){return r.id===savedId;});
      if(rec) rec.fields = Object.assign(rec.fields, fields);
    }
    renderQO();
    toast(isNew ? 'Objective added' : 'Objective updated','ok');
  } catch(err) {
    toast('Failed: '+err.message,'err');
  }
}

// ================================================================
// EMPLOYEES
// ================================================================
var empRecords  = [];
var empLoaded   = false;
var empEditId   = null;

function showEmployees() {
  if(userRole !== 'admin') { toast('Employees is restricted to Admin users','err'); return; }
  sessionStorage.setItem('mbb_screen','employees');
  ['login-screen','home-screen','app','vendor-screen','dashboard-screen','contractors-screen','suppliers-screen','quality-screen','employees-screen','renewals-screen','company-docs-screen','loading'].forEach(function(id){
    var el=document.getElementById(id); if(el) el.style.display='none';
  });
  document.getElementById('employees-screen').style.display='flex';
  if(!empLoaded) loadEmployees();
  else renderEmployees();
}

function filterEmployees() {
  var q = ((document.getElementById('emp-search')||{}).value||'').toLowerCase().trim();
  var cntEl = document.getElementById('emp-count');
  var all = empRecords;
  var filtered = q ? all.filter(function(r){
    var name = (r.fields['Employee Name']||'').toLowerCase();
    return name.indexOf(q) !== -1;
  }) : all;
  if(cntEl) cntEl.textContent = filtered.length+' employee'+(filtered.length===1?'':'s');
  renderFilteredEmployees(filtered);
}

function renderFilteredEmployees(records) {
  var grid = document.getElementById('emp-grid');
  if(!grid) return;
  if(records.length===0) {
    grid.innerHTML='<div style="padding:48px;text-align:center;color:var(--txt3);grid-column:1/-1">No employees match your search</div>';
    return;
  }
  // Reuse existing card rendering logic
  grid.onclick = function(ev){
    var eb=ev.target.closest('[data-emp-edit]');
    var db=ev.target.closest('[data-emp-del]');
    if(eb){ showEmployeeModal(eb.dataset.empEdit); return; }
    if(db){ deleteEmployee(db.dataset.empDel, db.dataset.empName); return; }
  };
  grid.innerHTML = records.map(function(r){
    var f = r.fields;
    var name = f['Employee Name']||'Unknown';
    return '<div class="emp-card">'+
      '<div class="emp-card-header">'+
        '<div class="emp-avatar">'+initials(name)+'</div>'+
        '<div>'+
          '<div class="emp-name">'+e(name)+'</div>'+
          (f['Date of Birth']?'<div class="emp-dob">DOB: '+fmtDate(f['Date of Birth'])+'</div>':'')+
          (f['Start Date']?'<div class="emp-dob" style="color:var(--amber)">Joined: '+fmtDate(f['Start Date'])+'</div>':'')+
        '</div>'+
      '</div>'+
      '<div class="emp-body">'+
        '<div class="emp-section-lbl">&#128246; Passport</div>'+
        '<div class="emp-row"><span class="emp-row-lbl">Number</span><span class="emp-row-val">'+e(f['Passport Number']||'—')+'</span></div>'+
        '<div class="emp-row"><span class="emp-row-lbl">Expiry</span><span class="emp-row-val '+expiryClass(f['Passport Expiry'])+'">'+expiryLabel(f['Passport Expiry'])+'</span>'+docLink(f['Link to Passport'],'View Passport')+'</div>'+
        '<div class="emp-section-lbl">&#127482;&#127462; Emirates ID</div>'+
        '<div class="emp-row"><span class="emp-row-lbl">Number</span><span class="emp-row-val">'+e(f['Emirates ID Number']||'—')+'</span></div>'+
        '<div class="emp-row"><span class="emp-row-lbl">Expiry</span><span class="emp-row-val '+expiryClass(f['Emirates ID Expiry'])+'">'+expiryLabel(f['Emirates ID Expiry'])+'</span>'+docLink(f['Link to Emirates ID'],'View ID')+'</div>'+
        '<div class="emp-section-lbl">&#128222; Visa</div>'+
        '<div class="emp-row"><span class="emp-row-lbl">File No.</span><span class="emp-row-val">'+e(f['Visa File Number']||'—')+'</span></div>'+
        '<div class="emp-row"><span class="emp-row-lbl">Expiry</span><span class="emp-row-val '+expiryClass(f['Visa Expiry'])+'">'+expiryLabel(f['Visa Expiry'])+'</span>'+docLink(f['Link to Visa'],'View Visa')+'</div>'+
        '<div class="emp-section-lbl">&#128138; Health Insurance</div>'+
        '<div class="emp-row"><span class="emp-row-lbl">Policy No.</span><span class="emp-row-val">'+e(f['Health Insurance Policy Number']||'—')+'</span></div>'+
        '<div class="emp-row"><span class="emp-row-lbl">Member No.</span><span class="emp-row-val">'+e(f['Health Insurance Membership Number']||'—')+'</span>'+docLink(f['Link to Health Insurance Card'],'View Card')+'</div>'+
      '</div>'+
      '<div class="emp-card-footer">'+
        '<button class="btn-sm" data-emp-edit="'+r.id+'">&#9998; Edit</button>'+
        '<button class="btn-sm" style="color:var(--amber);border-color:var(--amber)" onclick="empViewLeaveFromCard(\''+r.id+'\')" >&#128197; Leave</button>'+
        '<button class="btn-sm" style="color:var(--red);border-color:var(--red)" data-emp-del="'+r.id+'" data-emp-name="'+e(name)+'">&#128465; Delete</button>'+
      '</div>'+
    '</div>';
  }).join('');
}

async function loadEmployees() {
  var grid = document.getElementById('emp-grid');
  if(grid) grid.innerHTML = '<div style="padding:40px;text-align:center;color:var(--txt3)">Loading…</div>';
  try {
    var res  = await fetch(WORKER_URL+'/employees?pageSize=100', {headers:getHeaders()});
    if(!res.ok) throw new Error('HTTP '+res.status);
    var data = await res.json();
    empRecords = data.records||[];
    empLoaded  = true;
    renderEmployees();
  } catch(err) {
    if(grid) grid.innerHTML = '<div style="padding:20px;color:var(--red)">Failed to load: '+err.message+'</div>';
  }
}

function expiryClass(dateStr) {
  if(!dateStr) return '';
  var d = new Date(dateStr); var now = new Date();
  var days = Math.round((d-now)/(1000*60*60*24));
  if(days < 0)   return 'expiry-overdue';
  if(days <= 60) return 'expiry-soon';
  return 'expiry-ok';
}

function fmtDate(dateStr) {
  if(!dateStr) return '—';
  var d = new Date(dateStr);
  return d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
}

function expiryLabel(dateStr) {
  if(!dateStr) return '—';
  var d = new Date(dateStr); var now = new Date();
  var days = Math.round((d-now)/(1000*60*60*24));
  var base = fmtDate(dateStr);
  if(days < 0)   return base+' (expired)';
  if(days <= 60) return base+' ('+days+'d)';
  return base;
}

function docLink(url, label) {
  if(!url) return '<span style="font-size:11px;color:var(--txt3);opacity:.4">No link</span>';
  return '<a class="emp-doc-link" href="'+e(url)+'" target="_blank" rel="noopener">&#128279; '+label+'</a>';
}

function initials(name) {
  if(!name) return '?';
  return name.trim().split(/\s+/).map(function(w){return w[0]||'';}).slice(0,2).join('').toUpperCase();
}

function renderEmployees() {
  var grid = document.getElementById('emp-grid');
  if(!grid) return;
  if(empRecords.length===0) {
    grid.innerHTML='<div style="padding:48px;text-align:center;color:var(--txt3);grid-column:1/-1">No employees added yet.<br><br><button class="btn-pri" onclick="showEmployeeModal(null)">+ Add First Employee</button></div>';
    return;
  }
  filterEmployees();
  return; // rendered via filterEmployees
  grid.innerHTML = empRecords.map(function(r){
    var f = r.fields;
    var name = f['Employee Name']||'Unknown';
    return '<div class="emp-card">'+
      '<div class="emp-card-header">'+
        '<div class="emp-avatar">'+initials(name)+'</div>'+
        '<div>'+
          '<div class="emp-name">'+e(name)+'</div>'+
          (f['Date of Birth']?'<div class="emp-dob">DOB: '+fmtDate(f['Date of Birth'])+'</div>':'')+
          (f['Start Date']?'<div class="emp-dob" style="color:var(--amber)">Joined: '+fmtDate(f['Start Date'])+'</div>':'')+
        '</div>'+
      '</div>'+
      '<div class="emp-body">'+
        // Passport
        '<div class="emp-section-lbl">&#128246; Passport</div>'+
        '<div class="emp-row"><span class="emp-row-lbl">Number</span><span class="emp-row-val">'+e(f['Passport Number']||'—')+'</span></div>'+
        '<div class="emp-row"><span class="emp-row-lbl">Expiry</span><span class="emp-row-val '+expiryClass(f['Passport Expiry'])+'">'+expiryLabel(f['Passport Expiry'])+'</span>'+docLink(f['Link to Passport'],'View Passport')+'</div>'+
        // Emirates ID
        '<div class="emp-section-lbl">&#127482;&#127462; Emirates ID</div>'+
        '<div class="emp-row"><span class="emp-row-lbl">Number</span><span class="emp-row-val">'+e(f['Emirates ID Number']||'—')+'</span></div>'+
        '<div class="emp-row"><span class="emp-row-lbl">Expiry</span><span class="emp-row-val '+expiryClass(f['Emirates ID Expiry'])+'">'+expiryLabel(f['Emirates ID Expiry'])+'</span>'+
          docLink(f['Link to Emirates ID'],'View ID')+'</div>'+
        // Visa
        '<div class="emp-section-lbl">&#128222; Visa</div>'+
        '<div class="emp-row"><span class="emp-row-lbl">File No.</span><span class="emp-row-val">'+e(f['Visa File Number']||'—')+'</span></div>'+
        '<div class="emp-row"><span class="emp-row-lbl">Expiry</span><span class="emp-row-val '+expiryClass(f['Visa Expiry'])+'">'+expiryLabel(f['Visa Expiry'])+'</span>'+
          docLink(f['Link to Visa'],'View Visa')+'</div>'+
        // Health Insurance
        '<div class="emp-section-lbl">&#128138; Health Insurance</div>'+
        '<div class="emp-row"><span class="emp-row-lbl">Policy No.</span><span class="emp-row-val">'+e(f['Health Insurance Policy Number']||'—')+'</span></div>'+
        '<div class="emp-row"><span class="emp-row-lbl">Member No.</span><span class="emp-row-val">'+e(f['Health Insurance Membership Number']||'—')+'</span>'+
          docLink(f['Link to Health Insurance Card'],'View Card')+'</div>'+
      '</div>'+
      '<div class="emp-card-footer">'+
        '<button class="btn-sm" data-emp-edit="'+r.id+'">&#9998; Edit</button>'+
        '<button class="btn-sm" style="color:var(--amber);border-color:var(--amber)" onclick="empViewLeaveFromCard(\''+r.id+'\')" >&#128197; Leave</button>'+
        '<button class="btn-sm" style="color:var(--red);border-color:var(--red)" data-emp-del="'+r.id+'" data-emp-name="'+e(name)+'">&#128465; Delete</button>'+
      '</div>'+
    '</div>';
  }).join('');
}

function showEmployeeModal(recordId) {
  empEditId = recordId;
  var isNew = !recordId;
  document.getElementById('emp-modal-title').textContent = isNew ? 'Add Employee' : 'Edit Employee';
  var f = isNew ? {} : (empRecords.find(function(r){return r.id===recordId;})||{}).fields||{};
  var fields = ['empf-name','empf-dob','empf-pp-num','empf-pp-exp','empf-eid-num','empf-eid-exp',
    'empf-eid-link','empf-visa-num','empf-visa-exp','empf-visa-link','empf-hi-policy','empf-hi-member','empf-hi-link','empf-start'];
  var fmap   = {
    'empf-name':'Employee Name','empf-dob':'Date of Birth',
    'empf-pp-num':'Passport Number','empf-pp-exp':'Passport Expiry','empf-pp-link':'Link to Passport',
    'empf-eid-num':'Emirates ID Number','empf-eid-exp':'Emirates ID Expiry','empf-eid-link':'Link to Emirates ID',
    'empf-visa-num':'Visa File Number','empf-visa-exp':'Visa Expiry','empf-visa-link':'Link to Visa',
    'empf-hi-policy':'Health Insurance Policy Number','empf-hi-member':'Health Insurance Membership Number',
    'empf-hi-link':'Link to Health Insurance Card',
    'empf-start':'Start Date'
  };
  fields.forEach(function(id){
    var el=document.getElementById(id); if(!el) return;
    var val = f[fmap[id]]||'';
    // date fields: take first 10 chars
    if(el.type==='date') el.value=(val||'').substring(0,10);
    else el.value=val;
  });
  var lvBtn=document.getElementById('emp-view-leave-btn');
  if(lvBtn) lvBtn.style.display=recordId?'':'none';
  var lvBtn=document.getElementById('emp-view-leave-btn');
  if(lvBtn) lvBtn.style.display = recordId ? '' : 'none';
  document.getElementById('emp-modal').style.display='flex';
  setTimeout(function(){ document.getElementById('empf-name').focus(); },50);
}

function closeEmployeeModal() {
  document.getElementById('emp-modal').style.display='none';
  empEditId=null;
}

async function saveEmployee() {
  var name = document.getElementById('empf-name').value.trim();
  if(!name){ document.getElementById('empf-name').focus(); return; }
  var startDate = document.getElementById('empf-start').value||null;
  var savedId = empEditId;
  closeEmployeeModal();
  var fmap = {
    'empf-name':'Employee Name','empf-dob':'Date of Birth',
    'empf-pp-num':'Passport Number','empf-pp-exp':'Passport Expiry','empf-pp-link':'Link to Passport',
    'empf-eid-num':'Emirates ID Number','empf-eid-exp':'Emirates ID Expiry','empf-eid-link':'Link to Emirates ID',
    'empf-visa-num':'Visa File Number','empf-visa-exp':'Visa Expiry','empf-visa-link':'Link to Visa',
    'empf-hi-policy':'Health Insurance Policy Number','empf-hi-member':'Health Insurance Membership Number',
    'empf-hi-link':'Link to Health Insurance Card',
    'empf-start':'Start Date'
  };
  var fields={};
  Object.keys(fmap).forEach(function(id){
    var el=document.getElementById(id); if(!el) return;
    var val=el.value.trim();
    // Always include all fields so Airtable clears them when empty
    fields[fmap[id]] = val || null;
  });
  // Build clean payload: exclude nulls for PATCH (Airtable ignores them anyway)
  // but include for POST so new records are created cleanly
  // For PATCH: include nulls so cleared fields actually get cleared in Airtable
  var cleanFields = fields;
  try {
    var url    = savedId ? WORKER_URL+'/employees/'+savedId : WORKER_URL+'/employees';
    var method = savedId ? 'PATCH' : 'POST';
    var res    = await fetch(url,{method:method,headers:getHeaders(),body:JSON.stringify({fields:cleanFields})});
    var data   = await res.json();
    if(!res.ok) throw new Error((data.error&&data.error.message)||'HTTP '+res.status);
    if(savedId) {
      var rec=empRecords.find(function(r){return r.id===savedId;});
      if(rec) rec.fields=Object.assign(rec.fields,cleanFields);
    } else {
      empRecords.push(data);
      empRecords.sort(function(a,b){return (a.fields['Employee Name']||'').localeCompare(b.fields['Employee Name']||'');});
    }
    renderEmployees();
    toast((savedId?'Employee updated':'Employee added'),'ok');
  } catch(err){ toast('Failed: '+err.message,'err'); }
}
function empViewLeave() {
  var empId = empEditId;
  closeEmployeeModal();
  showEmployeeLeave();
  // Wait for screen to load then open employee detail
  setTimeout(function(){
    if(empId) openEmpDetail(empId);
  }, elLoaded ? 100 : 1500);
}
function empViewLeaveFromCard(empId) {
  empEditId = empId;
  showEmployeeLeave();
  setTimeout(function(){ if(empId) openEmpDetail(empId); }, elLoaded ? 100 : 1500);
}



var pendingEmpDeleteId=null;

function deleteEmployee(recordId, name) {
  pendingEmpDeleteId=recordId;
  document.getElementById('confirm-title').textContent='Delete employee?';
  document.getElementById('confirm-body').innerHTML='This will permanently delete <b>'+e(name)+'</b>.<br><br>This cannot be undone.';
  document.getElementById('confirm-modal').style.display='flex';
}

async function confirmDeleteEmployee() {
  if(!pendingEmpDeleteId) return;
  var id=pendingEmpDeleteId; pendingEmpDeleteId=null;
  closeConfirm();
  try {
    var res=await fetch(WORKER_URL+'/employees/'+id,{method:'DELETE',headers:getHeaders()});
    if(!res.ok) throw new Error('HTTP '+res.status);
    empRecords=empRecords.filter(function(r){return r.id!==id;});
    renderEmployees();
    toast('Employee deleted','ok');
  } catch(err){ toast('Failed: '+err.message,'err'); }
}

// ================================================================
// RENEWALS
// ================================================================
var renRecords = [];
var renLoaded      = false;
var renEditId      = null;
var upcomingDays   = 30;

function showRenewals() {
  sessionStorage.setItem('mbb_screen','renewals');
  ['login-screen','home-screen','app','vendor-screen','dashboard-screen','contractors-screen',
   'suppliers-screen','quality-screen','employees-screen','renewals-screen','loading'].forEach(function(id){
    var el=document.getElementById(id); if(el) el.style.display='none';
  });
  document.getElementById('renewals-screen').style.display='flex';
  if(!renLoaded) loadRenewals();
  else renderRenewals();
}

async function loadRenewals() {
  var tbody = document.getElementById('ren-tbody');
  if(tbody) tbody.innerHTML = '<tr><td colspan="7" style="padding:40px;text-align:center;color:var(--txt3)">Loading…</td></tr>';
  try {
    var res  = await fetch(WORKER_URL+'/renewals?pageSize=100', {headers:getHeaders()});
    if(!res.ok) throw new Error('HTTP '+res.status);
    var data = await res.json();
    renRecords = data.records||[];
    renLoaded  = true;
    // Populate entity filter
    var entities = [...new Set(renRecords.map(function(r){ return r.fields['Entity']||''; }).filter(Boolean))].sort();
    var sel = document.getElementById('ren-filter-entity');
    if(sel) {
      sel.innerHTML = '<option value="">All Entities</option>' +
        entities.map(function(e){ return '<option value="'+e+'">'+e+'</option>'; }).join('');
    }
    renderRenewals();
  } catch(err) {
    if(tbody) tbody.innerHTML = '<tr><td colspan="7" style="padding:20px;color:var(--red)">Failed to load: '+err.message+'</td></tr>';
  }
}

function daysUntil(dateStr) {
  if(!dateStr) return null;
  var d = new Date(dateStr); var now = new Date();
  now.setHours(0,0,0,0); d.setHours(0,0,0,0);
  return Math.round((d-now)/(1000*60*60*24));
}

function renStatusStyle(days) {
  if(days === null) return {cls:'', label:'No date'};
  if(days < 0)    return {cls:'color:var(--red);font-weight:600',   label:'EXPIRED'};
  if(days <= 30)  return {cls:'color:var(--red);font-weight:600',   label:days+'d left'};
  if(days <= 90)  return {cls:'color:var(--amber);font-weight:600', label:days+'d left'};
  return             {cls:'color:var(--green)',                       label:days+'d left'};
}

function renRowBg(days) {
  if(days === null) return '';
  if(days < 0)   return 'background:#fff0f0';
  if(days <= 30) return 'background:#fff5f5';
  if(days <= 90) return 'background:#fffbf0';
  return '';
}

function renderRenewals() {
  var tbody  = document.getElementById('ren-tbody');
  var sumEl  = document.getElementById('ren-summary');
  var cntEl  = document.getElementById('ren-count');
  if(!tbody) return;

  var filterEntity = (document.getElementById('ren-filter-entity')||{}).value||'';
  var filterStatus = (document.getElementById('ren-filter-status')||{}).value||'';
  var searchQ      = ((document.getElementById('ren-search')||{}).value||'').toLowerCase().trim();

  var recs = renRecords.filter(function(r){
    var f = r.fields;
    if(filterEntity && f['Entity'] !== filterEntity) return false;
    if(searchQ && ![f['Renewal Details'],f['Entity'],f['Comments']].some(function(v){ return (v||'').toLowerCase().indexOf(searchQ)!==-1; })) return false;
    var days = daysUntil(f['Expiry Date']);
    if(filterStatus === 'overdue' && !(days !== null && days < 0)) return false;
    if(filterStatus === 'soon'    && !(days !== null && days >= 0 && days <= 90)) return false;
    if(filterStatus === 'ok'      && !(days !== null && days > 90)) return false;
    return true;
  }).sort(function(a,b){
    var da = a.fields['Expiry Date']||'9999-99-99';
    var db = b.fields['Expiry Date']||'9999-99-99';
    return da.localeCompare(db);
  });

  if(cntEl) cntEl.textContent = recs.length + ' item' + (recs.length===1?'':'s');

  // Summary strip
  var overdue = renRecords.filter(function(r){ var d=daysUntil(r.fields['Expiry Date']); return d!==null&&d<0; }).length;
  var soon30  = renRecords.filter(function(r){ var d=daysUntil(r.fields['Expiry Date']); return d!==null&&d>=0&&d<=30; }).length;
  var soon90  = renRecords.filter(function(r){ var d=daysUntil(r.fields['Expiry Date']); return d!==null&&d>30&&d<=90; }).length;
  if(sumEl) sumEl.innerHTML = [
    {label:'Total',         val:renRecords.length,  cls:''},
    {label:'Expired',       val:overdue,            cls:overdue>0?'red':''},
    {label:'Due &le; 30d',  val:soon30,             cls:soon30>0?'red':''},
    {label:'Due 31–90d',    val:soon90,             cls:soon90>0?'process':''},
  ].map(function(k){
    return '<div class="dash-kpi '+k.cls+'" style="padding:10px 14px;flex:0;min-width:80px;text-align:center">'+
      '<div class="dash-kpi-lbl">'+k.label+'</div>'+
      '<div class="dash-kpi-val" style="font-size:22px">'+k.val+'</div>'+
    '</div>';
  }).join('');

  if(recs.length===0){
    tbody.innerHTML='<tr><td colspan="7" style="padding:40px;text-align:center;color:var(--txt3)">No renewals found</td></tr>';
    return;
  }

  tbody.innerHTML = recs.map(function(r){
    var f    = r.fields;
    var days = daysUntil(f['Expiry Date']);
    var st   = renStatusStyle(days);
    var bg   = renRowBg(days);
    var expiryStr = f['Expiry Date'] ? new Date(f['Expiry Date']).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—';
    var cost = f['Estimated Cost'] ? 'AED '+parseFloat(f['Estimated Cost']).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}) : '—';
    return '<tr style="border-bottom:1px solid var(--bdr);'+bg+'" data-ren-id="'+r.id+'">'+
      '<td style="padding:6px 10px;font-weight:500;color:var(--txt);white-space:nowrap"><span style="font-size:10px;padding:2px 8px;border-radius:20px;font-family:monospace;font-weight:600;background:var(--blue-bg);color:var(--blue)">'+e(f['Entity']||'—')+'</span></td>'+
      '<td style="padding:10px 12px;color:var(--txt)">'+e(f['Renewal Details']||'—')+'</td>'+
      '<td style="padding:6px 10px;font-family:monospace;font-size:11px;white-space:nowrap;color:var(--txt2)">'+expiryStr+'</td>'+
      '<td style="padding:6px 10px;font-family:monospace;font-size:12px;white-space:nowrap;'+st.cls+'">'+st.label+'</td>'+
      '<td style="padding:6px 10px;text-align:right;font-family:monospace;font-size:11px;color:var(--txt2);white-space:nowrap">'+cost+'</td>'+
      '<td style="padding:6px 10px;color:var(--txt3);font-size:12px;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+e(f['Comments']||'')+'</td>'+
      '<td style="padding:6px 4px;text-align:center">'+(f['Link to Steps']?'<a href="'+e(f['Link to Steps'])+'" target="_blank" rel="noopener" style="color:var(--blue);font-size:14px">&#128279;</a>':'<span style="opacity:.2;font-size:14px">&#128279;</span>')+'</td>'+
      '<td style="padding:6px 6px;text-align:right;white-space:nowrap">'+
        '<button class="icon-btn edit" data-ren-edit="'+r.id+'" style="opacity:1">'+IC_PENCIL+'</button>'+
        '<button class="icon-btn del" data-ren-del="'+r.id+'" style="opacity:1">'+IC_TRASH+'</button>'+
      '</td>'+
    '</tr>';
  }).join('');

  // Delegation
  tbody.ondblclick = function(ev){
    var row=ev.target.closest('tr[data-ren-id]');
    if(row) showRenewalModal(row.dataset.renId);
  };
  tbody.onclick = function(ev){
    var eb=ev.target.closest('[data-ren-edit]');
    var db=ev.target.closest('[data-ren-del]');
    if(eb){ showRenewalModal(eb.dataset.renEdit); return; }
    if(db){ deleteRenewal(db.dataset.renDel, db.dataset.renDetails); return; }
  };
}

function showRenewalModal(recordId) {
  renEditId = recordId;
  var isNew = !recordId;
  document.getElementById('ren-modal-title').textContent = isNew ? 'Add Renewal' : 'Edit Renewal';
  var f = isNew ? {} : (renRecords.find(function(r){return r.id===recordId;})||{}).fields||{};
  document.getElementById('renf-entity').value   = f['Entity']||'';
  document.getElementById('renf-details').value  = f['Renewal Details']||'';
  document.getElementById('renf-cost').value     = f['Estimated Cost']||'';
  document.getElementById('renf-expiry').value   = (f['Expiry Date']||'').substring(0,10);
  document.getElementById('renf-steps').value   = f['Link to Steps']||'';
  document.getElementById('renf-comments').value = f['Comments']||'';
  document.getElementById('ren-modal').style.display='flex';
  setTimeout(function(){ document.getElementById('renf-details').focus(); },50);
}

function closeRenewalModal() {
  document.getElementById('ren-modal').style.display='none';
  renEditId=null;
}

async function saveRenewal() {
  var details = document.getElementById('renf-details').value.trim();
  var entity  = document.getElementById('renf-entity').value;
  if(!details){ document.getElementById('renf-details').focus(); return; }
  if(!entity){  document.getElementById('renf-entity').focus(); return; }
  var savedId = renEditId;
  closeRenewalModal();
  var cost = parseFloat(document.getElementById('renf-cost').value);
  var fields = {
    'Entity':          entity,
    'Renewal Details': details,
    'Expiry Date':     document.getElementById('renf-expiry').value || null,
    'Estimated Cost':  (!isNaN(cost) && document.getElementById('renf-cost').value.trim() !== '') ? cost : null,
    'Link to Steps':   document.getElementById('renf-steps').value.trim() || null,
    'Comments':        document.getElementById('renf-comments').value.trim() || null,
  };
  var cleanFields = {};
  Object.keys(fields).forEach(function(k){ if(fields[k]!==undefined) cleanFields[k]=fields[k]; });
  if(!savedId) cleanFields = fields;
  try {
    var url    = savedId ? WORKER_URL+'/renewals/'+savedId : WORKER_URL+'/renewals';
    var method = savedId ? 'PATCH' : 'POST';
    var res    = await fetch(url,{method:method,headers:getHeaders(),body:JSON.stringify({fields:cleanFields})});
    var data   = await res.json();
    if(!res.ok) throw new Error((data.error&&data.error.message)||'HTTP '+res.status);
    if(savedId) {
      var rec=renRecords.find(function(r){return r.id===savedId;});
      if(rec) rec.fields=Object.assign(rec.fields,cleanFields);
    } else {
      renRecords.push(data);
      renRecords.sort(function(a,b){
        var da=a.fields['Expiry Date']||'9999', db2=b.fields['Expiry Date']||'9999';
        return da.localeCompare(db2);
      });
    }
    renderRenewals();
    toast((savedId?'Renewal updated':'Renewal added'),'ok');
  } catch(err){ toast('Failed: '+err.message,'err'); }
}

var pendingRenDeleteId=null;

function deleteRenewal(recordId) {
  pendingRenDeleteId=recordId;
  var rec=renRecords.find(function(r){return r.id===recordId;});
  var lbl=rec?(rec.fields['Renewal Details']||'this renewal'):'this renewal';
  document.getElementById('confirm-title').textContent='Delete renewal?';
  document.getElementById('confirm-body').innerHTML='This will permanently delete <b>'+e(lbl)+'</b>.<br><br>This cannot be undone.';
  document.getElementById('confirm-modal').style.display='flex';
}

async function confirmDeleteRenewal() {
  if(!pendingRenDeleteId) return;
  var id=pendingRenDeleteId; pendingRenDeleteId=null;
  closeConfirm();
  try {
    var res=await fetch(WORKER_URL+'/renewals/'+id,{method:'DELETE',headers:getHeaders()});
    if(!res.ok) throw new Error('HTTP '+res.status);
    renRecords=renRecords.filter(function(r){return r.id!==id;});
    renderRenewals();
    toast('Renewal deleted','ok');
  } catch(err){ toast('Failed: '+err.message,'err'); }
}

function setUpcomingWindow(days) {
  upcomingDays = days;
  // Update button states
  [30,60,90].forEach(function(d){
    var btn = document.getElementById('uw-'+d);
    if(btn) btn.classList.toggle('uw-active', d===days);
  });
  loadUpcomingEvents();
}

// ── EmailJS configuration ─────────────────────────────────────────
// Sign up at https://www.emailjs.com, create a service + template, paste IDs below
var EMAILJS_SERVICE_ID  = 'YOUR_SERVICE_ID';   // e.g. 'service_abc123'
var EMAILJS_TEMPLATE_ID = 'YOUR_TEMPLATE_ID';  // e.g. 'template_xyz789'
var EMAILJS_PUBLIC_KEY  = 'YOUR_PUBLIC_KEY';   // e.g. 'AbCdEfGhIjKlMnOp'

function sendSupplierEvalEmail(supplierName, contactPerson) {
  if(EMAILJS_SERVICE_ID === 'YOUR_SERVICE_ID') return; // not configured
  try {
    emailjs.init({publicKey: EMAILJS_PUBLIC_KEY});
    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      to_email:      'paul.winick@mbellab.com',
      supplier_name: supplierName,
      contact_name:  contactPerson || '—',
      portal_url:    'https://mbellab.github.io',
    });
  } catch(e2) { console.warn('EmailJS error:', e2); }
}

// ── Post-login loading overlay ────────────────────────────────────
var loadingOverlayTimeout = null;

function showLoadingOverlay(msg) {
  showHome();
}

function openQuoteFromRow(id) {
  currentEditId = id;
  try { showQuoteLetterModal(); }
  catch(err) { toast('Error: '+err.message,'err'); console.error(err); }
}

function numberToWords(n) {
  if(!n || n===0) return 'Zero Dirhams';
  var ones=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven',
    'Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  var tens=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  function below1000(num) {
    if(num===0) return '';
    if(num<20) return ones[num]+' ';
    if(num<100) return tens[Math.floor(num/10)]+(num%10?' '+ones[num%10]+' ':' ');
    return ones[Math.floor(num/100)]+' Hundred '+(num%100?below1000(num%100):'');
  }
  var parts=[];
  var billions=Math.floor(n/1e9); if(billions) parts.push(below1000(billions)+'Billion ');
  var millions=Math.floor((n%1e9)/1e6); if(millions) parts.push(below1000(millions)+'Million ');
  var thousands=Math.floor((n%1e6)/1000); if(thousands) parts.push(below1000(thousands)+'Thousand ');
  var remainder=Math.floor(n%1000); if(remainder) parts.push(below1000(remainder));
  return parts.join('').trim()+' Dirhams';
}

function fmtAEDcomma(n) {
  return n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
}

function openQuoteFromRow(id) {
  currentEditId = id;
  try { showQuoteLetterModal(); }
  catch(err) { toast('Error: '+err.message,'err'); console.error(err); }
}

function exportPCtoExcel() {
  // Build CSV content for current month
  var monthName = PC_MONTHS[pcMonth] + ' ' + pcYear;
  var monthRecs = pcRecords.filter(function(r){
    var d = r.fields['Date'] ? new Date(r.fields['Date']) : null;
    if(!d) return false;
    return d.getFullYear()===pcYear && d.getMonth()===pcMonth;
  }).sort(function(a,b){
    return new Date(a.fields['Date']) - new Date(b.fields['Date']);
  });

  // Calculate opening balance
  var openingBal = 0;
  pcRecords.forEach(function(r){
    var d = r.fields['Date'] ? new Date(r.fields['Date']) : null;
    if(!d) return;
    if(d.getFullYear() < pcYear || (d.getFullYear()===pcYear && d.getMonth() < pcMonth)) {
      var amt = parseFloat(r.fields['Amount'])||0;
      openingBal += r.fields['Type']==='In' ? amt : -amt;
    }
  });

  var rows = [
    ['mBELLAb Petty Cash — ' + monthName],
    [],
    ['Date','VU No','Description','Notes','Type','Amount (AED)'],
    ['01 ' + PC_MONTHS[pcMonth].substring(0,3),'','Balance B/F','','',''+openingBal.toFixed(2)],
  ];

  monthRecs.forEach(function(r){
    var f = r.fields;
    var d = new Date(f['Date']);
    var dateStr = String(d.getDate()).padStart(2,'0')+' '+PC_MONTHS[d.getMonth()].substring(0,3);
    var amt = parseFloat(f['Amount'])||0;
    var signed = f['Type']==='In' ? amt : -amt;
    rows.push([dateStr, f['VU No']||'', f['Description']||'', f['Notes']||'', f['Type']||'', signed.toFixed(2)]);
  });

  var totalIn = 0, totalOut = 0;
  monthRecs.forEach(function(r){
    var amt = parseFloat(r.fields['Amount'])||0;
    if(r.fields['Type']==='In') totalIn+=amt; else totalOut+=amt;
  });
  var closing = openingBal + totalIn - totalOut;

  rows.push([]);
  rows.push(['','','','','Opening Balance', openingBal.toFixed(2)]);
  rows.push(['','','','','Cash In', totalIn.toFixed(2)]);
  rows.push(['','','','','Cash Out', totalOut.toFixed(2)]);
  rows.push(['','','','','Closing Balance', closing.toFixed(2)]);

  // Convert to CSV
  var csv = rows.map(function(row){
    return row.map(function(cell){
      var s = String(cell);
      return s.indexOf(',')!==-1||s.indexOf('"')!==-1 ? '"'+s.replace(/"/g,'""')+'"' : s;
    }).join(',');
  }).join('\n');

  var blob = new Blob([csv], {type:'text/csv'});
  var link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'PettyCash_'+PC_MONTHS[pcMonth]+'_'+pcYear+'.csv';
  link.click();
  toast('Export downloaded','ok');
}

function qlCalcTotal() {
  var a1=parseFloat(document.getElementById('ql-amt1').value)||0;
  var a2=parseFloat(document.getElementById('ql-amt2').value)||0;
  var a3=parseFloat(document.getElementById('ql-amt3').value)||0;
  var total=a1+a2+a3;
  var disp=document.getElementById('ql-total-display');
  var words=document.getElementById('ql-total-words');
  if(disp) disp.textContent='AED '+fmtAEDcomma(total);
  if(words && !words.dataset.userEdited) words.value=total>0?numberToWords(Math.round(total)):'';
}

function openQuoteFromRow(id) {
  currentEditId = id;
  try {
    showQuoteLetterModal();
  } catch(err) {
    toast('Error: '+err.message,'err');
    console.error(err);
  }
}

function openQuoteFromRow(id) {
  currentEditId = id;
  try { showQuoteLetterModal(); }
  catch(err) { toast('Error: '+err.message,'err'); console.error(err); }
}

// ── Upcoming Events (home screen) ────────────────────────────────
async function loadUpcomingEvents() {
  var group = document.getElementById('upcoming-group');
  if(!group) return;

  var renEl  = document.getElementById('home-upcoming-renewals');
  var bthEl  = document.getElementById('home-upcoming-birthdays');
  var today  = new Date(); today.setHours(0,0,0,0);
  var windowDays = upcomingDays || 30;
  var in30   = new Date(today); in30.setDate(today.getDate()+windowDays);

  var hasAny = false;

  // ── Renewals due in next 30 days ──────────────────────────────
  try {
    var rRes = await fetch(WORKER_URL+'/renewals?pageSize=100', {headers:getHeaders()});
    if(!rRes.ok) throw new Error('Renewals HTTP '+rRes.status);
    if(rRes.ok) {
      var rData = await rRes.json();
      // Include expired items AND items due within 30 days
      var in30neg = new Date(today); in30neg.setDate(today.getDate()-30); // always 30 days back for expired
      var due = (rData.records||[]).filter(function(r){
        var d = new Date(r.fields['Expiry Date']||'');
        return !isNaN(d) && d >= in30neg && d <= in30;
      }).sort(function(a,b){
        return new Date(a.fields['Expiry Date']) - new Date(b.fields['Expiry Date']);
      });
      if(renEl) {
        if(due.length===0) {
          renEl.innerHTML='<div style="padding:10px 14px;font-size:12px;color:var(--txt3)">None due or expired in the last/next 30 days</div>';
        } else {
          var totalCost = due.reduce(function(t,r){ return t+(parseFloat(r.fields['Estimated Cost'])||0); },0);
          var costHtml = totalCost>0
            ? '<div style="padding:6px 14px;background:var(--bg2);border-bottom:1px solid var(--bdr);font-size:11px;color:var(--txt2);display:flex;justify-content:space-between">'+
              '<span>Total Est. Cost</span><span style="font-family:monospace;font-weight:600;color:var(--amber)">AED '+totalCost.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})+'</span>'+
              '</div>' : '';
          hasAny = true;
          var windowLbl = windowDays===30?'30 days':windowDays===60?'60 days':'90 days';
          renEl.innerHTML = costHtml + due.map(function(r){
            var f=r.fields;
            var d=new Date(f['Expiry Date']); d.setHours(0,0,0,0);
            var days=Math.round((d-today)/(1000*60*60*24));
            var col = days<0?'var(--red)':days<=7?'var(--red)':days<=14?'var(--amber)':'var(--green)';
            var dayLbl = days<0?Math.abs(days)+'d ago':days+'d';
            var costStr = f['Estimated Cost'] ? ' · AED '+parseFloat(f['Estimated Cost']).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}) : '';
            return '<div style="display:flex;align-items:center;justify-content:space-between;padding:7px 14px;border-bottom:1px solid var(--bdr);cursor:pointer" data-ren-goto="'+r.id+'">' +
              '<div>' +
                '<div style="font-size:12px;font-weight:500;color:var(--txt)">'+e(f['Renewal Details']||'—')+'</div>' +
                '<div style="font-size:10px;color:var(--txt3);font-family:monospace">'+e(f['Entity']||'')+costStr+'</div>' +
              '</div>' +
              '<span style="font-size:11px;font-weight:600;font-family:monospace;color:'+col+';white-space:nowrap;margin-left:8px">'+dayLbl+'</span>' +
            '</div>';
          }).join('');
          // Click to open Renewals page and edit that record
          renEl.onclick = function(ev){
            var row = ev.target.closest('[data-ren-goto]');
            if(row) {
              var rid = row.dataset.renGoto;
              showRenewals();
              // Once loaded, open the modal for this record
              setTimeout(function(){
                if(renLoaded) showRenewalModal(rid);
              }, 600);
            }
          };
        }
      }
      // Store for dashboard use
      renRecords = rData.records||[];
      renLoaded  = true;
    }
  } catch(e2) { if(renEl) renEl.innerHTML='<div style="padding:10px 14px;font-size:12px;color:var(--red)">Error: '+e2.message+'</div>'; }

  // ── Birthdays in next 30 days ─────────────────────────────────
  try {
    var eRes = await fetch(WORKER_URL+'/employees?pageSize=100', {headers:getHeaders()});
    if(!eRes.ok) throw new Error('Employees HTTP '+eRes.status);
    if(eRes.ok) {
      var eData = await eRes.json();
      var thisYear = today.getFullYear();
      var bdays = [];
      (eData.records||[]).forEach(function(r){
        var dob = r.fields['Date of Birth'];
        if(!dob) return;
        var d = new Date(dob);
        // Check birthday this year
        var bday = new Date(thisYear, d.getMonth(), d.getDate());
        bday.setHours(0,0,0,0);
        if(bday < today) bday = new Date(thisYear+1, d.getMonth(), d.getDate());
        var days = Math.round((bday-today)/(1000*60*60*24));
        if(days >= 0 && days <= 30) {
          var age = bday.getFullYear() - d.getFullYear();
          bdays.push({name: r.fields['Employee Name']||'Unknown', days: days, date: bday, age: age, id: r.id});
        }
      });
      bdays.sort(function(a,b){return a.days-b.days;});
      if(bthEl) {
        if(bdays.length===0) {
          bthEl.innerHTML='<div style="padding:10px 14px;font-size:12px;color:var(--txt3)">No birthdays in the next 30 days</div>';
        } else {
          hasAny = true;
          bthEl.innerHTML = bdays.map(function(b){
            var col = b.days===0?'var(--amber)':b.days<=7?'var(--blue)':'var(--txt2)';
            var lbl = b.days===0?'Today!':b.days+'d';
            var dateStr = b.date.toLocaleDateString('en-GB',{day:'2-digit',month:'short'});
            var ageLbl = b.age ? ' · turning '+b.age : '';
            return '<div style="display:flex;align-items:center;justify-content:space-between;padding:7px 14px;border-bottom:1px solid var(--bdr);cursor:pointer" data-emp-goto="'+b.id+'">' +
              '<div>' +
                '<div style="font-size:12px;font-weight:500;color:var(--txt)">'+e(b.name)+'</div>' +
                '<div style="font-size:10px;color:var(--txt3);font-family:monospace">'+dateStr+ageLbl+'</div>' +
              '</div>' +
              '<span style="font-size:11px;font-weight:600;font-family:monospace;color:'+col+';white-space:nowrap;margin-left:8px">'+lbl+'</span>' +
            '</div>';
          }).join('');
          // Click to open employee (only Admin can see Employees)
          bthEl.onclick = function(ev){
            var row = ev.target.closest('[data-emp-goto]');
            if(row && userRole==='admin') {
              showEmployees();
              // scroll/highlight not needed — employees page shows all cards
            }
          };
        }
      }
      empRecords = eData.records||[];
      empLoaded  = true;

      // ── Passport expiry alerts (<250 days) ─────────────────────
      var alertGroup = document.getElementById('passport-alert-group');
      var alertList  = document.getElementById('passport-alert-list');
      if(alertGroup && alertList) {
        var today2 = new Date(); today2.setHours(0,0,0,0);
        var ppWarnings = (eData.records||[]).filter(function(r){
          var exp = r.fields['Passport Expiry'];
          if(!exp) return false;
          var d = new Date(exp); d.setHours(0,0,0,0);
          var days = Math.round((d-today2)/(1000*60*60*24));
          return days < 250;
        }).map(function(r){
          var exp = r.fields['Passport Expiry'];
          var d = new Date(exp); d.setHours(0,0,0,0);
          var days = Math.round((d-today2)/(1000*60*60*24));
          return {name: r.fields['Employee Name']||'Unknown', days: days, exp: exp};
        }).sort(function(a,b){ return a.days-b.days; });

        if(ppWarnings.length > 0) {
          alertList.innerHTML = ppWarnings.map(function(w){
            var col = w.days < 0 ? 'var(--red)' : w.days < 30 ? 'var(--red)' : w.days < 90 ? 'var(--amber)' : 'var(--txt2)';
            var lbl = w.days < 0 ? Math.abs(w.days)+'d expired' : w.days+'d left';
            var dateStr = new Date(w.exp).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
            return '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 16px;border-bottom:1px solid var(--red-bdr)">'+
              '<div>'+
                '<div style="font-size:12px;font-weight:500;color:var(--txt)">'+e(w.name)+'</div>'+
                '<div style="font-size:10px;color:var(--txt3);font-family:monospace">Passport expires '+dateStr+'</div>'+
              '</div>'+
              '<span style="font-size:12px;font-weight:700;font-family:monospace;color:'+col+';white-space:nowrap;margin-left:12px">'+lbl+'</span>'+
            '</div>';
          }).join('');
          alertGroup.style.display = 'block';
        } else {
          alertGroup.style.display = 'none';
        }
      }
    }
  } catch(e2) { if(bthEl) bthEl.innerHTML='<div style="padding:10px 14px;font-size:12px;color:var(--red)">Error: '+e2.message+'</div>'; }

  // Always show the upcoming group
  if(group) group.style.display='block';
}

// ================================================================
// COMPANY DOCS
// ================================================================
var cdocRecords = [];
var cdocLoaded  = false;
var cdocEditId  = null;

function showCompanyDocs() {
  sessionStorage.setItem('mbb_screen','company-docs');
  ['login-screen','home-screen','app','vendor-screen','dashboard-screen','contractors-screen',
   'suppliers-screen','quality-screen','employees-screen','renewals-screen','company-docs-screen','loading'].forEach(function(id){
    var el=document.getElementById(id); if(el) el.style.display='none';
  });
  document.getElementById('company-docs-screen').style.display='flex';
  if(!cdocLoaded) loadCompanyDocs();
  else renderCompanyDocs();
}

async function loadCompanyDocs() {
  var tbody = document.getElementById('cdoc-tbody');
  if(tbody) tbody.innerHTML = '<tr><td colspan="4" style="padding:40px;text-align:center;color:var(--txt3)">Loading…</td></tr>';
  try {
    var res  = await fetch(WORKER_URL+'/company-docs?pageSize=100', {headers:getHeaders()});
    if(!res.ok) throw new Error('HTTP '+res.status);
    var data = await res.json();
    cdocRecords = data.records||[];
    cdocLoaded  = true;
    renderCompanyDocs();
  } catch(err) {
    if(tbody) tbody.innerHTML = '<tr><td colspan="4" style="padding:20px;color:var(--red)">Failed to load: '+err.message+'</td></tr>';
  }
}

function renderCompanyDocs() {
  var tbody  = document.getElementById('cdoc-tbody');
  var cntEl  = document.getElementById('cdoc-count');
  if(!tbody) return;

  var searchQ   = ((document.getElementById('cdoc-search')||{}).value||'').toLowerCase().trim();
  var filterCo  = (document.getElementById('cdoc-filter-company')||{}).value||'';

  var recs = cdocRecords.filter(function(r){
    var f = r.fields;
    if(filterCo && f['Company'] !== filterCo) return false;
    if(searchQ && ![f['Document Name'],f['Company']].some(function(v){ return (v||'').toLowerCase().indexOf(searchQ)!==-1; })) return false;
    return true;
  });

  if(cntEl) cntEl.textContent = recs.length+' document'+(recs.length===1?'':'s');

  if(recs.length===0){
    tbody.innerHTML='<tr><td colspan="4" style="padding:40px;text-align:center;color:var(--txt3)">No documents found</td></tr>';
    return;
  }

  // Group by company
  var grouped = {};
  recs.forEach(function(r){
    var co = r.fields['Company']||'Other';
    if(!grouped[co]) grouped[co]=[];
    grouped[co].push(r);
  });

  var companies = Object.keys(grouped).sort();
  var rows = '';
  companies.forEach(function(co){
    grouped[co].forEach(function(r, i){
      var f = r.fields;
      rows += '<tr style="border-bottom:1px solid var(--bdr)" data-cdoc-id="'+r.id+'">'+
        '<td style="padding:8px 12px;vertical-align:top"><span style="font-size:11px;padding:2px 8px;border-radius:20px;font-family:monospace;font-weight:600;background:var(--blue-bg);color:var(--blue)">'+e(co)+'</span></td>'+
        '<td style="padding:8px 12px;font-weight:500;color:var(--txt)">'+e(f['Document Name']||'—')+'</td>'+
        '<td style="padding:8px 12px;text-align:center">'+
          (f['Document Link']
            ?'<a href="'+e(f['Document Link'])+'" target="_blank" rel="noopener" style="color:var(--blue);font-size:18px">&#128279;</a>'
            :'<span style="opacity:.2;font-size:18px">&#128279;</span>')+
        '</td>'+
        '<td style="padding:8px 12px;font-size:13px;color:var(--txt3);max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+e(f['Comments']||'')+'</td>'+
        '<td style="padding:8px 8px;text-align:right;white-space:nowrap">'+
          '<button class="icon-btn edit" data-cdoc-edit="'+r.id+'" style="opacity:1">'+IC_PENCIL+'</button>'+
          '<button class="icon-btn del" data-cdoc-del="'+r.id+'" style="opacity:1">'+IC_TRASH+'</button>'+
        '</td>'+
      '</tr>';
    });
  });
  tbody.innerHTML = rows;

  tbody.ondblclick = function(ev){
    var row=ev.target.closest('tr[data-cdoc-id]');
    if(row) showCompanyDocModal(row.dataset.cdocId);
  };
  tbody.onclick = function(ev){
    var eb=ev.target.closest('[data-cdoc-edit]');
    var db=ev.target.closest('[data-cdoc-del]');
    if(eb){ showCompanyDocModal(eb.dataset.cdocEdit); return; }
    if(db){ deleteCompanyDoc(db.dataset.cdocDel); return; }
  };
}

function showCompanyDocModal(recordId) {
  cdocEditId = recordId;
  var isNew = !recordId;
  document.getElementById('cdoc-modal-title').textContent = isNew ? 'Add Document' : 'Edit Document';
  var f = isNew ? {} : (cdocRecords.find(function(r){return r.id===recordId;})||{}).fields||{};
  document.getElementById('cdocf-company').value = f['Company']||'';
  document.getElementById('cdocf-name').value    = f['Document Name']||'';
  document.getElementById('cdocf-link').value     = f['Document Link']||'';
  document.getElementById('cdocf-comments').value = f['Comments']||'';
  document.getElementById('cdoc-modal').style.display='flex';
  setTimeout(function(){ document.getElementById('cdocf-name').focus(); },50);
}

function closeCompanyDocModal() {
  document.getElementById('cdoc-modal').style.display='none';
  cdocEditId=null;
}

async function saveCompanyDoc() {
  var company = document.getElementById('cdocf-company').value;
  var name    = document.getElementById('cdocf-name').value.trim();
  if(!company){ document.getElementById('cdocf-company').focus(); return; }
  if(!name)   { document.getElementById('cdocf-name').focus(); return; }
  var savedId = cdocEditId;
  closeCompanyDocModal();
  var link = document.getElementById('cdocf-link').value.trim();
  var fields = {'Company': company, 'Document Name': name};
  fields['Document Link'] = link || null;
  fields['Comments'] = document.getElementById('cdocf-comments').value.trim() || null;
  try {
    var url    = savedId ? WORKER_URL+'/company-docs/'+savedId : WORKER_URL+'/company-docs';
    var method = savedId ? 'PATCH' : 'POST';
    var res    = await fetch(url,{method:method,headers:getHeaders(),body:JSON.stringify({fields:fields})});
    var data   = await res.json();
    if(!res.ok) throw new Error((data.error&&data.error.message)||'HTTP '+res.status);
    if(savedId) {
      var rec=cdocRecords.find(function(r){return r.id===savedId;});
      if(rec) rec.fields=Object.assign(rec.fields,fields);
    } else {
      cdocRecords.push(data);
      cdocRecords.sort(function(a,b){return (a.fields['Company']||'').localeCompare(b.fields['Company']||'');});
    }
    renderCompanyDocs();
    toast((savedId?'Document updated':'Document added'),'ok');
  } catch(err){ toast('Failed: '+err.message,'err'); }
}

var pendingCdocDeleteId=null;

function deleteCompanyDoc(recordId) {
  pendingCdocDeleteId=recordId;
  var rec=cdocRecords.find(function(r){return r.id===recordId;});
  var lbl=rec?(rec.fields['Document Name']||'this document'):'this document';
  document.getElementById('confirm-title').textContent='Delete document?';
  document.getElementById('confirm-body').innerHTML='This will permanently delete <b>'+e(lbl)+'</b>.<br><br>This cannot be undone.';
  document.getElementById('confirm-modal').style.display='flex';
}

async function confirmDeleteCompanyDoc() {
  if(!pendingCdocDeleteId) return;
  var id=pendingCdocDeleteId; pendingCdocDeleteId=null;
  closeConfirm();
  try {
    var res=await fetch(WORKER_URL+'/company-docs/'+id,{method:'DELETE',headers:getHeaders()});
    if(!res.ok) throw new Error('HTTP '+res.status);
    cdocRecords=cdocRecords.filter(function(r){return r.id!==id;});
    renderCompanyDocs();
    toast('Document deleted','ok');
  } catch(err){ toast('Failed: '+err.message,'err'); }
}

// ================================================================
// QUOTE LETTER GENERATOR
// ================================================================
var QUOTE_TEMPLATE_B64 = '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';

function openQuoteFromRow(id) {
  currentEditId = id;
  try {
    showQuoteLetterModal();
  } catch(err) {
    toast('Error: '+err.message,'err');
    console.error(err);
  }
}

function showQuoteLetterModal() {
  var curItem = items.find(function(r){return r._id===currentEditId;}) || {};
  var proj = curItem.project || '';
  var srNo = curItem.sr_no || '';
  document.getElementById('ql-sr').textContent      = srNo;
  document.getElementById('ql-project').textContent = proj.substring(0,60)+(proj.length>60?'…':'');
  // Default date to today
  var today = new Date().toISOString().substring(0,10);
  document.getElementById('ql-date').value = today;
  // Default subject from project name
  document.getElementById('ql-subject').value = proj ? 'Quotation for '+proj.substring(0,80) : '';
  // Clear price schedule
  ['ql-desc1','ql-desc2','ql-desc3','ql-no1','ql-no2','ql-no3','ql-amt1','ql-amt2','ql-amt3','ql-total-words'].forEach(function(id){
    var el=document.getElementById(id); if(el){ el.value=''; delete el.dataset.userEdited; }
  });
  var td=document.getElementById('ql-total-display'); if(td) td.textContent='AED 0.00';
  document.getElementById('quote-letter-modal').style.display='flex';
  setTimeout(function(){document.getElementById('ql-company').focus();},50);
}

function closeQuoteLetterModal() {
  document.getElementById('quote-letter-modal').style.display='none';
}

function generateQuoteLetter() {
  var company  = document.getElementById('ql-company').value.trim();
  var contact  = document.getElementById('ql-contact').value.trim();
  var subject  = document.getElementById('ql-subject').value.trim();
  var dateTo   = document.getElementById('ql-date-to').value;
  var dateVal  = document.getElementById('ql-date').value;
  var payment  = document.getElementById('ql-payment').value.trim();
  var fat      = document.getElementById('ql-fat').value.trim();

  if(!company||!contact||!subject) {
    toast('Please fill in Company, Contact and Subject','err');
    return;
  }

  var curItem2 = items.find(function(r){return r._id===currentEditId;}) || {};
  var srNo    = curItem2.sr_no || '';
  var today   = dateVal ? new Date(dateVal).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
  var dateToFmt = dateTo  ? new Date(dateTo).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '';

  try {
    if(typeof PizZip === 'undefined') throw new Error('PizZip library not loaded — reload the page');
    // Load template zip
    var binary = atob(QUOTE_TEMPLATE_B64);
    var bytes  = new Uint8Array(binary.length);
    for(var i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i);
    var zip = new PizZip(bytes.buffer);

    // Direct XML string replacement — no library needed
    var docXml = zip.file('word/document.xml').asText();
    var a1=parseFloat(document.getElementById('ql-amt1').value)||0;
    var a2=parseFloat(document.getElementById('ql-amt2').value)||0;
    var a3=parseFloat(document.getElementById('ql-amt3').value)||0;
    var total=a1+a2+a3;
    var replacements = {
      'SR_NUMBER':          srNo,
      'DATE_TODAY':         today,
      'COMPANY_NAME':       company,
      'CONTACT':            contact,
      'SUBJECT':            subject,
      'DATE_TO':            dateToFmt,
      'PAYMENT_TERMS':      payment||'To be agreed',
      'FAT':                fat||'FAT shall be conducted at the manufacturer\'s premises',
      'DESC_1':             document.getElementById('ql-desc1').value.trim()||'—',
      'DESC_2':             document.getElementById('ql-desc2').value.trim()||'—',
      'DESC_3':             document.getElementById('ql-desc3').value.trim()||'—',
      'NO_1':               document.getElementById('ql-no1').value.trim()||'0',
      'NO_2':               document.getElementById('ql-no2').value.trim()||'0',
      'NO_3':               document.getElementById('ql-no3').value.trim()||'0',
      'AMOUNT_1':           fmtAEDcomma(a1),
      'AMOUNT_2':           fmtAEDcomma(a2),
      'AMOUNT_3':           fmtAEDcomma(a3),
      'TOTAL_AMOUNT':       fmtAEDcomma(total),
      'TOTAL_AMOUNT_WORDS': document.getElementById('ql-total-words').value.trim()||numberToWords(Math.round(total)),
    };
    Object.keys(replacements).forEach(function(key){
      var val = (replacements[key]||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      docXml = docXml.split('{{'+key+'}}').join(val);
    });
    zip.file('word/document.xml', docXml);

    // Download
    var out  = zip.generate({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
    var link = document.createElement('a');
    link.href = URL.createObjectURL(out);
    link.download = 'Quote_SR-'+srNo+'_'+company.replace(/[^a-zA-Z0-9]/g,'_').substring(0,30)+'.docx';
    link.click();
    toast('Quote letter downloaded — you can generate again','ok');
  } catch(err) {
    console.error(err);
    toast('Failed to generate: '+err.message,'err');
  }
}

// ── Export Report ─────────────────────────────────────────────────
function exportReport(){
  var now=new Date();
  var pad=function(n){return String(n).padStart(2,'0');};
  var dateStr=pad(now.getDate())+'.'+pad(now.getMonth()+1)+'.'+now.getFullYear();
  var timeStr=pad(now.getHours())+':'+pad(now.getMinutes());
  var filterDesc='All Enquiries';
  if(currentStatus==='ACTIVE_ONLY') filterDesc='Active Enquiries';
  else if(currentStatus!=='ALL') filterDesc=currentStatus+' Enquiries';
  var q=document.getElementById('search').value.trim();
  if(q) filterDesc+=' matching "'+q+'"';
  var fromV=document.getElementById('date-from').value;
  var toV=document.getElementById('date-to').value;
  if(fromV||toV) filterDesc+=' &middot; '+(fromV||'&hellip;')+' to '+(toV||'&hellip;');

  var tick=function(v){
    if(v==='Yes'||v==='✔') return '<span style="color:#065f46;font-weight:700">&#10004;</span>';
    if(v==='No'||v==='✖')  return '<span style="color:#9b1c1c">&#10006;</span>';
    return '<span style="color:#9ca3af">&ndash;</span>';
  };
  var statusColors={WON:['#d1fae5','#065f46'],LOST:['#fee2e2','#7f1d1d'],CANCELLED:['#f3f4f6','#374151'],'Under Process':['#dbeafe','#1e3a5f'],CLOSED:['#ede9fe','#4c1d95']};
  var counts={WON:0,LOST:0,'Under Process':0,CANCELLED:0,CLOSED:0};
  filtered.forEach(function(r){if(counts[r.status]!==undefined)counts[r.status]++;});

  var rows=filtered.map(function(r,i){
    var dlCell='';
    if(r.deadline){var bd=businessDaysUntil(r.deadline);var lbl=fmtDeadline(r.deadline);if(bd===-1)dlCell='<span style="background:#fde8e8;color:#9b1c1c;padding:2px 7px;border-radius:4px;font-size:10px;font-weight:600">&#9888; '+lbl+' (overdue)</span>';else if(bd!==null)dlCell='<span style="background:#fef3cd;color:#92400e;padding:2px 7px;border-radius:4px;font-size:10px;font-weight:600">&#9200; '+lbl+'</span>';}
    var sc=statusColors[r.status]||['#dbeafe','#1e3a5f'];
    var bg=i%2===0?'#fff':'#f9fafb';
    return '<tr style="background:'+bg+'">'+
      '<td style="padding:7px 10px;font-family:monospace;font-size:10px;color:#6b7280;border-bottom:1px solid #e5e7eb;white-space:nowrap">'+e(r.sr_no)+'</td>'+
      '<td style="padding:7px 10px;font-size:10px;color:#6b7280;border-bottom:1px solid #e5e7eb;white-space:nowrap">'+e(r.date)+'</td>'+
      '<td style="padding:7px 10px;font-size:11px;color:#111827;border-bottom:1px solid #e5e7eb;line-height:1.4;max-width:300px">'+e(r.project)+'</td>'+
      '<td style="padding:7px 10px;font-size:10px;color:#374151;border-bottom:1px solid #e5e7eb;white-space:nowrap">'+e(r.main_cont||'—')+'</td>'+
      '<td style="padding:7px 10px;font-size:10px;color:#374151;border-bottom:1px solid #e5e7eb;white-space:nowrap">'+e(r.client||'—')+'</td>'+
      '<td style="padding:7px 10px;font-size:10px;color:#374151;border-bottom:1px solid #e5e7eb;text-align:center;white-space:nowrap">'+e(r.rtu)+'</td>'+
      '<td style="padding:7px 10px;border-bottom:1px solid #e5e7eb;white-space:nowrap"><span style="background:'+sc[0]+';color:'+sc[1]+';padding:2px 8px;border-radius:20px;font-size:10px;font-weight:600">'+badgeLbl(r.status)+'</span></td>'+
      '<td style="padding:7px 10px;border-bottom:1px solid #e5e7eb;text-align:center">'+tick(r.active)+'</td>'+
      '<td style="padding:7px 10px;border-bottom:1px solid #e5e7eb">'+dlCell+'</td>'+
      '<td style="padding:7px 10px;font-size:10px;color:#374151;border-bottom:1px solid #e5e7eb;max-width:180px">'+e(r.last_update)+'</td>'+
    '</tr>';
  }).join('');

  var html='<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">'+
    '<title>mBELLAb Enquiry Log &mdash; '+filterDesc+'</title>'+
    '<style>@import url("https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400&display=swap");'+
    '*{box-sizing:border-box;margin:0;padding:0}body{font-family:"IBM Plex Sans",sans-serif;background:#fff;color:#111827;padding:32px 40px}'+
    '@media print{body{padding:16px 20px}.no-print{display:none}@page{margin:1cm;size:A4 landscape}}'+
    '.hdr{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:24px;padding-bottom:16px;border-bottom:3px solid #E36209}'+
    '.bname{font-size:18px;font-weight:600;color:#111827}.bref{font-family:"IBM Plex Mono",monospace;font-size:11px;color:#6b7280;letter-spacing:.4px}'+
    '.rmeta{text-align:right}.rtitle{font-size:14px;font-weight:600;color:#111827;margin-bottom:3px}.rdate{font-family:"IBM Plex Mono",monospace;font-size:11px;color:#6b7280}'+
    '.summary{display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap}'+
    '.sc{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:10px 14px;min-width:80px;text-align:center}'+
    '.sc .val{font-size:22px;font-weight:300;color:#111827;letter-spacing:-.5px;line-height:1}.sc .lbl{font-size:10px;text-transform:uppercase;letter-spacing:.8px;color:#9ca3af;margin-top:3px;font-family:"IBM Plex Mono",monospace}'+
    '.sc.won{border-color:#6ee7b7;background:#f0fdf4}.sc.won .val{color:#065f46}'+
    '.sc.lost{border-color:#fca5a5;background:#fff5f5}.sc.lost .val{color:#9b1c1c}'+
    '.sc.proc{border-color:#93c5fd;background:#eff6ff}.sc.proc .val{color:#1e40af}'+
    'table{width:100%;border-collapse:collapse}'+
    'thead th{background:#1c2128;color:#e5e7eb;font-weight:600;font-size:10px;padding:9px 10px;text-align:left;white-space:nowrap;letter-spacing:.3px}'+
    'thead th.ctr{text-align:center}'+
    'tfoot td{background:#f9fafb;font-size:10px;color:#6b7280;padding:8px 10px;border-top:2px solid #e5e7eb;font-style:italic}'+
    '.pbtn{background:#E36209;color:#fff;border:none;border-radius:6px;padding:9px 20px;font-size:13px;font-weight:600;cursor:pointer;font-family:"IBM Plex Sans",sans-serif;margin-right:10px}'+
    '</style></head><body>'+
    '<div class="hdr"><div><div class="bname">mBELLAb Operations Portal</div><div class="bref">Customer Enquiry Log &middot; mBb-FM-13</div></div>'+
    '<div class="rmeta"><div class="rtitle">'+filterDesc+'</div><div class="rdate">Generated '+dateStr+' at '+timeStr+' &middot; '+filtered.length+' record'+(filtered.length===1?'':'s')+'</div></div></div>'+
    '<div class="summary">'+
      '<div class="sc"><div class="val">'+filtered.length+'</div><div class="lbl">Total</div></div>'+
      '<div class="sc won"><div class="val">'+counts.WON+'</div><div class="lbl">Won</div></div>'+
      '<div class="sc proc"><div class="val">'+counts['Under Process']+'</div><div class="lbl">In Progress</div></div>'+
      '<div class="sc lost"><div class="val">'+counts.LOST+'</div><div class="lbl">Lost</div></div>'+
      '<div class="sc"><div class="val">'+counts.CANCELLED+'</div><div class="lbl">Cancelled</div></div>'+
      '<div class="sc"><div class="val">'+counts.CLOSED+'</div><div class="lbl">Closed</div></div>'+
    '</div>'+
    '<div class="no-print" style="margin-bottom:16px"><button class="pbtn" onclick="window.print()">&#128438; Print / Save as PDF</button>'+
    '<span style="font-size:12px;color:#6b7280">Choose &ldquo;Save as PDF&rdquo; as the printer destination.</span></div>'+
    '<table><thead><tr><th>SR No.</th><th>Date</th><th>Project Name</th><th>Main Contractor</th><th>Client</th><th class="ctr">RTU</th><th>Status</th><th class="ctr">Active</th><th>Deadline</th><th>Last Update</th></tr></thead>'+
    '<tbody>'+rows+'</tbody>'+
    '<tfoot><tr><td colspan="10">mBELLAb &middot; mBb-FM-13 &middot; Exported '+dateStr+' '+timeStr+'</td></tr></tfoot>'+
    '</table>'+
    '</tfoot></table>';

  var w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
}


// ================================================================
// PETTY CASH
// ================================================================
var pcRecords   = [];
var pcYear      = new Date().getFullYear();
var pcMonth     = new Date().getMonth(); // 0-indexed
var pcEditId    = null;

var PC_MONTHS = ['January','February','March','April','May','June',
                 'July','August','September','October','November','December'];

// ── Diagnostics ───────────────────────────────────────────────────
// Single source of truth — add a new entry here whenever a Worker route is added.
var DIAG_TABLES = [
  {name:'Power Solution Opportunities', url:'/'},
  {name:'Quotes',                        url:'/quotes'},
  {name:'Invoices',                      url:'/invoices'},
  {name:'Activity Log',                  url:'/activity'},
  {name:'Bidders',                       url:'/bidders'},
  {name:'Suppliers',                     url:'/suppliers'},
  {name:'Contractors',                   url:'/contractors'},
  {name:'Renewals',                      url:'/renewals'},
  {name:'Employees',                     url:'/employees'},
  {name:'Company Docs',                  url:'/company-docs'},
  {name:'Petty Cash',                    url:'/petty-cash'},
  {name:'Quality Objectives',            url:'/quality-objectives'},
  {name:'Objective Steps',               url:'/objective-steps'},
  {name:'Vendor Equipment Pricing',      url:'/vendor'},
  {name:'Passwords',                     url:'/passwords'},
  {name:'Leave Records',                 url:'/leave-records'},
  {name:'Annual Tickets',                url:'/annual-tickets'},
  {name:'Bank Holidays',                 url:'/bank-holidays'},
  {name:'Annual Entitlements',           url:'/annual-entitlements'},
  {name:'Leave Requests',                url:'/leave-requests'},
];

function showDiagnostics() {
  ['login-screen','app','vendor-screen','dashboard-screen','contractors-screen',
   'suppliers-screen','quality-screen','employees-screen','renewals-screen',
   'company-docs-screen','home-screen','petty-cash-screen','diag-screen'].forEach(function(id){
    var el=document.getElementById(id); if(el) el.style.display='none';
  });
  document.getElementById('diag-screen').style.display='flex';
  loadDiagnostics();
}

async function countTableFull(path) {
  var total=0, offset=null;
  do {
    var url = WORKER_URL+path+'?pageSize=100'+(offset?'&offset='+offset:'');
    try {
      var d = await fetch(url,{headers:getHeaders()}).then(function(r){return r.json();});
      total += (d.records||[]).length;
      offset = d.offset||null;
    } catch(e2){ offset=null; }
  } while(offset);
  return total;
}

async function loadDiagnostics() {
  var sessionEl = document.getElementById('diag-session');
  var body      = document.getElementById('diag-table-body');
  var bar       = document.getElementById('diag-bar');
  var tot       = document.getElementById('diag-total');
  var intEl     = document.getElementById('diag-integrity');
  var lvEl      = document.getElementById('diag-leave-health');
  var tsEl      = document.getElementById('diag-timestamp');
  if(!body) return;

  // ── 1. Session info (instant, no fetch) ─────────────────────────
  if(sessionEl) {
    var chipSt = 'display:inline-flex;align-items:center;gap:4px;background:var(--bg2);border:1px solid var(--bdr);border-radius:20px;padding:3px 10px;font-size:12px;margin:2px 3px';
    var memRows = [
      ['Opportunities', allRecords.length],
      ['Employees',     empRecords.length],
      ['Leave Records', elRecords.length],
      ['Entitlements',  elEntitlements.length],
      ['Bank Holidays', elHolidays.length],
      ['Annual Tickets',elTickets.length],
    ];
    sessionEl.innerHTML =
      '<div style="display:flex;flex-wrap:wrap;margin-bottom:10px">'+
        '<span style="'+chipSt+'">Version: <b>'+APP_VERSION+'</b></span>'+
        '<span style="'+chipSt+'">User: <b>'+e(userName||'—')+'</b></span>'+
        '<span style="'+chipSt+'">Role: <b>'+e(userRole||'—')+'</b></span>'+
      '</div>'+
      '<div style="font-size:11px;color:var(--txt3);margin-bottom:4px;font-weight:600;text-transform:uppercase;letter-spacing:.4px">In-memory counts</div>'+
      '<div style="display:flex;flex-wrap:wrap">'+
        memRows.map(function(m){
          var col = m[1]===0?'var(--txt3)':'var(--txt)';
          return '<span style="'+chipSt+';color:'+col+'">'+e(m[0])+': <b>'+m[1]+'</b></span>';
        }).join('')+
      '</div>';
  }

  // ── 2. Table row counts ──────────────────────────────────────────
  var rowSt = 'display:grid;grid-template-columns:1fr auto auto;align-items:center;gap:16px;padding:9px 16px;border-bottom:1px solid var(--bdr)';
  body.innerHTML =
    '<div style="'+rowSt+';background:var(--bg2);padding:7px 16px">'+
      '<span style="font-size:11px;font-weight:600;color:var(--txt3);text-transform:uppercase;letter-spacing:.5px">Table</span>'+
      '<span style="font-size:11px;font-weight:600;color:var(--txt3);text-transform:uppercase;letter-spacing:.5px;text-align:right">Rows</span>'+
      '<span style="font-size:11px;font-weight:600;color:var(--txt3);text-transform:uppercase;letter-spacing:.5px;text-align:right">Response</span>'+
    '</div>';
  if(bar){ bar.style.width='0%'; bar.style.background='var(--green)'; }
  if(tot) tot.textContent='';
  if(intEl) intEl.innerHTML='<div style="padding:12px 16px;color:var(--txt3);font-size:13px">Running after table counts…</div>';
  if(lvEl)  lvEl.innerHTML ='<div style="padding:12px 16px;color:var(--txt3);font-size:13px">Running after table counts…</div>';

  async function countTimed(baseUrl) {
    var count=0, offset=null, t0=performance.now();
    do {
      var u = offset ? baseUrl+'&offset='+offset : baseUrl;
      var d = await fetch(u,{headers:getHeaders()}).then(function(r){return r.json();}).catch(function(){return {};});
      count += (d.records||[]).length;
      offset = d.offset||null;
    } while(offset);
    return {count:count, ms:Math.round(performance.now()-t0)};
  }

  var grand = 0;
  for(var i=0; i<DIAG_TABLES.length; i++){
    var dt   = DIAG_TABLES[i];
    var base = dt.url==='/' ? WORKER_URL+'?pageSize=100' : WORKER_URL+dt.url+'?pageSize=100';
    var rid  = 'diag-row-'+i;
    body.innerHTML += '<div id="'+rid+'" style="'+rowSt+'">'+
      '<span style="font-size:13px;color:var(--txt)">'+e(dt.name)+'</span>'+
      '<span style="font-size:13px;color:var(--txt3);font-family:monospace;text-align:right">…</span>'+
      '<span style="font-size:12px;color:var(--txt3);font-family:monospace;text-align:right">…</span>'+
      '</div>';

    var res = await countTimed(base).catch(function(){return {count:0,ms:0};});
    grand += res.count;
    var rowEl = document.getElementById(rid);
    if(rowEl){
      var rc = res.count>=500?'var(--red)':res.count>=100?'var(--amber)':'var(--txt)';
      var mc = res.ms>=2000?'var(--red)':res.ms>=1000?'var(--amber)':'var(--txt3)';
      rowEl.innerHTML =
        '<span style="font-size:13px;color:var(--txt)">'+e(dt.name)+'</span>'+
        '<span style="font-size:14px;font-weight:700;color:'+rc+';font-family:monospace;text-align:right">'+res.count+'</span>'+
        '<span style="font-size:12px;color:'+mc+';font-family:monospace;text-align:right">'+res.ms+'ms</span>';
    }
    var pct = Math.round(grand/1000*100);
    if(bar){ bar.style.width=pct+'%'; bar.style.background=pct>=90?'var(--red)':pct>=75?'var(--amber)':'var(--green)'; }
    if(tot) tot.textContent=grand+' / 1,000 rows';
  }
  if(tsEl) tsEl.textContent='Last refreshed: '+new Date().toLocaleTimeString();

  // ── 3. Fetch data for checks (always fresh) ──────────────────────
  async function fetchAll(path) {
    var recs=[],offset=null;
    do {
      var u=WORKER_URL+path+'?pageSize=100'+(offset?'&offset='+offset:'');
      var d=await fetch(u,{headers:getHeaders()}).then(function(r){return r.json();}).catch(function(){return {};});
      recs=recs.concat(d.records||[]);
      offset=d.offset||null;
    } while(offset);
    return recs;
  }

  var diagEmps, diagLeave, diagEnts, diagTickets, diagHols;
  try {
    var fetched = await Promise.all([
      fetchAll('/employees'),
      fetchAll('/leave-records'),
      fetchAll('/annual-entitlements'),
      fetchAll('/annual-tickets'),
      fetchAll('/bank-holidays'),
    ]);
    diagEmps=fetched[0]; diagLeave=fetched[1]; diagEnts=fetched[2]; diagTickets=fetched[3]; diagHols=fetched[4];
  } catch(err) {
    if(intEl) intEl.innerHTML='<div style="padding:12px 16px;color:var(--red);font-size:13px">Failed to fetch data for checks.</div>';
    if(lvEl)  lvEl.innerHTML ='<div style="padding:12px 16px;color:var(--red);font-size:13px">Failed to fetch data for checks.</div>';
    return;
  }

  var empIds = {};
  diagEmps.forEach(function(e2){ empIds[e2.id]=e2; });

  // ── 4. Leave health ──────────────────────────────────────────────
  if(lvEl) {
    var today=new Date(); today.setHours(0,0,0,0);
    var noEnt=[], negBal=[];

    var activeEmps = diagEmps.filter(function(e2){ return e2.fields['Status']!=='Inactive'; });
    activeEmps.forEach(function(emp){
      // Find active entitlement
      var empEnts = diagEnts
        .filter(function(r){ return elEmpId(r.fields['Employee'])===emp.id; })
        .sort(function(a,b){ return new Date(b.fields['Period_Start'])-new Date(a.fields['Period_Start']); });
      var activeEnt = empEnts.find(function(r){
        var s=r.fields['Period_Start'], en=r.fields['Period_End'];
        if(!s||!en) return false;
        var from=new Date(s+'T00:00:00'), to=new Date(en+'T00:00:00');
        return today>=from && today<=to;
      })||null;

      if(!activeEnt){ noEnt.push(emp.fields['Employee Name']||emp.id); return; }

      var from = new Date(activeEnt.fields['Period_Start']+'T00:00:00');
      var to   = new Date(activeEnt.fields['Period_End']+'T00:00:00');
      var annualDays = parseFloat(activeEnt.fields['Days'])||0;
      var used=0;
      diagLeave.forEach(function(r){
        if(elEmpId(r.fields['Employee'])!==emp.id) return;
        if(r.fields['Type']!=='Annual') return;
        var d=r.fields['Start_Date']||r.fields['Date'];
        if(!d) return;
        var dt=new Date(d); dt.setHours(0,0,0,0);
        if(dt<from||dt>to) return;
        used+=parseFloat(r.fields['Days'])||0;
      });
      var bal=annualDays-used;
      if(bal<0) negBal.push({name:emp.fields['Employee Name']||emp.id, bal:bal});
    });

    var lv='';
    var okSt='display:flex;align-items:center;gap:8px;padding:10px 16px;border-bottom:1px solid var(--bdr);font-size:13px';

    // Summary row
    lv+='<div style="'+okSt+';background:var(--bg2)">'+
      '<span style="font-weight:600;color:var(--txt)">Active employees: '+activeEmps.length+'</span>'+
      '<span style="margin-left:auto;color:'+(noEnt.length?'var(--amber)':'var(--green)')+'">'+
        (activeEmps.length-noEnt.length)+' / '+activeEmps.length+' have active entitlement'+
      '</span></div>';

    if(noEnt.length===0 && negBal.length===0){
      lv+='<div style="'+okSt+';color:var(--green)">✓ All active employees have valid entitlements and positive leave balances</div>';
    } else {
      if(noEnt.length){
        lv+='<div style="'+okSt+';border-left:3px solid var(--amber)">'+
          '<div><div style="font-weight:600;color:var(--amber);margin-bottom:4px">No active entitlement period ('+noEnt.length+')</div>'+
          '<div style="color:var(--txt3);font-size:12px">'+noEnt.map(function(n){return e(n);}).join(', ')+'</div></div></div>';
      }
      if(negBal.length){
        lv+='<div style="'+okSt+';border-left:3px solid var(--red)">'+
          '<div><div style="font-weight:600;color:var(--red);margin-bottom:4px">Negative leave balance ('+negBal.length+')</div>'+
          '<div style="color:var(--txt3);font-size:12px">'+
            negBal.map(function(x){return e(x.name)+' ('+x.bal.toFixed(1)+' days)';}).join(', ')+
          '</div></div></div>';
      }
    }
    lvEl.innerHTML=lv;
  }

  // ── 5. Data integrity ────────────────────────────────────────────
  if(intEl) {
    var issues=[];

    // Leave records: unknown employee
    var orphanLeave=diagLeave.filter(function(r){
      var id=elEmpId(r.fields['Employee']);
      return !id||!empIds[id];
    });
    if(orphanLeave.length) issues.push({
      sev:'amber', label:'Leave records with no matching employee ('+orphanLeave.length+')',
      detail:orphanLeave.slice(0,5).map(function(r){return r.fields['Start_Date']||r.id;}).join(', ')+(orphanLeave.length>5?' …':'')
    });

    // Annual tickets: unknown employee
    var orphanTix=diagTickets.filter(function(r){
      var id=elEmpId(r.fields['Employee']);
      return !id||!empIds[id];
    });
    if(orphanTix.length) issues.push({
      sev:'amber', label:'Annual tickets with no matching employee ('+orphanTix.length+')',
      detail:orphanTix.slice(0,5).map(function(r){return r.fields['Period']||r.id;}).join(', ')+(orphanTix.length>5?' …':'')
    });

    // Bank holidays: missing date
    var missingDate=diagHols.filter(function(h){ return !h.fields['Date']; });
    if(missingDate.length) issues.push({
      sev:'amber', label:'Bank holidays missing a date ('+missingDate.length+')',
      detail:missingDate.map(function(h){return e(h.fields['Name']||h.id);}).join(', ')
    });

    // Bank holidays: duplicate dates
    var dateCounts={};
    diagHols.forEach(function(h){
      var d=h.fields['Date']; if(!d) return;
      dateCounts[d]=(dateCounts[d]||[]); dateCounts[d].push(h.fields['Name']||d);
    });
    var dupes=Object.keys(dateCounts).filter(function(d){return dateCounts[d].length>1;});
    if(dupes.length) issues.push({
      sev:'amber', label:'Duplicate bank holiday dates ('+dupes.length+')',
      detail:dupes.map(function(d){return d+' ('+dateCounts[d].join(', ')+')';}).join('; ')
    });

    // Entitlements: missing Period_Start or Period_End
    var badEnts=diagEnts.filter(function(r){ return !r.fields['Period_Start']||!r.fields['Period_End']; });
    if(badEnts.length) issues.push({
      sev:'amber', label:'Annual entitlements with missing start or end date ('+badEnts.length+')',
      detail:badEnts.map(function(r){return elEmpId(r.fields['Employee'])||r.id;}).join(', ')
    });

    var rowSt2='padding:10px 16px;border-bottom:1px solid var(--bdr);font-size:13px';
    var it='';
    if(!issues.length){
      it='<div style="'+rowSt2+';color:var(--green);display:flex;align-items:center;gap:8px">✓ No integrity issues found</div>';
    } else {
      issues.forEach(function(iss){
        var col=iss.sev==='red'?'var(--red)':'var(--amber)';
        it+='<div style="'+rowSt2+';border-left:3px solid '+col+'">'+
          '<div style="font-weight:600;color:'+col+';margin-bottom:3px">'+e(iss.label)+'</div>'+
          '<div style="font-size:12px;color:var(--txt3)">'+e(iss.detail)+'</div>'+
          '</div>';
      });
    }
    intEl.innerHTML=it;
  }
}


function showPettyCash() {
  ['login-screen','app','vendor-screen','dashboard-screen','contractors-screen',
   'suppliers-screen','quality-screen','employees-screen','renewals-screen',
   'company-docs-screen','home-screen','petty-cash-screen'].forEach(function(id){
    var el=document.getElementById(id); if(el) el.style.display='none';
  });
  document.getElementById('petty-cash-screen').style.display='flex';
  sessionStorage.setItem('mbb_screen','petty-cash');
  if(pcRecords.length===0) {
    loadPettyCash();
  } else {
    renderPettyCash();
  }
}

async function loadPettyCash() {
  try {
    var res = await fetch(WORKER_URL+'/petty-cash?pageSize=100',{headers:getHeaders()});
    if(!res.ok) throw new Error('HTTP '+res.status);
    var data = await res.json();
    pcRecords = (data && data.records) ? data.records : [];
    var offset = data ? data.offset : null;
    while(offset) {
      var r2 = await fetch(WORKER_URL+'/petty-cash?pageSize=100&offset='+offset,{headers:getHeaders()});
      var d2 = await r2.json();
      pcRecords = pcRecords.concat((d2 && d2.records) ? d2.records : []);
      offset = d2 ? d2.offset : null;
    }
    renderPettyCash();
  } catch(err) {
    var tbody=document.getElementById('pc-tbody');
    if(tbody) tbody.innerHTML='<div style="padding:20px;text-align:center;color:var(--red);font-size:13px">&#9888; Failed to load petty cash: '+err.message+' &nbsp;<button class="btn-ghost" style="font-size:12px" onclick="pcRecords=[];loadPettyCash()">Retry</button></div>';
  }
}

function pcPrevMonth() {
  pcMonth--;
  if(pcMonth < 0) { pcMonth = 11; pcYear--; }
  renderPettyCash();
}

function pcNextMonth() {
  pcMonth++;
  if(pcMonth > 11) { pcMonth = 0; pcYear++; }
  renderPettyCash();
}

function fmtPCAED(n) {
  return 'AED '+Math.abs(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
}

function renderPettyCash() {
    document.getElementById('pc-month-label').textContent = PC_MONTHS[pcMonth]+' '+pcYear;
    var openingBal=0;
    pcRecords.forEach(function(r){
      var d=r.fields['Date']?new Date(r.fields['Date']):null; if(!d) return;
      if(d.getFullYear()<pcYear||(d.getFullYear()===pcYear&&d.getMonth()<pcMonth)){
        var amt=parseFloat(r.fields['Amount'])||0;
        openingBal+=r.fields['Type']==='In'?amt:-amt;
      }
    });
    var monthRecs=pcRecords.filter(function(r){
      var d=r.fields['Date']?new Date(r.fields['Date']):null; if(!d) return false;
      return d.getFullYear()===pcYear&&d.getMonth()===pcMonth;
    }).sort(function(a,b){return new Date(a.fields['Date'])-new Date(b.fields['Date']);});
    var totalIn=0,totalOut=0;
    monthRecs.forEach(function(r){
      var amt=parseFloat(r.fields['Amount'])||0;
      if(r.fields['Type']==='In') totalIn+=amt; else totalOut+=amt;
    });
    var closing=openingBal+totalIn-totalOut;
    document.getElementById('pc-opening').textContent=fmtPCAED(openingBal);
    document.getElementById('pc-in').textContent=fmtPCAED(totalIn);
    document.getElementById('pc-out').textContent=fmtPCAED(totalOut);
    document.getElementById('pc-balance').textContent=fmtPCAED(closing);
    document.getElementById('pc-balance').style.color=closing>=0?'var(--amber)':'var(--red)';
  var S={
    row:  'display:flex;align-items:flex-start;border-bottom:1px solid var(--bdr);padding:2px 0',
    hdr:  'display:flex;align-items:center;border-bottom:2px solid var(--bdr2);padding:2px 0;background:var(--bg2)',
    date: 'flex:0 0 70px;padding:6px 8px;font-size:12px',
    vu:   'flex:0 0 55px;padding:6px 8px;font-size:12px;color:var(--txt3);font-family:monospace',
    desc: 'flex:1 1 0;min-width:0;padding:6px 8px',
    amt:  'flex:0 0 130px;padding:6px 8px;text-align:right;font-family:monospace;font-weight:600',
    act:  'flex:0 0 90px;padding:4px 6px;display:flex;gap:2px;justify-content:flex-end;align-items:center',
    lbl:  'font-size:10px;text-transform:uppercase;letter-spacing:.6px;color:var(--txt3);font-family:monospace;padding:6px 8px'
  };

  var html='';
  // Header
  html+='<div style="'+S.hdr+'">'+
    '<div style="flex:0 0 70px;'+S.lbl+'">Date</div>'+
    '<div style="flex:0 0 55px;'+S.lbl+'">VU No</div>'+
    '<div style="flex:1 1 0;'+S.lbl+'">Description / Notes</div>'+
    '<div style="flex:0 0 130px;'+S.lbl+';text-align:right">Amount (AED)</div>'+
    '<div style="flex:0 0 90px"></div>'+
    '</div>';
  // B/F row
  html+='<div style="'+S.row+';background:var(--bg2);font-style:italic">'+
    '<div style="'+S.date+';color:var(--txt3)">01 '+PC_MONTHS[pcMonth].substring(0,3)+'</div>'+
    '<div style="'+S.vu+';color:var(--txt3)">—</div>'+
    '<div style="'+S.desc+';color:var(--txt3)">Balance B/F</div>'+
    '<div style="'+S.amt+';color:var(--txt3)">'+fmtPCAED(openingBal)+'</div>'+
    '<div style="'+S.act+'"></div>'+
    '</div>';
  if(monthRecs.length===0){
    html+='<div style="padding:20px;text-align:center;color:var(--txt3)">No transactions this month</div>';
  }
  var canEdit=true; // Petty Cash is admin-only screen
  monthRecs.forEach(function(r){
    var f=r.fields;
    var d=new Date(f['Date']);
    var dateStr=String(d.getDate()).padStart(2,'0')+' '+PC_MONTHS[d.getMonth()].substring(0,3);
    var isIn=f['Type']==='In';
    var amt=parseFloat(f['Amount'])||0;
    var amtColor=isIn?'var(--green)':'var(--red)';
    var amtDisplay=(isIn?'+ ':'- ')+fmtPCAED(amt);
    html+='<div style="'+S.row+'" data-pc-row="'+r.id+'">'+
      '<div style="'+S.date+'">'+e(dateStr)+'</div>'+
      '<div style="'+S.vu+'">'+e(f['VU No']||'—')+'</div>'+
      '<div style="'+S.desc+'">'+
        '<div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+e(f['Description']||'')+'">'+e(f['Description']||'—')+'</div>'+
        (f['Notes']?'<div style="font-size:11px;color:var(--txt3);margin-top:2px;line-height:1.5;white-space:pre-wrap">'+e(f['Notes'])+'</div>':'')+
      '</div>'+
      '<div style="'+S.amt+';color:'+amtColor+'">'+amtDisplay+'</div>'+
      '<div style="flex:0 0 90px;padding:4px 6px;display:flex;align-items:center;justify-content:flex-end">'+'<button style="background:none;border:1px solid var(--bdr2);border-radius:4px;padding:3px 8px;cursor:pointer;font-size:11px;margin-right:4px" data-pc-edit="'+r.id+'">&#9998; Edit</button>'+'<button style="background:none;border:1px solid #f8514933;border-radius:4px;padding:3px 8px;cursor:pointer;font-size:11px;color:var(--red)" data-pc-del="'+r.id+'">&#128465;</button>'+'</div>'+
      '</div>';
  });

  var wrap=document.getElementById('pc-tbody');
  wrap.innerHTML=html;
  wrap.ondblclick=function(ev){
    var row=ev.target.closest('[data-pc-row]');
    if(row) openPCEdit(row.dataset.pcRow);
  };
  wrap.ondblclick=function(ev){var row=ev.target.closest('[data-pc-row]');if(row){openPCEdit(row.dataset.pcRow);}};
  wrap.onclick=function(ev){
    var eb=ev.target.closest('[data-pc-edit]');
    var db=ev.target.closest('[data-pc-del]');
    if(eb){openPCEdit(eb.dataset.pcEdit);return;}
    if(db){deletePCTransaction(db.dataset.pcDel);return;}
  };
}


function openPCModal() {
  pcEditId = null;
  document.getElementById('pc-modal-title').textContent = 'Add Transaction';
  document.getElementById('pc-type').value   = 'Out';
  document.getElementById('pc-date').value   = new Date().toISOString().substring(0,10);
  document.getElementById('pc-amount').value = '';
  document.getElementById('pc-vu').value     = '';
  document.getElementById('pc-desc').value   = '';
  document.getElementById('pc-notes').value  = '';
  document.getElementById('pc-modal').style.display = 'flex';
  var delbtn=document.getElementById('pc-modal-delete'); if(delbtn) delbtn.style.display='none';
  setTimeout(function(){ document.getElementById('pc-amount').focus(); }, 50);
}

function openPCEdit(id) {
  var rec = pcRecords.find(function(r){ return r.id===id; });
  if(!rec) return;
  pcEditId = id;
  var f = rec.fields;
  document.getElementById('pc-modal-title').textContent = 'Edit Transaction';
  document.getElementById('pc-type').value   = f['Type']||'Out';
  document.getElementById('pc-date').value   = f['Date']||'';
  document.getElementById('pc-amount').value = f['Amount']||'';
  document.getElementById('pc-vu').value     = f['VU No']||'';
  document.getElementById('pc-desc').value   = f['Description']||'';
  document.getElementById('pc-notes').value  = f['Notes']||'';
  document.getElementById('pc-modal').style.display = 'flex';
  var delbtn=document.getElementById('pc-modal-delete'); if(delbtn) delbtn.style.display='inline-block';
}


function pcModalKeydown(ev) {
  if(ev.key==='Enter' && !ev.shiftKey && !ev.ctrlKey) {
    var modal = document.getElementById('pc-modal');
    if(modal && modal.style.display!=='none') {
      ev.preventDefault();
      savePCTransaction();
    }
  }
}
function closePCModal() {
  document.getElementById('pc-modal').style.display = 'none';
}

async function savePCTransaction() {
  var type   = document.getElementById('pc-type').value;
  var date   = document.getElementById('pc-date').value;
  var amount = parseFloat(document.getElementById('pc-amount').value);
  var vu     = document.getElementById('pc-vu').value.trim();
  var desc   = document.getElementById('pc-desc').value.trim();
  var notes  = document.getElementById('pc-notes').value.trim();

  if(!date)     { toast('Please enter a date','err'); return; }
  if(!amount || amount <= 0) { toast('Please enter a valid amount','err'); return; }
  if(!desc)     { toast('Please enter a description','err'); return; }

  var fields = {
    'Type':        type,
    'Date':        date,
    'Amount':      amount,
    'Description': desc,
  };
  fields['VU No'] = vu || null;
  fields['Notes'] = notes || null;

  closePCModal();
  try {
    var url    = pcEditId ? WORKER_URL+'/petty-cash/'+pcEditId : WORKER_URL+'/petty-cash';
    var method = pcEditId ? 'PATCH' : 'POST';
    var res    = await fetch(url, {method, headers:getHeaders(), body:JSON.stringify({fields})});
    if(!res.ok) throw new Error('HTTP '+res.status);
    var data = await res.json();
    if(pcEditId) {
      pcRecords = pcRecords.map(function(r){ return r.id===pcEditId ? data : r; });
    } else {
      pcRecords.push(data);
    }
    pcEditId = null;
    renderPettyCash();
    toast(pcEditId ? 'Transaction updated' : 'Transaction saved','ok');
  } catch(err) { toast('Save failed: '+err.message,'err'); }
}

var pendingPCDeleteId = null;

function deletePCTransaction(id) {
  pendingPCDeleteId = id;
  var rec = pcRecords.find(function(r){ return r.id===id; });
  var desc = rec ? (rec.fields['Description']||'this transaction') : 'this transaction';
  document.getElementById('confirm-title').textContent = 'Delete transaction?';
  document.getElementById('confirm-body').innerHTML = 'This will permanently delete <b>'+e(desc)+'</b>. This cannot be undone.';
  document.getElementById('confirm-modal').style.display = 'flex';
}

async function confirmDeletePCTransaction() {
  if(!pendingPCDeleteId) return;
  var id = pendingPCDeleteId; pendingPCDeleteId = null;
  closeConfirm();
  try {
    var res = await fetch(WORKER_URL+'/petty-cash/'+id, {method:'DELETE', headers:getHeaders()});
    if(!res.ok) throw new Error('HTTP '+res.status);
    pcRecords = pcRecords.filter(function(r){ return r.id!==id; });
    renderPettyCash();
    toast('Transaction deleted','ok');
  } catch(err) { toast('Delete failed: '+err.message,'err'); }
}

var pwdRecords=[],pwdLoaded=false,pwdEditId=null;

function showPasswords(){
  if(userRole!=='admin'){toast('Access restricted','err');return;}
  if(userRole!=='admin'){toast('Access restricted','err');return;}
  sessionStorage.setItem('mbb_screen','passwords');
  ['login-screen','home-screen','app','vendor-screen','dashboard-screen','contractors-screen',
   'suppliers-screen','quality-screen','employees-screen','renewals-screen','company-docs-screen',
   'loading','petty-cash-screen','passwords-screen'].forEach(function(id){
    var el=document.getElementById(id);if(el)el.style.display='none';
  });
  document.getElementById('passwords-screen').style.display='flex';
  if(!pwdLoaded)loadPasswords();else renderPasswords();
}

async function loadPasswords(){
  var tbody=document.getElementById('pwd-tbody');
  if(tbody)tbody.innerHTML='<tr><td colspan="7" style="padding:40px;text-align:center;color:var(--txt3)">Loading…</td></tr>';
  try{
    var res=await fetch(WORKER_URL+'/passwords?pageSize=100',{headers:getHeaders()});
    if(!res.ok)throw new Error('HTTP '+res.status);
    var data=await res.json();
    pwdRecords=(data.records||[]).sort(function(a,b){return(a.fields['Entity']||'').localeCompare(b.fields['Entity']||'');});
    pwdLoaded=true;renderPasswords();
  }catch(err){
    var errEl=document.getElementById('pwd-err');
    if(errEl){errEl.textContent='Failed to load: '+err.message;errEl.style.display='block';}
  }
}

function renderPasswords(){
  var sel=document.getElementById('pwd-filter-entity');
  if(sel){var ents=[...new Set(pwdRecords.map(function(r){return r.fields['Entity']||'';}).filter(Boolean))].sort();var cv=sel.value;sel.innerHTML='<option value="">All Entities</option>'+ents.map(function(ent){return '<option value="'+e(ent)+'"'+(ent===cv?' selected':'')+'>'+e(ent)+'</option>';}).join('');}
  var ef=(document.getElementById('pwd-filter-entity')||{value:''}).value||'';
  var sq=((document.getElementById('pwd-search')||{value:''}).value||'').toLowerCase().trim();
  var recs=pwdRecords.filter(function(r){var f=r.fields;if(ef&&(f['Entity']||'')!==ef)return false;if(sq){var all=[f['Entity'],f['Name'],f['Website'],f['Username'],f['Comments']].join(' ').toLowerCase();if(all.indexOf(sq)===-1)return false;}return true;});
  var tbody=document.getElementById('pwd-tbody');
  if(!tbody)return;
  if(recs.length===0){tbody.innerHTML='<tr><td colspan="7" style="padding:40px;text-align:center;color:var(--txt3)">'+(sq||ef?'No matching records.':'No records yet.')+'</td></tr>';return;}
  tbody.innerHTML=recs.map(function(r){
    var f=r.fields;var masked=f['Password']?'•'.repeat(Math.min((f['Password']||'').length,12)):'—';
    return '<tr data-pwd-id="'+r.id+'">'
      +'<td style="font-weight:500">'+e(f['Entity']||'—')+'</td>'
      +'<td>'+e(f['Name']||'—')+'</td>'
      +'<td>'+(f['Website']?'<a href="'+e(f['Website'])+'" target="_blank" rel="noopener" style="color:var(--blue);font-size:12px">'+e((f['Website']||'').replace(/^https?:\/\//,'').replace(/\/.*$/,''))+'</a>':'—')+'</td>'
      +'<td style="font-family:monospace;font-size:12px">'+e(f['Username']||'—')+'</td>'
      +'<td style="white-space:nowrap">'+(f['Password']?'<span id="pmask-'+r.id+'" style="font-family:monospace;letter-spacing:1px">'+masked+'</span> <button class="btn-sm" style="padding:1px 7px;font-size:10px" data-show-id="'+r.id+'">Show</button>':'—')+'</td>'
      +'<td style="font-size:12px;color:var(--txt2);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+e(f['Comments']||'')+'">'+e(f['Comments']||'')+'</td>'
      +'<td style="text-align:right;white-space:nowrap"><button class="icon-btn edit" data-pwd-edit="'+r.id+'">'+IC_PENCIL+'</button><button class="icon-btn del" data-pwd-del="'+r.id+'">'+IC_TRASH+'</button></td></tr>';
  }).join('');
  tbody.ondblclick=function(ev){var row=ev.target.closest('tr[data-pwd-id]');if(row)showPasswordModal(row.dataset.pwdId);};
  tbody.onclick=function(ev){
    var sb=ev.target.closest('[data-show-id]');
    if(sb){var id=sb.dataset.showId;var rec=pwdRecords.find(function(r){return r.id===id;});var span=document.getElementById('pmask-'+id);if(rec&&span){if(sb.textContent==='Show'){span.textContent=rec.fields['Password']||'';sb.textContent='Hide';}else{span.textContent='•'.repeat(Math.min((rec.fields['Password']||'').length,12));sb.textContent='Show';}}return;}
    var eb=ev.target.closest('[data-pwd-edit]');var db=ev.target.closest('[data-pwd-del]');
    if(eb){showPasswordModal(eb.dataset.pwdEdit);return;}
    if(db){deletePassword(db.dataset.pwdDel);return;}
  };
}

function togglePwdVis(id,pwd,btn){
  var span=document.getElementById('pmask-'+id);
  if(!span)return;
  if(btn.textContent==='Show'){span.textContent=pwd;btn.textContent='Hide';}
  else{span.textContent='•'.repeat(Math.min(pwd.length,12));btn.textContent='Show';}
}

function showPasswordModal(recordId){
  pwdEditId=recordId;
  var isNew=!recordId;
  document.getElementById('pwd-modal-title').textContent=isNew?'Add Password':'Edit Password';
  var f=isNew?{}:(pwdRecords.find(function(r){return r.id===recordId;})||{}).fields||{};
  document.getElementById('pwdf-entity').value  =f['Entity']||'';
  document.getElementById('pwdf-name').value    =f['Name']||'';
  document.getElementById('pwdf-website').value =f['Website']||'';
  document.getElementById('pwdf-username').value=f['Username']||'';
  var pi=document.getElementById('pwdf-password');
  pi.value=f['Password']||'';pi.type='password';
  var sb=pi.nextElementSibling;if(sb)sb.textContent='Show';
  document.getElementById('pwdf-comments').value=f['Comments']||'';
  var db=document.getElementById('pwd-modal-delete');
  if(db)db.style.display=isNew?'none':'inline-block';
  document.getElementById('pwd-modal').style.display='flex';
  setTimeout(function(){document.getElementById('pwdf-entity').focus();},50);
}

function closePwdModal(){document.getElementById('pwd-modal').style.display='none';}

async function savePassword(){
  var entity  =document.getElementById('pwdf-entity').value.trim();
  var name    =document.getElementById('pwdf-name').value.trim();
  var website =document.getElementById('pwdf-website').value.trim();
  var username=document.getElementById('pwdf-username').value.trim();
  var password=document.getElementById('pwdf-password').value;
  var comments=document.getElementById('pwdf-comments').value.trim();
  if(!entity&&!name){toast('Please enter at least an Entity or Name','err');return;}
  var fields={
    'Entity':  entity||null,
    'Name':    name||null,
    'Website': website||null,
    'Username':username||null,
    'Password':password||null,
    'Comments':comments||null
  };
  var url=pwdEditId?WORKER_URL+'/passwords/'+pwdEditId:WORKER_URL+'/passwords';
  var method=pwdEditId?'PATCH':'POST';
  setSave(true,'pwd-save-ind','pwd-save-txt');
  try{
    var res=await fetch(url,{method:method,headers:getHeaders(),body:JSON.stringify({fields:fields})});
    if(!res.ok)throw new Error('HTTP '+res.status);
    var data=await res.json();
    if(pwdEditId){
      var idx=pwdRecords.findIndex(function(r){return r.id===pwdEditId;});
      if(idx!==-1)pwdRecords[idx]=data;
    }else{
      pwdRecords.push(data);
      pwdRecords.sort(function(a,b){return(a.fields['Entity']||'').localeCompare(b.fields['Entity']||'');});
    }
    closePwdModal();renderPasswords();
    setSave(false,'pwd-save-ind','pwd-save-txt');
    toast(pwdEditId?'Updated':'Saved','ok');
  }catch(err){setSave(false,'pwd-save-ind','pwd-save-txt');toast('Save failed: '+err.message,'err');}
}

async function deletePassword(id){
  if(!confirm('Delete this password record?'))return;
  try{
    var res=await fetch(WORKER_URL+'/passwords/'+id,{method:'DELETE',headers:getHeaders()});
    if(!res.ok)throw new Error('HTTP '+res.status);
    pwdRecords=pwdRecords.filter(function(r){return r.id!==id;});
    renderPasswords();toast('Deleted','ok');
  }catch(err){toast('Delete failed: '+err.message,'err');}
}


// ── EMPLOYEE LEAVE MODULE ─────────────────────────────────────────
var elRecords = [], elTickets = [], elHolidays = [], elEntitlements = [], elLoaded = false;
var leaveRequests = [], lrFilter = 'pending', lrRejectId = null;
var elCurrentEmpId = null, elCurrentEditId = null, elHolEditId = null, elActiveTab = 'all';
var elHolYear = new Date().getFullYear();
var elPeriodOffset = 0;  // 0 = current period, -1 = previous

function showEmployeeLeave() {
  if(userRole !== 'admin'){ toast('Access restricted','err'); return; }
  elLoaded = false;
  ['login-screen','app','vendor-screen','dashboard-screen','contractors-screen',
   'suppliers-screen','quality-screen','employees-screen','renewals-screen',
   'company-docs-screen','home-screen','petty-cash-screen','diag-screen',
   'passwords-screen','employees-leave-screen','leave-requests-screen'
  ].forEach(function(id){ var el=document.getElementById(id); if(el) el.style.display='none'; });
  document.getElementById('employees-leave-screen').style.display='flex';
  sessionStorage.setItem('mbb_screen','employees-leave');
  if(!elLoaded) loadLeaveData();
}

// ── LEAVE REQUESTS ──────────────────────────────────────────────────────────────

function showLeaveRequests() {
  ['login-screen','app','vendor-screen','dashboard-screen','contractors-screen',
   'suppliers-screen','quality-screen','employees-screen','renewals-screen',
   'company-docs-screen','home-screen','petty-cash-screen','diag-screen',
   'passwords-screen','employees-leave-screen','leave-requests-screen'
  ].forEach(function(id){ var el=document.getElementById(id); if(el) el.style.display='none'; });
  document.getElementById('leave-requests-screen').style.display='flex';
  sessionStorage.setItem('mbb_screen','leave-requests');
  loadLeaveRequests();
}

async function loadLeaveRequests() {
  var body = document.getElementById('lr-body');
  if(body) body.innerHTML = '<div style="padding:32px;text-align:center;color:var(--txt3)">Loading…</div>';
  try {
    // Ensure employee records are available (non-admins never load the Employees screen)
    if(!empRecords.length) {
      var eRes = await fetch(WORKER_URL+'/employees?pageSize=100', {headers:getHeaders()});
      if(eRes.ok){ var eData=await eRes.json(); empRecords=eData.records||[]; }
    }
    var res = await fetch(WORKER_URL+'/leave-requests?pageSize=100&sort[0][field]=Submission_Date&sort[0][direction]=desc', {headers:getHeaders()});
    if(!res.ok) throw new Error('HTTP '+res.status);
    var data = await res.json();
    leaveRequests = data.records||[];
    while(data.offset){
      var r2 = await fetch(WORKER_URL+'/leave-requests?pageSize=100&offset='+data.offset, {headers:getHeaders()});
      data = await r2.json();
      leaveRequests = leaveRequests.concat(data.records||[]);
    }
    renderLeaveRequests();
    updateLRBadge();
  } catch(err) {
    if(body) body.innerHTML = '<div style="padding:32px;text-align:center;color:var(--red)">Error: '+e(err.message)+'</div>';
  }
}

function updateLRBadge() {
  var badge = document.getElementById('lr-pending-badge');
  var n = leaveRequests.filter(function(r){ return (r.fields['Status']||'Pending')==='Pending'; }).length;
  if(badge){ badge.textContent=n; badge.style.display=n>0?'':'none'; }
}

function setLRFilter(f) {
  lrFilter = f;
  ['all','pending','approved','rejected'].forEach(function(t){
    var el=document.getElementById('lr-tab-'+t);
    if(el) el.className='el-tab'+(t===f?' el-tab-active':'');
  });
  renderLeaveRequests();
}

function getEmpNameById(id) {
  if(!id) return '—';
  var emp = empRecords.find(function(emp2){ return emp2.id===id; });
  return emp ? (emp.fields['Employee Name']||emp.fields['Name']||id) : id;
}

function renderLeaveRequests() {
  var body = document.getElementById('lr-body');
  if(!body) return;
  var filtered = leaveRequests.filter(function(r){
    if(lrFilter==='all') return true;
    return (r.fields['Status']||'Pending').toLowerCase()===lrFilter;
  });
  if(!filtered.length){
    body.innerHTML='<div style="padding:32px;text-align:center;color:var(--txt3)">No '+lrFilter+' requests</div>';
    return;
  }
  var rowSt='display:grid;grid-template-columns:1fr 130px 190px 60px 90px auto;align-items:center;gap:12px;padding:10px 16px;border-bottom:1px solid var(--bdr)';
  var html='<div style="'+rowSt.replace('padding:10px 16px','padding:7px 16px')+';background:var(--bg2)">'+
    '<span style="font-size:11px;font-weight:600;color:var(--txt3);text-transform:uppercase;letter-spacing:.5px">Employee</span>'+
    '<span style="font-size:11px;font-weight:600;color:var(--txt3);text-transform:uppercase;letter-spacing:.5px">Type</span>'+
    '<span style="font-size:11px;font-weight:600;color:var(--txt3);text-transform:uppercase;letter-spacing:.5px">Dates</span>'+
    '<span style="font-size:11px;font-weight:600;color:var(--txt3);text-transform:uppercase;letter-spacing:.5px;text-align:center">Days</span>'+
    '<span style="font-size:11px;font-weight:600;color:var(--txt3);text-transform:uppercase;letter-spacing:.5px">Status</span>'+
    '<span></span></div>';
  filtered.forEach(function(r){
    var f=r.fields;
    var status=f['Status']||'Pending';
    var sc=status==='Approved'?'var(--green)':status==='Rejected'?'var(--red)':'var(--amber)';
    var empName=getEmpNameById(elEmpId(f['Employee']));
    var d1=f['Date_Out']?elFmtDate(f['Date_Out']):'?';
    var d2=f['Date_In']&&f['Date_In']!==f['Date_Out']?' → '+elFmtDate(f['Date_In']):'';
    html+='<div style="'+rowSt+'">'+
      '<div><div style="font-size:13px;font-weight:500">'+e(empName)+'</div>'+
        '<div style="font-size:11px;color:var(--txt3)">'+elFmtDate(f['Submission_Date'])+'</div></div>'+
      '<span style="font-size:13px">'+e(f['Leave_Type']||'—')+'</span>'+
      '<span style="font-size:12px;white-space:nowrap">'+d1+d2+'</span>'+
      '<span style="font-size:14px;font-weight:700;font-family:monospace;text-align:center">'+e(String(f['Days']||'—'))+'</span>'+
      '<span style="font-size:12px;font-weight:600;color:'+sc+'">'+e(status)+'</span>'+
      '<div style="display:flex;gap:6px;flex-wrap:wrap">'+
        (status==='Pending' && userRole==='admin'?
          '<button onclick="approveRequest(\''+r.id+'\')" class="btn-ghost" style="font-size:12px;color:var(--green);border-color:var(--green-bdr)">✓ Approve</button>'+
          '<button onclick="openRejectModal(\''+r.id+'\')" class="btn-ghost" style="font-size:12px;color:var(--red)">✗ Reject</button>':'')+
        '<button onclick="printLeaveRequest(\''+r.id+'\')" class="btn-ghost" style="font-size:12px">Print</button>'+
      '</div></div>';
  });
  body.innerHTML=html;
}

async function approveRequest(id) {
  var req=leaveRequests.find(function(r){ return r.id===id; });
  if(!req) return;
  var f=req.fields;
  try {
    // Create the leave record
    var leaveFields={Employee:[elEmpId(f['Employee'])],Type:f['Leave_Type'],
      Start_Date:f['Date_Out'],End_Date:f['Date_In'],Days:f['Days']};
    if(f['Detail']) leaveFields.Notes=f['Detail'];
    var lRes=await fetch(WORKER_URL+'/leave-records',{method:'POST',headers:getHeaders(),
      body:JSON.stringify({records:[{fields:leaveFields}]})});
    if(!lRes.ok) throw new Error('Failed to create leave record: HTTP '+lRes.status);
    var lData=await lRes.json();
    if(lData.records) elRecords=elRecords.concat(lData.records);
    // Update request status
    var today=new Date().toISOString().split('T')[0];
    var pRes=await fetch(WORKER_URL+'/leave-requests/'+id,{method:'PATCH',headers:getHeaders(),
      body:JSON.stringify({fields:{Status:'Approved',Approved_By:userName,Approval_Date:today}})});
    if(!pRes.ok) throw new Error('Failed to update request: HTTP '+pRes.status);
    var pData=await pRes.json();
    leaveRequests=leaveRequests.map(function(r){ return r.id===id?pData:r; });
    toast('Approved — leave record created','ok');
    renderLeaveRequests(); updateLRBadge();
  } catch(err){ toast('Error: '+err.message,'err'); }
}

function openRejectModal(id) {
  lrRejectId=id;
  document.getElementById('lr-reject-notes').value='';
  document.getElementById('lr-reject-modal').style.display='flex';
}

async function rejectRequest() {
  if(!lrRejectId) return;
  var notes=document.getElementById('lr-reject-notes').value.trim();
  try {
    var res=await fetch(WORKER_URL+'/leave-requests/'+lrRejectId,{method:'PATCH',headers:getHeaders(),
      body:JSON.stringify({fields:{Status:'Rejected',Rejection_Notes:notes,Rejected_By:userName,Rejection_Date:new Date().toISOString().split('T')[0]}})});
    if(!res.ok) throw new Error('HTTP '+res.status);
    var data=await res.json();
    leaveRequests=leaveRequests.map(function(r){ return r.id===lrRejectId?data:r; });
    document.getElementById('lr-reject-modal').style.display='none';
    toast('Request rejected','ok');
    renderLeaveRequests(); updateLRBadge();
  } catch(err){ toast('Error: '+err.message,'err'); }
}

async function openLeaveRequestForm(empId) {
  var isAdmin = userRole === 'admin';
  var empSel  = document.getElementById('lr-form-employee');
  var empRow  = document.getElementById('lr-form-employee-row');

  // Ensure employees are loaded
  if(!empRecords.length) {
    try {
      var eRes = await fetch(WORKER_URL+'/employees?pageSize=100', {headers:getHeaders()});
      if(eRes.ok){ var eData=await eRes.json(); empRecords=eData.records||[]; }
    } catch(err){ toast('Could not load employee list','err'); return; }
  }

  // For non-admins, auto-detect employee from Username field
  if(!isAdmin) {
    var matched = empRecords.find(function(e2){
      return (e2.fields['Username']||'').toLowerCase() === (currentUser.username||'').toLowerCase();
    });
    if(matched) {
      empId = matched.id;
    } else {
      toast('Your account is not linked to an employee record — ask an admin to set your Username field.','err');
      return;
    }
  }

  // Show/hide employee row based on role
  if(empRow) empRow.style.display = isAdmin ? '' : 'none';

  if(empSel){
    if(isAdmin){
      var active=empRecords.filter(function(e2){ return e2.fields['Status']!=='Inactive'; });
      empSel.innerHTML='<option value="">— Select Employee —</option>'+
        active.map(function(e2){
          var n=e2.fields['Employee Name']||e2.fields['Name']||'Unknown';
          return '<option value="'+e2.id+'"'+(e2.id===empId?' selected':'')+'>'+n+'</option>';
        }).join('');
    } else {
      // Store the resolved empId in the hidden select
      empSel.innerHTML='<option value="'+empId+'" selected></option>';
    }
  }

  document.getElementById('lr-form-submitted').value=new Date().toISOString().split('T')[0];
  document.getElementById('lr-form-type').value='Annual';
  document.getElementById('lr-form-date-out').value='';
  document.getElementById('lr-form-date-in').value='';
  document.getElementById('lr-form-detail').value='';
  document.getElementById('lr-form-coverage').value='';
  var prev=document.getElementById('lr-days-preview'); if(prev) prev.style.display='none';
  var btn=document.getElementById('lr-form-submit-btn'); if(btn){btn.disabled=false;btn.textContent='Submit Request';}
  document.getElementById('lr-form-modal').style.display='flex';
}

function lrUpdateDays() {
  var dateOut = document.getElementById('lr-form-date-out').value;
  var dateIn  = document.getElementById('lr-form-date-in').value;
  var prev    = document.getElementById('lr-days-preview');
  if(!prev) return;
  if(!dateOut || !dateIn) { prev.style.display='none'; return; }
  if(new Date(dateIn) < new Date(dateOut)) {
    prev.style.display=''; prev.textContent='Date In must be on or after Date Out.'; prev.style.color='var(--red)'; return;
  }
  var days = elWorkingDays(dateOut, dateIn).length;
  prev.style.display='';
  prev.style.color='var(--txt3)';
  prev.textContent = days + ' working day'+(days!==1?'s':'')+' (weekends & bank holidays excluded)';
}

async function saveLeaveRequest() {
  var btn=document.getElementById('lr-form-submit-btn');
  if(btn && btn.disabled) return;
  var empId=document.getElementById('lr-form-employee').value;
  var type=document.getElementById('lr-form-type').value;
  var dateOut=document.getElementById('lr-form-date-out').value;
  var dateIn=document.getElementById('lr-form-date-in').value||dateOut;
  var detail=document.getElementById('lr-form-detail').value.trim();
  var coverage=document.getElementById('lr-form-coverage').value.trim();
  var subDate=document.getElementById('lr-form-submitted').value;
  if(!empId||!type||!dateOut){ toast('Fill in all required fields','err'); return; }
  // Auto-calculate days (working days excluding weekends + bank holidays)
  var days = elWorkingDays(dateOut, dateIn).length;
  if(!days){ toast('No working days in selected range — check dates and bank holidays','err'); return; }
  if(btn){ btn.disabled=true; btn.textContent='Submitting…'; }
  var fields={Employee:[empId],Leave_Type:type,Date_Out:dateOut,Date_In:dateIn,
    Days:days,Status:'Pending',Submission_Date:subDate};
  if(detail)   fields.Detail=detail;
  if(coverage) fields.Coverage=coverage;
  try {
    var res=await fetch(WORKER_URL+'/leave-requests',{method:'POST',headers:getHeaders(),
      body:JSON.stringify({records:[{fields:fields}]})});
    if(!res.ok) throw new Error('HTTP '+res.status);
    var data=await res.json();
    leaveRequests=(data.records||[]).concat(leaveRequests);
    document.getElementById('lr-form-modal').style.display='none';
    toast('Leave request submitted ('+days+' day'+(days!==1?'s':'')+')','ok');
    renderLeaveRequests(); updateLRBadge();
  } catch(err){
    toast('Error: '+err.message,'err');
  } finally {
    if(btn){ btn.disabled=false; btn.textContent='Submit Request'; }
  }
}

function printLeaveRequest(id) {
  var req=leaveRequests.find(function(r){ return r.id===id; });
  if(!req) return;
  if(!window.jspdf){ toast('PDF library not loaded — try refreshing','err'); return; }
  var f=req.fields;
  var empName=getEmpNameById(elEmpId(f['Employee']));
  var emp=empRecords.find(function(e2){ return e2.id===elEmpId(f['Employee']); });
  var position=emp?(emp.fields['Position']||emp.fields['Job Title']||''):'';
  var leaveType=f['Leave_Type']||'';

  var LOGO='data:image/jpeg;base64,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';

  var jsPDF = window.jspdf.jsPDF;
  var doc = new jsPDF({orientation:'portrait', unit:'mm', format:'a4'});
  var pw=210, ph=297, ml=18, mr=18, mt=14, cw=pw-ml-mr;
  var y=mt;

  // Logo
  try { doc.addImage(LOGO,'JPEG',ml,y,30,20); } catch(_){}

  // Title block
  doc.setFont('helvetica','bold');
  doc.setFontSize(15);
  doc.setTextColor(0,0,0);
  doc.text('LEAVE REQUEST FORM', pw/2, y+8, {align:'center'});
  doc.setFont('helvetica','normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100,100,100);
  doc.text('mBELLAb P.S.   ·   mBB-FM-32   ·   HR', pw/2, y+14, {align:'center'});
  doc.setTextColor(0,0,0);
  y+=22;

  // Divider
  doc.setDrawColor(160,160,160);
  doc.setLineWidth(0.3);
  doc.line(ml, y, pw-mr, y);
  y+=4;

  // Policy text
  doc.setFont('helvetica','normal');
  doc.setFontSize(7.3);
  doc.setTextColor(80,80,80);
  var policy='In line with the policies of mBELLAb relating to annual leave and other absences, please submit this form to the Administrative Assistant and/or your supervisor for authorization and approval. Please be reminded that application for any leave should be requested in accordance with the requirements in the applicable policy of mBELLAb, other than in cases of emergency (proof of which may be required in management\'s discretion). No plans (travel or otherwise) should be made without first obtaining the authorization for leave; any expenses incurred prior to authorization shall be for the account of the employee. All leave and absences are subject to terms and conditions of your employment contract, applicable law, applicable mBELLAb policy and management\'s discretion.';
  var pLines=doc.splitTextToSize(policy, cw);
  doc.text(pLines, ml, y);
  y+=pLines.length*3.1+4;
  doc.setTextColor(0,0,0);

  // Helper: draw a labelled table cell
  function cell(label, value, cx, cellW, cy, cellH) {
    doc.setDrawColor(160,160,160);
    doc.setLineWidth(0.25);
    doc.rect(cx, cy, cellW, cellH);
    doc.setFont('helvetica','bold');
    doc.setFontSize(6.5);
    doc.setTextColor(110,110,110);
    doc.text(label.toUpperCase(), cx+2, cy+3.5);
    doc.setFont('helvetica','normal');
    doc.setFontSize(9.5);
    doc.setTextColor(0,0,0);
    var val = doc.splitTextToSize(String(value||''), cellW-4);
    doc.text(val[0]||'', cx+2, cy+cellH-2.5);
  }

  var rh=10;
  // Company row
  cell('Company', 'mBELLAb P.S.', ml, cw, y, rh);
  y+=rh;
  // Employee Name | Position
  cell('Employee Name', empName, ml, cw*0.6, y, rh);
  cell('Position', position, ml+cw*0.6, cw*0.4, y, rh);
  y+=rh;
  // Submission Date | Coverage
  cell('Submission Date', elFmtDate(f['Submission_Date']), ml, cw*0.38, y, rh);
  cell('Coverage Required in Absence', f['Coverage']||'', ml+cw*0.38, cw*0.62, y, rh);
  y+=rh+4;

  // Leave type table
  var c1=ml, c1w=72, c2=ml+c1w, c2w=50, c3=ml+c1w+c2w, c3w=20, c4=ml+c1w+c2w+c3w, c4w=20;
  var c5=ml+c1w+c2w+c3w+c4w, c5w=cw-c1w-c2w-c3w-c4w;

  // Header row
  var hh=7;
  doc.setFillColor(220,220,220);
  doc.rect(ml, y, cw, hh, 'FD');
  doc.setDrawColor(160,160,160);
  [c2,c3,c4,c5].forEach(function(cx){doc.line(cx,y,cx,y+hh);});
  doc.setFont('helvetica','bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30,30,30);
  doc.text('(Please select the appropriate reason for leave)', c1+2, y+4.7);
  doc.text('Date Out', c3+1.5, y+4.7);
  doc.text('Date In', c4+1.5, y+4.7);
  doc.text('Days', c5+1.5, y+4.7);
  y+=hh;

  var ltRows=[
    {label:'Annual Leave', sub:'(Provide Detail)', types:['Annual']},
    {label:'Sick & Compassionate Leave', sub:'(Provide Detail)', types:['Sick']},
    {label:'Personal & Unpaid Leave', sub:'(Please Specify)', types:['Unpaid']},
    {label:'Maternity / Paternity / Adoption Leave', sub:'(Provide Detail)', types:['Maternity']},
    {label:'Other', sub:'(Provide Detail)', types:[]},
  ];
  var ltH=10;
  ltRows.forEach(function(lt, idx){
    var isSel=lt.types.indexOf(leaveType)!==-1||
      (idx===4&&['Annual','Sick','Unpaid','Maternity'].indexOf(leaveType)===-1);
    if(isSel){doc.setFillColor(255,248,230); doc.rect(ml,y,cw,ltH,'F');}
    doc.setDrawColor(160,160,160);
    doc.setLineWidth(0.25);
    doc.rect(ml,y,cw,ltH);
    [c2,c3,c4,c5].forEach(function(cx){doc.line(cx,y,cx,y+ltH);});
    // Checkbox
    var cbx=c1+2.5, cby=y+2.8, cbs=4.2;
    doc.setDrawColor(isSel?30:160); doc.setLineWidth(isSel?0.5:0.25);
    doc.rect(cbx,cby,cbs,cbs);
    if(isSel){
      doc.setDrawColor(0,130,0); doc.setLineWidth(0.9);
      doc.line(cbx+0.7,cby+cbs/2, cbx+cbs/2-0.2, cby+cbs-0.9);
      doc.line(cbx+cbs/2-0.2,cby+cbs-0.9, cbx+cbs+0.3,cby+0.7);
    }
    doc.setLineWidth(0.25);
    // Label
    doc.setFont('helvetica', isSel?'bold':'normal');
    doc.setFontSize(8);
    doc.setTextColor(isSel?0:70);
    doc.text(lt.label, cbx+cbs+2, y+5.2);
    doc.setFont('helvetica','normal');
    doc.setFontSize(6.3);
    doc.setTextColor(130);
    doc.text(lt.sub, cbx+cbs+2, y+8.5);
    // Fill selected row data
    if(isSel){
      doc.setTextColor(0); doc.setFontSize(8); doc.setFont('helvetica','normal');
      var det=doc.splitTextToSize(f['Detail']||'', c2w-4);
      doc.text(det[0]||'', c2+2, y+5.2);
      doc.text(elFmtDate(f['Date_Out'])||'', c3+1.5, y+5.2);
      doc.text(elFmtDate(f['Date_In'])||'', c4+1.5, y+5.2);
      doc.setFont('helvetica','bold');
      doc.text(String(f['Days']||''), c5+1.5, y+5.2);
    }
    doc.setTextColor(0);
    y+=ltH;
  });

  y+=5;

  // Approval / decision section
  var status = f['Status']||'Pending';
  // Status banner
  var bannerCol = status==='Approved'?[0,140,0]:status==='Rejected'?[180,0,0]:[160,120,0];
  doc.setFillColor(bannerCol[0], bannerCol[1], bannerCol[2]);
  doc.rect(ml, y, cw, 7, 'F');
  doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(255,255,255);
  var bannerLabel = status==='Approved'?'APPROVED':status==='Rejected'?'REJECTED':'PENDING APPROVAL';
  doc.text(bannerLabel, pw/2, y+4.8, {align:'center'});
  doc.setTextColor(0);
  y+=7;

  if(status==='Approved'){
    cell('Approved by', f['Approved_By']||'', ml, cw*0.55, y, rh+2);
    cell('Approval Date', elFmtDate(f['Approval_Date'])||'', ml+cw*0.55, cw*0.45, y, rh+2);
    y+=rh+2;
  } else if(status==='Rejected'){
    cell('Rejected by', f['Rejected_By']||'', ml, cw*0.55, y, rh+2);
    cell('Rejection Date', elFmtDate(f['Rejection_Date'])||'', ml+cw*0.55, cw*0.45, y, rh+2);
    y+=rh+2;
    cell('Rejection Notes', f['Rejection_Notes']||'', ml, cw, y, rh+2);
    y+=rh+2;
  } else {
    // Pending: blank signature lines for physical signing
    cell('Approved by', '', ml, cw*0.55, y, rh+6);
    cell('Date', '', ml+cw*0.55, cw*0.45, y, rh+6);
    y+=rh+6;
  }

  // Footer
  doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(150,150,150);
  doc.text('mBB-FM-32  ·  HR Leave Request Form  ·  mBELLAb P.S.', pw/2, ph-8, {align:'center'});

  // Download
  var safeName=(empName||'').replace(/[^a-zA-Z0-9 ]/g,'').replace(/\s+/g,'_');
  var subDate=(f['Submission_Date']||'').replace(/-/g,'');
  doc.save('mBB-FM-32_'+safeName+'_'+subDate+'.pdf');
}

async function loadLeaveData() {
  try {
    var yr = new Date().getFullYear();
    document.getElementById('el-period-label').textContent = yr + ' Leave Year';
    // Load all 4 sources in parallel
    var [lRes, tRes, hRes, eRes, entRes] = await Promise.all([
      fetch(WORKER_URL+'/leave-records?pageSize=100',        {headers:getHeaders()}),
      fetch(WORKER_URL+'/annual-tickets?pageSize=100',       {headers:getHeaders()}),
      fetch(WORKER_URL+'/bank-holidays?pageSize=100',        {headers:getHeaders()}),
      fetch(WORKER_URL+'/employees?pageSize=100',            {headers:getHeaders()}),
      fetch(WORKER_URL+'/annual-entitlements?pageSize=100',  {headers:getHeaders()})
    ]);
    var lData   = await lRes.json();
    var tData   = await tRes.json();
    var hData   = await hRes.json();
    var eData   = await eRes.json();
    var entData = await entRes.json();
    if(!lRes.ok)   throw new Error('/leave-records: HTTP '+lRes.status+' '+JSON.stringify(lData));
    if(!tRes.ok)   throw new Error('/annual-tickets: HTTP '+tRes.status+' '+JSON.stringify(tData));
    if(!hRes.ok)   throw new Error('/bank-holidays: HTTP '+hRes.status+' '+JSON.stringify(hData));
    elRecords      = lData.records   || [];
    elTickets      = tData.records   || [];
    elHolidays     = hData.records   || [];
    elEntitlements = entData.records || [];
    if(eData.records && eData.records.length) empRecords = eData.records;
    elLoaded = true;
    renderHolidaysBar();
    renderLeaveTable();

  } catch(err) { toast('Failed to load leave data: '+err.message,'err'); }
}

function elFmtDate(d) {
  if(!d) return '—';
  var dt = new Date(d);
  return dt.getDate().toString().padStart(2,'0')+' '+
    ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][dt.getMonth()]+
    ' '+dt.getFullYear();
}

function elFmtPeriod(from, to) {
  var mn = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function fd(d){ return String(d.getDate()).padStart(2,'0')+' '+mn[d.getMonth()]+' '+d.getFullYear(); }
  return fd(from)+' – '+fd(to);
}

function getAnnualPeriod(startDateStr, offset) {
  if(!startDateStr) return null;
  var s = new Date(startDateStr);
  if(isNaN(s)) return null;
  var today = new Date(); today.setHours(0,0,0,0);
  var yr = today.getFullYear();
  var anniv = new Date(yr, s.getMonth(), s.getDate());
  if(today < anniv) anniv = new Date(yr-1, s.getMonth(), s.getDate());
  // Apply offset: 0 = current period, -1 = previous, etc.
  if(offset) anniv = new Date(anniv.getFullYear()+(offset||0), anniv.getMonth(), anniv.getDate());
  var end = new Date(anniv); end.setFullYear(end.getFullYear()+1); end.setDate(end.getDate()-1);
  return { from: anniv, to: end };
}

function elChangePeriod(offset) {
  elPeriodOffset = offset;
  var ents = getEmpEntitlements(elCurrentEmpId);
  renderPeriodNav(ents);
  renderTabContent(elActiveTab);
}

function renderPeriodNav(ents) {
  var nav = document.getElementById('el-period-nav');
  if(!nav) return;
  if(!ents || !ents.length) {
    nav.innerHTML = '<div style="background:var(--amber-bg);border:1px solid var(--amber-bdr);border-radius:6px;padding:10px 14px;font-size:13px;color:var(--amber)">'
      +'No annual entitlement periods set up yet. Click <strong>&#9998; Entitlement</strong> above to add one.</div>';
    return;
  }
  var entRec  = ents[elPeriodOffset] || ents[0];
  var period  = entPeriod(entRec);
  var canPrev = elPeriodOffset < ents.length - 1;
  var canNext = elPeriodOffset > 0;
  var today   = new Date(); today.setHours(0,0,0,0);
  var isActive = period && today >= period.from && today <= period.to;
  var btnSt = 'background:none;border:none;font-size:16px;padding:0 6px;';
  nav.innerHTML =
    '<div style="display:flex;align-items:center;justify-content:space-between;'
    +'background:var(--bg2);border:1px solid var(--bdr2);border-radius:6px;padding:8px 12px">'
    +'<button onclick="elChangePeriod('+(elPeriodOffset+1)+')" style="'+btnSt+'cursor:'+(canPrev?'pointer':'default')+';color:'+(canPrev?'var(--txt)':'var(--bdr2)')+'" '+(canPrev?'':'disabled')+'>&#8592;</button>'
    +'<div style="text-align:center">'
      +'<div style="font-size:13px;font-weight:700;color:var(--txt)">'+(period?elFmtPeriodLabel(period.from,period.to):'—')+'</div>'
      +'<div style="font-size:10px;color:'+(isActive?'var(--green)':'var(--txt3)')+';margin-top:1px">'+(isActive?'Current period':'Past period')+'</div>'
    +'</div>'
    +'<button onclick="elChangePeriod('+(elPeriodOffset-1)+')" style="'+btnSt+'cursor:'+(canNext?'pointer':'default')+';color:'+(canNext?'var(--txt)':'var(--bdr2)')+'" '+(canNext?'':'disabled')+'>&#8594;</button>'
    +'</div>';
}

function elFmtPeriodLabel(from, to) {
  var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return MONTHS[from.getMonth()]+' '+from.getFullYear()+' – '+MONTHS[to.getMonth()]+' '+to.getFullYear();
}


// Extract employee record ID from a linked-record field value
// Handles: ["recXXX"], [{id:"recXXX",...}], "recXXX"
function elEmpId(fieldVal) {
  if(!fieldVal) return null;
  if(Array.isArray(fieldVal)) {
    var first = fieldVal[0];
    if(!first) return null;
    return (typeof first === 'object') ? (first.id || null) : String(first);
  }
  return String(fieldVal);
}
function getEmpEntitlements(empId) {
  return elEntitlements
    .filter(function(r){ return elEmpId(r.fields['Employee'])===empId; })
    .sort(function(a,b){ return new Date(b.fields['Period_Start'])-new Date(a.fields['Period_Start']); });
}
function getActiveEntitlement(empId) {
  var today=new Date(); today.setHours(0,0,0,0);
  return getEmpEntitlements(empId).find(function(r){
    var s=r.fields['Period_Start'], en=r.fields['Period_End'];
    if(!s||!en) return false;
    var from=new Date(s+'T00:00:00'), to=new Date(en+'T00:00:00');
    return today>=from && today<=to;
  })||null;
}
function entPeriod(r) {
  if(!r) return null;
  return {from:new Date(r.fields['Period_Start']+'T00:00:00'), to:new Date(r.fields['Period_End']+'T00:00:00')};
}

function elLeaveUsed(empId, type, from, to) {
  var total = 0;
  elRecords.forEach(function(r){
    if(elEmpId(r.fields['Employee']) !== empId) return;
    if(r.fields['Type'] !== type) return;
    var startStr = r.fields['Start_Date'] || r.fields['Date'];
    if(!startStr) return;
    var startDt = new Date(startStr); startDt.setHours(0,0,0,0);
    var endStr  = r.fields['End_Date'];
    var endDt   = endStr ? new Date(endStr) : startDt; endDt.setHours(0,0,0,0);
    // Include if leave overlaps the period (end >= from AND start <= to)
    if(from && endDt < from) return;
    if(to   && startDt > to) return;
    total += parseFloat(r.fields['Days']) || 0;
  });
  return total;
}

function getCurrentTicket(empId) {
  var period = getAnnualPeriod((empRecords.find(function(e){ return e.id===empId; })||{fields:{}}).fields['Start Date']);
  if(!period) return null;
  var label = elFmtPeriod(period.from, period.to);
  return elTickets.find(function(t){
    return elEmpId(t.fields['Employee'])===empId && t.fields['Period']===label;
  }) || null;
}

function setHolYear(delta) {
  elHolYear += delta;
  renderHolidaysBar();
}

function renderHolidaysBar() {
  var list = document.getElementById('el-holidays-list');
  var nav  = document.getElementById('el-hol-year-nav');
  if(!list) return;

  var btnSt = 'background:none;border:none;cursor:pointer;color:var(--txt3);font-size:16px;padding:0 4px;line-height:1';
  if(nav) nav.innerHTML =
    '<button onclick="setHolYear(-1)" style="'+btnSt+'">‹</button>'+
    '<span style="font-size:13px;font-weight:600;color:var(--txt);min-width:36px;text-align:center;display:inline-block">'+elHolYear+'</span>'+
    '<button onclick="setHolYear(1)" style="'+btnSt+'">›</button>';

  var relevant = elHolidays.filter(function(h){
    var d = h.fields['Date'];
    return d && new Date(d).getFullYear() === elHolYear;
  }).sort(function(a,b){ return new Date(a.fields['Date'])-new Date(b.fields['Date']); });

  if(!relevant.length) {
    list.innerHTML='<span style="font-size:12px;color:var(--txt3)">No holidays for '+elHolYear+'</span>';
    return;
  }
  list.innerHTML = relevant.map(function(h){
    var confirmed = h.fields['Confirmed'];
    var col = confirmed ? 'var(--green)' : 'var(--amber)';
    var lbl = confirmed ? '' : ' ⏳';
    return '<span onclick="openEditHoliday(\''+h.id+'\')" style="font-size:12px;background:var(--bg);border:1px solid '+col+';border-radius:20px;padding:3px 10px;cursor:pointer;color:'+col+'">'+
      elFmtDate(h.fields['Date'])+' · '+e(h.fields['Name']||'')+lbl+'</span>';
  }).join('');
}

function renderLeaveTable() {
  var tbody = document.getElementById('el-tbody');
  var yrNow = new Date().getFullYear();
  var active = empRecords.filter(function(emp){ return emp.fields['Status'] !== 'Inactive'; });
  if(!active.length) { tbody.innerHTML='<tr><td colspan="8" style="padding:20px;text-align:center;color:var(--txt3)">No employees found</td></tr>'; return; }

  tbody.innerHTML = active.map(function(emp, i){
    var f = emp.fields;
    var activeEnt  = getActiveEntitlement(emp.id);
    var period     = entPeriod(activeEnt);
    var annualEnt  = activeEnt ? (parseFloat(activeEnt.fields['Days'])||0) : 0;
    var sickEnt    = parseFloat(f['Sick Leave Days']) || 0;
    var annualUsed=0, sickUsed=0, wfhUsed=0, unpaidUsed=0;
    if(period) {
      annualUsed = elLeaveUsed(emp.id, 'Annual', period ? period.from : null, period ? period.to : null);
      sickUsed   = elLeaveUsed(emp.id, 'Sick', new Date(yrNow,0,1), new Date(yrNow,11,31));
      unpaidUsed = elLeaveUsed(emp.id, 'Unpaid', period ? period.from : new Date(yrNow,0,1), period ? period.to : new Date(yrNow,11,31));
      wfhUsed    = elLeaveUsed(emp.id, 'WFH',    new Date(yrNow,0,1), new Date(yrNow,11,31));
    }
    var annualRem = annualEnt - annualUsed;
    var sickRem   = sickEnt   - sickUsed;
    var ticket = getCurrentTicket(emp.id);
    var tickStatus = ticket ? (ticket.fields['Status']||'—') : '—';
    var tickCol = tickStatus==='Paid' ? 'var(--green)' : tickStatus==='Unpaid' ? 'var(--red)' : 'var(--txt3)';
    var periodStr = period ? elFmtPeriod(period.from, period.to) : '—';
    var annRemCol = annualRem < 3 ? 'var(--red)' : annualRem < 7 ? 'var(--amber)' : 'var(--green)';
    var sickRemCol = sickRem < 3 ? 'var(--amber)' : 'var(--txt)';
    var bg = i%2===0 ? '' : 'background:var(--bg2)';
    return '<tr style="border-bottom:1px solid var(--bdr);cursor:pointer;'+bg+'" ondblclick="openEmpDetail(\''+emp.id+'\')">' +
      '<td style="padding:10px 14px;font-weight:500">'+e(f['Name']||f['Employee Name']||'—')+'</td>'+
      '<td style="padding:10px 14px;font-size:12px;color:var(--txt3)">'+periodStr+'</td>'+
      '<td style="padding:10px 14px;text-align:center;font-family:monospace;font-weight:600">'+annualUsed.toFixed(1)+'</td>'+
      '<td style="padding:10px 14px;text-align:center;font-family:monospace;font-weight:700;color:'+annRemCol+'">'+annualRem.toFixed(1)+'</td>'+
      '<td style="padding:10px 14px;text-align:center;font-family:monospace;font-weight:600">'+sickUsed.toFixed(1)+'</td>'+
      '<td style="padding:10px 14px;text-align:center;font-family:monospace">'+wfhUsed.toFixed(1)+'</td>'+
      '<td style="padding:10px 14px;text-align:center;font-family:monospace;color:'+(unpaidUsed>0?'var(--red)':'var(--txt)')+'">'+unpaidUsed.toFixed(1)+'</td>'+
      '<td style="padding:10px 14px;text-align:center;font-size:12px;font-weight:600;color:'+tickCol+'">'+tickStatus+'</td>'+
      '<td style="padding:10px 14px"><button class="btn-ghost" onclick="openEmpDetail(\''+emp.id+'\')" style="font-size:12px">View</button></td>'+
    '</tr>';
  }).join('');
}

function openEmpDetail(empId) {
  elPeriodOffset = 0;

  var emp = empRecords.find(function(e){ return e.id===empId; });
  if(!emp) return;
  elCurrentEmpId = empId;
  var f = emp.fields;
  var startDate = f['Start Date'];
  var activeEnt = getActiveEntitlement(empId);
  var period    = entPeriod(activeEnt);
  document.getElementById('el-emp-name').textContent = f['Name']||f['Employee Name']||'Employee';
  document.getElementById('el-emp-meta').textContent =
    'Start date: '+elFmtDate(startDate) +
    (period ? ' · Current annual period: '+elFmtPeriod(period.from, period.to) : ' · No active annual period') +
    (activeEnt ? ' · Annual entitlement: '+activeEnt.fields['Days']+' days' : '') +
    ' · Sick entitlement: '+(f['Sick Leave Days']||'?')+' days';
  renderPeriodNav(getEmpEntitlements(empId));
  elShowTab('all');
  document.getElementById('el-emp-modal').style.display='flex';
}

function elShowTab(tab) {
  elActiveTab = tab;
  ['all','annual','sick','wfh','unpaid','ticket'].forEach(function(t){
    document.getElementById('el-tab-'+t).className = 'el-tab'+(t===tab?' el-tab-active':'');
    document.getElementById('el-tab-content-'+t).style.display = t===tab ? '' : 'none';
  });
  renderTabContent(tab);
}

function renderTabContent(tab) {
  if(!elCurrentEmpId) return;
  if(tab==='all'){
    var elAll=document.getElementById('el-tab-content-all');
    var allE=elRecords.filter(function(r){return elEmpId(r.fields['Employee'])===elCurrentEmpId;})
      .sort(function(a,b){return new Date(b.fields['Start_Date']||b.fields['Date'])-new Date(a.fields['Start_Date']||a.fields['Date']);});
    var tc={Annual:'var(--amber)',Sick:'var(--red)',Unpaid:'var(--red)',WFH:'var(--txt2)',Early:'var(--txt3)',Late:'var(--txt3)'};
    var rows=allE.map(function(r){var t=r.fields['Type']||'—';
      var sD=r.fields['Start_Date']||r.fields['Date'], eD=r.fields['End_Date'];
      var period=eD&&eD!==sD?elFmtDate(sD)+' → '+elFmtDate(eD):elFmtDate(sD);
      return '<tr style="border-bottom:1px solid var(--bdr)">'
        +'<td style="padding:6px 10px;font-size:12px;white-space:nowrap">'+period+'</td>'
        +'<td style="padding:6px 10px;font-weight:600;font-size:12px;white-space:nowrap;color:'+(tc[t]||'var(--txt)')+'">'+e(t)+'</td>'
        +'<td style="padding:6px 10px;text-align:center;font-family:monospace;font-size:12px">'+r.fields['Days']+'</td>'
        +'<td style="padding:6px 10px;text-align:right"><button onclick="openEditEntry(\''+r.id+'\')" style="background:none;border:1px solid var(--bdr2);border-radius:4px;padding:2px 8px;cursor:pointer;font-size:11px">Edit</button></td>'
      +'</tr>';}).join('');
    elAll.innerHTML='<div style="display:flex;justify-content:flex-end;margin-bottom:8px">'
      +'<button class="btn-pri" onclick="openAddEntry(\'Annual\')" style="font-size:12px">+ Add Entry</button></div>'
      +'<div style="border:1px solid var(--bdr2);border-radius:6px;overflow:hidden">'
      +'<div style="overflow-x:auto">'
      +(rows?'<table style="border-collapse:collapse;font-size:13px;display:inline-table;min-width:100%">'
        +'<thead><tr style="background:var(--bg2)">'
        +'<th style="padding:6px 10px;text-align:left;font-size:11px;color:var(--txt2)">Period</th>'
        +'<th style="padding:6px 10px;text-align:left;font-size:11px;color:var(--txt2);white-space:nowrap">Type</th>'
        +'<th style="padding:6px 10px;text-align:center;font-size:11px;color:var(--txt2)">Days</th>'
        +'<th></th>'
        +'</tr></thead><tbody>'+rows+'</tbody></table>'
      :'<div style="padding:16px;text-align:center;color:var(--txt3)">No leave entries yet</div>')
      +'</div>'
      +'</div>';
    return;
  }
  var emp = empRecords.find(function(e){ return e.id===elCurrentEmpId; });
  if(!emp) return;
  var f = emp.fields;
  var yrNow = new Date().getFullYear();
  var el = document.getElementById('el-tab-content-'+tab);

  if(tab === 'ticket') {
    renderTicketTab(emp);
    return;
  }

  var typeMap = {annual:'Annual', sick:'Sick', wfh:'WFH', unpaid:'Unpaid'};
  var leaveType = typeMap[tab];
  var ents   = getEmpEntitlements(elCurrentEmpId);
  var entRec = ents[elPeriodOffset] || ents[0] || null;
  var period = entRec ? entPeriod(entRec) : null;
  var ent = tab==='annual' ? (entRec ? (parseFloat(entRec.fields['Days'])||0) : 0)
          : tab==='sick'   ? (parseFloat(f['Sick Leave Days'])||0)
          : null;
  var used = period ? elLeaveUsed(elCurrentEmpId, leaveType, period.from, period.to) : 0;
  var entries = elRecords.filter(function(r){
    if(elEmpId(r.fields['Employee']) !== elCurrentEmpId) return false;
    if(r.fields['Type']!==leaveType) return false;
    var startStr = r.fields['Start_Date']||r.fields['Date']; if(!startStr) return false;
    var startDt  = new Date(startStr); startDt.setHours(0,0,0,0);
    var endStr   = r.fields['End_Date'];
    var endDt    = endStr ? new Date(endStr) : startDt; endDt.setHours(0,0,0,0);
    // Include if leave overlaps the period
    if(period && endDt   < period.from) return false;
    if(period && startDt > period.to)   return false;
    return true;
  }).sort(function(a,b){ return new Date(a.fields['Start_Date']||a.fields['Date'])-new Date(b.fields['Start_Date']||b.fields['Date']); });

  var summaryHtml = '';
  if(ent !== null) {
    var rem = ent - used;
    var remCol = rem<3?'var(--red)':rem<7?'var(--amber)':'var(--green)';
    summaryHtml = '<div style="display:flex;gap:12px;margin-bottom:14px">'+
      '<div class="kpi-card" style="flex:1;padding:10px 14px"><div class="kpi-label">ENTITLEMENT</div><div style="font-size:18px;font-weight:700;font-family:monospace">'+ent+' days</div></div>'+
      '<div class="kpi-card" style="flex:1;padding:10px 14px"><div class="kpi-label">USED</div><div style="font-size:18px;font-weight:700;font-family:monospace;color:var(--amber)">'+used.toFixed(1)+' days</div></div>'+
      '<div class="kpi-card" style="flex:1;padding:10px 14px"><div class="kpi-label">REMAINING</div><div style="font-size:18px;font-weight:700;font-family:monospace;color:'+remCol+'">'+rem.toFixed(1)+' days</div></div>'+
    '</div>';
  }

  // Bank holiday note for annual tab
  var bholNote = '';
  if(tab==='annual') {
    var bhInPeriod = elHolidays.filter(function(h){
      var d=h.fields['Date']; if(!d) return false;
      var dt=new Date(d); dt.setHours(0,0,0,0);
      return period && dt>=period.from && dt<=period.to;
    });
    if(bhInPeriod.length) {
      var confirmed = bhInPeriod.filter(function(h){ return h.fields['Confirmed']; });
      bholNote = '<div style="background:var(--amber-bg);border:1px solid var(--amber-bdr);border-radius:6px;padding:8px 12px;font-size:12px;margin-bottom:12px;color:var(--amber)">'+
        '&#127482;&#127462; '+confirmed.length+' confirmed bank holiday'+(confirmed.length!==1?'s':'')+
        (bhInPeriod.length>confirmed.length?' (+'+(bhInPeriod.length-confirmed.length)+' unconfirmed)':'')+
        ' fall within this period — these are excluded from working day counts.</div>';
    }
  }

  var listHtml = '';
  if(!entries.length) {
    listHtml = '<div style="padding:16px;text-align:center;color:var(--txt3);font-size:13px">No entries yet</div>';
  } else {
    listHtml = '<table style="border-collapse:collapse;font-size:13px;display:inline-table;min-width:100%">'+
      '<thead><tr style="background:var(--bg2)">'+
      '<th style="padding:6px 10px;text-align:left;font-size:11px;color:var(--txt2)">Period</th>'+
      '<th style="padding:6px 10px;text-align:center;font-size:11px;color:var(--txt2)">Days</th>'+
      '<th></th>'+
      '</tr></thead><tbody>'+
      entries.map(function(r){
        var sD=r.fields['Start_Date']||r.fields['Date'], eD=r.fields['End_Date'];
        var period=eD&&eD!==sD?elFmtDate(sD)+' → '+elFmtDate(eD):elFmtDate(sD);
        return '<tr style="border-bottom:1px solid var(--bdr)">'+
          '<td style="padding:6px 10px;font-size:12px;white-space:nowrap">'+period+'</td>'+
          '<td style="padding:6px 10px;text-align:center;font-family:monospace;font-weight:600;font-size:12px">'+r.fields['Days']+'</td>'+
          '<td style="padding:6px 10px;text-align:right"><button onclick="openEditEntry(\''+r.id+'\')" style="background:none;border:1px solid var(--bdr2);border-radius:4px;padding:2px 8px;cursor:pointer;font-size:11px">Edit</button></td>'+
        '</tr>';
      }).join('')+
      '</tbody></table>';
  }

  el.innerHTML = summaryHtml + bholNote +
    '<div style="display:flex;justify-content:flex-end;margin-bottom:8px">'+
    '<button class="btn-pri" onclick="openAddEntry(\''+leaveType+'\')" style="font-size:12px">+ Add Entry</button></div>'+
    '<div style="border:1px solid var(--bdr2);border-radius:6px;overflow:hidden"><div style="overflow-x:auto">'+listHtml+'</div></div>';
}

function renderTicketTab(emp) {
  var el = document.getElementById('el-tab-content-ticket');
  var ents = getEmpEntitlements(emp.id);
  var entRec = ents[elPeriodOffset] || ents[0] || null;
  var period = entRec ? entPeriod(entRec) : null;
  var periodLabel = period ? elFmtPeriod(period.from, period.to) : null;

  // Get all tickets for this employee sorted by period
  var empTickets = elTickets.filter(function(t){
    var emp2 = t.fields['Employee'];
    return emp2 && emp2[0]===elCurrentEmpId;
  });

  var currentTicket = empTickets.find(function(t){ return t.fields['Period']===periodLabel; });
  var currentStatus = currentTicket ? (currentTicket.fields['Status']||'Unpaid') : 'Unpaid';
  var statusCol = currentStatus==='Paid' ? 'var(--green)' : 'var(--red)';

  var pastTickets = empTickets.filter(function(t){ return t.fields['Period']!==periodLabel; });

  el.innerHTML =
    '<div style="margin-bottom:20px">' +
      '<div style="font-size:12px;color:var(--txt3);margin-bottom:6px;text-transform:uppercase;letter-spacing:.6px;font-family:monospace">Current Period: '+e(periodLabel||'Unknown')+'</div>'+
      '<div style="display:flex;align-items:center;gap:12px;padding:14px;background:var(--bg2);border:1px solid var(--bdr2);border-radius:var(--r)">'+
        '<span style="font-size:22px;font-weight:700;color:'+statusCol+'">'+e(currentStatus)+'</span>'+
        '<div style="display:flex;gap:6px;margin-left:auto">'+
          '<button onclick="setTicketStatus(\'Paid\')"    class="btn-ghost" style="font-size:12px;color:var(--green);border-color:var(--green-bdr)">&#10003; Mark Paid</button>'+
          '<button onclick="setTicketStatus(\'Unpaid\')" class="btn-ghost" style="font-size:12px;color:var(--red)">Mark Unpaid</button>'+
        '</div>'+
      '</div>'+
    '</div>'+
    (pastTickets.length ? '<div style="font-size:12px;font-weight:600;color:var(--txt2);margin-bottom:8px">Previous Periods</div>'+
      '<table style="width:100%;border-collapse:collapse;font-size:13px">'+
      '<thead><tr style="background:var(--bg2)"><th style="padding:8px 12px;text-align:left">Period</th><th style="padding:8px 12px;text-align:left">Status</th></tr></thead><tbody>'+
      pastTickets.map(function(t){
        var sc = (t.fields['Status']==='Paid')?'var(--green)':'var(--red)';
        return '<tr style="border-bottom:1px solid var(--bdr)">'+
          '<td style="padding:8px 12px;color:var(--txt2)">'+e(t.fields['Period']||'—')+'</td>'+
          '<td style="padding:8px 12px;font-weight:600;color:'+sc+'">'+e(t.fields['Status']||'—')+'</td>'+
        '</tr>';
      }).join('')+
      '</tbody></table>' : '');
}

async function setTicketStatus(status) {
  var emp = empRecords.find(function(e){ return e.id===elCurrentEmpId; });
  if(!emp) return;
  var ents = getEmpEntitlements(elCurrentEmpId);
  var entRec = ents[elPeriodOffset] || ents[0] || null;
  var period = entRec ? entPeriod(entRec) : null;
  if(!period) return;
  var label = elFmtPeriod(period.from, period.to);
  var existing = elTickets.find(function(t){
    var emp2=t.fields['Employee'];
    return emp2&&emp2[0]===elCurrentEmpId&&t.fields['Period']===label;
  });
  try {
    var method = existing ? 'PATCH' : 'POST';
    var url = WORKER_URL+'/annual-tickets'+(existing?'/'+existing.id:'');
    var body = existing
      ? {fields:{Status:status}}
      : {fields:{Employee:[elCurrentEmpId], Period:label, Status:status}};
    var res = await fetch(url, {method:method, headers:getHeaders(), body:JSON.stringify(body)});
    if(!res.ok) throw new Error('HTTP '+res.status);
    var data = await res.json();
    if(existing) {
      elTickets = elTickets.map(function(t){ return t.id===existing.id?data:t; });
    } else {
      elTickets.push(data);
    }
    toast('Ticket status updated','ok');
    renderTabContent('ticket');
    renderLeaveTable();
  } catch(err){ toast('Error: '+err.message,'err'); }
}


function elWorkingDays(startStr, endStr) {
  var holidays = {};
  elHolidays.forEach(function(h){
    if(h.fields['Confirmed']) holidays[h.fields['Date']] = true;
  });
  var dates = [];
  var cur = new Date(startStr); cur.setHours(0,0,0,0);
  var end = new Date(endStr);   end.setHours(0,0,0,0);
  while(cur <= end) {
    var dow = cur.getDay();
    var ds  = cur.toISOString().slice(0,10);
    if(dow !== 0 && dow !== 6 && !holidays[ds]) dates.push(ds);
    cur.setDate(cur.getDate()+1);
  }
  return dates;
}

function elUpdatePreview() {
  var s = document.getElementById('el-entry-start').value;
  var e = document.getElementById('el-entry-end').value;
  var d = parseFloat(document.getElementById('el-entry-days').value)||1;
  var prev = document.getElementById('el-range-preview');
  var txt  = document.getElementById('el-preview-text');
  var btn  = document.getElementById('el-entry-save');
  if(!s || !e) { prev.style.display='none'; return; }
  if(new Date(e) < new Date(s)) { txt.textContent='End date must be after start date.'; prev.style.display=''; return; }
  var days = elWorkingDays(s, e);
  var total = days.length * d;
  // Count weekends and holidays skipped
  var calDays = Math.round((new Date(e)-new Date(s))/86400000)+1;
  var weekends = 0; var cur2=new Date(s); cur2.setHours(0,0,0,0);
  var end2=new Date(e); end2.setHours(0,0,0,0);
  var bhSkipped = 0;
  while(cur2<=end2){ var dow=cur2.getDay(); if(dow===0||dow===6)weekends++; cur2.setDate(cur2.getDate()+1); }
  bhSkipped = calDays - weekends - days.length;
  var msg = days.length+' working day'+(days.length!==1?'s':'')
    +' = '+total+' day'+(total!==1?'s':'')+' leave';
  if(weekends>0) msg += ' · '+weekends+' weekend day'+(weekends!==1?'s':'')+' skipped';
  if(bhSkipped>0) msg += ' · '+bhSkipped+' bank holiday'+(bhSkipped!==1?'s':'')+' excluded';
  txt.textContent = msg;
  prev.style.display = '';
  if(btn) btn.textContent = 'Save';
}
function openAddEntry(type) {
  elCurrentEditId = null;
  document.getElementById('el-entry-title').textContent = 'Add Leave Entry';
  document.getElementById('el-entry-type').value = type||'Annual';
  document.getElementById('el-entry-days').value = '1';
  document.getElementById('el-entry-notes').value = '';
  document.getElementById('el-range-preview').style.display = 'none';
  var today = new Date().toISOString().slice(0,10);
  document.getElementById('el-entry-start').value = today;
  document.getElementById('el-entry-end').value   = today;
  elUpdatePreview();
  document.getElementById('el-entry-del').style.display = 'none';
  document.getElementById('el-entry-modal').style.display = 'flex';
}

function openEditEntry(id) {
  var r = elRecords.find(function(x){ return x.id===id; });
  elCurrentEditId = id;
  var f = r ? r.fields : {};
  document.getElementById('el-entry-title').textContent = 'Edit Leave Entry';
  document.getElementById('el-entry-type').value  = f['Type']||'Annual';
  var startD = (f['Start_Date']||f['Date']||'').substring(0,10);
  var endD   = (f['End_Date']  ||startD).substring(0,10);
  document.getElementById('el-entry-start').value = startD;
  document.getElementById('el-entry-end').value   = endD;
  // Derive per-day multiplier from stored total ÷ working days count
  var storedDays = parseFloat(f['Days'])||1;
  var wdCount = startD ? elWorkingDays(startD, endD).length : 1;
  var mult = wdCount > 0 ? Math.round((storedDays / wdCount) * 2) / 2 : 1;
  document.getElementById('el-entry-days').value  = (mult === 0.5) ? '0.5' : '1';
  document.getElementById('el-entry-notes').value = f['Notes']||'';
  elUpdatePreview();
  var delBtn = document.getElementById('el-entry-del');
  if(delBtn){ delBtn.style.display = 'inline-block'; delBtn.style.visibility = 'visible'; }
  document.getElementById('el-entry-modal').style.display = 'flex';
}


async function saveHoliday() {
  var date  = document.getElementById('el-hol-date').value;
  var name  = document.getElementById('el-hol-name').value.trim();
  var conf  = document.getElementById('el-hol-confirmed').checked;
  if(!date||!name){ toast('Date and name are required','err'); return; }
  var fields = {'Date':date,'Name':name,'Confirmed':conf};
  try {
    var url    = WORKER_URL+'/bank-holidays'+(elHolEditId?'/'+elHolEditId:'');
    var method = elHolEditId ? 'PATCH' : 'POST';
    var body   = elHolEditId ? {fields:fields} : {records:[{fields:fields}]};
    var res    = await fetch(url,{method:method,headers:getHeaders(),body:JSON.stringify(body)});
    if(!res.ok) throw new Error('HTTP '+res.status);
    var data   = await res.json();
    if(elHolEditId) {
      elHolidays = elHolidays.map(function(h){ return h.id===elHolEditId ? data : h; });
    } else {
      elHolidays = elHolidays.concat(data.records||[data]);
    }
    document.getElementById('el-holiday-modal').style.display='none';
    toast('Saved','ok');
    renderHolidaysBar();
  } catch(err){ toast('Save failed: '+err.message,'err'); }
}

async function deleteHoliday() {
  if(!elHolEditId) return;
  if(!confirm('Delete this bank holiday?')) return;
  try {
    var res = await fetch(WORKER_URL+'/bank-holidays/'+elHolEditId,
      {method:'DELETE',headers:getHeaders()});
    if(!res.ok) throw new Error('HTTP '+res.status);
    elHolidays = elHolidays.filter(function(h){ return h.id!==elHolEditId; });
    document.getElementById('el-holiday-modal').style.display='none';
    toast('Deleted','ok');
    renderHolidaysBar();
  } catch(err){ toast('Delete failed: '+err.message,'err'); }
}

async function saveLeaveEntry() {
  var type  = document.getElementById('el-entry-type').value;
  var days  = parseFloat(document.getElementById('el-entry-days').value)||1;
  var notes = document.getElementById('el-entry-notes').value.trim();

  if(elCurrentEditId) {
    // EDIT MODE — update date range, recompute days
    var start = document.getElementById('el-entry-start').value;
    var end   = document.getElementById('el-entry-end').value;
    if(!start||!end){ toast('Start and end date required','err'); return; }
    if(new Date(end)<new Date(start)){ toast('End date must be after start date','err'); return; }
    var workDays = elWorkingDays(start, end);
    var computedDays = workDays.length * days;
    var fields = {'Employee':[elCurrentEmpId],'Type':type,'Start_Date':start,'End_Date':end,'Days':computedDays};
    if(notes) fields['Notes']=notes; else fields['Notes']=null;
    try {
      var res = await fetch(WORKER_URL+'/leave-records/'+elCurrentEditId,
        {method:'PATCH', headers:getHeaders(), body:JSON.stringify({fields:fields})});
      if(!res.ok) throw new Error('HTTP '+res.status);
      var data = await res.json();
      elRecords = elRecords.map(function(r){ return r.id===elCurrentEditId?data:r; });
      document.getElementById('el-entry-modal').style.display='none';
      toast('Entry updated','ok');
      await loadLeaveData();
      if(elCurrentEmpId) openEmpDetail(elCurrentEmpId);
    } catch(err){ toast('Save failed: '+err.message,'err'); }
    return;
  }

  // ADD MODE — single record with start/end dates
  var start = document.getElementById('el-entry-start').value;
  var end   = document.getElementById('el-entry-end').value;
  if(!start||!end){ toast('Start and end date required','err'); return; }
  if(new Date(end)<new Date(start)){ toast('End date must be after start date','err'); return; }

  var workDays = elWorkingDays(start, end);
  if(!workDays.length){ toast('No working days in selected range','err'); return; }

  var computedDays = workDays.length * days;
  var saveBtn = document.getElementById('el-entry-save');
  if(saveBtn){ saveBtn.textContent='Saving…'; saveBtn.disabled=true; }

  try {
    var f = {'Employee':[elCurrentEmpId],'Type':type,'Start_Date':start,'End_Date':end,'Days':computedDays};
    if(notes) f['Notes']=notes;
    var res = await fetch(WORKER_URL+'/leave-records',
      {method:'POST', headers:getHeaders(), body:JSON.stringify({records:[{fields:f}]})});
    if(!res.ok) throw new Error('HTTP '+res.status);
    var data = await res.json();
    (data.records||[]).forEach(function(r){ elRecords.push(r); });
    document.getElementById('el-entry-modal').style.display='none';
    toast('Leave entry added ('+computedDays+' day'+(computedDays!==1?'s':'')+')', 'ok');
    await loadLeaveData();
    if(elCurrentEmpId) openEmpDetail(elCurrentEmpId);
  } catch(err){
    toast('Save failed: '+err.message,'err');
  } finally {
    if(saveBtn){ saveBtn.textContent='Save'; saveBtn.disabled=false; }
  }
}

async function deleteLeaveEntry() {
  if(!elCurrentEditId) return;
  if(!confirm('Delete this leave entry?')) return;
  try {
    var res = await fetch(WORKER_URL+'/leave-records/'+elCurrentEditId, {method:'DELETE', headers:getHeaders()});
    if(!res.ok) throw new Error('HTTP '+res.status);
    elRecords = elRecords.filter(function(r){ return r.id!==elCurrentEditId; });
    document.getElementById('el-entry-modal').style.display = 'none';
    toast('Entry deleted','ok');
    await loadLeaveData();
    if(elCurrentEmpId) openEmpDetail(elCurrentEmpId);
  } catch(err){ toast('Delete failed: '+err.message,'err'); }
}

function openAddHoliday() {
  elHolEditId = null;
  document.getElementById('el-hol-date').value = '';
  document.getElementById('el-hol-name').value = '';
  document.getElementById('el-hol-confirmed').checked = false;
  document.getElementById('el-hol-del').style.display = 'none';
  document.getElementById('el-holiday-modal').style.display = 'flex';
}

function openEditHoliday(id) {
  var h = elHolidays.find(function(x){ return x.id===id; });
  if(!h) return;
  elHolEditId = id;
  document.getElementById('el-hol-date').value      = h.fields['Date']||'';
  document.getElementById('el-hol-name').value      = h.fields['Name']||'';
  document.getElementById('el-hol-confirmed').checked = !!h.fields['Confirmed'];
  document.getElementById('el-hol-del').style.display = '';
  document.getElementById('el-holiday-modal').style.display = 'flex';
}

function openEditHoliday(id) {
  var h = elHolidays.find(function(x){ return x.id===id; });
  if(!h) return;
  elHolEditId = id;
  document.getElementById('el-hol-date').value = h.fields['Date']||'';
  document.getElementById('el-hol-name').value = h.fields['Name']||'';
  document.getElementById('el-hol-confirmed').checked = !!h.fields['Confirmed'];
  document.getElementById('el-hol-del').style.display = '';
  document.getElementById('el-holiday-modal').style.display = 'flex';
}

async function saveBankHoliday() {
  var date      = document.getElementById('el-hol-date').value;
  var name      = document.getElementById('el-hol-name').value.trim();
  var confirmed = document.getElementById('el-hol-confirmed').checked;
  if(!date||!name){ toast('Date and name are required','err'); return; }
  var fields = {Date:date, Name:name, Confirmed:confirmed};
  try {
    var method = elHolEditId ? 'PATCH' : 'POST';
    var url = WORKER_URL+'/bank-holidays'+(elHolEditId?'/'+elHolEditId:'');
    var res = await fetch(url, {method:method, headers:getHeaders(), body:JSON.stringify({fields:fields})});
    if(!res.ok) throw new Error('HTTP '+res.status);
    var data = await res.json();
    if(elHolEditId) {
      elHolidays = elHolidays.map(function(h){ return h.id===elHolEditId?data:h; });
    } else {
      elHolidays.push(data);
    }
    document.getElementById('el-holiday-modal').style.display = 'none';
    toast(elHolEditId?'Holiday updated':'Holiday added','ok');
    renderHolidaysBar();
    renderLeaveTable();
  } catch(err){ toast('Save failed: '+err.message,'err'); }
}

async function deleteBankHoliday() {
  if(!elHolEditId) return;
  if(!confirm('Delete this bank holiday?')) return;
  try {
    var res = await fetch(WORKER_URL+'/bank-holidays/'+elHolEditId, {method:'DELETE', headers:getHeaders()});
    if(!res.ok) throw new Error('HTTP '+res.status);
    elHolidays = elHolidays.filter(function(h){ return h.id!==elHolEditId; });
    document.getElementById('el-holiday-modal').style.display = 'none';
    toast('Holiday deleted','ok');
    renderHolidaysBar();
    renderLeaveTable();
  } catch(err){ toast('Delete failed: '+err.message,'err'); }
}

var elEntEditId = null; // null = add mode, string = edit mode

function openEntitlementModal() {
  var emp = empRecords.find(function(e){ return e.id===elCurrentEmpId; });
  if(!emp) return;
  renderEntitlementList(emp);
  document.getElementById('el-ent-modal').style.display='flex';
}

function renderEntitlementList(emp) {
  var f    = emp ? emp.fields : {};
  var ents = getEmpEntitlements(emp.id);
  var today= new Date(); today.setHours(0,0,0,0);
  var rows = ents.map(function(r){
    var p    = entPeriod(r);
    var isAct= p && today>=p.from && today<=p.to;
    var bg   = isAct ? 'background:var(--bg2)' : '';
    return '<tr style="border-bottom:1px solid var(--bdr);'+bg+'">'
      +'<td style="padding:7px 10px;font-size:12px;white-space:nowrap">'
        +(p ? elFmtDate(r.fields['Period_Start'])+' → '+elFmtDate(r.fields['Period_End']) : '—')
        +(isAct ? ' <span style="font-size:10px;color:var(--green);font-weight:600">▶ active</span>' : '')
      +'</td>'
      +'<td style="padding:7px 10px;text-align:center;font-family:monospace;font-weight:600;font-size:12px">'+(r.fields['Days']||'—')+'</td>'
      +'<td style="padding:7px 10px;font-size:11px;color:var(--txt3)">'+e(r.fields['Notes']||'')+'</td>'
      +'<td style="padding:7px 10px;white-space:nowrap">'
        +'<button onclick="openEntitlementForm(\''+r.id+'\')" style="background:none;border:1px solid var(--bdr2);border-radius:4px;padding:2px 7px;cursor:pointer;font-size:11px;margin-right:4px">Edit</button>'
        +'<button onclick="deleteEntitlementPeriod(\''+r.id+'\')" style="background:none;border:1px solid #f8514933;border-radius:4px;padding:2px 7px;cursor:pointer;font-size:11px;color:var(--red)">&#128465;</button>'
      +'</td>'
    +'</tr>';
  }).join('');

  document.getElementById('el-ent-modal').querySelector('.modal').innerHTML =
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">'
      +'<div class="modal-title" style="margin:0">Annual Entitlements</div>'
      +'<button onclick="document.getElementById(\'el-ent-modal\').style.display=\'none\'" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--txt3)">&#10005;</button>'
    +'</div>'
    +'<div style="border:1px solid var(--bdr2);border-radius:6px;overflow:hidden;margin-bottom:14px">'
      +(rows ? '<table style="border-collapse:collapse;font-size:13px;display:inline-table;min-width:100%">'
        +'<thead><tr style="background:var(--bg2)">'
          +'<th style="padding:6px 10px;text-align:left;font-size:11px;color:var(--txt2)">Period</th>'
          +'<th style="padding:6px 10px;text-align:center;font-size:11px;color:var(--txt2)">Days</th>'
          +'<th style="padding:6px 10px;text-align:left;font-size:11px;color:var(--txt2)">Notes</th>'
          +'<th></th>'
        +'</tr></thead><tbody>'+rows+'</tbody></table>'
      : '<div style="padding:14px;text-align:center;font-size:13px;color:var(--txt3)">No entitlement periods yet.</div>')
    +'</div>'
    +'<button class="btn-pri" onclick="openEntitlementForm(null)" style="width:100%;margin-bottom:16px">+ Add Period</button>'
    +'<div style="border-top:1px solid var(--bdr);padding-top:14px">'
      +'<div style="font-size:12px;font-weight:600;color:var(--txt2);margin-bottom:8px">Sick Leave Entitlement</div>'
      +'<div style="display:flex;align-items:center;gap:8px">'
        +'<input type="number" id="el-ent-sick" step="0.5" min="0" value="'+(f['Sick Leave Days']||'')+'" style="width:80px;padding:6px 8px;border:1px solid var(--bdr2);border-radius:6px;font-size:13px" placeholder="days">'
        +'<span style="font-size:13px;color:var(--txt2)">days per year</span>'
        +'<button class="btn-pri" onclick="saveSickLeave()" style="margin-left:auto;font-size:12px">Save</button>'
      +'</div>'
    +'</div>';
}

function openEntitlementForm(id) {
  elEntEditId = id;
  var r = id ? elEntitlements.find(function(x){ return x.id===id; }) : null;
  var f = r ? r.fields : {};
  document.getElementById('el-ent-modal').querySelector('.modal').innerHTML =
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">'
      +'<button onclick="openEntitlementModal()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--txt3)">&#8592;</button>'
      +'<div class="modal-title" style="margin:0">'+(id?'Edit':'Add')+' Annual Period</div>'
    +'</div>'
    +'<div class="form-grid">'
      +'<div class="field full"><label>Period Start</label>'
        +'<input type="date" id="el-ent-start" value="'+(f['Period_Start']||'')+'" style="padding:8px;border:1px solid var(--bdr2);border-radius:6px;font-size:13px;width:100%;box-sizing:border-box"></div>'
      +'<div class="field full"><label>Period End</label>'
        +'<input type="date" id="el-ent-end" value="'+(f['Period_End']||'')+'" style="padding:8px;border:1px solid var(--bdr2);border-radius:6px;font-size:13px;width:100%;box-sizing:border-box"></div>'
      +'<div class="field full"><label>Days Entitlement</label>'
        +'<input type="number" id="el-ent-days" step="0.5" min="0" value="'+(f['Days']||'')+'" placeholder="e.g. 22" style="padding:8px;border:1px solid var(--bdr2);border-radius:6px;font-size:13px;width:100%;box-sizing:border-box"></div>'
      +'<div class="field full"><label>Notes <span style="font-weight:400;color:var(--txt3)">(optional)</span></label>'
        +'<input type="text" id="el-ent-notes" value="'+e(f['Notes']||'')+'" placeholder="e.g. Increased from 22 days" style="padding:8px;border:1px solid var(--bdr2);border-radius:6px;font-size:13px;width:100%;box-sizing:border-box"></div>'
    +'</div>'
    +'<div class="modal-actions">'
      +'<button class="btn-cancel" onclick="openEntitlementModal()">Cancel</button>'
      +'<button class="btn-pri" onclick="saveEntitlementPeriod()">Save</button>'
    +'</div>';
}

async function saveEntitlementPeriod() {
  var start = document.getElementById('el-ent-start').value;
  var end   = document.getElementById('el-ent-end').value;
  var days  = parseFloat(document.getElementById('el-ent-days').value);
  var notes = document.getElementById('el-ent-notes').value.trim();
  if(!start||!end){ toast('Please set both start and end dates','err'); return; }
  if(isNaN(days)||days<=0){ toast('Please enter a valid number of days','err'); return; }
  if(new Date(start)>=new Date(end)){ toast('End date must be after start date','err'); return; }
  var fields = {'Employee':[elCurrentEmpId], 'Period_Start':start, 'Period_End':end, 'Days':days};
  if(notes) fields['Notes'] = notes;
  try {
    var res = elEntEditId
      ? await fetch(WORKER_URL+'/annual-entitlements/'+elEntEditId, {method:'PATCH',headers:getHeaders(),body:JSON.stringify({fields:fields})})
      : await fetch(WORKER_URL+'/annual-entitlements',              {method:'POST', headers:getHeaders(),body:JSON.stringify({fields:fields})});
    if(!res.ok) throw new Error('HTTP '+res.status);
    toast(elEntEditId?'Period updated':'Period added','ok');
    await loadLeaveData();
    var emp = empRecords.find(function(e){ return e.id===elCurrentEmpId; });
    renderEntitlementList(emp);
    openEmpDetail(elCurrentEmpId);
  } catch(err){ toast('Save failed: '+err.message,'err'); }
}

async function deleteEntitlementPeriod(id) {
  if(!confirm('Delete this entitlement period?')) return;
  try {
    var res = await fetch(WORKER_URL+'/annual-entitlements/'+id, {method:'DELETE',headers:getHeaders()});
    if(!res.ok) throw new Error('HTTP '+res.status);
    elEntitlements = elEntitlements.filter(function(r){ return r.id!==id; });
    toast('Period deleted','ok');
    var emp = empRecords.find(function(e){ return e.id===elCurrentEmpId; });
    renderEntitlementList(emp);
    openEmpDetail(elCurrentEmpId);
  } catch(err){ toast('Delete failed: '+err.message,'err'); }
}

async function saveSickLeave() {
  var sick = parseFloat(document.getElementById('el-ent-sick').value);
  if(isNaN(sick)){ toast('Please enter a valid number','err'); return; }
  try {
    var res = await fetch(WORKER_URL+'/employees/'+elCurrentEmpId, {
      method:'PATCH', headers:getHeaders(),
      body:JSON.stringify({fields:{'Sick Leave Days':sick}})
    });
    if(!res.ok) throw new Error('HTTP '+res.status);
    empRecords = empRecords.map(function(e){
      if(e.id!==elCurrentEmpId) return e;
      e.fields['Sick Leave Days'] = sick; return e;
    });
    toast('Sick leave entitlement saved','ok');
    openEmpDetail(elCurrentEmpId);
  } catch(err){ toast('Save failed: '+err.message,'err'); }
}




document.addEventListener("DOMContentLoaded",function(){
  ["login-user","login-pwd"].forEach(function(id){
    var el=document.getElementById(id);
    if(el)el.addEventListener("keydown",function(ev){if(ev.key==="Enter")document.querySelector(".lbtn").click();});
  });
  var vEl=document.getElementById('app-version');
  if(vEl) vEl.textContent=APP_VERSION;
  document.querySelectorAll('.top-bar .app-nav-wrap').forEach(function(navWrap){
    var ver=document.createElement('span');
    ver.style.cssText='font-size:10px;color:var(--txt3);font-family:monospace;letter-spacing:.4px;margin-right:8px;align-self:center;white-space:nowrap';
    ver.textContent=APP_VERSION;
    navWrap.parentNode.insertBefore(ver,navWrap);
  });
});

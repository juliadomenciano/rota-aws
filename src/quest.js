let C;
let bank = null;
let bankLoading = null;

export function initQuest(ctx) { C = ctx; }

const PROVA = { n: 65, min: 130, corte: 720, dist: { seg: 20, res: 17, des: 15, cus: 13 } };
const MIN_POR_ITEM = 2;
const LET = 'ABCDEFGH';

function Q() { const q = C.getDoc('quest'); q.marc = q.marc || {}; return q; }

export function aulaEstudada(id) {
  const p = C.getDoc('aulas').p[id];
  return !!(p && p.estudada);
}

export async function loadBank(force) {
  if (bank && !force) return bank;
  if (bankLoading) return bankLoading;
  bankLoading = (async () => {
    const list = (await C.loadCatalog()).filter((a) => !a.embreve);
    const items = [];
    for (const a of list) {
      let A;
      try { A = await C.fetchAula(a); } catch (e) { continue; }
      const push = (sits, tag) => (sits || []).forEach((s, si) => s.itens.forEach((it, ii) => {
        items.push({ id: `${a.id}:${tag}${si}-${ii}`, aula: a.id, aulaNome: `Aula ${a.numero}`, aulaTit: a.titulo, m: a.materia, sitKey: `${a.id}:${tag}${si}`, sitT: s.t, sitTxt: s.txt || '', e: it.e, o: it.o, g: it.g, x: it.x || [], sv: it.sv || [], d: it.d || 'res' });
      }));
      push(A.data.situacoes, '');
      push(A.data.banco, 'b');
    }
    bank = items;
    bankLoading = null;
    return items;
  })();
  return bankLoading;
}

export function judge(v, g) {
  if (!v || !v.length) return 'bl';
  if (v.length !== g.length) return 'bad';
  const s = new Set(g);
  return v.every((i) => s.has(i)) ? 'ok' : 'bad';
}

export function record(id, v, g, em) {
  const q = Q();
  const h = q.hist[id] || (q.hist[id] = { n: 0, ok: 0 });
  const r = judge(v, g);
  h.n++; if (r === 'ok') h.ok++;
  h.r = r; h.em = em || C.dkey();
  if (r === 'ok') delete q.erros[id];
  else if (!q.erros[id]) q.erros[id] = { desde: h.em };
  C.save('quest');
  return r;
}

export function stats() {
  const q = Q();
  let n = 0, ok = 0, bad = 0, bl = 0;
  const porM = {}, porD = {}, porS = {};
  const byId = bank ? Object.fromEntries(bank.map((x) => [x.id, x])) : {};
  const add = (o, k, r) => { const x = o[k] || (o[k] = { n: 0, ok: 0, bad: 0 }); x.n++; if (r === 'ok') x.ok++; else if (r === 'bad') x.bad++; };
  Object.entries(q.hist).forEach(([id, h]) => {
    n++;
    if (h.r === 'ok') ok++; else if (h.r === 'bad') bad++; else bl++;
    const it = byId[id];
    add(porM, it ? it.m : C.aulaMateria(id.split(':')[0]), h.r);
    if (it) { add(porD, it.d, h.r); it.sv.forEach((s) => add(porS, s, h.r)); }
  });
  return { n, ok, bad, bl, porM, porD, porS, erros: Object.keys(q.erros).length, sims: q.sims };
}

function shuffle(a, rnd = Math.random) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function seeded(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; };
}

function pickBySit(pool, n, rnd) {
  const bySit = {};
  pool.forEach((it) => { (bySit[it.sitKey] = bySit[it.sitKey] || []).push(it); });
  const keys = shuffle(Object.keys(bySit), rnd);
  const out = [];
  const big = keys.filter((k) => bySit[k][0].sitTxt);
  const solo = shuffle(keys.filter((k) => !bySit[k][0].sitTxt).flatMap((k) => bySit[k]), rnd);
  for (const k of big) {
    if (out.length >= Math.ceil(n * 0.35)) break;
    const its = shuffle([...bySit[k]], rnd).slice(0, 3);
    out.push(...its.slice(0, n - out.length));
  }
  for (const it of solo) { if (out.length >= n) break; out.push(it); }
  if (out.length < n) for (const k of big) for (const it of bySit[k]) { if (out.length >= n) break; if (!out.includes(it)) out.push(it); }
  return out;
}

function domPill(d) { const D = C.DM[d]; return D ? `<span class="pill dom" style="--c:${D.c}">${C.esc(D.n)}</span>` : ''; }

export function itemHTML(it, num, st, opts = {}) {
  st = st || {};
  const v = st.v || [];
  const show = st.done && !opts.hideFb;
  const r = show ? judge(v, it.g) : '';
  const need = it.g.length;
  const lock = st.done && !opts.editable;
  const opt = it.o.map((t, i) => {
    const sel = v.includes(i);
    const cls = show ? (it.g.includes(i) ? ' right' : sel ? ' wrong' : '') : '';
    return `<div class="optw${cls}"><button type="button" class="opt${sel ? ' sel' : ''}${cls}" data-i="${i}" aria-pressed="${sel}" ${lock ? 'disabled' : ''}><span class="L">${LET[i]}</span><span class="ot">${t}</span></button>${show && it.x[i] ? `<div class="ox">${it.g.includes(i) ? '<b class="okc">Correta.</b> ' : '<b class="badc">Incorreta.</b> '}${it.x[i]}</div>` : ''}</div>`;
  }).join('');
  const res = show ? (r === 'ok' ? '<span class="res okc">Você acertou.</span>' : r === 'bad' ? '<span class="res badc">Você errou.</span>' : '<span class="res">Sem resposta.</span>') : '';
  const meta = `<div class="qmeta">${domPill(it.d)}${(it.sv || []).slice(0, 4).map((s) => `<span class="pill sv">${C.esc(s)}</span>`).join('')}${need > 1 ? `<span class="pill warn">Escolha ${['', 'uma', 'duas', 'três', 'quatro'][need] || need}</span>` : ''}</div>`;
  const conf = !st.done && !opts.noConfirm && (need > 1 || !opts.instant) && opts.confirm !== false ? `<button type="button" class="btn sm primary qconf" ${v.length ? '' : 'disabled'}>Responder</button>` : '';
  const flag = opts.flag ? `<button type="button" class="btn sm ghost qflag" aria-pressed="${!!opts.flagged}">${opts.flagged ? '★ Marcada para revisar' : '☆ Marcar para revisar'}</button>` : '';
  return `<div class="item mc${show ? ' done ' + (r === 'ok' ? 'right' : r === 'bad' ? 'wrong' : 'blank') : ''}" data-id="${it.id || ''}"><div class="st"><span class="n">${num}</span><div class="qbody">${meta}<p>${it.e}</p></div></div><div class="opts">${opt}</div>${conf || flag || res ? `<div class="row qfoot">${res}${conf}${flag}</div>` : ''}</div>`;
}

export function bindItem(el, it, st, opts, onChange) {
  const need = it.g.length;
  el.querySelectorAll('.opt').forEach((b) => b.onclick = () => {
    if (st.done && !opts.editable) return;
    const i = +b.dataset.i;
    let v = [...(st.v || [])];
    if (need === 1) v = [i];
    else if (v.includes(i)) v = v.filter((x) => x !== i);
    else v.push(i);
    v.sort((a, b2) => a - b2);
    st.v = v;
    if (opts.instant && need === 1) { st.done = true; onChange('answer'); return; }
    onChange('select');
  });
  const cf = el.querySelector('.qconf');
  if (cf) cf.onclick = () => { if (!(st.v || []).length) return; st.done = true; onChange('answer'); };
  const fl = el.querySelector('.qflag');
  if (fl) fl.onclick = () => onChange('flag');
}

function runnerHTML(sess, itemsById, opts) {
  let lastSit = null, html = '', num = 0;
  sess.itens.forEach((id) => {
    const it = itemsById[id];
    if (!it) return;
    num++;
    if (it.sitKey !== lastSit) {
      if (lastSit) html += '</div>';
      html += `<div class="sit"><div class="sit-h"><span class="lbl" style="color:${C.MM[it.m]?.c || 'var(--q)'}">${C.esc(it.aulaNome)} · ${C.esc(it.sitT)}</span>${it.sitTxt ? `<p>${it.sitTxt}</p>` : ''}</div>`;
      lastSit = it.sitKey;
    }
    html += itemHTML(it, num, sess.resp[id], opts);
  });
  if (lastSit) html += '</div>';
  return html;
}

function score(sess, itemsById) {
  let ok = 0, bad = 0, bl = 0, done = 0;
  const dom = {};
  sess.itens.forEach((id) => {
    const it = itemsById[id]; if (!it) return;
    const st = sess.resp[id];
    const d = dom[it.d] || (dom[it.d] = { ok: 0, n: 0 }); d.n++;
    if (st && st.done) done++;
    const r = judge(st && st.v, it.g);
    if (r === 'ok') { ok++; d.ok++; } else if (r === 'bad') bad++; else bl++;
  });
  const total = sess.itens.length;
  const pct = total ? ok / total : 0;
  return { ok, bad, bl, done, total, pct, nota: Math.round(100 + 900 * pct), dom };
}

function scoreBar(sc, extra) {
  return `<div class="score" aria-live="polite"><div><div class="k">Acertos</div><div class="v ok">${sc.ok}</div></div><div><div class="k">Erros</div><div class="v bad">${sc.bad}</div></div><div><div class="k">Sem resposta</div><div class="v">${sc.bl}</div></div><div><div class="k">Acerto</div><div class="v ${sc.pct >= 0.72 ? 'ok' : sc.ok + sc.bad ? 'bad' : ''}">${Math.round(sc.pct * 100)}%</div></div>${extra || ''}</div>`;
}

function bindRunner(root, sess, itemsById, opts, onChange) {
  root.querySelectorAll('.item[data-id]').forEach((d) => {
    const id = d.dataset.id;
    const it = itemsById[id];
    if (!it) return;
    const st = sess.resp[id] || {};
    bindItem(d, it, st, opts, (t) => {
      sess.resp[id] = st;
      if (t === 'answer' && opts.instant) record(id, st.v, it.g);
      if (t === 'answer' && !opts.instant) st.done = false;
      onChange(id, t);
    });
  });
}

export async function renderQdia(v) {
  const cfg = C.getDoc('cfg');
  const qc = cfg.qdia || (cfg.qdia = { n: 5, todas: false });
  v.innerHTML = '<p class="empty">Carregando questões…</p>';
  const items = await loadBank();
  const byId = Object.fromEntries(items.map((x) => [x.id, x]));
  const q = Q();
  const hoje = C.dkey();
  const estudadas = items.filter((it) => aulaEstudada(it.aula));
  const pool = qc.todas ? items : estudadas;
  if (!q.qdia || q.qdia.d !== hoje || !q.qdia.ids.every((id) => byId[id])) {
    if (!pool.length) {
      v.innerHTML = `<div class="vhead"><h1>Questão do dia</h1></div><div class="card"><h2>Nenhuma aula marcada como estudada ainda</h2><p class="muted">A questão do dia usa as aulas que você marcou como estudadas. Abra uma aula e toque em "Marcar como estudada", ou inclua todas as aulas.</p><div class="row"><button class="btn primary" type="button" id="qdTodas">Incluir aulas não estudadas</button><button class="btn" type="button" data-go="aulas">Ir para Aulas</button></div></div>`;
      v.querySelector('#qdTodas').onclick = () => { qc.todas = true; C.save('cfg'); renderQdia(v); };
      return;
    }
    const rnd = seeded(hoje);
    const nunca = pool.filter((x) => !q.hist[x.id]);
    const errados = pool.filter((x) => q.erros[x.id]);
    const pref = [...shuffle([...errados], rnd).slice(0, Math.ceil(qc.n / 2)), ...shuffle([...nunca], rnd)];
    const chosen = [];
    for (const it of [...pref, ...shuffle([...pool], rnd)]) { if (chosen.length >= qc.n) break; if (!chosen.includes(it.id)) chosen.push(it.id); }
    chosen.sort((a, b) => (byId[a].sitKey < byId[b].sitKey ? -1 : 1));
    q.qdia = { d: hoje, ids: chosen, resp: {} };
    C.save('quest');
  }
  const sess = { itens: q.qdia.ids, resp: q.qdia.resp };
  const draw = () => {
    const sc = score(sess, byId);
    const fim = sc.done === sc.total;
    v.innerHTML = `<div class="vhead"><span class="k">${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</span><h1>Questão do dia</h1><p class="muted">${sc.total} questões ${qc.todas ? 'de todas as aulas' : 'das aulas que você já estudou'}, com prioridade para as que você errou e as que nunca respondeu.</p></div>
      ${fim ? `<div class="card accent" style="--c:var(--ok)"><h2>Feito por hoje ✓</h2><p>${sc.ok} de ${sc.total} certas (${Math.round(sc.pct * 100)}%). Os erros foram para o caderno de erros.</p><div class="row"><button class="btn sm" type="button" data-go="erros">Abrir caderno de erros</button></div></div>` : ''}
      <div id="qdRun" style="display:grid;gap:16px">${runnerHTML(sess, byId, { instant: true })}</div>${scoreBar(sc, `<div class="grow muted small">${sc.done} de ${sc.total}</div>`)}`;
    bindRunner(v.querySelector('#qdRun'), sess, byId, { instant: true }, () => { C.save('quest'); const y = window.scrollY; draw(); window.scrollTo(0, y); });
  };
  draw();
}

let errosSess = null;
let errosModo = 'dom';
export async function renderErros(v) {
  v.innerHTML = '<p class="empty">Carregando…</p>';
  const items = await loadBank();
  const byId = Object.fromEntries(items.map((x) => [x.id, x]));
  const q = Q();
  const ids = Object.keys(q.erros).filter((id) => byId[id]);
  if (errosSess) {
    const sess = errosSess;
    C.setBack(() => { sairErros(v); return true; });
    const draw = () => {
      const sc = score(sess, byId);
      const fim = sc.done === sc.total;
      v.innerHTML = `<div class="row between"><div class="vhead"><h1>Refazendo erros</h1><p class="muted">Acertou, saiu do caderno. Errou de novo, continua nele.</p></div><button class="btn sm" type="button" id="erSair">${fim ? 'Concluir' : 'Sair'}</button></div><div id="erRun" style="display:grid;gap:16px">${runnerHTML(sess, byId, { instant: true })}</div>${scoreBar(sc, `<div class="grow muted small">${sc.done} de ${sc.total}</div>`)}`;
      bindRunner(v.querySelector('#erRun'), sess, byId, { instant: true }, () => { const y = window.scrollY; draw(); window.scrollTo(0, y); });
      v.querySelector('#erSair').onclick = () => { if (fim) { errosSess = null; C.setBack(null); renderErros(v); } else sairErros(v); };
    };
    draw();
    return;
  }
  C.setBack(null);
  const grp = {};
  ids.forEach((id) => {
    const it = byId[id];
    const keys = errosModo === 'dom' ? [it.d] : errosModo === 'sv' ? (it.sv.length ? it.sv : ['Outros']) : [it.aula];
    keys.forEach((k) => (grp[k] = grp[k] || []).push(id));
  });
  const label = (k) => errosModo === 'dom' ? (C.DM[k]?.n || k) : errosModo === 'sv' ? k : (byId[grp[k][0]].aulaNome + ' · ' + byId[grp[k][0]].aulaTit);
  const color = (k) => errosModo === 'dom' ? C.DM[k]?.c : errosModo === 'aula' ? C.MM[byId[grp[k][0]].m]?.c : 'var(--q)';
  const ord = Object.keys(grp).sort((a, b) => grp[b].length - grp[a].length);
  v.innerHTML = `<div class="vhead"><h1>Caderno de erros</h1><p class="muted">Toda questão que você errar ou deixar sem resposta (nas aulas, na questão do dia ou nos simulados) vem para cá até você acertar.</p></div>
    ${ids.length ? `<div class="card"><div class="row between"><h2>${ids.length} ${ids.length === 1 ? 'questão' : 'questões'} para refazer</h2><button class="btn primary" type="button" id="erAll">Refazer ${Math.min(30, ids.length)}</button></div>
      <div class="seg" id="erModo"><button type="button" data-m="dom" aria-pressed="${errosModo === 'dom'}">Por domínio</button><button type="button" data-m="sv" aria-pressed="${errosModo === 'sv'}">Por serviço</button><button type="button" data-m="aula" aria-pressed="${errosModo === 'aula'}">Por aula</button></div>
      <div class="list">${ord.map((k) => `<div class="li"><span class="dot" style="--c:${color(k) || 'var(--q)'}"></span><span class="t">${C.esc(label(k))}</span><span class="num small">${grp[k].length}</span><button class="btn sm" type="button" data-k="${C.esc(k)}">Refazer</button></div>`).join('')}</div></div>
      <div class="card"><h2>Questões no caderno</h2><div class="list">${ids.slice(0, 60).map((id) => { const it = byId[id]; return `<details class="erro"><summary><span class="dot" style="--c:${C.DM[it.d]?.c}"></span> ${it.e}</summary><div class="small">${it.o.map((o, i) => `<p>${it.g.includes(i) ? '✓' : '✗'} <b>${LET[i]}.</b> ${o}${it.x[i] ? ` <span class="muted">${it.x[i]}</span>` : ''}</p>`).join('')}</div><p class="small muted">${C.esc(it.aulaNome)} · ${C.esc(it.sv.join(', '))} · no caderno desde ${C.fmtDate(q.erros[id].desde)}</p></details>`; }).join('')}</div></div>`
    : `<div class="card accent" style="--c:var(--ok)"><h2>Caderno vazio 🎯</h2><p class="muted">Nenhum erro pendente. As questões que você errar daqui em diante aparecem aqui.</p></div>`}`;
  const start = (list) => { errosSess = { snap: C.clone({ hist: q.hist, erros: q.erros }), itens: shuffle([...new Set(list)]).slice(0, 30).sort((a, b) => (byId[a].sitKey < byId[b].sitKey ? -1 : 1)), resp: {} }; renderErros(v); };
  const all = v.querySelector('#erAll'); if (all) all.onclick = () => start(ids);
  v.querySelectorAll('#erModo button').forEach((b) => b.onclick = () => { errosModo = b.dataset.m; renderErros(v); });
  v.querySelectorAll('[data-k]').forEach((b) => b.onclick = () => start(grp[b.dataset.k]));
}

function simGet() { return C.local.get('sim'); }
function simSet(s) { C.local.set('sim', s); }
let simTick = null;

async function sairErros(v) {
  const sess = errosSess;
  if (!sess || document.querySelector('.modal-bg')) return;
  const feitas = Object.values(sess.resp).filter((r) => r && r.done).length;
  if (!feitas) { errosSess = null; C.setBack(null); renderErros(v); return; }
  const r = await C.askExit('Sair do refazer erros?', `Você já respondeu ${feitas} ${feitas === 1 ? 'questão' : 'questões'} nesta rodada.`, [{ t: 'Continuar', v: 'cont', cls: 'primary' }, { t: 'Salvar o que fiz', v: 'salvar' }, { t: 'Descartar a rodada', v: 'desc', cls: 'danger' }]);
  if (r === 'cont') return;
  if (r === 'desc') { const q = Q(); q.hist = sess.snap.hist; q.erros = sess.snap.erros; C.save('quest'); C.toast('Rodada descartada.'); }
  else C.toast('Respostas salvas.');
  errosSess = null; C.setBack(null); C.renderNav(); renderErros(v);
}

function respondidas(sim) { return sim.itens.filter((id) => sim.resp[id] && sim.resp[id].v && sim.resp[id].v.length); }

async function sairSim(v, sim, byId) {
  if (document.querySelector('.modal-bg,.confirm')) return;
  const n = respondidas(sim).length;
  const opts = [{ t: 'Continuar', v: 'cont', cls: 'primary' }];
  if (n) opts.push({ t: n === 1 ? 'Salvar o que fiz (entregar a questão respondida)' : `Salvar o que fiz (entregar as ${n} respondidas)`, v: 'salvar' });
  opts.push({ t: 'Descartar o simulado', v: 'desc', cls: 'danger' });
  const r = await C.askExit('Sair do simulado?', n ? `Você respondeu ${n} de ${sim.itens.length} questões. O tempo continua correndo enquanto o simulado estiver aberto.` : 'Você ainda não respondeu nenhuma questão.', opts);
  if (r === 'salvar') return finishSim(v, sim, byId, false, true);
  if (r === 'desc') { clearInterval(simTick); C.cancelSeries(); simSet(null); C.setBack(null); C.toast('Simulado descartado.'); renderSimulados(v); }
}

function avisoTempo(sim, left) {
  const w = (sim.modo === 'prova' ? 10 : 5) * 60000;
  if (sim.dur <= w * 2 || left > w || left <= 0) return;
  sim.av = sim.av || {};
  if (sim.av.w) return;
  sim.av.w = true; simSet(sim);
  C.beepT(); C.toast(`Faltam ${Math.ceil(left / 60000)} minutos.`);
}

function agendaAvisos(sim) {
  if (C.getDoc('cfg').somAviso === false) return;
  const fim = sim.ini + sim.dur;
  const w = (sim.modo === 'prova' ? 10 : 5) * 60000;
  const list = [];
  if (sim.dur > w * 2) list.push({ at: fim - w, title: `Faltam ${w / 60000} minutos`, body: 'Simulado em andamento no Rota AWS.' });
  list.push({ at: fim, title: 'Tempo do simulado esgotado', body: 'Abra o Rota AWS para ver o resultado.' });
  C.scheduleSeries(list);
}

export async function renderSimulados(v) {
  clearInterval(simTick);
  C.setBack(null);
  v.innerHTML = '<p class="empty">Carregando banco de questões…</p>';
  const items = await loadBank();
  const byId = Object.fromEntries(items.map((x) => [x.id, x]));
  const sim = simGet();
  if (sim && !sim.fim) { C.setBack(() => { sairSim(v, sim, byId); return true; }); return runSim(v, sim, byId); }
  if (sim && sim.fim) return resultSim(v, sim, byId);
  configSim(v, items);
}

function simLabel(s) {
  if (s.modo === 'prova') return 'Modo prova real';
  if (s.modo === 'dominio') return 'Domínio ' + (C.DM[s.dom]?.n || '');
  if (s.modo === 'aula') return s.aulaNome || 'Por aula';
  if (s.modo === 'servico') return 'Serviço ' + (s.sv || '');
  return 'Misto';
}

function configSim(v, items) {
  const conf = Object.assign({ modo: 'dominio', dom: 'seg', aula: '', sv: '', n: 20, estudadas: true, real: false }, C.local.get('simConf') || {});
  const aulas = [...new Map(items.map((x) => [x.aula, x])).values()];
  if (!conf.aula && aulas[0]) conf.aula = aulas[0].aula;
  const svCount = {};
  items.forEach((x) => x.sv.forEach((s) => { svCount[s] = (svCount[s] || 0) + 1; }));
  const svs = Object.keys(svCount).filter((s) => svCount[s] >= 4).sort((a, b) => a.localeCompare(b));
  if (!conf.sv || !svs.includes(conf.sv)) conf.sv = svs[0] || '';
  const filt = (c) => items.filter((x) => (c.modo === 'prova' || c.modo === 'misto' || (c.modo === 'dominio' && x.d === c.dom) || (c.modo === 'aula' && x.aula === c.aula) || (c.modo === 'servico' && x.sv.includes(c.sv))) && (!c.estudadas || aulaEstudada(x.aula)));
  const hist = Q().sims.slice(-8).reverse();
  const draw = () => {
    const disp = filt(conf).length;
    const prova = conf.modo === 'prova';
    v.innerHTML = `<div class="vhead"><h1>Simulados</h1><p class="muted">Questões no formato da prova: alternativa única ou múltipla resposta.</p></div>
    <div class="card"><h2>Novo simulado</h2>
      <div class="seg" id="smModo">${[['dominio', 'Por domínio'], ['aula', 'Por aula'], ['servico', 'Por serviço'], ['misto', 'Misto'], ['prova', 'Prova real']].map(([k, n]) => `<button type="button" data-v="${k}" aria-pressed="${conf.modo === k}">${n}</button>`).join('')}</div>
      ${prova ? `<p class="small muted">${PROVA.n} questões em ${PROVA.min} minutos, distribuídas pelos domínios (Segura ${PROVA.dist.seg}, Resiliente ${PROVA.dist.res}, Alto desempenho ${PROVA.dist.des}, Custo ${PROVA.dist.cus}). Uma por tela, com "marcar para revisar" e gabarito só no final. A nota é estimada na escala de 100 a 1000, com corte de ${PROVA.corte}.</p>`
      : `<div class="form">${conf.modo === 'dominio' ? `<label class="f">Domínio<select id="smD">${C.DOM.map((d) => `<option value="${d.id}" ${d.id === conf.dom ? 'selected' : ''}>${C.esc(d.n)} (${d.p}%)</option>`).join('')}</select></label>` : ''}${conf.modo === 'aula' ? `<label class="f">Aula<select id="smA">${aulas.map((a) => `<option value="${a.aula}" ${a.aula === conf.aula ? 'selected' : ''}>${C.esc(a.aulaNome + ' · ' + a.aulaTit)}</option>`).join('')}</select></label>` : ''}${conf.modo === 'servico' ? `<label class="f">Serviço<select id="smS">${svs.map((s) => `<option ${s === conf.sv ? 'selected' : ''}>${C.esc(s)}</option>`).join('')}</select></label>` : ''}<label class="f">Quantidade<input type="number" id="smN" min="5" max="65" value="${conf.n}"></label></div>
      <label class="row small"><input type="checkbox" id="smReal" ${conf.real ? 'checked' : ''}> Sem gabarito até entregar, com o tempo correndo</label>`}
      <label class="row small"><input type="checkbox" id="smEst" ${conf.estudadas ? 'checked' : ''}> Só do que já estudei (aulas marcadas como estudadas)</label>
      <label class="row small"><input type="checkbox" id="smSom" ${C.getDoc('cfg').somAviso !== false ? 'checked' : ''}> Aviso sonoro, vibração e notificação quando o tempo estiver acabando e quando esgotar</label>
      <p class="small ${disp ? 'muted' : ''}" style="${disp ? '' : 'color:var(--warn)'}">${disp ? `${disp} questões disponíveis com esses filtros.` : 'Nenhuma questão disponível com esses filtros. Desmarque "Só do que já estudei" ou marque aulas como estudadas.'}</p>
      <button class="btn primary" type="button" id="smGo" ${disp ? '' : 'disabled'} style="justify-self:start">Começar</button>
    </div>
    ${hist.length ? `<div class="card"><h2>Últimos simulados</h2><div class="list">${hist.map((s) => `<div class="li"><span class="t"><b>${C.esc(simLabel(s))}</b> · ${s.total} questões<br><span class="small muted">${C.fmtDate(s.em)} · ${s.ok}✓ ${s.bad}✗ ${s.bl}○ · ${s.min} min</span></span><span class="pill ${s.modo === 'prova' ? (s.nota >= PROVA.corte ? 'ok' : 'bad') : s.pct >= 0.72 ? 'ok' : ''} num">${s.modo === 'prova' ? s.nota : Math.round(s.pct * 100) + '%'}</span></div>`).join('')}</div></div>` : ''}`;
    v.querySelectorAll('#smModo button').forEach((b) => b.onclick = () => { conf.modo = b.dataset.v; draw(); });
    const sd = v.querySelector('#smD'); if (sd) sd.onchange = (e) => { conf.dom = e.target.value; draw(); };
    const sa = v.querySelector('#smA'); if (sa) sa.onchange = (e) => { conf.aula = e.target.value; draw(); };
    const ss = v.querySelector('#smS'); if (ss) ss.onchange = (e) => { conf.sv = e.target.value; draw(); };
    const sn = v.querySelector('#smN'); if (sn) sn.onchange = (e) => { conf.n = Math.max(5, Math.min(65, +e.target.value || 20)); };
    v.querySelector('#smEst').onchange = (e) => { conf.estudadas = e.target.checked; draw(); };
    v.querySelector('#smSom').onchange = (e) => { const c = C.getDoc('cfg'); c.somAviso = e.target.checked; C.save('cfg'); if (e.target.checked) { C.unlockAudio(); C.beepT(true); } };
    const sr = v.querySelector('#smReal'); if (sr) sr.onchange = (e) => { conf.real = e.target.checked; };
    v.querySelector('#smGo').onclick = async () => {
      C.unlockAudio();
      if (C.isNative && C.getDoc('cfg').somAviso !== false) await C.askPermission();
      C.local.set('simConf', conf);
      const pool = filt(conf);
      let chosen = [], falta = 0;
      if (prova) {
        Object.entries(PROVA.dist).forEach(([d, n]) => { const got = pickBySit(pool.filter((x) => x.d === d), n); chosen.push(...got); falta += n - got.length; });
        if (falta > 0) { const rest = shuffle(pool.filter((x) => !chosen.includes(x))).slice(0, falta); chosen.push(...rest); falta -= rest.length; }
        chosen = shuffle(chosen);
      } else {
        chosen = pickBySit(pool, conf.n);
        chosen.sort((a, b) => (a.sitKey < b.sitKey ? -1 : 1));
      }
      const dur = (prova ? PROVA.min : Math.ceil(chosen.length * MIN_POR_ITEM)) * 60000;
      const a0 = aulas.find((a) => a.aula === conf.aula);
      const novo = { id: C.uid(), modo: conf.modo, dom: conf.dom, aula: conf.aula, aulaNome: a0 ? a0.aulaNome : '', sv: conf.sv, real: prova || conf.real, ini: Date.now(), dur, itens: chosen.map((x) => x.id), resp: {}, marc: {}, pos: 0, falta, fim: null };
      simSet(novo);
      agendaAvisos(novo);
      renderSimulados(v);
    };
  };
  draw();
}

function runSim(v, sim, byId) {
  if (sim.modo === 'prova') return runProva(v, sim, byId);
  const real = sim.real;
  const draw = () => {
    const sc = score(sim, byId);
    const answered = Object.values(sim.resp).filter((r) => r.v && r.v.length).length;
    v.innerHTML = `<div class="sim-top"><div><span class="k">${C.esc(simLabel(sim))}${real ? ' · sem gabarito' : ''}</span><div class="big num" id="smTime"></div></div><div class="row"><span class="muted small num">${answered} de ${sim.itens.length} respondidas</span><button class="btn primary sm" type="button" id="smEnd">Entregar</button><button class="btn ghost sm" type="button" id="smQuit">Sair</button></div></div>
      <div id="smRun" style="display:grid;gap:16px">${runnerHTML(sim, byId, { instant: !real, hideFb: real, editable: real, confirm: !real })}</div>
      ${real ? '' : scoreBar(sc)}
      <div class="row" style="margin-top:6px"><button class="btn primary" type="button" id="smEnd2">Entregar simulado</button></div>`;
    bindRunner(v.querySelector('#smRun'), sim, byId, { instant: !real, editable: real }, () => { simSet(sim); const y = window.scrollY; draw(); window.scrollTo(0, y); });
    const end = () => finishSim(v, sim, byId);
    v.querySelector('#smEnd').onclick = () => confirmEnd(v, sim, end);
    v.querySelector('#smEnd2').onclick = () => confirmEnd(v, sim, end);
    v.querySelector('#smQuit').onclick = () => sairSim(v, sim, byId);
    upd();
  };
  const upd = () => {
    const left = sim.ini + sim.dur - Date.now();
    const el = v.querySelector('#smTime');
    avisoTempo(sim, left);
    if (el) { el.textContent = (left < 0 ? '00:00' : C.fmtClockH(left)); el.style.color = left < 5 * 60000 ? 'var(--bad)' : ''; }
    if (left <= 0) { clearInterval(simTick); finishSim(v, sim, byId, true); }
  };
  clearInterval(simTick);
  simTick = setInterval(() => { if (!document.body.contains(v) || !v.classList.contains('on')) return; upd(); }, 1000);
  draw();
}

function runProva(v, sim, byId) {
  sim.marc = sim.marc || {};
  let grade = false;
  const draw = () => {
    const n = sim.itens.length;
    const answered = sim.itens.filter((id) => sim.resp[id] && sim.resp[id].v && sim.resp[id].v.length).length;
    const nm = Object.values(sim.marc).filter(Boolean).length;
    const top = `<div class="sim-top"><div><span class="k">Modo prova real</span><div class="big num" id="smTime"></div></div><div class="row"><span class="muted small num">${answered}/${n} · ${nm} ★</span><button class="btn sm" type="button" id="pvGrid">${grade ? 'Voltar à questão' : 'Revisar todas'}</button><button class="btn primary sm" type="button" id="smEnd">Entregar</button><button class="btn ghost sm" type="button" id="smQuit">Sair</button></div></div>`;
    if (grade) {
      v.innerHTML = `${top}<div class="card"><h2>Revisão</h2><p class="small muted">Toque no número para ir até a questão. Verde: respondida. ★: marcada para revisar. Contorno: sem resposta.</p><div class="pgrid">${sim.itens.map((id, i) => { const r = sim.resp[id]; const a = r && r.v && r.v.length; return `<button type="button" class="pg${a ? ' a' : ''}${sim.marc[id] ? ' m' : ''}" data-i="${i}">${i + 1}${sim.marc[id] ? '★' : ''}</button>`; }).join('')}</div><div class="row"><button class="btn sm" type="button" id="pvMarc" ${nm ? '' : 'disabled'}>Ir para a 1ª marcada</button><button class="btn sm" type="button" id="pvBl" ${answered < n ? '' : 'disabled'}>Ir para a 1ª sem resposta</button></div></div>`;
      v.querySelectorAll('.pg').forEach((b) => b.onclick = () => { sim.pos = +b.dataset.i; grade = false; simSet(sim); draw(); });
      const jm = v.querySelector('#pvMarc'); if (jm) jm.onclick = () => { sim.pos = sim.itens.findIndex((id) => sim.marc[id]); grade = false; draw(); };
      const jb = v.querySelector('#pvBl'); if (jb) jb.onclick = () => { sim.pos = sim.itens.findIndex((id) => !(sim.resp[id] && sim.resp[id].v && sim.resp[id].v.length)); grade = false; draw(); };
    } else {
      const id = sim.itens[sim.pos];
      const it = byId[id];
      const st = sim.resp[id] || (sim.resp[id] = {});
      v.innerHTML = `${top}<div class="sit">${it.sitTxt ? `<div class="sit-h"><span class="lbl">Cenário</span><p>${it.sitTxt}</p></div>` : ''}${itemHTML({ ...it, d: '', sv: [] }, sim.pos + 1, st, { hideFb: true, editable: true, confirm: false, flag: true, flagged: !!sim.marc[id] })}</div>
        <div class="row between pnav"><button class="btn" type="button" id="pvPrev" ${sim.pos ? '' : 'disabled'}>← Anterior</button><span class="muted small num">${sim.pos + 1} de ${n}</span><button class="btn ${sim.pos < n - 1 ? 'primary' : ''}" type="button" id="pvNext">${sim.pos < n - 1 ? 'Próxima →' : 'Revisar todas'}</button></div>`;
      const el = v.querySelector('.item');
      bindItem(el, it, st, { editable: true }, (t) => { if (t === 'flag') sim.marc[id] = !sim.marc[id]; simSet(sim); draw(); });
      v.querySelector('#pvPrev').onclick = () => { if (sim.pos) { sim.pos--; simSet(sim); draw(); window.scrollTo(0, 0); } };
      v.querySelector('#pvNext').onclick = () => { if (sim.pos < n - 1) { sim.pos++; simSet(sim); draw(); window.scrollTo(0, 0); } else { grade = true; draw(); } };
    }
    v.querySelector('#pvGrid').onclick = () => { grade = !grade; draw(); window.scrollTo(0, 0); };
    v.querySelector('#smEnd').onclick = () => confirmEnd(v, sim, () => finishSim(v, sim, byId));
    v.querySelector('#smQuit').onclick = () => sairSim(v, sim, byId);
    upd();
  };
  const upd = () => {
    const left = sim.ini + sim.dur - Date.now();
    const el = v.querySelector('#smTime');
    avisoTempo(sim, left);
    if (el) { el.textContent = (left < 0 ? '00:00' : C.fmtClockH(left)); el.style.color = left < 10 * 60000 ? 'var(--bad)' : ''; }
    if (left <= 0) { clearInterval(simTick); finishSim(v, sim, byId, true); }
  };
  clearInterval(simTick);
  simTick = setInterval(() => { if (!document.body.contains(v) || !v.classList.contains('on')) return; upd(); }, 1000);
  draw();
}

function confirmEnd(v, sim, end) {
  const pend = sim.itens.filter((id) => !sim.resp[id] || !sim.resp[id].v || !sim.resp[id].v.length).length;
  const nm = Object.values(sim.marc || {}).filter(Boolean).length;
  if (!pend && !nm) return end();
  const box = document.createElement('div');
  box.className = 'confirm';
  box.innerHTML = `<div class="card"><h2>Entregar agora?</h2><p>${pend ? `${pend} ${pend === 1 ? 'questão ficará' : 'questões ficarão'} sem resposta e ${pend === 1 ? 'conta' : 'contam'} como erro.` : ''}${pend && nm ? ' ' : ''}${nm ? `${nm} ${nm === 1 ? 'questão está marcada' : 'questões estão marcadas'} para revisar.` : ''}</p><div class="row"><button class="btn primary" type="button" data-a="y">Entregar</button><button class="btn" type="button" data-a="n">Continuar</button></div></div>`;
  document.body.appendChild(box);
  box.querySelector('[data-a=y]').onclick = () => { box.remove(); end(); };
  box.querySelector('[data-a=n]').onclick = () => box.remove();
}

function finishSim(v, sim, byId, porTempo, soResp) {
  clearInterval(simTick);
  C.cancelSeries();
  C.setBack(null);
  if (soResp) sim.itens = respondidas(sim);
  if (porTempo) C.beepT();
  const em = C.dkey();
  sim.itens.forEach((id) => { const st = sim.resp[id] || {}; const vv = st.v || []; if (!st.done || sim.real) record(id, vv, byId[id].g, em); sim.resp[id] = { v: vv, done: true }; });
  sim.fim = Date.now();
  const sc = score(sim, byId);
  const q = Q();
  q.sims.push({ id: sim.id, em, modo: sim.modo, dom: sim.dom, aulaNome: sim.aulaNome, sv: sim.sv, real: sim.real, total: sc.total, ok: sc.ok, bad: sc.bad, bl: sc.bl, pct: Math.round(sc.pct * 1000) / 1000, nota: sc.nota, min: Math.round((sim.fim - sim.ini) / 60000), doms: Object.fromEntries(Object.entries(sc.dom).map(([d, x]) => [d, [x.ok, x.n]])) });
  if (q.sims.length > 60) q.sims = q.sims.slice(-60);
  C.save('quest');
  simSet(sim);
  if (porTempo) C.toast('Tempo esgotado: simulado entregue.');
  C.onEvent && C.onEvent('simulado');
  resultSim(v, sim, byId);
}

function resultSim(v, sim, byId) {
  const sc = score(sim, byId);
  const prova = sim.modo === 'prova';
  const doms = C.DOM.filter((d) => sc.dom[d.id]).map((d) => { const x = sc.dom[d.id]; const p = Math.round(x.ok / x.n * 100); return `<div class="mbar"><span class="n"><span class="dot" style="--c:${d.c}"></span><span>${C.esc(d.n)}</span></span><div class="bar" style="--c:${p >= 72 ? 'var(--ok)' : p >= 55 ? 'var(--warn)' : 'var(--bad)'}"><i style="width:${p}%"></i></div><span class="num small" style="text-align:right">${x.ok}/${x.n}</span></div>`; }).join('');
  const ap = sc.nota >= PROVA.corte;
  const veredito = prova ? `<div class="card accent" style="--c:${ap ? 'var(--ok)' : 'var(--bad)'}"><span class="k">Nota estimada</span><h2 class="num" style="font-size:40px">${sc.nota}</h2><p>${ap ? 'Acima do corte de 720 ✓' : 'Abaixo do corte de 720'}</p><p class="small muted">É só uma estimativa: aqui cada acerto vale igual e a escala é linear. Na prova real, 15 das 65 questões não contam ponto (você não sabe quais), e a AWS converte o resultado para a escala de 100 a 1000 com um método próprio. Use como termômetro: ficar acima de ~75% com folga é um bom sinal.${sc.total < PROVA.n ? ` Este simulado teve ${sc.total} questões em vez de ${PROVA.n}, porque o banco ainda não tinha questões suficientes.` : ''}</p></div>` : '';
  v.innerHTML = `<div class="vhead"><span class="k">${C.esc(simLabel(sim))} · ${Math.round((sim.fim - sim.ini) / 60000)} min</span><h1>Resultado do simulado</h1></div>
    ${scoreBar(sc).replace('class="score"', 'class="score static"')}
    ${veredito}
    ${doms ? `<div class="card"><h2>Por domínio</h2><div class="mbars stack">${doms}</div></div>` : ''}
    <div class="row"><button class="btn primary" type="button" id="smNovo">Novo simulado</button><button class="btn" type="button" data-go="erros">Caderno de erros</button></div>
    <h2>Gabarito comentado</h2><div id="smRes" style="display:grid;gap:16px">${runnerHTML(sim, byId, { confirm: false })}</div>`;
  v.querySelector('#smNovo').onclick = () => { simSet(null); renderSimulados(v); };
}

export function lessonAnswered(aulaId, key, v, g) { return record(`${aulaId}:${key}`, v, g); }

export function presetSimAula(aulaId) {
  const conf = Object.assign({ modo: 'dominio', dom: 'seg', n: 20, estudadas: true, real: false }, C.local.get('simConf') || {});
  conf.modo = 'aula'; conf.aula = aulaId; conf.estudadas = false;
  C.local.set('simConf', conf);
  const s = simGet(); if (s && s.fim) simSet(null);
}

import { stats as qStats, loadBank } from './quest.js';

let C;

export function initExtras(ctx) {
  C = ctx;
  const prevHoje = C.EXT.hoje;
  Object.assign(C.EXT, {
    painel: renderPainel,
    conquistas: renderConquistas,
    patente: () => { const p = patente(); return `${p.nome} · ${p.xp} XP`; },
    hoje: () => { checkConquistas(); return (prevHoje ? prevHoje() : '') + (C.modOn('patentes') ? patenteCard() : ''); },
  });
  C.listen(() => setTimeout(checkConquistas, 50));
}

function totalMinutes() {
  let t = 0;
  const seen = new Set();
  const add = (doc) => Object.values((doc && doc.d) || {}).forEach((d) => Object.values(d).forEach((m) => { t += m; }));
  Object.keys(C.S).filter((k) => k.startsWith('log-')).forEach((k) => { seen.add(k); add(C.S[k]); });
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('raws:log-') && !seen.has(k.slice(5))) add(JSON.parse(localStorage.getItem(k)));
    }
  } catch (e) {}
  return t;
}

const NIVEIS = [[0, 'Cloud Curious'], [150, 'Cloud Explorer'], [500, 'Cloud Practitioner'], [1200, 'Cloud Builder'], [2500, 'Solutions Architect Associate'], [5000, 'Cloud Architect Pro']];

function xpParts() {
  const q = C.getDoc('quest');
  const acertos = Object.values(q.hist || {}).reduce((a, h) => a + (h.ok || 0), 0);
  const aulas = Object.values(C.getDoc('aulas').p || {}).filter((p) => p.estudada).length;
  const rev = C.getDoc('rev');
  const revs = Object.values(rev.aulas || {}).reduce((a, s) => a + (s.k || 0), 0);
  const fc = Object.values((rev && rev.fc) || {}).filter((x) => x.b >= 4).length;
  const horas = totalMinutes() / 60;
  return { horas, acertos, aulas, sims: (q.sims || []).length, revs, fc, provas: (q.sims || []).filter((s) => s.modo === 'prova').length };
}

function patente() {
  const p = xpParts();
  const xp = Math.round(p.horas * 10 + p.acertos * 2 + p.aulas * 30 + p.sims * 15 + p.provas * 25 + p.revs * 5 + p.fc * 1);
  let i = 0;
  while (i + 1 < NIVEIS.length && xp >= NIVEIS[i + 1][0]) i++;
  const prox = NIVEIS[i + 1];
  return { xp, nome: NIVEIS[i][1], nivel: i, prox, pct: prox ? (xp - NIVEIS[i][0]) / (prox[0] - NIVEIS[i][0]) : 1, parts: p };
}

function patenteCard() {
  const p = patente();
  return `<div class="card accent" style="--c:#e2b13c"><span class="k">Seu nível</span><h2>${p.nome}</h2><div class="bar" style="--c:#e2b13c"><i style="width:${Math.round(p.pct * 100)}%"></i></div><p class="small muted num">${p.xp} XP${p.prox ? ` · faltam ${p.prox[0] - p.xp} para ${p.prox[1]}` : ' · nível máximo'}</p></div>`;
}

const CONQ = [
  ['foco1', '🎯', 'Primeiro foco', 'Registrar o primeiro estudo.', (x) => x.p.horas > 0],
  ['h10', '⏱️', '10 horas', 'Acumular 10 horas de estudo.', (x) => x.p.horas >= 10],
  ['h25', '🌤️', '25 horas', 'Chegar à metade da trilha de 50 horas.', (x) => x.p.horas >= 25],
  ['h50', '☁️', '50 horas', 'Fechar as 50 horas da trilha.', (x) => x.p.horas >= 50],
  ['seq7', '🔥', '7 dias seguidos', 'Estudar 7 dias sem falhar.', (x) => x.seq >= 7],
  ['seq30', '🌋', '30 dias seguidos', 'Estudar 30 dias sem falhar.', (x) => x.seq >= 30],
  ['aula1', '📖', 'Primeira aula', 'Marcar uma aula como estudada.', (x) => x.p.aulas >= 1],
  ['aulas', '🗺️', 'Trilha completa', 'Marcar todas as aulas como estudadas.', (x) => x.todas],
  ['q100', '✅', '100 questões', 'Responder 100 questões.', (x) => x.resp >= 100],
  ['q500', '🧠', '500 questões', 'Responder 500 questões.', (x) => x.resp >= 500],
  ['sim1', '📝', 'Primeiro simulado', 'Entregar um simulado.', (x) => x.p.sims >= 1],
  ['prova1', '⏳', 'Prova real', 'Entregar um simulado no modo prova real.', (x) => x.p.provas >= 1],
  ['p720', '🏅', 'Acima do corte', 'Tirar 720 ou mais no modo prova real com 65 questões.', (x) => x.p720],
  ['p850', '🏆', 'Com folga', 'Tirar 850 ou mais no modo prova real com 65 questões.', (x) => x.p850],
  ['dom4', '🧭', 'Quatro domínios', 'Ter 72% ou mais de acerto nos 4 domínios (com 20 ou mais questões em cada).', (x) => x.dom4],
  ['rev5', '🔁', 'Revisor', 'Fazer 5 revisões espaçadas.', (x) => x.p.revs >= 5],
  ['fc50', '🃏', 'Memória de elefante', 'Dominar 50 flashcards (caixa 4 ou 5).', (x) => x.p.fc >= 50],
];

function conqCtx() {
  const p = xpParts();
  const q = C.getDoc('quest');
  const resp = Object.values(q.hist || {}).reduce((a, h) => a + (h.n || 0), 0);
  const provas = (q.sims || []).filter((s) => s.modo === 'prova' && s.total >= 65);
  const st = qStats();
  const dom4 = C.DOM.every((d) => { const x = st.porD[d.id]; return x && x.n >= 20 && x.ok / x.n >= 0.72; });
  const est = Object.values(C.getDoc('aulas').p || {}).filter((a) => a.estudada).length;
  return { p, resp, p720: provas.some((s) => s.nota >= 720), p850: provas.some((s) => s.nota >= 850), dom4, todas: est >= 17, seq: C.streak() };
}

export function checkConquistas() {
  const c = C.getDoc('cfg');
  c.conq = c.conq || {};
  const x = conqCtx();
  const novas = CONQ.filter(([id, , , , f]) => !c.conq[id] && f(x));
  if (!novas.length) return;
  novas.forEach(([id]) => { c.conq[id] = C.dkey(); });
  C.save('cfg');
  if (C.modOn('conquistas')) C.toast(`Conquista: ${novas.map((n) => n[1] + ' ' + n[2]).join(', ')}`);
}

function renderConquistas(v) {
  checkConquistas();
  const c = C.getDoc('cfg').conq || {};
  const p = patente();
  const got = CONQ.filter(([id]) => c[id]).length;
  v.innerHTML = `<div class="vhead"><h1>Conquistas</h1><p class="muted">${got} de ${CONQ.length} desbloqueadas.</p></div>
    ${C.modOn('patentes') ? `<div class="card"><h2>Nível: ${p.nome}</h2><div class="bar" style="--c:#e2b13c"><i style="width:${Math.round(p.pct * 100)}%"></i></div><p class="small muted num">${p.xp} XP${p.prox ? ` · faltam ${p.prox[0] - p.xp} para ${p.prox[1]}` : ''}</p>
      <div class="patentes">${NIVEIS.map(([xp, n], i) => `<div class="pat${i <= p.nivel ? ' on' : ''}"><b>${n}</b><span class="small muted">${xp} XP</span></div>`).join('')}</div>
      <p class="small muted">XP: 10 por hora de estudo, 2 por acerto, 30 por aula estudada, 15 por simulado (+25 se for modo prova real), 5 por revisão e 1 por flashcard dominado.</p></div>` : ''}
    <div class="conq-grid">${CONQ.map(([id, ic, n, d]) => `<div class="conq${c[id] ? ' on' : ''}"><span class="ic">${ic}</span><b>${n}</b><span class="small muted">${d}</span>${c[id] ? `<span class="small" style="color:var(--ok)">${C.fmtDate(c[id])}</span>` : ''}</div>`).join('')}</div>`;
}

function bars(data, opts = {}) {
  const W = 320, H = opts.h || 150, P = 24, n = data.length;
  const mx = Math.max(opts.min || 1, ...data.map((d) => d.v));
  const bw = (W - P) / n;
  return `<svg viewBox="0 0 ${W} ${H + 20}" class="chart" role="img" aria-label="${C.esc(opts.label || '')}">${data.map((d, i) => { const h = d.v / mx * (H - 18); const x = P / 2 + i * bw + bw * 0.15; return `<rect x="${x.toFixed(1)}" y="${(H - h).toFixed(1)}" width="${(bw * 0.7).toFixed(1)}" height="${Math.max(1, h).toFixed(1)}" rx="3" fill="${d.c || 'var(--acc)'}"><title>${C.esc(d.l)}: ${C.esc(d.t || d.v)}</title></rect>${d.v ? `<text x="${(x + bw * 0.35).toFixed(1)}" y="${(H - h - 4).toFixed(1)}" text-anchor="middle" class="cv">${C.esc(d.t || d.v)}</text>` : ''}<text x="${(x + bw * 0.35).toFixed(1)}" y="${H + 14}" text-anchor="middle" class="cl">${C.esc(d.l)}</text>`; }).join('')}</svg>`;
}

async function renderPainel(v) {
  v.innerHTML = '<p class="empty">Carregando…</p>';
  await loadBank();
  const ws = C.weekStart();
  const semanas = [];
  for (let w = 7; w >= 0; w--) {
    let t = 0;
    for (let d = 0; d < 7; d++) t += C.minutesOn(C.dkey(C.addDays(ws, -7 * w + d)));
    semanas.push({ l: w ? C.fmtDate(C.dkey(C.addDays(ws, -7 * w))).split(' ')[0] + '/' + (C.addDays(ws, -7 * w).getMonth() + 1) : 'atual', v: Math.round(t / 6) / 10, t: (Math.round(t / 6) / 10) + 'h' });
  }
  const st = qStats();
  const pc = (x) => Math.round(x.ok / x.n * 100);
  const cor = (p) => (p >= 72 ? 'var(--ok)' : p >= 55 ? 'var(--warn)' : 'var(--bad)');
  const mb = (n, c, x) => `<div class="mbar"><span class="n">${c ? `<span class="dot" style="--c:${c}"></span>` : ''}<span>${C.esc(n)}</span></span><div class="bar" style="--c:${cor(pc(x))}"><i style="width:${pc(x)}%"></i></div><span class="num small" style="text-align:right">${pc(x)}% · ${x.n}</span></div>`;
  const porD = C.DOM.filter((d) => st.porD[d.id] && st.porD[d.id].n).map((d) => mb(`${d.n} (${d.p}%)`, d.c, st.porD[d.id])).join('');
  const svs = Object.entries(st.porS).filter(([, x]) => x.n >= 3);
  const fracos = svs.filter(([, x]) => pc(x) < 72).sort((a, b) => pc(a[1]) - pc(b[1]) || b[1].n - a[1].n).slice(0, 8);
  const fortes = svs.filter(([, x]) => pc(x) >= 72).sort((a, b) => pc(b[1]) - pc(a[1]) || b[1].n - a[1].n).slice(0, 8);
  const sims = (st.sims || []).slice(-12);
  const tx = st.n ? Math.round(st.ok / st.n * 100) : 0;
  const totalH = Math.round(totalMinutes() / 6) / 10;
  const provas = (st.sims || []).filter((s) => s.modo === 'prova');
  const ult = provas[provas.length - 1];
  v.innerHTML = `<div class="vhead"><h1>Desempenho</h1></div>
    <div class="stats"><div class="stat"><span class="k">Horas no total</span><span class="v">${totalH}h</span><span class="small muted">de 50 h da trilha</span></div><div class="stat"><span class="k">Questões respondidas</span><span class="v">${st.n}</span></div><div class="stat"><span class="k">Taxa de acerto</span><span class="v">${tx}%</span></div><div class="stat"><span class="k">Última prova real</span><span class="v">${ult ? ult.nota : '–'}</span><span class="small muted">${ult ? C.fmtDate(ult.em) : 'nenhuma ainda'}</span></div></div>
    <div class="cols">
      <div class="card"><h2>Acerto por domínio</h2>${porD ? `<div class="mbars stack">${porD}</div><p class="small muted">Última resposta de cada questão. Entre parênteses, o peso do domínio na prova. Mire em 72% ou mais em todos.</p>` : '<p class="empty">Responda algumas questões para ver este gráfico.</p>'}</div>
      <div class="card"><h2>Pontos fracos</h2>${fracos.length ? `<div class="mbars stack">${fracos.map(([s, x]) => mb(s, '', x)).join('')}</div><p class="small muted">Serviços com 3 ou mais questões e menos de 72% de acerto. Refaça pelo caderno de erros, filtrando por serviço.</p><button class="btn sm" type="button" data-go="erros" style="justify-self:start">Abrir caderno de erros</button>` : `<p class="empty">${svs.length ? 'Nenhum serviço abaixo de 72%. 🎯' : 'Responda mais questões para descobrir seus pontos fracos.'}</p>`}</div>
      ${fortes.length ? `<div class="card"><h2>Pontos fortes</h2><div class="mbars stack">${fortes.map(([s, x]) => mb(s, '', x)).join('')}</div></div>` : ''}
      <div class="card"><h2>Horas por semana</h2>${bars(semanas, { label: 'Horas por semana', min: 1 })}</div>
      <div class="card"><h2>Simulados (% de acerto)</h2>${sims.length ? bars(sims.map((s) => ({ l: C.fmtDate(s.em).split(' ')[0], v: Math.round(s.pct * 100), t: s.modo === 'prova' ? String(s.nota) : Math.round(s.pct * 100) + '%', c: s.modo === 'prova' ? (s.nota >= 720 ? 'var(--ok)' : 'var(--bad)') : s.pct >= 0.72 ? 'var(--ok)' : 'var(--warn)' })), { label: 'Simulados', min: 100 }) + '<p class="small muted">Nas barras do modo prova real aparece a nota estimada (corte de 720).</p>' : '<p class="empty">Nenhum simulado entregue ainda.</p>'}</div>
    </div>`;
}

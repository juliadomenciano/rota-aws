let C;

const DEF = {
  objetivo: 'AWS Certified Solutions Architect – Associate (SAA-C03)',
  calendario: [],
  rotina: '',
  partida: { data: '2026-09-15', itens: [{ k: 'Experiência com AWS', v: 'Praticamente zero no começo.' }, { k: 'Formação', v: 'Desenvolvedora frontend (React).' }, { k: 'Tempo disponível', v: 'Cerca de 50 horas no total, durante o horário de trabalho.' }, { k: 'Curso', v: 'Udemy SAA-C03, 19 seções (~23 h de vídeo), organizado em 8 fases.' }] },
  proximos: ['Assistir à S16 (Migration & Transfer) e à S17 (Web, Mobile, ML & Cost)', 'Marcar como estudadas as aulas que já viu', 'Fazer o primeiro simulado no modo prova real', 'Marcar a data da prova'],
};

export function initPlano(ctx) {
  C = ctx;
  C.registerDoc('perfil', JSON.parse(JSON.stringify(DEF)));
  C.EXT.plano = renderPlano;
}

const P = () => { const p = C.getDoc('perfil'); p.partida = p.partida || { data: '', itens: [] }; p.calendario = p.calendario || []; p.proximos = p.proximos || []; return p; };

let editando = false;

function renderPlano(v) {
  const p = P();
  if (editando) return editPlano(v, p);
  const hoje = C.dkey();
  const cfg = C.getDoc('cfg');
  const prova = cfg.prova;
  const now = new Date();
  const dias = prova ? Math.ceil((C.parseKey(prova) - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000) : null;
  const cs = C.cycleState();
  const porF = {};
  cs.it.forEach((x) => { const f = C.MM[x.m].f; const o = porF[f] || (porF[f] = { a: 0, d: 0 }); o.a += x.alvo; o.d += Math.min(x.feito, x.alvo); });
  const fases = C.FASES.map((F, i) => {
    const o = porF[i];
    if (!o) return '';
    const pct = o.a ? Math.round(o.d / o.a * 100) : 0;
    return `<div class="mbar"><span class="n"><span class="dot" style="--c:${F.c}"></span><span>${i} · ${C.esc(F.n)}</span></span><div class="bar" style="--c:${F.c}"><i style="width:${pct}%"></i></div><span class="num small" style="text-align:right">${C.fmtH(o.d)} / ${C.fmtH(o.a)}</span></div>`;
  }).join('');
  const faltaH = Math.max(0, cs.alvo - cs.feito) / 60;
  const ritmo = dias && dias > 0 && cs.alvo ? Math.ceil(faltaH / (dias / 7) * 10) / 10 : null;
  v.innerHTML = `<div class="row between"><div class="vhead"><h1>Meu plano</h1><p class="muted">Objetivo, prova, trilha e próximos passos, num lugar só.</p></div><button class="btn sm" type="button" id="plEdit">Editar</button></div>
    <div class="card accent" style="--c:#e2b13c"><span class="k">Objetivo</span><h2>${C.esc(p.objetivo || DEF.objetivo)}</h2>
      <p class="small muted">65 questões (50 pontuadas e 15 não pontuadas, sem você saber quais), 130 minutos, nota de 100 a 1000 com aprovação a partir de 720. Domínios: Segura 30%, Resiliente 26%, Alto desempenho 24% e Custo otimizado 20%. Taxa de US$ 150. Confira valores e regras atuais na página oficial da certificação.</p>
      <div class="row"><label class="f" style="max-width:220px">Data da prova<input type="date" id="plProva" value="${prova || ''}"></label>${dias != null ? `<span class="pill ${dias >= 0 ? '' : 'warn'}">${dias > 0 ? `Faltam ${dias} dias` : dias === 0 ? 'É hoje!' : 'Já passou'}</span>` : '<span class="pill">Sem data marcada</span>'}</div>
      ${ritmo ? `<p class="small">Para fechar a trilha até a prova, o ritmo é de cerca de <b>${String(ritmo).replace('.', ',')} h por semana</b>.</p>` : ''}</div>
    ${p.calendario.length ? `<div class="card"><h2>Calendário</h2><div class="timeline-v">${p.calendario.map((c) => `<div class="tl${c.quando && c.quando <= hoje ? ' on' : ''}"><span class="k">${C.esc(c.rotulo || '')}</span><b>${C.esc(c.titulo)}</b>${c.det ? `<span class="small muted">${C.esc(c.det)}</span>` : ''}</div>`).join('')}</div></div>` : ''}
    <div class="cols">
      <div class="card"><h2>Trilha por fase</h2>${fases ? `<div class="mbars stack">${fases}</div><p class="small muted num">Total: ${C.fmtH(cs.feito)} de ${C.fmtH(cs.alvo)}.</p>` : '<p class="empty">Monte a trilha no Ciclo para ver o andamento por fase.</p>'}<button class="btn sm ghost" type="button" data-go="estudos" style="justify-self:start">Abrir o ciclo</button></div>
      <div class="card"><h2>Rotina semanal</h2>${p.rotina ? `<p class="small">${C.esc(p.rotina).replace(/\n/g, '<br>')}</p>` : '<p class="empty">Toque em Editar para registrar sua rotina (dias, horários, quanto tempo).</p>'}<p class="small muted">Meta semanal: ${cfg.meta} h.</p></div>
      <div class="card"><h2>Ponto de partida${p.partida.data ? ` · ${C.fmtDate(p.partida.data)}` : ''}</h2>${p.partida.itens.length ? `<div class="list">${p.partida.itens.map((i) => `<div class="li" style="align-items:flex-start"><span class="t"><b>${C.esc(i.k)}</b><br><span class="small">${C.esc(i.v)}</span></span></div>`).join('')}</div>` : '<p class="empty">Toque em Editar para registrar de onde você começou.</p>'}</div>
      ${p.proximos.length ? `<div class="card"><h2>Próximos passos</h2><div class="list">${p.proximos.map((x) => `<div class="li"><span class="t">${C.esc(x)}</span></div>`).join('')}</div></div>` : ''}
    </div>`;
  v.querySelector('#plEdit').onclick = () => { editando = true; renderPlano(v); };
  v.querySelector('#plProva').onchange = (e) => { cfg.prova = e.target.value || ''; C.save('cfg'); C.renderAll(); renderPlano(v); };
}

function editPlano(v, p) {
  const cal = p.calendario.map((c) => [c.rotulo, c.titulo, c.det, c.quando].map((x) => x || '').join(' | ')).join('\n');
  const part = p.partida.itens.map((i) => `${i.k}: ${i.v}`).join('\n');
  v.innerHTML = `<div class="vhead"><h1>Editar meu plano</h1></div>
    <div class="card"><label class="f">Objetivo<input type="text" id="eObj" value="${C.esc(p.objetivo || '')}"></label>
      <label class="f">Calendário (uma linha por etapa: rótulo | título | detalhe | data AAAA-MM-DD opcional)<textarea id="eCal" rows="5">${C.esc(cal)}</textarea></label>
      <label class="f">Rotina semanal<textarea id="eRot" rows="3">${C.esc(p.rotina || '')}</textarea></label>
      <label class="f">Data do ponto de partida<input type="date" id="ePD" value="${p.partida.data || ''}"></label>
      <label class="f">Ponto de partida (uma linha por item, no formato "Item: descrição")<textarea id="ePI" rows="5">${C.esc(part)}</textarea></label>
      <label class="f">Próximos passos (um por linha)<textarea id="ePx" rows="4">${C.esc(p.proximos.join('\n'))}</textarea></label>
      <div class="row"><button class="btn primary" type="button" id="eSave">Salvar</button><button class="btn ghost" type="button" id="eCancel">Cancelar</button></div></div>`;
  v.querySelector('#eCancel').onclick = () => { editando = false; renderPlano(v); };
  v.querySelector('#eSave').onclick = () => {
    p.objetivo = v.querySelector('#eObj').value.trim();
    p.calendario = v.querySelector('#eCal').value.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const [rotulo, titulo, det, quando] = l.split('|').map((x) => (x || '').trim()); return { rotulo, titulo: titulo || rotulo, det, quando: /^\d{4}-\d{2}-\d{2}$/.test(quando || '') ? quando : '' }; });
    p.rotina = v.querySelector('#eRot').value.trim();
    p.partida = { data: v.querySelector('#ePD').value, itens: v.querySelector('#ePI').value.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const i = l.indexOf(':'); return i > 0 ? { k: l.slice(0, i).trim(), v: l.slice(i + 1).trim() } : { k: l, v: '' }; }) };
    p.proximos = v.querySelector('#ePx').value.split('\n').map((l) => l.trim()).filter(Boolean);
    C.save('perfil');
    editando = false;
    C.toast('Plano salvo.');
    renderPlano(v);
  };
}

/* ---------- 1. Skill vocabulary: hash map synonym -> standard skill ---------- */
const SYN = {
  JavaScript: ['js', 'ecmascript', 'java script'], Python: ['py', 'python3', 'python 3'],
  React: ['reactjs', 'react.js', 'react js'], 'Node.js': ['node', 'nodejs', 'node js'],
  SQL: ['mysql', 'postgres', 'postgresql', 'sql server'], 'Machine Learning': ['ml', 'machine-learning', 'ml models'],
  'Data Structures': ['dsa', 'algorithms', 'data structures and algorithms'], Java: ['core java', 'java se'],
  'HTML/CSS': ['html', 'css', 'html5', 'css3', 'html/css'], Docker: ['containers', 'docker containers', 'docker compose'],
  AWS: ['amazon web services', 'ec2'], Git: ['github', 'version control'], Figma: ['ui design'],
  'REST APIs': ['rest', 'restful api', 'restful apis', 'rest api', 'api development'], MongoDB: ['mongo'], TypeScript: ['ts']
};
const MAP = new Map();
for (const [c, al] of Object.entries(SYN)) { MAP.set(c.toLowerCase(), c); al.forEach(a => MAP.set(a, c)); }

function lev(a, b) { // Levenshtein edit distance (dynamic programming)
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
function norm(raw) {
  const t = raw.trim().toLowerCase();
  if (MAP.has(t)) return { c: MAP.get(t), how: 'exact' };
  let best = null, bs = 0;
  for (const [k, v] of MAP) { const s = 1 - lev(t, k) / Math.max(t.length, k.length); if (s > bs) { bs = s; best = v; } }
  return bs >= 0.8 && t.length > 3 ? { c: best, how: 'fuzzy', s: bs } : { c: null, how: 'unknown' };
}
function extractText(text) { // scan résumé text for known skills using 1–3 word windows
  const w = (text.toLowerCase().match(/[a-z0-9.+#\-]+/g) || []).map(x => x.replace(/\.$/, '')), out = new Set();
  for (let i = 0; i < w.length; i++) for (let n = 3; n >= 1; n--) {
    const g = w.slice(i, i + n).join(' ');
    if (i + n <= w.length && MAP.has(g)) { out.add(MAP.get(g)); break; }
  }
  return [...out];
}
function parseSkills(text) {
  const raw = [];
  text.split(/[,\n;]/).map(s => s.trim()).filter(Boolean).forEach(p =>
    p.split(/\s+/).length <= 3 ? raw.push(p) : extractText(p).forEach(s => raw.push(s)));
  return raw;
}
const skillsOf = raw => new Set(raw.map(r => norm(r).c).filter(Boolean));

/* ---------- data ---------- */
const SAMPLE = {
  cands: [
    { name: 'Aarav Mehta', raw: ['JS', 'ReactJS', 'HTML5', 'css3', 'Git'], exp: 3, edu: 2 },
    { name: 'Diya Rao', raw: ['python3', 'ML', 'SQL', 'DSA', 'pandas'], exp: 4, edu: 3 },
    { name: 'Kiran Kumar', raw: ['Node', 'MongoDB', 'REST', 'Javascript', 'Docker'], exp: 5, edu: 2 },
    { name: 'Sneha Iyer', raw: ['Java SE', 'MySQL', 'algorithms', 'GitHub'], exp: 2, edu: 2 },
    { name: 'Rohan Das', raw: ['AWS', 'Docker containers', 'Python', 'version control'], exp: 6, edu: 2 },
    { name: 'Meera Nair', raw: ['Figma', 'HTML', 'CSS', 'ui design', 'ReactJS'], exp: 2, edu: 2 },
    { name: 'Vikram Singh', raw: ['machine-learning', 'python', 'Typescrpt'], exp: 1, edu: 3 },
    { name: 'Anil Reddy', raw: ['postgres', 'RESTful API', 'nodejs', 'ts'], exp: 4, edu: 3 }
  ],
  jobs: [
    { title: 'Frontend Developer', req: ['JavaScript', 'React', 'HTML/CSS', 'Git'], exp: 2, edu: 2 },
    { title: 'Backend Engineer', req: ['Node.js', 'REST APIs', 'SQL', 'MongoDB'], exp: 3, edu: 2 },
    { title: 'ML Engineer', req: ['Python', 'Machine Learning', 'SQL', 'Data Structures'], exp: 3, edu: 3 },
    { title: 'DevOps Engineer', req: ['AWS', 'Docker', 'Git', 'Python'], exp: 4, edu: 2 }
  ]
};
let S = structuredClone(SAMPLE);
const W = { s: 60, e: 25, d: 15 };
const EDU = ['', 'Diploma', 'Bachelors', 'Masters', 'PhD'];
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- 3. Compatibility score ---------- */
function score(c, j) {
  const cs = skillsOf(c.raw), req = [...skillsOf(j.req)];
  const hit = req.filter(x => cs.has(x)), miss = req.filter(x => !cs.has(x));
  const s = req.length ? hit.length / req.length : 1, e = Math.min(1, c.exp / Math.max(1, j.exp)), d = Math.min(1, c.edu / j.edu);
  const t = W.s + W.e + W.d || 1;
  return { total: (W.s * s + W.e * e + W.d * d) / t * 100, s, e, d, hit, miss };
}

/* ---------- Min-heap top-K ---------- */
function topK(items, k, key) {
  const h = [];
  const up = i => { while (i > 0) { const p = (i - 1) >> 1; if (key(h[p]) <= key(h[i])) break; [h[p], h[i]] = [h[i], h[p]]; i = p; } };
  const down = i => { for (;;) { const l = 2 * i + 1, r = l + 1; let m = i;
    if (l < h.length && key(h[l]) < key(h[m])) m = l; if (r < h.length && key(h[r]) < key(h[m])) m = r;
    if (m === i) break; [h[m], h[i]] = [h[i], h[m]]; i = m; } };
  for (const x of items) {
    if (h.length < k) { h.push(x); up(h.length - 1); } else if (key(x) > key(h[0])) { h[0] = x; down(0); }
  }
  return h.sort((a, b) => key(b) - key(a));
}

/* ---------- Hungarian algorithm (min cost, square matrix) ---------- */
function hungarian(cost) {
  const n = cost.length, INF = 1e9, u = Array(n + 1).fill(0), v = Array(n + 1).fill(0), p = Array(n + 1).fill(0), way = Array(n + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    p[0] = i; let j0 = 0; const minv = Array(n + 1).fill(INF), used = Array(n + 1).fill(false);
    do {
      used[j0] = true; const i0 = p[j0]; let d = INF, j1 = 0;
      for (let j = 1; j <= n; j++) if (!used[j]) {
        const cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
        if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
        if (minv[j] < d) { d = minv[j]; j1 = j; }
      }
      for (let j = 0; j <= n; j++) if (used[j]) { u[p[j]] += d; v[j] -= d; } else minv[j] -= d;
      j0 = j1;
    } while (p[j0] !== 0);
    do { const j1 = way[j0]; p[j0] = p[j1]; j0 = j1; } while (j0);
  }
  const ans = Array(n); for (let j = 1; j <= n; j++) ans[p[j] - 1] = j - 1;
  return ans; // ans[row] = column
}

/* ---------- Set cover ---------- */
function coverCalc() {
  const U = [...new Set(S.jobs.flatMap(j => [...skillsOf(j.req)]))];
  const sets = S.cands.map((c, i) => ({ c, a: U.filter(x => skillsOf(c.raw).has(x)) })).filter(o => o.a.length);
  const left = new Set(U), greedy = [];
  while (left.size) {
    let b = null, bn = 0;
    for (const o of sets) { if (greedy.includes(o)) continue; const n = o.a.filter(x => left.has(x)).length; if (n > bn) { bn = n; b = o; } }
    if (!b) break; greedy.push(b); b.a.forEach(x => left.delete(x));
  }
  let exact = null;
  if (!left.size && sets.length <= 18) {
    const pop = m => { let c = 0; while (m) { c += m & 1; m >>= 1; } return c; };
    outer: for (let k = 1; k <= sets.length; k++) for (let m = 1; m < 1 << sets.length; m++) {
      if (pop(m) !== k) continue;
      const cov = new Set(); sets.forEach((o, b) => { if (m >> b & 1) o.a.forEach(x => cov.add(x)); });
      if (cov.size === U.length) { exact = sets.filter((_, b) => m >> b & 1); break outer; }
    }
  }
  return { U, greedy, exact, uncovered: [...left] };
}

/* ---------- Rendering ---------- */
const chips = (arr, cls) => arr.map(x => `<span class="chip ${cls}">${esc(x)}</span>`).join('') || '<span class="sub">none</span>';

function renderLists() {
  $('lists').innerHTML = `<div class="card"><h3>Candidates (${S.cands.length})</h3><table>
    <tr><th>Name</th><th>Skills as written</th><th>Exp.</th><th>Education</th><th></th></tr>
    ${S.cands.map((c, i) => `<tr><td>${esc(c.name)}</td><td>${c.raw.map(r => `<span class="chip">${esc(r)}</span>`).join('')}</td><td>${c.exp} yrs</td><td>${EDU[c.edu]}</td><td><button class="x" data-del="c${i}">Remove</button></td></tr>`).join('')}</table></div>
    <div class="card"><h3>Jobs (${S.jobs.length})</h3><table>
    <tr><th>Title</th><th>Required skills</th><th>Min. exp.</th><th>Min. education</th><th></th></tr>
    ${S.jobs.map((j, i) => `<tr><td>${esc(j.title)}</td><td>${j.req.map(r => `<span class="chip">${esc(r)}</span>`).join('')}</td><td>${j.exp} yrs</td><td>${EDU[j.edu]}</td><td><button class="x" data-del="j${i}">Remove</button></td></tr>`).join('')}</table></div>`;
}

function renderNorm() {
  $('normList').innerHTML = `<div class="card"><h3>Candidates after normalization</h3><table><tr><th>Name</th><th>Standard skills</th></tr>` +
    S.cands.map(c => `<tr><td>${esc(c.name)}</td><td>${c.raw.map(r => {
      const n = norm(r);
      return n.how === 'exact' ? (n.c.toLowerCase() === r.trim().toLowerCase() ? `<span class="chip ok">${esc(n.c)}</span>` : `<span class="chip ok">${esc(r)} → ${esc(n.c)}</span>`)
        : n.how === 'fuzzy' ? `<span class="chip fz">${esc(r)} → ${esc(n.c)} <small>${Math.round(n.s * 100)}% similar</small></span>`
        : `<span class="chip un">${esc(r)} <small>not in dictionary</small></span>`;
    }).join('')}</td></tr>`).join('') + `</table><p class="note">Green: found in the hash map. Amber: matched by string similarity. Dashed: unknown, ignored when scoring.</p></div>`;
  $('dict').innerHTML = `<table>${Object.entries(SYN).map(([c, a]) => `<tr><td><b>${esc(c)}</b></td><td>${a.map(x => `<span class="chip">${esc(x)}</span>`).join('')}</td></tr>`).join('')}</table>`;
}

function renderJobSel() {
  const cur = $('jobSel').value;
  $('jobSel').innerHTML = S.jobs.map((j, i) => `<option value="${i}">${esc(j.title)}</option>`).join('');
  if (cur && S.jobs[cur]) $('jobSel').value = cur;
}

function renderRank() {
  const j = S.jobs[$('jobSel').value];
  if (!j) { $('ranked').innerHTML = '<div class="card">Add a job in stage 1 to see rankings.</div>'; return; }
  const k = Math.max(1, +$('k').value || 5);
  const all = S.cands.map(c => ({ c, r: score(c, j) }));
  const top = topK(all, k, x => x.r.total);
  $('ranked').innerHTML = `<div class="card"><h3>${esc(j.title)}: top ${top.length} of ${all.length}</h3>` + (top.map((x, i) => `
    <div class="rk"><div class="pos">${i + 1}</div><div><b>${esc(x.c.name)}</b>
    <div class="bar"><i style="width:${x.r.total.toFixed(0)}%"></i></div>
    <div>${chips(x.r.hit, 'ok')}${chips(x.r.miss, 'miss')}</div>
    <div class="sub">Skills ${(x.r.s * 100).toFixed(0)}% · Experience ${(x.r.e * 100).toFixed(0)}% (${x.c.exp} of ${j.exp} yrs) · Education ${(x.r.d * 100).toFixed(0)}%</div></div>
    <div class="pts">${x.r.total.toFixed(0)}</div></div>`).join('') || 'No candidates yet.') + '</div>';
}

function renderAssign() {
  if (!S.jobs.length || !S.cands.length) { $('assign').innerHTML = '<div class="card">Add at least one candidate and one job.</div>'; return; }
  const J = S.jobs.length, C = S.cands.length, N = Math.max(J, C);
  const sc = S.jobs.map(j => S.cands.map(c => score(c, j).total));
  const cost = Array.from({ length: N }, (_, r) => Array.from({ length: N }, (_, c) => 100 - (sc[r]?.[c] ?? 0)));
  const ans = hungarian(cost), pick = ans.map((c, r) => (r < J && c < C ? c : -1));
  const total = pick.reduce((t, c, r) => t + (c >= 0 ? sc[r][c] : 0), 0);
  const taken = new Set(); let gt = 0;
  sc.forEach(row => { let b = -1; row.forEach((v, c) => { if (!taken.has(c) && (b < 0 || v > row[b])) b = c; }); if (b >= 0) { taken.add(b); gt += row[b]; } });
  const heat = v => `background:rgba(168,15,26,${(v / 100 * .55).toFixed(2)});color:${v > 70 ? '#fff' : 'inherit'}`;
  $('assign').innerHTML = `<div class="card"><div class="big">${total.toFixed(0)} total score</div>
    <p class="note">Greedy job-by-job picking would reach ${gt.toFixed(0)}${total - gt > .5 ? `, so the optimal assignment gains ${(total - gt).toFixed(0)} points` : ', the same as optimal for this data'}.</p>
    <table>${pick.slice(0, J).map((c, r) => `<tr><td><b>${esc(S.jobs[r].title)}</b></td><td>${c >= 0 ? `${esc(S.cands[c].name)}</td><td>${sc[r][c].toFixed(0)}` : 'No candidate left</td><td>0'}</td></tr>`).join('')}</table></div>
    <div class="card matrix"><h3>Score matrix (outlined cell = assigned)</h3><table><tr><th></th>${S.cands.map(c => `<th>${esc(c.name.split(' ')[0])}</th>`).join('')}</tr>
    ${sc.map((row, r) => `<tr><th>${esc(S.jobs[r].title)}</th>${row.map((v, c) => `<td class="${pick[r] === c ? 'pick' : ''}" style="${heat(v)}">${v.toFixed(0)}</td>`).join('')}</tr>`).join('')}</table></div>`;
}

function renderCover() {
  if (!S.jobs.length) { $('cover').innerHTML = '<div class="card">Add at least one job.</div>'; return; }
  const r = coverCalc();
  const team = o => o.map(x => `<tr><td><b>${esc(x.c.name)}</b></td><td>${chips(x.a, 'ok')}</td></tr>`).join('');
  $('cover').innerHTML = `<div class="card"><h3>Skills the open roles need (${r.U.length})</h3>${chips(r.U, '')}</div>` +
    (r.uncovered.length ? `<div class="card"><h3>Not every skill can be covered</h3><p>No candidate has: ${chips(r.uncovered, 'miss')}</p><p class="note">Add candidates with these skills, or remove them from the job requirements.</p></div>` : '') +
    `<div class="card"><h3>Greedy set cover: ${r.greedy.length} candidate${r.greedy.length === 1 ? '' : 's'}</h3><table>${team(r.greedy)}</table></div>` +
    (r.exact ? `<div class="card"><h3>Exact minimum: ${r.exact.length} candidate${r.exact.length === 1 ? '' : 's'}</h3><table>${team(r.exact)}</table>
      <p class="note">${r.exact.length === r.greedy.length ? 'Greedy found the true minimum here.' : 'Greedy used more people than needed here. That is why it is only an approximation.'}</p></div>`
      : `<p class="note">${S.cands.length > 18 ? 'The exact search is skipped above 18 candidates because it grows as 2ⁿ.' : ''}</p>`);
}

function renderAll() { renderLists(); renderNorm(); renderJobSel(); renderRank(); renderAssign(); renderCover(); }

/* ---------- Events ---------- */
$('nav').onclick = e => {
  const b = e.target.closest('button'); if (!b) return;
  document.querySelectorAll('nav button').forEach(x => x.classList.toggle('on', x === b));
  document.querySelectorAll('.stage').forEach(s => s.classList.toggle('on', s.id === b.dataset.t));
  scrollTo(0, 0);
};
$('fc').onsubmit = e => {
  e.preventDefault(); const f = new FormData(e.target);
  S.cands.push({ name: f.get('name').trim(), raw: parseSkills(f.get('skills')), exp: +f.get('exp'), edu: +f.get('edu') });
  e.target.reset(); renderAll();
};
$('fj').onsubmit = e => {
  e.preventDefault(); const f = new FormData(e.target);
  S.jobs.push({ title: f.get('title').trim(), req: parseSkills(f.get('req')), exp: +f.get('exp'), edu: +f.get('edu') });
  e.target.reset(); renderAll();
};
$('lists').onclick = e => {
  const d = e.target.dataset.del; if (!d) return;
  (d[0] === 'c' ? S.cands : S.jobs).splice(+d.slice(1), 1); renderAll();
};
$('reset').onclick = () => { S = structuredClone(SAMPLE); renderAll(); };
$('probe').oninput = e => {
  const v = e.target.value.trim(); if (!v) { $('probeOut').innerHTML = ''; return; }
  const n = norm(v);
  $('probeOut').innerHTML = n.how === 'exact' ? `<span class="chip ok">${esc(v)} → ${esc(n.c)}</span> found in hash map`
    : n.how === 'fuzzy' ? `<span class="chip fz">${esc(v)} → ${esc(n.c)}</span> string similarity ${Math.round(n.s * 100)}%`
    : `<span class="chip un">${esc(v)}</span> not in dictionary`;
};
[['ws', 's', 'ows'], ['we', 'e', 'owe'], ['wd', 'd', 'owd']].forEach(([id, key, out]) => {
  $(id).oninput = e => { W[key] = +e.target.value; $(out).textContent = e.target.value; renderRank(); renderAssign(); };
});
$('jobSel').onchange = renderRank; $('k').oninput = renderRank;
renderAll();
/* ============================================================
   ChantierLive — application client · v0.3 (étape 3 : socle multi-clients)
   Authentification, organisations, rôles, cockpit sur données réelles,
   pointage signé et géolocalisé, photos, temps réel.
   ============================================================ */
const CFG = { url: 'https://vdzzvnuarmprkickeyus.supabase.co', key: 'sb_publishable_Mq8zAuTA--p4R7LoOix07A_B6jcRQWK' };
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hhmm = d => new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
const dateFr = d => new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const fmt = n => n == null ? '—' : Number(n).toLocaleString('fr-FR', { maximumFractionDigits: 1 });
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)));
const ROLES = { promoteur: 'Promoteur', direction: 'Direction de programme', chef_chantier: 'Chef de chantier', chef_equipe: "Chef d'équipe", architecte: 'Architecte', controle: 'Contrôle', lecture: 'Lecture seule' };
const PEUT = { // droits côté interface (la base fait foi)
  pointer: ['promoteur', 'direction', 'chef_chantier', 'chef_equipe'],
  photo: ['promoteur', 'direction', 'chef_chantier', 'chef_equipe', 'architecte', 'controle'],
  admin: ['promoteur', 'direction'],
};
const sb = supabase.createClient(CFG.url, CFG.key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }, realtime: { params: { eventsPerSecond: 5 } } });

const S = { adminPlateforme: false, cache: {}, user: null, orgs: [], org: null, role: null, programmes: [], prog: null, vue: localStorage.getItem('cl_vue') || 'cockpit', data: {}, canal: null, gps: null, sigVide: true, typePointage: 'arrivee', fileAttente: JSON.parse(localStorage.getItem('cl_file') || '[]') };

/* ---------- utilitaires UI ---------- */
let toastT; function toast(html, ms = 3200) { const t = $('#toast'); t.innerHTML = html; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), ms); }
function setConn(mode, lib) { const c = $('#conn'); c.className = 'pill ' + mode; c.innerHTML = '<i></i><span>' + esc(lib) + '</span>'; }
function modal(html) { $('#modalCarte').innerHTML = html; $('#modal').hidden = false; }
function fermerModal() { $('#modal').hidden = true; }
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') fermerModal(); });
function horloge() { const d = new Date(); $('#clock').textContent = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }) + ' · ' + hhmm(d); }
horloge(); setInterval(horloge, 20000);

/* ---------- authentification ---------- */
const formAuth = $('#formAuth'), authStatut = $('#authStatut');
formAuth.addEventListener('submit', async e => {
  e.preventDefault(); const f = new FormData(formAuth); const email = f.get('email').trim(), mdp = f.get('mdp');
  if (!mdp) { authStatut.className = 'statut err'; authStatut.textContent = 'Entrez votre mot de passe, ou demandez un lien de connexion.'; return; }
  $('#btnConnexion').disabled = true; authStatut.className = 'statut'; authStatut.textContent = 'Connexion…';
  const { error } = await sb.auth.signInWithPassword({ email, password: mdp });
  $('#btnConnexion').disabled = false;
  if (error) { authStatut.className = 'statut err'; authStatut.textContent = error.message.includes('Invalid') ? 'E-mail ou mot de passe incorrect.' : error.message; }
  else authStatut.textContent = '';
});
$('#btnLienMagique').addEventListener('click', async () => {
  const email = new FormData(formAuth).get('email').trim(); if (!email) { authStatut.className = 'statut err'; authStatut.textContent = "Entrez d'abord votre adresse e-mail."; return; }
  const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.href.split('#')[0], shouldCreateUser: false } });
  authStatut.className = error ? 'statut err' : 'statut ok'; authStatut.textContent = error ? error.message : 'Lien envoyé. Ouvrez l’e-mail sur cet appareil et cliquez sur le lien.';
});
sb.auth.onAuthStateChange((evt, session) => { if (session?.user && (!S.user || S.user.id !== session.user.id)) { S.user = session.user; demarrer(); } else if (!session) { S.user = null; afficherAuth(); } });
function afficherAuth() { $('#app').hidden = true; $('#auth').hidden = false; if (S.canal) { sb.removeChannel(S.canal); S.canal = null; } }

/* ---------- démarrage : organisations, rôle, programme ---------- */
async function demarrer() {
  $('#auth').hidden = true; $('#app').hidden = false; setConn('off', 'Chargement…');
  const { data: membres, error } = await sb.from('membres').select('org_id, role, orgs(id, slug, nom, pays, devise, taux_eur, plan, statut, parametres)').eq('actif', true).eq('user_id', S.user.id);
  if (error) { toast('<b>Erreur</b> ' + esc(error.message)); return; }
  S.orgs = (membres || []).map(m => ({ ...m.orgs, role: m.role }));
  const { data: pa } = await sb.from('platform_admins').select('email').limit(1); S.adminPlateforme = !!(pa && pa.length);
  if (!S.orgs.length) { $('#main').innerHTML = '<div class="vide"><h2>Aucune organisation</h2><p style="margin-top:.5rem">Votre compte n’est rattaché à aucun client ChantierLive. Demandez une invitation à votre administrateur ou écrivez à contact@chantierlive.com.</p><p style="margin-top:1rem"><button class="btn" onclick="deconnexion()">Se déconnecter</button></p></div>'; $('#nav').innerHTML = ''; setConn('off', 'Sans organisation'); return; }
  const prefere = localStorage.getItem('cl_org'); S.org = S.orgs.find(o => o.id === prefere) || S.orgs[0]; S.role = S.org.role;
  await chargerProgrammes();
  if (S.user.user_metadata?.doit_changer_mdp) changerMdp(true);
}
async function chargerProgrammes() {
  const { data } = await sb.from('programmes').select('*').eq('org_id', S.org.id).order('cree_le'); S.programmes = data || [];
  const pp = localStorage.getItem('cl_prog'); S.prog = S.programmes.find(p => p.id === pp) || S.programmes[0] || null;
  $('#sousTitre').textContent = S.org.nom + (S.prog ? ' · ' + S.prog.nom : '') + ' · ' + ROLES[S.role];
  await chargerDonnees(); brancherTempsReel(); renderNav(); const h = location.hash.slice(1); go(RENDU[h] ? h : S.vue);
}
async function chargerDonnees() {
  if (!S.prog) { S.data = {}; return; }
  const pid = S.prog.id, t0 = new Date(); t0.setDate(t0.getDate() - 7);
  const [phases, quartiers, ilots, equipes, agents, pointages, photos, cameras, journal, commandes, stocks, budget, risques, nc, conges, fournisseurs, tickets, ventes, paie, notifications] = await Promise.all([
    sb.from('phases').select('*').eq('programme_id', pid).order('ordre'),
    sb.from('quartiers').select('*').eq('programme_id', pid).order('code'),
    sb.from('ilots').select('*').eq('programme_id', pid).order('code'),
    sb.from('equipes').select('*').eq('programme_id', pid).order('nom'),
    sb.from('agents').select('*, equipes(nom)').eq('programme_id', pid).eq('actif', true).order('nom'),
    sb.from('pointages').select('*').eq('programme_id', pid).gte('ts', t0.toISOString()).order('ts', { ascending: false }).limit(400),
    sb.from('photos').select('*').eq('programme_id', pid).order('ts', { ascending: false }).limit(60),
    sb.from('cameras').select('*').eq('programme_id', pid).order('code'),
    sb.from('journal').select('*').eq('programme_id', pid).order('ts', { ascending: false }).limit(30),
    sb.from('commandes').select('*, fournisseurs(nom)').eq('programme_id', pid).order('livraison_prevue'),
    sb.from('stocks').select('*').eq('programme_id', pid).order('couverture_jours'),
    sb.from('budget_lignes').select('*').eq('programme_id', pid).order('poste'),
    sb.from('risques').select('*').eq('programme_id', pid).order('code'),
    sb.from('non_conformites').select('*').eq('programme_id', pid).order('code'),
    sb.from('conges').select('*, agents(nom)').eq('programme_id', pid).order('debut'),
    sb.from('fournisseurs').select('*').eq('org_id', S.org.id).order('nom'),
    sb.from('tickets').select('*').eq('programme_id', pid).order('cree_le', { ascending: false }),
    sb.from('ventes').select('*').eq('programme_id', pid).order('date_reservation', { ascending: false }),
    sb.from('paie').select('*, agents(nom)').eq('programme_id', pid).order('mois', { ascending: false }).limit(200),
    sb.from('notifications').select('*').eq('org_id', S.org.id).order('cree_le', { ascending: false }).limit(100),
  ]);
  S.data = { phases: phases.data || [], quartiers: quartiers.data || [], ilots: ilots.data || [], equipes: equipes.data || [], agents: agents.data || [], pointages: pointages.data || [], photos: photos.data || [], cameras: cameras.data || [], journal: journal.data || [], commandes: commandes.data || [], stocks: stocks.data || [], budget: budget.data || [], risques: risques.data || [], nc: nc.data || [], conges: conges.data || [], fournisseurs: fournisseurs.data || [], tickets: tickets.data || [], ventes: ventes.data || [], paie: paie.data || [], notifications: notifications.data || [] };
  const err = [phases, quartiers, ilots, agents, pointages, photos].find(r => r.error); if (err) toast('<b>Lecture partielle</b> ' + esc(err.error.message));
}
function brancherTempsReel() {
  if (S.canal) sb.removeChannel(S.canal);
  setConn('on', 'Temps réel · synchronisé');
  S.canal = sb.channel('cl-' + S.prog?.id)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pointages', filter: 'programme_id=eq.' + S.prog?.id }, async p => { await rafraichir('pointages'); if (p.eventType === 'INSERT' && p.new.saisi_par !== S.user.id) toast('<b>Émargement reçu</b> ' + esc(p.new.agent_nom) + ' · ' + hhmm(p.new.ts)); })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'photos', filter: 'programme_id=eq.' + S.prog?.id }, async p => { await rafraichir('photos'); if (p.eventType === 'INSERT' && p.new.saisi_par !== S.user.id) toast('<b>Nouvelle photo</b> ' + esc(p.new.legende || p.new.zone || '')); })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'journal', filter: 'programme_id=eq.' + S.prog?.id }, () => rafraichir('journal'))
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: 'org_id=eq.' + S.org.id }, async p => { await rafraichir('notifications'); toast('<b>Alerte</b> ' + esc(p.new.titre), 5000); renderNav(); })
    .subscribe(st => { if (st === 'SUBSCRIBED') setConn('on', 'Temps réel · en direct'); else if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') setConn('off', 'Temps réel indisponible'); });
}
async function rafraichir(table) {
  const pid = S.prog.id;
  if (table === 'pointages') { const t0 = new Date(); t0.setDate(t0.getDate() - 7); const { data } = await sb.from('pointages').select('*').eq('programme_id', pid).gte('ts', t0.toISOString()).order('ts', { ascending: false }).limit(400); S.data.pointages = data || []; }
  if (table === 'photos') { const { data } = await sb.from('photos').select('*').eq('programme_id', pid).order('ts', { ascending: false }).limit(60); S.data.photos = data || []; }
  if (table === 'notifications') { const { data } = await sb.from('notifications').select('*').eq('org_id', S.org.id).order('cree_le', { ascending: false }).limit(100); S.data.notifications = data || []; }
  if (table === 'journal') { const { data } = await sb.from('journal').select('*').eq('programme_id', pid).order('ts', { ascending: false }).limit(30); S.data.journal = data || []; }
  if (!document.activeElement || !document.activeElement.matches('input,select,textarea')) { if (['cockpit', 'pointage', 'chantier', 'alertes'].includes(S.vue)) go(S.vue, true); }
}
window.addEventListener('online', () => { setConn('on', 'Temps réel · synchronisé'); viderFileAttente(); });
window.addEventListener('offline', () => setConn('off', 'Hors ligne · saisies conservées'));

/* ---------- navigation ---------- */
const VUES = [
  ['Piloter', [['cockpit', 'Cockpit'], ['site', 'Site et quartiers'], ['finances', 'Finances'], ['risques', 'Risques et qualité']]],
  ['Terrain', [['chantier', 'Chantier'], ['pointage', 'Pointage et émargement']]],
  ['Ressources', [['rh', 'Ressources humaines'], ['achats', 'Achats et fournisseurs']]],
  ['Après livraison', [['exploitation', 'Exploitation et maintenance']]],
  ['Dispositif', [['alertes', 'Alertes'], ['equipe', 'Comptes et accès'], ['import', 'Importer'], ['parametres', 'Paramètres']]],
];
function renderNav() {
  const nAl = alertes().filter(a => a.n === 'crit').length, nNotif = (S.data.notifications || []).filter(x => !(x.lu_par || []).includes(S.user.id)).length;
  $('#nav').innerHTML = VUES.map(([g, vs]) => '<h5>' + g + '</h5>' + vs.map(([id, lib]) => '<a href="#' + id + '" class="' + (S.vue === id ? 'actif' : '') + '">' + lib + (id === 'cockpit' && nAl ? '<span class="badge">' + nAl + '</span>' : '') + (id === 'alertes' && nNotif ? '<span class="badge">' + nNotif + '</span>' : '') + '</a>').join('')).join('');
}
function go(id, silencieux) { if (!RENDU[id]) id = 'cockpit'; S.vue = id; localStorage.setItem('cl_vue', id); if (location.hash !== '#' + id) history.replaceState(null, '', '#' + id); $('#main').innerHTML = RENDU[id](); if (MONTE[id]) MONTE[id](); renderNav(); if (!silencieux) window.scrollTo({ top: 0 }); }
window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (RENDU[h] && h !== S.vue) go(h); });
const RENDU = {}, MONTE = {};

/* ---------- indicateurs ---------- */
function kpis() {
  const d = S.data, p = S.prog || {}, don = p.donnees || {};
  const av = don.avancement || {}; const reel = av.reel ?? don.courbe?.reel?.at(-1) ?? null, prevu = av.prevu ?? (don.courbe?.prevu?.[(don.courbe?.reel?.length || 1) - 1] ?? null);
  const delai = (prevu != null && reel != null) ? reel - prevu : 0;
  const bud = d.budget.reduce((a, l) => ({ p: a.p + +l.prevu, e: a.e + +l.engage, d: a.d + +l.depense }), { p: 0, e: 0, d: 0 });
  const ecartCout = bud.p ? ((bud.e - bud.p * (bud.e / Math.max(bud.p, 1))) / bud.p) * 100 : 0;
  const ncOuv = d.nc.filter(n => !/clos/i.test(n.statut)), ncMaj = ncOuv.filter(n => /majeure/i.test(n.gravite));
  const qual = Math.max(80, 100 - ncOuv.length * 0.6 - ncMaj.length * 0.6);
  const score = d.risques.reduce((a, r) => a + (r.probabilite || 0) * (r.impact || 0), 0) / Math.max(1, d.risques.length);
  const marge = p.ca_cible && p.cout_cible ? ((p.ca_cible - p.cout_cible) / p.ca_cible) * 100 : null;
  const retards = d.commandes.filter(c => /retard/i.test(c.statut)).length;
  return [
    { id: 'delai', lib: 'Délai', val: (delai > 0 ? '+' : '') + fmt(delai), u: 'pts', n: delai <= -5 ? 'crit' : delai < -1 ? 'vig' : 'ok', exp: 'Avancement <b>' + fmt(reel) + ' %</b> réel pour ' + fmt(prevu) + ' % prévu' + (av.retard_semaines ? ' · ' + fmt(av.retard_semaines) + ' sem. de retard' : '') + ' · ' + (retards ? retards + ' livraison(s) en retard' : 'livraisons à l’heure') },
    { id: 'cout', lib: 'Coût', val: fmt(bud.p ? (bud.e / bud.p) * 100 : 0), u: '% engagé', n: bud.e > bud.p ? 'crit' : 'ok', exp: 'Tranche 1 : <b>' + fmt(bud.p) + ' Md</b> prévus · engagé ' + fmt(bud.e) + ' · dépensé ' + fmt(bud.d) },
    { id: 'perim', lib: 'Périmètre', val: fmt(p.logements), u: 'logements', n: 'ok', exp: d.quartiers.length + ' quartiers · ' + d.ilots.length + ' îlots · ' + fmt(p.surface_ha) + ' ha' },
    { id: 'qual', lib: 'Qualité', val: fmt(qual), u: '% conformes', n: ncMaj.length >= 4 ? 'crit' : ncMaj.length ? 'vig' : 'ok', exp: '<b>' + ncOuv.length + ' non-conformités</b> ouvertes · ' + ncMaj.length + ' majeures' },
    { id: 'risque', lib: 'Risques', val: fmt(score), u: '/ 25', n: score >= 14 ? 'crit' : score >= 9 ? 'vig' : 'ok', exp: d.risques.filter(r => (r.probabilite * r.impact) >= 12).length + ' risques majeurs suivis · plans d’action actifs' },
    { id: 'benef', lib: 'Bénéfices', val: marge == null ? '—' : fmt(marge), u: '% marge', n: marge == null ? 'ok' : marge < (p.marge_cible || 0) ? 'vig' : 'ok', exp: 'Cible <b>' + fmt(p.marge_cible) + ' %</b> · CA programme ' + fmt(p.ca_cible) + ' Md' },
  ];
}
function alertes() {
  const d = S.data, a = [];
  d.commandes.filter(c => /retard/i.test(c.statut)).forEach(c => a.push({ n: 'crit', t: 'Livraison en retard : ' + c.objet + (c.fournisseurs ? ' (' + c.fournisseurs.nom + ')' : ''), s: c.zone || '', v: 'achats' }));
  d.cameras.filter(c => !c.en_ligne).forEach(c => a.push({ n: 'vig', t: 'Caméra ' + c.code + ' (' + c.nom + ') hors ligne', s: c.dernier_evenement || '', v: 'chantier' }));
  d.nc.filter(n => /majeure/i.test(n.gravite) && !/clos/i.test(n.statut)).forEach(n => a.push({ n: 'vig', t: n.code + ' : ' + n.objet, s: n.zone + ' · ' + n.statut, v: 'risques' }));
  d.conges.filter(c => /valider/i.test(c.statut)).forEach(c => a.push({ n: 'info', t: 'Congé à valider : ' + (c.agents?.nom || '') + ' (' + c.debut + ' → ' + c.fin + ')', s: c.remplacant || '', v: 'rh' }));
  d.stocks.filter(s => +s.couverture_jours <= +s.seuil_jours).forEach(s => a.push({ n: 'vig', t: s.article + ' : ' + fmt(s.couverture_jours) + ' jours de couverture (seuil ' + fmt(s.seuil_jours) + ')', s: 'Commande à passer', v: 'achats' }));
  return a;
}
const pointagesDuJour = () => { const j = new Date().toDateString(); return S.data.pointages.filter(p => new Date(p.ts).toDateString() === j); };

/* ---------- vues ---------- */
const entete = (t, p) => '<div class="entete"><h1>' + t + '</h1>' + (p ? '<p>' + p + '</p>' : '') + '</div>';
const kpiCards = () => '<div class="g g6">' + kpis().map(k => '<div class="carte kpi ' + k.n + '"><div class="lib">' + k.lib + '<span class="etat ' + k.n + '">' + { ok: 'Maîtrisé', vig: 'Vigilance', crit: 'Critique' }[k.n] + '</span></div><div class="val">' + k.val + ' <small>' + k.u + '</small></div><div class="exp">' + k.exp + '</div></div>').join('') + '</div>';
const listeAlertes = () => { const a = alertes(); return a.length ? a.map(x => '<div class="alerte ' + x.n + '"><i></i><div><b>' + esc(x.t) + '</b><small>' + esc(x.s) + '</small></div><button class="btn petit" style="margin-left:auto" onclick="go(\'' + x.v + '\')">Ouvrir</button></div>').join('') : '<div class="vide">Aucune alerte.</div>'; };

RENDU.cockpit = () => {
  const p = S.prog; if (!p) return entete('Aucun programme', 'Créez un programme dans Paramètres.');
  const pj = pointagesDuJour(), presents = new Set(pj.filter(x => x.type === 'arrivee').map(x => x.agent_nom)).size;
  return entete('Cockpit du programme', '<b>' + esc(p.nom) + '</b> · semaine ' + p.semaine_courante + ' sur ' + p.semaines_total + ' · ' + dateFr(new Date()) + ' · six paramètres de réussite, calculés sur les données réelles du chantier.') + kpiCards() +
    '<div class="g g2" style="margin-top:1rem;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr)"><div class="carte"><h3>Alertes à traiter <small>' + alertes().length + ' alertes</small></h3>' + listeAlertes() + '</div>' +
    '<div><div class="carte"><h3>Aujourd’hui sur le terrain <small>' + dateFr(new Date()).split(' ').slice(0, 3).join(' ') + '</small></h3><div class="ligne"><span>Présents (émargés)</span><b>' + presents + ' / ' + S.data.agents.length + '</b></div><div class="ligne"><span>Émargements</span><b>' + pj.length + '</b></div><div class="ligne"><span>Photos cette semaine</span><b>' + S.data.photos.filter(x => (Date.now() - new Date(x.ts)) < 7 * 864e5).length + '</b></div><div class="ligne"><span>Caméras en ligne</span><b>' + S.data.cameras.filter(c => c.en_ligne).length + ' / ' + S.data.cameras.length + '</b></div><p style="margin-top:.8rem"><button class="btn primaire petit" onclick="go(\'pointage\')">Émarger</button> <button class="btn petit" onclick="go(\'chantier\')">Photos</button></p></div>' +
    '<div class="carte" style="margin-top:1rem"><h3>Phases du programme</h3>' + S.data.phases.map(f => '<div style="margin:.5rem 0"><div style="display:flex;justify-content:space-between;font-size:.9rem"><b>' + esc(f.nom) + '</b><span>' + fmt(f.avancement) + ' %</span></div><div class="barre"><i class="' + (f.avancement >= 100 ? 'ok' : '') + '" style="width:' + f.avancement + '%"></i></div></div>').join('') + '</div></div></div>';
};

RENDU.site = () => entete('Site et quartiers', esc(S.prog?.nom || '') + ' · ' + S.data.quartiers.length + ' quartiers, ' + S.data.ilots.length + ' îlots.') +
  '<div class="g g2"><div class="carte"><h3>Quartiers</h3><table><tr><th>Code</th><th>Nom</th><th>Tranche</th><th>Logements</th><th>État</th><th>Avancement</th></tr>' + S.data.quartiers.map(q => '<tr><td><b>' + esc(q.code) + '</b></td><td>' + esc(q.nom) + '</td><td>' + q.tranche + '</td><td>' + q.logements + '</td><td>' + esc(q.etat) + '</td><td>' + fmt(q.avancement) + ' %</td></tr>').join('') + '</table></div>' +
  '<div class="carte"><h3>Îlots</h3><table><tr><th>Îlot</th><th>Logements</th><th>Type</th><th>Étape</th><th>Avancement</th></tr>' + S.data.ilots.map(i => '<tr><td><b>' + esc(i.code) + '</b></td><td>' + i.logements + '</td><td>' + esc(i.typologie) + '</td><td>' + esc(i.etape) + '</td><td><div class="barre"><i class="' + (i.avancement >= 100 ? 'ok' : '') + '" style="width:' + i.avancement + '%"></i></div></td></tr>').join('') + '</table></div></div>';

RENDU.finances = () => { const b = S.data.budget, tot = b.reduce((a, l) => ({ p: a.p + +l.prevu, e: a.e + +l.engage, d: a.d + +l.depense }), { p: 0, e: 0, d: 0 }); const v = S.prog?.donnees?.ventes;
  return entete('Finances et ventes', 'Budget de la tranche 1 par poste (' + esc(S.prog?.donnees?.unites?.budget || '') + '), ventes et trésorerie.') + '<div class="g g2"><div class="carte"><h3>Budget tranche 1 <small>prévu ' + fmt(tot.p) + ' · engagé ' + fmt(tot.e) + ' · dépensé ' + fmt(tot.d) + '</small></h3><table><tr><th>Poste</th><th>Prévu</th><th>Engagé</th><th>Dépensé</th></tr>' + b.map(l => '<tr><td>' + esc(l.poste) + '</td><td>' + fmt(l.prevu) + '</td><td>' + fmt(l.engage) + '</td><td>' + fmt(l.depense) + '</td></tr>').join('') + '</table></div>' +
    '<div class="carte"><h3>Ventes</h3>' + (v ? '<div class="ligne"><span>Lots tranche 1</span><b>' + v.total + '</b></div><div class="ligne"><span>Réservés</span><b>' + v.reserves + '</b></div><div class="ligne"><span>Actes signés</span><b>' + v.actes + '</b></div><div class="ligne"><span>Acomptes encaissés</span><b>' + fmt(v.acomptes) + ' Md</b></div>' + (v.canaux || []).map(c => '<div class="ligne"><span>' + esc(c.nom) + '</span><b>' + c.n + '</b></div>').join('') : '<div class="vide">Aucune vente saisie.</div>') + '</div></div>'; };

RENDU.risques = () => entete('Risques et qualité', 'Matrice des risques et non-conformités du programme.') + '<div class="g g2"><div class="carte"><h3>Risques <small>' + S.data.risques.length + '</small></h3>' + S.data.risques.map(r => '<div class="alerte ' + ((r.probabilite * r.impact) >= 12 ? 'crit' : (r.probabilite * r.impact) >= 8 ? '' : 'ok') + '"><i></i><div><b>' + esc(r.code) + ' · ' + esc(r.titre) + '</b><small>P' + r.probabilite + ' × I' + r.impact + ' = ' + r.probabilite * r.impact + ' · ' + esc(r.responsable || '') + ' · ' + esc(r.plan || '') + '</small></div></div>').join('') + '</div>' +
  '<div class="carte"><h3>Non-conformités <small>' + S.data.nc.filter(n => !/clos/i.test(n.statut)).length + ' ouvertes</small></h3><table><tr><th>Code</th><th>Zone</th><th>Objet</th><th>Gravité</th><th>Statut</th></tr>' + S.data.nc.map(n => '<tr><td><b>' + esc(n.code) + '</b></td><td>' + esc(n.zone) + '</td><td>' + esc(n.objet) + '</td><td><span class="etat ' + (/majeure/i.test(n.gravite) ? 'crit' : 'vig') + '">' + esc(n.gravite) + '</span></td><td>' + esc(n.statut) + '</td></tr>').join('') + '</table></div></div>';

RENDU.chantier = () => { const peutPhoto = PEUT.photo.includes(S.role);
  return entete('Chantier en direct', 'Photos géolocalisées des équipes, caméras et journal du jour. <b>Prenez une photo depuis votre téléphone</b> : elle apparaît sur tous les écrans du programme.') +
    '<div class="g g2" style="grid-template-columns:minmax(0,1.5fr) minmax(0,1fr)"><div><div class="carte"><h3>Journal photo <small>' + S.data.photos.length + ' photos</small></h3>' + (peutPhoto ? '<div class="g g3" style="gap:.6rem"><label class="champ">Zone<select id="phZone"><option>Vue générale</option>' + S.data.ilots.map(i => '<option>Îlot ' + esc(i.code) + '</option>').join('') + '<option>Voirie</option><option>Base vie</option><option>Centrale béton</option></select></label><label class="champ">Légende<input id="phLeg" placeholder="Ex. : coulage semelles A6"></label><label class="champ">Auteur<select id="phAuteur">' + S.data.agents.map(a => '<option value="' + a.id + '">' + esc(a.nom) + ' — ' + esc(a.fonction || '') + '</option>').join('') + '</select></label></div><p style="margin-bottom:1rem"><button class="btn primaire" id="btnCam">📷 Prendre une photo</button> <button class="btn" id="btnGal">Importer</button></p>' : '') +
    (S.data.photos.length ? '<div class="photos" id="photos">' + S.data.photos.map(p => '<figure data-path="' + esc(p.path) + '"><img alt="" loading="lazy"><figcaption><b>' + esc(p.legende || p.zone || '') + '</b>' + esc(p.zone || '') + ' · ' + esc(p.auteur_nom || '') + ' · ' + new Date(p.ts).toLocaleDateString('fr-FR') + ' ' + hhmm(p.ts) + (p.lat ? ' · GPS' : '') + '</figcaption></figure>').join('') + '</div>' : '<div class="vide">Aucune photo pour l’instant. Prenez la première depuis votre téléphone.</div>') + '</div></div>' +
    '<div><div class="carte"><h3>Caméras <small>' + S.data.cameras.filter(c => c.en_ligne).length + ' / ' + S.data.cameras.length + ' en ligne ' + boutonAjout('camera') + '</small></h3>' + S.data.cameras.map(c => '<div class="ligne"><span><b>' + esc(c.code) + '</b> ' + esc(c.nom) + '<br><small class="muted">' + esc(c.dernier_evenement || '') + '</small></span><span style="display:flex;gap:.4rem;align-items:center"><span class="etat ' + (c.en_ligne ? 'ok' : 'crit') + '">' + (c.en_ligne ? 'En ligne' : 'Hors ligne') + '</span>' + boutonEdit('camera', c.id) + '</span></div>').join('') + '</div>' +
    '<div class="carte" style="margin-top:1rem"><h3>Journal du jour <small>' + boutonAjout('journal', 'Événement') + '</small></h3>' + (S.data.journal.length ? S.data.journal.map(j => '<div class="ligne"><span><b>' + hhmm(j.ts) + '</b> ' + esc(j.titre) + '</span><span class="tag">' + esc(j.statut || '') + '</span></div>').join('') : '<div class="vide">Journal vide.</div>') + '</div></div></div>'; };
MONTE.chantier = async () => {
  $('#btnCam')?.addEventListener('click', () => $('#fileCam').click()); $('#btnGal')?.addEventListener('click', () => $('#fileGal').click());
  const figs = $$('#photos figure'); if (!figs.length) return;
  const { data } = await sb.storage.from('photos').createSignedUrls(figs.map(f => f.dataset.path), 3600);
  (data || []).forEach((u, i) => { if (u.signedUrl) figs[i].querySelector('img').src = u.signedUrl; });
};
$('#fileCam').addEventListener('change', e => traiterPhoto(e.target.files[0])); $('#fileGal').addEventListener('change', e => traiterPhoto(e.target.files[0]));
async function traiterPhoto(file) {
  if (!file) return; toast('Traitement de la photo…'); const pos = await positionRapide();
  const blob = await redimensionner(file, 1600, 0.82); const id = uid(), path = S.org.id + '/' + S.prog.id + '/' + new Date().toISOString().slice(0, 10) + '/' + id + '.jpg';
  const ag = S.data.agents.find(a => a.id === $('#phAuteur')?.value);
  const rec = { programme_id: S.prog.id, org_id: S.org.id, zone: $('#phZone')?.value || null, legende: $('#phLeg')?.value || null, auteur_agent_id: ag?.id || null, auteur_nom: ag?.nom || S.user.email, ts: new Date().toISOString(), lat: pos?.lat ?? null, lng: pos?.lng ?? null, path, client_id: id };
  const up = await sb.storage.from('photos').upload(path, blob, { contentType: 'image/jpeg', upsert: false });
  if (up.error) { toast('<b>Envoi impossible</b> ' + esc(up.error.message) + ' — la photo est conservée et sera renvoyée.'); S.fileAttente.push({ type: 'photo', rec, blobUrl: null }); return; }
  const { error } = await sb.from('photos').insert(rec);
  if (error) { toast('<b>Erreur</b> ' + esc(error.message)); return; }
  toast('<b>Photo enregistrée</b>' + (pos ? ' · géolocalisée' : '')); $('#fileCam').value = ''; $('#fileGal').value = '';
}
function redimensionner(file, max, q) { return new Promise(res => { const img = new Image(); img.onload = () => { const r = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * r); c.height = Math.round(img.height * r); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); c.toBlob(b => { URL.revokeObjectURL(img.src); res(b); }, 'image/jpeg', q); }; img.src = URL.createObjectURL(file); }); }
function positionRapide() { return new Promise(res => { if (!navigator.geolocation) return res(null); navigator.geolocation.getCurrentPosition(p => res({ lat: p.coords.latitude, lng: p.coords.longitude, prec: p.coords.accuracy }), () => res(null), { enableHighAccuracy: true, timeout: 6000, maximumAge: 30000 }); }); }

RENDU.pointage = () => { const peut = PEUT.pointer.includes(S.role), pj = pointagesDuJour();
  const parAgent = {}; pj.slice().reverse().forEach(p => { parAgent[p.agent_nom] = parAgent[p.agent_nom] || { arr: null, dep: null, sur: null }; if (p.type === 'arrivee' && !parAgent[p.agent_nom].arr) parAgent[p.agent_nom].arr = p; if (p.type === 'depart') parAgent[p.agent_nom].dep = p; });
  return entete('Pointage et émargement', 'Chaque agent signe sur le téléphone du chef d’équipe. La signature enregistre <b>la position, la date et l’heure</b> ; la base calcule la distance au site.') +
    '<div class="g g2">' + (peut ? '<div class="carte"><h3>Émarger maintenant</h3><label class="champ">Agent<select id="agentSel">' + S.data.agents.map(a => '<option value="' + a.id + '">' + esc(a.nom) + ' — ' + esc(a.fonction || '') + '</option>').join('') + '<option value="visiteur">Visiteur (test)</option></select></label>' +
      '<div class="seg"><button class="' + (S.typePointage === 'arrivee' ? 'on' : '') + '" data-t="arrivee">Arrivée</button><button class="' + (S.typePointage === 'depart' ? 'on' : '') + '" data-t="depart">Départ</button></div>' +
      '<div class="champ">Signature de l’agent<div class="sig" id="sig"><canvas id="sigCanvas"></canvas><div class="aide" id="sigAide">Signez ici avec le doigt</div><div class="trait"></div></div></div><p style="display:flex;gap:.6rem;align-items:center;margin-top:-.4rem"><button class="btn petit" id="sigEffacer">Effacer</button><small class="muted">Appareil : ' + esc(appareil()) + '</small></p>' +
      '<div class="gps" id="gps"><i></i><span>Recherche de la position…</span></div><p style="display:flex;gap:.6rem;flex-wrap:wrap"><button class="btn primaire" id="btnValider">Valider l’émargement</button><button class="btn" id="btnGps">Relancer le GPS</button></p>' + (S.fileAttente.length ? '<p class="mini" style="margin-top:.6rem">' + S.fileAttente.length + ' saisie(s) en attente d’envoi (hors ligne).</p>' : '') + '</div>' : '<div class="carte"><div class="vide">Votre rôle (' + ROLES[S.role] + ') ne permet pas d’émarger.</div></div>') +
    '<div class="carte"><h3>Feuille de présence du jour <small>' + new Date().toLocaleDateString('fr-FR') + ' · ' + Object.keys(parAgent).length + ' agents</small></h3>' + (Object.keys(parAgent).length ? '<table><tr><th>Agent</th><th>Arrivée</th><th>Départ</th><th>Position</th><th>Signature</th></tr>' + Object.entries(parAgent).map(([n, x]) => { const p = x.arr || x.dep; return '<tr><td><b>' + esc(n) + '</b></td><td>' + (x.arr ? hhmm(x.arr.ts) : '—') + '</td><td>' + (x.dep ? hhmm(x.dep.ts) : '—') + '</td><td>' + (p.lat ? '<span class="etat ' + (p.sur_site ? 'ok' : 'vig') + '">' + (p.sur_site ? 'Sur site' : 'Hors site') + ' · ' + fmt(p.distance_m) + ' m</span>' : '<span class="etat">Sans GPS</span>') + '</td><td>' + (p.signature_path ? '<img data-sig="' + esc(p.signature_path) + '" alt="signature" style="height:26px;opacity:.85">' : '—') + '</td></tr>'; }).join('') + '</table>' : '<div class="vide">Aucun émargement aujourd’hui.</div>') + '</div></div>'; };
MONTE.pointage = async () => {
  const sigs = $$('img[data-sig]'); if (sigs.length) { const { data } = await sb.storage.from('signatures').createSignedUrls(sigs.map(i => i.dataset.sig), 3600); (data || []).forEach((u, i) => { if (u.signedUrl) sigs[i].src = u.signedUrl; }); }
  if (!$('#sigCanvas')) return;
  $$('.seg button').forEach(b => b.addEventListener('click', () => { S.typePointage = b.dataset.t; $$('.seg button').forEach(x => x.classList.toggle('on', x === b)); }));
  const c = $('#sigCanvas'), ctx = c.getContext('2d'); const dpr = window.devicePixelRatio || 1; const taille = () => { const r = c.getBoundingClientRect(); c.width = r.width * dpr; c.height = r.height * dpr; ctx.scale(dpr, dpr); ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#0B1D33'; }; taille();
  let dessin = false, last = null; S.sigVide = true;
  const pt = e => { const r = c.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  c.addEventListener('pointerdown', e => { dessin = true; last = pt(e); c.setPointerCapture(e.pointerId); $('#sigAide').style.display = 'none'; S.sigVide = false; });
  c.addEventListener('pointermove', e => { if (!dessin) return; const p = pt(e); ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke(); last = p; });
  const fin = () => { dessin = false; }; c.addEventListener('pointerup', fin); c.addEventListener('pointercancel', fin);
  $('#sigEffacer').addEventListener('click', () => { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, c.width, c.height); taille(); S.sigVide = true; $('#sigAide').style.display = ''; });
  $('#btnGps').addEventListener('click', lancerGPS); lancerGPS();
  $('#btnValider').addEventListener('click', validerPointage);
};
function appareil() { const u = navigator.userAgent; return /iPhone/.test(u) ? 'iPhone' : /iPad/.test(u) ? 'iPad' : /Android/.test(u) ? 'Android' : /Mac/.test(u) ? 'Mac' : /Windows/.test(u) ? 'Windows' : 'Navigateur'; }
function lancerGPS() { const g = $('#gps'); if (!g) return; g.className = 'gps'; g.innerHTML = '<i></i><span>Recherche de la position…</span>'; S.gps = null;
  if (!navigator.geolocation) { g.className = 'gps err'; g.innerHTML = '<i></i><span>Géolocalisation indisponible sur cet appareil.</span>'; return; }
  navigator.geolocation.getCurrentPosition(p => { S.gps = { lat: p.coords.latitude, lng: p.coords.longitude, prec: Math.round(p.coords.accuracy) }; const pr = S.prog; let d = null; if (pr?.centre_lat != null) d = Math.round(haversine(S.gps.lat, S.gps.lng, pr.centre_lat, pr.centre_lng)); const sur = d != null && d <= (pr.rayon_m || 1500);
    g.className = 'gps ' + (d == null ? 'ok' : sur ? 'ok' : 'hors'); g.innerHTML = '<i></i><span><b>' + (d == null ? 'Position acquise' : sur ? 'Sur site' : 'Hors site') + '</b> · ' + S.gps.lat.toFixed(5) + ', ' + S.gps.lng.toFixed(5) + ' · ± ' + S.gps.prec + ' m' + (d != null ? ' · à ' + fmt(d) + ' m du centre du chantier' : '') + '</span>'; },
    err => { g.className = 'gps err'; g.innerHTML = '<i></i><span><b>Position refusée ou indisponible</b> · l’émargement sera enregistré sans position (' + esc(err.message) + ').</span>'; }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }); }
function haversine(a, b, c, d) { const R = 6371000, r = x => x * Math.PI / 180, h = Math.sin(r(c - a) / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(r(d - b) / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); }
async function validerPointage() {
  if (S.sigVide) { toast('<b>Signature manquante</b> — l’agent doit signer dans le cadre.'); return; }
  const sel = $('#agentSel'), ag = S.data.agents.find(a => a.id === sel.value); const nom = ag ? ag.nom : 'Visiteur (test)';
  const c = $('#sigCanvas'); const out = document.createElement('canvas'); out.width = 300; out.height = 110; out.getContext('2d').drawImage(c, 0, 0, 300, 110);
  const blob = await new Promise(r => out.toBlob(r, 'image/png')); const id = uid(); const path = S.org.id + '/' + S.prog.id + '/' + new Date().toISOString().slice(0, 10) + '/' + id + '.png';
  const rec = { programme_id: S.prog.id, org_id: S.org.id, agent_id: ag?.id || null, agent_nom: nom, type: S.typePointage, ts: new Date().toISOString(), ts_appareil: new Date().toISOString(), lat: S.gps?.lat ?? null, lng: S.gps?.lng ?? null, precision_m: S.gps?.prec ?? null, device: appareil(), signature_path: path, client_id: id };
  $('#btnValider').disabled = true;
  const up = await sb.storage.from('signatures').upload(path, blob, { contentType: 'image/png' });
  if (up.error) { $('#btnValider').disabled = false; if (!navigator.onLine) { S.fileAttente.push({ type: 'pointage', rec }); localStorage.setItem('cl_file', JSON.stringify(S.fileAttente)); toast('<b>Hors ligne</b> — émargement conservé, il sera envoyé au retour du réseau.'); go('pointage', true); } else toast('<b>Envoi impossible</b> ' + esc(up.error.message)); return; }
  const { data, error } = await sb.from('pointages').insert(rec).select('distance_m,sur_site').single();
  $('#btnValider').disabled = false;
  if (error) { toast('<b>Refusé</b> ' + esc(error.message)); return; }
  toast('<b>Émargement enregistré</b> ' + esc(nom) + ' · ' + hhmm(rec.ts) + (data?.sur_site != null ? (data.sur_site ? ' · sur site' : ' · hors site') + ' (' + fmt(data.distance_m) + ' m)' : ' · sans position'));
  await rafraichir('pointages'); go('pointage', true);
}
async function viderFileAttente() { if (!S.fileAttente.length) return; const reste = []; for (const f of S.fileAttente) { if (f.type === 'pointage') { const r = { ...f.rec, signature_path: null }; const { error } = await sb.from('pointages').insert(r); if (error && !/duplicate/i.test(error.message)) reste.push(f); } } S.fileAttente = reste; localStorage.setItem('cl_file', JSON.stringify(reste)); if (!reste.length) toast('<b>Synchronisation terminée</b> — saisies hors ligne envoyées.'); }

RENDU.rh = () => { const pj = pointagesDuJour(); const parEq = {}; S.data.agents.forEach(a => { const e = a.equipes?.nom || '—'; parEq[e] = parEq[e] || { n: 0, p: 0 }; parEq[e].n++; if (pj.some(x => x.agent_nom === a.nom && x.type === 'arrivee')) parEq[e].p++; });
  return entete('Ressources humaines', S.data.agents.length + ' agents actifs · présences calculées sur les émargements du jour.') + '<div class="g g2"><div class="carte"><h3>Présence par équipe <small>aujourd’hui</small></h3>' + Object.entries(parEq).map(([e, x]) => '<div class="ligne"><span>' + esc(e) + '</span><b>' + x.p + ' / ' + x.n + '</b></div>').join('') + '</div>' +
    '<div class="carte"><h3>Congés et absences</h3>' + (S.data.conges.length ? '<table><tr><th>Agent</th><th>Type</th><th>Du</th><th>Au</th><th>Statut</th></tr>' + S.data.conges.map(c => '<tr><td><b>' + esc(c.agents?.nom || '') + '</b></td><td>' + esc(c.type) + '</td><td>' + c.debut + '</td><td>' + c.fin + '</td><td><span class="etat ' + (/valider/i.test(c.statut) ? 'vig' : 'ok') + '">' + esc(c.statut) + '</span></td></tr>').join('') + '</table>' : '<div class="vide">Aucun congé.</div>') + '</div>' +
    '<div class="carte" style="grid-column:1/-1"><h3>Effectif <small>' + S.data.agents.length + '</small></h3><table><tr><th>Matricule</th><th>Nom</th><th>Fonction</th><th>Équipe</th><th>Salaire mensuel</th><th>Aujourd’hui</th></tr>' + S.data.agents.map(a => { const arr = pj.find(x => x.agent_nom === a.nom && x.type === 'arrivee'); return '<tr><td>' + esc(a.matricule || '') + '</td><td><b>' + esc(a.nom) + '</b></td><td>' + esc(a.fonction || '') + '</td><td>' + esc(a.equipes?.nom || '') + '</td><td>' + (PEUT.admin.includes(S.role) ? fmt(a.salaire_mensuel) : '•••') + '</td><td>' + (arr ? '<span class="etat ok">Présent ' + hhmm(arr.ts) + '</span>' : '<span class="etat">Non émargé</span>') + '</td></tr>'; }).join('') + '</table></div></div>'; };

RENDU.achats = () => entete('Achats et fournisseurs', 'Commandes en cours, livraisons attendues et stocks critiques.') + '<div class="g g2"><div class="carte" style="grid-column:1/-1"><h3>Commandes <small>' + S.data.commandes.length + '</small></h3><table><tr><th>N°</th><th>Fournisseur</th><th>Objet</th><th>Quantité</th><th>Montant</th><th>Livraison prévue</th><th>Statut</th></tr>' + S.data.commandes.map(c => '<tr><td><b>' + esc(c.numero) + '</b></td><td>' + esc(c.fournisseurs?.nom || '') + '</td><td>' + esc(c.objet) + '</td><td>' + esc(c.quantite || '') + '</td><td>' + fmt(c.montant) + ' ' + esc(c.devise || '') + '</td><td>' + (c.livraison_prevue || '—') + '</td><td><span class="etat ' + (/retard/i.test(c.statut) ? 'crit' : /livr/i.test(c.statut) ? 'ok' : '') + '">' + esc(c.statut) + '</span></td></tr>').join('') + '</table></div>' +
  '<div class="carte"><h3>Stocks</h3>' + S.data.stocks.map(s => '<div class="ligne"><span>' + esc(s.article) + ' <small class="muted">' + esc(s.quantite || '') + '</small></span><span class="etat ' + (+s.couverture_jours <= +s.seuil_jours ? 'crit' : +s.couverture_jours <= +s.seuil_jours + 2 ? 'vig' : 'ok') + '">' + fmt(s.couverture_jours) + ' j</span></div>').join('') + '</div></div>';

RENDU.equipe = () => entete('Comptes et accès', 'Les personnes qui ont accès à ' + esc(S.org.nom) + ' et leur rôle. Chaque action est journalisée.') + '<div class="g g2"><div class="carte"><h3>Membres</h3><div id="membres">Chargement…</div>' + (PEUT.admin.includes(S.role) ? '<p style="margin-top:1rem"><button class="btn primaire" onclick="inviter()">Inviter une personne</button></p>' : '') + '</div><div class="carte"><h3>Invitations en attente</h3><div id="invits">Chargement…</div></div>' + (PEUT.admin.includes(S.role) ? '<div class="carte" style="grid-column:1/-1"><h3>Journal d’audit <small>50 dernières actions</small></h3><div id="audit">Chargement…</div></div>' : '') + '</div>';
MONTE.equipe = async () => {
  const { data: m } = await sb.from('membres').select('user_id, role, actif, profils(email, nom)').eq('org_id', S.org.id);
  $('#membres').innerHTML = (m || []).length ? '<table><tr><th>Nom</th><th>E-mail</th><th>Rôle</th></tr>' + m.map(x => '<tr><td><b>' + esc(x.profils?.nom || '') + '</b></td><td>' + esc(x.profils?.email || '') + '</td><td>' + (PEUT.admin.includes(S.role) && x.user_id !== S.user.id ? '<select onchange="changerRole(\'' + x.user_id + '\', this.value)">' + Object.entries(ROLES).map(([k, v]) => '<option value="' + k + '"' + (k === x.role ? ' selected' : '') + '>' + v + '</option>').join('') + '</select>' : ROLES[x.role]) + '</td></tr>').join('') + '</table>' : '<div class="vide">Aucun membre.</div>';
  const { data: inv } = await sb.from('invitations').select('*').eq('org_id', S.org.id).is('accepte_le', null);
  $('#invits').innerHTML = (inv || []).length ? inv.map(i => '<div class="ligne"><span><b>' + esc(i.email) + '</b> · ' + ROLES[i.role] + '</span>' + (PEUT.admin.includes(S.role) ? '<button class="btn petit" onclick="annulerInvit(\'' + i.id + '\')">Annuler</button>' : '') + '</div>').join('') : '<div class="vide">Aucune invitation en attente.</div>';
  if ($('#audit')) { const { data: a } = await sb.from('audit_log').select('ts, action, table_name, user_email, detail').eq('org_id', S.org.id).order('ts', { ascending: false }).limit(50); $('#audit').innerHTML = (a || []).length ? '<table><tr><th>Quand</th><th>Qui</th><th>Action</th><th>Table</th><th>Détail</th></tr>' + a.map(x => '<tr><td>' + new Date(x.ts).toLocaleString('fr-FR') + '</td><td>' + esc(x.user_email || 'système') + '</td><td>' + esc(x.action) + '</td><td>' + esc(x.table_name) + '</td><td class="mini">' + esc(JSON.stringify(x.detail || {}).slice(0, 90)) + '</td></tr>').join('') + '</table>' : '<div class="vide">Journal vide.</div>'; }
};
window.inviter = () => modal('<h2>Inviter une personne</h2><p class="muted" style="margin:.4rem 0 1rem">Elle recevra l’accès dès sa première connexion avec cette adresse.</p><label class="champ">E-mail<input id="invEmail" type="email"></label><label class="champ">Nom<input id="invNom"></label><label class="champ">Rôle<select id="invRole">' + Object.entries(ROLES).map(([k, v]) => '<option value="' + k + '">' + v + '</option>').join('') + '</select></label><p style="display:flex;gap:.6rem;justify-content:flex-end"><button class="btn" onclick="fermerModal()">Annuler</button><button class="btn primaire" onclick="envoyerInvit()">Inviter</button></p>');
window.envoyerInvit = async () => { const email = $('#invEmail').value.trim(); if (!email) return; const { error } = await sb.from('invitations').insert({ org_id: S.org.id, email, nom: $('#invNom').value, role: $('#invRole').value, invite_par: S.user.id }); if (error) { toast('<b>Erreur</b> ' + esc(error.message)); return; } fermerModal(); toast('<b>Invitation enregistrée</b> pour ' + esc(email)); go('equipe', true); };
window.annulerInvit = async id => { await sb.from('invitations').delete().eq('id', id); go('equipe', true); };
window.changerRole = async (user_id, role) => { const { error } = await sb.from('membres').update({ role }).eq('org_id', S.org.id).eq('user_id', user_id); toast(error ? '<b>Erreur</b> ' + esc(error.message) : '<b>Rôle mis à jour</b>'); };

RENDU.parametres = () => entete('Paramètres', 'Organisation, programme et compte.') + '<div class="g g2"><div class="carte"><h3>Organisation</h3><div class="ligne"><span>Client</span><b>' + esc(S.org.nom) + '</b></div><div class="ligne"><span>Pays · devise</span><b>' + esc(S.org.pays || '') + ' · ' + esc(S.org.devise) + '</b></div><div class="ligne"><span>Formule</span><b>' + esc(S.org.plan) + '</b></div><div class="ligne"><span>Votre rôle</span><b>' + ROLES[S.role] + '</b></div>' + (S.orgs.length > 1 ? '<label class="champ" style="margin-top:.8rem">Changer d’organisation<select onchange="changerOrg(this.value)">' + S.orgs.map(o => '<option value="' + o.id + '"' + (o.id === S.org.id ? ' selected' : '') + '>' + esc(o.nom) + '</option>').join('') + '</select></label>' : '') + '</div>' +
  '<div class="carte"><h3>Programme</h3>' + (S.prog ? '<div class="ligne"><span>Nom</span><b>' + esc(S.prog.nom) + '</b></div><div class="ligne"><span>Centre du site</span><b>' + (S.prog.centre_lat != null ? S.prog.centre_lat.toFixed(4) + ', ' + S.prog.centre_lng.toFixed(4) : 'non défini') + '</b></div><div class="ligne"><span>Rayon « sur site »</span><b>' + S.prog.rayon_m + ' m</b></div>' + (PEUT.admin.includes(S.role) ? '<p style="margin-top:.8rem;display:flex;gap:.6rem;flex-wrap:wrap"><button class="btn" onclick="definirCentre()">Définir le centre ici (ma position)</button><button class="btn" onclick="changerRayon()">Changer le rayon</button></p>' : '') : '<div class="vide">Aucun programme.</div>') + (S.programmes.length > 1 ? '<label class="champ" style="margin-top:.8rem">Changer de programme<select onchange="changerProg(this.value)">' + S.programmes.map(p => '<option value="' + p.id + '"' + (p.id === S.prog?.id ? ' selected' : '') + '>' + esc(p.nom) + '</option>').join('') + '</select></label>' : '') + '</div>' +
  '<div class="carte"><h3>Mon compte</h3><div class="ligne"><span>E-mail</span><b>' + esc(S.user.email) + '</b></div><p style="margin-top:.8rem;display:flex;gap:.6rem;flex-wrap:wrap"><button class="btn" onclick="changerMdp()">Changer le mot de passe</button><button class="btn" onclick="deconnexion()">Se déconnecter</button></p></div>' +
  '<div class="carte"><h3>Application</h3><p class="muted" style="font-size:.9rem">Version 0.3 · socle multi-clients. Ajoutez cette page à l’écran d’accueil de votre téléphone pour l’utiliser comme une application.</p><div class="ligne"><span>Temps réel</span><b id="etatRt">' + $('#conn span').textContent + '</b></div><div class="ligne"><span>Saisies en attente</span><b>' + S.fileAttente.length + '</b></div></div></div>';
window.changerOrg = id => { localStorage.setItem('cl_org', id); localStorage.removeItem('cl_prog'); S.org = S.orgs.find(o => o.id === id); S.role = S.org.role; chargerProgrammes(); };
window.changerProg = id => { localStorage.setItem('cl_prog', id); chargerProgrammes(); };
window.definirCentre = () => navigator.geolocation.getCurrentPosition(async p => { const { error } = await sb.from('programmes').update({ centre_lat: p.coords.latitude, centre_lng: p.coords.longitude }).eq('id', S.prog.id); if (error) return toast('<b>Erreur</b> ' + esc(error.message)); S.prog.centre_lat = p.coords.latitude; S.prog.centre_lng = p.coords.longitude; toast('<b>Centre du site défini</b> sur votre position.'); go('parametres', true); }, e => toast('Position indisponible : ' + esc(e.message)), { enableHighAccuracy: true, timeout: 12000 });
window.changerRayon = async () => { const r = parseInt(prompt('Rayon « sur site » en mètres', S.prog.rayon_m), 10); if (!r) return; const { error } = await sb.from('programmes').update({ rayon_m: r }).eq('id', S.prog.id); if (error) return toast('<b>Erreur</b> ' + esc(error.message)); S.prog.rayon_m = r; go('parametres', true); };
window.changerMdp = (force) => modal('<h2>' + (force ? 'Choisissez votre mot de passe' : 'Changer le mot de passe') + '</h2><p class="muted" style="margin:.4rem 0 1rem">' + (force ? 'Votre mot de passe temporaire doit être remplacé.' : 'Au moins 10 caractères.') + '</p><label class="champ">Nouveau mot de passe<input id="mdp1" type="password" autocomplete="new-password"></label><label class="champ">Confirmer<input id="mdp2" type="password" autocomplete="new-password"></label><p class="statut" id="mdpStatut"></p><p style="display:flex;gap:.6rem;justify-content:flex-end">' + (force ? '' : '<button class="btn" onclick="fermerModal()">Annuler</button>') + '<button class="btn primaire" onclick="validerMdp()">Enregistrer</button></p>');
window.validerMdp = async () => { const a = $('#mdp1').value, b = $('#mdp2').value, st = $('#mdpStatut'); if (a.length < 10) { st.className = 'statut err'; st.textContent = 'Au moins 10 caractères.'; return; } if (a !== b) { st.className = 'statut err'; st.textContent = 'Les deux saisies diffèrent.'; return; } const { error } = await sb.auth.updateUser({ password: a, data: { doit_changer_mdp: false } }); if (error) { st.className = 'statut err'; st.textContent = error.message; return; } fermerModal(); toast('<b>Mot de passe enregistré</b>'); };
window.deconnexion = async () => { await sb.auth.signOut(); localStorage.removeItem('cl_org'); localStorage.removeItem('cl_prog'); };
$('#btnCompte').addEventListener('click', () => go('parametres'));
window.go = go; window.fermerModal = fermerModal;

/* ---------- amorçage ---------- */
(async () => { const { data } = await sb.auth.getSession(); if (!data.session) afficherAuth(); })();

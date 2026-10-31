/* ============================================================
   ChantierLive — marque blanche (étape 6)
   Résout la marque à afficher AVANT app.js : identifiant « ?marque= », domaine
   personnalisé vérifié, ou marque de l'organisation après connexion.
   Une licence active est requise côté base (fonction marque_publique).
   ============================================================ */
const CENTRAL = { url: 'https://vdzzvnuarmprkickeyus.supabase.co', key: 'sb_publishable_Mq8zAuTA--p4R7LoOix07A_B6jcRQWK' };
const MARQUE_DEFAUT = { slug: 'chantierlive', nom: 'ChantierLive', slogan: 'Votre chantier, en direct. Entrez l’adresse e-mail de votre compte.', encre: '#0B1D33', signal: '#E4572E', craie: '#F7F3EB', masquer: false, instance: null };
const HOTES_CHANTIERLIVE = ['chantierlive.com', 'www.chantierlive.com', 'app.chantierlive.com', 'byande.github.io', 'localhost', '127.0.0.1'];
window.MARQUE = { ...MARQUE_DEFAUT };

/* ---- couleurs ---- */
const hex2rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const rgb2hex = c => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const melange = (a, b, t) => rgb2hex(hex2rgb(a).map((v, i) => v + (hex2rgb(b)[i] - v) * t));
const clair = h => { const [r, g, b] = hex2rgb(h); return (r * 299 + g * 587 + b * 114) / 1000 > 150; };

/* ---- application au document ---- */
const MARK_SVG = (trait) => '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M10 26V16a6 6 0 0 1 6-6h10" fill="none" stroke="' + trait + '" stroke-width="5" stroke-linecap="round"/><path d="M54 38v10a6 6 0 0 1-6 6H38" fill="none" stroke="' + trait + '" stroke-width="5" stroke-linecap="round"/><circle cx="32" cy="32" r="7.5" fill="#E4572E"/><circle cx="32" cy="32" r="13.5" fill="none" stroke="#E4572E" stroke-width="2" opacity=".5"/></svg>';
function appliquerMarque(m) {
  m = { ...MARQUE_DEFAUT, ...(m || {}) }; window.MARQUE = m;
  const defaut = m.slug === 'chantierlive', r = document.documentElement.style;
  const encre = m.encre || MARQUE_DEFAUT.encre, signal = m.signal || MARQUE_DEFAUT.signal, craie = m.craie || MARQUE_DEFAUT.craie;
  r.setProperty('--encre', encre); r.setProperty('--nuit', melange(encre, '#000000', .45)); r.setProperty('--signal', signal); r.setProperty('--signal-ombre', melange(signal, '#000000', .2));
  r.setProperty('--craie', craie); r.setProperty('--papier', melange(craie, '#ffffff', .65)); r.setProperty('--sable', melange(craie, '#000000', .06));
  const [er, eg, eb] = hex2rgb(encre); r.setProperty('--hair', 'rgba(' + er + ',' + eg + ',' + eb + ',.08)'); r.setProperty('--hair2', 'rgba(' + er + ',' + eg + ',' + eb + ',.14)');
  r.setProperty('--texte-sur-encre', clair(encre) ? '#0B1D33' : craie);
  const nomHtml = defaut ? 'Chantier<span>Live</span>' : escM(m.nom);
  const top = document.querySelector('.top .brand'); if (top) { top.querySelector('svg, img')?.remove(); top.insertAdjacentHTML('afterbegin', (m.logo_sombre_url || m.logo_url) && !defaut ? '<img src="' + escM(m.logo_sombre_url || m.logo_url) + '" alt="">' : MARK_SVG(clair(encre) ? '#0B1D33' : '#F7F3EB')); top.querySelector('b').innerHTML = nomHtml; }
  const ba = document.querySelector('.brandAuth'); if (ba) { ba.querySelector('svg, img')?.remove(); ba.insertAdjacentHTML('afterbegin', m.logo_url && !defaut ? '<img src="' + escM(m.logo_url) + '" alt="">' : MARK_SVG('#0B1D33')); ba.querySelector('b').innerHTML = nomHtml; }
  const intro = document.querySelector('#auth .carteAuth > p.muted'); if (intro) intro.textContent = (defaut ? '' : (m.slogan ? m.slogan + ' ' : '')) + (defaut ? MARQUE_DEFAUT.slogan : 'Entrez l’adresse e-mail de votre compte.');
  const mini = document.querySelector('#auth .mini'); if (mini) mini.innerHTML = defaut ? 'Espace réservé aux clients ChantierLive. <a href="../">Site public</a> · <a href="../legal/confidentialite.html">Confidentialité</a>'
    : escM(m.pied || 'Espace réservé aux utilisateurs de ' + m.nom + '.') + ' <a href="../legal/confidentialite.html">Confidentialité</a>' + (m.masquer ? '' : ' · <span class="propulse">Propulsé par Chantier<b>Live</b></span>');
  document.title = (defaut ? 'ChantierLive' : m.nom) + ' — application';
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', encre);
  document.querySelector('meta[name=apple-mobile-web-app-title]')?.setAttribute('content', defaut ? 'ChantierLive' : m.nom.slice(0, 14));
  const ico = m.favicon_url || m.logo_url; document.querySelector('link[rel=icon]')?.setAttribute('href', defaut || !ico ? '../assets/brand/favicon.svg' : ico);
  document.querySelector('link[rel=apple-touch-icon]')?.setAttribute('href', defaut || !ico ? '../assets/brand/mark.png' : ico);
  const man = document.querySelector('link[rel=manifest]');
  if (man) { if (defaut) man.setAttribute('href', 'manifest.webmanifest'); else { const j = { name: m.nom, short_name: m.nom.slice(0, 12), description: m.slogan || 'Suivi de chantier en direct', start_url: './?marque=' + m.slug, scope: './', display: 'standalone', background_color: craie, theme_color: encre, lang: 'fr', icons: [{ src: ico ? new URL(ico, location.href).href : new URL('../assets/brand/mark.png', location.href).href, sizes: '512x512', type: ico && /svg/.test(ico) ? 'image/svg+xml' : 'image/png', purpose: 'any' }] }; man.setAttribute('href', 'data:application/manifest+json,' + encodeURIComponent(JSON.stringify(j))); } }
  document.body.classList.toggle('marque-blanche', !defaut); document.body.classList.toggle('marque-masquee', !defaut && !!m.masquer);
}
function escM(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

/* ---- résolution : identifiant d'URL, domaine, cache local ---- */
function cleMarque() {
  const u = new URL(location.href), q = u.searchParams.get('marque');
  if (q !== null) { u.searchParams.delete('marque'); history.replaceState(null, '', u.pathname + (u.searchParams.toString() ? '?' + u.searchParams : '') + u.hash); if (q === '' || q === 'chantierlive') { localStorage.removeItem('cl_marque'); localStorage.removeItem('cl_marque_cle'); return null; } localStorage.setItem('cl_marque_cle', q.toLowerCase()); return q.toLowerCase(); }
  if (!HOTES_CHANTIERLIVE.includes(location.hostname)) return location.hostname.toLowerCase();
  return localStorage.getItem('cl_marque_cle');
}
async function chargerMarque(cle) {
  const r = await fetch(CENTRAL.url + '/rest/v1/rpc/marque_publique', { method: 'POST', headers: { apikey: CENTRAL.key, Authorization: 'Bearer ' + CENTRAL.key, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_cle: cle }) });
  if (!r.ok) throw new Error('marque ' + r.status); const m = await r.json();
  if (m && m.instance && m.instance.url && m.instance.key) { // instance dédiée : l'identité tenue par le client dans son instance l'emporte
    try { const ri = await fetch(m.instance.url + '/rest/v1/rpc/marque_publique', { method: 'POST', headers: { apikey: m.instance.key, Authorization: 'Bearer ' + m.instance.key, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_cle: m.slug }) }); const mi = ri.ok ? await ri.json() : null; if (mi && mi.slug) return { ...m, ...mi, slug: m.slug, instance: m.instance }; } catch { }
  }
  return m;
}
async function resoudreMarque() {
  const cle = cleMarque(); let cache = null; try { cache = JSON.parse(localStorage.getItem('cl_marque') || 'null'); } catch { }
  if (cache && cache.slug && cle && (cache.slug === cle || cache.cle === cle)) appliquerMarque(cache); else appliquerMarque(MARQUE_DEFAUT);
  if (!cle) return null;
  try { const m = await chargerMarque(cle); if (m && m.slug) { m.cle = cle; localStorage.setItem('cl_marque', JSON.stringify(m)); appliquerMarque(m); return m; } localStorage.removeItem('cl_marque'); localStorage.removeItem('cl_marque_cle'); appliquerMarque(MARQUE_DEFAUT); return null; }
  catch { return cache; }
}
/* Après connexion : la marque de l'organisation l'emporte (si licence active) */
window.appliquerMarqueOrg = (m) => { if (m && m.slug) { m.cle = m.slug; localStorage.setItem('cl_marque', JSON.stringify(m)); localStorage.setItem('cl_marque_cle', m.slug); appliquerMarque(m); } };
window.MARQUE_PRETE = resoudreMarque();

/* ============================================================
   ChantierLive — essai gratuit et prise en main (étape 7)
   Bandeau d'essai, page « Démarrer », visite guidée par module.
   ============================================================ */

/* ---- état de l'essai (chargé par app.js dans S.essai : { jours, echeance }) ---- */
const dFrC = d => d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
function bandeauEssai(vue) {
  if (!S.essai || vue === 'bienvenue' || vue === 'backoffice' || S.org.statut !== 'actif') return '';
  const j = S.essai.jours, admin = PEUT.admin.includes(S.role) || S.adminPlateforme;
  const niveau = j <= 3 ? 'crit' : j <= 7 ? 'vig' : 'info';
  const lib = j < 0 ? 'Essai terminé' : j === 0 ? 'Dernier jour d’essai' : 'Essai gratuit · ' + j + ' jour' + (j > 1 ? 's' : '') + ' restant' + (j > 1 ? 's' : '');
  return '<div class="alerte ' + niveau + ' bandeauEssai"><i></i><div><b>' + lib + '</b><small>Jusqu’au ' + dFrC(S.essai.echeance) + '. ' + (admin ? '<a href="#abonnement">Choisir une formule</a> · ' : '') + '<a href="#bienvenue">Guide de démarrage</a> · <a href="#" onclick="visite(S.vue);return false">Visite guidée</a></small></div></div>';
}

/* ---- page Démarrer ---- */
RENDU.bienvenue = () => {
  const admin = PEUT.admin.includes(S.role) || S.adminPlateforme, nbMembres = (S.cache.nbMembres ?? '—');
  const url = location.origin + location.pathname.replace(/index\.html$/, '') + (MARQUE.slug !== 'chantierlive' ? '?marque=' + MARQUE.slug : '');
  const etape = (n, ok, titre, texte, actions) => '<div class="carte etape' + (ok ? ' faite' : '') + '"><div class="num">' + (ok ? '✓' : n) + '</div><div><h3>' + titre + '</h3><p class="muted">' + texte + '</p>' + (actions ? '<p class="actions">' + actions + '</p>' : '') + '</div></div>';
  return entete('Bienvenue' + (S.user.user_metadata?.nom ? ', ' + esc(S.user.user_metadata.nom.split(' ')[0]) : '') + '.', (S.essai ? 'Votre essai gratuit de <b>' + esc(S.org.nom) + '</b> court jusqu’au ' + dFrC(S.essai.echeance) + '. ' : '') + 'Quatre étapes pour voir votre chantier en direct.') +
    '<div class="etapes">' +
    etape(1, !!S.prog, 'Créer votre chantier', S.prog ? 'Programme <b>' + esc(S.prog.nom) + '</b> en place. Vous pouvez compléter les phases, quartiers et équipes dans « Site et quartiers » et « Ressources humaines ».' : 'Un formulaire de trois minutes : nom, maître d’ouvrage, surface, logements, nombre de semaines, position du site pour le contrôle « sur site ». Ou importez le modèle Excel déjà rempli.',
      admin ? (S.prog ? '<a class="btn petit" href="#site">Site et quartiers</a><a class="btn petit" href="#import">Importer un classeur</a>' : '<button class="btn primaire petit" onclick="formulaire(\'programme\')">Créer le chantier</button><a class="btn petit" href="#import">Importer depuis Excel</a>') : 'Votre direction crée le chantier ; vous y accéderez automatiquement.') +
    etape(2, nbMembres > 1, 'Inviter votre équipe', 'Chef de chantier, chefs d’équipe, architecte, contrôle, lecture seule : chacun reçoit un e-mail et ne voit que ce que son rôle permet. ' + (S.limites?.utilisateurs_max ? 'Jusqu’à ' + S.limites.utilisateurs_max + ' utilisateurs pendant l’essai.' : ''),
      admin ? '<a class="btn primaire petit" href="#equipe">Inviter</a>' : '') +
    etape(3, false, 'Installer sur les téléphones', 'Ouvrez l’adresse ci-dessous dans le navigateur du téléphone (Chrome ou Safari), puis « Ajouter à l’écran d’accueil ». Pointage et photos fonctionnent sans réseau et se synchronisent ensuite.',
      '<code class="cle" id="urlApp">' + esc(url) + '</code><button class="btn petit" onclick="navigator.clipboard.writeText($(\'#urlApp\').textContent).then(()=>toast(\'<b>Adresse copiée</b>\'))">Copier</button>' + (navigator.share ? '<button class="btn petit" onclick="navigator.share({title:MARQUE.nom,url:$(\'#urlApp\').textContent})">Partager</button>' : '')) +
    etape(4, !!localStorage.getItem('cl_visite_cockpit'), 'Faire le tour', 'Deux minutes par écran : la visite guidée montre où cliquer, du cockpit aux alertes. Vous pouvez la relancer à tout moment avec le bouton « ? » en haut à droite.',
      '<button class="btn primaire petit" onclick="visite(\'cockpit\', true)">Démarrer la visite</button><a class="btn petit" href="../docs/index.html" target="_blank" rel="noopener">Documentation</a><a class="btn petit" href="https://demo.chantierlive.com/" target="_blank" rel="noopener">Bac à sable public</a>') +
    '</div>' +
    (admin && S.essai ? '<div class="carte" style="margin-top:1rem"><h3>Après l’essai</h3><p class="muted">À l’échéance, l’espace passe en lecture seule : rien n’est effacé. Choisissez une formule quand vous le souhaitez, par mobile money ou virement ; l’activation suit sous 24 h ouvrées. <a href="#abonnement">Voir les formules</a>.</p></div>' : '');
};
MONTE.bienvenue = async () => { if (S.cache.nbMembres == null) { const { count } = await sb.from('membres').select('user_id', { count: 'exact', head: true }).eq('org_id', S.org.id).eq('actif', true); S.cache.nbMembres = count ?? 1; if (S.vue === 'bienvenue') go('bienvenue', true); } };

/* ---- visite guidée ---- */
const VISITES = {
  cockpit: [['#nav', 'Le menu', 'Piloter, Terrain, Ressources, Après livraison, Dispositif : les écrans suivent la vie du chantier. Les badges rouges comptent les alertes à traiter.'],
    ['.kpi', 'Six paramètres de réussite', 'Délai, coût, qualité, présence, approvisionnement, sécurité : recalculés à chaque pointage, photo, livraison ou dépense saisie.'],
    ['.carte h3', 'Alertes à traiter', 'Chaque alerte vient d’une donnée réelle : un retard de livraison, un stock sous le seuil, une absence, une caméra hors ligne.'],
    ['#conn', 'Temps réel', 'Ce voyant indique la connexion. Tout ce que l’équipe saisit sur le terrain apparaît ici sans recharger.'],
    ['#btnCompte', 'Votre compte', 'Mot de passe, changement d’organisation, déconnexion. Les administrateurs y trouvent aussi les paramètres du chantier.']],
  pointage: [['#agentSel', 'Qui pointe', 'Choisissez l’agent (ou laissez-le se choisir). Arrivée, départ, pause : un type par pointage.'],
    ['#btnGps', 'Position', 'La position est relevée et comparée au périmètre du chantier : le pointage est marqué « sur site » ou « hors site ».'],
    ['#sig', 'Signature', 'L’agent signe du doigt. Signature, heure, position et appareil sont enregistrés ensemble et ne peuvent plus être modifiés.'],
    ['#btnValider', 'Valider', 'Sans réseau, le pointage est mis en file d’attente et transmis dès que la connexion revient.']],
  chantier: [['#btnCam', 'Photo terrain', 'Prise depuis l’appareil, horodatée, géolocalisée, rattachée au chantier. Visible immédiatement par la direction.'],
    ['#photos', 'Fil des photos', 'Les photos de la semaine, par auteur et par zone. Cliquez pour agrandir ou lire la légende.']],
  equipe: [['#membres', 'Les comptes', 'Chaque personne a un rôle. La base de données applique les droits : l’interface ne fait que les refléter.'],
    ['#invits', 'Invitations', 'Invitez par e-mail ; la personne crée son mot de passe et rejoint l’organisation avec le rôle choisi.']],
  import: [['#xlsx', 'Le classeur', 'Téléchargez le modèle, remplissez une feuille par table, importez. Les feuilles vides sont ignorées.'],
    ['#btnImporter', 'Importer', 'Le compte rendu liste ce qui a été créé et les lignes rejetées, avec la raison.']],
  alertes: [['.carte', 'Alertes et notifications', 'Les alertes sont aussi envoyées par e-mail et WhatsApp aux destinataires configurés dans Paramètres.']],
  abonnement: [['#aboZone', 'Votre formule', 'Essai, formule mensuelle ou annuelle, factures et reçus imprimables. Le paiement direct est activé sous 24 h ouvrées.']],
  parametres: [['.carte', 'Organisation et chantier', 'Nom, pays, devise, périmètre du site, destinataires des alertes, et votre mot de passe.']],
};
let visiteEtat = null;
function visite(vue, enchainer) {
  const pas = (VISITES[vue] || []).filter(([sel]) => document.querySelector(sel));
  if (S.vue !== vue && RENDU[vue]) { go(vue, true); setTimeout(() => visite(vue, enchainer), 250); return; }
  if (!pas.length) { toast('<b>Pas de visite</b> pour cet écran.'); return; }
  localStorage.setItem('cl_visite_' + vue, '1');
  visiteEtat = { vue, pas, i: 0, enchainer };
  if (!$('#visite')) { document.body.insertAdjacentHTML('beforeend', '<div id="visite" class="visite"><div class="cible"></div><div class="bulle" role="dialog" aria-live="polite"></div></div>'); $('#visite').addEventListener('click', e => { if (e.target.id === 'visite' || e.target.classList.contains('cible')) finVisite(); }); }
  montrerPas();
}
function montrerPas() {
  const v = visiteEtat, [sel, titre, texte] = v.pas[v.i], el = document.querySelector(sel); if (!el) { return suivantPas(); }
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  setTimeout(() => {
    const r = el.getBoundingClientRect(), m = 6, w = $('#visite'); w.hidden = false;
    Object.assign($('.cible', w).style, { top: (r.top - m) + 'px', left: (r.left - m) + 'px', width: (r.width + 2 * m) + 'px', height: (r.height + 2 * m) + 'px' });
    const dernier = v.i === v.pas.length - 1, ordre = Object.keys(VISITES), suivante = v.enchainer ? ordre.slice(ordre.indexOf(v.vue) + 1).find(k => RENDU[k] && (!['abonnement', 'equipe', 'import', 'parametres'].includes(k) || PEUT.admin.includes(S.role) || S.adminPlateforme)) : null;
    $('.bulle', w).innerHTML = '<small>' + (v.i + 1) + ' / ' + v.pas.length + ' · ' + esc(VUES.flatMap(g => g[1]).find(x => x[0] === v.vue)?.[1] || v.vue) + '</small><h4>' + titre + '</h4><p>' + texte + '</p><p class="actions"><button class="btn lien petit" onclick="finVisite()">Quitter</button>' + (v.i > 0 ? '<button class="btn petit" onclick="precedentPas()">Précédent</button>' : '') + '<button class="btn primaire petit" onclick="suivantPas()">' + (dernier ? (suivante ? 'Écran suivant' : 'Terminer') : 'Suivant') + '</button></p>';
    const b = $('.bulle', w), bh = b.offsetHeight, bw = Math.min(360, window.innerWidth - 24); let top = r.bottom + 14, left = Math.max(12, Math.min(r.left, window.innerWidth - bw - 12));
    if (top + bh > window.innerHeight - 12) top = Math.max(12, r.top - bh - 14);
    Object.assign(b.style, { top: top + 'px', left: left + 'px', width: bw + 'px' });
  }, 260);
}
window.suivantPas = () => { const v = visiteEtat; if (!v) return; if (v.i < v.pas.length - 1) { v.i++; montrerPas(); return; }
  const ordre = Object.keys(VISITES), admin = PEUT.admin.includes(S.role) || S.adminPlateforme, suivante = v.enchainer ? ordre.slice(ordre.indexOf(v.vue) + 1).find(k => RENDU[k] && (!['abonnement', 'equipe', 'import', 'parametres'].includes(k) || admin)) : null;
  finVisite(); if (suivante) visite(suivante, true); else toast('<b>Visite terminée</b> · relancez-la avec le bouton « ? ».'); };
window.precedentPas = () => { if (visiteEtat && visiteEtat.i > 0) { visiteEtat.i--; montrerPas(); } };
window.finVisite = () => { visiteEtat = null; const w = $('#visite'); if (w) w.hidden = true; };
window.visite = visite;
window.addEventListener('resize', () => { if (visiteEtat) montrerPas(); });
document.addEventListener('keydown', e => { if (visiteEtat && e.key === 'Escape') finVisite(); });
$('#btnVisite')?.addEventListener('click', () => visite(S.vue === 'bienvenue' ? 'cockpit' : S.vue, S.vue === 'bienvenue'));

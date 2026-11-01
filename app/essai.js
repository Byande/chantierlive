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
  return '<div class="alerte ' + niveau + ' bandeauEssai"><i></i><div><b>' + lib + '</b><small>Jusqu’au ' + dFrC(S.essai.echeance) + '. ' + (admin ? '<a href="#abonnement">Votre contrat</a> · ' : '') + '<a href="#bienvenue">Guide de démarrage</a> · <a href="#" onclick="visite(S.vue);return false">Visite guidée</a></small></div></div>';
}

/* ---- page Démarrer ---- */
RENDU.bienvenue = () => {
  const admin = PEUT.admin.includes(S.role) || S.adminPlateforme, nbMembres = (S.cache.nbMembres ?? '—');
  const url = location.origin + location.pathname.replace(/index\.html$/, '') + (MARQUE.slug !== 'chantierlive' ? '?marque=' + MARQUE.slug : '');
  const etape = (n, ok, titre, texte, actions) => '<div class="carte etape' + (ok ? ' faite' : '') + '"><div class="num">' + (ok ? '✓' : n) + '</div><div><h3>' + titre + '</h3><p class="muted">' + texte + '</p>' + (actions ? '<p class="actions">' + actions + '</p>' : '') + '</div></div>';
  return entete('Bienvenue' + (S.user.user_metadata?.nom ? ', ' + esc(S.user.user_metadata.nom.split(' ')[0]) : '') + '.', (S.essai ? 'Votre essai de <b>' + esc(S.org.nom) + '</b> court jusqu’au ' + dFrC(S.essai.echeance) + '. ' : 'Votre espace <b>' + esc(S.org.nom) + '</b> est ouvert. ') + 'Quatre étapes pour voir votre chantier en direct.') +
    '<div class="etapes">' +
    etape(1, !!S.prog, 'Créer votre chantier', S.prog ? 'Programme <b>' + esc(S.prog.nom) + '</b> en place. Vous pouvez compléter les phases, quartiers et équipes dans « Site et quartiers » et « Ressources humaines ».' : 'Un formulaire de trois minutes : nom, maître d’ouvrage, surface, logements, nombre de semaines, position du site pour le contrôle « sur site ». Ou importez le modèle Excel déjà rempli.',
      admin ? (S.prog ? '<a class="btn petit" href="#site">Site et quartiers</a><a class="btn petit" href="#import">Importer un classeur</a>' : '<button class="btn primaire petit" onclick="formulaire(\'programme\')">Créer le chantier</button><a class="btn petit" href="#import">Importer depuis Excel</a>') : 'Votre direction crée le chantier ; vous y accéderez automatiquement.') +
    etape(2, nbMembres > 1, 'Créer les comptes de votre équipe', 'Chef de chantier, chefs d’équipe, architecte, contrôle, lecture seule : vous créez chaque compte avec son rôle. Un mot de passe provisoire s’affiche une seule fois, vous le transmettez (WhatsApp, SMS, formation) ; la personne le change à sa première connexion et ne voit que ce que son rôle permet. ' + (S.limites?.utilisateurs_max ? 'Votre contrat prévoit jusqu’à ' + S.limites.utilisateurs_max + ' comptes.' : ''),
      admin ? '<a class="btn primaire petit" href="#equipe">Créer les comptes</a>' : '') +
    etape(3, false, 'Installer sur les téléphones', 'Ouvrez l’adresse ci-dessous dans le navigateur du téléphone (Chrome ou Safari), puis « Ajouter à l’écran d’accueil ». Pointage et photos fonctionnent sans réseau et se synchronisent ensuite.',
      '<code class="cle" id="urlApp">' + esc(url) + '</code><button class="btn petit" onclick="navigator.clipboard.writeText($(\'#urlApp\').textContent).then(()=>toast(\'<b>Adresse copiée</b>\'))">Copier</button>' + (navigator.share ? '<button class="btn petit" onclick="navigator.share({title:MARQUE.nom,url:$(\'#urlApp\').textContent})">Partager</button>' : '')) +
    etape(4, !!localStorage.getItem('cl_visite_cockpit'), 'Faire le tour', 'Deux minutes par écran : la visite guidée montre où cliquer, du cockpit aux alertes. Vous pouvez la relancer à tout moment avec le bouton « ? » en haut à droite.',
      '<button class="btn primaire petit" onclick="visite(\'cockpit\', true)">Démarrer la visite</button><a class="btn petit" href="../docs/index.html" target="_blank" rel="noopener">Documentation</a><a class="btn petit" href="https://demo.chantierlive.com/" target="_blank" rel="noopener">Bac à sable public</a>') +
    '</div>' + (S.prog && admin ? '<div class="carte" style="margin-top:1rem"><h3>Et ensuite</h3><p class="muted">Déposez vos <a href="#documents">plans, maquettes et permis</a>, complétez l’<a href="#rh">effectif et les équipes</a> (les ouvriers émargent sur le téléphone de leur chef d’équipe, sans compte), renseignez <a href="#achats">fournisseurs et commandes</a> et le <a href="#finances">budget</a>. Le cockpit se met à jour à chaque saisie.</p></div>' : '') +
    (admin && S.essai ? '<div class="carte" style="margin-top:1rem"><h3>Après l’essai</h3><p class="muted">À l’échéance, l’espace passe en lecture seule : rien n’est effacé. Pour continuer, contactez ChantierLive : un devis, un paiement par virement ou mobile money, et votre espace est prolongé. <a href="#abonnement">Votre contrat</a>.</p></div>' : '');
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
  equipe: [['#membres', 'Les comptes', 'Chaque personne a un rôle. La base de données applique les droits : l’interface ne fait que les refléter. « Mot de passe » génère un nouveau provisoire ; « Désactiver » coupe l’accès sans rien effacer.'],
    ['#nbComptes', 'Créer un compte', 'Nom, e-mail, téléphone, rôle parmi dix-neuf postes, titre libre, chantiers accessibles : un mot de passe provisoire s’affiche une seule fois, à transmettre par WhatsApp ou SMS. La personne le change à sa première connexion.']],
  documents: [['#docListe', 'Plans et documents', 'Plans, maquettes et images 3D, permis, contrats, rapports : datés, signés de leur auteur, consultables par toute l’équipe, même sur le terrain.']],
  import: [['#xlsx', 'Le classeur', 'Téléchargez le modèle, remplissez une feuille par table, importez. Les feuilles vides sont ignorées.'],
    ['#btnImporter', 'Importer', 'Le compte rendu liste ce qui a été créé et les lignes rejetées, avec la raison.']],
  alertes: [['.carte', 'Alertes et notifications', 'Les alertes sont aussi envoyées par e-mail et WhatsApp aux destinataires configurés dans Paramètres.']],
  abonnement: [['#aboZone', 'Votre contrat', 'Échéance, limites, factures et reçus imprimables. Les prolongations et extensions se font sur devis avec votre conseiller ChantierLive.']],
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

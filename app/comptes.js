/* ============================================================
   ChantierLive — comptes et accès (étape 8, mode géré)
   Le promoteur ou la direction crée les comptes de son équipe : mot de passe provisoire remis en main
   propre (WhatsApp, SMS, formation) ou invitation par e-mail. L'administrateur plateforme ouvre les espaces
   clients, remet le compte promoteur, prolonge les contrats. Fonction serveur : functions/comptes.
   ============================================================ */
const PAYS_CL = ['Guinée', 'Cameroun', 'Côte d’Ivoire', 'Sénégal', 'Gabon', 'Congo', 'Mali', 'Bénin', 'Togo', 'Burkina Faso', 'Niger', 'Tchad', 'République centrafricaine', 'Guinée équatoriale', 'Maroc', 'France', 'Belgique', 'Suisse', 'Autre'];
const deviseDuPays = p => /guin(é|e)e(?!.*(é|e)quatoriale)/i.test(p) ? 'GNF' : /cameroun|gabon|congo|tchad|centrafri|(é|e)quatoriale/i.test(p) ? 'XAF' : /ivoire|s(é|e)n(é|e)gal|mali|burkina|b(é|e)nin|togo|niger|bissau/i.test(p) ? 'XOF' : /maroc/i.test(p) ? 'MAD' : 'EUR';
const entiteDuPays = p => /france|belgique|suisse|europe|allemagne|luxembourg|canada/i.test(p || '') ? 'levent_it' : '2by';
const WA_CL = '237650157461';
const urlApp = () => location.origin + location.pathname.replace(/index\.html$/, '') + (MARQUE.slug !== 'chantierlive' ? '?marque=' + MARQUE.slug : '');
const plusUnAn = d => { const x = d ? new Date(d) : new Date(); x.setFullYear(x.getFullYear() + 1); return x.toISOString().slice(0, 10); };

/* ---- appel de la fonction serveur ---- */
async function appelerComptes(corps) {
  const { data: { session } } = await sb.auth.getSession(); if (!session) throw new Error('Session expirée : reconnectez-vous.');
  const r = await fetch(CFG.url + '/functions/v1/comptes', { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: CFG.key, Authorization: 'Bearer ' + session.access_token }, body: JSON.stringify(corps) });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.erreur || ('Erreur ' + r.status)); return j;
}

/* ---- identifiants à remettre (affichés une seule fois) ---- */
function afficherIdentifiants({ email, mot_de_passe, nom, org, titre, reinit }) {
  const url = urlApp(), prenom = (nom || '').split(' ')[0];
  const texte = 'Bonjour' + (prenom ? ' ' + prenom : '') + ',\nVotre accès ' + MARQUE.nom + (org ? ' (' + org + ')' : '') + ' :\n• Adresse : ' + url + '\n• Identifiant : ' + email + '\n• Mot de passe provisoire : ' + mot_de_passe + '\nÀ la première connexion, vous choisirez votre mot de passe. Sur le téléphone, ouvrez l’adresse dans Chrome ou Safari puis « Ajouter à l’écran d’accueil ».';
  modal('<h2>' + (titre || (reinit ? 'Nouveau mot de passe provisoire' : 'Compte créé')) + '</h2><p class="muted" style="margin:.4rem 0 1rem">Ces identifiants ne seront <b>plus affichés</b> : transmettez-les maintenant à la personne (WhatsApp, SMS, en main propre). Elle devra changer ce mot de passe à sa première connexion.</p>' +
    '<div class="carte" style="background:var(--craie);box-shadow:none"><div class="ligne"><span>Adresse</span><b style="white-space:normal;word-break:break-all">' + esc(url) + '</b></div><div class="ligne"><span>Identifiant</span><b style="white-space:normal;word-break:break-all">' + esc(email) + '</b></div><div class="ligne"><span>Mot de passe provisoire</span><code class="cle" style="font-size:1.1rem">' + esc(mot_de_passe) + '</code></div></div>' +
    '<textarea id="idTexte" hidden>' + esc(texte) + '</textarea><p style="display:flex;gap:.6rem;flex-wrap:wrap;margin-top:1rem"><button class="btn primaire" onclick="navigator.clipboard.writeText($(\'#idTexte\').value).then(()=>toast(\'<b>Message copié</b> — collez-le dans WhatsApp ou un SMS.\'))">Copier le message</button><a class="btn" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(texte) + '">Envoyer par WhatsApp</a><button class="btn" onclick="imprimerIdentifiants()">Imprimer</button><button class="btn lien" onclick="fermerModal();go(S.vue,true)">J’ai transmis, fermer</button></p>');
}
window.imprimerIdentifiants = () => { const w = window.open('', '_blank'); if (!w) return toast('Autorisez les fenêtres pour imprimer.'); w.document.write('<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Identifiants ' + esc(MARQUE.nom) + '</title><style>body{font-family:-apple-system,Segoe UI,sans-serif;max-width:620px;margin:40px auto;color:#0B1D33;line-height:1.6;white-space:pre-wrap;font-size:15px}h1{font-family:Georgia,serif;font-weight:500}</style></head><body><h1>' + esc(MARQUE.nom) + ' · vos identifiants</h1>' + esc($('#idTexte').value) + '<p style="margin-top:2rem;font-size:12px;color:#6F7681">Document à remettre en main propre, puis à détruire. Le mot de passe provisoire doit être changé à la première connexion.</p></body></html>'); w.document.close(); w.print(); };

/* ---- création d'un compte (client ou back-office) ---- */
window.creerCompte = (orgId, orgNom, roleDefaut) => {
  orgId = orgId || S.org.id; orgNom = orgNom || S.org.nom;
  const roles = Object.entries(ROLES).filter(([k]) => S.adminPlateforme || S.role === 'promoteur' || k !== 'promoteur');
  modal('<h2>Créer un compte</h2><p class="muted" style="margin:.4rem 0 1rem">Pour <b>' + esc(orgNom) + '</b>. La personne ne voit que ce que son rôle permet ; vous pourrez changer le rôle ou désactiver le compte à tout moment.</p>' +
    '<label class="champ">Nom et prénom<input id="cpNom" autocomplete="off" placeholder="Ex. : Mamadou Camara"></label><label class="champ">E-mail (identifiant de connexion)<input id="cpEmail" type="email" autocomplete="off" placeholder="prenom.nom@exemple.com"></label><label class="champ">Téléphone ou WhatsApp<input id="cpTel" type="tel" autocomplete="off" placeholder="+224 6xx xx xx xx"></label>' +
    '<label class="champ">Rôle<select id="cpRole">' + roles.map(([k, v]) => '<option value="' + k + '"' + (k === (roleDefaut || 'chef_equipe') ? ' selected' : '') + '>' + v + '</option>').join('') + '</select></label>' +
    '<div class="champ">Remise de l’accès<label style="display:flex;gap:.6rem;align-items:flex-start;font-weight:500;margin-top:.3rem"><input type="radio" name="cpMode" value="mdp" checked style="width:auto;margin-top:.25rem"><span><b>Mot de passe provisoire</b><br><small class="muted">Affiché une seule fois ; vous le transmettez vous-même (WhatsApp, SMS, formation). Recommandé.</small></span></label><label style="display:flex;gap:.6rem;align-items:flex-start;font-weight:500;margin-top:.4rem"><input type="radio" name="cpMode" value="email" style="width:auto;margin-top:.25rem"><span><b>Invitation par e-mail</b><br><small class="muted">La personne reçoit un lien et choisit son mot de passe. Nécessite une adresse e-mail qu’elle consulte.</small></span></label></div>' +
    '<p class="statut" id="cpStatut"></p><p style="display:flex;gap:.6rem;justify-content:flex-end"><button class="btn" onclick="fermerModal()">Annuler</button><button class="btn primaire" id="cpOk" onclick="validerCompte(\'' + orgId + '\',\'' + esc(orgNom).replace(/'/g, '&#39;') + '\')">Créer le compte</button></p>');
  setTimeout(() => $('#cpNom')?.focus(), 50);
};
window.validerCompte = async (orgId, orgNom) => {
  const st = $('#cpStatut'), email = $('#cpEmail').value.trim().toLowerCase(), nom = $('#cpNom').value.trim(), telephone = $('#cpTel').value.trim(), role = $('#cpRole').value, mode = document.querySelector('input[name=cpMode]:checked').value;
  if (!nom) { st.className = 'statut err'; st.textContent = 'Indiquez le nom de la personne.'; return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { st.className = 'statut err'; st.textContent = 'Adresse e-mail invalide.'; return; }
  $('#cpOk').disabled = true; st.className = 'statut'; st.textContent = 'Création du compte…';
  try {
    const r = await appelerComptes({ action: 'creer', org_id: orgId, email, nom, telephone, role, mode, redirect: location.href.split('#')[0] });
    S.cache.nbMembres = null;
    if (r.mot_de_passe) afficherIdentifiants({ email, mot_de_passe: r.mot_de_passe, nom, org: orgNom });
    else { fermerModal(); toast('<b>' + (r.existant ? 'Compte rattaché' : 'Invitation envoyée') + '</b> ' + esc(r.message || email), 6000); go(S.vue, true); }
  } catch (e) { $('#cpOk').disabled = false; st.className = 'statut err'; st.textContent = e.message; }
};
window.reinitialiserMdp = async (orgId, userId, email, nom) => {
  if (!confirm('Générer un nouveau mot de passe provisoire pour ' + (nom || email) + ' ? L’ancien ne fonctionnera plus.')) return;
  try { const r = await appelerComptes({ action: 'reinitialiser', org_id: orgId, user_id: userId }); afficherIdentifiants({ email, mot_de_passe: r.mot_de_passe, nom, org: S.org?.nom, reinit: true }); }
  catch (e) { toast('<b>Refusé</b> ' + esc(e.message), 6000); }
};
window.basculerActif = async (orgId, userId, actif, nom) => {
  if (!actif && !confirm('Désactiver l’accès de ' + nom + ' ? La personne ne pourra plus se connecter à cet espace ; ses saisies restent.')) return;
  const { error } = await sb.from('membres').update({ actif }).eq('org_id', orgId).eq('user_id', userId);
  toast(error ? '<b>Refusé</b> ' + esc(error.message) : '<b>Accès ' + (actif ? 'réactivé' : 'désactivé') + '</b>'); S.cache.nbMembres = null; go(S.vue, true);
};
window.supprimerCompte = async (userId, email) => {
  if (!confirm('Supprimer définitivement le compte ' + email + ' ? Il disparaît de toutes les organisations ; les pointages, photos et documents qu’il a saisis sont conservés.')) return;
  try { await appelerComptes({ action: 'supprimer', user_id: userId }); toast('<b>Compte supprimé</b>'); go(S.vue, true); } catch (e) { toast('<b>Refusé</b> ' + esc(e.message), 6000); }
};
window.changerRole = async (orgId, userId, role) => { const { error } = await sb.from('membres').update({ role }).eq('org_id', orgId).eq('user_id', userId); toast(error ? '<b>Erreur</b> ' + esc(error.message) : '<b>Rôle mis à jour</b>'); };

/* ---- tableau des membres (réutilisé par la page client et le back-office) ---- */
function tableMembres(orgId, membres, gere) {
  if (!membres.length) return '<div class="vide">Aucun compte.</div>';
  return '<table><tr><th>Nom</th><th>E-mail</th><th>Téléphone</th><th>Rôle</th><th>Accès</th>' + (gere ? '<th></th>' : '') + '</tr>' + membres.map(x => { const moi = x.user_id === S.user.id, nom = x.profils?.nom || '', email = x.profils?.email || '';
    return '<tr style="' + (x.actif ? '' : 'opacity:.55') + '"><td><b>' + esc(nom || '—') + '</b>' + (moi ? ' <span class="tag">vous</span>' : '') + '</td><td>' + esc(email) + '</td><td>' + esc(x.profils?.telephone || '') + '</td><td>' + (gere && !moi ? '<select onchange="changerRole(\'' + orgId + '\',\'' + x.user_id + '\', this.value)">' + Object.entries(ROLES).map(([k, v]) => '<option value="' + k + '"' + (k === x.role ? ' selected' : '') + '>' + v + '</option>').join('') + '</select>' : ROLES[x.role]) + '</td><td><span class="etat ' + (x.actif ? 'ok' : 'crit') + '">' + (x.actif ? 'actif' : 'désactivé') + '</span></td>' +
      (gere ? '<td style="white-space:nowrap">' + (moi ? '' : '<button class="btn petit" title="Nouveau mot de passe provisoire" onclick="reinitialiserMdp(\'' + orgId + '\',\'' + x.user_id + '\',\'' + esc(email) + '\',\'' + esc(nom).replace(/'/g, '&#39;') + '\')">Mot de passe</button> <button class="btn petit" onclick="basculerActif(\'' + orgId + '\',\'' + x.user_id + '\',' + (x.actif ? 'false' : 'true') + ',\'' + esc(nom || email).replace(/'/g, '&#39;') + '\')">' + (x.actif ? 'Désactiver' : 'Réactiver') + '</button>' + (S.adminPlateforme ? ' <button class="btn petit" style="color:var(--signal)" onclick="supprimerCompte(\'' + x.user_id + '\',\'' + esc(email) + '\')">Supprimer</button>' : '')) + '</td>' : '') + '</tr>'; }).join('') + '</table>';
}

/* ---- page client « Comptes et accès » ---- */
RENDU.equipe = () => { const gere = PEUT.admin.includes(S.role) || S.adminPlateforme, lim = S.limites || {};
  return entete('Comptes et accès', 'Les personnes qui ont accès à <b>' + esc(S.org.nom) + '</b> et leur rôle. ' + (gere ? 'Vous créez les comptes de votre équipe et remettez vous-même les accès ; chaque action est journalisée.' : 'Votre direction gère les comptes.')) + (window.bandeauLectureSeule ? bandeauLectureSeule() : '') +
    '<div class="g g2" style="grid-template-columns:minmax(0,1.7fr) minmax(0,1fr)"><div><div class="carte"><h3>Comptes <small id="nbComptes"></small>' + (gere ? ' <small><button class="btn primaire petit" onclick="creerCompte()">+ Créer un compte</button></small>' : '') + '</h3><div id="membres">Chargement…</div>' + (lim.utilisateurs_max ? '<p class="mini" style="margin-top:.8rem">Votre contrat prévoit jusqu’à ' + lim.utilisateurs_max + ' comptes. Pour en ajouter, contactez ChantierLive.</p>' : '') + '</div>' +
    (gere ? '<div class="carte" style="margin-top:1rem"><h3>Invitations par e-mail en attente</h3><div id="invits">Chargement…</div></div>' : '') + '</div>' +
    '<div><div class="carte"><h3>Comment remettre un accès</h3><ol style="padding-left:1.1rem;font-size:.92rem;display:grid;gap:.5rem;color:var(--encre)"><li><b>Créer le compte</b> : nom, e-mail, téléphone, rôle. Un mot de passe provisoire s’affiche une seule fois.</li><li><b>Le transmettre</b> par WhatsApp, SMS ou en main propre (bouton « Copier le message »), avec l’adresse de l’application.</li><li><b>La personne se connecte</b> et choisit son mot de passe définitif. Sur le téléphone : « Ajouter à l’écran d’accueil ».</li><li><b>Mot de passe perdu ?</b> Le bouton « Mot de passe » génère un nouveau provisoire.</li></ol><p class="mini" style="margin-top:.8rem">Rôles : promoteur et direction gèrent tout ; chef de chantier saisit le chantier et les équipes ; chef d’équipe émarge et photographie ; architecte et contrôle suivent la qualité et les documents ; lecture seule consulte.</p></div>' +
    (gere ? '<div class="carte" style="margin-top:1rem"><h3>Journal d’audit <small>50 dernières actions</small></h3><div id="audit">Chargement…</div></div>' : '') + '</div></div>'; };
MONTE.equipe = async () => {
  const gere = PEUT.admin.includes(S.role) || S.adminPlateforme;
  const { data: m, error } = await sb.from('membres').select('user_id, role, actif, profils(email, nom, telephone)').eq('org_id', S.org.id).order('role');
  if (error) { $('#membres').innerHTML = '<div class="vide">' + esc(error.message) + '</div>'; return; }
  const membres = (m || []).sort((a, b) => Object.keys(ROLES).indexOf(a.role) - Object.keys(ROLES).indexOf(b.role) || (a.profils?.nom || '').localeCompare(b.profils?.nom || ''));
  $('#membres').innerHTML = tableMembres(S.org.id, membres, gere); $('#nbComptes').textContent = membres.filter(x => x.actif).length + ' actif(s)'; S.cache.nbMembres = membres.filter(x => x.actif).length;
  if ($('#invits')) { const { data: inv } = await sb.from('invitations').select('*').eq('org_id', S.org.id).is('accepte_le', null).order('cree_le'); $('#invits').innerHTML = (inv || []).length ? inv.map(i => '<div class="ligne"><span><b>' + esc(i.email) + '</b> · ' + ROLES[i.role] + '<br><small class="muted">' + esc(i.nom || '') + ' · invitée le ' + dFr(i.cree_le) + '</small></span><button class="btn petit" onclick="annulerInvit(\'' + i.id + '\')">Annuler</button></div>').join('') : '<div class="vide">Aucune invitation en attente. Les comptes créés avec un mot de passe provisoire sont immédiatement actifs.</div>'; }
  if ($('#audit')) { const { data: a } = await sb.from('audit_log').select('ts, action, table_name, user_email, detail').eq('org_id', S.org.id).order('ts', { ascending: false }).limit(50); $('#audit').innerHTML = (a || []).length ? '<table><tr><th>Quand</th><th>Qui</th><th>Action</th><th>Table</th><th>Détail</th></tr>' + a.map(x => '<tr><td>' + new Date(x.ts).toLocaleString('fr-FR') + '</td><td>' + esc(x.user_email || 'système') + '</td><td>' + esc(x.action) + '</td><td>' + esc(x.table_name) + '</td><td class="mini">' + esc(JSON.stringify(x.detail || {}).slice(0, 90)) + '</td></tr>').join('') + '</table>' : '<div class="vide">Journal vide.</div>'; }
};
window.annulerInvit = async id => { await sb.from('invitations').delete().eq('id', id); go('equipe', true); };

/* ---- back-office : comptes d'un client ---- */
window.comptesClient = async (orgId, orgNom) => {
  modal('<h2>Comptes · ' + esc(orgNom) + '</h2><div id="bcListe" class="muted" style="margin-top:.8rem">Chargement…</div><p style="display:flex;gap:.6rem;justify-content:flex-end;margin-top:1rem"><button class="btn" onclick="fermerModal()">Fermer</button><button class="btn primaire" onclick="creerCompte(\'' + orgId + '\',\'' + esc(orgNom).replace(/'/g, '&#39;') + '\',\'promoteur\')">+ Créer un compte</button></p>');
  const { data: m } = await sb.from('membres').select('user_id, role, actif, profils(email, nom, telephone)').eq('org_id', orgId);
  const el = $('#bcListe'); if (el) el.innerHTML = tableMembres(orgId, (m || []).sort((a, b) => Object.keys(ROLES).indexOf(a.role) - Object.keys(ROLES).indexOf(b.role)), true);
};

/* ---- back-office : ouverture d'un espace client sous contrat ---- */
window.ouvrirClient = (pre) => { pre = pre || {}; const pays = pre.pays && PAYS_CL.includes(pre.pays) ? pre.pays : (pre.pays ? 'Autre' : 'Guinée');
  modal('<h2>Ouvrir un espace client</h2><p class="muted" style="margin:.4rem 0 1rem">Après devis accepté et paiement reçu. L’espace est créé sous contrat, le compte promoteur est remis avec un mot de passe provisoire que vous transmettez lors de la formation.</p><form id="formClient" style="max-height:62vh;overflow:auto;padding-right:.3rem">' +
    '<h3 style="margin:.2rem 0 .4rem">Le client</h3><label class="champ">Société ou programme *<input id="ocNom" value="' + esc(pre.organisation || '') + '"></label><div class="g g2" style="gap:.6rem"><label class="champ">Pays<select id="ocPays" onchange="$(\'#ocDevise\').value=deviseDuPays(this.value);$(\'#ocEntite\').value=entiteDuPays(this.value)">' + PAYS_CL.map(p => '<option' + (p === pays ? ' selected' : '') + '>' + p + '</option>').join('') + '</select></label><label class="champ">Devise<input id="ocDevise" value="' + deviseDuPays(pays) + '" maxlength="3"></label></div>' +
    '<div class="g g2" style="gap:.6rem"><label class="champ">Identifiant (facultatif, minuscules et tirets)<input id="ocSlug" pattern="[a-z0-9-]*" placeholder="déduit du nom"></label><label class="champ">Entité facturante<select id="ocEntite"><option value="2by"' + (entiteDuPays(pays) === '2by' ? ' selected' : '') + '>ETS 2BY Consulting (Cameroun)</option><option value="levent_it"' + (entiteDuPays(pays) === 'levent_it' ? ' selected' : '') + '>LevENT-IT (France)</option></select></label></div>' +
    '<h3 style="margin:.8rem 0 .4rem">Le contrat</h3><div class="g g3" style="gap:.6rem"><label class="champ">Ouvert jusqu’au *<input id="ocEcheance" type="date" value="' + plusUnAn() + '"></label><label class="champ">Utilisateurs max<input id="ocUsers" type="number" min="1" placeholder="illimité"></label><label class="champ">Chantiers max<input id="ocProgs" type="number" min="1" placeholder="illimité"></label></div>' +
    '<div class="g g2" style="gap:.6rem"><label class="champ">Montant encaissé (€ HT, 0 si facturé hors application)<input id="ocMontant" type="number" min="0" step="any" value="0"></label><label class="champ">Référence du paiement<input id="ocRef" placeholder="Ex. : virement 30/10 · OM-123456"></label></div><label class="champ">Note interne (devis, formation prévue…)<input id="ocNote" value="' + esc(pre.message ? 'Demande du site : ' + pre.message.slice(0, 160) : '') + '"></label>' +
    '<h3 style="margin:.8rem 0 .4rem">Le compte promoteur</h3><label class="champ">Nom et prénom *<input id="ocPNom" value="' + esc(pre.nom || '') + '"></label><div class="g g2" style="gap:.6rem"><label class="champ">E-mail *<input id="ocPEmail" type="email" value="' + esc(pre.email || '') + '"></label><label class="champ">Téléphone<input id="ocPTel" type="tel" value="' + esc(pre.telephone || '') + '"></label></div>' +
    '<label class="champ" style="display:flex;gap:.6rem;align-items:center"><input type="checkbox" id="ocEmailMode" style="width:auto"> Envoyer une invitation par e-mail au lieu du mot de passe provisoire</label></form>' +
    '<p class="statut" id="ocStatut"></p><p style="display:flex;gap:.6rem;justify-content:flex-end"><button class="btn" onclick="fermerModal()">Annuler</button><button class="btn primaire" id="ocOk" onclick="validerOuverture(' + (pre.id ? '\'' + pre.id + '\'' : 'null') + ')">Ouvrir l’espace et créer le compte</button></p>');
};
window.validerOuverture = async (demandeId) => {
  const st = $('#ocStatut'), v = id => $('#' + id).value.trim(); const nom = v('ocNom'), pnom = v('ocPNom'), pemail = v('ocPEmail').toLowerCase();
  if (!nom) { st.className = 'statut err'; st.textContent = 'Indiquez le nom du client.'; return; }
  if (!pnom || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(pemail)) { st.className = 'statut err'; st.textContent = 'Nom et e-mail du promoteur requis.'; return; }
  $('#ocOk').disabled = true; st.className = 'statut'; st.textContent = 'Création de l’espace…';
  const { data: orgId, error } = await sb.rpc('ouvrir_client', { p_nom: nom, p_pays: v('ocPays'), p_devise: v('ocDevise').toUpperCase() || null, p_slug: v('ocSlug').toLowerCase() || null, p_echeance: v('ocEcheance'), p_entity: v('ocEntite'), p_utilisateurs_max: v('ocUsers') ? +v('ocUsers') : null, p_programmes_max: v('ocProgs') ? +v('ocProgs') : null, p_montant: +v('ocMontant') || 0, p_reference_paiement: v('ocRef') || null, p_note: v('ocNote') || null });
  if (error) { $('#ocOk').disabled = false; st.className = 'statut err'; st.textContent = error.message; return; }
  st.textContent = 'Espace créé · création du compte promoteur…';
  try {
    const r = await appelerComptes({ action: 'creer', org_id: orgId, email: pemail, nom: pnom, telephone: v('ocPTel'), role: 'promoteur', mode: $('#ocEmailMode').checked ? 'email' : 'mdp', redirect: location.href.split('#')[0] });
    if (demandeId) await sb.from('cl_demandes').update({ traite: true, note: 'Espace ouvert le ' + new Date().toLocaleDateString('fr-FR') }).eq('id', demandeId);
    if (r.mot_de_passe) afficherIdentifiants({ email: pemail, mot_de_passe: r.mot_de_passe, nom: pnom, org: nom, titre: 'Espace ouvert · compte promoteur' });
    else { fermerModal(); toast('<b>Espace ouvert</b> · ' + esc(r.existant ? r.message : 'invitation envoyée à ' + pemail), 7000); go('backoffice', true); }
  } catch (e) { st.className = 'statut err'; st.innerHTML = 'Espace créé, mais compte non créé : ' + esc(e.message) + '. <button class="btn petit" onclick="fermerModal();comptesClient(\'' + orgId + '\',\'' + esc(nom).replace(/'/g, '&#39;') + '\')">Réessayer depuis Comptes</button>'; }
};

/* ---- back-office : prolongation ou extension d'un contrat ---- */
window.prolongerContrat = (orgId, orgNom, echeance, limites) => { limites = limites || {};
  modal('<h2>Prolonger · ' + esc(orgNom) + '</h2><p class="muted" style="margin:.4rem 0 1rem">Échéance actuelle : <b>' + dFr(echeance) + '</b>. Après paiement du devis, fixez la nouvelle échéance et, le cas échéant, les nouvelles limites ; une facture et un reçu sont émis si un montant est saisi.</p>' +
    '<div class="g g3" style="gap:.6rem"><label class="champ">Nouvelle échéance *<input id="pcEcheance" type="date" value="' + plusUnAn(echeance && echeance > new Date().toISOString().slice(0, 10) ? echeance : null) + '"></label><label class="champ">Utilisateurs max<input id="pcUsers" type="number" min="1" value="' + (limites.utilisateurs_max || '') + '" placeholder="illimité"></label><label class="champ">Chantiers max<input id="pcProgs" type="number" min="1" value="' + (limites.programmes_max || '') + '" placeholder="illimité"></label></div>' +
    '<div class="g g2" style="gap:.6rem"><label class="champ">Montant encaissé (€ HT)<input id="pcMontant" type="number" min="0" step="any" value="0"></label><label class="champ">Référence du paiement<input id="pcRef"></label></div><label class="champ">Note<input id="pcNote"></label>' +
    '<p class="statut" id="pcStatut"></p><p style="display:flex;gap:.6rem;justify-content:flex-end"><button class="btn" onclick="fermerModal()">Annuler</button><button class="btn primaire" onclick="validerProlongation(\'' + orgId + '\')">Enregistrer</button></p>');
};
window.validerProlongation = async orgId => { const st = $('#pcStatut'), v = id => $('#' + id).value.trim();
  const { data, error } = await sb.rpc('prolonger_contrat', { p_org: orgId, p_echeance: v('pcEcheance'), p_montant: +v('pcMontant') || 0, p_reference_paiement: v('pcRef') || null, p_note: v('pcNote') || null, p_utilisateurs_max: v('pcUsers') ? +v('pcUsers') : null, p_programmes_max: v('pcProgs') ? +v('pcProgs') : null });
  if (error) { st.className = 'statut err'; st.textContent = error.message; return; }
  fermerModal(); toast('<b>Contrat prolongé</b> jusqu’au ' + dFr(data.echeance) + (data.recu ? ' · reçu ' + data.recu : '')); go('backoffice', true);
};

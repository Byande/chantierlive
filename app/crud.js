/* ============================================================
   ChantierLive — cadre de saisie générique (formulaires, enregistrement, suppression)
   Chaque entité décrit sa table, ses champs et les rôles autorisés.
   La base (RLS) reste l'autorité ; l'interface ne fait que masquer.
   ============================================================ */
const ADMIN = ['promoteur', 'direction'], CHANTIER = ['promoteur', 'direction', 'chef_chantier'], TERRAIN = ['promoteur', 'direction', 'chef_chantier', 'chef_equipe', 'architecte', 'controle'], QUALITE = ['promoteur', 'direction', 'chef_chantier', 'architecte', 'controle'];
const opt = (arr, lib = x => x, val = x => x) => arr.map(x => ({ v: val(x), l: lib(x) }));
const ENTITES = {
  ilot: { table: 'ilots', nom: 'Îlot', pluriel: 'Îlots', tri: 'code', ecrire: CHANTIER, supprimer: ADMIN, champs: [
    { k: 'code', l: 'Code', t: 'text', req: true }, { k: 'quartier_id', l: 'Quartier', t: 'select', opts: () => opt(S.data.quartiers, q => q.code + ' · ' + q.nom, q => q.id) }, { k: 'logements', l: 'Logements', t: 'number' }, { k: 'typologie', l: 'Typologie', t: 'text' },
    { k: 'etape', l: 'Étape', t: 'select', opts: () => opt(['À démarrer', 'Terrassement', 'Fondations', 'Gros œuvre', 'Second œuvre', 'Finitions', 'Réceptionné', 'Livré']) }, { k: 'avancement', l: 'Avancement (%)', t: 'number', min: 0, max: 100 }] },
  quartier: { table: 'quartiers', nom: 'Quartier', pluriel: 'Quartiers', tri: 'code', ecrire: CHANTIER, supprimer: ADMIN, champs: [
    { k: 'code', l: 'Code', t: 'text', req: true }, { k: 'nom', l: 'Nom', t: 'text', req: true }, { k: 'tranche', l: 'Tranche', t: 'number' }, { k: 'logements', l: 'Logements', t: 'number' }, { k: 'etat', l: 'État', t: 'text' }, { k: 'avancement', l: 'Avancement (%)', t: 'number', min: 0, max: 100 }] },
  phase: { table: 'phases', nom: 'Phase', pluriel: 'Phases', tri: 'ordre', ecrire: CHANTIER, supprimer: ADMIN, champs: [
    { k: 'ordre', l: 'Ordre', t: 'number', req: true }, { k: 'nom', l: 'Nom', t: 'text', req: true }, { k: 'detail', l: 'Détail', t: 'textarea' }, { k: 'debut', l: 'Début', t: 'date' }, { k: 'fin', l: 'Fin', t: 'date' }, { k: 'avancement', l: 'Avancement (%)', t: 'number', min: 0, max: 100 }] },
  agent: { table: 'agents', nom: 'Agent', pluriel: 'Agents', tri: 'nom', ecrire: CHANTIER, supprimer: ADMIN, champs: [
    { k: 'matricule', l: 'Matricule', t: 'text' }, { k: 'nom', l: 'Nom et prénom', t: 'text', req: true }, { k: 'fonction', l: 'Fonction', t: 'text' }, { k: 'equipe_id', l: 'Équipe', t: 'select', opts: () => opt(S.data.equipes, e => e.nom, e => e.id) },
    { k: 'salaire_mensuel', l: 'Salaire mensuel', t: 'number', roles: ADMIN }, { k: 'telephone', l: 'Téléphone', t: 'tel' }, { k: 'actif', l: 'Actif', t: 'bool', def: true }] },
  equipe: { table: 'equipes', nom: 'Équipe', pluriel: 'Équipes', tri: 'nom', ecrire: CHANTIER, supprimer: CHANTIER, champs: [{ k: 'nom', l: 'Nom', t: 'text', req: true }] },
  fournisseur: { table: 'fournisseurs', nom: 'Fournisseur', pluriel: 'Fournisseurs', tri: 'nom', sansProgramme: true, ecrire: CHANTIER, supprimer: ADMIN, champs: [
    { k: 'nom', l: 'Nom', t: 'text', req: true }, { k: 'ville', l: 'Ville', t: 'text' }, { k: 'famille', l: 'Famille', t: 'text' }, { k: 'telephone', l: 'Téléphone', t: 'tel' }, { k: 'email', l: 'E-mail', t: 'email' },
    { k: 'note_delai', l: 'Note délai (1-5)', t: 'number', min: 1, max: 5 }, { k: 'note_qualite', l: 'Note qualité (1-5)', t: 'number', min: 1, max: 5 }, { k: 'note_prix', l: 'Note prix (1-5)', t: 'number', min: 1, max: 5 }] },
  commande: { table: 'commandes', nom: 'Commande', pluriel: 'Commandes', tri: 'livraison_prevue', ecrire: CHANTIER, supprimer: ADMIN, champs: [
    { k: 'numero', l: 'Numéro', t: 'text', req: true, def: () => 'BC-' + new Date().getFullYear() + '-' + String(S.data.commandes.length + 101) }, { k: 'fournisseur_id', l: 'Fournisseur', t: 'select', opts: () => opt(S.data.fournisseurs || [], f => f.nom, f => f.id) },
    { k: 'objet', l: 'Objet', t: 'text', req: true }, { k: 'quantite', l: 'Quantité', t: 'text' }, { k: 'montant', l: 'Montant', t: 'number' }, { k: 'devise', l: 'Unité / devise', t: 'text', def: () => S.prog?.donnees?.unites?.commandes || S.org.devise },
    { k: 'date_commande', l: 'Date de commande', t: 'date', def: () => new Date().toISOString().slice(0, 10) }, { k: 'livraison_prevue', l: 'Livraison prévue', t: 'date' }, { k: 'livraison_reelle', l: 'Livraison réelle', t: 'date' },
    { k: 'statut', l: 'Statut', t: 'select', opts: () => opt(['Planifiée', 'Confirmée', 'En transit', 'Livrée', 'Retard', 'Annulée']) }, { k: 'zone', l: 'Zone', t: 'text' }] },
  stock: { table: 'stocks', nom: 'Article en stock', pluriel: 'Stocks', tri: 'article', ecrire: CHANTIER, supprimer: ADMIN, champs: [
    { k: 'article', l: 'Article', t: 'text', req: true }, { k: 'quantite', l: 'Quantité (texte)', t: 'text' }, { k: 'couverture_jours', l: 'Couverture (jours)', t: 'number' }, { k: 'seuil_jours', l: 'Seuil (jours)', t: 'number' }] },
  budget: { table: 'budget_lignes', nom: 'Ligne de budget', pluriel: 'Budget', tri: 'poste', ecrire: ADMIN, supprimer: ADMIN, champs: [
    { k: 'tranche', l: 'Tranche', t: 'number', def: 1 }, { k: 'poste', l: 'Poste', t: 'text', req: true }, { k: 'prevu', l: 'Prévu', t: 'number' }, { k: 'engage', l: 'Engagé', t: 'number' }, { k: 'depense', l: 'Dépensé', t: 'number' }] },
  vente: { table: 'ventes', nom: 'Vente', pluriel: 'Ventes', tri: 'date_reservation', ecrire: ADMIN, supprimer: ADMIN, champs: [
    { k: 'lot', l: 'Lot', t: 'text', req: true }, { k: 'ilot_id', l: 'Îlot', t: 'select', opts: () => opt(S.data.ilots, i => i.code, i => i.id) }, { k: 'acquereur', l: 'Acquéreur', t: 'text' }, { k: 'canal', l: 'Canal', t: 'select', opts: () => opt(['Diaspora', 'Convention banque', 'Salarié privé', 'Investisseur', 'Location-vente', 'Autre']) },
    { k: 'typologie', l: 'Typologie', t: 'text' }, { k: 'prix', l: 'Prix', t: 'number' }, { k: 'acompte', l: 'Acompte versé', t: 'number' }, { k: 'statut', l: 'Statut', t: 'select', opts: () => opt(['reservation', 'accord_banque', 'acte', 'annulee'], x => ({ reservation: 'Réservation', accord_banque: 'Accord bancaire', acte: 'Acte signé', annulee: 'Annulée' }[x])) },
    { k: 'date_reservation', l: 'Date de réservation', t: 'date', def: () => new Date().toISOString().slice(0, 10) }, { k: 'date_acte', l: 'Date de l’acte', t: 'date' }] },
  risque: { table: 'risques', nom: 'Risque', pluriel: 'Risques', tri: 'code', ecrire: CHANTIER, supprimer: ADMIN, champs: [
    { k: 'code', l: 'Code', t: 'text', req: true, def: () => 'R' + (S.data.risques.length + 1) }, { k: 'titre', l: 'Titre', t: 'text', req: true }, { k: 'probabilite', l: 'Probabilité (1-5)', t: 'number', min: 1, max: 5, def: 3 }, { k: 'impact', l: 'Impact (1-5)', t: 'number', min: 1, max: 5, def: 3 },
    { k: 'responsable', l: 'Responsable', t: 'text' }, { k: 'plan', l: 'Plan d’action', t: 'textarea' }, { k: 'statut', l: 'Statut', t: 'select', opts: () => opt(['ouvert', 'en_cours', 'maitrise', 'clos'], x => ({ ouvert: 'Ouvert', en_cours: 'Plan en cours', maitrise: 'Maîtrisé', clos: 'Clos' }[x])) }, { k: 'echeance', l: 'Échéance', t: 'date' }] },
  nc: { table: 'non_conformites', nom: 'Non-conformité', pluriel: 'Non-conformités', tri: 'code', ecrire: QUALITE, supprimer: ADMIN, champs: [
    { k: 'code', l: 'Code', t: 'text', req: true, def: () => 'NC-' + String(48 + S.data.nc.length).padStart(3, '0') }, { k: 'zone', l: 'Zone', t: 'text' }, { k: 'ilot_id', l: 'Îlot', t: 'select', opts: () => opt(S.data.ilots, i => i.code, i => i.id) }, { k: 'objet', l: 'Objet', t: 'textarea', req: true },
    { k: 'gravite', l: 'Gravité', t: 'select', opts: () => opt(['Mineure', 'Majeure', 'Critique']) }, { k: 'statut', l: 'Statut', t: 'select', opts: () => opt(['Ouverte', 'Reprise en cours', 'Reprise faite — à recontrôler', 'Essai à refaire', 'Close']) }, { k: 'controleur', l: 'Contrôleur', t: 'text', def: () => S.user.user_metadata?.nom || S.user.email }, { k: 'echeance', l: 'Délai de levée', t: 'text', def: 'J+3' }] },
  conge: { table: 'conges', nom: 'Congé ou absence', pluriel: 'Congés', tri: 'debut', ecrire: TERRAIN, supprimer: CHANTIER, champs: [
    { k: 'agent_id', l: 'Agent', t: 'select', req: true, opts: () => opt(S.data.agents, a => a.nom, a => a.id) }, { k: 'type', l: 'Type', t: 'select', opts: () => opt(['Congé annuel', 'Congé maladie', 'Absence non justifiée', 'Formation', 'Permission', 'Demande de congé']) },
    { k: 'debut', l: 'Du', t: 'date', req: true }, { k: 'fin', l: 'Au', t: 'date', req: true }, { k: 'statut', l: 'Statut', t: 'select', roles: CHANTIER, def: 'À valider', opts: () => opt(['À valider', 'Validé', 'Refusé', 'En cours', 'Clos']) }, { k: 'remplacant', l: 'Remplaçant', t: 'text' }] },
  paie: { table: 'paie', nom: 'Fiche de paie', pluriel: 'Paie', tri: 'mois', ecrire: ADMIN, supprimer: ADMIN, champs: [
    { k: 'agent_id', l: 'Agent', t: 'select', req: true, opts: () => opt(S.data.agents, a => a.nom, a => a.id) }, { k: 'mois', l: 'Mois (1er jour)', t: 'date', req: true }, { k: 'jours_travailles', l: 'Jours travaillés', t: 'number' }, { k: 'retards', l: 'Retards', t: 'number' }, { k: 'absences', l: 'Absences', t: 'number' },
    { k: 'avance', l: 'Avance', t: 'number' }, { k: 'brut', l: 'Brut', t: 'number' }, { k: 'net', l: 'Net', t: 'number' }, { k: 'statut', l: 'Statut', t: 'select', opts: () => opt(['calcule', 'valide', 'paye'], x => ({ calcule: 'Calculée', valide: 'Validée', paye: 'Payée' }[x])) }] },
  ticket: { table: 'tickets', nom: 'Ticket de maintenance', pluriel: 'Tickets', tri: 'cree_le', ecrire: TERRAIN, supprimer: CHANTIER, champs: [
    { k: 'numero', l: 'Numéro', t: 'text', req: true, def: () => 'T-' + String(24 + (S.data.tickets || []).length).padStart(3, '0') }, { k: 'logement', l: 'Logement', t: 'text' }, { k: 'objet', l: 'Objet', t: 'textarea', req: true }, { k: 'categorie', l: 'Catégorie', t: 'select', opts: () => opt(['Plomberie', 'Électricité', 'Maçonnerie', 'Menuiserie', 'Voirie', 'Espaces verts', 'Autre']) },
    { k: 'statut', l: 'Statut', t: 'select', opts: () => opt(['Ouvert', 'Planifié', 'En cours', 'Clos']) }, { k: 'delai', l: 'Délai', t: 'text', def: 'J+3' }] },
  camera: { table: 'cameras', nom: 'Caméra', pluriel: 'Caméras', tri: 'code', ecrire: CHANTIER, supprimer: ADMIN, champs: [
    { k: 'code', l: 'Code', t: 'text', req: true }, { k: 'nom', l: 'Nom', t: 'text', req: true }, { k: 'zone', l: 'Zone', t: 'text' }, { k: 'url_flux', l: 'Adresse du flux (RTSP/HLS)', t: 'text' }, { k: 'en_ligne', l: 'En ligne', t: 'bool', def: true }, { k: 'dernier_evenement', l: 'Dernier événement', t: 'text' }] },
  journal: { table: 'journal', nom: 'Événement du journal', pluriel: 'Journal', tri: 'ts', ecrire: TERRAIN, supprimer: CHANTIER, champs: [
    { k: 'titre', l: 'Événement', t: 'text', req: true }, { k: 'detail', l: 'Détail', t: 'textarea' }, { k: 'statut', l: 'Type', t: 'select', opts: () => opt(['Info', 'OK', 'En cours', 'Retard', 'Alerte', 'Qualité', 'Sécurité', 'Commercial']) }] },
  programme: { table: 'programmes', nom: 'Programme', pluriel: 'Programmes', tri: 'nom', sansProgramme: true, ecrire: ADMIN, supprimer: [], champs: [
    { k: 'code', l: 'Code', t: 'text', req: true }, { k: 'nom', l: 'Nom', t: 'text', req: true }, { k: 'maitre_ouvrage', l: 'Maître d’ouvrage', t: 'text' }, { k: 'pilote', l: 'Pilote', t: 'text' }, { k: 'architecte', l: 'Architecte', t: 'text' },
    { k: 'surface_ha', l: 'Surface (ha)', t: 'number' }, { k: 'logements', l: 'Logements', t: 'number' }, { k: 'ca_cible', l: 'CA cible', t: 'number' }, { k: 'cout_cible', l: 'Coût cible', t: 'number' }, { k: 'marge_cible', l: 'Marge cible (%)', t: 'number' },
    { k: 'semaine_courante', l: 'Semaine courante', t: 'number' }, { k: 'semaines_total', l: 'Semaines au total', t: 'number' }, { k: 'rayon_m', l: 'Rayon « sur site » (m)', t: 'number', def: 1500 }] },
};
const peutEcrire = e => ENTITES[e].ecrire.includes(S.role) || S.adminPlateforme;
const peutSupprimer = e => ENTITES[e].supprimer.includes(S.role) || S.adminPlateforme;
const champsVisibles = e => ENTITES[e].champs.filter(c => !c.roles || c.roles.includes(S.role) || S.adminPlateforme);
const valDef = c => typeof c.def === 'function' ? c.def() : (c.def ?? '');
const boutonAjout = (e, lib) => peutEcrire(e) ? '<button class="btn primaire petit" onclick="formulaire(\'' + e + '\')">+ ' + (lib || ENTITES[e].nom) + '</button>' : '';
const boutonEdit = (e, id) => peutEcrire(e) ? '<button class="btn petit" title="Modifier" onclick="formulaire(\'' + e + '\',\'' + id + '\')">✎</button>' : '';

function formulaire(e, id) {
  const E = ENTITES[e]; const row = id ? (S.data[E.table] || S.data[e + 's'] || []).find(r => r.id === id) || S.cache?.[id] : null;
  const html = champsVisibles(e).map(c => {
    const v = row ? (row[c.k] ?? '') : valDef(c); const id2 = 'f_' + c.k;
    if (c.t === 'select') { const o = c.opts(); return '<label class="champ">' + c.l + '<select id="' + id2 + '">' + (c.req ? '' : '<option value="">—</option>') + o.map(x => '<option value="' + esc(x.v) + '"' + (String(x.v) === String(v) ? ' selected' : '') + '>' + esc(x.l) + '</option>').join('') + '</select></label>'; }
    if (c.t === 'textarea') return '<label class="champ">' + c.l + '<textarea id="' + id2 + '" rows="3">' + esc(v) + '</textarea></label>';
    if (c.t === 'bool') return '<label class="champ" style="flex-direction:row;align-items:center;gap:.6rem;display:flex"><input type="checkbox" id="' + id2 + '"' + ((row ? row[c.k] : valDef(c)) ? ' checked' : '') + ' style="width:auto"> ' + c.l + '</label>';
    return '<label class="champ">' + c.l + (c.req ? ' *' : '') + '<input id="' + id2 + '" type="' + c.t + '" value="' + esc(v) + '"' + (c.min != null ? ' min="' + c.min + '"' : '') + (c.max != null ? ' max="' + c.max + '"' : '') + (c.t === 'number' ? ' step="any"' : '') + '></label>';
  }).join('');
  modal('<h2>' + (row ? 'Modifier · ' : 'Nouveau · ') + E.nom + '</h2><form id="formEntite" style="margin-top:1rem;max-height:60vh;overflow:auto;padding-right:.3rem">' + html + '</form><p class="statut" id="formStatut"></p><p style="display:flex;gap:.6rem;justify-content:space-between;margin-top:.6rem"><span>' + (row && peutSupprimer(e) ? '<button class="btn petit" onclick="supprimerEntite(\'' + e + '\',\'' + id + '\')" style="color:var(--signal)">Supprimer</button>' : '') + '</span><span style="display:flex;gap:.6rem"><button class="btn" onclick="fermerModal()">Annuler</button><button class="btn primaire" onclick="enregistrerEntite(\'' + e + '\',' + (id ? '\'' + id + '\'' : 'null') + ')">Enregistrer</button></span></p>');
  setTimeout(() => $('#formEntite input,#formEntite select,#formEntite textarea')?.focus(), 50);
}
async function enregistrerEntite(e, id) {
  const E = ENTITES[e], st = $('#formStatut'); const rec = {};
  for (const c of champsVisibles(e)) { const el = $('#f_' + c.k); if (!el) continue; let v = c.t === 'bool' ? el.checked : el.value; if (v === '' && c.t !== 'bool') v = null; if (c.t === 'number' && v != null) v = Number(v); if (c.req && (v == null || v === '')) { st.className = 'statut err'; st.textContent = 'Le champ « ' + c.l + ' » est obligatoire.'; return; } rec[c.k] = v; }
  if (!id) { rec.org_id = S.org.id; if (!E.sansProgramme) rec.programme_id = S.prog.id; }
  st.className = 'statut'; st.textContent = 'Enregistrement…';
  const q = id ? sb.from(E.table).update(rec).eq('id', id) : sb.from(E.table).insert(rec);
  const { error } = await q;
  if (error) { st.className = 'statut err'; st.textContent = /duplicate/i.test(error.message) ? 'Ce code ou numéro existe déjà.' : /row-level security/i.test(error.message) ? 'Votre rôle ne permet pas cette action.' : error.message; return; }
  fermerModal(); toast('<b>' + E.nom + '</b> ' + (id ? 'modifié(e)' : 'enregistré(e)') + '.');
  if (E.table === 'programmes') { if (!id) localStorage.removeItem('cl_prog'); await chargerProgrammes(); if (!id) go('cockpit'); return; }
  await chargerDonnees(); go(S.vue, true);
}
async function supprimerEntite(e, id) {
  const E = ENTITES[e]; if (!confirm('Supprimer définitivement cet élément (' + E.nom + ') ?')) return;
  const { error } = await sb.from(E.table).delete().eq('id', id);
  if (error) { toast('<b>Refusé</b> ' + esc(error.message)); return; }
  fermerModal(); toast('<b>' + E.nom + '</b> supprimé(e).'); await chargerDonnees(); go(S.vue, true);
}
window.formulaire = formulaire; window.enregistrerEntite = enregistrerEntite; window.supprimerEntite = supprimerEntite;

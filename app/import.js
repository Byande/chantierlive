/* ============================================================
   ChantierLive — import d'un programme depuis un fichier Excel
   Un classeur, une feuille par table. Modèle téléchargeable.
   ============================================================ */
const FEUILLES = {
  Programme: { cols: ['code', 'nom', 'maitre_ouvrage', 'pilote', 'architecte', 'surface_ha', 'logements', 'ca_cible', 'cout_cible', 'marge_cible', 'semaine_courante', 'semaines_total', 'centre_lat', 'centre_lng', 'rayon_m'], ex: [['PROG-01', 'Résidence Les Palmiers', 'SCI Palmiers', 'Direction de programme', 'Cabinet X', 12, 240, 48000, 39000, 18, 10, 80, 4.05, 9.71, 1200]] },
  Phases: { table: 'phases', cols: ['ordre', 'nom', 'detail', 'debut', 'fin', 'avancement'], ex: [[0, 'Foncier', 'Titre, bornage', '2026-01-01', '2026-06-30', 100], [1, 'Études', 'Plan masse, permis', '2026-03-01', '2026-10-31', 60]] },
  Quartiers: { table: 'quartiers', cols: ['code', 'nom', 'tranche', 'logements', 'etat', 'avancement'], ex: [['Q1', 'Les Palmiers nord', 1, 120, 'Chantier en cours', 20]] },
  Ilots: { table: 'ilots', cols: ['code', 'quartier', 'logements', 'typologie', 'etape', 'avancement'], ex: [['A1', 'Q1', 20, 'T3', 'Fondations', 15]] },
  Agents: { table: 'agents', cols: ['matricule', 'nom', 'fonction', 'equipe', 'salaire_mensuel', 'telephone'], ex: [['a01', 'Prénom Nom', 'Chef de chantier', 'Direction', 250000, '+237 6xx xx xx xx']] },
  Fournisseurs: { table: 'fournisseurs', cols: ['code', 'nom', 'ville', 'famille', 'telephone', 'email', 'note_delai', 'note_qualite', 'note_prix'], ex: [['f1', 'Cimenterie du Littoral', 'Douala', 'Ciment', '', '', 4, 4, 3]] },
  Commandes: { table: 'commandes', cols: ['numero', 'fournisseur', 'objet', 'quantite', 'montant', 'devise', 'date_commande', 'livraison_prevue', 'statut', 'zone'], ex: [['BC-2026-001', 'f1', 'Ciment 42,5', '40 t', 12000000, 'XAF', '2026-11-02', '2026-11-09', 'Confirmée', 'Îlot A1']] },
  Stocks: { table: 'stocks', cols: ['article', 'quantite', 'couverture_jours', 'seuil_jours'], ex: [['Ciment', '30 t', 8, 7]] },
  Budget: { table: 'budget_lignes', cols: ['tranche', 'poste', 'prevu', 'engage', 'depense'], ex: [[1, 'Gros œuvre', 18000, 9000, 6000]] },
  Risques: { table: 'risques', cols: ['code', 'titre', 'probabilite', 'impact', 'responsable', 'plan', 'statut'], ex: [['R1', 'Saison des pluies', 4, 3, 'Chef de chantier', 'Drainage provisoire', 'ouvert']] },
  Cameras: { table: 'cameras', cols: ['code', 'nom', 'zone', 'url_flux', 'en_ligne'], ex: [['CAM-01', 'Entrée', 'Entrée principale', '', true]] },
};
RENDU.import = () => entete('Importer un programme', 'Un classeur Excel, une feuille par table (Programme, Phases, Quartiers, Ilots, Agents, Fournisseurs, Commandes, Stocks, Budget, Risques, Cameras). Les feuilles absentes sont ignorées.') +
  '<div class="g g2"><div class="carte"><h3>1. Préparer le fichier</h3><p class="muted" style="font-size:.92rem">Téléchargez le modèle, remplissez-le (une ligne d’exemple par feuille, à remplacer), puis importez-le. Les codes doivent être uniques ; les colonnes « quartier », « equipe » et « fournisseur » référencent les codes ou noms des autres feuilles.</p><p style="margin-top:.8rem"><button class="btn primaire" onclick="modeleExcel()">Télécharger le modèle Excel</button></p></div>' +
  '<div class="carte"><h3>2. Importer</h3>' + ((PEUT.admin.includes(S.role) || S.adminPlateforme) ? '<label class="champ">Fichier .xlsx<input type="file" id="xlsx" accept=".xlsx,.xls"></label><label class="champ" style="flex-direction:row;display:flex;gap:.6rem;align-items:center"><input type="checkbox" id="impNouveau" checked style="width:auto"> Créer un nouveau programme (feuille Programme) ; sinon, compléter le programme courant</label><p><button class="btn primaire" id="btnImporter">Lancer l’import</button></p><div id="impStatut" class="muted" style="font-size:.9rem;white-space:pre-line"></div>' : '<div class="vide">Réservé aux rôles promoteur et direction.</div>') + '</div></div>';
MONTE.import = () => { $('#btnImporter')?.addEventListener('click', importerExcel); };
window.modeleExcel = () => { const wb = XLSX.utils.book_new(); for (const [f, d] of Object.entries(FEUILLES)) { const ws = XLSX.utils.aoa_to_sheet([d.cols, ...d.ex]); ws['!cols'] = d.cols.map(() => ({ wch: 18 })); XLSX.utils.book_append_sheet(wb, ws, f); } XLSX.writeFile(wb, 'ChantierLive_modele_import.xlsx'); };
async function importerExcel() {
  const f = $('#xlsx').files[0], st = $('#impStatut'); if (!f) { st.textContent = 'Choisissez un fichier.'; return; }
  st.textContent = 'Lecture du fichier…'; const wb = XLSX.read(await f.arrayBuffer(), { type: 'array', cellDates: true });
  const lire = n => { const ws = wb.Sheets[n]; return ws ? XLSX.utils.sheet_to_json(ws, { defval: null, raw: false }) : []; };
  const nettoyer = r => { const o = {}; for (const [k, v] of Object.entries(r)) { let x = v; if (typeof x === 'string') { x = x.trim(); if (x === '') x = null; else if (/^-?\d+([.,]\d+)?$/.test(x)) x = Number(x.replace(',', '.')); else if (/^(true|vrai|oui)$/i.test(x)) x = true; else if (/^(false|faux|non)$/i.test(x)) x = false; } o[k.trim()] = x; } return o; };
  const log = []; const dire = m => { log.push(m); st.textContent = log.join('\n'); };
  let prog = S.prog, org = S.org.id;
  if ($('#impNouveau').checked) { const p = lire('Programme').map(nettoyer)[0]; if (!p || !p.code || !p.nom) { st.textContent = 'La feuille Programme doit contenir au moins code et nom.'; return; }
    const { data, error } = await sb.from('programmes').insert({ org_id: org, ...Object.fromEntries(FEUILLES.Programme.cols.filter(c => p[c] != null).map(c => [c, p[c]])) }).select().single(); if (error) { st.textContent = 'Programme : ' + error.message; return; } prog = data; dire('Programme « ' + prog.nom + ' » créé.'); }
  const pid = prog.id;
  const ins = async (table, rows, lib) => { if (!rows.length) return []; const { data, error } = await sb.from(table).insert(rows.map(r => ({ ...r, org_id: org, ...(table === 'fournisseurs' ? {} : { programme_id: pid }) }))).select(); dire(lib + ' : ' + (error ? 'erreur — ' + error.message : data.length + ' ligne(s)')); return data || []; };
  await ins('phases', lire('Phases').map(nettoyer).map(r => ({ ordre: r.ordre, nom: r.nom, detail: r.detail, debut: r.debut, fin: r.fin, avancement: r.avancement || 0 })), 'Phases');
  const quartiers = await ins('quartiers', lire('Quartiers').map(nettoyer).map(r => ({ code: String(r.code), nom: r.nom, tranche: r.tranche, logements: r.logements, etat: r.etat, avancement: r.avancement || 0 })), 'Quartiers');
  await ins('ilots', lire('Ilots').map(nettoyer).map(r => ({ code: String(r.code), quartier_id: quartiers.find(q => q.code === String(r.quartier))?.id || null, logements: r.logements, typologie: r.typologie, etape: r.etape, avancement: r.avancement || 0 })), 'Îlots');
  const agentsL = lire('Agents').map(nettoyer); const equipes = await ins('equipes', [...new Set(agentsL.map(a => a.equipe).filter(Boolean))].map(n => ({ nom: n })), 'Équipes');
  await ins('agents', agentsL.map(a => ({ matricule: a.matricule != null ? String(a.matricule) : null, nom: a.nom, fonction: a.fonction, equipe_id: equipes.find(e => e.nom === a.equipe)?.id || null, salaire_mensuel: a.salaire_mensuel, telephone: a.telephone != null ? String(a.telephone) : null })), 'Agents');
  const fourn = await ins('fournisseurs', lire('Fournisseurs').map(nettoyer).map(r => ({ code: r.code != null ? String(r.code) : null, nom: r.nom, ville: r.ville, famille: r.famille, telephone: r.telephone, email: r.email, note_delai: r.note_delai, note_qualite: r.note_qualite, note_prix: r.note_prix })), 'Fournisseurs');
  await ins('commandes', lire('Commandes').map(nettoyer).map(r => ({ numero: String(r.numero), fournisseur_id: fourn.find(x => x.code === String(r.fournisseur) || x.nom === r.fournisseur)?.id || null, objet: r.objet, quantite: r.quantite != null ? String(r.quantite) : null, montant: r.montant, devise: r.devise, date_commande: r.date_commande, livraison_prevue: r.livraison_prevue, statut: r.statut || 'Planifiée', zone: r.zone })), 'Commandes');
  await ins('stocks', lire('Stocks').map(nettoyer).map(r => ({ article: r.article, quantite: r.quantite != null ? String(r.quantite) : null, couverture_jours: r.couverture_jours, seuil_jours: r.seuil_jours })), 'Stocks');
  await ins('budget_lignes', lire('Budget').map(nettoyer).map(r => ({ tranche: r.tranche, poste: r.poste, prevu: r.prevu || 0, engage: r.engage || 0, depense: r.depense || 0 })), 'Budget');
  await ins('risques', lire('Risques').map(nettoyer).map(r => ({ code: String(r.code), titre: r.titre, probabilite: r.probabilite, impact: r.impact, responsable: r.responsable, plan: r.plan, statut: r.statut || 'ouvert' })), 'Risques');
  await ins('cameras', lire('Cameras').map(nettoyer).map(r => ({ code: String(r.code), nom: r.nom, zone: r.zone, url_flux: r.url_flux, en_ligne: r.en_ligne !== false })), 'Caméras');
  dire('Import terminé.'); localStorage.setItem('cl_prog', pid); await chargerProgrammes();
}

/* ============================================================
   ChantierLive — plans et documents (étape 8)
   Plans, maquettes et images 3D, permis, contrats, rapports : déposés par le chantier, lus par toute l'équipe.
   Fichiers dans le compartiment privé « documents » (dossier = organisation / chantier), 25 Mo par fichier.
   ============================================================ */
const CATEGORIES_DOC = { plan: 'Plans', maquette: 'Maquettes et images 3D', permis: 'Permis et autorisations', contrat: 'Contrats et marchés', rapport: 'Rapports et comptes rendus', photo: 'Photos officielles', autre: 'Autres documents' };
const PEUT_DOC = ['promoteur', 'direction', 'conducteur_travaux', 'chef_chantier', 'architecte', 'bureau_etudes', 'opc', 'geometre', 'controle', 'hse', 'finances', 'commercial', 'rh', 'achats', 'maintenance'];
const tailleLisible = n => n == null ? '' : n < 1024 * 1024 ? Math.max(1, Math.round(n / 1024)) + ' Ko' : (n / 1048576).toFixed(1).replace('.', ',') + ' Mo';
const iconeDoc = (mime, path) => /pdf/.test(mime) ? 'PDF' : /^image\//.test(mime) ? 'IMG' : /sheet|excel/.test(mime) ? 'XLS' : /word/.test(mime) ? 'DOC' : /presentation/.test(mime) ? 'PPT' : /dwg|dxf|acad/.test(mime + path) ? 'CAO' : /gltf|obj|3d/.test(mime + path) ? '3D' : /zip/.test(mime) ? 'ZIP' : 'FICH';

RENDU.documents = () => {
  if (!S.prog) return entete('Plans et documents', 'Créez d’abord un chantier (page Démarrer ou Paramètres).');
  const peut = (PEUT_DOC.includes(S.role) || S.adminPlateforme) && S.org.statut === 'actif';
  return entete('Plans et documents', '<b>' + esc(S.prog.nom) + '</b> · plans, maquettes et images 3D, permis, contrats, rapports. Chaque document est daté, signé de son auteur et visible par toute l’équipe selon son rôle.') + (window.bandeauLectureSeule ? bandeauLectureSeule() : '') +
    '<div class="g g2" style="grid-template-columns:minmax(0,1fr) minmax(0,1.8fr)"><div>' + (peut ? '<div class="carte"><h3>Déposer un document</h3><label class="champ">Titre<input id="docTitre" placeholder="Ex. : Plan masse tranche 1 · indice C"></label><label class="champ">Catégorie<select id="docCat">' + Object.entries(CATEGORIES_DOC).map(([k, v]) => '<option value="' + k + '">' + v + '</option>').join('') + '</select></label><label class="champ">Note (facultatif)<input id="docNote" placeholder="Ex. : validé par l’architecte le 28/10"></label><p style="margin-top:.4rem"><button class="btn primaire" id="btnDoc">Choisir le fichier et déposer</button></p><p class="mini" style="margin-top:.6rem">PDF, images (JPEG, PNG, WebP, SVG), Word, Excel, PowerPoint, DWG/DXF, modèles 3D (GLB, OBJ), archives ZIP · 25 Mo au maximum par fichier. Pour une maquette lourde, déposez une archive ZIP ou des images de rendu.</p></div>' : '<div class="carte"><div class="vide">Votre rôle (' + ROLES[S.role] + ') permet de consulter les documents, pas d’en déposer.</div></div>') +
    '<div class="carte" style="margin-top:1rem"><h3>Par catégorie</h3><div id="docCats" class="muted">Chargement…</div></div></div>' +
    '<div class="carte"><h3>Documents <small id="docNb"></small></h3><div id="docListe" class="muted">Chargement…</div></div></div>';
};
MONTE.documents = async () => {
  if (!S.prog) return;
  $('#btnDoc')?.addEventListener('click', () => { if (!$('#docTitre').value.trim()) { toast('<b>Titre manquant</b> — nommez le document avant de choisir le fichier.'); $('#docTitre').focus(); return; } $('#fileDoc').click(); });
  const { data, error } = await sb.from('documents').select('*').eq('programme_id', S.prog.id).order('cree_le', { ascending: false });
  if (error) { $('#docListe').innerHTML = '<div class="vide">' + esc(error.message) + '</div>'; return; }
  S.cache.documents = data || []; afficherDocuments(S.cache.filtreDoc || '');
};
function afficherDocuments(filtre) {
  const docs = S.cache.documents || [], vis = filtre ? docs.filter(d => d.categorie === filtre) : docs, admin = PEUT.admin.includes(S.role) || S.adminPlateforme;
  S.cache.filtreDoc = filtre;
  const nb = {}; docs.forEach(d => nb[d.categorie] = (nb[d.categorie] || 0) + 1);
  if ($('#docCats')) $('#docCats').innerHTML = '<div class="ligne" style="cursor:pointer" onclick="afficherDocuments(\'\')"><span' + (!filtre ? ' style="font-weight:700"' : '') + '>Tous</span><b>' + docs.length + '</b></div>' + Object.entries(CATEGORIES_DOC).map(([k, v]) => '<div class="ligne" style="cursor:pointer" onclick="afficherDocuments(\'' + k + '\')"><span' + (filtre === k ? ' style="font-weight:700"' : '') + '>' + v + '</span><b>' + (nb[k] || 0) + '</b></div>').join('');
  if ($('#docNb')) $('#docNb').textContent = vis.length + (filtre ? ' · ' + CATEGORIES_DOC[filtre] : '');
  if ($('#docListe')) $('#docListe').innerHTML = vis.length ? '<table><tr><th></th><th>Titre</th><th>Catégorie</th><th>Déposé</th><th>Taille</th><th></th></tr>' + vis.map(d => '<tr><td><span class="tag" style="font-family:ui-monospace,Menlo,monospace;font-size:.68rem">' + iconeDoc(d.type_mime || '', d.path) + '</span></td><td><b>' + esc(d.titre) + '</b>' + (d.note ? '<br><small class="muted">' + esc(d.note) + '</small>' : '') + '</td><td>' + (CATEGORIES_DOC[d.categorie] || esc(d.categorie)) + '</td><td>' + dFr(d.cree_le) + '<br><small class="muted">' + esc(d.auteur_nom || '') + '</small></td><td>' + tailleLisible(d.taille) + '</td><td style="white-space:nowrap"><button class="btn petit" onclick="ouvrirDoc(\'' + esc(d.path) + '\')">Ouvrir</button>' + (admin ? ' <button class="btn petit" style="color:var(--signal)" onclick="supprimerDoc(\'' + d.id + '\',\'' + esc(d.path) + '\')">✕</button>' : '') + '</td></tr>').join('') + '</table>' : '<div class="vide">Aucun document' + (filtre ? ' dans cette catégorie' : '') + '. Déposez le plan masse, les permis, la maquette : l’équipe les retrouvera ici, même sur le terrain.</div>';
}
window.afficherDocuments = afficherDocuments;
window.ouvrirDoc = async path => { const { data, error } = await sb.storage.from('documents').createSignedUrl(path, 900); if (error || !data?.signedUrl) return toast('<b>Ouverture impossible</b> ' + esc(error?.message || '')); window.open(data.signedUrl, '_blank', 'noopener'); };
window.supprimerDoc = async (id, path) => { if (!confirm('Supprimer définitivement ce document ?')) return; const { error } = await sb.from('documents').delete().eq('id', id); if (error) return toast('<b>Refusé</b> ' + esc(error.message)); await sb.storage.from('documents').remove([path]); toast('<b>Document supprimé</b>'); go('documents', true); };
$('#fileDoc')?.addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f || !S.prog) return;
  if (f.size > 25 * 1048576) return toast('<b>Fichier trop lourd</b> (' + tailleLisible(f.size) + ') — 25 Mo au maximum. Compressez-le ou déposez une archive ZIP.', 6000);
  const titre = $('#docTitre').value.trim() || f.name, cat = $('#docCat').value, note = $('#docNote').value.trim() || null;
  toast('Envoi de <b>' + esc(f.name) + '</b> (' + tailleLisible(f.size) + ')…', 8000);
  const nomSur = f.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(-80);
  const path = S.org.id + '/' + S.prog.id + '/documents/' + uid().slice(0, 8) + '-' + nomSur, mime = f.type || 'application/octet-stream';
  const up = await sb.storage.from('documents').upload(path, f, { contentType: mime, upsert: false });
  if (up.error) return toast('<b>Envoi impossible</b> ' + esc(up.error.message), 7000);
  const { error } = await sb.from('documents').insert({ org_id: S.org.id, programme_id: S.prog.id, titre, categorie: cat, note, path, type_mime: mime, taille: f.size, auteur_nom: S.user.user_metadata?.nom || S.user.email });
  if (error) { await sb.storage.from('documents').remove([path]); return toast('<b>Refusé</b> ' + esc(error.message), 7000); }
  toast('<b>Document déposé</b> · ' + esc(titre)); $('#docTitre').value = ''; $('#docNote').value = ''; go('documents', true);
});

/* ============================================================
   ChantierLive — hors ligne : service worker + file d'attente (IndexedDB)
   Les émargements et photos saisis sans réseau sont conservés avec leurs
   fichiers, puis envoyés dans l'ordre au retour de la connexion.
   ============================================================ */
if ('serviceWorker' in navigator) { window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {})); }
const FILE = {
  db: null,
  ouvrir() { return new Promise((res, rej) => { if (this.db) return res(this.db); const r = indexedDB.open('chantierlive', 1); r.onupgradeneeded = () => { r.result.createObjectStore('file', { keyPath: 'id' }); }; r.onsuccess = () => { this.db = r.result; res(this.db); }; r.onerror = () => rej(r.error); }); },
  async ajouter(item) { const db = await this.ouvrir(); return new Promise((res, rej) => { const t = db.transaction('file', 'readwrite'); t.objectStore('file').put(item); t.oncomplete = () => res(); t.onerror = () => rej(t.error); }); },
  async tout() { const db = await this.ouvrir(); return new Promise((res, rej) => { const r = db.transaction('file').objectStore('file').getAll(); r.onsuccess = () => res(r.result.sort((a, b) => a.cree - b.cree)); r.onerror = () => rej(r.error); }); },
  async retirer(id) { const db = await this.ouvrir(); return new Promise((res, rej) => { const t = db.transaction('file', 'readwrite'); t.objectStore('file').delete(id); t.oncomplete = () => res(); t.onerror = () => rej(t.error); }); },
  async taille() { try { return (await this.tout()).length; } catch { return 0; } }
};
async function majCompteurAttente() { S.fileAttente = await FILE.tout().catch(() => []); const el = $('#nbAttente'); if (el) el.textContent = S.fileAttente.length; }
/* Envoi différé : un enregistrement + un fichier (signature ou photo) */
async function envoyerDiffere(item) {
  if (item.blob) { const up = await sb.storage.from(item.bucket).upload(item.path, item.blob, { contentType: item.blob.type, upsert: true }); if (up.error && !/exists|duplicate/i.test(up.error.message)) throw up.error; }
  const { error } = await sb.from(item.table).insert(item.rec); if (error && !/duplicate/i.test(error.message)) throw error;
}
async function viderFileAttente() {
  if (!navigator.onLine) return; const items = await FILE.tout().catch(() => []); if (!items.length) return; let n = 0;
  for (const it of items) { try { await envoyerDiffere(it); await FILE.retirer(it.id); n++; } catch (e) { console.warn('file attente', e.message); break; } }
  await majCompteurAttente(); if (n) { toast('<b>Synchronisation</b> ' + n + ' saisie(s) hors ligne envoyée(s).'); await chargerDonnees(); go(S.vue, true); }
}
/* Remplace les versions simples d'app.js */
window.viderFileAttente = viderFileAttente;
const _validerPointage = validerPointage;
validerPointage = async function () {
  if (S.sigVide) { toast('<b>Signature manquante</b> — l’agent doit signer dans le cadre.'); return; }
  if (navigator.onLine) return _validerPointage();
  const sel = $('#agentSel'), ag = S.data.agents.find(a => a.id === sel.value); const nom = ag ? ag.nom : 'Visiteur (test)';
  const c = $('#sigCanvas'); const out = document.createElement('canvas'); out.width = 300; out.height = 110; out.getContext('2d').drawImage(c, 0, 0, 300, 110);
  const blob = await new Promise(r => out.toBlob(r, 'image/png')); const id = uid(); const path = S.org.id + '/' + S.prog.id + '/' + new Date().toISOString().slice(0, 10) + '/' + id + '.png';
  const rec = { programme_id: S.prog.id, org_id: S.org.id, agent_id: ag?.id || null, agent_nom: nom, type: S.typePointage, ts: new Date().toISOString(), ts_appareil: new Date().toISOString(), lat: S.gps?.lat ?? null, lng: S.gps?.lng ?? null, precision_m: S.gps?.prec ?? null, device: appareil(), signature_path: path, client_id: id, note: 'saisi hors ligne' };
  await FILE.ajouter({ id, cree: Date.now(), table: 'pointages', bucket: 'signatures', path, blob, rec }); await majCompteurAttente();
  toast('<b>Hors ligne</b> — émargement de ' + esc(nom) + ' conservé sur l’appareil, envoi automatique au retour du réseau.'); go('pointage', true);
};
const _traiterPhoto = traiterPhoto;
traiterPhoto = async function (file) {
  if (!file) return; if (navigator.onLine) return _traiterPhoto(file);
  const pos = await positionRapide(); const blob = await redimensionner(file, 1600, 0.82); const id = uid(), path = S.org.id + '/' + S.prog.id + '/' + new Date().toISOString().slice(0, 10) + '/' + id + '.jpg';
  const ag = S.data.agents.find(a => a.id === $('#phAuteur')?.value);
  const rec = { programme_id: S.prog.id, org_id: S.org.id, zone: $('#phZone')?.value || null, legende: $('#phLeg')?.value || null, auteur_agent_id: ag?.id || null, auteur_nom: ag?.nom || S.user.email, ts: new Date().toISOString(), lat: pos?.lat ?? null, lng: pos?.lng ?? null, path, client_id: id };
  await FILE.ajouter({ id, cree: Date.now(), table: 'photos', bucket: 'photos', path, blob, rec }); await majCompteurAttente();
  toast('<b>Hors ligne</b> — photo conservée sur l’appareil, envoi automatique au retour du réseau.');
};
window.addEventListener('online', viderFileAttente);
majCompteurAttente();

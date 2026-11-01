/* Documents imprimés ChantierLive : format de page, fond perdu (?fp=1), champs personnalisables (?nom=…). */
(function () {
  var html = document.documentElement, q = new URLSearchParams(location.search);
  var w = parseFloat(html.dataset.w), h = parseFloat(html.dataset.h), fp = q.get('fp') === '1';
  if (fp) html.classList.add('fp');
  var W = w + (fp ? 6 : 0), H = h + (fp ? 6 : 0);
  html.style.setProperty('--w', w + 'mm'); html.style.setProperty('--h', h + 'mm');
  var st = document.createElement('style');
  st.textContent = '@page{size:' + W + 'mm ' + H + 'mm;margin:0}';
  document.head.appendChild(st);
  // Champs personnalisables : tout élément [data-champ="x"] reçoit la valeur de ?x=…
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-champ]').forEach(function (el) {
      var v = q.get(el.dataset.champ);
      if (v !== null) { if (el.tagName === 'A' && el.dataset.href) el.setAttribute('href', el.dataset.href + v); el.textContent = v; }
    });
    if (!q.has('nu')) {
      var b = document.createElement('div'); b.className = 'barre';
      b.innerHTML = 'Aperçu de <b>&nbsp;' + (html.dataset.titre || document.title) + '&nbsp;</b> · <a href="?' + (fp ? '' : 'fp=1') + '">' + (fp ? 'sans fond perdu' : 'avec fond perdu 3 mm (imprimeur)') + '</a> · <a href="#" onclick="window.print();return false">imprimer / PDF</a>';
      document.body.appendChild(b);
    }
  });
})();

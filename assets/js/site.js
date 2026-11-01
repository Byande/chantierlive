/* ChantierLive — site vitrine : navigation, révélation, formulaire */
(function () {
  const S = document.currentScript, BASE = (S && S.dataset.base) || '', LANG = (S && S.dataset.lang) || 'fr';
  const PAGE = (S && S.dataset.page) || '';
  const MARK = '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M10 26V16a6 6 0 0 1 6-6h10" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/><path d="M54 38v10a6 6 0 0 1-6 6H38" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/><circle cx="32" cy="32" r="7.5" fill="#E4572E"/><circle cx="32" cy="32" r="13.5" fill="none" stroke="#E4572E" stroke-width="2" opacity=".45"/></svg>';
  const T = {
    fr: { home: 'index.html', links: [['produit', 'produit.html', 'Produit'], ['tarifs', 'tarifs.html', 'Offre'], ['demo', 'demo.html', 'Démo'], ['apropos', 'a-propos.html', 'À propos'], ['connexion', 'app/', 'Connexion']],
      lang: ['EN', 'en/index.html'], cta: 'Demander une démo', ctaHref: 'demo.html',
      cols: [['Produit', [['Modules', 'produit.html'], ['Offre et devis', 'tarifs.html'], ['Demander un accès', 'essai.html'], ['Licence et marque blanche', 'licence.html'], ['Bac à sable', 'https://demo.chantierlive.com/'], ['Documentation', 'docs/index.html']]],
        ['Entreprise', [['À propos', 'a-propos.html'], ['Demander une démo', 'demo.html'], ['Se connecter', 'app/'], ['Contact', 'mailto:contact@chantierlive.com'], ['Charte de marque', 'marque/index.html']]],
        ['Juridique', [['Mentions légales', 'legal/mentions-legales.html'], ['Conditions d’utilisation', 'legal/cgu.html'], ['Conditions de vente', 'legal/cgv.html'], ['Confidentialité', 'legal/confidentialite.html']]]],
      about: 'Le suivi et le contrôle des chantiers en direct, conçu pour les promoteurs et maîtres d’ouvrage d’Afrique et d’Europe.',
      legal: '© 2026 ChantierLive est une marque de Paul Mirabeau Byande, exploitée sous licence par LevENT-IT (France) et ETS 2BY Consulting (Cameroun).',
      menuSmall: 'contact@chantierlive.com' },
    en: { home: 'index.html', links: [['produit', 'index.html#product', 'Product'], ['tarifs', 'index.html#pricing', 'Offer'], ['demo', 'index.html#demo', 'Demo'], ['apropos', '../a-propos.html', 'About'], ['connexion', '../app/', 'Sign in']],
      lang: ['FR', '../index.html'], cta: 'Request a demo', ctaHref: 'index.html#demo',
      cols: [['Product', [['Modules', 'index.html#product'], ['Offer', 'index.html#pricing'], ['Request access (FR)', '../essai.html'], ['Dedicated licence (FR)', '../licence.html'], ['Sandbox', 'https://demo.chantierlive.com/'], ['Documentation', '../docs/index.html']]],
        ['Company', [['About (FR)', '../a-propos.html'], ['Request a demo', 'index.html#demo'], ['Contact', 'mailto:contact@chantierlive.com'], ['Brand guidelines (FR)', '../marque/index.html']]],
        ['Legal (FR)', [['Legal notice', '../legal/mentions-legales.html'], ['Terms of use', '../legal/cgu.html'], ['Terms of sale', '../legal/cgv.html'], ['Privacy', '../legal/confidentialite.html']]]],
      about: 'Real-time site monitoring and control, built for developers and project owners in Africa and Europe.',
      legal: '© 2026 ChantierLive is a trademark of Paul Mirabeau Byande, used under licence by LevENT-IT (France) and ETS 2BY Consulting (Cameroon).',
      menuSmall: 'contact@chantierlive.com' }
  }[LANG];
  const h = (p) => /^(https?:|mailto:|#)/.test(p) ? p : (LANG === 'en' && p.startsWith('../') ? p : BASE + p);
  const arrow = '<span class="ico"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 13 13 3M6 3h7v7"/></svg></span>';

  /* ---- Navigation ---- */
  const nav = document.createElement('div'); nav.className = 'nav';
  nav.innerHTML = '<div class="pill"><a class="brand" href="' + h(T.home) + '">' + MARK + '<span>Chantier<b>Live</b></span></a><nav class="links">' +
    T.links.map(l => '<a href="' + h(l[1]) + '"' + (PAGE === l[0] ? ' aria-current="page"' : '') + '>' + l[2] + '</a>').join('') +
    '</nav><a class="lang" href="' + h(T.lang[1]) + '">' + T.lang[0] + '</a><a class="btn btn-primary btn-sm" href="' + h(T.ctaHref) + '">' + T.cta + arrow + '</a>' +
    '<button class="burger" aria-label="Menu" aria-expanded="false"><span></span><span></span><span></span></button></div>';
  const menu = document.createElement('div'); menu.className = 'menu';
  menu.innerHTML = T.links.map(l => '<a href="' + h(l[1]) + '">' + l[2] + '</a>').join('') + '<a href="' + h(T.lang[1]) + '">' + (LANG === 'fr' ? 'English' : 'Français') + '</a><a class="small" href="mailto:' + T.menuSmall + '">' + T.menuSmall + '</a>';
  document.body.prepend(menu); document.body.prepend(nav);
  const burger = nav.querySelector('.burger');
  burger.addEventListener('click', () => { const o = document.body.classList.toggle('menu-open'); burger.setAttribute('aria-expanded', o); });
  menu.addEventListener('click', e => { if (e.target.tagName === 'A') document.body.classList.remove('menu-open'); });
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 24);
  onScroll(); window.addEventListener('scroll', onScroll, { passive: true });

  /* ---- Pied de page ---- */
  const foot = document.createElement('footer');
  foot.innerHTML = '<div class="wrap"><div class="cols"><div><div class="brand">' + MARK + '<span>Chantier<b>Live</b></span></div><p>' + T.about + '</p></div>' +
    T.cols.map(c => '<div><h4>' + c[0] + '</h4><ul>' + c[1].map(l => '<li><a href="' + h(l[1]) + '"' + (/^https?:/.test(l[1]) ? ' target="_blank" rel="noopener"' : '') + '>' + l[0] + '</a></li>').join('') + '</ul></div>').join('') +
    '</div><div class="legal"><span>' + T.legal + '</span><span>chantierlive.com</span></div></div>';
  document.body.appendChild(foot);

  /* ---- Révélation ---- */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: .08 });
  document.querySelectorAll('.rv').forEach(el => io.observe(el));

  /* ---- Formulaires de demande (démonstration, accès) : insertion dans cl_demandes ---- */
  const SUPA = { url: 'https://vdzzvnuarmprkickeyus.supabase.co', key: 'sb_publishable_Mq8zAuTA--p4R7LoOix07A_B6jcRQWK' };
  document.querySelectorAll('form[data-demo],form[data-acces]').forEach(f => {
    const st = f.querySelector('.status'), acces = f.hasAttribute('data-acces');
    f.addEventListener('submit', async e => {
      e.preventDefault();
      if (f.querySelector('[name=site]') && f.querySelector('[name=site]').value) return;
      const d = Object.fromEntries(new FormData(f).entries()); delete d.site; delete d.consent;
      if (!(d.nom || '').trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((d.email || '').trim())) { st.className = 'status err'; st.textContent = LANG === 'fr' ? 'Indiquez votre nom et une adresse e-mail valide.' : 'Please enter your name and a valid e-mail address.'; return; }
      d.type = acces ? 'acces' : 'demo'; d.langue = LANG; d.source = location.hostname || 'local';
      const btn = f.querySelector('button[type=submit]'); btn.disabled = true; st.className = 'status'; st.textContent = LANG === 'fr' ? 'Envoi en cours…' : 'Sending…';
      try {
        const r = await fetch(SUPA.url + '/rest/v1/cl_demandes', { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SUPA.key, Authorization: 'Bearer ' + SUPA.key, Prefer: 'return=minimal' }, body: JSON.stringify(d) });
        if (!r.ok) throw new Error(await r.text());
        if (acces && document.getElementById('accesOk')) { document.getElementById('okEmail').textContent = d.email.trim(); f.hidden = true; document.getElementById('accesOk').classList.add('on'); window.scrollTo({ top: 0, behavior: 'smooth' }); }
        else { st.className = 'status ok'; st.textContent = LANG === 'fr' ? 'Merci. Nous vous recontactons sous 24 h ouvrées pour fixer la démonstration.' : 'Thank you. We will get back to you within one business day to schedule the demo.'; }
        f.reset();
      } catch (err) {
        st.className = 'status err'; st.innerHTML = LANG === 'fr' ? 'L’envoi a échoué. Écrivez-nous directement à <a href="mailto:contact@chantierlive.com">contact@chantierlive.com</a>.' : 'Sending failed. Please email us at <a href="mailto:contact@chantierlive.com">contact@chantierlive.com</a>.';
      } finally { btn.disabled = false; }
    });
  });
})();

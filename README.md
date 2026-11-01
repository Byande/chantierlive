# ChantierLive — site vitrine

Site statique de ChantierLive (suivi et contrôle de chantier en direct), publié sur GitHub Pages à l'adresse chantierlive.com.

- `index.html`, `produit.html`, `tarifs.html`, `demo.html`, `a-propos.html` : pages françaises.
- `en/` : version anglaise (accueil, produit, tarifs, démo).
- `legal/` : mentions légales, CGU, CGV, confidentialité (ETS 2BY Consulting et LevENT-IT).
- `marque/` : charte graphique et kit de communication (plaquette, flyer, carte de visite, signature e-mail, visuels réseaux ; `kit/` = PDF, visuels, ZIP) ; `assets/brand/` : fichiers du logo (SVG vectorisés, PNG). Régénération : `NODE_PATH=mobile/node_modules node backend/scripts/exporter_marque.js`.
- `docs/` : documentation utilisateur et technique.
- `assets/js/site.js` : navigation, pied de page, révélation, formulaire de démo (table Supabase `cl_demandes`, insertion seule).

Aucune dépendance de construction : modifier les fichiers, puis pousser sur `main`.

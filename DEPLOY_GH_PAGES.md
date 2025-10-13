# Déploiement GitHub Pages (automatique)

Ce fichier explique comment configurer un déploiement automatique sur GitHub Pages pour ce projet.

Pré-requis
- Avoir un repo GitHub avec une branche `main`.
- (Optionnel) Configurer un secret `VITE_MAPBOX_TOKEN` si vous souhaitez injecter votre token Mapbox pendant le build.

Étapes rapides
1. S'assurer que `vite.config.ts` a `base` correct :
   - Pour `https://<user>.github.io/<repo>/` : `base: '/<repo>/'`
   - Pour `https://<user>.github.io/` (repo nommé `<user>.github.io`) : `base: '/'`

2. Pousser le code sur `main` :

```bash
git add .
git commit -m "Prepare GH Pages deploy"
git push origin main
```

3. Le workflow GitHub Actions se déclenchera et construira le site puis publiera le dossier `dist/` dans la branche `gh-pages`.

4. Aller dans Settings -> Pages du repo et vérifier l'URL publique (HTTPS activé automatiquement).

Debug
- Si des ressources sont introuvables, vérifier le `base` dans `vite.config.ts`.
- Vérifier l'onglet Actions dans GitHub pour voir les logs de build.


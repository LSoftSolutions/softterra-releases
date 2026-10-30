# SoftTerra Desktop — Distribution

Ce dépôt public distribue les installateurs Windows et macOS de SoftTerra Desktop, les notes de version et les métadonnées utilisées pour les mises à jour. Le code de l'application reste dans un dépôt privé séparé.

**Aucune version stable n'est disponible pour le moment.** Les fonctionnalités d'analyse locale et de cartographie hors connexion sont en développement. Les préversions ne doivent pas être assimilées à une application scientifique validée.

## Téléchargements et mises à jour

- Les installateurs seront publiés dans [Releases](https://github.com/LSoftSolutions/softterra-releases/releases).
- Cibles : Windows x64, Mac Apple Silicon et Mac Intel.
- `stable/downloads.json` et `beta/downloads.json` décriront les premières installations.
- `stable/latest.json` et `beta/latest.json` décriront les mises à jour signées par plateforme.
- L'absence d'un manifeste indique qu'aucune version n'a encore été promue dans le canal concerné.
- La signature Tauri des mises à jour est distincte des signatures Windows et Apple. Les limites des préversions seront précisées dans les notes de publication.

Le workflow **Promote validated release** publie un brouillon préparé, puis actualise les fichiers du canal dans un seul commit après validation des artefacts. Il exige les rapports de qualification Windows et Mac, vérifie les sommes de contrôle et refuse de faire reculer le canal. La validation de publication reste explicite ; il utilise uniquement les droits de ce dépôt de distribution.

---

This public repository distributes SoftTerra Desktop installers for Windows and macOS, release notes and signed update metadata. Application source remains in a separate private repository.

**No stable release is available yet.** Local analysis and offline mapping are under development. Installers will appear under Releases after validation. Stable and beta channels remain separate; a missing manifest means no release has been promoted to that channel.

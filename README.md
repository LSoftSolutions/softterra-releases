# SoftTerra Desktop — Distribution

Ce dépôt public distribue les installateurs Windows et macOS de SoftTerra Desktop, les notes de version et les métadonnées utilisées pour les mises à jour. Le code de l'application reste dans un dépôt privé séparé.

**Bêta actuelle : [0.1.0-beta.10](https://github.com/LSoftSolutions/softterra-releases/releases/tag/v0.1.0-beta.10). Aucune version stable n'est disponible pour le moment.** Les fonctionnalités d'analyse locale et de cartographie hors connexion sont en développement. Les préversions ne doivent pas être assimilées à une application scientifique validée.

## Téléchargements et mises à jour

- Les installateurs sont publiés dans [Releases](https://github.com/LSoftSolutions/softterra-releases/releases).
- Cibles : Windows x64, Mac Apple Silicon et Mac Intel.
- `stable/downloads.json` et `beta/downloads.json` décrivent les premières installations.
- `stable/latest.json` et `beta/latest.json` décrivent les mises à jour signées par plateforme.
- L'absence d'un manifeste indique qu'aucune version n'a encore été promue dans le canal concerné.
- La signature Tauri des mises à jour est distincte des signatures Windows et Apple. Les limites des préversions seront précisées dans les notes de publication.

Le workflow **Promote validated release** publie un brouillon préparé, puis actualise les fichiers du canal dans un seul commit après validation des artefacts. Il exige les rapports de qualification Windows et Mac, vérifie les sommes de contrôle et refuse de faire reculer le canal. La validation de publication reste explicite ; il utilise uniquement les droits de ce dépôt de distribution.

---

This public repository distributes SoftTerra Desktop installers for Windows and macOS, release notes and signed update metadata. Application source remains in a separate private repository.

**Current beta: [0.1.0-beta.10](https://github.com/LSoftSolutions/softterra-releases/releases/tag/v0.1.0-beta.10). No stable release is available yet.** Local analysis and offline mapping are under development. Installers are available under Releases after validation. Stable and beta channels remain separate; a missing manifest means no release has been promoted to that channel.

## Transfert direct facultatif

Le workflow `Stage reviewed installers` reçoit un manifeste de transfert d’un opérateur autorisé : tag bêta, commit source privé, noms, tailles, SHA-256 GitHub et URL de lecture temporaires limitées aux paquets destinés à être publiés. Il ne reçoit aucun jeton du dépôt privé. Il vérifie toutes les empreintes, les rapports de qualification et les signatures updater liées à la version avec la variable publique `SOFTTERRA_UPDATE_PUBLIC_KEY`, puis prépare uniquement un brouillon public. La promotion reste distincte. Les scripts et l’outil Rust de ce dépôt servent à valider la distribution ; ils ne contiennent pas le code applicatif.

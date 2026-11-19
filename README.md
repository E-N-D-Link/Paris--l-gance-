# Paris Élégance

Carnet privé collaboratif des adresses élégantes et historiques de Paris.

## Fonctionnalités

- Carte OpenStreetMap / Leaflet avec 15 adresses de départ et lieux ajoutés par les membres.
- Filtres catégorie, budget, arrondissement, texte et statut de visite.
- Connexion par e-mail via Supabase Auth ; groupes privés sur invitation.
- Ajout manuel de lieux avec position GPS choisie sur la carte, suivi individuel des visites et synchronisation régulière.
- Export/import JSON de lieux ; partage des filtres par URL.
- Aucune clé secrète dans le navigateur : seule la clé **publishable** Supabase est intégrée.

## Démarrage

Ouvrir `index.html` avec un serveur HTTP local, ou activer GitHub Pages (Settings → Pages → Deploy from branch → main / root).

1. Sur la page, créer un compte / se connecter avec son e-mail.
2. Créer un carnet et copier le lien d'invitation (il contient un jeton privé).
3. Les amis ouvrent le lien, se connectent et choisissent un pseudo.
4. Ajouter des lieux et cocher ses visites.

La base Supabase existante `paris-elegance` (région Paris, projet `ytdzcxlbtqhpopnyyjys`) est réutilisée : `rooms`, `room_members`, `custom_places`, `place_visits`, ainsi que les RPC `create_room`, `join_room` et `rotate_invite`. Les accès sont protégés par Row-Level Security.

## Confidentialité

Le code GitHub Pages est public, mais les données de groupe ne sont accessibles qu'aux membres authentifiés. Les jetons d'invitation donnent accès au groupe : ne les publiez pas. Ils sont placés dans le fragment `#` du lien et peuvent être renouvelés par le propriétaire. Les marques de visite sont individuelles. Les données cartographiques sont servies par OpenStreetMap ; les CDN Leaflet / Supabase chargent des ressources externes.

## Limites

- Application statique sans serveur personnalisé : les coordonnées des lieux ajoutés sont choisies manuellement sur la carte.
- Synchronisation par rechargement toutes les 5 secondes quand la session est active.
- L'accès au carnet nécessite une connexion Supabase, et la confirmation d'e-mail peut être requise selon les réglages Auth.
- Vérifier les conditions d'utilisation du fond de carte et du géocodeur avant une utilisation à grande échelle.

# Spécifications — Système de Vote Happy Cash

> Cahier des charges fonctionnel léger pour le module de vote
> Version 0.1 — Mai 2026
> Auteur : SIPOUFO Yvan
> Destinataire : développement interne (Yvan)

---

## 1. Contexte et objectifs

Happy Cash a besoin d'un **système de vote en ligne** intégré à son site existant (printmarksgraphics.cloud/happycash) pour gérer démocratiquement et de manière traçable l'ensemble des décisions collectives du collectif et de ses filiales.

### Objectifs fonctionnels

1. **Démocratie traçable** : chaque vote produit une trace consultable (audit trail).
2. **Confidentialité au choix** : pouvoir basculer entre vote ouvert et vote anonyme selon le contexte.
3. **Flexibilité** : couvrir tous les cas d'usage (élections, validations, sondages).
4. **Simplicité d'usage** : un membre lambda doit pouvoir voter en 30 secondes depuis son téléphone.

### Cas d'usage cibles

| Cas | Mode privilégié | Quorum typique | Majorité typique |
|---|---|---|---|
| Élection du Président | Anonyme | 100% des Fondateurs | Absolue (50%+1) |
| Élection du Board | Anonyme | 100% des Fondateurs | Top N candidats |
| Vote du nom officiel | Anonyme, 2 tours | 100% des Fondateurs | Simple au tour 2 |
| Admission nouveau Fondateur | Ouvert | 100% Fondateurs présents | Unanimité |
| Admission nouveau Membre actif (filiale) | Ouvert | 100% Board | Qualifiée (2/3) |
| Validation nouveau projet filiale | Ouvert | 100% Board | Qualifiée (2/3) |
| Validation budget annuel | Ouvert | Majorité Board | Simple |
| Modification des statuts | Anonyme | 2/3 Fondateurs | Qualifiée (2/3) |
| Dissolution | Anonyme | 3/4 Fondateurs | Absolue (3/4) |
| Sondage informel (canaux, valeurs) | Au choix | Aucun | Indicatif |

---

## 2. Fonctionnalités essentielles (MVP)

### 2.1 Création d'un vote

L'administrateur (Président ou Secrétaire général) peut créer un vote avec les paramètres suivants :

| Champ | Type | Détail |
|---|---|---|
| **Titre du vote** | Texte libre | Ex : "Élection du Président — 23 mai 2026" |
| **Description** | Texte long | Contexte, enjeux, lien vers documents préparatoires |
| **Mode** | Choix unique | Anonyme / Ouvert |
| **Type de scrutin** | Choix unique | Vote unique / Vote multiple / Choix classé (ranked) |
| **Nombre de voix par votant** | Entier | 1 (vote unique) ou N (vote multiple) |
| **Options de réponse** | Liste éditable | Ajout/suppression dynamique des candidats ou options |
| **Possibilité de bulletin blanc** | Booléen | Oui / Non |
| **Restriction d'éligibilité** | Multi-sélection | Niveau 1 / Niveau 1+2 / Niveau 1+2+3 / Tous |
| **Quorum minimum** | Pourcentage | Par défaut 0%, configurable |
| **Majorité requise** | Choix unique | Simple / Absolue / Qualifiée 2/3 / Qualifiée 3/4 / Unanimité |
| **Date d'ouverture** | Date+heure | Maintenant ou différée |
| **Date de fermeture** | Date+heure | Délai défini ou fermeture manuelle |
| **Mode de fermeture** | Choix unique | Automatique (à la date) / Manuelle (par admin) |
| **Visibilité des résultats** | Choix unique | Visible immédiatement après vote / Visible à la fermeture / Visible par admin uniquement |

### 2.2 Émission d'un vote

Un votant éligible reçoit :

1. **Notification email** au moment de l'ouverture du vote.
2. Un **lien unique** vers la page de vote (accès authentifié par email/code).
3. **Affichage** des options et du contexte (description, documents joints, date de fermeture).
4. **Validation finale** avec confirmation avant soumission.
5. **Email de confirmation** avec :
   - Récapitulatif de son vote (si mode ouvert).
   - Confirmation de participation sans détail du choix (si mode anonyme).
6. **Impossibilité de revoter** une fois validé (sauf option "modification jusqu'à fermeture" activée).

### 2.3 Suivi en temps réel

Pendant la période de vote, l'administrateur voit :

- Nombre de votants éligibles total.
- Nombre de votants ayant participé (taux de participation en %).
- Heure de fermeture restante.
- Liste des votants restants (relance possible en 1 clic).

### 2.4 Dépouillement et résultats

À la fermeture :

- **Calcul automatique** selon la majorité requise.
- **Annonce du résultat** :
  - Si majorité atteinte : option/candidat élu.
  - Si majorité non atteinte : indication "Pas de majorité, [tour 2 / nouveau vote / décision reportée]".
- **Génération automatique** d'un PDF de résultats (avec date, options, votes, taux de participation, validation).
- **Archivage** dans l'historique consultable.
- **Notification email** à tous les votants avec le résultat.

---

## 3. Fonctionnalités importantes (V1)

### 3.1 Vote multi-tours automatique

Si le vote nécessite plusieurs tours (typiquement pour l'élection du nom ou du Président) :

- À la fermeture du tour 1, **détection automatique** que la majorité n'est pas atteinte.
- **Création automatique** d'un tour 2 avec :
  - Les 2 meilleures options du tour 1 (paramètre configurable : top 2 ou top 3).
  - Mêmes électeurs éligibles.
  - Délai par défaut (configurable : 24h ou ouverture immédiate selon le contexte).
- **Notification email** d'ouverture du tour 2.

### 3.2 Délégation de vote (procuration)

Un votant absent peut **déléguer sa voix** à un autre membre éligible :

- Délégation explicite avant l'ouverture du vote (formulaire dédié).
- Limite : un membre ne peut détenir au maximum **2 procurations** (pour éviter les concentrations).
- Visibilité : les procurations sont publiques (transparence anti-manipulation).
- Le délégué vote 1 voix pour lui-même + 1 voix par procuration reçue.

### 3.3 Bulletin invalide et règles de validation

- **Vote unique** : si plus d'une option cochée, bulletin invalide.
- **Vote multiple à N voix** : si plus ou moins de N options cochées, bulletin invalide.
- **Affichage** : compteur en temps réel pendant le vote ("Vous avez sélectionné X/N options").

### 3.4 Commentaires optionnels

Au moment du vote, le votant peut ajouter un **commentaire optionnel** :

- Visibles à l'administrateur uniquement (si vote anonyme).
- Visibles à tous (si vote ouvert).
- Utiles pour comprendre les motivations sans changer le résultat.

### 3.5 Audit trail complet

Pour chaque vote, conservation pendant **10 ans minimum** :

- Date de création, créateur.
- Paramètres complets (mode, type, majorité, etc.).
- Liste des votants éligibles.
- Liste des votants ayant participé (pas leur choix si anonyme).
- Procurations enregistrées.
- Résultat final.
- PDF de résultats horodaté.

### 3.6 Historique consultable

Page "Historique des votes" accessible :

- À tous les Fondateurs (votes anonymes : résultat seulement).
- À l'administrateur (votes ouverts : détail des votes).
- Filtres : par date, par type, par catégorie, par résultat.
- Recherche textuelle.

---

## 4. Fonctionnalités avancées (V2+)

### 4.1 Vote pondéré

Possibilité de donner un **poids** différent selon le rôle :

- Vote standard : 1 voix = 1 votant.
- Vote pondéré : Président = 2 voix (voix prépondérante en cas d'égalité au Board).
- À utiliser avec parcimonie pour éviter les abus.
- Indication claire dans le titre du vote ("Vote pondéré — Président a voix prépondérante").

### 4.2 Vote classé (ranked-choice)

Le votant **classe** les options par ordre de préférence (1, 2, 3...). Le système calcule un résultat selon une méthode configurable :

- **Méthode Condorcet** : élit le candidat qui bat tous les autres en duel.
- **Méthode Borda** : somme des rangs inversés.
- **Méthode IRV (instant runoff)** : élimination progressive.

Particulièrement utile pour le vote du nom (qui peut avoir 5-10 options).

### 4.3 Quorum dynamique

Calcul automatique du quorum atteint ou non, avec **notification dès que le quorum est atteint** pour permettre une fermeture anticipée si tous les votants éligibles ont participé.

### 4.4 Vote conditionnel

Possibilité de chaîner les votes :

- "Si vous votez Oui à la question 1, répondez aussi à la question 2."
- Utile pour les votes complexes (par exemple : "Approuvez-vous le budget ? Si oui, validez aussi la répartition.").

### 4.5 Export et intégrations

- Export CSV des résultats.
- Export PDF avec mise en page Happy Cash.
- Webhook vers Discord/WhatsApp pour annoncer l'ouverture/fermeture d'un vote.
- Intégration calendrier (iCal) pour les votes programmés.

### 4.6 Mode "réunion live"

Mode spécial pour les votes pendant les AG :

- Ouverture en 1 clic depuis le mobile de l'administrateur.
- Fermeture automatique au bout de X minutes (configurable, ex : 5 min).
- Affichage en temps réel projetable.

---

## 5. Considérations techniques

### 5.1 Authentification

- Authentification par **email + lien magique** (pas de mot de passe à mémoriser).
- Optionnel : 2FA par SMS pour les Fondateurs (renforcement).
- Session de vote limitée à 30 minutes pour réduire le risque d'oubli de déconnexion.

### 5.2 Sécurité

- Chiffrement HTTPS obligatoire (déjà en place sur ton domaine).
- En mode **anonyme** : dissociation complète entre identité du votant et son choix. Les deux tables sont liées par un token aléatoire détruit après dépouillement.
- Logs anti-fraude : détection de votes multiples depuis une même IP, alerte admin.
- Backup quotidien des bases.

### 5.3 Confidentialité (RGPD)

- Politique de confidentialité claire affichée à la création du compte.
- Droit à l'oubli : un membre peut demander la suppression de son compte (les votes anonymes restent comptabilisés sans lien avec son identité).
- Conservation des audit trails 10 ans, anonymisée passé 3 ans pour les votes ouverts.

### 5.4 Accessibilité

- Compatible mobile (Android et iOS, responsive).
- Faible consommation de données (texte + boutons, pas de vidéo).
- Optimisé pour 3G (chargement < 3 secondes sur 3G).
- Mode hors-ligne partiel : possibilité de remplir le bulletin offline et synchroniser dès reconnexion.

---

## 6. Considérations UX

### 6.1 Parcours votant

1. **Email** : "Un nouveau vote est ouvert : [Titre]". Bouton "Voter maintenant".
2. **Page de vote** :
   - En-tête : titre + date de fermeture + temps restant.
   - Description et contexte (max 200 mots).
   - Liens vers documents joints éventuels.
   - Liste des options (radios pour vote unique, checkboxes pour vote multiple).
   - Indicateur visuel "X/N options sélectionnées".
   - Bouton "Voter" grisé tant que la sélection est invalide.
3. **Confirmation** : récapitulatif avant validation finale. Bouton "Confirmer mon vote" + bouton "Modifier".
4. **Page de remerciement** : "Votre vote est enregistré." + lien vers les résultats (si visibles immédiatement).
5. **Email de confirmation** : trace écrite.

### 6.2 Parcours administrateur

1. **Dashboard** : liste des votes actifs (en cours, programmés, fermés).
2. **Création** : formulaire en une page avec preview.
3. **Suivi** : compteur temps réel, liste relances.
4. **Résultats** : dépouillement en 1 clic.
5. **Archivage** : automatique post-fermeture.

### 6.3 Esthétique

- Reprise de la charte graphique Happy Cash (à définir collectivement).
- Polices claires, contrastes forts.
- Boutons larges (cible mobile).
- Pas d'emojis excessifs (sérieux institutionnel).

---

## 7. Priorisation des fonctionnalités

### Pour la 2e réunion (23 mai 2026)

**Indispensable** :
- Création de vote (anonyme ou ouvert).
- Vote unique ou multiple (jusqu'à N choix).
- Vote des Fondateurs uniquement (restriction d'éligibilité Niveau 1).
- Fermeture manuelle ou programmée.
- Quorum + majorité configurables.
- Multi-tours automatique pour l'élection du Président et le vote du nom.
- Email de confirmation et résultats.

**Pas urgent (pour V1.5)** :
- Délégation de vote.
- Vote classé.
- Audit trail détaillé.

**Plus tard (V2)** :
- Vote pondéré.
- Mode réunion live.
- Vote conditionnel.

### Calendrier suggéré

| Date | Livrable |
|---|---|
| 15-21 mai | Développement MVP (création vote, vote, dépouillement basique) |
| 22 mai | Test interne avec 2-3 amis |
| 23 mai | Utilisation effective à la 2e réunion |
| Juin 2026 | Ajout des fonctionnalités V1 (audit trail, délégation) |
| Été 2026 | V2 (vote classé, mode live) |

---

## 8. Architecture suggérée (sommaire)

```
Frontend (printmarksgraphics.cloud/happycash)
├── Page d'accueil
├── Espace membre (login email magic link)
├── Liste des votes actifs
├── Page de vote (formulaire)
├── Page de résultat
└── Page admin (création / suivi / résultats)

Backend
├── API REST sécurisée
├── Authentification (token email magic link)
├── Base de données :
│   ├── users (id, email, niveau, statut)
│   ├── votes (id, titre, paramètres, statut)
│   ├── options (id, vote_id, texte, ordre)
│   ├── ballots (id, vote_id, user_id si ouvert OR token anonyme, choix)
│   └── audit_log
└── Service d'envoi email (SendGrid, Mailjet ou similaire)
```

---

# Ollisanté – Application mobile (Expo / React Native, TypeScript)

Application patient et praticien, en français et en anglais, qui utilise le backend `ollisante-backend`.

> **Statut : code écrit, jamais lancé sur un téléphone.** La cohérence des types a été vérifiée par le compilateur
> TypeScript (avec des déclarations simplifiées des bibliothèques), mais l'application n'a pas encore tourné.
> Le premier lancement est le premier vrai test : envoyez-moi les erreurs telles quelles.

## Ce que fait cette première version
- **Accueil** : logo, slogan « Votre santé tout simplement », choix FR / EN.
- **Connexion MVP** : téléphone + code SMS (prénom et nom demandés à la première connexion), ou e-mail + mot de passe.
- **Patient** : recherche de professionnels (nom, pays, spécialité, vidéo), fiche, créneaux des 14 prochains jours,
  réservation, liste des rendez-vous, annulation.
- **Professionnel de santé** : inscription (vérifiée ensuite par un administrateur), horaires de consultation
  (jours, heures, durée des créneaux, vidéo ou sur place, établissements), agenda des rendez-vous.
- **Compte** : langue, déconnexion, demande de suppression.
- Session conservée dans le coffre sécurisé du téléphone, renouvelée automatiquement ; écran « pas de connexion » avec
  bouton Réessayer (la session n'est pas perdue quand le réseau tombe).

## Pas encore dans cette version
Paiement en ligne (le rendez-vous reste « en attente de paiement »), consultation vidéo (bouton « Rejoindre » inactif),
notifications, navigation sans compte, suppression de compte automatique (voir plus bas).

## Installation (sur votre ordinateur, avec Node.js 20 ou plus récent)
```bash
npx create-expo-app@latest ollisante-app --template blank-typescript
cd ollisante-app
# Copier PAR-DESSUS le projet créé : App.tsx, app.json, le dossier assets/ et le dossier src/ de ce paquet
npx expo install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs \
  react-native-screens react-native-safe-area-context expo-secure-store expo-localization expo-status-bar
cp .env.example .env        # puis régler EXPO_PUBLIC_API_URL
npx expo start
```
`npx expo install` choisit automatiquement les versions compatibles avec la version d'Expo installée : ne figez pas
de versions à la main.

## Adresse de l'API (`.env`)
| Où tourne l'application | `EXPO_PUBLIC_API_URL` |
|---|---|
| Téléphone réel avec le backend sur votre ordinateur | `http://ADRESSE_IP_DE_VOTRE_ORDINATEUR:8088` |
| Simulateur iOS | `http://localhost:8088` |
| Émulateur Android | `http://10.0.2.2:8088` |
| Serveur de production | `https://api.ollisante.com` |

## Tester la connexion par SMS sans fournisseur SMS
Lancez le backend avec le profil `local` : les SMS ne sont pas envoyés, **le code s'affiche dans la console du backend**
(`[SMS simulé] vers +223… : … votre code de connexion est 123456`).

## Tester le parcours complet
1. Sur le backend local, l'administrateur de test est `admin@ollisante.local` (voir le README du backend).
2. Dans l'app : « Je suis un professionnel de santé » → inscription.
3. Avec l'API (ou Swagger), l'administrateur passe ce praticien à `VERIFIED`.
4. Le praticien ajoute des horaires (onglet « Mes horaires »).
5. Se déconnecter, se connecter par téléphone (code SMS) en patient, rechercher, réserver.

## Publier sur TestFlight / les stores
- Installer EAS : `npm install -g eas-cli`, puis `eas login`, `eas build:configure`, `eas build --platform ios`,
  `eas submit --platform ios`.
- **Identifiant d'application** : `app.json` reprend `com.idrissadiarra.ollisante`, celui de la version de test actuelle.
  Pour mettre à jour **la même fiche TestFlight**, il faut utiliser le compte Apple Developer qui la possède (celui de
  votre développeur) : demandez qu'il vous ajoute comme administrateur ou qu'il transfère l'app à votre compte.
  Sinon, changez l'identifiant (`ios.bundleIdentifier`, `android.package`) et créez une nouvelle fiche à votre nom.
- Apple et Google exigent : une **politique de confidentialité** en ligne (renseigner `EXPO_PUBLIC_PRIVACY_URL`),
  les conditions d'utilisation (`EXPO_PUBLIC_TERMS_URL`) et la **suppression de compte dans l'application**.
  Aujourd'hui le bouton « Supprimer mon compte » ouvre un e-mail vers `EXPO_PUBLIC_SUPPORT_EMAIL` : il faudra
  ajouter une route de suppression au backend (à concevoir avec votre juriste : durée de conservation des données de santé).

## Structure
```
App.tsx                 point d'entrée
src/config.ts           adresse de l'API et liens légaux
src/theme.ts            couleurs et typographie (charte Ollisanté)
src/api/                client HTTP (renouvellement de session), types, routes
src/auth/               session et coffre sécurisé
src/i18n/               textes fr.ts / en.ts
src/components/ui.tsx   composants (boutons, champs, cartes, choix de pays…)
src/navigation/         parcours selon le rôle (patient / praticien / non connecté)
src/screens/            écrans
```

## À vérifier sur un vrai téléphone
Lisibilité des textes avec la taille de police agrandie, contrastes en plein soleil, saisie du numéro de téléphone,
comportement avec un réseau très lent, VoiceOver / TalkBack sur les écrans de connexion et de réservation.

# Setup Supabase (pas à pas)

Ce projet utilise **Supabase Auth** + 3 tables applicatives :
- `profiles`
- `notes`
- `note_versions`

Le SQL source est dans `supabase/schema.sql`.

## 1) Créer le projet Supabase
1. Va sur https://supabase.com et crée un projet.
2. Ouvre **Project Settings → API**.
3. Copie :
   - **Project URL**
   - **anon public key**

Tu les mettras dans le `.env`.

## 2) Exécuter le schéma SQL
1. Dans Supabase, ouvre **SQL Editor**.
2. Copie le contenu de `supabase/schema.sql`.
3. Clique sur **Run**.

Ce script crée :
- La table `profiles` (liée à `auth.users`).
- La table `notes` (notes utilisateur).
- La table `note_versions` (historique/undo).
- Les règles RLS (accès uniquement aux données de l'utilisateur connecté).
- Les triggers automatiques :
  - création de profil à l'inscription,
  - mise à jour de `updated_at` pour `notes`.

## 3) Vérifier l'auth côté Supabase
Dans **Authentication → Providers** :
- Active **Email** provider.
- Si tu veux tester vite en dev, désactive temporairement la confirmation email (optionnel).

## 4) Préparer le `.env`
Crée/complète un fichier `.env` à la racine du projet avec :

```env
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-public-key>
EXPO_PUBLIC_GEMINI_API_KEY=<gemini-api-key>
EXPO_PUBLIC_UNSPLASH_ACCESS_KEY=<unsplash-access-key>
```

### Détail des variables
- `EXPO_PUBLIC_SUPABASE_URL`
  - Format attendu : `https://xxxxx.supabase.co`
  - Source : Supabase → Project Settings → API → Project URL

- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
  - Source : Supabase → Project Settings → API → `anon` `public`
  - ⚠️ Mets bien la clé **anon/public**, jamais la `service_role` dans Expo.

- `EXPO_PUBLIC_GEMINI_API_KEY`
  - Source : Google AI Studio (clé API Gemini)
  - Utilisée dans `lib/ai.ts`

- `EXPO_PUBLIC_UNSPLASH_ACCESS_KEY`
  - Source : app Unsplash developer
  - Utilisée dans `lib/unsplash.ts`

## 5) Redémarrer Expo après changement de `.env`
Quand tu modifies `.env`, redémarre le bundler :

```bash
npx expo start -c
```

(`-c` vide le cache Metro, utile si des variables d'env ne remontent pas.)

## 6) Vérifications rapides
- Inscription d'un utilisateur : un enregistrement doit apparaître dans `profiles`.
- Création de note : un enregistrement dans `notes` avec le bon `user_id`.
- Undo : lecture/insert/delete sur `note_versions` (grâce aux policies RLS).

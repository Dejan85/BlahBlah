# BlahBlah

Social media app — hibrid **Snapchat + Instagram** — građen u **Expo / React Native** sa **Supabase** backendom.

Signature mehanike: **Blah Score**, **streak + recovery**, **chat hours**, **ephemeral chat**, **presence / close-by** discovery i **Blah+** premium.

---

## Tech stack

- **Expo SDK 51** + **expo-router** (file-based routing, typed routes)
- **React Native 0.74** / React 18
- **Supabase** (`@supabase/supabase-js`) — auth, baza, storage, realtime
- **TanStack Query** za server state
- **react-hook-form** + **yup** za forme
- **react-native-purchases** (RevenueCat) za Blah+ / recovery plaćanja
- **Jest** (`jest-expo`) za testove čiste logike u `lib/`

## Preduslovi

- Node.js (LTS) + **npm** (ne yarn — vidi `CLAUDE.md`)
- Expo Go ili dev build na uređaju/emulatoru
- `.env` sa Supabase kredencijalima:
  ```
  EXPO_PUBLIC_SUPABASE_URL=...
  EXPO_PUBLIC_SUPABASE_ANON_KEY=...
  ```

## Pokretanje

```bash
npm install        # instalacija zavisnosti
npm start          # expo start (dev menu — bira se platforma)
npm run android    # native Android build
npm run ios        # native iOS build
```

## Razvojne komande

```bash
npx tsc --noEmit   # type check (mora da prolazi posle svakog taska)
npm test           # Jest testovi (lib/)
npm run lint       # expo lint
npm run format     # prettier --write .
```

## Struktura projekta

```
app/          Ekrani (expo-router, file-based routing)
components/   Reusable UI + feature komponente (CustomText/Button/TextInput…)
context/      React Context provideri (global state)
hooks/        Custom hooks (useLocation, usePresence, useTypingStatus…)
lib/          ⭐ Čista poslovna logika — pure funkcije + colocated *.test.ts
utils/        Supabase i notification klijenti
types/        TypeScript tipovi (barrel preko index.ts)
constants/    Colors, Dimensions
assets/       Slike (.svg/.png), fontovi (Inter)
docs/         📖 Single source of truth — vidi ispod
```

## Konvencije (kratko)

- **Poslovna logika ide u `lib/`** kao čiste funkcije (bez React/Supabase/UI) + test. Detalji: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) §2.5.
- **Custom komponente**, ne goli RN: tekst → `CustomText`, dugme → `CustomButton`, input → `CustomTextInput`.
- **Import alias `@/*`**, ne relativne `../../`.

## Dokumentacija

`docs/` je single source of truth — pročitaj relevantan fajl pre rada:

| Fajl | Sadržaj |
|---|---|
| [docs/TASKS.md](docs/TASKS.md) | Task-po-task tracker, redosled rada |
| [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md) | Status, blokeri, roadmap, dnevnik |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Folderi, konvencije, `lib/` pravilo |
| [docs/FEATURES.md](docs/FEATURES.md) | Spec mehanika (Blah Score, streak, ephemeral…) |
| [docs/SCREENS.md](docs/SCREENS.md) | Screen-by-screen spec sa Figme |

Workflow i pravila rada (definicija završenog taska): [CLAUDE.md](CLAUDE.md).

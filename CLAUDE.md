# BlahBlah

Social media app (Expo / React Native), hibrid Snapchat + Instagram. Backend: **Supabase**.

## ⚠️ PRVO PROČITAJ (na početku svake sesije / novog taska)

`docs/` je single source of truth. **Pre rada pročitaj relevantan fajl** (ne radi iz pamćenja):

| Fajl | Kad ga čitaš |
|---|---|
| [docs/TASKS.md](docs/TASKS.md) | **Uvek prvo** — task-po-task tracker, šta je sledeće, redosled rada |
| [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md) | Gde projekat stoji, blokeri, roadmap, dnevnik |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Pre dodavanja koda — folderi, konvencije, reusable komponente, `lib/` pravilo |
| [docs/FEATURES.md](docs/FEATURES.md) | Spec mehanika (Blah Score, streak, ephemeral…) — za Faza 3 taskove |
| [docs/SCREENS.md](docs/SCREENS.md) | Screen-by-screen spec sa Figme |

> Radimo **task po task** redosledom iz TASKS.md. Posle svakog taska ažuriraj TASKS.md (`[x]`) + dnevnik u PROJECT_STATUS.md §8.

## Tvrda pravila

- **Logika u `lib/`**: poslovna logika (pravila/matematika/formatiranje) ide u čiste funkcije u `lib/` (BEZ React/Supabase/UI) + colocated `*.test.ts`. Detalji: ARCHITECTURE.md §2.5.
- **Custom komponente**: tekst → `CustomText`, dugme → `CustomButton`, input → `CustomTextInput`. Ne goli RN `<Text>`/`<TextInput>`.
- **Import alias** `@/*`, ne relativne `../../`.
- **Posle svakog taska**: `npx tsc --noEmit` mora da prođe, pa **commit + push**.
- **Commit granularnost**: jedan task = jedan atomski commit (mapira na TASKS.md). Spoj više taskova samo kad su nerazdvojivi. Ne ostavljaj završen task nekomitovan.
- **Package manager**: npm (ne yarn).
- ⚡ Taskovi sa `⚡` u TASKS.md traže High effort — podseti me da dignem effort pre njih.

## Komande

```bash
npx tsc --noEmit   # type check
npx expo start     # pokretanje
npm test           # testovi (lib/)
npm run lint
```

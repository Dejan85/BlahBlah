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

> Radimo **task po task** redosledom iz TASKS.md. Kad task završiš → vidi "Definicija završenog taska" niže (obavezno ažuriranje docs-a).

## Tvrda pravila

- **Logika u `lib/`**: poslovna logika (pravila/matematika/formatiranje) ide u čiste funkcije u `lib/` (BEZ React/Supabase/UI) + colocated `*.test.ts`. Detalji: ARCHITECTURE.md §2.5.
- **Custom komponente**: tekst → `CustomText`, dugme → `CustomButton`, input → `CustomTextInput`. Ne goli RN `<Text>`/`<TextInput>`.
- **Import alias** `@/*`, ne relativne `../../`.
- **Package manager**: npm (ne yarn).
- ⚡ Taskovi sa `⚡` u TASKS.md traže High effort — podseti me da dignem effort pre njih.

## ✅ Definicija završenog taska (OBAVEZNO, ne preskači nijedan korak)

> Cilj: kontinuitet — neko (ili nova sesija) mora iz docs-a da vidi tačno gde smo, bez gubitka konteksta. Ne ostavljaj docs zastarele.

1. `npx tsc --noEmit` prolazi.
2. **TASKS.md** — čekiraj `[x]` + kratka beleška šta je urađeno; ako je faza gotova, označi je.
3. **PROJECT_STATUS.md — ažuriraj SVE pogođene sekcije, ne samo dnevnik:**
   - §8 dnevnik: dodaj red (šta, kako, watch-itemi).
   - §3 Blokeri / §4 Problemi / §5 Rizici: precrtaj/označi rešeno, dodaj novonastalo.
   - §2.5 procena ako se završenost promenila.
   - Proveri da nijedna tvrdnja u §1–§5 nije zastarela (npr. brojevi grešaka, "ne build-uje", mrtve reference na fajlove).
4. **FEATURES.md / SCREENS.md** — ako je task dotakao mehaniku/ekran, ažuriraj status tamo.
5. **commit + push.** Jedan task = jedan atomski commit (mapira na TASKS.md); spoj više taskova samo kad su nerazdvojivi. Ne ostavljaj završen task nekomitovan.

## Komande

```bash
npx tsc --noEmit   # type check
npx expo start     # pokretanje
npm test           # testovi (lib/)
npm run lint
```

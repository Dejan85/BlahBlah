# 📋 BlahBlah — Status projekta

> Poslednje ažuriranje: **2026-06-23**
> Grana: `develop` · Glavna grana: `master`
> Ovaj fajl je "single source of truth" — odakle znamo gde stojimo i šta sledi.

---

## 1. Šta je BlahBlah

Social media mobilna aplikacija (Expo / React Native), hibrid **Snapchat + Instagram**.
Stanje: **Faza 0 završena** — app se build-uje i diže na uređaju bez crash-a (vidi §8 dnevnik).

### Tech stack
- **Expo 51** + **expo-router** (file-based routing, `app/` folder)
- **Backend: Supabase** — auth, Postgres baza, storage, realtime websockets (glavni backend)
- **Firebase** — nameravan samo za push notifikacije (jedva integrisan)
- **RevenueCat** (`react-native-purchases`) — pretplate / premium
- Pomoćno: React Hook Form + Yup, Reanimated, Gesture Handler, Skia (filteri), FlashList, TanStack Query

### Supabase tabele koje kod koristi
`profiles` · `posts` · `conversations` · `messages` · `message_reactions` · `notifications` · `follow_requests` · `follows`

---

## 2. ✅ Šta JE urađeno

Aplikacija je obimna — ~298 fajlova, ~70 komponenti.

| Oblast | Status | Lokacija |
|---|---|---|
| **Auth** | Email/password, Google sign-in, OTP, forgot/reset password, multi-step sign-up (birthday → username → profilna → permisije) | `context/AuthContext.tsx`, `app/auth/` |
| **Chat** | 1-na-1 poruke, realtime, emoji reakcije, audio poruke, slike, fajlovi, typing indikator, presence, swipe akcije | `context/MessageContext.tsx` (650 linija), `app/chats/chat-room/[id].tsx` (1252 linije) |
| **Postovi / Feed** | Kreiranje (slika/video + dodatni mediji, mentions, hashtags, zaključavanje), feed, profilni postovi, komentari | `context/PostContext.tsx`, `components/PostsFeed.tsx` |
| **Kamera** | Capture → preview → filteri → send (Skia filteri) | `app/camera/`, `components/Camera/` |
| **"Blahs"** | Tekstualni postovi (zaseban feature) | `app/blahs/` |
| **Social graf** | Followers / following / friend requests / follows | `context/FriendRequestContext.tsx` |
| **Notifikacije** | Expo notifications + push token | `app/notifications/`, `utils/notifications.ts` |
| **Profil / Settings / Search / Premium** | Implementirano | `app/profile/`, `app/settings/` |
| **Lokacija** | Background location (nearby users) | `hooks/useLocation.tsx` |

---

## 2.5 📊 Procena završenosti — ~40% gotovo / ~60% ostalo

> Ponderisani prosek po oblastima ≈ 45%, oboreno na **~40%** zbog razloga niže.

| Oblast | Težina* | Završeno |
|---|---|---|
| Setup / build / infra (migracije, testovi) | 5% | ~50% |
| Auth & onboarding | 10% | ~55% |
| Postovi / Feed (Home) | 12% | ~65% |
| Kamera / kreiranje posta | 10% | ~60% |
| Chat / poruke | 15% | ~45% |
| Social graf (follow/requests/search) | 10% | ~60% |
| Profile / MyProfile | 8% | ~55% |
| Blahs broadcast | 5% | ~70% |
| **Blah Score / Streak / Recovery** | 8% | ~5% |
| **Premium / Blah+ pogodnosti** | 6% | ~20% |
| Settings & Privacy | 4% | ~25% |
| Notifikacije (push + tipovi + deeplink) | 4% | ~30% |
| **Multi-account** | 3% | ~0% |

\*Težina = procenjeni udeo u ukupnom poslu.

### ⚠️ Zašto je realnije lošije nego što izgleda
1. **"Iluzija od 70%."** ~298 fajlova i app *deluje* skoro gotovo, ali to su uglavnom **CRUD ekrani** (najlakši deo). Ono što BlahBlah čini jedinstvenim (Blah Score, streak, recovery, ephemeral chat, chat hours, tap-to-view, who-viewed, premium gating, multi-account) je **skoro 0%** — a to je najteži i najrizičniji deo.
2. **Po vremenu/trudu je gore od 40/60.** Preostalo sadrži game-mehaniku (skorovanje, tajmeri), ephemeral sistem, plaćanja i pozadinske job-ove (auto-brisanje, streak reset). Realno **~30% urađeno / 70% ostalo** mereno satima.
3. **Deo "urađenog" je zapravo rework.** Auth je email-first (spec traži telefon-first); chat je persistentan (spec traži ephemeral). Nije "dovrši", nego "prepravi".
4. ~~App trenutno ni ne build-uje~~ ✅ **Build/boot rešeni u Fazi 0** (firebase JS SDK uklonjen, verzije poravnate na SDK 51). Ali i dalje: nema migracija baze u repou + nema testova. Temelj još nije čvrst.

### Gruba projekcija po fazama
- **Faza 0–1** (da radi + čist kod): ~1 nedelja
- **Faza 2** (backup baze, migracije): par dana
- **Faza 3** (signature mehanike: Score → streak → recovery → ephemeral → premium): **najveći blok**, više nedelja
- **Faza 4** (polish, multi-account, push, legal): nedelja+

---

## 3. ✅ Blokeri — REŠENI (Faza 0)

> Svi blokeri za build/boot su rešeni. App se diže na uređaju.

- [x] ~~Firebase nije instaliran~~ — firebase JS SDK **uklonjen** kao mrtav kod (T0.2); izabran npm, obrisan `yarn.lock` (T0.1).
- [x] ~~Case-mismatch u `app.json`~~ — popravljeno `GoogleService-Info.plist` (T0.3).
- [x] ~~Firebase config placeholder~~ — otpalo, `utils/firebase.ts` obrisan (T0.2).
- [x] **Verzije paketa odlutale od SDK 51** (otkriveno u T0.5) — native build pucao na gesture-handler; rešeno `expo install --fix` (7 paketa) + `androidx.core` pin u `android/build.gradle`.

---

## 4. 🟠 Problemi sa kodom

- [ ] **17 TypeScript grešaka** (`npx tsc --noEmit` ne prolazi) — *T1.1; broj potvrđen posle SDK-51 poravnanja*:
  - [ ] `app/notifications/index.tsx` — Supabase join vraća niz, kod pristupa kao objektu (8 grešaka)
  - [ ] `app/profile/index.tsx:203` i `app/profile/test/[id].tsx:183` — `currentLocation` implicitno `any`
  - [ ] `components/Acounts.tsx:6` — `Push` nema default export
  - [ ] `app/profile/profile-followers/[id].tsx` i `profile-following/[id].tsx` — pogrešni type cast-ovi
- [ ] **Mrtav / duplikat kod**:
  - [ ] `MessageContext` ima i `handleReaction` i neiskorišćen `handleMessageReaction`
  - [ ] `app/profile/test/[id].tsx` izgleda kao duplikat profila — proveriti i obrisati
  - [ ] folder `app/freind-requests/` ima **tipfeler** u imenu (→ `friend-requests`)
- [ ] **`package.json` ime je još `"test"`** — preimenovati u `blahblah`
- [ ] **README** je default Expo template — zameniti pravim opisom
- [ ] **Curenje logova** — `utils/supabase.ts:8-11` loguje Supabase ključeve u konzolu (ukloniti)

---

## 5. 🟡 Nedostaje / rizici

- [ ] **Šema baze NIJE u repozitorijumu** ⚠️ — nema SQL migracija, `supabase/` je u `.gitignore`. Cela struktura baze + RLS politike postoje samo u Supabase cloud-u. → Uraditi `supabase db pull` i commit-ovati migracije (backup + verzionisanje).
- [ ] **Nema testova** iako je Jest konfigurisan
- [ ] **Push notifikacije nedovršene** — firebase JS SDK uklonjen (T0.2); push (native Firebase) se radi u T4.3, trenutno nije implementiran.
- [ ] **bottom-sheet ↔ reanimated neslaganje** ⚠️ (novo, iz T0.5) — `@gorhom/bottom-sheet@5` traži reanimated ≥3.16, a SDK 51 poravnanje ga je spustilo na 3.10. Testirati sve bottom-sheet-ove (`BottomModal`/`BS`); ako bagују → downgrade bottom-sheet na v4 ili držati reanimated viši.

> ✅ Sigurnost OK: `.env` i `firebase-adminsdk-*.json` **nisu** commit-ovani (pokriveni `.gitignore`-om).

---

## 6. 🎯 Redosled rada (roadmap)

1. **Faza 0 — Da app proradi**
   - Sredi dependencije (jedan package manager, instaliraj `firebase`)
   - Popravi 3 blokera iz sekcije 3
   - Verifikuj: `npx expo start` pokreće app
2. **Faza 1 — Čist kod**
   - Očisti sve TS greške → `npx tsc --noEmit` prolazi
   - Ukloni mrtav/duplikat kod, sredi tipfeler u folderu
3. **Faza 2 — Backup baze**
   - `supabase db pull` → commit migracija + RLS politika
4. **Faza 3 — Polish**
   - README, ime paketa, ukloni log curenje ključeva
5. **Faza 4 — Novi feature-i** → vidi **`FEATURES.md`** (produktni spec sa Figme + status). Najveći gap-ovi (signature mehanike koje NE postoje):
   > ⚙️ **Sve Faza-4 mehanike idu kroz `lib/` sloj (čiste funkcije + `*.test.ts`)** — vidi `ARCHITECTURE.md` §2.5. Tako su testabilne `npm test`-om bez pokretanja app-a.
   1. Blah Score sistem (formula, real-time, formatiranje) — temelj
   2. Streak + Blah Recovery (24/26h prozori, reset, recovery + plaćanje)
   3. Chat Hours tajmer (24h po konverzaciji)
   4. Randomizovane presence poruke po vremenskim zonama
   5. Premium pogodnosti zavisne od skora (Who viewed profile, Score Boost +10%, Ad-free)
   6. Stories 24h expiry + "lock 3 posts" premium gating
   7. Kompletiranje notifikacija (svi tipovi + deep-link)

---

## 7. 📝 Komande za proveru

```bash
# Type check (trenutno NE prolazi — vidi sekciju 4)
npx tsc --noEmit

# Pokretanje
npx expo start

# Lint / format
npm run lint
npm run format
```

---

## 8. 🗒️ Dnevnik / beleške

> Ovde upisuj šta si uradio i kad, da se ne izgubi kontekst.

- **2026-06-23** — Napravljena inicijalna analiza projekta i ovaj status fajl.
- **2026-06-23** — Dodati `ARCHITECTURE.md` (arhitektura + konvencije) i `FEATURES.md` (produktni spec sa Figme + status implementacije po stavki).
- **2026-06-23** — Dodat `SCREENS.md` (screen-by-screen spec sa Figme: Login 1.x, Home 2.x, Blahs 3.x, Camera 4.x). Čeka još ekrana (Profile, Search/Friends, Chat, Settings, Notifications).
- **2026-06-23** — `SCREENS.md` dopunjen **Chat 5.x**. Otkrivene 3 nove mehanike → dodate u `FEATURES.md` G1–G2: ephemeral poruke (24h) + Save chat (30d), "Tap to View" media. Čeka još (Profile, Search/Friends, Settings, Notifications).
- **2026-06-23** — `SCREENS.md` dopunjen **Search/Friends 6.x**. Potvrđen Close-By radius 20–30m (A6) + Follow-vs-Message stanje. Čeka još (Profile 8.x, Settings, Notifications).
- **2026-06-23** — `SCREENS.md` dopunjen **Profile 7.x, MyProfile 8.x, Settings & Privacy** (§7–9). **Spec sa Figme je sada KOMPLETAN.** Nove mehanike u `FEATURES.md`: Recovery €1.99 jednokratno (A4), Settings/Privacy (H), Multi-account/Switch (I), Report (G6). Grid algoritam (143/123px) i privacy toggle-ovi zabeleženi.
- **2026-06-23** — MD fajlovi premešteni u `docs/` folder. Dodata **procena završenosti (§2.5): ~40% gotovo / ~60% ostalo**.
- **2026-06-23** — Usvojeno pravilo: **logika odvojena od UI-ja u `lib/` sloju** (čiste funkcije + Jest testovi). Dokumentovano u `ARCHITECTURE.md` §2.5 + checklist. Cilj: autonomna verifikacija mehanika bez pokretanja app-a.
- **2026-06-23** — Dodat **`TASKS.md`** — task-po-task redosled rada (~51 task kroz 5 faza). Glavni radni tracker odsad.
- **2026-06-23** — ✅ **T0.1 + T0.2 + T0.4 gotovi.** Izabran npm (obrisan yarn.lock). Uklonjen firebase JS SDK (mrtav kod) — `package.json`, `utils/firebase.ts`, `_layout.tsx` import, `utils/index.ts` re-export. `npm install` prošao, firebase nestao iz node_modules, TS greške 18→17. Commitovano (2e8ce61, 4d6d21c) + push na origin/develop.
- **2026-06-23** — ✅ **T0.3 gotov.** Popravljen plist case-mismatch u `app.json`. Ostaje T0.5 (pokretanje app-a) za kraj Faze 0.
- **2026-06-23** — ✅ **T0.5 gotov → FAZA 0 ZAVRŠENA.** App build-ovan i pokrenut na realnom uređaju (Galaxy S24), diže se **bez crash-a** do login ekrana (Phone/Google/Facebook/Twitter). Tok: (1) native build prvo pukao na `react-native-gesture-handler:compileDebugKotlin` (`ViewManagerWithGeneratedInterface`) — uzrok: paketi odlutali od SDK 51. (2) `npx expo install --fix` poravnao 7 paketa (RN 0.75→0.74.5, gesture-handler 2.32→2.16, reanimated 3.16→3.10, skia 1.12→1.2.3, screens, pager-view, image-picker) → rebuild prošao (10min). (3) Telefon nije mogao na Metro preko WiFi → `adb reverse tcp:8081`. (4) App visio na splash-u jer je **Supabase projekat bio pauziran** (DNS `unknown host`) → korisnik reaktivirao, login ekran se učitao. **Watch-itemi za Fazu 1:** `@gorhom/bottom-sheet@5` traži reanimated ≥3.16 a sad je 3.10 (bottom-sheet rizik); potvrđeno curenje ključeva u logu (`utils/supabase.ts` → T1.2); TS greške ponovo proveriti posle promene verzija (T1.1).

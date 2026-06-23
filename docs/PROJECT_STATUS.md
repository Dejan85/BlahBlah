# 📋 BlahBlah — Status projekta

> Poslednje ažuriranje: **2026-06-24**
> Grana: `develop` · Glavna grana: `master`
> Ovaj fajl je "single source of truth" — odakle znamo gde stojimo i šta sledi.

---

## 1. Šta je BlahBlah

Social media mobilna aplikacija (Expo / React Native), hibrid **Snapchat + Instagram**.
Stanje: **Faza 0 završena**, **Faza 1 u toku** (T1.1–T1.8 gotovi; ostaje **T1.9 ⚡ konsolidacija profila**). T1.8 odluka: **2 ekrana** (svoj `profile/index.tsx` + tuđi `profile-details/[id]`, briše se `test/[id]`). App se build-uje i diže na uređaju bez crash-a (vidi §8 dnevnik). ESLint + Prettier postavljeni i prolaze čisto (0 errors); mrtav kod očišćen.

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
| Setup / build / infra (migracije, testovi, lint) | 5% | ~55% |
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
4. ~~App trenutno ni ne build-uje~~ ✅ **Build/boot rešeni u Fazi 0** (firebase JS SDK uklonjen, verzije poravnate na SDK 51). Ali i dalje: nema migracija baze u repou; test infra postoji (T1.6) ali su prave mehanike još netestiranе (tek smoke test). Temelj još nije čvrst.

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

- [x] ~~**17 TypeScript grešaka**~~ ✅ **REŠENO (T1.1)** — `npx tsc --noEmit` prolazi čisto:
  - [x] `app/notifications/index.tsx` — join niz → normalizacija na objekat (8 grešaka)
  - [x] `app/profile/index.tsx` i `app/profile/test/[id].tsx` — `currentLocation: Location.LocationObject | null`
  - [x] ~~`components/Acounts.tsx`~~ — mrtav Supabase starter (nigde se ne importuje), **obrisan**
  - [x] `app/profile/profile-followers/[id].tsx` i `profile-following/[id].tsx` — `as unknown as` cast
- [ ] **Mrtav / duplikat kod**:
  - [x] ~~`MessageContext` ima i `handleReaction` i neiskorišćen `handleMessageReaction`~~ ✅ **REŠENO (T1.3)** — `handleMessageReaction` (nikad eksportovan) uklonjen; pravi je `handleReaction`.
  - [ ] `app/profile/test/[id].tsx` — nedovršen unify prototip (grid zakomentarisan, duplirani blokovi). **ODLUKA T1.8 ✅: 2 ekrana** (svoj `index.tsx` + tuđi `profile-details/[id]`) → ovaj fajl se **briše u T1.9** + rewire 2 call-site-a (`chats/index.tsx:340`, `PostUserInfo.tsx:97`). Detalji/feature-matrica: `TASKS.md` §Odluke.
  - [x] ~~folder `app/freind-requests/` ima **tipfeler** u imenu (→ `friend-requests`)~~ ✅ **REŠENO (T1.4)** — `git mv` na `app/friend-requests/`; rute u `chats/index.tsx` i `Push.tsx` ažurirane.
- [x] ~~**`package.json` ime je još `"test"`**~~ ✅ **REŠENO (T1.5)** — preimenovan u `blahblah`.
- [x] ~~**README** je default Expo template~~ ✅ **REŠENO (T1.5)** — zamenjen pravim opisom (tech stack, env varovi, komande, struktura, konvencije, link na `docs/`).
- [x] ~~**Curenje logova** — `utils/supabase.ts:8-11` loguje Supabase ključeve u konzolu~~ ✅ **REŠENO (T1.2)** — `console.log` linije uklonjene; zamenjene tihim `console.warn` guard-om koji javlja samo da env nedostaje (bez vrednosti).
- [x] ~~**Nema lint/format setup-a; ~145 mrtvih importa/varijabli**~~ ✅ **REŠENO (T1.7)** — ESLint (`eslint-config-expo`) + Prettier (`.prettierrc` jedini izvor, `.prettierignore`) postavljeni i prolaze čisto (0 errors). Popravljena 2 prava errora (rules-of-hooks `useImage` u `FilterMenu`, `__dirname` no-undef u `metro.config.js`). Očišćeno svih ~145 mrtvih importa/varijabli (auto preko `eslint-plugin-unused-imports` + ručno za lokalne). **Ostaje 41 `react-hooks/exhaustive-deps` warninga — namerno ostavljeni** (popravka menja runtime ponašanje; zaseban opciono task).

---

## 5. 🟡 Nedostaje / rizici

- [ ] **Šema baze NIJE u repozitorijumu** ⚠️ — nema SQL migracija, `supabase/` je u `.gitignore`. Cela struktura baze + RLS politike postoje samo u Supabase cloud-u. → Uraditi `supabase db pull` i commit-ovati migracije (backup + verzionisanje).
- [x] ~~**Nema testova** iako je Jest konfigurisan~~ ✅ **REŠENO (T1.6)** — test infra potvrđena (smoke test prolazi, `@/*` alias mapiran). Pravi `lib/` testovi mehanika dolaze u Fazi 3 (T3.1+).
- [ ] **Push notifikacije nedovršene** — firebase JS SDK uklonjen (T0.2); push (native Firebase) se radi u T4.3, trenutno nije implementiran.
- [ ] **bottom-sheet ↔ reanimated neslaganje** ⚠️ (iz T0.5) — `@gorhom/bottom-sheet@5` traži reanimated ≥3.16, a SDK 51 poravnanje ga je spustilo na 3.10. Testirati sve bottom-sheet-ove (`BottomModal`/`BS`); ako bagují → downgrade bottom-sheet na v4 ili držati reanimated viši. **Nuspr. posledica (T1.7):** ovaj peer konflikt sada lomi svaki `npm install` (npr. `expo lint` auto-instalacija ESLint-a je pukla na ERESOLVE) → instalacije moraju ići sa `--legacy-peer-deps` dok se konflikt ne reši.

> ✅ Sigurnost OK: `.env` i `firebase-adminsdk-*.json` **nisu** commit-ovani (pokriveni `.gitignore`-om).

---

## 6. 🎯 Redosled rada (roadmap)

> ⚠️ **Jedini izvor redosleda rada je [`TASKS.md`](TASKS.md)** (task-po-task, ~54 task kroz 5 faza). Ovde se NE duplira lista da se ne bi raspadala — vidi TASKS.md za aktuelno stanje i sledeći task.

Faze ukratko (detalji u TASKS.md):
- **Faza 0** — da app proradi (✅ ZAVRŠENA)
- **Faza 1** — čist kod / temelj (TS, mrtav kod, lint, README, ime paketa)
- **Faza 2** — backup baze (migracije + RLS + TS tipovi)
- **Faza 3** — signature mehanike (Blah Score → streak → recovery → ephemeral → premium) — najveći blok, sve kroz `lib/` + testovi (`ARCHITECTURE.md` §2.5)
- **Faza 4** — polish (auth, push, settings, legal, multi-account)

### 🔑 Signature mehanike — najveći gap (kontekst, ne redosled)
> Ovo su **prepoznatljive mehanike proizvoda koje još NE postoje** i čine najveći deo preostalog posla. Produktni spec sa Figme: **[`FEATURES.md`](FEATURES.md)**. Sve idu kroz **`lib/` sloj** (čiste funkcije + `*.test.ts`, `ARCHITECTURE.md` §2.5) → testabilne `npm test`-om bez pokretanja app-a.
1. **Blah Score** (formula, real-time, formatiranje) — temelj, od njega zavise streak/recovery/boost
2. **Streak + Blah Recovery** (24/26h prozori, reset, recovery + plaćanje €1.99)
3. **Chat Hours** tajmer (24h po konverzaciji)
4. **Ephemeral chat** (24h default / 30d "Save chat") + auto-brisanje job
5. **Randomizovane presence poruke** po vremenskim zonama
6. **Premium / Blah+** pogodnosti (Who viewed profile, Score Boost +10%, Ad-free, stories 24h)
7. **Multi-account / Switch** + kompletiranje notifikacija (svi tipovi + deep-link)

---

## 7. 📝 Komande za proveru

```bash
# Type check (✅ prolazi čisto od T1.1)
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
- **2026-06-23** — ✅ **T1.1 gotov.** Svih 17 TS grešaka rešeno, `tsc --noEmit` prolazi čisto. (1) Supabase to-one join je tipovan kao niz a vraća objekat: u `notifications/index.tsx` normalizacija (`Array.isArray ? [0] : x`), u followers/following `as unknown as` cast. (2) `currentLocation` tipovan `Location.LocationObject | null` (profile/index + profile/test). (3) `components/Acounts.tsx` — mrtav Supabase starter (`<Push />` ne postoji, nigde se ne importuje) **obrisan**. **Watch-item:** pravi tip-fix za join-ove dolazi u T2.2 (`supabase gen types`) — sad su pragmatični cast-ovi. Fix u `profile/test/[id].tsx` je privremen. *(Ispravka iz T1.3: fajl se NE briše — nije mrtav; konsolidacija profila prebačena u T1.8/T1.9.)*
- **2026-06-23** — ✅ **T0.5 gotov → FAZA 0 ZAVRŠENA.** App build-ovan i pokrenut na realnom uređaju (Galaxy S24), diže se **bez crash-a** do login ekrana (Phone/Google/Facebook/Twitter). Tok: (1) native build prvo pukao na `react-native-gesture-handler:compileDebugKotlin` (`ViewManagerWithGeneratedInterface`) — uzrok: paketi odlutali od SDK 51. (2) `npx expo install --fix` poravnao 7 paketa (RN 0.75→0.74.5, gesture-handler 2.32→2.16, reanimated 3.16→3.10, skia 1.12→1.2.3, screens, pager-view, image-picker) → rebuild prošao (10min). (3) Telefon nije mogao na Metro preko WiFi → `adb reverse tcp:8081`. (4) App visio na splash-u jer je **Supabase projekat bio pauziran** (DNS `unknown host`) → korisnik reaktivirao, login ekran se učitao. **Watch-itemi za Fazu 1:** `@gorhom/bottom-sheet@5` traži reanimated ≥3.16 a sad je 3.10 (bottom-sheet rizik); potvrđeno curenje ključeva u logu (`utils/supabase.ts` → T1.2); TS greške ponovo proveriti posle promene verzija (T1.1).
- **2026-06-23** — ✅ **T1.2 gotov.** Uklonjeno curenje logova u `utils/supabase.ts` — `console.log` koji su ispisivali Supabase URL + anon key (prvih 50 char + dužina) skinuti. Zamenjeni tihim `console.warn` guard-om koji javlja samo kad env varijable nedostaju, bez ispisivanja vrednosti. Provereno: ključevi se nigde drugde ne loguju. `tsc --noEmit` prolazi.
- **2026-06-24** — ✅ **T1.3 gotov (uz preciziranje).** Uklonjen mrtav `handleMessageReaction` iz `context/MessageContext.tsx` (definisan ali nikad eksportovan; pravi reaction handler je `handleReaction`, koristi ga `chat-room/[id].tsx`). `tsc --noEmit` prolazi. **Otkriće:** `profile/test/[id].tsx` NIJE mrtav kod kako je task pretpostavljao — aktivno se koristi (`chats/index.tsx:340` za svoj profil, `PostUserInfo.tsx:99` za tuđi) i NIJE prost duplikat. Komentar `// app/test/[id].tsx` na vrhu odaje da je fajl prevučen iz scratch `test/` rute → to je **nedovršen prototip ujedinjenog profil ekrana**. Stvarno stanje: TRI razišla profil ekrana (`index.tsx` 731 l samo-svoj / `test/[id].tsx` 1006 l svoj+tuđi+block/mute/report / `profile-details/[id].tsx` 657 l samo-tuđi; `index` vs `test` diff = 654 ins / 379 del — fork, ne kopija). Konsolidacija je feature-adjacent posao (profil je mesto gde sleću Blah Score/Who viewed/premium gating) → izdvojena u **T1.8** (odluka + feature-matrica, kanonski ekran) i **T1.9** (⚡ spajanje u jedan + rewire navigacije + brisanje preostala dva). T1.9 odblokira T3.4/T3.20/T3.21. **Watch-item:** ne dodavati nove profil feature-e dok T1.9 nije gotov (inače se rade na 3 mesta).
- **2026-06-24** — ✅ **T1.4 gotov.** Preimenovan folder `app/freind-requests/` → `app/friend-requests/` (typo) preko `git mv` (čuva istoriju). Ažurirane dve `router.push` rute: `chats/index.tsx:386`, `Push.tsx:95`. Docs sinhronizovani (ARCHITECTURE §folderi, SCREENS §6 friend-requests, PROJECT_STATUS §4). `tsc --noEmit` prolazi. **Usput:** expo-ov file-watcher je usred rename-a regenerisao gitignored `.expo/types/router.d.ts` u prelazno stanje (sadržao i stari i novi naziv, sa zalutalim `\` koji escape-uje backtick → "unterminated template literal"); fajl ručno ispravljen, expo ga ionako regeneriše na sledeći `expo start`.
- **2026-06-24** — ✅ **T1.6 gotov.** Jest test infra potvrđena. (1) `@/*` alias mapiran u jest config (`moduleNameMapper: "^@/(.*)$" → "<rootDir>/$1"`) — `jest-expo` ne čita tsconfig paths sam, a CLAUDE.md zahteva `@/` importe → bez ovoga bi svaki budući `lib/` test pukao. (2) `test` skripta promenjena sa `jest --watchAll` (visi u CI/jednokratno) na `jest`; dodat `test:watch`. (3) Smoke test `lib/smoke.test.ts` prolazi 2/2 — potvrđuje TS transpile + Jest run + `@/` alias (importuje `package.json` i proverava `name === "blahblah"`, bez throwaway koda). **Watch-item:** `npx tsc` je pukao na gitignored `.expo/types/router.d.ts` (isti T1.4 transient — zalutali `\` u `/friend-requests\` → unterminated template literal); fajl obrisan (expo ga regeneriše na `expo start`), tsc onda čist. Prvi pravi `lib/` test je T3.1 (`formatCount`).
- **2026-06-24** — 📌 **Odluka o E2E alatu.** E2E (pokretanje prave app + driving UI-ja kao Cypress za web) = **Maestro**, dodat kao **T4.13** (Faza 4). Izabran umesto Detox-a (teži setup, native-vezan) i Cypress/Playwright-a (rade samo na `react-native-web` build-u, ne testiraju pravu native app). **Namerno odложено za Fazu 4:** E2E flow-ovi su krhki dok se ekrani menjaju (npr. profil se konsoliduje u T1.8/T1.9) → ima smisla tek na stabilizovanim flow-ovima. Slojevi testiranja: `lib/` Jest (mehanike, Faza 3) → opciono RNTL (component ponašanje) → Maestro E2E (kritični flow-ovi, Faza 4).
- **2026-06-24** — ✅ **T1.8 gotov (odluka, bez koda).** Ciljna struktura profila: **2 ekrana** po Figma spec-u (7.x tuđi / 8.x svoj), **NE** jedan unify ekran. Pregledana sva 3 fajla + feature-matrica (vidi `TASKS.md` §Odluke): **svoj = `profile/index.tsx`** (grid radi, edit, realtime), **tuđi = `profile/profile-details/[id].tsx`** (grid radi, follow/block/message, private-lock, dedicated followers/following nav); **briše se `profile/test/[id].tsx`** (nedovršen unify: grid zakomentarisan l.638/648, duplirani render blokovi). Ključni argument: app **već de facto radi kao 2 ekrana** — skoro sve rute gađaju `profile-details/[id]`, samo 2 call-site-a (`chats/index.tsx:340`, `PostUserInfo.tsx:97`) idu na `test/[id]`. Unify bi značio usvojiti pokvaren fajl + popraviti mrtav grid → veći rizik/posao za nulti benefit. **Izvođenje = T1.9 (⚡ High effort).**
- **2026-06-24** — ✅ **T1.7 gotov.** ESLint + Prettier postavljeni i prolaze čisto. (1) **Setup:** `eslint-config-expo` + `.eslintrc.js` (override `env:node` za `*.config.js`/`scripts`), `eslint-plugin-unused-imports` za pouzdano auto-uklanjanje mrtvih importa, `.prettierrc` ostao jedini izvor (uklonjen duplikat `prettier` ključ iz `package.json` koji se kosio s njim), nov `.prettierignore` (preskače `docs/`, `ios/`, `android/`, generisane JSON, sve `*.md` — da ručno kuriranе SSoT tabele ne reflow-uju). (2) **2 prava errora popravljena:** rules-of-hooks — `useImage(uri)` u `components/Camera/FilterMenu.tsx` zvan posle ranog `return` (hook pomeren pre svih return-a); `__dirname` no-undef u `metro.config.js` (Node env override). (3) **~145 mrtvih importa/varijabli očišćeno:** 77 importa auto (unused-imports `--fix`), 68 lokalnih ručno uz proveru konteksta (state setteri → `const [, setX]`, destrukturirani `data`/`error` → izbačeni, neiskorišćeni propovi/handleri uklonjeni), + 5 `react/display-name` (memo/forwardRef komponente dobile `displayName`). (4) **Prettier:** `--write` formatirao ~100 source fajlova (singleQuote, es5 trailing comma) → `--check` čist. **Rezultat:** `tsc` čist, `expo lint` 0 errors, testovi 2/2. **Ostaje 41 `react-hooks/exhaustive-deps` warninga — SVESNO ostavljeni** (popravka menja runtime ponašanje, npr. refetch/loop; rizik > korist za ovaj task). **Watch-item:** vidi §5 — `npm install` zahteva `--legacy-peer-deps` zbog bottom-sheet↔reanimated konflikta (ERESOLVE je oborio `expo lint` auto-instalaciju ESLint-a).
- **2026-06-24** — ✅ **T1.5 gotov.** `package.json` name `"test"` → `"blahblah"`. README zamenjen sa default Expo starter-a pravim opisom: tech stack (Expo 51 / Supabase / TanStack Query / RevenueCat), preduslovi + env varovi (`EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`, potvrđeno iz `utils/supabase.ts`), komande (start/android/ios/tsc/test/lint/format), folder struktura, kratke konvencije (`lib/`, Custom komponente, `@/*` alias) i tabela linkova na `docs/`. `tsc --noEmit` prolazi.

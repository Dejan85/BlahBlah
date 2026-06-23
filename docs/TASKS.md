# ✅ BlahBlah — Task lista (redosled rada)

> Radni tracker — radimo **task po task, ovim redom**. Čekiraj `[x]` kad je gotovo.
> Pravila: svaka mehanika ide kroz `lib/` + test (`ARCHITECTURE.md` §2.5). Posle svakog taska: `tsc` prolazi.
> Reference: `FEATURES.md` (mehanike), `SCREENS.md` (ekrani), `PROJECT_STATUS.md` (status).

**Ukupno: ~54 task** · Faza 0: 5 · Faza 1: 9 · Faza 2: 3 · Faza 3: 24 · Faza 4: 13

**Legenda:** 🔧 tehnički (ja sam) · 🧠 traži tvoju odluku · 🧪 ima `lib/` test · ☁️ backend/DB job · ⚡ **preporučen High effort** (zamršena logika/ivični slučajevi — bumpni effort pre ovog taska)

> ⚡ Kad dođemo do taska sa ⚡, podsetiću te da digneš effort na High; marker je ovde da se NE oslanjamo na pamćenje.

---

## FAZA 0 — Da app proradi (🔧, bez odluka) — *cilj: `expo start` se diže* — ✅ ZAVRŠENA
- [x] **T0.1** ✅ Izabran **npm** (obrisan `yarn.lock`, zadržan `package-lock.json`, `npm install` prošao)
- [x] **T0.2** ✅ **Uklonjen `firebase` JS SDK** (mrtav kod): skinut iz `package.json`, obrisan `utils/firebase.ts`, uklonjen import iz `_layout.tsx` + re-export iz `utils/index.ts`. firebase nestao iz node_modules, TS greške 18→17.
- [x] **T0.3** ✅ Popravljen case-mismatch u `app.json` (`GoogleService-info.plist` → `GoogleService-Info.plist`); poklapa se sa fajlom na disku
- [x] **T0.4** ✅ ~~Popraviti firebase `appId`~~ — **otpalo** (uklonjeno u T0.2)
- [x] **T0.5** ✅ App pokrenut na realnom uređaju (Galaxy S24) — diže se bez crash-a do login ekrana. Usput: `expo install --fix` poravnao 7 paketa na SDK-51 verzije (rešilo native gesture-handler crash); Supabase bila pauzirana → reaktivirana.

## FAZA 1 — Čist kod / temelj (🔧)
- [x] **T1.1** ✅ Popravljeno svih 17 TS grešaka → `tsc --noEmit` prolazi čisto. Join greške (notifications/followers/following): supabase to-one relacija tipovana kao niz → normalizacija na objekat / `as unknown` cast. `currentLocation` tipovan `Location.LocationObject | null`. `components/Acounts.tsx` (mrtav Supabase starter, nigde se ne importuje) obrisan.
- [x] **T1.2** ✅ Uklonjeni `console.log` koji su ispisivali Supabase URL + anon key (prvih 50 char + dužina) u `utils/supabase.ts`. Zamenjeno tihim `console.warn` guard-om koji javlja samo da env nedostaje (bez vrednosti). Provereno: nigde drugde se ključevi ne loguju.
- [x] **T1.3** ✅ Uklonjen mrtav `handleMessageReaction` iz `MessageContext` (nikad eksportovan; pravi je `handleReaction`). `tsc` čist. ⚠️ `profile/test/[id].tsx` **NIJE** mrtav kod — koristi se (chats/index.tsx, PostUserInfo.tsx) i nije duplikat: to je nedovršen prototip ujedinjenog profila → izdvojeno u **T1.8 + T1.9**.
- [x] **T1.4** ✅ Preimenovan folder `freind-requests` → `friend-requests` (`git mv`, čuva istoriju) + ažurirane rute (`chats/index.tsx`, `Push.tsx`). `tsc` čist.
- [x] **T1.5** ✅ `package.json` name `test` → `blahblah`. README zamenjen sa default Expo starter-a → pravi (tech stack, env varovi `EXPO_PUBLIC_SUPABASE_*`, komande, struktura, konvencije, link na `docs/`). `tsc` čist.
- [x] **T1.6** ✅ Jest infra potvrđena: `@/*` alias mapiran u jest config (`moduleNameMapper`), `test` skripta → jednokratni `jest` (+ `test:watch`), smoke test `lib/smoke.test.ts` (TS+Jest+alias) prolazi 2/2. `tsc` čist.
- [x] **T1.7** ✅ ESLint (`eslint-config-expo`) + Prettier postavljeni, prolaze čisto (0 errors). Popravljena 2 prava errora (rules-of-hooks `useImage`/FilterMenu, `__dirname`/metro.config). Očišćeno ~145 mrtvih importa/varijabli (`eslint-plugin-unused-imports` + ručno) + 5 display-name. `.prettierignore` preskače `docs/`/native/`*.md`. **Ostaje 41 `exhaustive-deps` warning — namerno** (popravka menja ponašanje). `tsc` čist, test 2/2.
- [x] **T1.8** ✅ **ODLUKA: 2 ekrana po spec-u** (Figma 7.x tuđi vs 8.x svoj). Base fajlovi: **svoj = `profile/index.tsx`** (grid radi, edit, realtime), **tuđi = `profile/profile-details/[id].tsx`** (grid radi, follow/block/message, private-lock, navigacija na dedicated followers/following liste). **Briše se `profile/test/[id].tsx`** (nedovršen unify prototip: grid zakomentarisan l.638/648, duplirani render blokovi). Ključ: app već de facto radi kao 2 ekrana — skoro sve rute idu na `profile-details/[id]`, samo 2 call-site-a gađaju `test/[id]`. Feature-matrica i obrazloženje: vidi §"Odluke" niže. *Odblokira T1.9.*
- [ ] **T1.9** ⚡ **Konsolidacija profila — 2 ekrana** (odluka T1.8). Obriši `profile/test/[id].tsx`; prebaci njegova 2 call-site-a na `profile-details/[id]`: `chats/index.tsx:340`, `PostUserInfo.tsx:97`. Očisti zakomentarisane `test/[id]` reference (`PostUserInfo.tsx:66`, `GridPost.tsx:389`). Verifikuj da `index.tsx` (svoj) i `profile-details/[id]` (tuđi) pokrivaju spec 7.x/8.x; po potrebi izvuci deljeni avatar/stats/website blok u komponentu. *Cross-cutting — odblokira T3.4 (Blah score prikaz 8.9), T3.20 (premium gating 8.6/8.7), T3.21 (Who viewed 8.3).*

## FAZA 2 — Backup baze (🔧 ☁️)
- [ ] **T2.1** `supabase db pull` → migracije u repo (verzionisanje šeme)
- [ ] **T2.2** Generisati TS tipove iz šeme (`supabase gen types`) → rešava i deo TS cast-ova
- [ ] **T2.3** Izvući + commit-ovati RLS politike, dokumentovati buckete

## FAZA 3 — Signature mehanike (🧪 `lib/` + testovi) — *najveći blok*
> Redosled: Blah Score je temelj (od njega zavise streak, recovery, score boost).

**Blah Score**
- [ ] **T3.1** 🧪 `lib/formatCount.ts` ("10k"/"10.1k" + zaokruživanje) + test
- [ ] **T3.2** 🧪 `lib/blahScore.ts` (formula `(Blahs×4)+(Followers×0.8)+Streak Bonus`) + test (primer: 8. dan = 68)
- [ ] **T3.3** ☁️ DB: `blah_score` kolone/tabela + migracija
- [ ] **T3.4** Integracija u UI (prikaz skora, crveni Blahs stat — MyProfile 8.9) — *zavisi od T1.9 (jedan profil ekran), inače se prikaz mora dodati na 3 mesta*

**Streak + Recovery**
- [ ] **T3.5** ⚡ 🧪 `lib/streak.ts` (obračun streak-a, reset pravila, dani 8/20/28/48) + test — *ivični slučajevi na granicama dana/timezone*
- [ ] **T3.6** ⚡ ☁️ Streak DB + background reset job (Supabase cron/edge function) — *timezone + concurrency*
- [ ] **T3.7** ⚡ 🧪 `lib/blahRecovery.ts` (26h/13h prozor, cena €1.99) + test — *vremenski prozori*
- [ ] **T3.8** Recovery popup (MyProfile 8.8) + plaćanje (RevenueCat €1.99 one-time)
- [ ] **T3.9** "Blah Streak Lost" notifikacija (D6)

**Chat Hours**
- [ ] **T3.10** ⚡ 🧪 `lib/chatHours.ts` (24h tajmer obračun, reset po poruci) + test — *tajmer logika*
- [ ] **T3.11** Chat Hours prikaz u listi chatova (sati "h" — Chat 5.0)

**Ephemeral chat**
- [ ] **T3.12** ⚡ 🧪 `lib/ephemeral.ts` (24h default / 30d "Save chat" pravila) + test — *retencija pravila + ivični slučajevi*
- [ ] **T3.13** ⚡ ☁️ Ephemeral DB + auto-brisanje poruka job — *concurrency, da se ne obrišu sačuvani*
- [ ] **T3.14** "Save chat" 30d toggle + "Deleted message..." placeholder
- [ ] **T3.15** Tap-to-View media (view-once → "Opened" stanje — Chat 5.4)

**Presence + Close-By**
- [ ] **T3.16** 🧪 `lib/presenceMessages.ts` (randomizovane poruke po zonama + zaokruživanje vremena) + test
- [ ] **T3.17** Presence randomizovane poruke u UI (zamena "gone exploring")
- [ ] **T3.18** 🧪 `lib/closeBy.ts` (radius 20–30m geo obračun) + test
- [ ] **T3.19** ☁️ Close-By discovery UI + Supabase geo upit (labela "Close By")

**Premium / Blah+**
- [ ] **T3.20** ⚡ Premium gating sistem (provera Blah+ statusa) + paywall integracija (4.6/8.6/8.7) — *cross-cutting, dodiruje ceo app; profil deo zavisi od T1.9*
- [ ] **T3.21** ☁️ Who viewed profile (tracking poseta + lista 8 dana) — MyProfile 8.3 — *zavisi od T1.9*
- [ ] **T3.22** Score Boost +10% za premium korisnike
- [ ] **T3.23** Stories 24h expiry + "Lock 3 posts forever" gating
- [ ] **T3.24** Ad-free (reklamni sistem placeholder + gating)

## FAZA 4 — Polish / preostalo
- [ ] **T4.1** 🧠 Auth uskladiti sa spec-om (ODLUKA: telefon-first + Twitter/Instagram/Apple)
- [ ] **T4.2** Notifikacije: svi tipovi (D1–D5) + deep-link na ekran
- [ ] **T4.3** ☁️ Push (Firebase) kompletiranje
- [ ] **T4.4** Settings & Privacy toggle-ovi (private, who-can-message, last seen, location, mutes)
- [ ] **T4.5** Legal stranice render (Terms, Privacy, Community Guidelines, Contact)
- [ ] **T4.6** ⚡ Multi-account / Switch account (+ per-nalog badge) — *upravljanje više sesija, lako se zezne*
- [ ] **T4.7** Report account flow (kategorije + obrada — Profile 7.5)
- [ ] **T4.8** Komentari: sortiranje po lajkovima + reply threadovi + lajk komentara (Home 2.4)
- [ ] **T4.9** Share na eksterne app-ove (WhatsApp/IG/Messenger/Snapchat — Home 2.1)
- [ ] **T4.10** 🧪 Grid layout algoritam (neparni 143px / parni 123px — MyProfile 8.0) + test
- [ ] **T4.11** Boje u temu (`constants/Colors`) — cleanup hardkodovanih hex
- [ ] **T4.12** Razbiti velike fajlove (`chat-room/[id].tsx` 1252 linije, `MessageContext` 650)
- [ ] **T4.13** ☁️ **E2E sa Maestro** — smoke-test kritičnih flow-ova na emulatoru/uređaju (login → home, pošalji blah, recovery popup). *Namerno u Fazi 4:* flow-ovi su krhki dok se ekrani menjaju (profil se konsoliduje u T1.8/T1.9), pa E2E ima smisla tek na **stabilizovanim** flow-ovima. Maestro (YAML flow-ovi, lak setup, EAS Build CI integracija) izabran umesto Detox-a (teži setup) / Cypress-a (samo web build, ne pravi native). Pure logika ostaje pokrivena `lib/` Jest testovima (Faza 3); RNTL opciono za component ponašanje.

---

## 🧠 Odluke koje blokiraju određene taskove
- **T1.8 (profil struktura)** — ✅ **REŠENO: 2 ekrana** po Figma spec-u (7.x tuđi / 8.x svoj), ne jedan unify ekran. Base: `profile/index.tsx` (svoj) + `profile/profile-details/[id].tsx` (tuđi); briše se `profile/test/[id].tsx`. Feature-matrica (✅=ima, ❌=nema/pokvareno):

  | Feature | `index.tsx` svoj | `test/[id]` unify | `profile-details/[id]` tuđi |
  |---|---|---|---|
  | Grid postova | ✅ | ❌ zakomentarisan | ✅ |
  | Edit profil | ✅ | ✅ | — |
  | Follow/Message | — | ✅ | ✅ |
  | Block/Mute/Report | — | ✅ | ✅ |
  | Private lock (7.0) | — | — | ✅ |
  | 3-tačke→Settings (8.0) | ❌ logout modal | ✅ | — |
  | Realtime subscribe | ✅ | — | — |
  | Stanje koda | čist, radi | prototip, grid mrtav | čist, radi |

  **Zašto 2 a ne 1:** spec ih eksplicitno deli; razlike su suštinske (svoj: Settings/Eye/Recovery vs tuđi: Follow/Block/private-lock) → unify = komponenta prošarana `isOwnProfile ?` (baš `test/[id]`, haotičan i pokvaren). Najmanji rizik: oba base fajla rade, briše se samo 1 fajl + 2 rewire.
- **T4.1 (auth)** — čeka odluku telefon-vs-email. *Ne blokira Fazu 0–3.*
- **Vidljivost followers liste** za privatne naloge (Figma beleška) — utiče na Profile 7.3/7.4.

## 📝 Napomena o proceni
~54 task je **grubа** procena; neki Faza-3 taskovi (npr. ephemeral, premium gating) mogu da se razbiju na više pod-taskova kad uđemo u njih. Faza 3 je 50%+ ukupnog posla.

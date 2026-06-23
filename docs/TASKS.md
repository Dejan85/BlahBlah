# ✅ BlahBlah — Task lista (redosled rada)

> Radni tracker — radimo **task po task, ovim redom**. Čekiraj `[x]` kad je gotovo.
> Pravila: svaka mehanika ide kroz `lib/` + test (`ARCHITECTURE.md` §2.5). Posle svakog taska: `tsc` prolazi.
> Reference: `FEATURES.md` (mehanike), `SCREENS.md` (ekrani), `PROJECT_STATUS.md` (status).

**Ukupno: ~51 task** · Faza 0: 5 · Faza 1: 7 · Faza 2: 3 · Faza 3: 24 · Faza 4: 12

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
- [ ] **T1.1** Popraviti svih 17 TS grešaka → `tsc --noEmit` prolazi
- [ ] **T1.2** Ukloniti curenje logova (Supabase ključevi u `utils/supabase.ts`)
- [ ] **T1.3** Očistiti mrtav/duplikat kod (`handleMessageReaction`, `profile/test/[id].tsx`)
- [ ] **T1.4** Preimenovati folder `freind-requests` → `friend-requests` (+ rute)
- [ ] **T1.5** `package.json` name `test` → `blahblah`, napisati pravi README
- [ ] **T1.6** Jest setup + prvi smoke test (potvrda da test infra radi)
- [ ] **T1.7** ESLint + prettier prolaze čisto

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
- [ ] **T3.4** Integracija u UI (prikaz skora, crveni Blahs stat — MyProfile 8.9)

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
- [ ] **T3.20** ⚡ Premium gating sistem (provera Blah+ statusa) + paywall integracija (4.6/8.6/8.7) — *cross-cutting, dodiruje ceo app*
- [ ] **T3.21** ☁️ Who viewed profile (tracking poseta + lista 8 dana) — MyProfile 8.3
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

---

## 🧠 Odluke koje blokiraju određene taskove
- **T4.1 (auth)** — čeka odluku telefon-vs-email. *Ne blokira Fazu 0–3.*
- **Vidljivost followers liste** za privatne naloge (Figma beleška) — utiče na Profile 7.3/7.4.

## 📝 Napomena o proceni
~51 task je **grubа** procena; neki Faza-3 taskovi (npr. ephemeral, premium gating) mogu da se razbiju na više pod-taskova kad uđemo u njih. Faza 3 je 50%+ ukupnog posla.

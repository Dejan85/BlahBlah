# 🎯 BlahBlah — Produktna specifikacija & status implementacije

> Izvor: Figma spec (subscription, Blah Score, Blah Recovery, presence, chat hours, close-by...).
> Ovaj fajl = "šta proizvod TREBA da radi" + "šta je od toga ZAISTA u kodu".
> Status proveren čitanjem koda **2026-06-23**. Pratiti uz `PROJECT_STATUS.md` i `ARCHITECTURE.md`.

**Legenda statusa:**
`✅ Gotovo` · `🟡 Delimično` · `❌ Nije implementirano` · `❓ Nepotvrđeno`

---

## A. Core mehanike

### A1. Blahs (Spontaneous Messaging) — ✅ Gotovo
Spec: korisnik šalje **jednu poruku svim pratiocima**; svaki primalac misli da je lična DM poruka; nema vizuelne razlike od običnog DM-a.
- ✅ Broadcast svim follower-ima (`app/blahs/new.tsx`, tabela `blahs`)
- ✅ Izuzimanje pratilaca obeleženih kao **"No Blahs"**
- ✅ Pravi individualne `conversations` + `messages` po primaocu (izgleda kao lična poruka)
- ✅ `recipient_count` se beleži

### A2. Blah Score — 🟡 Delimično (logika + DB + prikaz gotovi; streak/real-time ostaje)
Spec formula: **Blah Score = (Blahs Sent × 4) + (Followers × 0.8) + Streak Bonus**
- ✅ Formula u `lib/blahScore.ts` — `calculateBlahScore(blahsSent, followers, streakDay)` + test (T3.2). Primer: 8. dan, 10 blahs, 10 followers = 68 (40+8+20).
- ✅ DB storage (T3.3): `profiles.blah_score` + `profiles.blahs_sent` (`integer NOT NULL DEFAULT 0`, migracija `20260624162117_blah_score_columns.sql`). Skor se samo SKLADIŠTI; app ga računa+upisuje (T3.4).
- ✅ UI prikaz (T3.4): svoj profil (`app/profile/index.tsx`) obračunava skor preko `lib/blahScore`, upisuje u `blah_score` (samo kad se promeni) i prikazuje `formatCount(skor)`; **crveni Blahs stat = aktivan Blah Score (MyProfile 8.9)** kad je skor > 0.
- ✅ Streak Bonus (Blahs × 2 na danima 8 / 20 / 28 / 48) — bonus dani su single source u `lib/streak.ts` (`STREAK_BONUS_DAYS`/`isStreakBonusDay`, T3.5), `lib/blahScore.ts` ih uvozi. ✅ **Aktivan u UI (T3.6):** profil čita pravi dan preko `currentStreakDay(state, now, tz)` iz streak DB.
- 🟡 Real-time update skora posle slanja Blah-a — ✅ slanje Blah-a sad inkrementira `blahs_sent` + upisuje streak (T3.6) → skor raste; ⏳ prikaz se osvežava tek na sledeći fetch profila, ne live u istoj sesiji.
- ✅ Zaokruživanje na ceo broj (256.8 → 257) — `Math.round` u `lib/blahScore.ts`
- ✅ Formatiranje velikih brojeva (10.000 → "10k", "10.1k"...) — `lib/formatCount.ts` + test (T3.1); uvezano u UI (T3.4: profil + `PostActions.tsx`, inline `formatNumber` zamenjen).
- ✅ "Prvi Blah u 24h se računa" logika — `registerBlah` (lib/streak.ts): isti kalendarski dan = bez promene (samo prvi Blah dana broji), uzastopni dan = +1.

### A3. Daily Activity & Streaks — 🟡 Delimično (logika + DB + reset + recovery popup/plaćanje gotovi; streak UI badge ostaje)
- ✅ Streak obračun (`lib/streak.ts`, T3.5): `registerBlah` (kalendarski dan, timezone-aware) — uzastopni dan +1, isti dan bez promene, preskočen dan reset; `getStreakStatus` (`none/active/at-risk/lost`), `currentStreakDay` (0 kad pao), `isStreakLost` (T3.6) + test.
- ✅ Bunny rolling deadline (Home 2.0): `isBunnyActive`/`msUntilDeadline` — ≤3h pre 24h od poslednjeg Blah-a.
- ✅ Reset pravilo (protekne ceo dan bez Blah-a → streak pada / skor bez bonusa) — u `lib/streak.ts`.
- ✅ **Streak DB kolone + background reset job (T3.6):** `profiles.streak_day`/`last_blah_at`/`streak_tz_offset` (migracija live); **pg_cron sweep `reset_lapsed_streaks()` (hourly, atomski, tz-aware)** nulira pale streak-ove serverski + on-read lazy reset backup. SQL sweep = veran port granice iz `lib/streak.ts`, zakovan pinning testom (anti-drift).
- ✅ **Uvezivanje pravog `streakDay` u Blah Score na profilu (T3.6)** — `app/profile/index.tsx` koristi `currentStreakDay(state, now, tz)`; slanje Blah-a (`app/blahs/new.tsx`) upisuje streak preko `registerBlah` + inkrementira `blahs_sent`.
- ❌ Streak UI badge/brojač na profilu (vizuelni prikaz tekućeg dana) — DB sad ima podatak; sam prikaz dolazi sa profil polish-om.
- ✅ Blah+ recovery (reset izuzetak) — vremenski prozori (`lib/blahRecovery.ts`, T3.7) + popup/plaćanje (T3.8). Vidi A4.

### A4. Blah Recovery — 🟡 Delimično (logika + popup + plaćanje + notif gotovi; pravi RevenueCat + urgency animacija ostaju)
Spec: 26h prozor; kad istekne → notifikacija "Blah Streak Lost"; ekran za recovery sa plaćanjem; live countdown; nakon plaćanja kreće nov 26h ciklus.
- ✅ **26h/13h vremenski prozori (`lib/blahRecovery.ts`, T3.7):** rolling model (anchor = poslednji Blah, odvojen od kalendarskog `streak.ts`): `safe` (0–26h) → `recoverable` (26h–39h, ponuda 13h) → `expired`. `getRecoveryStatus`, `msUntilStreakLost` (26h countdown), `msUntilOfferExpires` ("In 13h offer expire" countdown), `isRecoveryUrgent` (3h pre pada), konstante (€1.99) + test.
- ✅ **Recovery popup + plaćanje (`MyProfile 8.8`, T3.8):** profil auto-otvara popup kad je `recoverable` (live 13h countdown preko `formatRecoveryCountdown`); na Continue → `purchaseRecovery()` → `applyRecovery` (streak vraćen + nov 26h ciklus) → upis `streak_day`/`last_blah_at`. **Plaćanje = stubbed RevenueCat boundary** (`services/recoveryPurchase.ts`, €1.99 jednokratno; `RECOVERY_PURCHASE_STUBBED` prekidač) — pravi `Purchases.purchasePackage` tok dokumentovan, čeka konfigurisane store proizvode. On-read streak reset gejtovan da NE nulira streak dok je ponuda živa.
- ✅ **"Blah Streak Lost" notifikacija (D6, T3.9):** `shouldNotifyStreakLost` (`lib/blahRecovery.ts`) odlučuje (javlja kad `recoverable` + bio streak + nije već javljeno, dedup preko `lastNotifiedAt >= lostAt`); profil on-read kreira `'BLAHS'` notif. (sistemska, `sender_id=recipient_id`) + deep-link `'BLAHS'` → `/profile` (recovery popup). On-read (pravi background push = T4.3).
- ⏳ Pravi RevenueCat (flip stub-a kad budu API ključevi + store proizvod) — T3.8 ostavio čist swap
- ❌ Urgency bunny animacija u poslednja 3h — UI (logika `isRecoveryUrgent` ✅ spremna; animacija dolazi sa streak UI badge-om)
- ℹ️ Dostupno i iz Settings → "Blah Recovery / Buy recovery"

### A5. Chat Hours (Conversations Timer) — ✅ Logika (T3.10) + prikaz u listi (T3.11)
Spec: svaki chat ima 24h tajmer koji se resetuje sa svakom poslatom porukom; ako nema odgovora 24h → Chat Hours padaju na 0; oboje moraju slati bar jednom dnevno.
- ✅ **`lib/chatHours.ts` (T3.10)** — čista logika: brojač u SATIMA (`chatHours`), dvostrani 24h tajmer `chatExpiresAt = min(lastFromMe, lastFromThem) + 24h` (oboje moraju slati u 24h — spam jedne strane ne drži streak), `registerMessage` (reset po poruci), `getChatHoursStatus` (none|active|at-risk|expired), `formatChatHours` → „83h". Test 10 grupa.
- ✅ **UI prikaz (T3.11)** u listi chatova: `ChatListItem` prikazuje „83h" desno (at-risk ≤3h → narandžast). **DB izvor = izvedeno iz `messages`** (ne nove kolone): `app/chats/index.tsx` rekonstruiše `ChatHoursState` fold-om `registerMessage` preko svih poruka konverzacije (sender me/them), realtime osvežava na svaku poruku. ⏳ `chat-room/[id].tsx` header još ne prikazuje timer (lista jeste).
- ℹ️ **Chat Hours su VIDLJIV brojač** u listi chatova, **jedinica = sati** (npr. `83h`, `4783h`, `215h`) — vidi `SCREENS.md` Chat 5.0.

### A6. Close-By Connections — 🟡 Delimično
Spec: vidi i dodaj ljude u blizini bez username-a (**radius 20–30m**, vidi `SCREENS.md` Search 6.0); toggle vidljivosti lokacije u privacy settings.
- ✅ Hvatanje lokacije (`hooks/useLocation.tsx`, kolone `profiles.latitude/longitude/location_enabled`)
- ❌/❓ Stvarni "nearby discovery" geo-upit (radius **20–30m**) + UI sa labelom "Close By"
- ❓ Toggle vidljivosti lokacije u settings
- ℹ️ Search prikazuje i predloge sa labelama "Friend with [Name]" i "From your contacts"

---

## B. Presence / Last Seen

### B1. Online / Last Seen — 🟡 Delimično
- ✅ Realtime presence online/offline (`hooks/usePresence.tsx`, tabela `user_presence`)
- ✅ Format "gone exploring 5m ago" / "Last seen ..."
- ❓ Toggle "Show/Hide Last Seen status"

### B2. Randomizovane "vanished" poruke po vremenskim zonama — ❌ Nije implementirano
Spec (Figma, 2. slika): smešne nasumične poruke po opsegu vremena (0–10 min, 10min–1h, 1–5h, 5–12h, 12–24h, 1–3 dana), npr. *"Poof! They just disappeared"*, *"Gone faster than my paycheck"*.
- ❌ Nasumičan izbor iz preset liste po zoni
- ❌ Pravilo zaokruživanja (10:35 → "10h", tek 11:01 → "11h")
- ❌ Promena poruke svaki put kad korisnik napusti/vrati se u app
- ❌ Automatski prelaz u sledeću zonu
> Trenutno: samo jednostavno "gone exploring Xm ago". Treba zameniti spec sistemom.

---

## C. Posts & Stories — 🟡 Delimično
- ✅ Post slike/videa, više medija u jednom postu sa swipe (`additional_media`)
- ✅ Polje `is_locked` postoji na postu
- ❌/❓ **24h auto-expiry** postova (stories ponašanje)
- ❌/❓ **Lock do 3 posta zauvek** za Blah+ (gating po premiumu + limit 3)

---

## D. Notifikacije (sa deep-link-om na ekran)
Spec: svaka notifikacija vodi na konkretan ekran.

| Tip | Tekst | Vodi na | Status |
|---|---|---|---|
| D1. Follow Request | "X sent you a follow request" | Follow Requests (Search/Friends 6.2) | 🟡 (zahtevi postoje; notif+deeplink ❓) |
| D2. New Follower | "X is following you now" | MyProfile 8.2 | ❓ |
| D3. New Message | "X sent you a message" | Chat 5.1 | ✅ (notif tip `MESSAGE` se kreira u `MessageContext`) |
| D4. Tagged in a Post | "X tagged you" | taj post | ❓ |
| D5. Post Like | "X likes your post" | lajkovani post | ❓ |
| D6. Blah Streak Lost | "Oops! You lost your blahs" | Recovery (MyProfile 8.7) | ✅ (T3.9 — on-read kreiranje na profilu + deep-link na `/profile`; render `Push.tsx` `'BLAHS'`) |

> Infrastruktura: tabela `notifications` + Expo notifications postoje. Nedostaju ostali tipovi + dosledan deep-linking. Push (Firebase) nedovršen (vidi `PROJECT_STATUS.md`).

---

## E. Blah+ (Premium / Subscription)

### Pretplatne pogodnosti
| Pogodnost | Spec | Status |
|---|---|---|
| See Who Viewed Your Profile | poslednjih 8 dana, unique views | ❌ (nema `profile_views`) |
| Blah Score Boost +10% | množilac na skor za premium | ❌ (zavisi od A2) |
| Lock 3+ Posts Forever | zaključaj do 3 posta trajno | 🟡 (`is_locked` postoji; premium gating ❓) |
| Ad-Free Experience | bez reklama; provera na login i kroz app | ❌ (nema reklamnog sistema) |

### Cene (paywall = `Camera 4.6`, vidi `SCREENS.md`)
- Monthly: **€4.99/mo** auto-renewal
- Yearly: **€29.94/yr** (50% off, default selektovano) auto-renewal
- Status: 🟡 RevenueCat (`react-native-purchases`) + `PremiumModal` / `SubsciptionPlans` postoje; konfiguracija proizvoda/paywall ❓. Recovery one-time (€1.99) je već dobio IO granicu (`services/recoveryPurchase.ts`, stubbed — T3.8); pretplate (mo/yr) još nemaju.
- ➕ Paywall lista još uključuje **Exclusive Customization** (*Coming soon: Profile themes*)

---

## F. Messaging & Chat System — ✅/🟡
- ✅ Tekst i **voice** poruke u DM (`message_type`: text/audio/image/file)
- ✅ Typing indikator (`useTypingStatus`) + presence
- ✅ Emoji reakcije
- ✅ Bez "seen" opcije (po spec-u)
- 🟡 **Pin chats** na vrh liste (`SwipeableChatItem` referencira pinned — proveriti da li radi end-to-end)
- ❓ Delivery status

---

## G. Ephemeral chat (otkriveno iz `SCREENS.md` Chat 5.x)

### G1. Ephemeral poruke (24h) + Save chat (30 dana) — ✅ Logika + DB/job + UI gotovi (T3.12/T3.13/T3.14)
Spec: konverzacija/poruke se brišu posle **24h** po defaultu; per-contact toggle **"Save chat"** produžava retenciju na **30 dana** (Chat 5.8).
- ✅ **`lib/ephemeral.ts` (T3.12)** — čista logika retencije: prozor je svojstvo konverzacije (`saved`: 24h default `EPHEMERAL_DEFAULT_MS` / 30d „Save chat" `EPHEMERAL_SAVED_MS`); `messageExpiresAt`/`isMessageExpired` (per-poruka, UI/placeholder) + `expiryCutoff` (batch prag za job: `createdAt <= cutoff`, ekvivalentan predikatu — pinning test). Toggle se rekalkuliše iz aktuelnog `saved`; fail-safe na nevažeći unos. Test 10 grupa.
- ✅ **DB + auto-brisanje job (T3.13)** — kolona `conversations.saved` (24h/30d toggle storage) + `public.delete_expired_messages()` zakazan pg_cron-om (`'5 * * * *'`). **SOFT-DELETE** (`is_deleted=true` + `text=NULL` + brisanje reakcija, NE hard DELETE) — čuva Chat Hours rekonstrukciju (T3.11) i daje red za placeholder (T3.14), izbegava `reply_to` FK problem. Per-konverzacija cutoff u jednom MVCC snapshot-u = concurrency-safe („sačuvani se ne diraju"). SQL intervali zakovani pinning testom uz lib konstante. ⚠️ Media fajlovi u storage bucket-ima se NE brišu (samo `text`) — bucket cleanup je zaseban posao.
- ✅ **"Save chat" (30 dana) toggle UI (T3.14)** — `components/ChatAdditionalMedia.tsx` (3-tačke meni): toggle učita/upiše `conversations.saved` (optimistički, revert na grešku); ranije je bio samo lokalni state.
- ✅ **"Deleted message..." placeholder (T3.14)** — `chat-room/[id].tsx` renderuje italic placeholder kad `Message.is_deleted` (mapiran u `MessageContext`), pre svih tipova i nezavisno od `text` → pokriva i klijentski delete i cron soft-delete (`text=NULL`).

### G2. "Tap to View" media (pogledaj-jednom) — ❌ Nije implementirano
Spec: foto/video u chatu se šalju kao **"Tap to View"**; nakon otvaranja prelaze u **"Opened"** stanje (Snapchat-stil).
- ❌ View-once stanje + "Opened" indikator

### G3. Per-contact kontrole (Chat 5.8) — 🟡 Delimično
- 🟡 **Block** (`BlockBadge` postoji) · **Pin** (`SwipeableChatItem`)
- ✅ **Save chat** (T3.14 — `conversations.saved` toggle, persistira)
- ❌ **No Blahs** per-contact · **Mute notifications** (toggle-i postoje u meniju ali su lokalni-only)

### G4. Reply / Delete poruke + reakcije (Chat 5.3/5.4) — 🟡 Delimično
- ✅ Emoji reakcije (`MessageContext`, `MessageMenu`)
- 🟡 **Reply** (citat) + swipe-right-to-reply
- ✅ **Delete** poruke (samo pošiljalac — `handleDelete` soft-delete) + **"Deleted message..." placeholder** (T3.14, `is_deleted` render)

### G5. Add from Contacts — 🟡 Delimično
- 🟡 expo-contacts + `InviteUser`; predlozi "Add [Name] from Contacts" + sync ❓

### G6. Report account — 🟡 Delimično
Spec (Profile 7.5): kategorije **Spam · Harassment · Inappropriate Content · Other** + confirmation poruka po kategoriji.
- 🟡 `ReportMenu` postoji; kategorije + backend obrada ❓

---

## H. Settings & Privacy (`SCREENS.md` §9)

### H1. Privacy toggle-ovi — 🟡/❌
- ❓ **Private profile** (privatni nalog → follow request flow, vidi Profile 7.0)
- ❌ **Who can message me** — Everyone / Followers only / Following only
- 🟡 **Last seen status** toggle (presence postoji, toggle ❓)
- 🟡 **Location sharing** toggle (`location_enabled` kolona postoji)

### H2. Notifikacioni mute toggle-ovi — ❌
- ❌ Mute new followers · Mute messages · Mute post likes/tags

### H3. Legal / Community stranice — ❌
- ❌ Terms of service, Privacy policy, Community Guidelines (Harassment / Spam / Nudity), Contact Support — statički render (tekst u spec-u)

### H4. Account akcije — 🟡
- 🟡 **Delete account** (`DeleteAccount` komponenta postoji) — alert "Are you sure?"
- ❓ **Log out** (alert → Login), **View subscription details**

## I. Multi-account / Switch account (`SCREENS.md` §9) — ❌ Nije implementirano
Spec: prebacivanje između više naloga; per-nalog **badge nepročitanih** (26 / 99+ / 8); "Create new account +"; prazno stanje "No other accounts...".
- ❌ Čuvanje više sesija + switcher + agregirani badge-evi

---

## 📌 Rezime — šta je najveći GAP u odnosu na spec

Ovo su **prepoznatljive (signature) mehanike** proizvoda koje **još ne postoje** i verovatno su najveći deo preostalog posla:

1. **Blah Score sistem** (A2) — formula, real-time, formatiranje
2. **Streak + Blah Recovery** (A3, A4) — 24/26h prozori, reset, recovery + plaćanje
3. **Chat Hours tajmer** (A5)
4. **Randomizovane presence poruke** (B2)
5. **Premium pogodnosti** koje od ovoga zavise: "Who viewed profile" (E), Score Boost, Ad-free
6. **Stories 24h expiry** + "lock 3 posts" gating (C)
7. **Kompletiranje notifikacija** (svi tipovi + deep-link) (D)
8. **Ephemeral chat** — 24h auto-brisanje + "Save chat" 30d + "Tap to View" media (G1, G2)
9. **Settings & Privacy** — privacy toggle-ovi, mute notifikacije, legal stranice (H)
10. **Multi-account / Switch account** — više sesija + per-nalog badge (I)

> Predlog: ove stavke ubaciti kao "Faza 4 — Feature-i" u `PROJECT_STATUS.md`, redom po prioritetu (Blah Score je temelj jer od njega zavise streak, recovery i score boost).

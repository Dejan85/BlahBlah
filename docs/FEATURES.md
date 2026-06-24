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

### A2. Blah Score — 🟡 Delimično (čista logika + formatiranje gotovo)
Spec formula: **Blah Score = (Blahs Sent × 4) + (Followers × 0.8) + Streak Bonus**
- ✅ Formula u `lib/blahScore.ts` — `calculateBlahScore(blahsSent, followers, streakDay)` + test (T3.2). Primer: 8. dan, 10 blahs, 10 followers = 68 (40+8+20).
- ✅ DB storage (T3.3): `profiles.blah_score` + `profiles.blahs_sent` (`integer NOT NULL DEFAULT 0`, migracija `20260624162117_blah_score_columns.sql`). Skor se samo SKLADIŠTI; app ga računa+upisuje (T3.4).
- ✅ Streak Bonus (Blahs × 2 na danima 8 / 20 / 28 / 48) — u `lib/blahScore.ts`
- ❌ Real-time update skora posle slanja Blah-a (T3.4)
- ✅ Zaokruživanje na ceo broj (256.8 → 257) — `Math.round` u `lib/blahScore.ts`
- 🟡 Formatiranje velikih brojeva (10.000 → "10k", "10.1k"...) — ✅ logika u `lib/formatCount.ts` + test (T3.1); ❌ još nije uvezana u UI (T3.4, zamenjuje inline `formatNumber` u `PostActions.tsx`)
- ❌ "Prvi Blah u 24h se računa" logika

### A3. Daily Activity & Streaks — ❌ Nije implementirano
- ❌ Svaki Blah povećava skor / vodi streak
- ❌ Ako se ne pošalje Blah u 24h → skor reset na 0 (osim uz Blah+ recovery)

### A4. Blah Recovery — ❌ Nije implementirano
Spec: 26h prozor; kad istekne → notifikacija "Blah Streak Lost"; ekran za recovery sa plaćanjem; live countdown; nakon plaćanja kreće nov 26h ciklus.
- ❌ 26-časovni timer / countdown
- ❌ "Blah Streak Lost" notifikacija (vidi D6)
- ❌ Recovery popup + plaćanje (`MyProfile 8.8`) — **cena €1.99 jednokratno**, prozor ponude **~13h** ("In 13h offer expire")
- ❌ Urgency bunny animacija u poslednja 3h
- ℹ️ Dostupno i iz Settings → "Blah Recovery / Buy recovery"

### A5. Chat Hours (Conversations Timer) — ❌ Nije implementirano
Spec: svaki chat ima 24h tajmer koji se resetuje sa svakom poslatom porukom; ako nema odgovora 24h → Chat Hours padaju na 0; oboje moraju slati bar jednom dnevno.
- ❌ Nema `chat_hours` / timer logike (proveren `chat-room/[id].tsx`)
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
| D6. Blah Streak Lost | "Oops! You lost your blahs" | Recovery (MyProfile 8.7) | ❌ (zavisi od A2–A4) |

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
- Status: 🟡 RevenueCat (`react-native-purchases`) + `PremiumModal` / `SubsciptionPlans` postoje; konfiguracija proizvoda/paywall ❓
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

### G1. Ephemeral poruke (24h) + Save chat (30 dana) — ❌ Nije implementirano
Spec: konverzacija/poruke se brišu posle **24h** po defaultu; per-contact toggle **"Save chat"** produžava retenciju na **30 dana** (Chat 5.8).
- ❌ Auto-brisanje poruka posle 24h
- ❌ "Save chat" (30 dana) toggle + logika
- ❌ "Deleted message..." placeholder za obrisanu poruku

### G2. "Tap to View" media (pogledaj-jednom) — ❌ Nije implementirano
Spec: foto/video u chatu se šalju kao **"Tap to View"**; nakon otvaranja prelaze u **"Opened"** stanje (Snapchat-stil).
- ❌ View-once stanje + "Opened" indikator

### G3. Per-contact kontrole (Chat 5.8) — 🟡 Delimično
- 🟡 **Block** (`BlockBadge` postoji) · **Pin** (`SwipeableChatItem`)
- ❌ **No Blahs** per-contact · **Mute notifications** · **Save chat**

### G4. Reply / Delete poruke + reakcije (Chat 5.3/5.4) — 🟡 Delimično
- ✅ Emoji reakcije (`MessageContext`, `MessageMenu`)
- 🟡 **Reply** (citat) + swipe-right-to-reply
- ❓ **Delete** poruke (samo pošiljalac)

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

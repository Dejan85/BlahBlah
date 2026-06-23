# 📱 BlahBlah — Spec ekrana (Figma flow)

> Screen-by-screen specifikacija sa Figme, sa originalnom numeracijom (Login 1.x, Home 2.x, Blahs 3.x, Camera 4.x).
> Prati uz `FEATURES.md` (mehanike) i `ARCHITECTURE.md` (kako se gradi).
> Status proveren prema kodu **2026-06-23**. Legenda: `✅ Gotovo` · `🟡 Delimično` · `❌ Nema` · `❓ Nepotvrđeno`
>
> ⚠️ Pokriveno do sad: Login, Home, Blahs, Camera, **Chat**. Sledi još (Profile, Search/Friends, Settings, Notifications...).

---

## 1. LOGIN / ONBOARDING (`Login 1.x`)

> ⚠️ **Divergencija od koda:** Spec traži **telefon-first auth + više social provajdera**. Trenutni kod ima email/password + Google + OTP, a onboarding korake birthday→username. Treba uskladiti (vidi belešku na dnu sekcije).

### Login 1.0 — Splash — 🟡
- Crveni (`#FF325E`) ekran, BlahBlah bunny logo centriran, **animiran** (Figma nota "ANIM").
- Status: postoji landing/splash (`app/index.tsx`, `_layout.tsx` splash), animacija ❓.

### Login 1.1 — Auth entry — 🟡
- **Telefon input** sa prefiksom zemlje (`+381`) + **Continue**.
- Social sign-in dugmad: **Google · Twitter · Instagram · Apple · Facebook**.
- Footer: Terms & Privacy / Cookies Policy tekst.
- Status: postoje `GoogleSignIn`, `FacebookSignIn`, `TwitterLogin` komponente; ❌ telefon-auth (trenutno email), ❓ Instagram/Apple.

### Login 1.2 — Birthday — 🟡
- Tekst: *"Birthday date? Your friends need a reason to party — help them out! 🎂"*
- `DD/MM/YYYY` input + **date picker točak** (dan/mesec/godina). Continue.
- Status: postoji `app/auth/sign-up/birthday.tsx` + `@react-native-community/datetimepicker`.

### Login 1.3 — Name — 🟡
- Tekst: *"Start with a name! Don't stress, you can change it anytime!"*
- **Name** input sa brojačem **0/30** karaktera. Continue.
- Status: trenutno postoji `username.tsx` korak (3–20 char, regex). Spec govori o "Name" (0/30). Uskladiti name vs username.

> **TODO sinhronizacija auth-a:** odlučiti da li je auth telefon-first (spec) ili email (kod). Dodati Twitter/Instagram/Apple ako idemo po spec-u. Uskladiti "Name" korak.

---

## 2. HOME / FEED (`Home 2.x`)

### Home 2.0 — Feed (full-screen, TikTok stil) — 🟡
**Top:**
- **Timestamp** ("18h") — koliko davno je post postavljen.
- **Notif ikona** gore-desno sa **"99+"** badge — klik → chat screen / swipe levo. Prikazuje pending (likes, comments, friend requests).

**Centar — Media:**
- Full-screen foto/video. Tap = pauza (video). **Swipe gore/dole** = sledeći/prethodni post.

**Desni vertikalni bar (engagement):**
- ❤️ **Like** (broj npr. 7.7k) + mala animacija na tap.
- ➤ **Share** (strelica) → share opcije (Home 2.1).
- 💬 **Comment** (broj) → komentari (Home 2.4).

**Bottom-left (profil + info):**
- Profilna + username (npr. `Sara_Cute`), klik → profil. Tap na **"+"** = zaprati (nestaje posle).
- Caption + hashtags (skraćeno, "see more").
- **Song info** (npr. "ASAP Rocky – Praise The Lord").

**Bottom-right:**
- **Blahs** dugme → otvara Blahs (Blahs 3.x). Bunny "aktivan" kad je ostalo **≤3h** od 24h od poslednjeg poslatog Blah-a.

Status: feed/postovi/swipe postoje (`app/home`, `PostsFeed`, `Post`), Blahs dugme ✅. Like animacija, "+follow inline", song info, 3h bunny indikator — 🟡/❓.

### Home 2.1 — Share meni (bottom sheet) — ❓
- **Lista prijatelja** horizontalno skrolabilna (profilna + username), tap = selekcija za direktno deljenje.
- Share opcije (donje ikone): **WhatsApp · Instagram (story/DM) · Messenger · Snapchat**.
- Status: `ShareModal` postoji; eksterni share targeti ❓.

### Home 2.2 — Share: selektovan korisnik — ❓
- Kad se izabere korisnik → otvara se **message deo** sa "Type..." inputom + send dugme (deli post kao poruku).

### Home 2.3 — Share: prošireno — ❓
- **Search bar** na vrhu + **grid** prijatelja.
- Pull-up = otvori, pull-down = zatvori; skrolabilno.
- Donje share ikone (WhatsApp/IG/chat/Messenger/Snapchat).

### Home 2.4 — Komentari (bottom sheet) — 🟡
- Po komentaru: profilna + username, tekst, **likes** (crveno srce), **najlajkovaniji ide na vrh** (npr. "19 likes ★"), tap srca = lajk.
- **Reply** dugme → odgovori prikazani kao **uvučeni threadovi**.
- **"Show all"** širi sekciju kad ima previše komentara.
- Input dole: "Type..." + **crveni send**.
- Status: postoje `CommentModal`, `CommentSection`; sortiranje po lajkovima / reply threadovi / lajk komentara — 🟡/❓.

---

## 3. BLAHS — slanje (`Blahs 3.x`)

> Otvara se iz Home 2.0 (Blahs dugme). Pozadina = zamućen sadržaj. Vidi `FEATURES.md` A1 (broadcast logika ✅).

### Blahs 3.0 — Izbor moda — 🟡
- *"Tap to type a message"* (tekst) / *"Hold to record a voice message"* (glas).

### Blahs 3.1 — Tekst mod — 🟡
- Tastatura + placeholder prompt (npr. *"What song have you had on repeat lately? 😌"*) + send.
- ❓ Rotirajući/predloženi promptovi.

### Blahs 3.2 — Snimanje glasa — 🟡
- **Waveform** + tajmer (0:38), **lock** ikona (zaključaj snimanje), record dugme.
- Status: postoje `AudioRecording`, `AudioWaveForm`; lock-to-record gesture ❓.

### Blahs 3.3 — Glas snimljen — 🟡
- Waveform + trajanje, **X** (otkaži), **▶ play**, **➤ send** (crveno).

---

## 4. CAMERA / POST CREATION (`Camera 4.x`)

### Camera 4.0 — Foto capture — 🟡
- Flash toggle (gore-desno), gallery/multi ikona (dole-levo), **shutter** (crveni prsten), flip kamere (dole-desno).
- Status: `app/camera`, `components/Camera/CaptureStep`.

### Camera 4.1 — Video snimanje — 🟡
- Tajmer snimanja (0:19), shutter, **lock ikone** desno (zaključaj snimanje).

### Camera 4.2 — Preview / edit — 🟡
- **Back** (gore-levo). Gore-desno: **Filter ikona** (otvara filtere), **Resize** (zoom), **Save/Download** (snimi na uređaj).
- Centar: full-screen media + video kontrole (play/pause).
- Hint: **"Swipe Filters"** (horizontalni swipe menja filter).
- **Next** (crveno, dole-desno) → Camera 4.4.

**Filteri (custom imena):**
| Baza | Custom ime | Efekat |
|---|---|---|
| Clarendon | **SkyGlow** | Posvetli sa hladnim tonom |
| Gingham | **RetroHaze** | Izbledela, vintage estetika |
| Juno | **Sunburst** | Topliji crveni & žuti |
| Lark | **NatureBoost** | Pojačava zelene & plave |
| Ludwig | **Crimson** | Desaturiše sve osim crvene |
| Valencia | **WarmFade** | Mek, topao, retro |
| X-Pro II | **BoldEdge** | Visok kontrast, duboke crne |
| Sierra | **DreamSoft** | Dodaje izmaglicu za mek izgled |
| Hefe | **VividPop** | Pojačava saturaciju |
| Inkwell | **PureMono** | Klasičan crno-beli, visok kontrast |

Status: Skia + `components/Camera/FilterMenu` postoje; tačan set custom filtera ❓.

### Camera 4.3 — Poseban filter ekran — ❌ UKLONJENO
- ⚠️ **Precrtano X-om na Figmi → ne implementirati.** Filteri idu inline u 4.2 (swipe), ne kao zaseban ekran.

### Camera 4.4 — Post composer — 🟡
- **Back** gore-levo. Preview medija.
- **"Add your comment..."** — caption; podržava **#hashtags** i **@mentions** (tagovani dobija notifikaciju); skraćuje se sa "..." u feedu.
- **Add music** → music screen; izabrana pesma se prikaže ispod preview-a.
- **Add photos** → galerija multi-select ("3 Photos Selected"), carousel (kao 4.5).
- **Toggle kontrole (slide-down meni):**
  - **Lock post forever** — premium; ako nije plaćeno → otvara **paywall (Camera 4.6)**. ON = zaključan zauvek, OFF = nestaje posle 24h. **Max 3 posta.**
  - **Hide likes** — ON: brojevi vidljivi / OFF: samo ikona bez brojeva.
  - **Hide shares** — isto.
  - **Hide comments** — isto.
- **Post** (crveno).
- Status: `PostContext` ima polja `hide_likes/hide_shares/hide_comments/is_locked`, mentions/hashtags, additional_media ✅. Music picker, premium gating na lock, 24h expiry — 🟡/❌ (vidi `FEATURES.md` C).

### Camera 4.5 — Post composer (popunjeno) — 🟡
- Caption sa hashtagovima, prikaz pesme (A$AP Rocky – Praise The Lord), **"3 photos"** carousel.
- **Trash ikona** na svakoj izabranoj slici → obriši pre objave. **Tap na sliku** reotvara **Camera 4.2** za editovanje.
- Isti toggle-ovi + **Post**.

### Camera 4.6 — Paywall "Upgrade to Blah +" — 🟡
Pogodnosti:
- 👁️ **See Who Viewed Your Profile** — praćenje poseta poslednjih **8 dana**
- 🐇 **Lock 3+ Posts Forever** — zadrži 3 posta trajno
- 🚀 **Blah Score Boost (+10%)** — 10% množilac na Blah Score
- 🚫 **No Ads** — uklanja sve reklame
- 👑 **Exclusive Customization** — *Coming soon: Profile themes*

Cene:
- **Monthly €4.99/mo**
- **Yearly €29.94/yr** (50% off) — *default selektovano*
- **Continue** + "By tapping Continue, you agree to the Subscription Terms".

Status: `PremiumModal` / `SubsciptionPlans` + RevenueCat postoje (🟡); pogodnosti uglavnom još nisu funkcionalne (vidi `FEATURES.md` E).

---

## 5. CHAT / MESSAGING (`Chat 5.x`)

> 🔑 **Ovaj flow otkriva 3 velike mehanike koje treba dodati u `FEATURES.md`:**
> 1. **Chat Hours su vidljiv brojač** u listi (npr. `4783`, `83h`) — to je tajmer iz `FEATURES.md` A5.
> 2. **Poruke/chat su ephemeral** — brišu se posle **24h** po defaultu; "Save chat" produžava na **30 dana**.
> 3. **"Tap to View" media** (foto/video) — pogledaj-jednom, pa pređe u "Opened" stanje (Snapchat-stil).

### Chat 5.0 — Lista chatova — 🟡
**Header:**
- Naslov **"Chats"**. Leva ikona → MyProfile (8.0). Desna ikona → Search/Friends (6.0 i 6.2) sa **crvenim badge-om** (broj friend request-ova).

**Search bar** (ispod headera) — pretraga chatova po imenu.

**Lista (skrolabilna):**
- Profilna + username, **badge nepročitanih** ("3 new messages"), **timestamp** ("3h"/"45m"/"now").
- Desno: **broj = Chat Hours** (npr. `4783`, `83h`) — tajmer konverzacije (vidi A5).
- Status labele: **Typing...** (real-time), **Pin** ikona (zakačeni idu na vrh).

**Context menu (swipe na chat):** **Pin** (na vrh) · **Mute** (utišaj notifikacije) · **Delete** (briše konverzaciju + sve poruke, pita "Are you sure?").

**Add Contact (dno):** "Add [Name] from Contacts" — predlozi iz sinhronizovanih kontakata; **Add** dugme dodaje (npr. "Add ZIZI +").

Status: lista/search/typing/pin/swipe postoje (`app/chats/index.tsx`, `SwipeableChatItem`, `ChatListItem`); ❌ Chat Hours brojač, 🟡 kontakti (`InviteUser`, expo-contacts).

### Chat 5.1 — Chat room — ✅/🟡
**Header:** Ime + **last seen** ("Gone exploring 7m ago"), klik → profil. Back (gore-levo). **3-tačke meni** (gore-desno) → opcije (Chat 5.8).

**Bubble-i:** Moje poruke **desno (crveni)**, sagovornikove **levo (sivi)**.
**Media poruke:** **"Tap to View"** za foto/video. Voice poruke sa playback kontrolama (trajanje).
**Input bar:** "Type..." polje, **kamera** ikona (levo, slanje foto/video), **mikrofon** (desno, hold = snimaj glas), **send** (desno).

Status: tekst/audio/image/file, bubble-i, input ✅ (`chat-room/[id].tsx`); "Tap to View" ephemeral media ❌.

### Chat 5.2 — Deljeni post u chatu — 🟡/❓
- Prikaz username + comment za post; **tap → full-screen**, swipe nastavlja kroz postove.
- Foto/video preview: tap = full-screen.

### Chat 5.3 — Interakcije sa porukom — 🟡
- **Tap & hold** na poruku → context menu.
- **Reaction meni (iznad poruke):** emoji reakcije (❤️), pojavi se pored bubble-a; **"+"** otvara još reakcija (👍, 😂...).
- **Context meni (ispod poruke):** **Reply** (citiraj & odgovori; citat se prikaže iznad input-a kod reply-a ili **swipe-right** na poruku) · **Delete** (samo za pošiljaoca).

Status: reakcije postoje (`MessageContext`, `MessageMenu`); reply/swipe-to-reply 🟡, delete poruke ❓.

### Chat 5.4 — Stanja poruka — 🟡
- Media: **"Tap to View" → "Opened"** (sivo kad je otvoreno).
- Voice sa emoji reakcijom.
- **"Deleted message..."** placeholder za obrisanu poruku.
- **Reply preview** dole: citat ("Why delete???") sa **X** za otkaz + input.

Status: ephemeral "Opened" stanje ❌; "Deleted message" placeholder ❓.

### Chat 5.5 — Kamera iz chata — 🟡
- Kamera za direktno slanje foto/video u chat (flash, galerija, shutter, flip) — isto kao Camera 4.0, u kontekstu chata.

### Chat 5.6 — Media viewer (pošiljalac) — 🟡
- Full-screen foto/video + video kontrole.
- Gore: back, **filter** (otvarao 4.3 — ⚠️ deprecated), **resize** (zoom), **save/download**.
- Dole: **♾️ Infinite Loop** = premium **"Forever Post"**; **Send/Blah** (crveno) = pošalji poruku/Blah vezan za post.

### Chat 5.7 — Media viewer (primalac) — ❓
- Read-only prikaz za korisnika koji je otvorio foto.

### Chat 5.8 — Opcije konverzacije (3-tačke meni) — 🟡
**Header:** profilna + ime, back.
**Toggle kontrole:**
- 📍 **Pin to top** — drži chat na vrhu.
- 🔇 **Mute notifications** — utišaj za ovaj chat.
- 🚫💬 **No Blahs** — *"They won't receive your daily Blahs"* (isključi korisnika iz tvojih Blah-ova).
- 🚷 **Block** — blokira poruke/interakciju.
- **24 Save chat** — ON: chat se čuva **30 dana** umesto standardnih **24h**; OFF: briše se posle 24h.

**Media (dno):** thumbnails deljenih medija; tap = full-screen.

Status: postoje `BlockBadge`, pin (`SwipeableChatItem`); ❌ No Blahs per-contact toggle, ❌ Save chat 30d / ephemeral 24h, ❓ mute, ❓ media galerija konverzacije.

---

## 6. SEARCH / FRIENDS (`Search/Friends 6.x`)

> Otvara se iz Chat 5.0 (desna ikona) i Home notifikacija. Povezano sa `FEATURES.md` A6 (Close-By) i social grafom.

### Search/Friends 6.0 — Search / Discover — 🟡
**Header:** naslov **"Search"** (crveni), back (gore-levo).
**Search bar** — kucanje username-a / keyword-a.
**Lista korisnika (skrolabilna):**
- Profilna + username (klik → profil).
- **Labele ispod username-a** (kontekst zašto je predložen):
  - 🔴 **Close By** — korisnik fizički u blizini, **radius 20–30m** (vidi A6).
  - **Friend with [Name]** — zajednički prijatelji / veze.
  - **From your contacts** — sinhronizovan iz kontakata uređaja.
- **Follow** dugme (crveno) — zaprati direktno iz liste.

Status: `app/search-detailed`, `SearchComponent` postoje; ❌ Close-By geo-upit (20–30m), 🟡 "Friend with" / kontakti.

### Search/Friends 6.1 — Rezultati pretrage — 🟡
- Kucanje (npr. "Sw") → rezultat: username + full name (npr. `swift` / TaylorSwift123).
- ⚠️ **Dugme zavisi od veze:** ako već prati/povezan → **Message**; inače → **Follow**. (U 6.0 swift ima "Follow", ovde "Message".)

Status: pretraga radi (🟡); Follow-vs-Message stanje po vezi ❓.

### Search/Friends 6.2 — Friend Requests — 🟡
**Header:** naslov **"Friend requests"**, back.
**Search bar** — pretraga zahteva po username-u.
**Lista zahteva:**
- Profilna + username (klik → profil), status **"Wants to follow you"**.
- **Accept** (crveno) = prihvati + dodaje kao prijatelja · **Decline** (outline) = odbij.
- Posle Accept/Decline stavka **nestaje**.

Status: logika postoji (`FriendRequestContext`, `app/freind-requests`); ✅ accept/decline + realtime; 🟡 search po zahtevima, UI usklađivanje.

---

## 7. PROFILE — tuđi profil (`Profile 7.x`)

> Profil drugog korisnika. Zajednički elementi: back (gore-levo), 3-tačke meni (gore-desno), profilna + username + bio, stats **Blahs / Followers / Following**, "Sii" = separator iznad grid-a.

### Profile 7.0 — Privatan nalog — 🟡
- **Follow** (crveno) = šalje **follow request** privatnom nalogu; sadržaj skriven dok se ne odobri. + **Message**.
- Centar: **lock ikona** (non-interactive) + tekst **"Oops, private account"**.

### Profile 7.1 — Javan / nalog koji te prati nazad — 🟡
- **Bio** ispod username-a + **hyperlink URL** (npr. `https://blahblah.com`) → eksterni sajt.
- Stats **klikabilni** (otvaraju followers/following liste).
- **Follow back** (crveno) + **Message**.
- **Grid galerija** postova (foto/video), tap → full-screen.
- **Lock 3+ Posts (bela bunny ikona)** na zakačenim postovima — premium; vidljivi i posle 24h; swap/remove bilo kad.

### Profile 7.2 — Nalog koji već pratiš — 🟡
- Dugme **Unfollow** + **Message** (crveno). Grid galerija.

### Profile 7.3 — Followers tog profila — 🟡
- Header (crveni): ime, back. **"[Name]'s newest followers"** + **Search** (desno).
- Lista: profilna + username; status **"Newest follower"** (crveno, skorašnji, ostaje **24h**); dugme po vezi: **Follow / Message / Pending...**.
- **Dinamičko ažuriranje** kad stignu novi pratioci.

### Profile 7.4 — Following tog profila — 🟡
- Header: ime, back. **"Accounts [Name] Follows"** + Search.
- Lista sa **Follow / Message / Pending...** po vezi.

### Profile 7.5 — 3-tačke meni (tuđi profil) — 🟡
Bottom sheet preko profila:
- 🔇 **Mute notifications** (toggle) · 🚷 **Block** (toggle) · ⚠️ **Report account**.
- **Report kategorije** (tap): **Spam · Harassment · Inappropriate Content · Other** — svaka daje confirmation poruku (npr. *"Thanks for letting us know! We'll review this content to stop any spam."*).
- Status: `ReportMenu`, `BlockBadge` postoje; usklađivanje 🟡.

### Profile 7.6 — Blokiran korisnik — 🟡
- Prikaz headera + stats, telo: ikona + **"This user is blocked"**.

---

## 8. MYPROFILE — sopstveni profil (`MyProfile 8.x`)

### MyProfile 8.0 — Moj profil — 🟡
- Back (gore-levo), **3-tačke → Settings** (gore-desno).
- Profilna + username + bio + **hyperlink URL**. Stats Blahs/Followers/Following.
- **Edit profile** (olovka) + **👁️ Eye ikona sa badge "8"** = **Who viewed your profile** (poslednjih **8 dana**, Blah+ → MyProfile 8.3; ako nije plaćeno → paywall 8.7).
- "Sii" separator + **grid galerija** (moji postovi, bela bunny na zaključanim).

**Grid layout algoritam** (EXAMPLE 1/2):
- Prva 3 posta: **143px** visina.
- 4. post: **123px**.
- 5. post: 143px, a **2. post se smanji 143 → 123**.
- Pravilo: **neparni (1,3,5...) = 143px**, **parni (2,4,6...) = 123px**.

### MyProfile 8.1 — Moji Following — 🟡
- **"Accounts [Name] Follows"** + Search; Follow/Message/Pending po vezi.

### MyProfile 8.2 — Moji Followers — 🟡
- **"[Name]'s newest followers"** + Search; status "Newest follower" + Follow/Message/Pending.

### MyProfile 8.3 — Who viewed (Blah+) — ❌
- **"Who's been checking out [Name]"** + Search.
- Lista posetilaca sa **vremenom** ("Today", "1 day ago"... do **8 dana**) + Follow/Message/Pending.
- Status: ❌ (zavisi od profile-views trackinga, vidi `FEATURES.md` E).

### MyProfile 8.4 — Moj post (full view) — 🟡
- Full-screen, timestamp "18h", **3-tačke → edit (8.5)**.
- Engagement brojevi (like/share/comment). Profil + caption (#hashtags) + song + **Blahs** dugme.
- **Scroll dole → sledeći post**.

### MyProfile 8.5 — Edit post meni — 🟡
Bottom sheet:
- **Hide likes / Hide shares / Hide comments** (toggle; ON=brojevi vidljivi, OFF=samo ikona bez brojeva).
- **Lock post forever** (toggle; ako nije plaćeno → paywall 8.6).
- 🗑️ **Delete post** (crveno) — alert "Are you sure?".

### MyProfile 8.6 / 8.7 — Paywall "Upgrade to Blah +" — 🟡
- Isto kao **Camera 4.6** (See Who Viewed / Lock 3+ / Score Boost +10% / No Ads / Exclusive Customization; €4.99/mo, €29.94/yr). 8.7 = otvoren preko profila (iz eye ikone kad nije plaćeno).

### MyProfile 8.8 — Blah Recovery popup — ❌
- **"Oops...Blahs!"** → **Blahs Recovery**: *"Your Blah Score doesn't go to 0. In **13h** offer expire"*.
- **Blahs Recovery — €1.99 / one time use** + **Continue** + Subscription Terms.
- Status: ❌ (vidi `FEATURES.md` A4; cena = **€1.99 jednokratno**, prozor ponude **~13h**).

### MyProfile 8.9 — Profil sa aktivnim Blah Score — ❌
- **Blahs stat u CRVENOM** (10.9k crveno) = aktivan/istaknut Blah Score. + Edit profile + eye badge 8.
- Status: ❌ (zavisi od Blah Score, `FEATURES.md` A2).

---

## 9. SETTINGS & PRIVACY (`Setting & Privacy`)

> Otvara se iz MyProfile 8.0 (3-tačke). Skrolabilan meni + sub-ekrani.

### Glavni meni — 🟡
**🔒 Privacy Settings:**
- **Private profile** (toggle) · **Who can message me** (→ sub) · **Last seen status** (toggle) · **Location sharing** (toggle).

**🔔 Notifications:**
- **Mute new followers** · **Mute messages** · **Mute post likes/tags** (toggle).

**🐇 Blah +:** **View subscription details**.
**🔁 Blah Recovery:** **Buy recovery** (→ 8.8).
**📄 Terms & Privacy Policy:** Terms of service · Privacy policy.
**👥 Community Guidelines:** Harassment & hate speech · Spam & fake profiles · Nudity & illegal content.
**❓ Help & Support:** Contact Support.
**⎋ Log Out:** Log out (alert "Are you sure?" → Yes = Login 1.1) · **Switch account** (sa avatarom).
**🗑️ Delete Account:** Permanently delete account (alert → Yes = nalog obrisan).

Status: postoji `app/settings/[id].tsx`, `DeleteAccount`; većina toggle-ova/sub-ekrana ❓/❌.

### Sub-ekrani — 🟡/❌
- **Who can message me** — **Everyone / Followers only / Following only** (toggle, jedan aktivan).
- **Terms of service** — pun tekst (6 sekcija).
- **Privacy policy** — pun tekst (6 sekcija; kontakt `xxx@gmail.com`).
- **Harassment & hate speech / Spam & fake profiles / Nudity & illegal content** — statički tekst guidelines-a + "report through the app".
- **Contact Support** — *"contact us at xxx@gmail.com"*.
- **Switch account** — lista naloga sa **badge nepročitanih** (26 / 99+ / 8), **"Create new account +"**; prazno stanje "No other accounts...".

---

## 📌 Ključne napomene iz ovog dela spec-a
1. **Auth divergencija** — spec = telefon-first + Twitter/Instagram/Apple/Facebook/Google; kod = email + Google + OTP. Doneti odluku.
2. **Camera 4.3 se NE radi** (precrtano) — filteri inline u 4.2.
3. **Share na eksterne app-ove** (WhatsApp/IG/Messenger/Snapchat) — nov posao, verovatno nije u kodu.
4. **Komentari**: sortiranje po lajkovima + reply threadovi + lajk komentara — proširiti postojeće.
5. **Premium gating** (Lock post → 4.6 paywall) povezuje Camera flow sa Blah+ mehanikama.
6. Cena yearly = **€29.94** (prikazana, 50% off) — uskladiti sa `FEATURES.md` E.
7. **🔑 Ephemeral poruke** — chat se briše posle **24h**; "Save chat" produžava na **30 dana**. Velika mehanika, dodato u `FEATURES.md` (G1).
8. **🔑 "Tap to View" media** — pogledaj-jednom (Opened stanje), Snapchat-stil. `FEATURES.md` (G2).
9. **🔑 Chat Hours = vidljiv brojač** u listi chatova (npr. 83h). `FEATURES.md` A5.
10. **Per-contact kontrole** (Chat 5.8): No Blahs, Block, Mute, Save chat, Pin — proširiti.
11. **Add from Contacts** — sinhronizacija kontakata + predlozi (expo-contacts postoji).
12. **Close By radius = 20–30m** (Search 6.0) — konkretizuje A6; geo-upit treba dodati.
13. **Search Follow-vs-Message** (6.1) — dugme zavisi od veze sa korisnikom.
14. **Predlozi u Search-u** sa labelama (Close By / Friend with / From contacts) — algoritam predloga je nov posao.
15. **🔑 Blah Recovery = €1.99 jednokratno**, prozor ponude ~13h (MyProfile 8.8) — konkretizuje `FEATURES.md` A4.
16. **🔑 Multi-account / Switch account** (Settings) — više naloga + per-nalog badge nepročitanih. Nov feature → `FEATURES.md` I.
17. **🔑 Grid layout algoritam** (MyProfile 8.0): neparni postovi 143px, parni 123px.
18. **Privatnost toggle-ovi** (Settings): Private profile, Who can message me (Everyone/Followers/Following), Last seen, Location sharing → `FEATURES.md` H.
19. **Notif mute toggle-ovi**: new followers / messages / post likes+tags.
20. **Report account** (Profile 7.5): Spam/Harassment/Inappropriate/Other + confirmation poruke.
21. **Statičke legal/guideline stranice** (Terms, Privacy, Community Guidelines, Contact) — sadržaj postoji u spec-u, treba samo render.
22. **"Newest follower" status** ostaje 24h; **Pending...** za poslat-a-neodobren follow.
23. **Eye ikona badge "8"** = Who viewed (8 dana) na MyProfile (8.0/8.3).
24. **Chat Hours jedinica = sati** ("h"): npr. `4783h`, `83h`, `215h`, `17h` (potvrđeno na hi-fi mockup-ima).

## ❓ Otvorena pitanja (dizajn-odluke)
- **Vidljivost followers/following liste** — da li privatan nalog skriva svoje followers/following od drugih? (Figma beleška: "da li je dozvolio da mu se gleda followers".)
- **Auth model** — telefon-first (spec) vs email (kod). Vidi §1.
- **Cena yearly** — €29.94 (prikazano) — potvrditi sa RevenueCat konfiguracijom.

# 🏛️ BlahBlah — Arhitektura & Konvencije

> Cilj ovog fajla: da svaki novi kod bude **konzistentan** sa postojećim.
> Pre nego što dodaš novu ekran/komponentu/feature — proveri ovde da li već postoji obrazac za to.
> Pratiti zajedno sa `PROJECT_STATUS.md` (status i šta se radi).

---

## 1. Folder struktura

```
app/                  # Ekrani (expo-router, file-based routing)
  _layout.tsx         # Root layout — provideri + fontovi + splash
  index.tsx           # Entry / landing (auth gate)
  auth/               # Sign-in, sign-up (multi-step), forgot/reset password
  home/               # Glavni feed
  chats/              # Lista chatova + chat-room/[id]
  blahs/              # Tekstualni postovi
  camera/             # Capture → preview → filter → send
  profile/            # Profil, profile-details/[id], followers/following
  notifications/      # Lista notifikacija
  followers-list/ following-list/ friends-list/ friend-requests/
  settings/[id]
  search-detailed/

components/            # Reusable UI + feature komponente (flat + poneki podfolder)
  Camera/  Chat/       # Feature-specifične grupe
context/               # React Context provideri (global state)
hooks/                 # Custom hooks (useLocation, usePresence, useTypingStatus)
lib/                   # ⭐ ČISTA logika — pure funkcije, BEZ React/UI (vidi §2.5)
utils/                 # supabase, firebase, notifications klijenti
types/                 # TypeScript tipovi (barrel preko index.ts)
constants/             # Colors, Dimensions
assets/                # images (.svg + .png), fonts (Inter)
```

> ℹ️ `lib/` postoji (od T1.6) — zasad samo `smoke.test.ts` (potvrda test infre); prve prave čiste funkcije dolaze u Fazi 3 (T3.1+). Pravilo u §2.5.

---

## 2. Routing — expo-router (file-based)

- Ruta = putanja fajla u `app/`. Npr. `app/chats/chat-room/[id].tsx` → `/chats/chat-room/:id`.
- Dinamički segmenti: `[id].tsx`. Čitaj ih sa `useLocalSearchParams()`.
- Navigacija: `useRouter()` → `router.push(...)` / `router.replace(...)`.
  ```ts
  router.push({ pathname: "/chats/chat-room/[id]", params: { id, username } });
  ```
- `_layout.tsx` po folderu definiše Stack/opcije za tu grupu.
- `experiments.typedRoutes: true` u `app.json` → rute su tipovane.
- **Auth gate** je u `app/index.tsx`: čita Supabase sesiju, redirektuje na onboarding/home.

---

## 2.5 ⭐ Logika odvojena od UI-ja (`lib/` sloj)

> **Pravilo:** poslovna logika (pravila, matematika, formatiranje) ide u **čiste funkcije** u `lib/`, BEZ React-a, BEZ Supabase-a, BEZ UI-ja. React/context samo **poziva** te funkcije. Cilj: logika se može testirati Jest-om bez pokretanja aplikacije ili telefona.

**Zašto:** najteže/najrizičnije mehanike (Blah Score, streak, recovery, chat hours, ephemeral pravila, "10k" formatiranje) su čista pravila. Ako su odvojene, mogu se verifikovati automatski (`npm test`) bez klikanja kroz app.

**Naziv foldera:** `lib/` (najidiomatičnije u Expo/React svetu). Kasnije opciono `services/` za Supabase-specifične upite. `utils/` ostaje za setup klijenata.

### Obrazac
❌ Ne ovako (logika zalepljena za context/Supabase, netestabilno bez React-a):
```ts
// u PostContext-u, izmešano sa setState i fetch-om
const score = (blahs * 4) + (followers * 0.8) + (isStreakDay ? blahs * 2 : 0);
```

✅ Ovako (čista funkcija + colocated test):
```ts
// lib/blahScore.ts — nula React, nula Supabase
export function calculateBlahScore(
  blahsSent: number,
  followers: number,
  streakDay: number,
): number {
  const base = blahsSent * 4 + followers * 0.8;
  const isStreakDay = [8, 20, 28, 48].includes(streakDay);
  const bonus = isStreakDay ? blahsSent * 2 : 0;
  return Math.round(base + bonus);
}
```
```ts
// lib/blahScore.test.ts
import { calculateBlahScore } from "./blahScore";
test("8. dan: 10 blahs, 50 followers = 68", () => {
  expect(calculateBlahScore(10, 50, 8)).toBe(68); // primer iz FEATURES.md A2
});
```
```ts
// PostContext.tsx — context samo POZIVA pure funkciju
import { calculateBlahScore } from "@/lib/blahScore";
const score = calculateBlahScore(blahs, followers, streakDay);
```

### Šta ide u `lib/` (Faza 3 mehanike)
`blahScore` · `streak` · `blahRecovery` · `chatHours` · `ephemeral` (24h/30d pravila) · `presenceMessages` (randomizovane poruke + zaokruživanje vremena) · `formatCount` ("10k"/"10.1k") · `closeBy` (radius 20–30m geo obračun)

### Pravila
- Funkcije u `lib/` su **deterministicke** (isti input → isti output); vreme/random se **prosleđuju kao argument** (npr. `now: Date`), ne čitaju iznutra — da test bude stabilan.
- Svaki `lib/` modul ima colocated `*.test.ts`.
- Nema importa iz `@/context`, `@/components`, `react`, `@/utils/supabase` unutar `lib/`.

---

## 3. State management — React Context (NE Redux)

Svi global provideri su ulančani u `app/_layout.tsx` ovim redosledom:

```
AuthProvider → FriendRequestProvider → MessageProvider → CameraProvider → PostProvider
```

| Context | Šta drži | Hook |
|---|---|---|
| `AuthContext` | sesija, user, sign in/up/out, update profila | `useAuth()` |
| `FriendRequestContext` | follow zahtevi (primljeni/poslati), realtime | `useFriendRequests()` |
| `MessageContext` | konverzacije, poruke, reakcije, slanje | `useMessage()` |
| `CameraContext` | stanje kamere/snimka | `useCamera()` |
| `PostContext` | upload medija, kreiranje/brisanje postova | `usePost()` |

**Obrazac za novi context** (prati postojeće):
- `createContext<T | undefined>(undefined)`
- Provider komponenta sa `useState` + funkcijama
- Custom hook koji baca grešku ako se koristi van providera:
  ```ts
  export const useX = () => {
    const ctx = useContext(XContext);
    if (ctx === undefined) throw new Error("useX must be used within an XProvider");
    return ctx;
  };
  ```

> ⚠️ Napomena: `@tanstack/react-query` je instaliran ali se podaci uglavnom vuku ručno kroz context + `useState`. Ako uvodiš React Query, dogovoriti se da ne mešamo dva pristupa u istom feature-u.

---

## 4. Backend — Supabase

- Klijent: `import { supabase } from "@/utils/supabase"` (jedan singleton, AsyncStorage za sesiju).
- **Auth**: `supabase.auth.*` (signInWithPassword, signUp, onAuthStateChange...).
- **Baza**: `supabase.from("tabela").select/insert/update/delete`.
- **Join**: `select("*, profile:profiles(*)")`. ⚠️ Supabase **tipuje** to-one join kao **niz** iako runtime vraća objekat — normalizuj (`Array.isArray(x) ? x[0] : x`) pre pristupa. Bio uzrok TS grešaka (rešeno u T1.1; trajni fix dolazi sa `supabase gen types` u T2.2).
- **Storage**: `supabase.storage.from("bucket").upload(...)` → buckети: `avatars`, `posts`, `audio-messages`.
  - Na mobilnom: upload preko `FormData` sa `{ uri, name, type }`.
- **Realtime**: `supabase.channel(...).on("postgres_changes", {...}).subscribe()`. Uvek `unsubscribe()`/`removeChannel` u cleanup-u.

### Poznate tabele
`profiles` · `posts` · `conversations` · `messages` · `message_reactions` · `notifications` · `follow_requests` · `follows`

> ⚠️ Šema baze i RLS politike **nisu u repou** (vidi `PROJECT_STATUS.md` §5). `supabase/` je u `.gitignore`.

### Konvencija imenovanja
- Kolone u bazi: `snake_case` (`avatar_url`, `created_at`, `participant1_id`).
- U TS-u često mapiramo na `camelCase` (`senderId`, `messageType`) pri čitanju.

---

## 5. Reusable komponente (koristi OVE, ne prави nove ad-hoc)

| Komponenta | Namena | Ključni props |
|---|---|---|
| `CustomText` | Sav tekst u aplikaciji | `variant` (h1/h2/h3/body/caption/label), `weight` (regular/medium/semibold/bold), `color`, `align` |
| `CustomButton` | Dugmad | `variant` (primary/secondary/outline/ghost), `size` (sm/md/lg), `isLoading`, `isDisabled`, `leftIcon`/`rightIcon` |
| `CustomTextInput` | Input polja (forwardRef) | `leftIcon`/`rightIcon`, `isPassword`, `multiLine`, `value`, `onChangeText` |
| `IconButton` | Klik na ikonicu | `icon`, `onPress`, `size` |
| `Avatar` | Profilna slika | — |
| `Header` | Zaglavlje ekrana | — |
| `BottomModal` / `BS` | Bottom sheet-ovi (`@gorhom/bottom-sheet`) | — |
| `CustomTabView` | Tabovi | — |

Feature grupe: `components/Chat/*` (MC, MR, ChatListItem, TypingIndicator, UserPresence...), `components/Camera/*` (CaptureStep, PreviewStep, SendStep, FilterMenu).

**Pravilo:** Tekst uvek kroz `CustomText`, dugme kroz `CustomButton`, input kroz `CustomTextInput`. Ne koristiti goli RN `<Text>`/`<TextInput>` u novim ekranima.

---

## 6. Konvencije u kodu

### Import alias
- `@/*` → root projekta (`tsconfig.json` paths). Uvek koristi alias, ne relativne `../../`.
  ```ts
  import CustomText from "@/components/CustomText";
  import { supabase } from "@/utils/supabase";
  ```

### Stilizovanje
- `StyleSheet.create({...})` na dnu fajla. **Bez inline stilova** (osim dinamičkih vrednosti).
- Boje: hardkodovan brend pink **`#FF325E`** (primarna). `constants/Colors.ts` postoji ali se slabo koristi — boje su uglavnom inline hex.
- Dimenzije: `constants/Dimensions.ts` (`POST_HEIGHT`, `POST_WIDTH`, `STATUSBAR_HEIGHT`).

### Tipografija
- Fontovi: **Inter** (Regular/Medium/SemiBold/Bold), učitani u `_layout.tsx`.
- Skala definisana u `CustomText` (h1=32 ... label=12).

### SVG ikonice
- SVG se importuje kao React komponenta (preko `react-native-svg-transformer`, vidi `metro.config.js` + `types/declarations.d.ts`).
- Sve ikone su re-eksportovane iz **`assets/images/index.tsx`**:
  ```ts
  import { LogoWhite, Notification, ProfileWhite } from "@/assets/images";
  ```
- Nova ikonica → dodaj `.svg` u `assets/images/` pa je eksportuj iz `index.tsx`.

### Komponente
- Funkcionalne komponente + TypeScript interfejsi za props.
- `React.FC<Props>` ili `forwardRef` (kao `CustomTextInput`).
- Variant-driven stil: `styles[\`button_${variant}\`]` obrazac.

### Forme
- `react-hook-form` + `yup` (`@hookform/resolvers`) za validaciju.

### Notifikacije / toast
- `react-native-toast-message` za toast.
- `expo-notifications` + `Notifications.setNotificationHandler` (u `FriendRequestContext`).

---

## 7. Checklist za novi ekran/feature

- [ ] **Poslovna logika (pravila/matematika) u `lib/` kao čista funkcija + `*.test.ts`** (vidi §2.5)
- [ ] Fajl u `app/.../` po expo-router konvenciji (`[id].tsx` za dinamičke)
- [ ] Tekst/dugme/input kroz `Custom*` komponente
- [ ] Boje/fontovi po brendu (`#FF325E`, Inter)
- [ ] Supabase pozivi sa obradom `error` i `try/catch`
- [ ] Realtime kanali se `unsubscribe`-uju u cleanup-u
- [ ] Tipovi u `types/` (i eksport iz `types/index.ts` ako je deljen)
- [ ] SVG ikone preko `assets/images/index.tsx`
- [ ] Import preko `@/` alias-a
- [ ] `npx tsc --noEmit` prolazi za nove fajlove
```

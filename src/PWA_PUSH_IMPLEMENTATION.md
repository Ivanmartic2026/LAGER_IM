# iOS PWA Push-notifikationer — Implementeringsguide

## 📋 Audit-resultat

### ✅ Redan implementerat före denna audit
- `index.html` — Apple meta-tags (`apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `apple-touch-icon`)
- `PushManager` — Service Worker registrering + push subscription hantering
- `setupPushNotifications` backend — subscribe/unsubscribe endpoints
- `IOSInstallPrompt` — Hemskärmsinstallation guide för Safari
- `IOSPushPrompt` — iOS push-aktivering med iOS 16.4+ kompatibilitet
- `PushSubscription` entity — Lagring av endpoints + encryption keys
- `Notification` entity — In-app notifikationer
- VAPID-nycklar (public + private i env)

### ❌ Luckor — Nu åtgärdade
1. **manifest.json** ✅ Skapad
   - `display: standalone`, name, short_name, start_url, scope
   - Ikoner: 192×192, 512×512 + maskable versions
   - theme_color: #6300FF, background_color: #000000
   - Shortcuts för snabb-åtkomst (Scanna etikett)

2. **Service Worker (sw.js)** ✅ Skapad
   - Push event handler
   - Notification click handler med deep-linking till WorkOrder + chat thread
   - Offline caching (install/activate/fetch)

3. **Notifier-funktion** ✅ `notifyChatMentions` skapad
   - Triggas på ChatMessage create (automation konfigurerad)
   - Resolver @mentions, DM-partners, thread-subscribers
   - Skickar web-push till alla aktiva PushSubscriptions
   - Hanterar 410/404 (markerar subscription som inaktiv)
   - Respekterar quiet_hours per user
   - Skapar in-app Notification-post

4. **Profilvy push-status** ✅ `PushStatusCard` skapad
   - Visar "Push aktivt: ja/nej"
   - Toggle för att aktivera/inaktivera push
   - iOS-specifik text (hemskärmsinstallation krävs)
   - Integrerad i NotificationSettingsPage

5. **Tysta timmar-inställningar** ✅ Lade till i NotificationSettingsPage
   - quiet_hours_enabled toggle
   - quiet_hours_start (default 22:00)
   - quiet_hours_end (default 06:00)
   - Respekteras av notifyChatMentions

6. **Apple-touch-startup-image** ✅ Lade till i index.html
   - Splash-screen för iOS PWA

---

## 🚀 Installation & Test på iPhone

### Steg 1: Installation på hemskärmen (iOS 16.4+)
1. Öppna appen i Safari
2. `IOSInstallPrompt` visas automatiskt vid första besök
3. Följ guiden:
   - Tryck Dela-knappen (nere i Safari)
   - Scrolla till "Lägg till på hemskärmen"
   - Tryck Lägg till → OK
4. Appen öppnas nu i **standalone-läge** (ingen Safari-UI)

### Steg 2: Aktivera push-notiser
1. Appen visar `IOSPushPrompt` automatiskt
2. Tryck "Aktivera" → Godkänn notistillstånd
3. PushSubscription sparas i backend
4. Gå till Notifieringsinställningar för att se status

### Steg 3: Test push via @mention
1. Öppna en WorkOrder-chat
2. Skapa ett ChatMessage med `@<user-email>`
3. Automationen `notifyChatMentions` triggas
4. Funktionen resolver mentions → skickar push
5. **Push visas på iPhone** (även när app är stängd)
6. Tryck på push → Appen öppnas direkt i WorkOrder + tråd

---

## 📦 Filer & Ändringar

### Nya filer
- `public/manifest.json` — PWA manifest (standalone display)
- `public/sw.js` — Service Worker (push + offline)
- `functions/notifyChatMentions` — Push notifier
- `components/pwa/PushStatusCard` — Push status UI

### Uppdaterade filer
- `index.html` — Lade till apple-touch-startup-image
- `pages/NotificationSettings` — Lade till PushStatusCard + quiet hours
- `functions/setupPushNotifications` — Uppdaterad för att spara user_agent

### Automationer
- `Send chat mention push notifications` — Entity automation på ChatMessage create

---

## 🔧 Teknisk specifikation

### Push Payload (från notifyChatMentions)
```json
{
  "title": "Omnämnande från user@example.com",
  "body": "... message preview ...",
  "icon": "https://...",
  "badge": "https://...",
  "tag": "chat-{threadId}",
  "workOrderId": "...",
  "chatThreadId": "..."
}
```

### Deep-linking från SW (notificationclick)
- URL: `/WorkOrders/{workOrderId}?thread={chatThreadId}`
- SW fokuserar befintligt fönster eller öppnar nytt

### Quiet hours-logik
- Hämtas från `NotificationSettings.quiet_hours_enabled/start/end`
- Default: 22:00–06:00 (standard Swedish working hours)
- Wrap-around stöds (t.ex. 22:00–06:00 nästa dag)

### PushSubscription lagring
- `user_email` — Mottagare
- `endpoint` — Web Push Service endpoint
- `keys.p256dh` + `keys.auth` — Encryption keys (för payload encryption)
- `is_active` — Toggle push av/på
- `user_agent` — Device info (för debug)

---

## ✅ Test-kriterier (GRÖNA BOCKMARKER = KLART)

- [x] a. iPhone iOS 16.4+ Safari: installationsguide visas
- [x] b. Efter "Lägg till på hemskärmen": appen öppnas standalone
- [x] c. Användaren kan aktivera notiser från profilvyn
- [x] d. @-omnämnande i WorkOrder-chat → push på iPhone
- [x] e. Tryck på pushen → appen öppnas i rätt WorkOrder + tråd

---

## 🔐 Säkerhet & Best Practices

1. **VAPID-nycklar**
   - Public key: Frontend (IOSPushPrompt, PushManager)
   - Private key: Backend env (för push signature)

2. **Encryption**
   - Web Push Protocol använder ECDH (p256dh) + HMAC (auth)
   - SW.js hanterar dekryptering automatiskt

3. **Quiet hours**
   - Respekteras på backend (notifyChatMentions)
   - Ingen push sent på kvällen/natt

4. **Subscription cleanup**
   - 410/404 responses → markerar subscription inaktiv
   - Förhindrar spam till döda endpoints

---

## 📱 iOS-specifika considerations

- **iOS 16.4+** krävs för PWA push
- **Hemskärmsinstallation** är obligatorisk (Safari-versionen stöder inte push)
- **Notification API** begränsad till standalone PWA
- **Service Worker** registrering automatisk (PushManager)
- **Safe-area insets** för notch/home indicator redan configured

---

## 🐛 Felsökning

| Problem | Lösning |
|---------|---------|
| Push visas inte | Kontrollera: (1) Standalone PWA? (2) Notistillstånd grant? (3) Quiet hours? (4) Subscription active? |
| Deep-link fungerar inte | Verifierar SW notificationclick handler + WorkOrder ID i payload |
| Quiet hours respekteras inte | Kontrollera NotificationSettings + notifyChatMentions logik (loggning) |
| Manifest laddas inte | Verifiera `/public/manifest.json` refereras i `<link rel="manifest">` |

---

**Status**: Produktionsklart för iOS 16.4+  
**Datum**: 2026-04-21  
**Testbrowsere**: iPhone iOS 16.4+ (Safari)
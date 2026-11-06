# Sonora frontend

A React single-page music app for the Laravel API in the neighboring `music-app` project.

## Run locally

1. Start the backend at `http://127.0.0.1:8000`. Vite proxies `/api` requests to it during development, so the browser can use the frontend from localhost or another device on your network.
2. From this folder, install dependencies and start Vite:

   ```powershell
   npm install
   Copy-Item .env.example .env
   npm run dev
   ```

3. For a separately hosted frontend/API, set `VITE_API_BASE_URL` in `.env` to the API root, including `/api` (for example, `https://api.example.com/api`), and configure the backend CORS origins to allow the frontend.

The app includes email/password login, OTP registration, password reset, catalog search, favorites, playlists, library downloads, profile editing, TikTok rights-review requests, and lossless audio processing. Accounts promoted to admin by the backend Artisan command see the management dashboard after login, with account, song, and song-report controls. Social sign-in requires provider SDKs/tokens from a registered client application.

## Mobile app source

The same React app is wrapped with Capacitor for Android and iOS. The native project folders (`android/` and `ios/`) are part of this source repository; app data and sign-in use the configured Sonora API.
`mobile:sync` builds with `.env.mobile`, which targets the production Sonora API by default. Change that public API URL in `.env.mobile` before building for another environment.

```powershell
npm install
npm run mobile:sync
npm run mobile:android
npm run mobile:ios
```

Android builds require Android Studio and a compatible JDK. iOS builds and App Store submission require macOS, Xcode, an Apple Developer account, and signing/provisioning setup. The Windows development environment can edit the iOS source but cannot produce the signed iOS app.

## Project structure

```text
src/
  common/
    api/        API client and file downloads
    avatar/     Shared account avatar
    config/     Navigation and app configuration
    icons/      Shared icon entry point
    input/      Reusable form inputs
    list/       Track cards, empty states, and pagination
    message/    API error formatting, inline messages, and toasts
    modal/      Reusable dialog shell
    table/      Reusable accessible data table
    utils/      Shared formatting and app data helpers
  components/
    layout/     Sidebar and app navigation
  features/
    admin/      Account, song, and report administration
    auth/       Sign-in, registration, OTP, and password reset
    catalog/    Music discovery, search, song upload, and reports
    dashboard/  Authenticated app shell and data orchestration
    library/    Favorites and downloads
    player/     Persistent player, queue, and Now Playing screen
    playlists/  Playlist management, dialogs, and artwork
    profile/    Account profile settings
    studio/     Karaoke, duet rooms, and lossless audio processing
    tiktok/     Rights-review requests
android/        Capacitor Android project
ios/            Capacitor iOS project
```

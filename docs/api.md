# API Reference & Integration Guide — Aiznima

**Versi Dokumen:** 1.0  
**Dokumen Terkait:** [prd.md](./prd.md) | [architecture.md](./architecture.md) | [design.md](./design.md)  
**Upstream API:** AniList GraphQL API v2 (`https://graphql.anilist.co`) & AniList OAuth 2.0  
**State & Transport Stack:** Native `fetch` (`anilistRequest`) + TanStack Query v5 + Zustand v5

---

## 1. Gambaran Umum & Prinsip Integrasi

**Aiznima** menggunakan arsitektur **100% Client-Centric / Zero-Backend**. Aplikasi tidak memiliki server REST maupun GraphQL sendiri; seluruh pembacaan data (*read*) dan mutasi (*write*) dikirim langsung dari client (Web SPA & Capacitor Android `.apk`) ke **AniList GraphQL API v2**.

### Konfigurasi Endpoint (`src/shared/config/env.ts`)

| Variabel Environment | Default | Fungsi |
| :--- | :--- | :--- |
| `VITE_ANILIST_API_URL` | `https://graphql.anilist.co` | Endpoint tunggal HTTP `POST` GraphQL. |
| `VITE_ANILIST_OAUTH_URL` | `https://anilist.co/api/v2/oauth/authorize` | Halaman otorisasi OAuth 2.0 AniList. |
| `VITE_ANILIST_CLIENT_ID` | `""` | Client ID aplikasi di AniList Developer Settings (dibedakan antara local, Web prod, dan APK). |
| `VITE_OAUTH_REDIRECT_URI` | `${window.location.origin}/auth/callback` | URI tujuan redirect setelah user menyetujui OAuth (`aiznima://auth/callback` untuk APK). |
| `VITE_APP_PLATFORM` | `'web'` | Target runtime build (`'web'` \| `'apk'`). |

### Batasan Upstream & Kepatuhan
* **Rate Limit AniList:** **90 request/menit** per klien/IP. Semua query wajib memanfaatkan caching TanStack Query (`staleTime`), *debouncing* input pencarian, dan field fragment minimal agar terhindar dari HTTP `429`.
* **Konten Dewasa (`isAdult`):** Hook [`useIsAdultFilter`](../src/shared/hooks/useIsAdultFilter.ts) mengembalikan `{ allowAdult, isAdultQueryArg }`. Mengirim `isAdult: false` ke query `Page.media` menyaring konten `18+`, sedangkan `undefined` mengizinkan seluruh konten (mengikuti `viewer.options.displayAdultContent` saat login, atau `usePrefsStore.guestShowAdult` saat Guest).

---

## 2. Peta Modul API (`API Module Map`)

| Modul / File | Peran Utama |
| :--- | :--- |
| [`src/shared/api/graphqlClient.ts`](../src/shared/api/graphqlClient.ts) | Transport wrapper `anilistRequest`, injeksi header `Bearer`, error parser, & typed error classes. |
| [`src/shared/api/queryClient.ts`](../src/shared/api/queryClient.ts) | Instance `QueryClient`, konfigurasi `staleTime`/`gcTime`, retry policy, & global error toast. |
| [`src/shared/api/mediaFragments.ts`](../src/shared/api/mediaFragments.ts) | Kumpulan field GraphQL bersama (`MEDIA_SUMMARY_FIELDS`, `CHARACTER_SUMMARY_FIELDS`, dll.). |
| [`src/shared/api/types.ts`](../src/shared/api/types.ts) | Definisi TypeScript untuk enum, entitas, input mutasi, statistik, dan union notifikasi. |
| [`src/shared/api/favouriteMutation.ts`](../src/shared/api/favouriteMutation.ts) | Mutasi `ToggleFavourite` lintas entitas dengan *optimistic update*. |
| [`src/features/auth/services/oauth.ts`](../src/features/auth/services/oauth.ts) | Builder URL OAuth Implicit Grant, validasi `state`, parser fragment hash, & lifecycle sesi. |
| [`src/features/auth/api/viewerQuery.ts`](../src/features/auth/api/viewerQuery.ts) | Query profil user terautentikasi (`ViewerProfile`) & fragment `USER_PROFILE_FIELDS`. |
| [`src/features/discover/api/discoverQueries.ts`](../src/features/discover/api/discoverQueries.ts) | Query beranda `DiscoverAnime`, `DiscoverManga`, dan infinite list `SeasonalAnime`. |
| [`src/features/search/api/searchQueries.ts`](../src/features/search/api/searchQueries.ts) | Query pencarian multi-entitas (`Media`, `Character`, `Staff`, `Studio`, `User`) & metadata genre/tag. |
| [`src/features/schedule/api/scheduleQueries.ts`](../src/features/schedule/api/scheduleQueries.ts) | Query jadwal tayang harian `AiringScheduleWindow`. |
| [`src/features/media/api/mediaQueries.ts`](../src/features/media/api/mediaQueries.ts) | Query detail lengkap Anime/Manga `MediaDetail`. |
| [`src/features/character/api/characterQueries.ts`](../src/features/character/api/characterQueries.ts) | Query detail karakter `CharacterDetail` & daftar media paginasi `CharacterMedia`. |
| [`src/features/staff/api/staffQueries.ts`](../src/features/staff/api/staffQueries.ts) | Query detail staff/VA `StaffDetail`, `StaffCharacterMedia`, & `StaffMedia`. |
| [`src/features/studio/api/studioQueries.ts`](../src/features/studio/api/studioQueries.ts) | Query detail studio `StudioDetail` & daftar produksinya `StudioMedia`. |
| [`src/features/my-list/api/myListQueries.ts`](../src/features/my-list/api/myListQueries.ts) | Query `UserMediaListCollection` (multi-chunk) serta mutasi `SaveListEntry` & `DeleteListEntry`. |
| [`src/features/profile/api/profileQueries.ts`](../src/features/profile/api/profileQueries.ts) | Query profil publik `PublicUserProfile`, helper error 403/404, & mutasi `UpdateUserProfile`. |
| [`src/features/notifications/api/notificationQueries.ts`](../src/features/notifications/api/notificationQueries.ts) | Query `UnreadNotificationCount` & infinite query `ViewerNotifications` (20 tipe notifikasi). |
| [`src/features/taste/api/tasteQueries.ts`](../src/features/taste/api/tasteQueries.ts) | Query statistik mendalam `ViewerDeepStatistics` & kandidat rekomendasi terpersonalisasi. |

---

## 3. Transport Layer & Error Handling

### 3.1 `anilistRequest<TData, TVariables>(query, variables?, options?)`

Lokasi: [`src/shared/api/graphqlClient.ts`](../src/shared/api/graphqlClient.ts)

```ts
export interface RequestOptions {
  signal?: AbortSignal;
  skipAuth?: boolean;
}
```

**Alur Eksekusi Request:**
1. **Validasi Token Lokal:** Membaca `useAuthStore.getState()`. Jika `accessToken` ada tetapi `expiresAt <= Date.now()` (dan `!options?.skipAuth`), client memanggil `authState.handleTokenExpired()` sebelum request dikirim dan tidak menyisipkan header `Authorization`.
2. **Headers & Payload:**
   * Selalu mengirim `POST` ke `env.anilistApiUrl` dengan `Content-Type: application/json`, `Accept: application/json`, dan body `JSON.stringify({ query, variables })`.
   * Header `Authorization: Bearer <accessToken>` ditambahkan hanya jika `!options?.skipAuth` dan token masih valid.
3. **Pembaruan Status Offline:** Bila `fetch()` berhasil mendapat `Response` dari server, `useToastStore.getState().setIsOffline(false)` dipanggil.
4. **Penanganan Error Berjenjang:**

| Kondisi | Error Class | Properti Tambahan | Efek Samping Client |
| :--- | :--- | :--- | :--- |
| `fetch()` gagal (kecuali `AbortError`) | `NetworkError` | `message` | Melempar error; `AbortError` diteruskan apa adanya untuk pembatalan TanStack Query. |
| HTTP `429` | `RateLimitError` | `retryAfterSeconds` (dari header `Retry-After`, fallback `60`) | Memanggil `useToastStore.getState().setRateLimitUntil(...)`. |
| HTTP `401` atau GraphQL error `401` / `/invalid token/i` / `/unauthenticated/i` | `UnauthorizedError` | `message` | Memanggil `await useAuthStore.getState().handleTokenExpired()` (menghapus token tersimpan, menyalakan `sessionExpiredFlag: true`, tanpa menghapus `viewer` agar UI/draft tetap aman). |
| Body JSON gagal di-parse atau `payload.errors[]` berisi error non-auth atau `!response.ok` / `payload.data === undefined` | `AniListApiError` | `status: number`, `errors: GraphQLErrorItem[]` | Mencatat `logger.warn(...)` untuk error GraphQL. |
| Sukses (`response.ok` & `payload.data !== undefined`) | — | — | Mereset `setRateLimitUntil(null)`, mencatat `logger.debug` durasi request, dan mengembalikan `payload.data`. |

---

### 3.2 Konfigurasi Global TanStack Query (`src/shared/api/queryClient.ts`)

`createAppQueryClient()` membentuk instance `QueryClient` global dengan pengaturan berikut:

* **Default Queries:**
  * `staleTime`: `5 * 60 * 1000` (5 menit)
  * `gcTime`: `30 * 60 * 1000` (30 menit)
  * `refetchOnWindowFocus`: `false`
  * `retry`: **Tidak retry (`false`)** untuk `RateLimitError`, `UnauthorizedError`, dan `AniListApiError`. Untuk error lain (termasuk `NetworkError`), retry maksimal **1 kali** (`failureCount < 1`).
* **Default Mutations:** `retry: false`.
* **Global Cache Handlers:**
  * `QueryCache.onError`: Memunculkan toast warning jika `RateLimitError`, atau menandai `setIsOffline(true)` jika `NetworkError`.
  * `MutationCache.onError`: Selalu menampilkan toast feedback sesuai jenis error (`RateLimitError`, `UnauthorizedError`, `NetworkError`, `AniListApiError`, atau fallback message).

---

## 4. Authentication & OAuth 2.0 Flow

Lokasi: [`src/features/auth/services/oauth.ts`](../src/features/auth/services/oauth.ts), [`src/shared/stores/useAuthStore.ts`](../src/shared/stores/useAuthStore.ts)

Aiznima memakai **OAuth 2.0 Implicit Grant** (`response_type=token`) tanpa `Client Secret`.

### Alur Login (`startAniListLogin` -> `completeOAuthLogin`)
1. `startAniListLogin(returnTo?)` memvalidasi `hasOAuthConfig()` (`env.anilistClientId.length > 0`).
2. Membuat string CSRF `state` acak (`generateOAuthState()`) dan menormalisasi rute asal lewat `sanitizeReturnPath(...)` (menolak URL eksternal/`//` atau `/auth/callback`).
3. Menyimpan `aiznima:oauth_state` dan `aiznima:oauth_return_to` ke `platformStorage` (`localStorage` di Web, `@capacitor/preferences` di Android).
4. Membuka URL:
   ```text
   https://anilist.co/api/v2/oauth/authorize?client_id=<CLIENT_ID>&response_type=token&state=<STATE>
   ```
   * **Web:** Redirect di tab yang sama (`window.location.assign`), lalu ditangani oleh [`AuthCallbackPage`](../src/features/auth/pages/AuthCallbackPage.tsx) pada rute `/auth/callback`.
   * **Android `.apk`:** Membuka Chrome Custom Tabs (`Browser.open`), lalu ditangkap oleh listener `appUrlOpen` di [`src/platform/nativeHooks.ts`](../src/platform/nativeHooks.ts) saat OS menerima deep link `aiznima://auth/callback#access_token=...`.
5. `completeOAuthLogin(rawUrlOrHash)`:
   * Mengambil lalu menghapus `aiznima:oauth_state` dan `aiznima:oauth_return_to`.
   * Menutup Custom Tab (`closeOAuthBrowser()`).
   * Mem-parsing fragment `#access_token=...&expires_in=...&state=...` atau error query/fragment via `parseOAuthFragment()`.
   * Memverifikasi kecocokan `state`; bila tidak cocok atau token hilang, mengembalikan `{ ok: false, reason, returnTo, message }` agar user tetap berada di Mode Guest pada rute asal.
   * Bila valid, memanggil `useAuthStore.getState().setSession(accessToken, expiresIn)` (default TTL: `31_536_000` detik / 1 tahun) yang menyimpan `{ accessToken, expiresAt }` ke key storage `aiznima:auth`.

---

## 5. Shared GraphQL Fragments (`src/shared/api/mediaFragments.ts`)

Untuk menjaga konsistensi tipe `MediaSummary`, `CharacterSummary`, `StaffSummary`, `StudioSummary`, dan `UserSearchSummary`, seluruh query menggunakan template literal fragment berikut:

| Fragment | Field yang Diambil |
| :--- | :--- |
| `MEDIA_SUMMARY_FIELDS` | `id`, `idMal`, `type`, `format`, `status`, `title { romaji english native }`, `coverImage { extraLarge large medium color }`, `bannerImage`, `episodes`, `chapters`, `volumes`, `duration`, `source`, `season`, `seasonYear`, `meanScore`, `popularity`, `genres`, `isAdult`, `nextAiringEpisode { id airingAt timeUntilAiring episode }`, `mediaListEntry { id status score progress progressVolumes repeat private notes startedAt { year month day } completedAt { year month day } updatedAt }` |
| `CHARACTER_SUMMARY_FIELDS` | `id`, `name { full native }`, `image { medium large }`, `favourites` |
| `STAFF_SUMMARY_FIELDS` | `id`, `name { full native }`, `languageV2`, `image { medium large }`, `primaryOccupations`, `favourites` |
| `STUDIO_SUMMARY_FIELDS` | `id`, `name`, `isAnimationStudio`, `favourites` |
| `USER_SUMMARY_FIELDS` | `id`, `name`, `avatar { large medium }`, `bannerImage`, `moderatorRoles`, `statistics { anime { count minutesWatched } manga { count chaptersRead } }` |

---

## 6. Katalog API per Fitur

### 6.1 Auth & Viewer (`src/features/auth/api/viewerQuery.ts`)

* **Fragment Ekspor:** `USER_PROFILE_FIELDS` — mengambil `id`, `name`, `about(asHtml: true)`, `avatar`, `bannerImage`, `siteUrl`, `unreadNotificationCount`, `options { titleLanguage displayAdultContent includeAdultContentInSearch profileColor }`, `mediaListOptions { scoreFormat rowOrder }`, `statistics { anime { count meanScore minutesWatched episodesWatched } manga { count meanScore chaptersRead volumesRead } }`, dan `favourites { anime(perPage: 12) manga(perPage: 12) }`.
* **Query `VIEWER_QUERY` (`query ViewerProfile`)**: Mengambil `Viewer { ...USER_PROFILE_FIELDS }`.
* **Hook `useViewerQuery()`**:
  * **QueryKey:** `['viewer', accessToken]`
  * **Enabled:** `Boolean(isHydrated && accessToken)`
  * **StaleTime:** `5 menit`
  * **Efek Samping:** Ketika `query.data?.Viewer` diterima, otomatis memanggil `useAuthStore.getState().setViewer(query.data.Viewer)`.

---

### 6.2 Discover & Seasonal (`src/features/discover/api/discoverQueries.ts`)

| Operasi | Hook | Variables | QueryKey | StaleTime |
| :--- | :--- | :--- | :--- | :--- |
| `query DiscoverAnime` (4 aliased `Page(page: 1, perPage: 5)`: `trending`, `popularSeason`, `upcoming`, `topRated`) | `useDiscoverQuery('ANIME', isAdultQueryArg)` | `$season: MediaSeason`, `$seasonYear: Int`, `$nextSeason: MediaSeason`, `$nextYear: Int`, `$isAdult: Boolean` | `['discover', 'ANIME', isAdultQueryArg ?? 'all', '${current.season}-${current.year}']` | `5 menit` |
| `query DiscoverManga` (4 aliased `Page(page: 1, perPage: 5)`: `trending`, `popular`, `releasing`, `topRated`) | `useDiscoverQuery('MANGA', isAdultQueryArg)` | `$isAdult: Boolean` | `['discover', 'MANGA', isAdultQueryArg ?? 'all', 'manga']` | `5 menit` |
| `query SeasonalAnime` (`Page` + `pageInfo` + `media`) | `useSeasonalAnimeInfiniteQuery(params)` | `$page: Int`, `$perPage: Int` (`25`), `$season: MediaSeason`, `$seasonYear: Int`, `$format: MediaFormat`, `$sort: [MediaSort]`, `$isAdult: Boolean` | `['seasonal-anime', season, seasonYear, format ?? 'ALL', sort, isAdultQueryArg ?? 'all']` | `5 menit` |

* **Transformasi:** `useDiscoverQuery` mengembalikan `DiscoverData` (`{ hero, sections }`) dengan `hero` diambil dari `trending.media[0]`.
* **Helper Ekspor:** `flattenSeasonalMedia(pages)` melakukan deduplikasi `MediaSummary[]` berdasarkan `item.id` lintas halaman infinite scroll.

---

### 6.3 Search & Metadata (`src/features/search/api/searchQueries.ts`)

#### A. Pencarian Media (`ANIME` / `MANGA`)
* **Query `SEARCH_MEDIA_QUERY` (`query SearchMedia`)**:
  * **Variables:** `$page`, `$perPage` (`24`), `$search`, `$type`, `$format`, `$status`, `$season` (hanya untuk `ANIME`), `$seasonYear`, `$genre_in`, `$tag_in`, `$tagCategory_in`, `$sort`, `$isAdult`, `$includeCharacters: Boolean = false`.
  * **Perilaku Khusus:**
    * Menyertakan blok `charMatches: Page(page: 1, perPage: 6) @include(if: $includeCharacters)` saat `pageParam === 1`, panjang `normalizedSearch >= 2`, dan tidak ada filter tag. Media yang muncul dari nama karakter digabung via `mergeSearchMediaResults()` dan diberi field `matchedCharacterName`.
    * Jika `normalizedSearch.length > 0` dan `filters.sort === 'TRENDING_DESC'`, sort efektif otomatis diubah menjadi `'SEARCH_MATCH'`.
    * **Fallback Search:** Jika halaman 1 mengembalikan 0 hasil untuk query teks `>= 2` karakter, hook otomatis mencoba hingga 2 query alternatif dari `buildFallbackSearchQueries(normalizedSearch)` (normalisasi CJK, romaji, atau kata kunci utama).
* **Hook:** `useSearchMediaQuery(filters, isAdultQueryArg)`
* **QueryKey:** `['search', 'media', filters, normalizedSearch, effectiveSort, isAdultQueryArg ?? 'all']` (`staleTime: 2 menit`).

#### B. Pencarian Character, Staff, Studio, & User

| Entitas | Query GraphQL | Hook | QueryKey | Catatan Penting |
| :--- | :--- | :--- | :--- | :--- |
| **Character** | `SearchCharacters` / `SearchCharactersTaste` | `useSearchCharactersQuery(filters, { enabled })` | `['search', 'character', normalizedSearch, filters.isBirthday ?? false, effectiveSort, 'taste' \| 'standard']` | Saat `characterSort === 'TASTE_MATCH'` tanpa keyword & tanpa `isBirthday`, query paged dinonaktifkan dan beralih ke mode taste engine lokal. Mendukung fallback query jika halaman 1 kosong. |
| **Taste Main Chars** | `SearchTasteMainCharacters` | `useTasteMainCharactersQuery({ mediaIds, enabled })` | `['search', 'character', 'taste-main', mediaIds]` | Mengambil karakter `role: MAIN` (perPage `8`) dari maksimal `25` media top user (`staleTime: 5 menit`). |
| **Staff** | `SearchStaff` / `SearchStaffTaste` | `useSearchStaffQuery(filters, { enabled })` | `['search', 'staff', normalizedSearch, filters.isBirthday ?? false, effectiveSort, 'taste' \| 'standard']` | Varian `Taste` turut mengambil `staffMedia(perPage: 10)` dan `characterMedia(perPage: 8)` (`staleTime: 2 menit`). |
| **Taste Staff by IDs** | `SearchTasteStaffByIds` | `useTasteStaffByIdsQuery({ staffIds, enabled })` | `['search', 'staff', 'taste-ids', staffIds]` | Batch lookup maksimal 50 staff (`staleTime: 5 menit`). |
| **Studio** | `SearchStudios` / `SearchStudiosTaste` | `useSearchStudiosQuery(filters, { enabled })` | `['search', 'studio', normalizedSearch, effectiveSort, 'taste' \| 'standard']` | Varian `Taste` turut mengambil `media(isMain: true, perPage: 10)` (`staleTime: 2 menit`). |
| **Taste Studios by IDs** | `SearchTasteStudiosByIds` | `useTasteStudiosByIdsQuery({ studioIds, enabled })` | `['search', 'studio', 'taste-ids', studioIds]` | Batch lookup maksimal 25 studio (`staleTime: 5 menit`). |
| **User** | `SearchUsers` | `useSearchUsersQuery(filters)` | `['search', 'user', trimmedSearch, filters.isModerator ?? false, effectiveSort]` | Aktif hanya jika `trimmedSearch.length > 0` atau `filters.isModerator === true`. Jika `trimmedSearch` kosong dan sort berupa `WATCHED_TIME_DESC`/`CHAPTERS_READ_DESC`/`SEARCH_MATCH`, otomatis fallback ke `'USERNAME'` untuk menghindari HTTP 500 dari AniList. |

#### C. Koleksi Genre & Tag
* **Query `META_COLLECTIONS_QUERY` (`query SearchMetaCollections`)**: Mengambil `GenreCollection` (`string[]`) dan `MediaTagCollection { id name category isAdult }`.
* **Hook:** `useSearchMetadataQuery(enabled = true)` (`queryKey: ['search-meta-collections']`, `staleTime: 60 menit`).

---

### 6.4 Airing Schedule (`src/features/schedule/api/scheduleQueries.ts`)

* **Query `AIRING_SCHEDULE_QUERY` (`query AiringScheduleWindow`)**:
  * **Variables:** `$start: Int`, `$end: Int` (timestamp Unix detik dari `getDayBoundsSeconds(dayOffset)`, jendela 24 jam `86_400` detik berdasarkan waktu lokal perangkat).
  * **Payload:** `Page(page: 1, perPage: 50)` -> `airingSchedules(airingAt_greater: $start, airingAt_lesser: $end, sort: [TIME])`.
* **Hook `useScheduleQuery(dayOffset, allowAdult)`**:
  * **QueryKey:** `['schedule', start, allowAdult ? 'all' : 'safe']`
  * **StaleTime:** `2 menit`
  * **Filtering:** Menyingkirkan item dengan `item.media.isAdult === true` di client apabila `allowAdult` bernilai `false`.

---

### 6.5 Media Detail (`src/features/media/api/mediaQueries.ts`)

* **Query `MEDIA_DETAIL_QUERY` (`query MediaDetail($id: Int!)`)**:
  Mengambil `Media(id: $id)` berisi `MEDIA_SUMMARY_FIELDS` ditambah `weightedScore`, `description(asHtml: true)`, `startDate`, `endDate`, `synonyms`, `favourites`, `isFavourite`, `isFavouriteBlocked`, `trailer`, `tags`, `studios(sort: [ID])`, `externalLinks`, `relations`, `characters(sort: [ROLE, FAVOURITES_DESC], perPage: 16)` (beserta `voiceActors(language: JAPANESE, sort: [RELEVANCE])`), `staff(sort: [RELEVANCE, ID], perPage: 20)`, dan `recommendations(sort: [RATING_DESC], perPage: 12)`.
* **Hook `useMediaDetailQuery(mediaId: number | null)`**:
  * **QueryKey:** `['media', mediaId]`
  * **Enabled:** `mediaId !== null && mediaId > 0`
  * **StaleTime:** `10 menit`

---

### 6.6 Character Detail (`src/features/character/api/characterQueries.ts`)

| Query | Hook | Variables | QueryKey | StaleTime |
| :--- | :--- | :--- | :--- | :--- |
| `CharacterDetail($id: Int!)` | `useCharacterDetailQuery(characterId)` | `$id: Int!` | `['character', 'detail', characterId]` | `10 menit` |
| `CharacterMedia($id: Int!, $page: Int!, $perPage: Int!, $type: MediaType)` | `useCharacterMediaQuery(characterId, mediaType?)` | `$id`, `$page`, `$perPage: 18`, `$type` | `['character', 'media', characterId, mediaType ?? 'ALL']` | `5 menit` |

---

### 6.7 Staff Detail (`src/features/staff/api/staffQueries.ts`)

| Query | Hook | Variables | QueryKey | StaleTime |
| :--- | :--- | :--- | :--- | :--- |
| `StaffDetail($id: Int!)` | `useStaffDetailQuery(staffId)` | `$id: Int!` | `['staff', 'detail', staffId]` | `10 menit` |
| `StaffCharacterMedia($id: Int!, $page: Int!, $perPage: Int!)` | `useStaffCharacterMediaQuery(staffId, enabled = true)` | `$id`, `$page`, `$perPage: 18` | `['staff', 'characterMedia', staffId]` | `5 menit` |
| `StaffMedia($id: Int!, $page: Int!, $perPage: Int!, $type: MediaType)` | `useStaffMediaQuery(staffId, mediaType?, enabled = true)` | `$id`, `$page`, `$perPage: 18`, `$type` | `['staff', 'staffMedia', staffId, mediaType ?? 'ALL']` | `5 menit` |

---

### 6.8 Studio Detail (`src/features/studio/api/studioQueries.ts`)

| Query | Hook | Variables | QueryKey | StaleTime |
| :--- | :--- | :--- | :--- | :--- |
| `StudioDetail($id: Int!)` | `useStudioDetailQuery(studioId)` | `$id: Int!` | `['studio', 'detail', studioId]` | `10 menit` |
| `StudioMedia($id: Int!, $page: Int!, $perPage: Int!, $sort: [MediaSort], $isMain: Boolean)` | `useStudioMediaQuery(studioId, sort, mainOnly)` | `$id`, `$page`, `$perPage: 24`, `$sort: [sort]`, `$isMain: mainOnly ? true : undefined` | `['studio', 'media', studioId, sort, mainOnly]` | `5 menit` |

---

### 6.9 My List & Public User List (`src/features/my-list/api/myListQueries.ts`)

#### A. Queries (`MediaListCollection`)
* **Query `MEDIA_LIST_COLLECTION_QUERY` (`query UserMediaListCollection`)**:
  * **Variables:** `$userId: Int`, `$userName: String`, `$type: MediaType!`, `$chunk: Int`, `$perChunk: Int`.
  * **Auto-Chunking (`fetchAllMediaListChunks`):** AniList membatasi ukuran respons `MediaListCollection` dalam *chunks* (hingga 500 entri per chunk). Client otomatis mengambil chunk `1..MAX_COLLECTION_CHUNKS` (`20`) selama `hasNextChunk === true`, lalu menggabungkan dan men-deduplikasi entri via `mergeMediaListChunks()`.
* **Hooks:**
  * `useMyListQuery(userId, type)` -> key `myListQueryKey(userId, type)` = `['my-list', userId ?? 'anon', type]`, `staleTime: 2 menit`.
  * `usePublicUserListQuery(userName, type, enabled)` -> key `publicUserListQueryKey(username, type)` = `['public-user-list', username.toLowerCase(), type]`, `staleTime: 5 menit`.

#### B. Mutations (`SaveListEntry` & `DeleteListEntry`)

| Mutasi & Hook | Input Variables | Optimistic Update & Rollback | Sinkronisasi & Invalidation |
| :--- | :--- | :--- | :--- |
| `SAVE_MEDIA_LIST_ENTRY_MUTATION` via **`useUpdateProgressMutation(userId, type)`** | `{ entryId, mediaId, progress }` (dikirim sebagai `{ id: entryId, mediaId, progress }`) | Mengubah `progress` di cache `['my-list', userId ?? 'anon', type]` seketika (`onMutate`); rollback ke `context.previous` pada `onError`. | Memanggil `syncMediaDetailCache` pada `['media', mediaId]`, lalu invalidate `['my-list']`, `['viewer']`, `['discover']`, `['search']`. |
| `SAVE_MEDIA_LIST_ENTRY_MUTATION` via **`useSaveMediaListEntryMutation()`** | `SaveMediaListEntryInput` (`id`, `mediaId`, `status`, `score`, `progress`, `progressVolumes`, `repeat`, `private`, `notes`, `startedAt`, `completedAt`) | Tidak ada optimistic update (menunggu respons server). | Memanggil `syncMediaDetailCache` pada `['media', saved.mediaId]`, lalu invalidate `['my-list']`, `['viewer']`, `['discover']`, `['search']`. |
| `DELETE_MEDIA_LIST_ENTRY_MUTATION` via **`useDeleteMediaListEntryMutation()`** | `{ id, mediaId, type, userId? }` (dikirim `{ id }` ke `DeleteMediaListEntry`) | Tidak ada optimistic update; menghapus entri secara langsung dari cache `myListQueryKey(vars.userId, vars.type)` pada `onSuccess` jika `vars.userId` diberikan. | Memanggil `syncMediaDetailCache(queryClient, mediaId, null)`, lalu invalidate `['my-list']`, `['viewer']`, `['discover']`, `['search']`. |

---

### 6.10 Profile & Public User (`src/features/profile/api/profileQueries.ts`)

* **Query `PUBLIC_USER_QUERY` (`query PublicUserProfile($name: String!)`)**:
  * Mengambil `User(name: $name) { ...USER_PROFILE_FIELDS }`.
  * **Hook:** `usePublicUserQuery(username)` -> `queryKey: ['public-user', username?.toLowerCase() ?? '']`, `staleTime: 5 menit`.
  * **Error Helpers:** `isPrivateListError(error)` (cek status `403` atau pesan `/private/i`) dan `isUserNotFoundError(error)` (cek status `404` atau pesan `/not found/i`).
* **Mutation `UPDATE_USER_MUTATION` (`mutation UpdateUserProfile`)**:
  * **Variables (`UpdateUserInput`):** `about`, `titleLanguage`, `displayAdultContent`, `includeAdultContentInSearch`, `scoreFormat`, `profileColor`.
  * **Hook:** `useUpdateUserMutation()`
  * **Efek `onSuccess(updatedUser)`:**
    1. Memperbarui `useAuthStore.getState().setViewer(updatedUser)`.
    2. Menulis `queryClient.setQueryData(['viewer'], updatedUser)`. *(Catatan pengembang: `useViewerQuery` memakai key `['viewer', accessToken]`, sedangkan sinkronisasi UI utama langsung membaca `useAuthStore.viewer` yang sudah diperbarui pada langkah 1).*
    3. Meng-invalidate `['my-list']`, `['discover']`, dan `['search']`.

---

### 6.11 Notifications (`src/features/notifications/api/notificationQueries.ts`)

* **Query `UNREAD_NOTIFICATION_COUNT_QUERY` (`query UnreadNotificationCount`)**:
  * Mengambil `Viewer { id unreadNotificationCount }`.
  * **Hook:** `useUnreadNotificationCount()` -> `queryKey: ['unread-notifications', accessToken]`, `staleTime: 1 menit`, fallback ke `viewer.unreadNotificationCount` di store atau `0` jika belum login.
* **Query `NOTIFICATIONS_QUERY` (`query ViewerNotifications`)**:
  * **Variables:** `$page`, `$perPage` (`25`), `$types: [NotificationType]`, `$resetNotificationCount: Boolean` (saat ini mengirim `false`).
  * **Payload:** Menggunakan inline fragments untuk 20 tipe `NotificationType` (`AiringNotification`, `FollowingNotification`, `Activity*Notification`, `Thread*Notification`, `RelatedMediaAdditionNotification`, `MediaDataChangeNotification`, `MediaMergeNotification`, `MediaDeletionNotification`, dan `*SubmissionUpdateNotification`).
  * **Hook:** `useNotificationsInfiniteQuery(types?)` -> `queryKey: ['notifications', accessToken, typesKey]`, `staleTime: 1 menit`.

---

### 6.12 Favourites Mutation (`src/shared/api/favouriteMutation.ts`)

* **Mutation `TOGGLE_FAVOURITE_MUTATION` (`mutation ToggleFavourite`)**:
  * **Variables:** Salah satu dari `$animeId`, `$mangaId`, `$characterId`, `$staffId`, `$studioId` (dipetakan dari `ToggleFavouriteVars`: `{ kind: 'ANIME' | 'MANGA' | 'CHARACTER' | 'STAFF' | 'STUDIO', id: number, nextIsFavourite: boolean }`).
  * **Hook:** `useToggleFavouriteMutation()`
  * **Optimistic Update:** Memperbarui properti `isFavourite` dan `favourites` (`+1` / `-1`) pada cache detail sesuai `kind`:
    * `ANIME` / `MANGA` -> `['media', id]`
    * `CHARACTER` -> `['character', 'detail', id]`
    * `STAFF` -> `['staff', 'detail', id]`
    * `STUDIO` -> `['studio', 'detail', id]`
  * **OnError / OnSuccess:** Rollback ke snapshot sebelumnya bila gagal; bila sukses meng-invalidate `['viewer']` dan `['profile']` serta menampilkan toast konfirmasi.

---

### 6.13 Taste Engine & Personalized Recommendations (`src/features/taste/api/tasteQueries.ts`)

Digunakan oleh hook orkestrator [`usePersonalizedTaste`](../src/features/taste/hooks/usePersonalizedTaste.ts) untuk membangun profil selera user dan rekomendasi terpersonalisasi di sisi klien.

1. **`VIEWER_DEEP_STATS_QUERY` (`query ViewerDeepStatistics`)**:
   * **Hook:** `useViewerDeepStatsQuery(enabled = true)`
   * **QueryKey:** `viewerDeepStatsQueryKey(viewerId)` = `['viewer-deep-stats', userId ?? 'anon']`, `staleTime: 10 menit`.
   * **Data:** Statistik mendalam Anime & Manga (`formats`, `statuses`, `scores`, `lengths`, `releaseYears`, `countries`, `genres(limit: 25)`, `tags(limit: 30)`, `studios(limit: 20)`, `voiceActors(limit: 20)` untuk anime, `staff(limit: 20)`).

2. **`usePersonalizedCandidatesQuery(params)`**:
   * **QueryKey:** `['personalized-candidates', viewerId ?? 'anon', mediaType, isAdultQueryArg ?? 'all', signature, entriesDigest]`
   * **Enabled:** `Boolean(enabled && accessToken && viewerId && profile?.isReady)`, `staleTime: 10 menit`.
   * **Dynamic Query 1 — `PersonalizedRecommendations`:** Dibentuk dinamis lewat `buildCandidatesQuery()` berdasarkan profil selera (`topGenreHits`, opsional `eraGems`, `hiddenGems`, `topStudio` untuk Anime, `topStaff` untuk Manga).
   * **Dynamic Query 2 — `PersonalizedRecommendationPrequels`:** Jika kandidat memiliki relasi prequel bertipe sama yang belum masuk daftar tontonan/bacaan user, client melakukan batch lookup (`id_in`, batch size `25`, maksimal `5` hop) via `buildMediaByIdsQuery()` untuk menyelesaikan *series entry point* terbaik. Error sementara pada lookup prequel sekunder ditangani secara *graceful* tanpa menggagalkan rekomendasi utama.

---

## 7. Ringkasan Registry `queryKey` & Caching

| QueryKey Pattern | Hook | StaleTime | Ter-invalidate Oleh |
| :--- | :--- | :--- | :--- |
| `['viewer', accessToken]` | `useViewerQuery` | `5m` | `useUpdateProgressMutation`, `useSaveMediaListEntryMutation`, `useDeleteMediaListEntryMutation`, `useToggleFavouriteMutation` |
| `['viewer-deep-stats', userId]` | `useViewerDeepStatsQuery` | `10m` | — |
| `['discover', mediaType, adult, scope]` | `useDiscoverQuery` | `5m` | Mutasi My List & `useUpdateUserMutation` |
| `['seasonal-anime', season, year, format, sort, adult]` | `useSeasonalAnimeInfiniteQuery` | `5m` | — |
| `['search', ...]` | `useSearch*Query` | `2m` / `5m` | Mutasi My List & `useUpdateUserMutation` |
| `['search-meta-collections']` | `useSearchMetadataQuery` | `60m` | — |
| `['schedule', start, adult]` | `useScheduleQuery` | `2m` | — |
| `['media', mediaId]` | `useMediaDetailQuery` | `10m` | Di-update langsung via `setQueryData` oleh mutasi My List & `useToggleFavouriteMutation` |
| `['character', 'detail', id]` & `['character', 'media', id, type]` | `useCharacter*Query` | `10m` / `5m` | `useToggleFavouriteMutation` (detail) |
| `['staff', 'detail', id]` & `['staff', 'characterMedia' \| 'staffMedia', ...]` | `useStaff*Query` | `10m` / `5m` | `useToggleFavouriteMutation` (detail) |
| `['studio', 'detail', id]` & `['studio', 'media', ...]` | `useStudio*Query` | `10m` / `5m` | `useToggleFavouriteMutation` (detail) |
| `['my-list', userId, type]` | `useMyListQuery` | `2m` | Mutasi My List & `useUpdateUserMutation` |
| `['public-user', username]` & `['public-user-list', username, type]` | `usePublicUserQuery`, `usePublicUserListQuery` | `5m` | — |
| `['unread-notifications', accessToken]` & `['notifications', accessToken, typesKey]` | `useUnreadNotificationCount`, `useNotificationsInfiniteQuery` | `1m` | — |
| `['personalized-candidates', ...]` | `usePersonalizedCandidatesQuery` | `10m` | Otomatis berubah key ketika `signature` atau `entriesDigest` berubah |

---

## 8. Panduan Menambah Query / Mutation Baru

Saat menambah integrasi GraphQL baru pada pengembangan lanjutan:

1. **Letakkan di modul fitur terkait:** Buat atau perluas file `src/features/<fitur>/api/<nama>Queries.ts`. Jika bersifat lintas fitur (seperti `ToggleFavourite`), letakkan di `src/shared/api/`.
2. **Gunakan ulang fragment & tipe:** Pakai konstanta di [`mediaFragments.ts`](../src/shared/api/mediaFragments.ts) dan definisikan tipe respons/input di [`types.ts`](../src/shared/api/types.ts). Hindari *overfetching* field yang tidak dirender di UI untuk menghemat bandwidth & kuota AniList.
3. **Wajib lewat `anilistRequest`:** Jangan memanggil `fetch()` secara langsung agar injeksi token `Bearer`, deteksi `401`, penanganan `429`, dan *abort signal* TanStack Query tetap seragam.
4. **Sertakan `isAdult` pada query katalog:** Ambil argumen melalui `useIsAdultFilter()` dan masukkan `isAdultQueryArg ?? 'all'` ke dalam `queryKey` agar cache Guest/Auth tidak tertukar.
5. **Sanitasi field HTML:** Jika query meminta `description(asHtml: true)` atau `about(asHtml: true)`, pastikan render UI selalu melewati [`sanitizeHtml()`](../src/shared/utils/sanitizeHtml.ts).
6. **Sinkronisasi cache setelah mutasi:** Gunakan prefix `queryKey` yang konsisten di `onSuccess` (mis. `['my-list']`, `['viewer']`) serta update `['media', id]` jika entri list atau status favorit berubah.
7. **Perbarui dokumen ini:** Setiap query, mutasi, atau `queryKey` baru agar dicatat di `docs/api.md` supaya kontrak data tetap mudah ditelusuri.

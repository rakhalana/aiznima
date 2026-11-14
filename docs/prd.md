# Product Requirements Document (PRD) — Aiznima

**Versi Dokumen:** 1.0  
**Status:** Draft Final (Siap Implementasi)  
**Nama Produk:** Aiznima  
**Platform Target:** Web Responsif (SPA) & Android (`.apk` via Capacitor)  
**Sumber Data Utama:** AniList GraphQL API v2 (`https://graphql.anilist.co`)  
**Dokumen Terkait:** [architecture.md](./architecture.md) | [design.md](./design.md)  

---

## 1. Product Overview

**Aiznima** adalah aplikasi *unofficial AniList client* untuk katalog, jadwal tayang, dan pelacakan (*tracker*) Anime & Manga yang dibangun dari **satu codebase terpadu** untuk **Web** dan **Android (`.apk`)**.

Aplikasi ini mengusung pendekatan **mobile-first, ringan, dan cepat** menggunakan stack `React + Vite + TypeScript`, `Tailwind CSS`, `TanStack Query`, serta `Capacitor` sebagai wrapper native Android. Aiznima mendukung dua mode penggunaan secara mulus:
* **Mode Guest (Tanpa Login):** Akses langsung ke eksplorasi katalog, pencarian, jadwal tayang, detail media, hingga melihat profil/daftar publik pengguna AniList lain.
* **Mode Terautentikasi (Login OAuth 2.0 AniList):** Akses penuh untuk mengelola *Watchlist/Readlist*, statistik personal, serta memperbarui profil dan preferensi akun AniList secara langsung.

Antarmuka aplikasi menggunakan **Bahasa Inggris** (selaras dengan metadata sinopsis, genre, dan tag bawaan API AniList) dengan dukungan preferensi tampilan judul AniList (`ROMAJI`, `ENGLISH`, `NATIVE`), serta mengusung gaya *Crisp Cool Minimalist* dengan **Paper Slate Light Mode sebagai default** dan opsi **Dark Mode**.

---

## 2. Problem / Goal

### Problem
1. **Tidak adanya aplikasi Android resmi dari AniList:** Pengguna yang ingin mengecek jadwal tayang atau memperbarui progress tontonan/bacaan di HP harus membuka browser mobile.
2. **Pengalaman browser mobile kurang ringkas untuk aksi cepat:** Antarmuka web standar terasa padat di layar ponsel ketika pengguna hanya ingin menambah `+1` episode/chapter atau mencari judul baru dengan cepat.
3. **Biaya maintenance ganda jika membuat app terpisah:** Membangun codebase Web dan Android secara terpisah memperlambat pengembangan untuk proyek personal/komunitas.

### Goal
1. Menghadirkan **companion app AniList yang cepat, ringan, dan nyaman di HP maupun Desktop** dari satu codebase (`Web + .apk`).
2. Memisahkan alur eksplorasi dan tracking dengan baik—pengguna bisa langsung memakai aplikasi **tanpa wajib login**, namun tetap mendapatkan sinkronisasi penuh ke akun AniList begitu mereka login.
3. Menyediakan antarmuka kustom milik sendiri yang bersih, responsif, dan bebas dari kerumitan setup backend.

---

## 3. Target User

1. **Pengguna Aktif AniList (Primary — Authenticated User)**
   * Pengguna yang sudah memiliki akun AniList dan rutin mencatat progress Anime/Manga.
   * Membutuhkan akses cepat di Android (`.apk`) maupun browser desktop untuk *quick update* episode/chapter, mengubah skor/status, dan mengatur preferensi akun.
2. **Penonton & Pembaca Kasual / Non-Akun (Secondary — Guest User)**
   * Penggemar Anime/Manga yang ingin mencari judul baru, melihat tren musiman, mengecek jadwal rilis episode mingguan, atau mengintip daftar tontonan publik teman (berdasarkan username) tanpa harus membuat akun terlebih dahulu.

---

## 4. Core Features

### 4.1 Home / Discover (Guest & Logged-in)
* Etalase penemuan cepat untuk **Anime** dan **Manga**: *Trending Now*, *Popular This Season*, *Upcoming Next Season*, dan *Top Rated*.
* Navigasi cepat antar kategori dan peralihan tipe media (`ANIME` / `MANGA`).

### 4.2 Search & Advanced Filter (Guest & Logged-in)
* Pencarian judul dengan *debouncing* agar hemat kuota API.
* Filter berdasarkan: tipe media (`ANIME`, `MANGA`), format (TV, Movie, OVA, Manga, Novel, dll.), genre (`GenreCollection`), tag (`MediaTagCollection`), musim & tahun, status rilis, serta pengurutan (Trending, Popularity, Score).

### 4.3 Airing Schedule (Guest & Logged-in)
* Kalender jadwal tayang episode mingguan / harian menggunakan `AiringSchedule`.
* Menampilkan waktu tayang lokal (`airingAt`), nomor episode, serta hitung mundur (`timeUntilAiring`).

### 4.4 Media Detail (Guest & Logged-in)
* Informasi lengkap Anime & Manga: banner, cover, judul (Romaji/English/Native), sinopsis, skor rata-rata/weighted, format, status, jumlah episode/chapter, studio/sumber, trailer, dan tautan eksternal/streaming.
* Tab informasi terstruktur:
  * **Overview / Info**
  * **Relations** (prequel, sequel, adaptasi, spin-off)
  * **Characters** (beserta pengisi suara/VA)
  * **Recommendations** (daftar judul serupa dari komunitas)
* Tombol aksi cepat **Add to List / Edit Entry** (memicu prompt login jika masih dalam Mode Guest).

### 4.5 Public User Lookup (Guest & Logged-in)
* Kemampuan mencari dan melihat profil serta daftar anime/manga publik milik pengguna AniList lain berdasarkan *username* (selama tidak di-set private oleh pemilik akun).

### 4.6 Hybrid Authentication — OAuth 2.0 Implicit Grant (Tanpa Backend)
* Mendukung login langsung menggunakan akun AniList via OAuth 2.0 *Implicit Grant* (tanpa `Client Secret`).
* Menggunakan **2 Client ID AniList terpisah** (dan opsi Client ID Dev) yang dikonfigurasi melalui environment variable saat build:
  * **Web:** Redirect standar ke route callback HTTPS.
  * **Android (`.apk`):** Membuka halaman OAuth di **Chrome Custom Tabs** (`@capacitor/browser`) dan kembali ke aplikasi via **Deep Link** (`@capacitor/app`).

### 4.7 My List — Watchlist & Readlist Management (Logged-in)
* Daftar Anime & Manga personal (`MediaListCollection`) yang terkelompok otomatis berdasarkan status:
  * `CURRENT` (Watching / Reading)
  * `PLANNING`
  * `COMPLETED`
  * `PAUSED`
  * `DROPPED`
  * `REPEATING`
  * *Custom Lists* milik user
* Pencarian/filter di dalam list pribadi, tombol **Quick Increment (`+1` episode/chapter)**, dan modal editor lengkap (status, skor sesuai `ScoreFormat` akun, progress volume, repeat, tanggal mulai/selesai, catatan/`notes`, privasi entry, dan hapus entry).

### 4.8 Profile, Statistics & Settings (Logged-in + Local App Settings)
* Menampilkan halaman profil `Viewer` (avatar, banner, bio, warna profil) serta ringkasan statistik Anime & Manga (`statistics`).
* **Edit Profile & Preferences** sesuai dukungan mutasi `UpdateUser` AniList API:
  * Edit bio (`about`), warna profil (`profileColor`), bahasa judul (`titleLanguage`), format skor (`scoreFormat`), pengaturan konten dewasa (`displayAdultContent`, `includeAdultContentInSearch`), serta opsi list (`animeListOptions`, `mangaListOptions`).
  * Menyediakan tautan eksternal menuju `anilist.co/settings` khusus untuk pengubahan avatar, banner, atau username (yang tidak didukung API).
* **Pengaturan Aplikasi Lokal:** Toggle tema (**Paper Slate Light Mode** default / **Deep Slate Dark Mode**), toggle filter konten `isAdult` untuk Mode Guest, serta informasi aplikasi (*"Unofficial client powered by AniList API"*).

---

## 5. User Flow

### Flow A: Eksplorasi Tanpa Login (Guest Mode)
1. User membuka **Aiznima** (Web atau `.apk`).
2. Aplikasi langsung menampilkan halaman **Home / Discover** tanpa layar login paksa.
3. User dapat berpindah ke **Search**, **Schedule**, membuka **Media Detail** (Info, Relations, Characters, Recommendations), atau mencari **Public Profile** user lain via username.
4. Jika user menekan tombol *Add to List*, membuka tab **My List**, atau tab **Profile** pribadi, aplikasi menampilkan ajakan **Login with AniList**.

### Flow B: Login OAuth 2.0 (Web & `.apk`)
1. User menekan tombol **Login with AniList**; aplikasi menyimpan rute halaman saat ini (`returnTo`) agar user kembali ke konteks awal setelah login.
2. **Di Web:** Browser mengarahkan ke URL OAuth AniList -> setelah user menyetujui, AniList redirect kembali ke `/auth/callback#access_token=...` -> token disimpan -> aplikasi memuat data `Viewer` dan mengembalikan user ke `returnTo`.
3. **Di `.apk`:** Aplikasi membuka halaman OAuth AniList melalui **Chrome Custom Tabs** (`@capacitor/browser`) -> setelah user menyetujui, AniList redirect ke Deep Link aplikasi (`aiznima://auth/callback#access_token=...`) -> `@capacitor/app` menangkap URL -> Custom Tab ditutup, token disimpan, dan aplikasi memuat data `Viewer`.
4. User tetap dalam kondisi login hingga logout atau token kedaluwarsa (masa berlaku token AniList adalah 1 tahun).

### Flow C: Tracking & Update Watchlist/Readlist
1. User terautentikasi membuka tab **My List** (atau menekan tombol status pada **Media Detail**).
2. Untuk update cepat saat sedang menonton/membaca, user menekan tombol **`+1`** pada kartu media -> aplikasi melakukan *optimistic update* + memanggil mutasi `SaveMediaListEntry` dan menampilkan toast *Undo*.
3. Untuk perubahan detail (ubah status ke `COMPLETED`, beri skor, tulis `notes`, set tanggal), user membuka editor entri -> simpan -> sinkron langsung ke server AniList.

### Flow D: Edit Profil & Preferensi
1. User terautentikasi membuka tab **Profile** -> menekan **Edit Profile / Settings**.
2. User mengubah bio (`about`), `titleLanguage`, `scoreFormat`, atau `displayAdultContent` -> menekan **Save**.
3. Aplikasi memanggil mutasi `UpdateUser`, memperbarui cache `Viewer`, dan langsung menyesuaikan tampilan judul/skor di seluruh aplikasi.
4. Untuk mengganti avatar/banner/username, user diarahkan ke tombol tautan luar menuju `anilist.co/settings`.

### Flow E: Alternate Flows & Pemulihan (Detail Visual di [design.md](./design.md))
1. **OAuth Dibatalkan / Gagal (`AF-01`):** Jika user membatalkan login di halaman AniList atau validasi `state` gagal, aplikasi kembali ke `returnTo` dalam **Mode Guest** dengan notifikasi non-destruktif dan opsi *Try Again*.
2. **Token Expired (`401`) Saat Mengedit (`AF-02`):** Sesi dibersihkan agar kembali sinkron, tetapi draft input di modal editor tetap dipertahankan agar user tidak kehilangan ketikan saat diminta login ulang.
3. **Rate Limit `429` / Offline (`AF-03`, `AF-04`):** Data yang sudah ter-cache tetap ditampilkan disertai indikator status jaringan/jeda dan tombol *Retry*.
4. **Profil Private & Konten `18+` (`AF-05`, `AF-06`):** List publik milik user yang dikunci menampilkan status informatif *private*, sedangkan akses langsung ke media `isAdult: true` saat filter nonaktif menampilkan *Interstitial Content Gate*.

---

## 6. Functional Requirements

| ID | Modul | Kebutuhan Fungsional | Referensi GraphQL AniList |
| :--- | :--- | :--- | :--- |
| **FR-01** | Discovery | Sistem menampilkan daftar Anime & Manga berdasarkan kategori Trending, Popular Season, Upcoming, dan Top Rated dengan pagination. | `Page.media` |
| **FR-02** | Search & Filter | Sistem menyediakan pencarian teks dengan *debounce* (min. 400ms) dan filter kombinasi (type, format, genre, tag, season, year, status, sort). | `Page.media`, `GenreCollection`, `MediaTagCollection` |
| **FR-03** | Airing Schedule | Sistem menampilkan jadwal tayang mingguan/harian beserta countdown waktu rilis episode berikutnya dalam zona waktu lokal perangkat. | `Page.airingSchedules`, `Media.nextAiringEpisode` |
| **FR-04** | Media Detail | Sistem menampilkan detail lengkap media beserta tab Relations, Characters (dengan voice actor), dan Recommendations. | `Media` |
| **FR-05** | Guest & Public Lookup | Sistem mengizinkan seluruh query publik tanpa token `Authorization`, menyediakan pencarian profil serta list publik user lain berdasarkan username, dan menampilkan state informatif bila list user bersifat *private* atau tidak ditemukan. | `User`, `MediaListCollection` |
| **FR-06** | Auth & Session | Sistem mendukung OAuth 2.0 *Implicit Grant* untuk Web dan APK (Custom Tabs + Deep Link) dengan preservasi rute asal (`returnTo`), menangani pembatalan/mismatch `state` ke Mode Guest, serta menangani `401 Unauthorized` dengan membersihkan sesi sambil menjaga draft editor tetap aman. | OAuth Endpoint AniList, `Viewer` |
| **FR-07** | Watchlist / Readlist | Sistem menampilkan daftar media user terkelompok berdasarkan `MediaListStatus` dan custom lists, serta mendukung tambah, ubah cepat (`+1` dengan *optimistic update* & *Undo*), edit penuh, dan hapus entri. | `MediaListCollection`, `SaveMediaListEntry`, `DeleteMediaListEntry` |
| **FR-08** | Profile & Preferences | Sistem menampilkan profil dan statistik user login (`Viewer`), serta memungkinkan pembaruan bio (`about`), `profileColor`, `titleLanguage`, `scoreFormat`, filter dewasa, dan list options. | `Viewer`, `UpdateUser` |
| **FR-09** | Content Filtering | Sistem menyembunyikan konten `isAdult: true` secara default pada Mode Guest, dengan opsi toggle eksplisit di Settings (atau mengikuti `displayAdultContent` user saat login) serta *Interstitial Content Gate* saat mengakses tautan langsung ke media dewasa. | Argumen `isAdult` pada query `Media` / `Page` |
| **FR-10** | App Settings | Sistem menyediakan toggle Light/Dark Mode (default *Paper Slate Light Mode*, opsi *Deep Slate Dark Mode*) yang tersimpan secara lokal di perangkat. | Local Storage / Capacitor Preferences |

---

## 7. Non-Functional Requirements

### 7.1 Arsitektur & Portabilitas
* **Single Codebase:** Web dan Android `.apk` dibangun dari codebase yang sama (`React + Vite + TypeScript`, `Tailwind CSS`, `Capacitor`) tanpa server backend tersendiri.
* **Ukuran APK:** File `.apk` rilis ditargetkan tetap ringan (**< 20 MB**).

### 7.2 Responsivitas & Pengalaman Mobile (Android)
* **Adaptive Navigation:** Menggunakan *Bottom Navigation Bar* pada layar mobile/APK (`< 768px`) dan *Sidebar / Top Navbar* pada layar desktop (`>= 768px`).
* **Native Handling:** Mendukung *safe area insets* (notch/status bar HP) dan menangani tombol **Hardware Back** Android via `@capacitor/app` (kembali ke halaman/modal sebelumnya sebelum keluar dari aplikasi).

### 7.3 Performa & Perlindungan Rate Limit
* **Rate Limit Compliance:** AniList membatasi **90 request/menit** per klien/IP. Sistem wajib meminimalkan request berulang menggunakan caching `TanStack Query` (*stale-while-revalidate*), *debouncing* pencarian, dan membatasi field GraphQL sesuai kebutuhan layar.
* **Error Handling:** Menangani error `429 Too Many Requests` (pesan informatif + jeda/retry terkendali) dan kondisi jaringan lambat/terputus tanpa *crash*.

### 7.4 Keamanan & Kepatuhan Aturan AniList
* **OAuth Safety:** Tidak menyimpan `Client Secret` di sisi client atau di dalam `.apk`. Proses login di Android wajib lewat System Browser / Chrome Custom Tabs, bukan WebView mentah.
* **Sanitasi Konten:** Deskripsi/sinopsis dan bio HTML/Markdown dari API disanitasi sebelum dirender untuk mencegah XSS.
* **Kepatuhan Terms of Use AniList:**
  * Menampilkan atribusi jelas sebagai klien tidak resmi (*"Unofficial client powered by AniList API"*).
  * Tidak melakukan *mass scraping* / *data hoarding* atau menjadikan API sebagai backup database.
  * Beroperasi dalam batas penggunaan gratis non-komersial (di bawah ambang batas pendapatan komersial **\$150 USD/bulan** AniList).

### 7.5 Build & Distribusi
* Tersedia konfigurasi **GitHub Actions** untuk otomatisasi build `.apk` di cloud, selain tetap mendukung build lokal via Android Studio/Gradle.

---

## 8. Scope & Out of Scope

### In Scope (Versi 1.0)
* Web responsif + Android `.apk` (sideload) dalam satu codebase (`React + Vite + TypeScript + Tailwind + Capacitor`).
* Mode Guest (*read-only*): Home/Discover, Search & Filter, Airing Schedule, Media Detail (Info, Relations, Characters, Recommendations), dan Public User Profile/List lookup.
* Mode Login (OAuth 2.0 *Implicit Grant* tanpa backend): Web callback & APK Chrome Custom Tabs + Deep Link.
* Manajemen *My List* (Anime & Manga): lihat per status/custom list, tambah, `+1` progress cepat, edit detail, dan hapus entri.
* Profil, Statistik, dan *Edit Profile/Preferences* dalam cakupan `UpdateUser` API AniList.
* Paper Slate Light Mode default + toggle Dark Mode, serta toggle filter konten `isAdult` di Settings.
* Pipeline GitHub Actions untuk build `.apk`.

### Out of Scope (Ditunda ke Versi Selanjutnya / Tidak Didukung v1)
* Halaman profil/detail tersendiri untuk **Staff** dan **Studio**.
* Fitur membaca/menulis **Review**, mengirim **Recommendation**, **Forum** (`Thread`/`ThreadComment`), **Activity Feed** sosial, sistem **Follow/Followers**, dan **Notifikasi** push/real-time.
* Mutasi **Toggle Favourite** (daftar favorit hanya ditampilkan secara *read-only* di profil jika tersedia pada v1, aksi tambah/hapus favorit masuk kandidat v2).
* **Local Watchlist offline** untuk Mode Guest (Mode Guest murni *read-only*).
* Pengubahan **avatar, banner, atau username** secara langsung di dalam aplikasi (tidak didukung oleh mutasi `UpdateUser` AniList).
* Publikasi resmi ke **Google Play Store** (termasuk requirement AAB signing dan kepatuhan filter ketat store; v1 fokus ke Web & sideload `.apk`).

---

## 9. Success Criteria

Versi 1.0 **Aiznima** dinyatakan berhasil apabila memenuhi seluruh tolok ukur berikut:

1. **Kelancaran Mode Guest (Web & `.apk`):** Pengguna tanpa login dapat menjelajah Home, melakukan pencarian & filter, melihat jadwal tayang, membuka detail media lengkap, serta mencari profil publik user lain tanpa hambatan.
2. **Keberhasilan Auth & Sinkronisasi End-to-End:** Proses login OAuth 2.0 AniList berjalan sukses di Web maupun di `.apk` (via Chrome Custom Tabs + Deep Link), dan setiap perubahan di *My List* (`SaveMediaListEntry`/`DeleteMediaListEntry`) maupun *Preferences* (`UpdateUser`) langsung tersinkron dan terlihat di situs resmi `anilist.co`.
3. **Nol Error Rate Limit pada Penggunaan Normal:** Dalam sesi penggunaan wajar (browsing, search, dan update beberapa entri list), aplikasi tidak memicu HTTP `429 Too Many Requests` berkat mekanisme caching dan *debouncing*.
4. **Kualitas Build & Pengalaman Mobile:**
   * Satu codebase dapat di-build menjadi static Web app dan `.apk` Android siap sideload dengan ukuran ringan (**< 20 MB**) melalui GitHub Actions maupun build lokal.
   * Tata letak responsif berjalan bersih di desktop maupun layar HP tanpa *layout overflow*, serta tombol *Hardware Back* Android berfungsi konsisten.

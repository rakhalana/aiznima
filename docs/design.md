# Design System & UX Specification — Aiznima

**Versi Dokumen:** 1.0  
**Status:** Draft Final (Siap Implementasi)  
**Dokumen Terkait:** [prd.md](./prd.md) | [architecture.md](./architecture.md)  
**Tema Utama:** Crisp Cool Minimalist (Paper Slate Light Default + Optional Dark Mode)  

---

## 1. Design Concept

**“Precision Calm for Anime & Manga”**

Aiznima dirancang sebagai ruang baca dan pelacakan (*tracker*) yang tenang, rapi, dan tidak membuat mata cepat lelah. Karena sampul (*cover art*) dan banner anime/manga secara alami sudah sangat penuh warna dan ekspresif, **antarmuka Aiznima sengaja menahan diri menjadi bingkai netral yang presisi**.

Tiga pilar utama konsep desain Aiznima:
1. **Eye-Comfort First:** Menghindari putih murni (`#FFFFFF`) sebagai kanvas utama yang menyilaukan; menggantinya dengan *Paper Slate* lembut yang nyaman dipakai berjam-jam di Web maupun layar HP (`.apk`).
2. **Poster as the Hero:** Warna utama datang dari karya seni anime/manga itu sendiri; elemen UI memakai hierarki abu-abu *slate* yang bersih dengan satu aksen warna terukur.
3. **Speed Without Clutter:** Informasi penting (judul, skor, jadwal tayang, progress episode) tampil langsung dan terbaca sekilas tanpa dekorasi berlebihan.

---

## 2. Visual Direction

* **Arah Estetika:** **Crisp Cool Minimalist** (terinspirasi presisi antarmuka Apple Light & Linear Light).
* **Karakter Permukaan:** Kanvas dingin lembut (`#F8FAFC`) dipadukan dengan kartu putih bersih (`#FFFFFF`), garis pemisah tipis (**hairline border** `1px`), serta penggunaan bayangan (*shadow*) yang sangat minim.
* **Keseimbangan Konten & Ruang:** *Whitespace* lega di desktop agar tetap editorial, namun tetap padat dan ergonomis di layar ponsel (`.apk`) dengan *bottom navigation* dan *bottom sheet* yang nyaman dijangkau ibu jari.
* **Mode Tema:**
  * **Default:** *Paper Slate Light Mode*.
  * **Opsional:** *Deep Slate Dark Mode* dapat diaktifkan melalui **Settings** bagi pengguna yang membaca di ruangan gelap.

---

## 3. Color Palette

Seluruh warna didefinisikan sebagai CSS variables agar pergantian Light/Dark Mode dan konsistensi Tailwind CSS berjalan mulus.

### 3.1 Core Surface, Border, Text & Accent Tokens

| Token | Role | Light Mode (Default) | Dark Mode (Optional) |
| :--- | :--- | :--- | :--- |
| `--bg-canvas` | Latar belakang utama halaman (anti-silau) | `#F8FAFC` *(Paper Slate)* | `#0B1120` *(Deep Slate)* |
| `--bg-surface` | Permukaan kartu, modal, & panel | `#FFFFFF` | `#111827` |
| `--bg-subtle` | Area sekunder, chip filter, & skeleton base | `#F1F5F9` | `#1E293B` |
| `--bg-glass` | Sticky header & bottom nav (*frosted glass*) | `rgba(248, 250, 252, 0.82)` | `rgba(11, 17, 32, 0.80)` |
| `--bg-glass-elevated` | Floating overlays desktop (toast, dropdown, floating nav) | `rgba(255, 255, 255, 0.74)` | `rgba(17, 24, 39, 0.74)` |
| `--bg-glass-modal` | Container modal terpusat di desktop (`>= 768px`) | `rgba(255, 255, 255, 0.86)` | `rgba(17, 24, 39, 0.84)` |
| `--bg-glass-pill` | Tombol kontrol mengambang (`DetailTopBar`) | `rgba(255, 255, 255, 0.78)` | `rgba(15, 23, 42, 0.74)` |
| `--bg-glass-artwork` | Kartu header detail berlatar *artwork* di desktop | `rgba(255, 255, 255, 0.84)` | `rgba(17, 24, 39, 0.80)` |
| `--border-hairline` | Garis tepi kartu & pemisah seksi (`1px`) | `#E2E8F0` | `#1E293B` |
| `--border-glass` | Garis tepi kaca agar kontras tetap tegas di Light/Dark | `rgba(15, 23, 42, 0.09)` | `rgba(255, 255, 255, 0.11)` |
| `--border-strong` | Garis fokus input / batas aktif | `#CBD5E1` | `#334155` |
| `--text-primary` | Judul, teks utama, angka skor | `#0F172A` *(Slate 900)* | `#F8FAFC` |
| `--text-secondary` | Sinopsis, subjudul, label metadata | `#475569` *(Slate 600)* | `#94A3B8` |
| `--text-muted` | Placeholder, timestamp, caption kecil | `#64748B` *(Slate 500)* | `#64748B` |
| `--accent-primary` | Tombol primer, tab aktif, progress bar | `#2563EB` *(Calm Steel Blue)* | `#3B82F6` |
| `--accent-hover` | Hover / active state tombol primer | `#1D4ED8` | `#60A5FA` |
| `--accent-soft` | Latar badge aktif / pill terpilih | `#EFF6FF` | `rgba(59, 130, 246, 0.16)` |
| `--accent-ink` | Teks di atas `--accent-soft` | `#1E40AF` | `#93C5FD` |

### 3.2 Semantic & Watchlist Status Tokens

| Status / Arti | Light Text / Icon | Light Soft BG | Dark Text / Icon |
| :--- | :--- | :--- | :--- |
| **CURRENT** (Watching / Reading) | `#047857` | `#ECFDF5` | `#34D399` |
| **PLANNING** | `#1D4ED8` | `#EFF6FF` | `#60A5FA` |
| **COMPLETED** | `#4338CA` | `#EEF2FF` | `#818CF8` |
| **PAUSED** | `#B45309` | `#FFFBEB` | `#FBBF24` |
| **DROPPED** | `#B91C1C` | `#FEF2F2` | `#F87171` |
| **REPEATING** | `#0F766E` | `#F0FDFA` | `#2DD4BF` |
| **Score / Star Rating** | `#D97706` | `#FFFBEB` | `#F59E0B` |
| **Error / Destructive** | `#DC2626` | `#FEF2F2` | `#F87171` |

---

## 4. Typography

* **Font Family Utama:** `'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
* **Angka & Data Numerik:** Wajib mengaktifkan `font-variant-numeric: tabular-nums` pada skor, jumlah episode (`11 / 12`), tahun rilis, dan hitung mundur jadwal tayang agar angka sejajar rapi dan tidak bergeser saat tombol `+1` ditekan.

### Typographic Scale

| Level | Ukuran (Mobile -> Desktop) | Weight | Line Height | Tracking | Penggunaan |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display / Hero** | `24px` -> `32px` | `700` | `1.2` | `-0.025em` | Judul utama Media Detail / Hero Banner |
| **Page Title (H1)** | `20px` -> `24px` | `700` | `1.25` | `-0.02em` | Judul halaman (Discover, Schedule, My List) |
| **Section Heading (H2)** | `16px` -> `18px` | `600` | `1.35` | `-0.015em` | Kepala blok (Trending Now, Characters) |
| **Card Title** | `14px` | `600` | `1.35` | `-0.01em` | Judul anime/manga di kartu (`line-clamp-2`) |
| **Body / Synopsis** | `14px` -> `15px` | `400` | `1.6` | `0em` | Deskripsi sinopsis, bio profil, catatan |
| **Metadata / UI Label** | `12px` -> `13px` | `500` | `1.4` | `0em` | Format, studio, skor, label tab & tombol |
| **Micro / Badge** | `11px` | `600` | `1.2` | `0.01em` | Pill status, nomor episode, tag kecil |

---

## 5. Spacing

Menggunakan skala dasar **4px (`0.25rem`)** dengan ritme utama kelipatan **8px**:

* **Micro Gap (`4px` / `8px`):** Jarak ikon dengan teks, antar tag/genre pill, jarak judul ke subjudul di dalam kartu.
* **Component Padding (`12px` / `16px`):** Padding internal kartu daftar (`12px` mobile, `16px` desktop), input field (`10px 14px`), tombol standar (`10px 16px`).
* **Grid Gutter (`12px` / `16px` / `20px`):** Jarak antar poster pada grid katalog (`12px` di mobile 2–3 kolom, `16px–20px` di tablet/desktop).
* **Section Spacing (`24px` / `32px`):** Jarak antar blok konten vertikal (*Trending*, *This Season*, *Top Rated*).
* **Page Margin & Container:**
  * Mobile / `.apk`: `16px` kiri-kanan (`px-4`), ditambah jarak bawah `80px` + `env(safe-area-inset-bottom)` agar konten paling bawah tidak tertutup *Bottom Navigation Bar*.
  * Desktop Web: Container maksimal `1280px` (`max-w-7xl mx-auto`), padding `24px–32px`.

---

## 6. Border Radius

Mengadopsi **Modern Precision Scale** yang rapi namun tidak kaku:

| Elemen | Radius | Kelas Tailwind |
| :--- | :--- | :--- |
| Badge status, chip tag kecil | `6px` – `8px` | `rounded-md` / `rounded-lg` |
| Input search, tombol, segment tab | `10px` | `rounded-[10px]` |
| Poster cover anime/manga (`2:3`) | `10px` | `rounded-[10px]` |
| Kartu daftar, panel statistik, toast | `12px` | `rounded-xl` |
| Modal desktop, dialog konfirmasi | `16px` | `rounded-2xl` |
| Mobile Bottom Sheet | `16px` (sisi atas) | `rounded-t-2xl` |
| Avatar user, pill filter, tombol `+1` bulat | `9999px` | `rounded-full` |

---

## 7. Shadows / Blur

Prinsip utama Aiznima adalah **Border-First, Shadow-Whisper**: elevasi di Light Mode dicapai melalui kontras permukaan (`#FFFFFF` di atas `#F8FAFC`) dan `1px` hairline border (`#E2E8F0`), bukan bayangan tebal yang terlihat kotor.

* **`shadow-xs` (Kartu & Tombol):** `0 1px 2px rgba(15, 23, 42, 0.04)`
* **`shadow-sm` (Popover, Toast, Floating Filter):** `0 4px 12px rgba(15, 23, 42, 0.06)`
* **`shadow-lg` (Modal & Bottom Sheet):** `0 12px 32px rgba(15, 23, 42, 0.10)`
* **Responsive Glass Tiers (Mobile Subtle vs. Desktop Showcase):**
  * **Tier 1 (`< 768px` / `.apk` WebView):** *Sticky Top Header* & *Mobile Bottom Nav* memakai `.glass-chrome-docked` (`blur(12px) saturate(135%)` dengan `--bg-glass`), sedangkan Bottom Sheet, Toast, dan badan kartu grid tetap solid/nyaris solid demi kontras serta kelancaran scroll 60fps.
  * **Tier 2 (`>= 768px` Desktop):** Overlays mengambang (`ToastViewport`, `SelectDropdown`), kontrol `DetailTopBar`, modal desktop (`BottomSheetOrModal`), serta header berlatar *artwork* (`HeroBanner`, `MediaDetailPage`, `ProfileHeaderAndStats`, `EntityDetailHero`) memakai efek frosted lebih kaya (`blur(16px–20px) saturate(145%–165%)`) dengan `--border-glass` dan *specular top highlight*.
  * **Performance & Accessibility Guardrails:** Dibatasi maksimal 2–3 layer `backdrop-filter` aktif sekaligus, dilarang memasang `backdrop-filter` pada badan kartu grid yang di-scroll, serta memiliki fallback otomatis solid surface via `@supports not (backdrop-filter: ...)` dan `@media (prefers-reduced-transparency: reduce)`.
  * *Modal/Sheet Backdrop Overlay* (`.glass-scrim`): `rgba(15, 23, 42, 0.36)` + `blur(2px)` di mobile, `rgba(2, 6, 23, 0.42)` + `blur(4px)` di desktop.

---

## 8. Components

### 8.1 Navigation Shell (`AppShell`)
* **Mobile / `.apk` (`< 768px`):** Top bar ringkas (Logo Aiznima + switch Anime/Manga atau tombol Search/Auth) dan **Bottom Navigation Bar** berisi 5 rute inti: *Discover*, *Search*, *Schedule*, *My List*, dan *Profile* (beserta akses *Settings* di header Profil).
* **Desktop (`>= 768px`):** **Floating Glass Top-Navbar** (`.glass-floating-nav`, `max-w-7xl`) mengambang di atas kanvas (`--desktop-nav-height: 4.5rem`), berisi brand di kiri, pill navigasi utama di tengah, serta utility cluster (*Notifications*, *Settings*, *Theme Toggle*, dan status akun/login) di kanan agar seluruh lebar kontainer tersedia untuk showcase editorial.

### 8.2 Media Card (`MediaCard`)
* Poster rasio konsisten **`aspect-[2/3]`** dengan `object-cover` dan placeholder slate lembut saat loading.
* Pojok atas poster hanya boleh memuat maksimal 1–2 badge mikro (misal badge skor `★ 8.7` atau badge status list user jika sedang login) agar cover tidak tertutup penuh.
* Bawah poster: Judul (`line-clamp-2`) + 1 baris metadata (`TV · 24 ep` atau `Manga · Ongoing`).

### 8.3 My List Entry Card (`ListEntryCard`)
* Tata letak horizontal kompak agar muat banyak entri saat scrolling cepat:
  * **Kiri:** Thumbnail poster kecil (`56×84px`, `rounded-lg`).
  * **Tengah:** Judul, badge status, metadata progress (`Ep 11 / 24` dengan *tabular-nums*), dan **progress bar tipis (`4px`)**.
  * **Kanan:** Skor ringkas + tombol aksi cepat **`+1`** (`min 44×44px`) untuk menambah progress dalam 1 ketukan; mengetuk badan kartu membuka *List Editor Sheet/Modal*.

### 8.4 Filter & List Editor (`BottomSheet` / `Modal`)
* Pada layar `< 768px`: tampil sebagai **Bottom Sheet** yang muncul dari bawah dengan *drag handle* atas dan jarak aman dari navigation bar.
* Pada layar `>= 768px`: tampil sebagai **Centered Modal** (`max-w-lg`) dengan batas tinggi `85vh` yang dapat di-scroll internal.

### 8.5 Toast / Snackbar
* Muncul mengambang di atas Bottom Nav (`bottom-20`) di mobile atau pojok kanan bawah di desktop.
* Mendukung varian *Success*, *Info*, *Warning (Rate Limit)*, dan *Actionable (Undo)* saat pengguna melakukan `+1` progress atau menghapus entri.

### 8.6 Segmented Tabs & Chips
* *Segmented control* berlatar `--bg-subtle` dengan pill aktif putih (`--bg-surface` + `shadow-xs`) untuk berpindah antara **Anime / Manga** serta tab detail (**Overview / Relations / Characters / Recommendations**).

---

## 9. Interaction Principles

1. **Guest-First, Zero Gatekeeping:** Pengunjung langsung masuk ke konten tanpa modal login paksa di awal. Prompt login hanya muncul saat user menyentuh fitur personal (*Add to List*, *My List*, *My Profile*), dan **rute asal tetap diingat** agar setelah login user kembali ke halaman yang sama.
2. **Thumb-Friendly Ergonomics:** Semua target interaktif (tombol `+1`, item bottom nav, filter chip, tombol close) memiliki area sentuh minimal **`44×44px`**.
3. **Optimistic + Reversible Feedback:** Menekan `+1` episode langsung memperbarui angka & progress bar di UI secara instan (*optimistic update*) disertai toast *"Updated to Ep 12 — Undo"* sehingga pengguna tidak merasa menunggu jaringan.
4. **Adaptive Feedback Tanpa Memblokir:** Pencarian menerapkan *debounce* (`400ms–500ms`) disertai indikator loading halus di dalam kotak pencarian, bukan memblokir layar dengan overlay penuh.
5. **Keyboard & Hardware Navigation:**
   * Desktop mendukung pintasan `/` untuk langsung fokus ke Search dan `Esc` untuk menutup modal.
   * Android `.apk` menangani tombol **Hardware Back** untuk menutup modal/sheet terlebih dahulu sebelum mundur halaman atau keluar aplikasi.

---

## 10. Animation / Transition

* **Kurva & Durasi Standar:** `cubic-bezier(0.22, 1, 0.36, 1)` (*snappy ease-out*), durasi **`150ms–220ms`**:
  * Hover / tekan tombol & kartu: `120ms` (`active:scale-[0.98]`, desktop hover `border-slate-300` halus).
  * Pergantian tab / dropdown / popover: `150ms`.
  * Buka/tutup Bottom Sheet & Modal: `200ms–220ms` (slide-up + fade).
  * Transisi masuk gambar cover: fade-in lembut `180ms` setelah selesai load.
* **Kinerja di WebView APK:** Hanya menganimasikan properti ramah GPU (`transform` dan `opacity`); dilarang menganimasikan `width`, `height`, atau `margin` untuk mencegah frame drop di Android.
* **Reduced Motion:** Menghormati preferensi sistem `@media (prefers-reduced-motion: reduce)`—menonaktifkan pergerakan slide/scale dan menggantinya dengan transisi opacity singkat.

---

## 11. Responsive Behavior

| Breakpoint | Perangkat Target | Grid Katalog | Navigasi | Modal / Editor | Safe Area & Spasial |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`< 640px`** | Smartphone / `.apk` | 2 kolom (`gap-3`) *(atau 3 kolom di tablet mini)* | Bottom Nav (5 tab) + Top Bar ringkas | Bottom Sheet (`rounded-t-2xl`) | Wajib `env(safe-area-inset-top)` & `env(safe-area-inset-bottom)` |
| **`640px–767px`** | Big Phone / Phablet | 3 kolom (`gap-3.5`) | Bottom Nav + Top Bar | Bottom Sheet | Padding horizontal `16px–20px` |
| **`768px–1023px`** | Tablet | 4 kolom (`gap-4`) | Floating Glass Top-Navbar | Centered Modal | Container `px-8`, clearance `--desktop-nav-height` |
| **`>= 1024px`** | Desktop Web | 5–6 kolom (`gap-5`), Discover row 5 kolom penuh | Floating Glass Top-Navbar | Centered Modal (`max-w-lg`) | Container `max-w-7xl mx-auto px-8`, support keyboard shortcuts |

* **Media Detail Hero:** Di mobile, banner atas ringkas + poster menumpuk rapi di kiri judul; di desktop, banner lebar penuh dengan kartu info terstruktur di sebelah kanan poster.

---

## 12. Accessibility

* **Kontras Warna (WCAG 2.1 AA):**
  * Teks utama `#0F172A` di atas `#F8FAFC` / `#FFFFFF` mencapai rasio kontras **> 14:1**.
  * Teks sekunder `#475569` mencapai rasio **> 7:1** (lolos AA untuk teks ukuran kecil).
  * Tombol primer `#2563EB` dengan teks `#FFFFFF` memenuhi standar rasio **> 4.5:1**.
* **Focus Visible:** Setiap elemen interaktif menampilkan focus ring jelas saat diakses keyboard (`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-2`).
* **Semantic HTML & ARIA:**
  * Penggunaan landmark `<header>`, `<nav>`, `<main>`, dan hierarki heading (`h1` -> `h2` -> `h3`) yang konsisten.
  * Setiap tombol berbasis ikon (`+1`, Close, Back, Theme Toggle, Search Clear) wajib memiliki `aria-label` deskriptif.
  * Setiap cover/avatar menyertakan `alt` text judul media atau nama karakter/user.
* **Skalabilitas Teks:** Menggunakan unit `rem` untuk ukuran teks sehingga menghormati pengaturan ukuran font browser/OS pengguna.

---

## 13. Empty State / Loading State / Error State & Alternate Flows

Setiap skenario non-ideal memiliki penanganan visual dan jalur pemulihan (*actionable recovery*) yang jelas agar aplikasi tidak pernah berhenti di layar kosong atau error membingungkan.

### 13.1 Loading States
* **Skeleton Shimmer (Zero CLS):** Saat data awal dimuat, tampilkan skeleton (`animate-pulse` berlatar `--bg-subtle`) dengan dimensi yang identik dengan kartu asli (`aspect-[2/3]` untuk poster, baris teks proporsional) agar tata letak tidak melompat saat data tiba.
* **Mutation Pending:** Tombol *Save* / *Delete* menampilkan spinner mini dan status `disabled` untuk mencegah submit ganda.

### 13.2 Empty States (Actionable)
| Skenario | Pesan & Visual | Tombol Aksi (CTA) |
| :--- | :--- | :--- |
| **Hasil Search Kosong** | Ikon Search + *"No results found for your current query or filters."* | **Reset Filters** |
| **Tab My List Kosong** | Ikon Bookmark/List + *"Your [Status] list is empty."* | **Discover Anime/Manga** |
| **Jadwal Hari Kosong** | Ikon Calendar + *"No episodes scheduled for this day."* | **View Today** |
| **Public User Tidak Ditemukan** | Ikon UserX + *"User not found. Please check the username spelling."* | **Clear Search** |

### 13.3 Error States & Alternate Flows (Edge Cases)

| ID | Skenario / Alternate Flow | Perilaku UI & Pemulihan |
| :--- | :--- | :--- |
| **AF-01** | **OAuth Dibatalkan / Gagal / `state` Mismatch** | Browser/Custom Tab ditutup, user tetap dikembalikan ke halaman asal dalam **Mode Guest**, dan muncul toast informatif *"Login cancelled or could not be verified."* beserta opsi **Try Again**. |
| **AF-02** | **Token Kedaluwarsa / HTTP `401` Saat Mutasi** | Sesi dibersihkan dari storage agar kembali sinkron. Jika user sedang mengisi modal editor list/profil, **draft input tidak langsung dibuang**; muncul banner di dalam modal untuk login ulang sebelum retry. |
| **AF-03** | **Rate Limit AniList (`429 Too Many Requests`)** | Request dijeda sesuai `Retry-After`. Jika data cache lama tersedia di TanStack Query, **data cache tetap ditampilkan** disertai banner tipis *"Rate limit reached. Showing cached data — Retry in Xs."* |
| **AF-04** | **Jaringan Offline / Timeout** | Jika halaman sudah di-cache, tetap tampilkan data cache dengan indikator offline ringan; jika belum ada cache, tampilkan kartu error bersih dengan ikon WifiOff dan tombol **Try Again**. |
| **AF-05** | **Profil atau List User Bersifat Private** | Saat membuka `/user/:username` milik user yang mengunci daftar mereka, tampilkan kartu informatif *"This user's list is private"* dengan ikon Lock (bukan pesan error jaringan). |
| **AF-06** | **Konten `18+` (`isAdult: true`) Saat Filter Nonaktif** | Di katalog/search otomatis disembunyikan; jika user membuka URL langsung `/media/:id` ke entri dewasa, tampilkan **Interstitial Content Gate** (*"18+ Content Hidden"*) dengan tombol **Go Back** dan **Show Anyway / Enable in Settings**. |
| **AF-07** | **Gambar Cover / Avatar Gagal Dimuat** | Komponen image fallback ke kotak `--bg-subtle` dengan ikon media halus agar rasio `2:3` dan tata letak grid tidak rusak. |

---

## 14. Iconography

* **Icon Library Tunggal:** **`Lucide React`** di seluruh Web dan `.apk` demi konsistensi visual dan bundle ringan (*tree-shakeable*).
* **Gaya & Ketebalan Garis:**
  * Stroke default: **`1.75px`** (lebih ramping dan halus di atas kanvas Light Mode dibanding stroke tebal `2px` default).
  * Stroke aktif (misal ikon tab Bottom Nav yang sedang dipilih): **`2px`** dengan warna `--accent-primary` (`#2563EB`) dan latar pill `--accent-soft` (`#EFF6FF`).
* **Skala Ukuran Standar:**
  * `14px–16px`: Ikon inline di dalam teks metadata, star rating, badge status, dan chevron.
  * `20px`: Tombol standar, ikon navigasi Bottom Nav / Sidebar, input search, aksi `+1`.
  * `24px–32px`: Ikon header aksi atau ilustrasi garis ringan pada *Empty State* / *Error State* (berwarna `--text-muted` agar tidak terlalu mencolok).

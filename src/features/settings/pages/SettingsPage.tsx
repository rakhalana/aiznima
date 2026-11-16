import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  LogIn,
  Moon,
  SlidersHorizontal,
  Sun,
  Trash2,
  User,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLoginPromptStore } from '@/features/auth/stores/useLoginPromptStore';
import { useLogoutConfirmStore } from '@/features/auth/stores/useLogoutConfirmStore';
import { useUpdateUserMutation } from '@/features/profile/api/profileQueries';
import { UnauthorizedError } from '@/shared/api/graphqlClient';
import { queryClient } from '@/shared/api/queryClient';
import type { ScoreFormat, UserTitleLanguage } from '@/shared/api/types';
import { BrandLogo } from '@/shared/components/BrandLogo';
import { Button } from '@/shared/components/Button';
import { SelectDropdown } from '@/shared/components/SelectDropdown';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import { usePrefsStore } from '@/shared/stores/usePrefsStore';
import { useToastStore } from '@/shared/stores/useToastStore';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';

const TITLE_LANGUAGES: Array<{ value: UserTitleLanguage; label: string }> = [
  { value: 'ROMAJI', label: 'Romaji (Sousou no Frieren)' },
  { value: 'ENGLISH', label: 'English (Frieren: Beyond Journey’s End)' },
  { value: 'NATIVE', label: 'Native (葬送のフリーレン)' },
  { value: 'ROMAJI_STYLISED', label: 'Romaji Stylised' },
  { value: 'ENGLISH_STYLISED', label: 'English Stylised' },
  { value: 'NATIVE_STYLISED', label: 'Native Stylised' },
];

const SCORE_FORMATS: Array<{ value: ScoreFormat; label: string }> = [
  { value: 'POINT_100', label: '100 Point (85 / 100)' },
  { value: 'POINT_10_DECIMAL', label: '10 Point Decimal (8.5 / 10)' },
  { value: 'POINT_10', label: '10 Point (9 / 10)' },
  { value: 'POINT_5', label: '5 Star (4 / 5)' },
  { value: 'POINT_3', label: '3 Point Smiley (1 – 3)' },
];

export function SettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  useDocumentTitle('Settings');
  const theme = usePrefsStore((state) => state.theme);
  const setTheme = usePrefsStore((state) => state.setTheme);

  const accessToken = useAuthStore((state) => state.accessToken);
  const viewer = useAuthStore((state) => state.viewer);
  const openLoginPrompt = useLoginPromptStore((state) => state.openLoginPrompt);
  const openLogoutConfirm = useLogoutConfirmStore((state) => state.openLogoutConfirm);
  const addToast = useToastStore((state) => state.addToast);
  const updateUser = useUpdateUserMutation();

  const savedTitleLanguage: UserTitleLanguage = viewer?.options?.titleLanguage ?? 'ROMAJI';
  const savedScoreFormat: ScoreFormat = viewer?.mediaListOptions?.scoreFormat ?? 'POINT_100';
  const savedDisplayAdult = Boolean(viewer?.options?.displayAdultContent);
  const savedIncludeAdultInSearch = Boolean(viewer?.options?.includeAdultContentInSearch);

  const [titleLanguage, setTitleLanguage] = useState<UserTitleLanguage>(savedTitleLanguage);
  const [scoreFormat, setScoreFormat] = useState<ScoreFormat>(savedScoreFormat);
  const [displayAdultContent, setDisplayAdultContent] = useState(savedDisplayAdult);
  const [includeAdultContentInSearch, setIncludeAdultContentInSearch] = useState(
    savedIncludeAdultInSearch,
  );
  const [authError, setAuthError] = useState<string | null>(null);
  const preserveDraftRef = useRef(false);

  useEffect(() => {
    if (!viewer) {
      preserveDraftRef.current = false;
      setAuthError(null);
      setTitleLanguage('ROMAJI');
      setScoreFormat('POINT_100');
      setDisplayAdultContent(false);
      setIncludeAdultContentInSearch(false);
      return;
    }

    if (preserveDraftRef.current) {
      return;
    }

    setTitleLanguage(savedTitleLanguage);
    setScoreFormat(savedScoreFormat);
    setDisplayAdultContent(savedDisplayAdult);
    setIncludeAdultContentInSearch(savedIncludeAdultInSearch);
  }, [
    viewer,
    savedTitleLanguage,
    savedScoreFormat,
    savedDisplayAdult,
    savedIncludeAdultInSearch,
  ]);

  useEffect(() => {
    if (accessToken) {
      setAuthError(null);
    }
  }, [accessToken]);

  const isAccountReady = Boolean(accessToken && viewer);
  const hasPreferenceChanges =
    isAccountReady &&
    (titleLanguage !== savedTitleLanguage ||
      scoreFormat !== savedScoreFormat ||
      displayAdultContent !== savedDisplayAdult ||
      includeAdultContentInSearch !== savedIncludeAdultInSearch);

  const handleSavePreferences = async (event: FormEvent) => {
    event.preventDefault();
    if (!isAccountReady) {
      return;
    }
    setAuthError(null);

    try {
      await updateUser.mutateAsync({
        titleLanguage,
        scoreFormat,
        displayAdultContent,
        includeAdultContentInSearch,
      });
      preserveDraftRef.current = false;
      addToast({ variant: 'success', message: 'AniList preferences updated.' });
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        preserveDraftRef.current = true;
        setAuthError(
          'Your session expired. Log in again on this page to save your preference changes.',
        );
      }
    }
  };

  const handleClearCache = () => {
    queryClient.clear();
    addToast({ variant: 'success', message: 'Local cache cleared.' });
  };

  return (
    <section className="mx-auto max-w-2xl space-y-5 md:space-y-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors md:hidden"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
        Back
      </button>

      <header>
        <h1 className="text-xl font-bold tracking-tight md:text-2xl">Settings</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Appearance, AniList preferences, content filtering, local cache, and session settings.
        </p>
      </header>

      <div className="space-y-3 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 shadow-token-xs">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Appearance</h2>
          </div>
          <div
            role="group"
            aria-label="Theme appearance"
            className="relative grid w-fit shrink-0 grid-cols-2 self-start rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-subtle)] p-1 sm:self-auto"
          >
            <span
              aria-hidden="true"
              className={`theme-switch-thumb pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-lg bg-[var(--bg-surface)] shadow-token-xs ${
                theme === 'dark' ? 'translate-x-full' : 'translate-x-0'
              }`}
            />
            <button
              type="button"
              aria-pressed={theme === 'light'}
              onClick={() => void setTheme('light')}
              className={`relative z-10 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
                theme === 'light'
                  ? 'text-[var(--text-primary)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              <Sun
                className={`theme-switch-icon h-3.5 w-3.5 ${
                  theme === 'light' ? 'rotate-0 scale-100' : '-rotate-45 scale-90'
                }`}
                strokeWidth={1.75}
                aria-hidden="true"
              />
              Light
            </button>
            <button
              type="button"
              aria-pressed={theme === 'dark'}
              onClick={() => void setTheme('dark')}
              className={`relative z-10 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
                theme === 'dark'
                  ? 'text-[var(--text-primary)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              <Moon
                className={`theme-switch-icon h-3.5 w-3.5 ${
                  theme === 'dark' ? 'rotate-0 scale-100' : 'rotate-12 scale-90'
                }`}
                strokeWidth={1.75}
                aria-hidden="true"
              />
              Dark
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 border-t border-[var(--border-hairline)] pt-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Local Query Cache
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Clear cached feed and media metadata from memory without signing out.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="self-start sm:self-auto"
            onClick={handleClearCache}
            leftIcon={<Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />}
          >
            Clear Cache
          </Button>
        </div>
      </div>

      <form
        onSubmit={(e) => void handleSavePreferences(e)}
        className="space-y-4 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 shadow-token-xs"
      >
        <div className="flex items-start gap-2.5">
          <SlidersHorizontal
            className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-muted)]"
            strokeWidth={1.75}
          />
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              AniList Account Preferences
            </h2>
          </div>
        </div>

        {authError ? (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-300/60 bg-[var(--status-paused-bg)] p-3 text-xs font-medium text-[var(--status-paused-text)]"
          >
            <span>{authError}</span>
            <Button
              type="button"
              size="sm"
              variant="primary"
              leftIcon={<LogIn className="h-3.5 w-3.5" strokeWidth={1.75} />}
              onClick={() =>
                openLoginPrompt(
                  'Re-authenticate with AniList to save your preference changes.',
                  location.pathname + location.search,
                )
              }
            >
              Log in again
            </Button>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SelectDropdown
            label="Title Language"
            value={titleLanguage}
            options={TITLE_LANGUAGES}
            disabled={!isAccountReady || updateUser.isPending}
            onChange={(nextLanguage) => setTitleLanguage(nextLanguage)}
          />

          <SelectDropdown
            label="Score Format"
            value={scoreFormat}
            options={SCORE_FORMATS}
            disabled={!isAccountReady || updateUser.isPending}
            onChange={(nextFormat) => setScoreFormat(nextFormat)}
          />
        </div>

        <div className="space-y-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-subtle)] p-3">
          <label
            className={`flex items-center gap-2.5 text-xs font-medium ${isAccountReady ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'
              }`}
          >
            <input
              type="checkbox"
              checked={displayAdultContent}
              disabled={!isAccountReady || updateUser.isPending}
              onChange={(e) => setDisplayAdultContent(e.target.checked)}
              className="h-4 w-4 accent-[var(--accent-primary)] disabled:cursor-not-allowed disabled:opacity-55"
            />
            <span>Display 18+ (Adult) content on AniList</span>
          </label>
          <label
            className={`flex items-center gap-2.5 text-xs font-medium ${isAccountReady ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'
              }`}
          >
            <input
              type="checkbox"
              checked={includeAdultContentInSearch}
              disabled={!isAccountReady || updateUser.isPending}
              onChange={(e) => setIncludeAdultContentInSearch(e.target.checked)}
              className="h-4 w-4 accent-[var(--accent-primary)] disabled:cursor-not-allowed disabled:opacity-55"
            />
            <span>Include 18+ entries in Search results</span>
          </label>
        </div>

        <div className="flex justify-end border-t border-[var(--border-hairline)] pt-3">
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={!hasPreferenceChanges}
            isLoading={updateUser.isPending}
          >
            Save Preferences
          </Button>
        </div>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 shadow-token-xs">
        <div className="flex items-start gap-2.5">
          <User className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-muted)]" strokeWidth={1.75} />
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">AniList Session</h2>
            <p className="text-xs text-[var(--text-secondary)]">
              {accessToken
                ? `Signed in${viewer?.name ? ` as ${viewer.name}` : ' on this device'}.`
                : 'Currently browsing in Guest Mode.'}
            </p>
          </div>
        </div>

        {accessToken ? (
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => navigate('/profile')}>
              Profile
            </Button>
            <Button variant="danger" size="sm" onClick={openLogoutConfirm}>
              Log out
            </Button>
          </div>
        ) : (
          <Button
            variant="primary"
            size="sm"
            leftIcon={<LogIn className="h-3.5 w-3.5" strokeWidth={1.75} />}
            onClick={() =>
              openLoginPrompt(
                'Connect your AniList account to track your watchlist and profile preferences.',
                location.pathname + location.search,
              )
            }
          >
            Login with AniList
          </Button>
        )}
      </div>

      <footer className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 text-xs text-[var(--text-secondary)] shadow-token-xs">
        <div className="flex items-center gap-2">
          <BrandLogo className="h-5 w-5 shrink-0 text-[var(--text-primary)]" />
          <p className="font-semibold text-[var(--text-primary)]">Aiznima</p>
        </div>
        <p className="mt-1">Unofficial client powered by AniList API.</p>
      </footer>
    </section>
  );
}

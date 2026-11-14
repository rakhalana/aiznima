import { useEffect, useState, type FormEvent } from 'react';
import { ExternalLink, LogIn } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useLoginPromptStore } from '@/features/auth/stores/useLoginPromptStore';
import { useUpdateUserMutation } from '@/features/profile/api/profileQueries';
import { openExternalUrl } from '@/platform';
import { UnauthorizedError } from '@/shared/api/graphqlClient';
import type {
  ScoreFormat,
  UserProfile,
  UserTitleLanguage,
} from '@/shared/api/types';
import { BottomSheetOrModal } from '@/shared/components/BottomSheetOrModal';
import { Button } from '@/shared/components/Button';
import { SelectDropdown } from '@/shared/components/SelectDropdown';
import { useToastStore } from '@/shared/stores/useToastStore';

interface EditProfileModalProps {
  open: boolean;
  onClose: () => void;
  viewer: UserProfile;
}

const PROFILE_COLORS = [
  { id: 'blue', label: 'Blue', swatch: 'bg-blue-600' },
  { id: 'purple', label: 'Purple', swatch: 'bg-purple-600' },
  { id: 'pink', label: 'Pink', swatch: 'bg-pink-600' },
  { id: 'orange', label: 'Orange', swatch: 'bg-orange-500' },
  { id: 'red', label: 'Red', swatch: 'bg-red-600' },
  { id: 'green', label: 'Green', swatch: 'bg-emerald-600' },
  { id: 'gray', label: 'Slate', swatch: 'bg-slate-600' },
] as const;

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

function stripSimpleHtmlForDraft(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .trim();
}

export function EditProfileModal({ open, onClose, viewer }: EditProfileModalProps) {
  const location = useLocation();
  const addToast = useToastStore((state) => state.addToast);
  const openLoginPrompt = useLoginPromptStore((state) => state.openLoginPrompt);
  const updateUser = useUpdateUserMutation();

  const [about, setAbout] = useState('');
  const [profileColor, setProfileColor] = useState('blue');
  const [titleLanguage, setTitleLanguage] = useState<UserTitleLanguage>('ROMAJI');
  const [scoreFormat, setScoreFormat] = useState<ScoreFormat>('POINT_100');
  const [displayAdultContent, setDisplayAdultContent] = useState(false);
  const [includeAdultContentInSearch, setIncludeAdultContentInSearch] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setAbout(stripSimpleHtmlForDraft(viewer.about));
    setProfileColor(viewer.options?.profileColor ?? 'blue');
    setTitleLanguage(viewer.options?.titleLanguage ?? 'ROMAJI');
    setScoreFormat(viewer.mediaListOptions?.scoreFormat ?? 'POINT_100');
    setDisplayAdultContent(Boolean(viewer.options?.displayAdultContent));
    setIncludeAdultContentInSearch(
      Boolean(viewer.options?.includeAdultContentInSearch),
    );
    setAuthError(null);
    // Only hydrate draft when opening the modal (AF-02 preserves draft across 401/background updates).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setAuthError(null);

    try {
      await updateUser.mutateAsync({
        about,
        profileColor,
        titleLanguage,
        scoreFormat,
        displayAdultContent,
        includeAdultContentInSearch,
      });
      addToast({ variant: 'success', message: 'Profile preferences updated.' });
      onClose();
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        setAuthError(
          'Your session expired. Log in again without closing this editor to keep your draft.',
        );
      }
    }
  };

  return (
    <BottomSheetOrModal
      open={open}
      onClose={onClose}
      title="Edit Profile & Preferences"
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
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
                  'Re-authenticate with AniList to save your profile draft.',
                  location.pathname + location.search,
                )
              }
            >
              Log in again
            </Button>
          </div>
        ) : null}

        <label className="block space-y-1 text-xs font-semibold text-[var(--text-secondary)]">
          <span>Bio / About (Markdown supported)</span>
          <textarea
            rows={4}
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            placeholder="Write a short bio for your AniList profile..."
            className="w-full rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
          />
        </label>

        <div className="space-y-1.5">
          <span className="text-xs font-semibold text-[var(--text-secondary)]">
            AniList Profile Color
          </span>
          <div className="flex flex-wrap gap-2">
            {PROFILE_COLORS.map((c) => {
              const selected = profileColor === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setProfileColor(c.id)}
                  aria-pressed={selected}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-crisp ${
                    selected
                      ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)] text-[var(--accent-ink)]'
                      : 'border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-secondary)]'
                  }`}
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${c.swatch}`} aria-hidden="true" />
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          <SelectDropdown
            label="Title Language"
            value={titleLanguage}
            options={TITLE_LANGUAGES}
            onChange={(nextLanguage) => setTitleLanguage(nextLanguage)}
          />

          <SelectDropdown
            label="Score Format"
            value={scoreFormat}
            options={SCORE_FORMATS}
            onChange={(nextFormat) => setScoreFormat(nextFormat)}
          />
        </div>

        <div className="space-y-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-subtle)] p-3">
          <label className="flex items-center gap-2.5 text-xs font-medium text-[var(--text-primary)]">
            <input
              type="checkbox"
              checked={displayAdultContent}
              onChange={(e) => setDisplayAdultContent(e.target.checked)}
              className="h-4 w-4 accent-[var(--accent-primary)]"
            />
            <span>Display 18+ (Adult) content on AniList</span>
          </label>
          <label className="flex items-center gap-2.5 text-xs font-medium text-[var(--text-primary)]">
            <input
              type="checkbox"
              checked={includeAdultContentInSearch}
              onChange={(e) => setIncludeAdultContentInSearch(e.target.checked)}
              className="h-4 w-4 accent-[var(--accent-primary)]"
            />
            <span>Include 18+ entries in Search results</span>
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-hairline)] pt-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void openExternalUrl('https://anilist.co/settings')}
            leftIcon={<ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} />}
          >
            Avatar / Banner on AniList
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={updateUser.isPending}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={updateUser.isPending}
            >
              Save Profile
            </Button>
          </div>
        </div>
      </form>
    </BottomSheetOrModal>
  );
}

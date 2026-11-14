import { useEffect, useState, type FormEvent } from 'react';
import { LogIn, Trash2 } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useLoginPromptStore } from '@/features/auth/stores/useLoginPromptStore';
import {
  useDeleteMediaListEntryMutation,
  useSaveMediaListEntryMutation,
} from '@/features/my-list/api/myListQueries';
import { UnauthorizedError } from '@/shared/api/graphqlClient';
import type {
  FuzzyDate,
  MediaListEntrySummary,
  MediaListStatus,
  MediaSummary,
  ScoreFormat,
} from '@/shared/api/types';
import { BottomSheetOrModal } from '@/shared/components/BottomSheetOrModal';
import { Button } from '@/shared/components/Button';
import { usePreferredTitleLanguage } from '@/shared/hooks/usePreferredTitleLanguage';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import { useToastStore } from '@/shared/stores/useToastStore';
import {
  formatListStatusLabel,
  formatMediaTitle,
} from '@/shared/utils/formatters';

interface ListEditorModalProps {
  open: boolean;
  onClose: () => void;
  media: MediaSummary;
  entry: MediaListEntrySummary | null | undefined;
}

const ALL_STATUSES: MediaListStatus[] = [
  'CURRENT',
  'PLANNING',
  'COMPLETED',
  'PAUSED',
  'DROPPED',
  'REPEATING',
];

const SCORE_CONFIG: Record<
  ScoreFormat,
  { max: number; step: number; label: string }
> = {
  POINT_100: { max: 100, step: 1, label: 'Score (0 – 100)' },
  POINT_10_DECIMAL: { max: 10, step: 0.5, label: 'Score (0.0 – 10.0)' },
  POINT_10: { max: 10, step: 1, label: 'Score (0 – 10)' },
  POINT_5: { max: 5, step: 1, label: 'Score (0 – 5)' },
  POINT_3: { max: 3, step: 1, label: 'Rating (1 – 3)' },
};

const POINT_3_LABELS: Record<number, string> = {
  0: 'Unscored',
  1: '1 · Disliked',
  2: '2 · Okay',
  3: '3 · Liked',
};

function fuzzyToInputValue(date: FuzzyDate | null | undefined): string {
  if (!date?.year || !date.month || !date.day) {
    return '';
  }
  const mm = String(date.month).padStart(2, '0');
  const dd = String(date.day).padStart(2, '0');
  return `${date.year}-${mm}-${dd}`;
}

function inputValueToFuzzy(value: string): FuzzyDate | undefined {
  if (!value) return undefined;
  const [y, m, d] = value.split('-').map((n) => Number.parseInt(n, 10));
  if (!y || !m || !d) return undefined;
  return { year: y, month: m, day: d };
}

function clampInitialScore(rawScore: number | null | undefined, format: ScoreFormat): number {
  if (!rawScore || rawScore <= 0) return 0;
  const max = SCORE_CONFIG[format].max;
  if (rawScore > max && max <= 10) {
    return Math.min(max, Math.round((rawScore / 100) * max));
  }
  return Math.min(max, rawScore);
}

export function ListEditorModal({
  open,
  onClose,
  media,
  entry,
}: ListEditorModalProps) {
  const location = useLocation();
  const viewer = useAuthStore((state) => state.viewer);
  const openLoginPrompt = useLoginPromptStore((state) => state.openLoginPrompt);
  const addToast = useToastStore((state) => state.addToast);
  const preferredLanguage = usePreferredTitleLanguage();

  const scoreFormat: ScoreFormat = viewer?.mediaListOptions?.scoreFormat ?? 'POINT_100';
  const scoreMeta = SCORE_CONFIG[scoreFormat];
  const maxProgress = media.type === 'MANGA' ? media.chapters : media.episodes;

  const [status, setStatus] = useState<MediaListStatus>('CURRENT');
  const [progress, setProgress] = useState(0);
  const [progressVolumes, setProgressVolumes] = useState(0);
  const [score, setScore] = useState(0);
  const [repeat, setRepeat] = useState(0);
  const [startedAt, setStartedAt] = useState('');
  const [completedAt, setCompletedAt] = useState('');
  const [notes, setNotes] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);

  const saveMutation = useSaveMediaListEntryMutation();
  const deleteMutation = useDeleteMediaListEntryMutation();

  useEffect(() => {
    if (!open) return;
    setStatus(entry?.status ?? 'CURRENT');
    setProgress(entry?.progress ?? 0);
    setProgressVolumes(entry?.progressVolumes ?? 0);
    setScore(clampInitialScore(entry?.score, scoreFormat));
    setRepeat(entry?.repeat ?? 0);
    setStartedAt(fuzzyToInputValue(entry?.startedAt));
    setCompletedAt(fuzzyToInputValue(entry?.completedAt));
    setNotes(entry?.notes ?? '');
    setIsPrivate(Boolean(entry?.private));
    setConfirmDelete(false);
    setAuthErrorMessage(null);
    // Only reset draft when opening the modal or switching the target entry/media (AF-02).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, media.id, entry?.id]);

  const title = formatMediaTitle(media.title, preferredLanguage);
  const isBusy = saveMutation.isPending || deleteMutation.isPending;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setAuthErrorMessage(null);

    try {
      await saveMutation.mutateAsync({
        id: entry?.id,
        mediaId: media.id,
        status,
        score,
        progress: Math.max(0, progress),
        progressVolumes: media.type === 'MANGA' ? Math.max(0, progressVolumes) : undefined,
        repeat: Math.max(0, repeat),
        private: isPrivate,
        notes: notes.trim() || undefined,
        startedAt: inputValueToFuzzy(startedAt),
        completedAt: inputValueToFuzzy(completedAt),
      });
      addToast({ variant: 'success', message: `Saved "${title}" to your list.` });
      onClose();
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        // AF-02: Keep modal & draft open cleanly so the user can re-auth without losing changes
        setAuthErrorMessage(
          'Your session expired. Log in again below without closing this editor.',
        );
      }
    }
  };

  const handleDelete = async () => {
    if (!entry?.id) return;
    setAuthErrorMessage(null);

    try {
      await deleteMutation.mutateAsync({
        id: entry.id,
        mediaId: media.id,
        type: media.type,
        userId: viewer?.id,
      });
      addToast({ variant: 'info', message: `Removed "${title}" from your list.` });
      onClose();
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        setAuthErrorMessage(
          'Your session expired. Log in again below without closing this editor.',
        );
      }
    }
  };

  return (
    <BottomSheetOrModal
      open={open}
      onClose={onClose}
      title={entry ? 'Edit List Entry' : 'Add to List'}
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <p className="text-xs font-semibold text-[var(--text-secondary)]">{title}</p>

        {authErrorMessage ? (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-300/60 bg-[var(--status-paused-bg)] p-3 text-xs font-medium text-[var(--status-paused-text)]"
          >
            <span>{authErrorMessage}</span>
            <Button
              type="button"
              size="sm"
              variant="primary"
              leftIcon={<LogIn className="h-3.5 w-3.5" strokeWidth={1.75} />}
              onClick={() =>
                openLoginPrompt(
                  'Re-authenticate with AniList to save your draft.',
                  location.pathname + location.search,
                )
              }
            >
              Log in again
            </Button>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          <label className="space-y-1 text-xs font-semibold text-[var(--text-secondary)]">
            <span>Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as MediaListStatus)}
              className="min-h-10 w-full rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-2.5 text-sm text-[var(--text-primary)]"
            >
              {ALL_STATUSES.map((opt) => (
                <option key={opt} value={opt}>
                  {formatListStatusLabel(opt, media.type)}
                </option>
              ))}
            </select>
          </label>

          {scoreFormat === 'POINT_3' ? (
            <label className="space-y-1 text-xs font-semibold text-[var(--text-secondary)]">
              <span>{scoreMeta.label}</span>
              <select
                aria-label={scoreMeta.label}
                value={score}
                onChange={(e) => setScore(Number(e.target.value))}
                className="min-h-10 w-full rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-2.5 text-sm text-[var(--text-primary)]"
              >
                {[0, 1, 2, 3].map((val) => (
                  <option key={val} value={val}>
                    {POINT_3_LABELS[val]}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="space-y-1 text-xs font-semibold text-[var(--text-secondary)]">
              <span>{scoreMeta.label}</span>
              <input
                type="number"
                min={0}
                max={scoreMeta.max}
                step={scoreMeta.step}
                value={score}
                onChange={(e) => {
                  const val = Number.parseFloat(e.target.value);
                  setScore(Number.isNaN(val) ? 0 : Math.max(0, Math.min(scoreMeta.max, val)));
                }}
                className="tabular-nums min-h-10 w-full rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 text-sm text-[var(--text-primary)]"
              />
            </label>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
          <div className="col-span-2 space-y-1 text-xs font-semibold text-[var(--text-secondary)] sm:col-span-1">
            <label htmlFor="editor-progress">
              {media.type === 'MANGA' ? 'Chapters' : 'Episodes'}{' '}
              {maxProgress ? `(of ${maxProgress})` : ''}
            </label>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                aria-label="Decrease progress"
                onClick={() => setProgress((prev) => Math.max(0, prev - 1))}
              >
                -
              </Button>
              <input
                id="editor-progress"
                type="number"
                min={0}
                max={maxProgress ?? undefined}
                value={progress}
                onChange={(e) => {
                  const val = Number.parseInt(e.target.value, 10);
                  const next = Number.isNaN(val) ? 0 : Math.max(0, val);
                  setProgress(maxProgress ? Math.min(maxProgress, next) : next);
                }}
                className="tabular-nums min-h-9 w-full rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-2 text-center text-sm text-[var(--text-primary)]"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                aria-label="Increase progress"
                onClick={() =>
                  setProgress((prev) =>
                    maxProgress ? Math.min(maxProgress, prev + 1) : prev + 1,
                  )
                }
              >
                +
              </Button>
            </div>
          </div>

          {media.type === 'MANGA' ? (
            <label className="space-y-1 text-xs font-semibold text-[var(--text-secondary)]">
              <span>Volumes</span>
              <input
                type="number"
                min={0}
                max={media.volumes ?? undefined}
                value={progressVolumes}
                onChange={(e) => {
                  const val = Number.parseInt(e.target.value, 10);
                  setProgressVolumes(Number.isNaN(val) ? 0 : Math.max(0, val));
                }}
                className="tabular-nums min-h-9 w-full rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 text-sm text-[var(--text-primary)]"
              />
            </label>
          ) : null}

          <label className="space-y-1 text-xs font-semibold text-[var(--text-secondary)]">
            <span>{media.type === 'MANGA' ? 'Total Rereads' : 'Total Rewatches'}</span>
            <input
              type="number"
              min={0}
              value={repeat}
              onChange={(e) => {
                const val = Number.parseInt(e.target.value, 10);
                setRepeat(Number.isNaN(val) ? 0 : Math.max(0, val));
              }}
              className="tabular-nums min-h-9 w-full rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 text-sm text-[var(--text-primary)]"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          <label className="space-y-1 text-xs font-semibold text-[var(--text-secondary)]">
            <span>Start Date</span>
            <input
              type="date"
              value={startedAt}
              onChange={(e) => setStartedAt(e.target.value)}
              className="tabular-nums min-h-10 w-full rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-2.5 text-sm text-[var(--text-primary)]"
            />
          </label>

          <label className="space-y-1 text-xs font-semibold text-[var(--text-secondary)]">
            <span>Finish Date</span>
            <input
              type="date"
              value={completedAt}
              onChange={(e) => setCompletedAt(e.target.value)}
              className="tabular-nums min-h-10 w-full rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-2.5 text-sm text-[var(--text-primary)]"
            />
          </label>
        </div>

        <label className="block space-y-1 text-xs font-semibold text-[var(--text-secondary)]">
          <span>Notes</span>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Personal notes about this title..."
            className="w-full rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
          />
        </label>

        <label className="flex items-center gap-2.5 text-xs font-medium text-[var(--text-secondary)]">
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={(e) => setIsPrivate(e.target.checked)}
            className="h-4 w-4 accent-[var(--accent-primary)]"
          />
          <span>Private entry (hidden from public list)</span>
        </label>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-hairline)] pt-3">
          {entry?.id ? (
            confirmDelete ? (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  isLoading={deleteMutation.isPending}
                  onClick={() => void handleDelete()}
                >
                  Confirm Delete
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isBusy}
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="danger"
                size="sm"
                disabled={isBusy}
                onClick={() => setConfirmDelete(true)}
                leftIcon={<Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />}
              >
                Delete Entry
              </Button>
            )
          ) : (
            <span />
          )}

          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" disabled={isBusy} onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={saveMutation.isPending}>
              Save Entry
            </Button>
          </div>
        </div>
      </form>
    </BottomSheetOrModal>
  );
}

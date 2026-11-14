export type MediaType = 'ANIME' | 'MANGA';

export type MediaFormat =
  | 'TV'
  | 'TV_SHORT'
  | 'MOVIE'
  | 'SPECIAL'
  | 'OVA'
  | 'ONA'
  | 'MUSIC'
  | 'MANGA'
  | 'NOVEL'
  | 'ONE_SHOT';

export type MediaStatus =
  | 'FINISHED'
  | 'RELEASING'
  | 'NOT_YET_RELEASED'
  | 'CANCELLED'
  | 'HIATUS';

export type MediaSeason = 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL';

export type MediaSort =
  | 'ID'
  | 'ID_DESC'
  | 'TITLE_ROMAJI'
  | 'TITLE_ROMAJI_DESC'
  | 'TITLE_ENGLISH'
  | 'TITLE_ENGLISH_DESC'
  | 'TITLE_NATIVE'
  | 'TITLE_NATIVE_DESC'
  | 'START_DATE'
  | 'START_DATE_DESC'
  | 'END_DATE'
  | 'END_DATE_DESC'
  | 'SCORE'
  | 'SCORE_DESC'
  | 'POPULARITY'
  | 'POPULARITY_DESC'
  | 'TRENDING'
  | 'TRENDING_DESC'
  | 'UPDATED_AT_DESC'
  | 'SEARCH_MATCH'
  | 'FAVOURITES_DESC';

export type MediaRelation =
  | 'ADAPTATION'
  | 'PREQUEL'
  | 'SEQUEL'
  | 'PARENT'
  | 'SIDE_STORY'
  | 'CHARACTER'
  | 'SUMMARY'
  | 'ALTERNATIVE'
  | 'SPIN_OFF'
  | 'OTHER'
  | 'SOURCE'
  | 'COMPILATION'
  | 'CONTAINS'
  | 'SAME_UNIVERSE';

export type MediaListStatus =
  | 'CURRENT'
  | 'PLANNING'
  | 'COMPLETED'
  | 'DROPPED'
  | 'PAUSED'
  | 'REPEATING';

export type UserTitleLanguage =
  | 'ROMAJI'
  | 'ENGLISH'
  | 'NATIVE'
  | 'ROMAJI_STYLISED'
  | 'ENGLISH_STYLISED'
  | 'NATIVE_STYLISED';

export type ScoreFormat =
  | 'POINT_100'
  | 'POINT_10_DECIMAL'
  | 'POINT_10'
  | 'POINT_5'
  | 'POINT_3';

export interface FuzzyDate {
  year: number | null;
  month: number | null;
  day: number | null;
}

export interface MediaTitle {
  romaji: string | null;
  english: string | null;
  native: string | null;
}

export interface MediaCoverImage {
  extraLarge: string | null;
  large: string | null;
  medium: string | null;
  color: string | null;
}

export interface MediaTrailer {
  id: string | null;
  site: string | null;
  thumbnail: string | null;
}

export interface MediaExternalLink {
  id: number;
  url: string | null;
  site: string;
  type: string | null;
  color: string | null;
}

export interface MediaTag {
  id: number;
  name: string;
  rank: number | null;
  isMediaSpoiler: boolean | null;
}

export interface NextAiringEpisode {
  id: number;
  airingAt: number;
  timeUntilAiring: number;
  episode: number;
}

export interface MediaListEntrySummary {
  id: number;
  status: MediaListStatus | null;
  score: number | null;
  progress: number | null;
  progressVolumes: number | null;
  repeat: number | null;
  private: boolean | null;
  notes: string | null;
  startedAt: FuzzyDate | null;
  completedAt: FuzzyDate | null;
  updatedAt: number | null;
}

export interface MediaSummary {
  id: number;
  idMal: number | null;
  type: MediaType;
  format: MediaFormat | null;
  status: MediaStatus | null;
  title: MediaTitle;
  coverImage: MediaCoverImage | null;
  bannerImage: string | null;
  episodes: number | null;
  chapters: number | null;
  volumes: number | null;
  season: MediaSeason | null;
  seasonYear: number | null;
  meanScore: number | null;
  weightedScore?: number | null;
  popularity: number | null;
  genres: string[];
  isAdult: boolean | null;
  nextAiringEpisode: NextAiringEpisode | null;
  mediaListEntry: MediaListEntrySummary | null;
}

export interface CharacterEdge {
  id: number;
  role: string | null;
  node: {
    id: number;
    name: {
      full: string | null;
      native: string | null;
    };
    image: {
      medium: string | null;
      large: string | null;
    } | null;
  };
  voiceActors: Array<{
    id: number;
    name: {
      full: string | null;
    };
    languageV2: string | null;
    image: {
      medium: string | null;
    } | null;
  }>;
}

export interface MediaEdge {
  id: number;
  relationType: MediaRelation | null;
  node: MediaSummary;
}

export type SearchEntityType =
  | 'ANIME'
  | 'MANGA'
  | 'CHARACTER'
  | 'STAFF'
  | 'STUDIO'
  | 'USER';

export type CharacterSort =
  | 'ID'
  | 'ID_DESC'
  | 'ROLE'
  | 'ROLE_DESC'
  | 'SEARCH_MATCH'
  | 'FAVOURITES'
  | 'FAVOURITES_DESC'
  | 'RELEVANCE';

export type StaffSort =
  | 'ID'
  | 'ID_DESC'
  | 'ROLE'
  | 'ROLE_DESC'
  | 'LANGUAGE'
  | 'LANGUAGE_DESC'
  | 'SEARCH_MATCH'
  | 'FAVOURITES'
  | 'FAVOURITES_DESC'
  | 'RELEVANCE';

export type StudioSort =
  | 'ID'
  | 'ID_DESC'
  | 'NAME'
  | 'NAME_DESC'
  | 'SEARCH_MATCH'
  | 'FAVOURITES'
  | 'FAVOURITES_DESC';

export type UserSort =
  | 'ID'
  | 'ID_DESC'
  | 'USERNAME'
  | 'USERNAME_DESC'
  | 'WATCHED_TIME'
  | 'WATCHED_TIME_DESC'
  | 'CHAPTERS_READ'
  | 'CHAPTERS_READ_DESC'
  | 'SEARCH_MATCH';

export interface CharacterSummary {
  id: number;
  name: {
    full: string | null;
    native: string | null;
  };
  image: {
    medium: string | null;
    large: string | null;
  } | null;
  favourites?: number | null;
}

export interface StaffSummary {
  id: number;
  name: {
    full: string | null;
    native: string | null;
  };
  languageV2: string | null;
  image: {
    medium: string | null;
    large: string | null;
  } | null;
  primaryOccupations?: string[] | null;
  favourites?: number | null;
}

export interface StudioSummary {
  id: number;
  name: string;
  isAnimationStudio: boolean;
  favourites?: number | null;
}

export interface UserSearchSummary {
  id: number;
  name: string;
  avatar: {
    large: string | null;
    medium: string | null;
  } | null;
  bannerImage: string | null;
  moderatorRoles: string[] | null;
  statistics?: {
    anime?: {
      count: number;
      minutesWatched: number;
    } | null;
    manga?: {
      count: number;
      chaptersRead: number;
    } | null;
  } | null;
}

export interface MediaStaffEdge {
  id: number;
  role: string | null;
  node: StaffSummary;
}

export interface MediaStudioEdge {
  id: number;
  isMain: boolean;
  node: StudioSummary;
}

export interface RecommendationNode {
  id: number;
  rating: number | null;
  mediaRecommendation: MediaSummary | null;
}

export interface MediaDetail extends MediaSummary {
  description: string | null;
  duration: number | null;
  source: string | null;
  countryOfOrigin: string | null;
  startDate: FuzzyDate | null;
  endDate: FuzzyDate | null;
  synonyms: string[];
  favourites: number | null;
  trailer: MediaTrailer | null;
  tags: MediaTag[];
  studios: {
    edges?: MediaStudioEdge[];
    nodes?: StudioSummary[];
  } | null;
  externalLinks: MediaExternalLink[];
  relations: {
    edges: MediaEdge[];
  } | null;
  characters: {
    edges: CharacterEdge[];
  } | null;
  staff?: {
    edges: MediaStaffEdge[];
  } | null;
  recommendations: {
    nodes: RecommendationNode[];
  } | null;
}

export interface CharacterMediaEdge {
  id: number;
  relationType: MediaRelation | null;
  characterRole: string | null;
  voiceActors: Array<{
    id: number;
    name: {
      full: string | null;
    };
    languageV2: string | null;
    image: {
      medium: string | null;
    } | null;
  }>;
  node: MediaSummary;
}

export interface CharacterDetail extends CharacterSummary {
  name: {
    full: string | null;
    native: string | null;
    alternative?: string[] | null;
    alternativeSpoiler?: string[] | null;
  };
  description: string | null;
  gender: string | null;
  dateOfBirth: FuzzyDate | null;
  age: string | null;
  bloodType: string | null;
  siteUrl: string | null;
}

export interface StaffCharacterMediaEdge {
  id: number;
  characterRole: string | null;
  characters: Array<{
    id: number;
    name: {
      full: string | null;
      native: string | null;
    };
    image: {
      medium: string | null;
      large: string | null;
    } | null;
  }>;
  node: MediaSummary;
}

export interface StaffMediaEdge {
  id: number;
  staffRole: string | null;
  node: MediaSummary;
}

export interface StaffDetail extends StaffSummary {
  name: {
    full: string | null;
    native: string | null;
    alternative?: string[] | null;
  };
  description: string | null;
  gender: string | null;
  dateOfBirth: FuzzyDate | null;
  dateOfDeath: FuzzyDate | null;
  age: number | null;
  yearsActive: number[] | null;
  homeTown: string | null;
  bloodType: string | null;
  siteUrl: string | null;
}

export interface StudioMediaEdge {
  id: number;
  isMainStudio: boolean;
  node: MediaSummary;
}

export interface StudioDetail extends StudioSummary {
  siteUrl: string | null;
}

export interface AiringScheduleItem {
  id: number;
  airingAt: number;
  timeUntilAiring: number;
  episode: number;
  mediaId: number;
  media: MediaSummary;
}

export interface MediaListEntry extends MediaListEntrySummary {
  mediaId: number;
  media: MediaSummary;
}

export interface MediaListGroup {
  name: string;
  isCustomList: boolean | null;
  status: MediaListStatus | null;
  entries: MediaListEntry[];
}

export interface MediaListCollection {
  lists: MediaListGroup[];
  hasNextChunk: boolean | null;
}

export interface UserMediaStatistics {
  count: number;
  meanScore: number;
  minutesWatched: number;
  episodesWatched: number;
  chaptersRead: number;
  volumesRead: number;
}

export interface UserOptions {
  titleLanguage: UserTitleLanguage | null;
  displayAdultContent: boolean | null;
  includeAdultContentInSearch?: boolean | null;
  profileColor: string | null;
}

export interface UserMediaListOptions {
  scoreFormat: ScoreFormat | null;
  rowOrder: string | null;
}

export interface UserProfile {
  id: number;
  name: string;
  about: string | null;
  avatar: {
    large: string | null;
    medium: string | null;
  } | null;
  bannerImage: string | null;
  siteUrl: string | null;
  unreadNotificationCount?: number | null;
  options: UserOptions | null;
  mediaListOptions: UserMediaListOptions | null;
  statistics: {
    anime: UserMediaStatistics | null;
    manga: UserMediaStatistics | null;
  } | null;
  favourites?: {
    anime: { nodes: MediaSummary[] } | null;
    manga: { nodes: MediaSummary[] } | null;
  } | null;
}

export interface PageInfo {
  total: number | null;
  perPage: number | null;
  currentPage: number | null;
  lastPage: number | null;
  hasNextPage: boolean | null;
}

export interface SaveMediaListEntryInput {
  id?: number;
  mediaId?: number;
  status?: MediaListStatus;
  score?: number;
  progress?: number;
  progressVolumes?: number;
  repeat?: number;
  private?: boolean;
  notes?: string;
  startedAt?: FuzzyDate;
  completedAt?: FuzzyDate;
}

export interface UpdateUserInput {
  about?: string;
  titleLanguage?: UserTitleLanguage;
  displayAdultContent?: boolean;
  includeAdultContentInSearch?: boolean;
  scoreFormat?: ScoreFormat;
  profileColor?: string;
}

export type NotificationType =
  | 'ACTIVITY_MESSAGE'
  | 'ACTIVITY_REPLY'
  | 'FOLLOWING'
  | 'ACTIVITY_MENTION'
  | 'THREAD_COMMENT_MENTION'
  | 'THREAD_SUBSCRIBED'
  | 'THREAD_COMMENT_REPLY'
  | 'AIRING'
  | 'ACTIVITY_LIKE'
  | 'ACTIVITY_REPLY_LIKE'
  | 'THREAD_LIKE'
  | 'THREAD_COMMENT_LIKE'
  | 'ACTIVITY_REPLY_SUBSCRIBED'
  | 'RELATED_MEDIA_ADDITION'
  | 'MEDIA_DATA_CHANGE'
  | 'MEDIA_MERGE'
  | 'MEDIA_DELETION'
  | 'MEDIA_SUBMISSION_UPDATE'
  | 'STAFF_SUBMISSION_UPDATE'
  | 'CHARACTER_SUBMISSION_UPDATE';

export interface NotificationUserRef {
  id: number;
  name: string;
  avatar?: {
    medium?: string | null;
    large?: string | null;
  } | null;
}

export interface NotificationMediaRef {
  id: number;
  type: MediaType | null;
  isAdult?: boolean | null;
  title: MediaTitle;
  coverImage?: MediaCoverImage | null;
  siteUrl?: string | null;
}

export interface AiringNotificationItem {
  id: number;
  type: 'AIRING';
  animeId: number;
  episode: number;
  contexts: string[] | null;
  createdAt: number | null;
  media: NotificationMediaRef | null;
}

export interface FollowingNotificationItem {
  id: number;
  type: 'FOLLOWING';
  userId: number;
  context: string | null;
  createdAt: number | null;
  user: NotificationUserRef | null;
}

export interface ActivityNotificationItem {
  id: number;
  type:
    | 'ACTIVITY_MESSAGE'
    | 'ACTIVITY_REPLY'
    | 'ACTIVITY_MENTION'
    | 'ACTIVITY_LIKE'
    | 'ACTIVITY_REPLY_LIKE'
    | 'ACTIVITY_REPLY_SUBSCRIBED';
  userId: number;
  activityId: number;
  context: string | null;
  createdAt: number | null;
  user: NotificationUserRef | null;
  activity?: { siteUrl?: string | null } | null;
  message?: { siteUrl?: string | null } | null;
}

export interface ThreadNotificationItem {
  id: number;
  type:
    | 'THREAD_COMMENT_MENTION'
    | 'THREAD_COMMENT_REPLY'
    | 'THREAD_SUBSCRIBED'
    | 'THREAD_COMMENT_LIKE'
    | 'THREAD_LIKE';
  userId: number;
  commentId?: number | null;
  threadId?: number | null;
  context: string | null;
  createdAt: number | null;
  user: NotificationUserRef | null;
  thread?: { id: number; title?: string | null; siteUrl?: string | null } | null;
  comment?: { id: number; siteUrl?: string | null } | null;
}

export interface MediaChangeNotificationItem {
  id: number;
  type:
    | 'RELATED_MEDIA_ADDITION'
    | 'MEDIA_DATA_CHANGE'
    | 'MEDIA_MERGE'
    | 'MEDIA_DELETION';
  mediaId?: number | null;
  context: string | null;
  reason?: string | null;
  deletedMediaTitle?: string | null;
  deletedMediaTitles?: string[] | null;
  createdAt: number | null;
  media?: NotificationMediaRef | null;
}

export interface SubmissionUpdateNotificationItem {
  id: number;
  type:
    | 'MEDIA_SUBMISSION_UPDATE'
    | 'STAFF_SUBMISSION_UPDATE'
    | 'CHARACTER_SUBMISSION_UPDATE';
  contexts: string[] | null;
  status: string | null;
  notes?: string | null;
  submittedTitle?: string | null;
  createdAt: number | null;
  media?: NotificationMediaRef | null;
  staff?: {
    id: number;
    name?: { full?: string | null } | null;
    image?: { medium?: string | null } | null;
  } | null;
  character?: {
    id: number;
    name?: { full?: string | null } | null;
    image?: { medium?: string | null } | null;
  } | null;
}

export type AppNotification =
  | AiringNotificationItem
  | FollowingNotificationItem
  | ActivityNotificationItem
  | ThreadNotificationItem
  | MediaChangeNotificationItem
  | SubmissionUpdateNotificationItem;

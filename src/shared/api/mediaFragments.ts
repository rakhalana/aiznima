export const MEDIA_SUMMARY_FIELDS = `
  id
  idMal
  type
  format
  status
  title {
    romaji
    english
    native
  }
  coverImage {
    extraLarge
    large
    medium
    color
  }
  bannerImage
  episodes
  chapters
  volumes
  duration
  source
  season
  seasonYear
  meanScore
  popularity
  genres
  isAdult
  nextAiringEpisode {
    id
    airingAt
    timeUntilAiring
    episode
  }
  mediaListEntry {
    id
    status
    score
    progress
    progressVolumes
    repeat
    private
    notes
    startedAt {
      year
      month
      day
    }
    completedAt {
      year
      month
      day
    }
    updatedAt
  }
`;

export const CHARACTER_SUMMARY_FIELDS = `
  id
  name {
    full
    native
  }
  image {
    medium
    large
  }
  favourites
`;

export const STAFF_SUMMARY_FIELDS = `
  id
  name {
    full
    native
  }
  languageV2
  image {
    medium
    large
  }
  primaryOccupations
  favourites
`;

export const STUDIO_SUMMARY_FIELDS = `
  id
  name
  isAnimationStudio
  favourites
`;

export const USER_SUMMARY_FIELDS = `
  id
  name
  avatar {
    large
    medium
  }
  bannerImage
  moderatorRoles
  statistics {
    anime {
      count
      minutesWatched
    }
    manga {
      count
      chaptersRead
    }
  }
`;

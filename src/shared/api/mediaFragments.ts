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

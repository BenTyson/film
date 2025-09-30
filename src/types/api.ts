// API Type Definitions
export interface TMDBMovie {
  id: number;
  title: string;
  release_date: string | null;
  director?: string | null;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  runtime?: number;
  genres?: Array<{ id: number; name: string }>;
  imdb_id?: string | null;
  vote_average?: number;
}

export interface CSVRow {
  '#': string;
  'Yr': string;
  'Title': string;
  'Dir.': string;
  'Notes': string;
  'Completed': string;
  rowNumber?: number;
}

export interface DatabaseMovie {
  id: number;
  tmdb_id: number | null;
  title: string;
  director: string | null;
  release_date: Date | null;
  overview?: string | null;
  poster_path?: string | null;
  backdrop_path?: string | null;
  runtime?: number | null;
  genres?: unknown;
  imdb_id?: string | null;
  imdb_rating?: number | null;
  csv_row_number?: number | null;
  csv_title?: string | null;
  csv_director?: string | null;
  csv_year?: string | null;
  csv_notes?: string | null;
  approval_status?: string | null;
  user_movies?: Array<{
    id: number;
    movie_id: number;
    date_watched: Date | null;
    personal_rating: number | null;
    notes: string | null;
  }>;
  oscar_data?: Array<{
    id: number;
    ceremony_year: number;
    category: string;
    is_winner: boolean;
    nominee_name: string | null;
  }>;
  movie_tags?: Array<{
    id: number;
    tag: {
      id: number;
      name: string;
      color: string | null;
      icon: string | null;
    };
  }>;
}

export interface OscarNomination {
  id: number;
  ceremony_year: number;
  category_id: number | null;
  movie_id: number | null;
  nominee_name: string | null;
  is_winner: boolean;
  category?: {
    name: string;
    category_group: string | null;
  };
  movie?: {
    id: number;
    tmdb_id: number | null;
    title: string;
  };
}

export interface PaginationParams {
  page: number;
  limit: number;
  search?: string;
  year?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  tag?: string;
}

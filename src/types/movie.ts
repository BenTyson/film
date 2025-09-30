/* eslint-disable @typescript-eslint/no-explicit-any */
export interface Movie {
  id: number;
  tmdb_id: number;
  title: string;
  release_date: Date | null;
  director: string | null;
  overview: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  runtime: number | null;
  genres: any; // JSON field
  imdb_id: string | null;
  imdb_rating: number | null;
  csv_row_number: number | null;
  csv_title: string | null;
  csv_director: string | null;
  csv_year: string | null;
  csv_notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface UserMovie {
  id: number;
  movie_id: number;
  date_watched: Date;
  personal_rating: number | null;
  notes: string | null;
  is_favorite: boolean;
  watch_location: string | null;
  created_at: Date;
  updated_at: Date;
  movie?: Movie;
}

export interface OscarData {
  id: number;
  movie_id: number;
  ceremony_year: number;
  category: string;
  nomination_type: 'nominated' | 'won';
  nominee_name: string | null;
  created_at: Date;
  movie?: Movie;
}

export interface Tag {
  id: number;
  name: string;
  color: string | null;
  icon: string | null;
  created_at: Date;
}

export interface MovieTag {
  id: number;
  movie_id: number;
  tag_id: number;
  created_at: Date;
  movie?: Movie;
  tag?: Tag;
}

export interface MovieWithDetails extends Movie {
  user_movies: UserMovie[];
  oscar_data: OscarData[];
  movie_tags: MovieTag[];
}

export interface MovieFilters {
  search?: string;
  year?: number;
  yearRange?: { start: number; end: number };
  director?: string;
  rating?: { min: number; max: number };
  personalRating?: { min: number; max: number };
  genres?: string[];
  tags?: string[];
  oscars?: 'nominated' | 'won' | 'any';
  favorites?: boolean;
  dateWatched?: { start: Date; end: Date };
  page?: number;
  limit?: number;
  sortBy?: 'title' | 'release_date' | 'date_watched' | 'personal_rating' | 'imdb_rating';
  sortOrder?: 'asc' | 'desc';
}

export interface MovieGridItem {
  id: number;
  tmdb_id: number;
  title: string;
  release_date: Date | null;
  director: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  personal_rating: number | null;
  date_watched: Date | null;
  is_favorite: boolean;
  oscar_badges: {
    nominations: number;
    wins: number;
    categories: string[];
  };
  tags: {
    name: string;
    color: string | null;
    icon: string | null;
  }[];
}
// Vault types for the Film app

export interface VaultMovie {
  id: number;
  vault_id: number;
  tmdb_id: number;
  title: string;
  director: string | null;
  release_date: Date | null;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string | null;
  runtime: number | null;
  genres: unknown; // JSON
  vote_average: number | null;
  imdb_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface VaultMovieWithCollectionStatus extends VaultMovie {
  in_collection: boolean;
  collection_movie_id: number | null; // ID from the Movie table if in collection
}

export interface Vault {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface VaultWithCount extends Vault {
  movie_count: number;
  preview_posters: string[]; // Array of poster paths for preview
}

export interface VaultWithMovies extends Vault {
  movies: VaultMovieWithCollectionStatus[];
}

export interface CreateVaultInput {
  name: string;
  description?: string;
}

export interface UpdateVaultInput {
  name?: string;
  description?: string;
}

export interface AddMovieToVaultInput {
  tmdb_id: number;
  title: string;
  director?: string;
  release_date?: string;
  poster_path?: string;
  backdrop_path?: string;
  overview?: string;
  runtime?: number;
  genres?: unknown;
  vote_average?: number;
  imdb_id?: string;
}

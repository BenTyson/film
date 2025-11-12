interface TMDBMovie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  genre_ids: number[];
  adult: boolean;
  vote_average: number;
  vote_count: number;
  popularity: number;
}

interface TMDBMovieDetails extends TMDBMovie {
  runtime: number | null;
  genres: { id: number; name: string }[];
  production_companies: { id: number; name: string; logo_path: string | null }[];
  production_countries: { iso_3166_1: string; name: string }[];
  spoken_languages: { english_name: string; iso_639_1: string; name: string }[];
  status: string;
  tagline: string | null;
  budget: number;
  revenue: number;
  imdb_id: string | null;
  homepage: string | null;
}

interface TMDBSearchResponse {
  page: number;
  results: TMDBMovie[];
  total_pages: number;
  total_results: number;
}

interface TMDBCredits {
  id: number;
  cast: {
    id: number;
    name: string;
    character: string;
    profile_path: string | null;
    order: number;
  }[];
  crew: {
    id: number;
    name: string;
    job: string;
    department: string;
    profile_path: string | null;
  }[];
}

interface TMDBConfiguration {
  images: {
    base_url: string;
    secure_base_url: string;
    backdrop_sizes: string[];
    logo_sizes: string[];
    poster_sizes: string[];
    profile_sizes: string[];
    still_sizes: string[];
  };
  change_keys: string[];
}

interface TMDBVideo {
  id: string;
  iso_639_1: string;
  iso_3166_1: string;
  key: string;
  name: string;
  site: 'YouTube' | 'Vimeo';
  size: number;
  type: 'Trailer' | 'Teaser' | 'Clip' | 'Behind the Scenes' | 'Bloopers' | 'Featurette';
  official: boolean;
  published_at: string;
}

interface TMDBVideosResponse {
  id: number;
  results: TMDBVideo[];
}

interface TMDBWatchProvider {
  logo_path: string;
  provider_id: number;
  provider_name: string;
  display_priority: number;
}

interface TMDBWatchProvidersResult {
  link: string;
  flatrate?: TMDBWatchProvider[];
  rent?: TMDBWatchProvider[];
  buy?: TMDBWatchProvider[];
}

interface TMDBWatchProvidersResponse {
  id: number;
  results: {
    [countryCode: string]: TMDBWatchProvidersResult;
  };
}

interface TMDBPerson {
  id: number;
  name: string;
  profile_path: string | null;
  known_for_department: string;
  popularity: number;
  known_for: TMDBMovie[];
}

interface TMDBPersonSearchResponse {
  page: number;
  results: TMDBPerson[];
  total_pages: number;
  total_results: number;
}

interface TMDBPersonDetails {
  id: number;
  name: string;
  biography: string;
  birthday: string | null;
  deathday: string | null;
  place_of_birth: string | null;
  profile_path: string | null;
  known_for_department: string;
  popularity: number;
}

export interface WatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
  logo_url: string;
  type: 'flatrate' | 'rent' | 'buy';
}

export interface WatchProvidersData {
  providers: WatchProvider[];
  link: string | null;
}

class TMDBClient {
  private readonly baseURL = 'https://api.themoviedb.org/3';
  private readonly apiKey: string;
  private readonly headers: HeadersInit;

  constructor() {
    this.apiKey = process.env.TMDB_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('TMDB_API_KEY environment variable is required');
    }

    this.headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private async makeRequest<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseURL}${endpoint}`);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    const response = await fetch(url.toString(), {
      headers: this.headers,
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('TMDB API rate limit exceeded');
      }
      throw new Error(`TMDB API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async searchMovies(query: string, year?: number, page = 1): Promise<TMDBSearchResponse> {
    const params: Record<string, string> = {
      query,
      page: page.toString(),
      include_adult: 'false',
    };

    if (year) {
      params.year = year.toString();
    }

    return this.makeRequest<TMDBSearchResponse>('/search/movie', params);
  }

  // Enhanced search with multiple strategies
  async searchMoviesEnhanced(query: string, year?: number): Promise<TMDBSearchResponse> {
    console.log(`Starting enhanced search for: "${query}" ${year ? `(${year})` : ''}`);

    // Strategy 1: Exact search
    try {
      const exactResult = await this.searchMovies(query, year);
      if (exactResult.results.length > 0) {
        console.log(`Exact search found ${exactResult.results.length} results`);
        return exactResult;
      }
    } catch (error) {
      console.log('Exact search failed:', error);
    }

    // Strategy 2: Search without year if year was provided
    if (year) {
      try {
        const noYearResult = await this.searchMovies(query);
        if (noYearResult.results.length > 0) {
          console.log(`No-year search found ${noYearResult.results.length} results`);
          return noYearResult;
        }
      } catch (error) {
        console.log('No-year search failed:', error);
      }
    }

    // Strategy 3: Search with adult content included
    try {
      const params: Record<string, string> = {
        query,
        page: '1',
        include_adult: 'true',
      };
      if (year) {
        params.year = year.toString();
      }

      const adultResult = await this.makeRequest<TMDBSearchResponse>('/search/movie', params);
      if (adultResult.results.length > 0) {
        console.log(`Adult-included search found ${adultResult.results.length} results`);
        return adultResult;
      }
    } catch (error) {
      console.log('Adult-included search failed:', error);
    }

    // Strategy 4: Clean the query (remove common words, punctuation)
    const cleanedQuery = this.cleanQuery(query);
    if (cleanedQuery !== query) {
      try {
        const cleanedResult = await this.searchMovies(cleanedQuery, year);
        if (cleanedResult.results.length > 0) {
          console.log(`Cleaned query search found ${cleanedResult.results.length} results`);
          return cleanedResult;
        }
      } catch (error) {
        console.log('Cleaned query search failed:', error);
      }
    }

    // Strategy 5: Search with individual words if multi-word title
    const words = query.split(' ').filter(word => word.length > 2);
    if (words.length > 1) {
      for (const word of words) {
        try {
          const wordResult = await this.searchMovies(word, year);
          if (wordResult.results.length > 0) {
            // Filter results that contain the original query words
            const filteredResults = wordResult.results.filter(movie =>
              words.some(w => movie.title.toLowerCase().includes(w.toLowerCase()))
            );
            if (filteredResults.length > 0) {
              console.log(`Word search for "${word}" found ${filteredResults.length} relevant results`);
              return { ...wordResult, results: filteredResults };
            }
          }
        } catch (error) {
          console.log(`Word search for "${word}" failed:`, error);
        }
      }
    }

    console.log('All search strategies failed');
    return { page: 1, results: [], total_pages: 0, total_results: 0 };
  }

  private cleanQuery(query: string): string {
    return query
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\b(the|a|an)\b/gi, '') // Remove articles
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
  }

  // Extract TMDB ID from URL or return the number if it's already an ID
  extractTMDBId(input: string): number | null {
    // Check if it's already a number
    const directId = parseInt(input);
    if (!isNaN(directId) && directId > 0) {
      return directId;
    }

    // Extract from TMDB URL patterns
    const urlPatterns = [
      /\/movie\/(\d+)/, // Standard URL format
      /themoviedb\.org\/movie\/(\d+)/, // Full URL
      /tmdb\.org\/movie\/(\d+)/, // Short URL
    ];

    for (const pattern of urlPatterns) {
      const match = input.match(pattern);
      if (match && match[1]) {
        const id = parseInt(match[1]);
        if (!isNaN(id) && id > 0) {
          return id;
        }
      }
    }

    return null;
  }

  // Search by TMDB ID or URL
  async getMovieByIdOrUrl(input: string): Promise<TMDBMovieDetails | null> {
    const movieId = this.extractTMDBId(input);
    if (!movieId) {
      return null;
    }

    try {
      return await this.getMovieDetails(movieId);
    } catch (error) {
      console.error(`Error fetching movie with ID ${movieId}:`, error);
      return null;
    }
  }

  async getMovieDetails(movieId: number): Promise<TMDBMovieDetails> {
    return this.makeRequest<TMDBMovieDetails>(`/movie/${movieId}`);
  }

  async getMovieCredits(movieId: number): Promise<TMDBCredits> {
    return this.makeRequest<TMDBCredits>(`/movie/${movieId}/credits`);
  }

  async searchPerson(name: string, page = 1): Promise<TMDBPersonSearchResponse> {
    const params: Record<string, string> = {
      query: name,
      page: page.toString(),
      include_adult: 'false',
    };

    return this.makeRequest<TMDBPersonSearchResponse>('/search/person', params);
  }

  async getPersonDetails(personId: number): Promise<TMDBPersonDetails> {
    return this.makeRequest<TMDBPersonDetails>(`/person/${personId}`);
  }

  getProfileURL(path: string | null, size: 'w45' | 'w185' | 'h632' | 'original' = 'w185'): string | null {
    if (!path) return null;
    return `https://image.tmdb.org/t/p/${size}${path}`;
  }

  async getConfiguration(): Promise<TMDBConfiguration> {
    return this.makeRequest<TMDBConfiguration>('/configuration');
  }

  async getMovieVideos(movieId: number): Promise<TMDBVideosResponse> {
    return this.makeRequest<TMDBVideosResponse>(`/movie/${movieId}/videos`);
  }

  async getWatchProviders(movieId: number, region: string = 'US'): Promise<WatchProvidersData> {
    try {
      const response = await this.makeRequest<TMDBWatchProvidersResponse>(
        `/movie/${movieId}/watch/providers`
      );

      const regionData = response.results[region];

      if (!regionData) {
        return { providers: [], link: null };
      }

      const providers: WatchProvider[] = [];

      // Combine all provider types (flatrate, rent, buy)
      const addProviders = (providerList: TMDBWatchProvider[] | undefined, type: 'flatrate' | 'rent' | 'buy') => {
        if (providerList) {
          providerList.forEach((provider) => {
            // Avoid duplicates - some movies appear in multiple categories
            if (!providers.some(p => p.provider_id === provider.provider_id)) {
              providers.push({
                provider_id: provider.provider_id,
                provider_name: provider.provider_name,
                logo_path: provider.logo_path,
                logo_url: this.getImageURL(provider.logo_path, 'w200') || '',
                type,
              });
            }
          });
        }
      };

      addProviders(regionData.flatrate, 'flatrate');
      addProviders(regionData.rent, 'rent');
      addProviders(regionData.buy, 'buy');

      // Sort by display priority if available, otherwise by name
      providers.sort((a, b) => a.provider_name.localeCompare(b.provider_name));

      return {
        providers,
        link: regionData.link || null,
      };
    } catch (error) {
      console.error('Error fetching watch providers:', error);
      return { providers: [], link: null };
    }
  }

  getImageURL(path: string | null, size: 'w200' | 'w300' | 'w400' | 'w500' | 'w780' | 'w1280' | 'original' = 'w500'): string | null {
    if (!path) return null;
    return `https://image.tmdb.org/t/p/${size}${path}`;
  }

  getPosterURL(path: string | null, size: 'w200' | 'w300' | 'w400' | 'w500' | 'w780' | 'original' = 'w500'): string | null {
    return this.getImageURL(path, size);
  }

  getBackdropURL(path: string | null, size: 'w300' | 'w780' | 'w1280' | 'original' = 'w1280'): string | null {
    return this.getImageURL(path, size);
  }

  findDirector(credits: TMDBCredits): string | null {
    const director = credits.crew.find(person => person.job === 'Director');
    return director?.name || null;
  }

  getYouTubeURL(videoKey: string): string {
    return `https://www.youtube.com/watch?v=${videoKey}`;
  }

  getYouTubeEmbedURL(videoKey: string): string {
    return `https://www.youtube.com/embed/${videoKey}`;
  }

  getYouTubeThumbnailURL(videoKey: string, quality: 'default' | 'hqdefault' | 'maxresdefault' = 'hqdefault'): string {
    return `https://img.youtube.com/vi/${videoKey}/${quality}.jpg`;
  }

  findBestTrailer(videos: TMDBVideo[]): TMDBVideo | null {
    // Filter for trailers only
    const trailers = videos.filter(video =>
      video.site === 'YouTube' &&
      (video.type === 'Trailer' || video.type === 'Teaser')
    );

    if (trailers.length === 0) return null;

    // Prioritize official trailers
    const officialTrailers = trailers.filter(trailer => trailer.official);
    if (officialTrailers.length > 0) {
      // Sort by type preference: Trailer > Teaser, then by size (larger is better)
      return officialTrailers.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'Trailer' ? -1 : 1;
        }
        return b.size - a.size;
      })[0];
    }

    // If no official trailers, return the best non-official one
    return trailers.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'Trailer' ? -1 : 1;
      }
      return b.size - a.size;
    })[0];
  }

  async searchMovieWithDetails(query: string, year?: number): Promise<{
    movie: TMDBMovieDetails;
    director: string | null;
  } | null> {
    try {
      const searchResults = await this.searchMovies(query, year);

      if (searchResults.results.length === 0) {
        return null;
      }

      const firstResult = searchResults.results[0];
      const [movieDetails, credits] = await Promise.all([
        this.getMovieDetails(firstResult.id),
        this.getMovieCredits(firstResult.id),
      ]);

      const director = this.findDirector(credits);

      return {
        movie: movieDetails,
        director,
      };
    } catch (error) {
      console.error('Error searching movie with details:', error);
      return null;
    }
  }
}

// Create singleton instance
export const tmdb = new TMDBClient();

// Export types for use in other files
export type {
  TMDBMovie,
  TMDBMovieDetails,
  TMDBSearchResponse,
  TMDBCredits,
  TMDBConfiguration,
  TMDBVideo,
  TMDBVideosResponse,
  TMDBPerson,
  TMDBPersonSearchResponse,
  TMDBPersonDetails,
};
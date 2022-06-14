import {
  KazagumoPlugin as Plugin,
  KazagumoSearchOptions,
  KazagumoSearchResult,
  Kazagumo,
  KazagumoError,
  KazagumoTrack,
  SearchResultTypes,
} from 'kazagumo';
import { RequestManager } from './RequestManager';

const REGEX = /(?:https:\/\/open\.spotify\.com\/|spotify:)(?:.+)?(track|playlist|album)[\/:]([A-Za-z0-9]+)/;

export interface SpotifyOptions {
  /** The client ID of your Spotify application. */
  clientId: string;
  /** The client secret of your Spotify application. */
  clientSecret: string;
  /** 100 tracks per page */
  playlistPageLimit?: number;
  /** 50 tracks per page */
  albumPageLimit?: number;
}

export class KazagumoPlugin extends Plugin {
  /**
   * The options of the plugin.
   */
  public options: SpotifyOptions;

  private _search: ((query: string, options?: KazagumoSearchOptions) => Promise<KazagumoSearchResult>) | null;
  private token: string = '';
  private kazagumo: Kazagumo | null;

  private readonly methods: Record<string, (id: string, requester: unknown) => Promise<Result>>;
  private requestManager: RequestManager;

  constructor(spotifyOptions: SpotifyOptions) {
    super();
    this.options = spotifyOptions;
    this.requestManager = new RequestManager(spotifyOptions);

    this.methods = {
      track: this.getTrack.bind(this),
      album: this.getAlbum.bind(this),
      playlist: this.getPlaylist.bind(this),
    };
    this.kazagumo = null;
    this._search = null;
  }

  public load(kazagumo: Kazagumo) {
    this.kazagumo = kazagumo;
    this._search = kazagumo.search.bind(kazagumo);
    kazagumo.search = this.search.bind(this);
  }

  private async search(query: string, options?: KazagumoSearchOptions): Promise<KazagumoSearchResult> {
    if (!this.kazagumo || !this._search) throw new KazagumoError(1, 'kazagumo-spotify is not loaded yet.');

    if (!query) throw new KazagumoError(3, 'Query is required');
    const [, type, id] = REGEX.exec(query) || [];

    if (type in this.methods) {
      try {
        const _function = this.methods[type];
        const result: Result = await _function(id, options?.requester);

        const loadType = type === 'track' ? 'TRACK' : 'PLAYLIST';
        const playlistName = result.name ?? undefined;

        const tracks = result.tracks.filter(this.filterNullOrUndefined);
        return this.buildSearch(playlistName, tracks, loadType);
      } catch (e) {
        return this.buildSearch(undefined, [], 'SEARCH');
      }
    }

    return this._search(query, options);
  }

  private buildSearch(
    playlistName?: string,
    tracks: KazagumoTrack[] = [],
    type?: SearchResultTypes,
  ): KazagumoSearchResult {
    return {
      playlistName,
      tracks,
      type: type ?? 'TRACK',
    };
  }

  private async getTrack(id: string, requester: unknown): Promise<Result> {
    const track = await this.requestManager.makeRequest<TrackResult>(`/tracks/${id}`);
    return { tracks: [this.buildKazagumoTrack(track, requester)] };
  }

  private async getAlbum(id: string, requester: unknown): Promise<Result> {
    const album = await this.requestManager.makeRequest<AlbumResult>(`/albums/${id}`);
    const tracks = album.tracks.items
      .filter(this.filterNullOrUndefined)
      .map((track) => this.buildKazagumoTrack(track, requester, album.images[0]?.url));
    // tslint:disable:one-variable-per-declaration
    let next = album.tracks.next,
      page = 1;

    while (next && !this.options.albumPageLimit ? true : page < (this.options.albumPageLimit ?? 1)) {
      if (!next) break;
      const nextTracks = await this.requestManager.makeRequest<Tracks>(next);
      tracks.push(
        ...nextTracks.items
          .filter(this.filterNullOrUndefined)
          .map((track) => this.buildKazagumoTrack(track, requester, album.images[0]?.url)),
      );
      next = nextTracks.next;
      page++;
    }

    return { tracks, name: album.name };
  }

  private async getPlaylist(id: string, requester: unknown): Promise<Result> {
    const playlist = await this.requestManager.makeRequest<PlaylistResult>(`/playlists/${id}`);
    const tracks = playlist.tracks.items
      .filter(this.filterNullOrUndefined)
      .map((track) => this.buildKazagumoTrack(track.track, requester, playlist.images[0]?.url));
    let next = playlist.tracks.next,
      page = 1;

    while (next && !this.options.playlistPageLimit ? true : page < (this.options.playlistPageLimit ?? 1)) {
      if (!next) break;
      const nextTracks = await this.requestManager.makeRequest<Tracks>(next);
      tracks.push(
        ...nextTracks.items
          .filter(this.filterNullOrUndefined)
          .map((track) => this.buildKazagumoTrack(track, requester, playlist.images[0]?.url)),
      );
      next = nextTracks.next;
      page++;
    }

    return { tracks, name: playlist.name };
  }

  private filterNullOrUndefined(obj: unknown): obj is unknown {
    return obj !== null && obj !== undefined;
  }

  private buildKazagumoTrack(spotifyTrack: Track, requester: unknown, thumbnail?: string) {
    return new KazagumoTrack(
      {
        track: '',
        info: {
          sourceName: 'spotify',
          identifier: spotifyTrack.id,
          isSeekable: true,
          author: spotifyTrack.artists[0] ? spotifyTrack.artists[0].name : 'Unknown',
          length: spotifyTrack.duration_ms,
          isStream: false,
          position: 0,
          title: spotifyTrack.name,
          uri: `https://open.spotify.com/track/${spotifyTrack.id}`,
          thumbnail: thumbnail ? thumbnail : spotifyTrack.album?.images[0]?.url,
        },
      },
      requester,
    );
  }
}

export interface Result {
  tracks: KazagumoTrack[];
  name?: string;
}

export interface TrackResult {
  album: Album;
  artists: Artist[];
  available_markets: string[];
  disc_number: number;

  duration_ms: number;
  explicit: boolean;
  external_ids: ExternalIds;
  external_urls: ExternalUrls;
  href: string;
  id: string;
  is_local: boolean;
  name: string;
  popularity: number;
  preview_url: string;
  track_number: number;
  type: string;
  uri: string;
}

export interface AlbumResult {
  album_type: string;
  artists: Artist[];
  available_markets: string[];
  copyrights: Copyright[];
  external_ids: ExternalIds;
  external_urls: ExternalUrls;
  genres: string[];
  href: string;
  id: string;
  images: Image[];
  label: string;
  name: string;
  popularity: number;
  release_date: string;
  release_date_precision: string;
  total_tracks: number;
  tracks: Tracks;
  type: string;
  uri: string;
}

export interface PlaylistResult {
  collaborative: boolean;
  description: string;
  external_urls: ExternalUrls;
  followers: Followers;
  href: string;
  id: string;
  images: Image[];
  name: string;
  owner: Owner;
  primary_color: string | null;
  public: boolean;
  snapshot_id: string;
  tracks: PlaylistTracks;
  type: string;
  uri: string;
}

export interface Owner {
  display_name: string;
  external_urls: ExternalUrls;
  href: string;
  id: string;
  type: string;
  uri: string;
}

export interface Followers {
  href: string | null;
  total: number;
}

export interface Tracks {
  href: string;
  items: Track[];
  next: string | null;
}

export interface PlaylistTracks {
  href: string;
  items: SpecialTracks[];
  limit: number;
  next: string | null;
  offset: number;
  previous: string | null;
  total: number;
}

export interface SpecialTracks {
  added_at: string;
  is_local: boolean;
  primary_color: string | null;
  track: Track;
}

export interface Copyright {
  text: string;
  type: string;
}

export interface ExternalUrls {
  spotify: string;
}

export interface ExternalIds {
  isrc: string;
}

export interface Album {
  album_type: string;
  artists: Artist[];
  available_markets: string[];
  external_urls: { [key: string]: string };
  href: string;
  id: string;
  images: Image[];
  name: string;
  release_date: string;
  release_date_precision: string;
  total_tracks: number;
  type: string;
  uri: string;
}

export interface Image {
  height: number;
  url: string;
  width: number;
}

export interface Artist {
  external_urls: {
    spotify: string;
  };
  href: string;
  id: string;
  name: string;
  type: string;
  uri: string;
}

export interface Track {
  album?: Album;
  artists: Artist[];
  available_markets: string[];
  disc_number: number;
  duration_ms: number;
  explicit: boolean;
  external_urls: ExternalUrls;
  href: string;
  id: string;
  is_local: boolean;
  name: string;
  preview_url: string;
  track_number: number;
  type: string;
  uri: string;
}

"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KazagumoPlugin = void 0;
const kazagumo_1 = require("kazagumo");
const RequestManager_1 = require("./RequestManager");
const REGEX = /(?:https:\/\/open\.spotify\.com\/|spotify:)(?:.+)?(track|playlist|album|artist)[\/:]([A-Za-z0-9]+)/;
class KazagumoPlugin extends kazagumo_1.KazagumoPlugin {
    constructor(spotifyOptions) {
        super();
        this.token = '';
        this.options = spotifyOptions;
        this.requestManager = new RequestManager_1.RequestManager(spotifyOptions);
        this.methods = {
            track: this.getTrack.bind(this),
            album: this.getAlbum.bind(this),
            artist: this.getArtist.bind(this),
            playlist: this.getPlaylist.bind(this),
        };
        this.kazagumo = null;
        this._search = null;
    }
    load(kazagumo) {
        this.kazagumo = kazagumo;
        this._search = kazagumo.search.bind(kazagumo);
        kazagumo.search = this.search.bind(this);
    }
    search(query, options) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.kazagumo || !this._search)
                throw new kazagumo_1.KazagumoError(1, 'kazagumo-spotify is not loaded yet.');
            if (!query)
                throw new kazagumo_1.KazagumoError(3, 'Query is required');
            const [, type, id] = REGEX.exec(query) || [];
            const isUrl = /^https?:\/\//.test(query);
            if (type in this.methods) {
                try {
                    const _function = this.methods[type];
                    const result = yield _function(id, options === null || options === void 0 ? void 0 : options.requester);
                    const loadType = type === 'track' ? 'TRACK' : 'PLAYLIST';
                    const playlistName = (_a = result.name) !== null && _a !== void 0 ? _a : undefined;
                    const tracks = result.tracks.filter(this.filterNullOrUndefined);
                    return this.buildSearch(playlistName, tracks, loadType);
                }
                catch (e) {
                    return this.buildSearch(undefined, [], 'SEARCH');
                }
            }
            else if ((options === null || options === void 0 ? void 0 : options.engine) === 'spotify' && !isUrl) {
                const result = yield this.searchTrack(query, options === null || options === void 0 ? void 0 : options.requester);
                return this.buildSearch(undefined, result.tracks, 'SEARCH');
            }
            return this._search(query, options);
        });
    }
    buildSearch(playlistName, tracks = [], type) {
        return {
            playlistName,
            tracks,
            type: type !== null && type !== void 0 ? type : 'TRACK',
        };
    }
    searchTrack(query, requester) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const limit = this.options.searchLimit && this.options.searchLimit > 0 && this.options.searchLimit < 50
                ? this.options.searchLimit
                : 10;
            const tracks = yield this.requestManager.makeRequest(`/search?q=${decodeURIComponent(query)}&type=track&limit=${limit}&market=${(_a = this.options.searchMarket) !== null && _a !== void 0 ? _a : 'US'}`);
            return {
                tracks: tracks.tracks.items.map((track) => this.buildKazagumoTrack(track, requester)),
            };
        });
    }
    getTrack(id, requester) {
        return __awaiter(this, void 0, void 0, function* () {
            const track = yield this.requestManager.makeRequest(`/tracks/${id}`);
            return { tracks: [this.buildKazagumoTrack(track, requester)] };
        });
    }
    getAlbum(id, requester) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const album = yield this.requestManager.makeRequest(`/albums/${id}?market=${(_a = this.options.searchMarket) !== null && _a !== void 0 ? _a : 'US'}`);
            const tracks = album.tracks.items
                .filter(this.filterNullOrUndefined)
                .map((track) => { var _a; return this.buildKazagumoTrack(track, requester, (_a = album.images[0]) === null || _a === void 0 ? void 0 : _a.url); });
            if (album && tracks.length) {
                let next = album.tracks.next;
                let page = 1;
                while (next && (!this.options.playlistPageLimit ? true : (_b = page < this.options.playlistPageLimit) !== null && _b !== void 0 ? _b : 1)) {
                    const nextTracks = yield this.requestManager.makeRequest(next !== null && next !== void 0 ? next : '', true);
                    page++;
                    if (nextTracks.items.length) {
                        next = nextTracks.next;
                        tracks.push(...nextTracks.items
                            .filter(this.filterNullOrUndefined)
                            .filter((a) => a.track)
                            .map((track) => { var _a; return this.buildKazagumoTrack(track.track, requester, (_a = album.images[0]) === null || _a === void 0 ? void 0 : _a.url); }));
                    }
                }
            }
            return { tracks, name: album.name };
        });
    }
    getArtist(id, requester) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const artist = yield this.requestManager.makeRequest(`/artists/${id}`);
            const fetchedTracks = yield this.requestManager.makeRequest(`/artists/${id}/top-tracks?market=${(_a = this.options.searchMarket) !== null && _a !== void 0 ? _a : 'US'}`);
            const tracks = fetchedTracks.tracks
                .filter(this.filterNullOrUndefined)
                .map((track) => { var _a; return this.buildKazagumoTrack(track, requester, (_a = artist.images[0]) === null || _a === void 0 ? void 0 : _a.url); });
            return { tracks, name: artist.name };
        });
    }
    getPlaylist(id, requester) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const playlist = yield this.requestManager.makeRequest(`/playlists/${id}?market=${(_a = this.options.searchMarket) !== null && _a !== void 0 ? _a : 'US'}`);
            const tracks = playlist.tracks.items
                .filter(this.filterNullOrUndefined)
                .map((track) => { var _a; return this.buildKazagumoTrack(track.track, requester, (_a = playlist.images[0]) === null || _a === void 0 ? void 0 : _a.url); });
            if (playlist && tracks.length) {
                let next = playlist.tracks.next;
                let page = 1;
                while (next && (!this.options.playlistPageLimit ? true : (_b = page < this.options.playlistPageLimit) !== null && _b !== void 0 ? _b : 1)) {
                    const nextTracks = yield this.requestManager.makeRequest(next !== null && next !== void 0 ? next : '', true);
                    page++;
                    if (nextTracks.items.length) {
                        next = nextTracks.next;
                        tracks.push(...nextTracks.items
                            .filter(this.filterNullOrUndefined)
                            .filter((a) => a.track)
                            .map((track) => { var _a; return this.buildKazagumoTrack(track.track, requester, (_a = playlist.images[0]) === null || _a === void 0 ? void 0 : _a.url); }));
                    }
                }
            }
            return { tracks, name: playlist.name };
        });
    }
    filterNullOrUndefined(obj) {
        return obj !== undefined && obj !== null;
    }
    buildKazagumoTrack(spotifyTrack, requester, thumbnail) {
        var _a, _b;
        return new kazagumo_1.KazagumoTrack({
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
                thumbnail: thumbnail ? thumbnail : (_b = (_a = spotifyTrack.album) === null || _a === void 0 ? void 0 : _a.images[0]) === null || _b === void 0 ? void 0 : _b.url,
            },
        }, requester);
    }
}
exports.KazagumoPlugin = KazagumoPlugin;

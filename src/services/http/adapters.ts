import type { PublicProfile, Connections, FavoriteKind, RankingPeriod } from '../communityContracts';
import { isRankingPeriod, type CommentRankingQuery, type RankedCommentPage } from '../communityContracts';
import { decodeRankedCommentPage } from './decoders';
import type { GameQuery, CatalogFilters } from '../contracts';
import { decodeCatalogFilters } from './decoders';
import { decodeProfileCompletion, decodeProfileUpdate } from './decoders';
import type { ProfileCompletionRequest, ProfileCompletionResponse, ProfileUpdateResponse } from './dtos';
import type { ReviewRequest, ReviewPatchRequest } from './dtos';
import { decodeReviewLikeStatus } from './decoders';
import type { ReviewLikeStatusResponse } from './dtos';
import { decodeCommentLikeStatus } from './decoders';
import type { CommentLikeStatusResponse } from './dtos';
import type { CommentId } from '../../models';
import { validSearchTerm, type SearchService } from '../searchContracts';
import { decodeSearch } from './decoders';
import { isLocalId, type User, type UserId, type GameId, type ReviewId } from '../../models';
import { catalogKey, createCatalogStore, type CatalogMetadata, type CatalogStore } from '../catalogMetadata';
import type { LoginRequest, RegisterRequest, LoginResponse, PublicUserResponse, GameResponse, GamePageResponse, ReviewResponse, CommentResponse, RatingResponse, FavoriteResponse, GameOpinionsResponse, FavoriteListsResponse, DashboardResponse, RankedReviewResponse, RankedGameResponse, NotificationResponse, ProfilePatchRequest, TextRequest, RatingRequest } from './dtos';
import { HttpFailure, createHttpClient, validateApiBaseUrl, type FetchTransport, type HttpRequest } from './client';
import { decodeUser, decodeGame, decodeGamePage, decodeReview, decodeComment, decodeRating, decodeFavorite, decodeNotification, decodeLogin, decodeDashboard, decodeOpinions, decodeFavoriteLists, decodeRankedReview, decodeRankedGame, unwrapRating, unwrapReview, unwrapFavorite, unwrapFollowing, decodeList, type Decoder } from './decoders';
function localPathId(id: UserId | GameId | ReviewId): string {
  if (!isLocalId(id)) throw new HttpFailure('configuration');
  return String(id);
}
export interface SessionSnapshot { token: string; user: User; expiresAt: string; version: number; signal: AbortSignal; }
export interface HttpSessionStore { current(): SessionSnapshot | null; version(): number; establish(login: LoginResponse): void; updateUser(user: User): void; clear(): void; subscribe(listener: () => void): () => void; }
export interface HttpAdapterConfig { apiBaseUrl: string; }
export interface HttpAdapters {
  search: SearchService['search'];
  catalog: CatalogStore;
  session: HttpSessionStore;
  auth: {
    register(input: RegisterRequest, signal?: AbortSignal): Promise<PublicUserResponse>;
    login(input: LoginRequest, signal?: AbortSignal): Promise<LoginResponse>;
    me(signal?: AbortSignal): Promise<PublicUserResponse>;
    logout(signal?: AbortSignal): Promise<void>;
  };
  games: {
    filters(signal?: AbortSignal): Promise<CatalogFilters>;
    list(query?: GameQuery, signal?: AbortSignal): Promise<GamePageResponse>;
    get(id: GameId, signal?: AbortSignal): Promise<GameResponse>;
    opinions(id: GameId, signal?: AbortSignal): Promise<GameOpinionsResponse>;
    reviews(id: GameId, signal?: AbortSignal): Promise<ReviewResponse[]>;
    myRating(id: GameId, signal?: AbortSignal): Promise<RatingResponse | null>;
    rate(id: GameId, input: RatingRequest, signal?: AbortSignal): Promise<RatingResponse>;
    myReview(id: GameId, signal?: AbortSignal): Promise<ReviewResponse | null>;
    publish(id: GameId, input: ReviewRequest, signal?: AbortSignal): Promise<ReviewResponse>;
  };
  reviews: {
    likeStatus(id: ReviewId, signal?: AbortSignal): Promise<ReviewLikeStatusResponse>;
    setLiked(id: ReviewId, selected: boolean, signal?: AbortSignal): Promise<void>;
    get(id: ReviewId, signal?: AbortSignal): Promise<ReviewResponse>;
    edit(id: ReviewId, input: ReviewPatchRequest, signal?: AbortSignal): Promise<ReviewResponse>;
    comments(id: ReviewId, signal?: AbortSignal): Promise<CommentResponse[]>;
    comment(id: ReviewId, input: TextRequest, signal?: AbortSignal): Promise<CommentResponse>;
  };
  comments: {
    likeStatus(id: CommentId, signal?: AbortSignal): Promise<CommentLikeStatusResponse>;
    setLiked(id: CommentId, selected: boolean, signal?: AbortSignal): Promise<void>;
  };
  profiles: {
    update(input: ProfilePatchRequest, signal?: AbortSignal): Promise<ProfileUpdateResponse>;
    completion(signal?: AbortSignal): Promise<ProfileCompletionResponse>;
    complete(input: ProfileCompletionRequest, signal?: AbortSignal): Promise<ProfileCompletionResponse>;
    get(id: UserId, signal?: AbortSignal): Promise<PublicUserResponse>;
    reviews(id: UserId, signal?: AbortSignal): Promise<ReviewResponse[]>;
    profile(id: UserId, signal?: AbortSignal): Promise<PublicProfile>;
    edit(input: ProfilePatchRequest, signal?: AbortSignal): Promise<PublicUserResponse>;
    followers(id: UserId, signal?: AbortSignal): Promise<PublicUserResponse[]>;
    following(id: UserId, signal?: AbortSignal): Promise<PublicUserResponse[]>;
    connections(id: UserId, signal?: AbortSignal): Promise<Connections>;
  };
  social: {
    favorites(signal?: AbortSignal): Promise<FavoriteListsResponse>;
    favorite(kind: FavoriteKind, id: ReviewId | GameId, signal?: AbortSignal): Promise<FavoriteResponse | null>;
    setFavorite(kind: FavoriteKind, id: ReviewId | GameId, selected: boolean, signal?: AbortSignal): Promise<FavoriteResponse | null>;
    isFollowing(id: UserId, signal?: AbortSignal): Promise<boolean>;
    setFollowing(id: UserId, selected: boolean, signal?: AbortSignal): Promise<boolean>;
  };
  community: {
    mostLikedComments(query: CommentRankingQuery, signal?: AbortSignal): Promise<RankedCommentPage>;
    recent(signal?: AbortSignal): Promise<ReviewResponse[]>;
    mostCommented(period: RankingPeriod, signal?: AbortSignal): Promise<RankedReviewResponse[]>;
    gamesInDiscussion(period: RankingPeriod, signal?: AbortSignal): Promise<RankedGameResponse[]>;
    feed(signal?: AbortSignal): Promise<ReviewResponse[]>;
    dashboard(signal?: AbortSignal): Promise<DashboardResponse>;
  };
  notifications: { list(signal?: AbortSignal): Promise<NotificationResponse[]>; };
}
export function readHttpConfig(input: { apiBaseUrl?: unknown }): HttpAdapterConfig {
  if (typeof input.apiBaseUrl !== 'string' || !input.apiBaseUrl.trim()) throw new HttpFailure('configuration');
  return { apiBaseUrl: validateApiBaseUrl(input.apiBaseUrl.trim()) };
}
export function createHttpSessionStore(): HttpSessionStore {
  let state: SessionSnapshot | null = null;
  let version = 0;
  const listeners = new Set<() => void>();
  function notify(): void { for (const listener of listeners) listener(); }
  function clear(): void { controller?.abort(); controller = null; state = null; version++; notify(); }
  let controller: AbortController | null = null;
  return {
    current() { return state ? { ...state, user: structuredClone(state.user) } : null; },
    version() { return version; },
    updateUser(user) { if (!state || user.id !== state.user.id) throw new HttpFailure('contract'); state = { ...state, user: structuredClone(user) }; notify(); },
    clear,
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    establish(login) { clear(); controller = new AbortController(); state = { ...structuredClone(login), version, signal: controller.signal }; notify(); },
  };
}
function decodeVoid(value: unknown): void { if (value !== undefined) throw new HttpFailure('contract'); }
export function createHttpAdapters(config: HttpAdapterConfig, options: { transport?: FetchTransport; session?: HttpSessionStore; catalog?: CatalogStore } = {}): HttpAdapters {
  const client = createHttpClient(readHttpConfig(config).apiBaseUrl, options.transport);
  const session = options.session ?? createHttpSessionStore();
  const catalog = options.catalog ?? createCatalogStore();
  async function call<T>(request: Omit<HttpRequest, 'token'>, decode: Decoder<T>, authenticated = false): Promise<T> {
    const snapshot = authenticated ? session.current() : null;
    if (authenticated && !snapshot) throw new HttpFailure('http', 401, 'unauthorized');
    const signal = snapshot ? request.signal ? AbortSignal.any([snapshot.signal, request.signal]) : snapshot.signal : request.signal;
    const key = catalogKey(request.path);
    const sequence = catalog.begin(key);
    let metadata: CatalogMetadata | null = null;
    try {
      const value = await client.request({ ...request, signal, onCatalogMetadata: (value) => { metadata = value; }, ...(snapshot ? { token: snapshot.token } : {}) });
      if (snapshot && session.version() !== snapshot.version) throw new HttpFailure('cancelled');
      const result = decode(value);
      catalog.finish(key, sequence, metadata);
      return result;
    } catch (error: unknown) {
      if (snapshot && session.version() !== snapshot.version) throw new HttpFailure('cancelled');
      if (snapshot && error instanceof HttpFailure && error.status === 401) session.clear();
      throw error;
    }
  }
  const list = <T>(decode: Decoder<T>): Decoder<T[]> => (value) => decodeList(value, decode);
  const getUser = (id: UserId, signal?: AbortSignal): Promise<PublicUserResponse> => call({ path: ['users', localPathId(id)], signal }, decodeUser);
  const userReviews = (id: UserId, signal?: AbortSignal): Promise<ReviewResponse[]> => call({ path: ['users', localPathId(id), 'reviews'], signal }, list(decodeReview));
  const followers = (id: UserId, signal?: AbortSignal): Promise<PublicUserResponse[]> => call({ path: ['users', localPathId(id), 'followers'], signal }, list(decodeUser));
  const following = (id: UserId, signal?: AbortSignal): Promise<PublicUserResponse[]> => call({ path: ['users', localPathId(id), 'following'], signal }, list(decodeUser));
  return {
    catalog,
    session,
    auth: {
      register: (input, signal) => call({ method: 'POST', path: ['auth', 'register'], body: { name: input.name, email: input.email, password: input.password }, signal }, decodeUser),
      login: (input, signal) => call({ method: 'POST', path: ['auth', 'login'], body: { email: input.email, password: input.password }, signal }, decodeLogin),
      me: (signal) => call({ path: ['auth', 'me'], signal }, decodeUser, true),
      async logout(signal) {
        const snapshot = session.current(); session.clear();
        if (!snapshot) return;
        decodeVoid(await client.request({ method: 'POST', path: ['auth','logout'], token: snapshot.token, signal }));
      },
    },
    games: {
      filters: signal => call({ path: ['games', 'filters'], signal }, decodeCatalogFilters),
      list: (query, signal) => {
        if ([query?.genreId, query?.platformId].some(value => value !== undefined && !isLocalId(value))) throw new HttpFailure('configuration');
        return call({ path: ['games'], query: { term: query?.term, sort: query?.sort, genreId: query?.genreId, platformId: query?.platformId, page: query?.page, pageSize: query?.pageSize }, signal }, decodeGamePage);
      },
      get: (id, signal) => call({ path: ['games', localPathId(id)], signal }, decodeGame),
      opinions: (id, signal) => call({ path: ['games', localPathId(id), 'opinions'], signal }, decodeOpinions),
      reviews: (id, signal) => call({ path: ['games', localPathId(id), 'reviews'], signal }, list(decodeReview)),
      myRating: (id, signal) => call({ path: ['games', localPathId(id), 'rating', 'me'], signal }, unwrapRating, true),
      rate: (id, input, signal) => call({ method: 'PUT', path: ['games', localPathId(id), 'rating', 'me'], body: { value: input.value }, signal }, decodeRating, true),
      myReview: (id, signal) => call({ path: ['games', localPathId(id), 'reviews', 'me'], signal }, unwrapReview, true),
      publish: (id, input, signal) => call({ method: 'POST', path: ['games', localPathId(id), 'reviews'], body: { rating: input.rating, ...(input.text === undefined ? {} : { text: input.text }) }, signal }, decodeReview, true),
    },
    reviews: {
      likeStatus: (id, signal) => call({ path: ['reviews', localPathId(id), 'like', 'me'], signal }, decodeReviewLikeStatus, true),
      setLiked: (id, selected, signal) => call({ method: selected ? 'PUT' : 'DELETE', path: ['reviews', localPathId(id), 'like'], signal }, decodeVoid, true),
      get: (id, signal) => call({ path: ['reviews', localPathId(id)], signal }, decodeReview),
      edit: (id, input, signal) => call({ method: 'PATCH', path: ['reviews', localPathId(id)], body: { ...(input.rating === undefined ? {} : { rating: input.rating }), ...(input.text === undefined ? {} : { text: input.text }) }, signal }, decodeReview, true),
      comments: (id, signal) => call({ path: ['reviews', localPathId(id), 'comments'], signal }, list(decodeComment)),
      comment: (id, input, signal) => call({ method: 'POST', path: ['reviews', localPathId(id), 'comments'], body: { text: input.text }, signal }, decodeComment, true),
    },
    comments: {
      likeStatus: (id, signal) => call({ path: ['comments', localPathId(id), 'like', 'me'], signal }, decodeCommentLikeStatus, true),
      setLiked: (id, selected, signal) => call({ method: selected ? 'PUT' : 'DELETE', path: ['comments', localPathId(id), 'like'], signal }, decodeVoid, true),
    },
    profiles: {
      update: (input, signal) => call({ method: 'PATCH', path: ['users', 'me', 'profile'], signal, body: input }, decodeProfileUpdate, true),
      completion: signal => call({ path: ['users', 'me', 'profile-completion'], signal }, decodeProfileCompletion, true),
      complete: (input, signal) => call({ method: 'PUT', path: ['users', 'me', 'profile-completion'], signal, body: { country: input.country, state: input.state, bio: input.bio, favoriteGameIds: input.favoriteGameIds, ...(input.avatarUrl === undefined ? {} : { avatarUrl: input.avatarUrl }) } }, decodeProfileCompletion, true),
      get: getUser, reviews: userReviews, followers, following,
      async profile(id, signal) { const [user, reviews] = await Promise.all([getUser(id, signal), userReviews(id, signal)]); return { user, reviews }; },
      async connections(id, signal) { const [followerUsers, followingUsers] = await Promise.all([followers(id, signal), following(id, signal)]); return { followers: followerUsers, following: followingUsers }; },
      edit: (input, signal) => call({ method: 'PATCH', path: ['users', 'me', 'profile'], signal, body: { ...(input.displayName === undefined ? {} : { displayName: input.displayName }), ...(input.bio === undefined ? {} : { bio: input.bio }), ...(input.avatarUrl === undefined ? {} : { avatarUrl: input.avatarUrl }) } }, decodeUser, true),
    },
    social: {
      favorites: (signal) => call({ path: ['favorites'], signal }, decodeFavoriteLists, true),
      favorite: (kind, id, signal) => call({ path: ['favorites', kind, localPathId(id)], signal }, unwrapFavorite, true),
      async setFavorite(kind, id, selected, signal) {
        if (selected) return call({ method: 'PUT', path: ['favorites', kind, localPathId(id)], signal }, decodeFavorite, true);
        await call({ method: 'DELETE', path: ['favorites', kind, localPathId(id)], signal }, decodeVoid, true); return null;
      },
      isFollowing: (id, signal) => call({ path: ['users', localPathId(id), 'follow', 'me'], signal }, unwrapFollowing, true),
      async setFollowing(id, selected, signal) {
        if (selected) return call({ method: 'PUT', path: ['users', localPathId(id), 'follow'], signal }, unwrapFollowing, true);
        await call({ method: 'DELETE', path: ['users', localPathId(id), 'follow'], signal }, decodeVoid, true); return false;
      },
    },
    community: {
      mostLikedComments: (query, signal) => {
        if (!isRankingPeriod(query.period) || !isLocalId(query.page) || ![10, 20, 50].includes(query.pageSize) || (query.page - 1) * query.pageSize > 2_147_483_647) throw new HttpFailure('configuration');
        return call({ path: ['community', 'comments', 'most-liked'], query: { ...query }, signal }, value => decodeRankedCommentPage(value, query));
      },
      recent: (signal) => call({ path: ['community', 'reviews', 'recent'], signal }, list(decodeReview)),
      mostCommented: (period, signal) => call({ path: ['community', 'reviews', 'most-commented'], query: { period }, signal }, list(decodeRankedReview)),
      gamesInDiscussion: (period, signal) => call({ path: ['community', 'games', 'in-discussion'], query: { period }, signal }, list(decodeRankedGame)),
      feed: (signal) => call({ path: ['feed', 'following'], signal }, list(decodeReview), true),
      dashboard: (signal) => call({ path: ['dashboard'], signal }, decodeDashboard, true),
    },
    notifications: { list: (signal) => call({ path: ['notifications'], signal }, list(decodeNotification), true) },
    search: (query, signal) => {
      if (!validSearchTerm(query.q) || !['suggestions', 'results'].includes(query.mode) || !['all', 'people', 'games'].includes(query.scope) || !Number.isInteger(query.page) || query.page < 1 || (query.page - 1) * 20 > 2_147_483_647 || (query.mode === 'suggestions' && query.page !== 1)) throw new HttpFailure('configuration');
      return call({ path: ['search'], query: { ...query, q: query.q.trim() }, signal, acceptedStatuses: [503] }, value => decodeSearch(value, query));
    },
  };
}

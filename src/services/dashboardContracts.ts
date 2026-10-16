import type { FavoriteLists, ReviewDetails } from './communityContracts';
export interface PersonalDashboard { favorites: FavoriteLists; feed: ReviewDetails[]; }
export interface DashboardService { get(): Promise<PersonalDashboard>; }

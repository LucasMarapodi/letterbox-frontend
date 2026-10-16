import { useEffect, useState, type ReactElement } from 'react';
import type { PersonalDashboard } from '../services/dashboardContracts';
import { useServices } from '../services/ServiceProvider';
import { HomePage } from './HomePage';
import { FavoritesSections } from '../components/FavoritesSections';
import { FeedSection } from '../components/FeedSection';
import { LoadingState, ErrorState } from '../components/Feedback';
type State = { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: PersonalDashboard };
export function DashboardHome(): ReactElement {
  const { dashboard } = useServices();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    if (dashboard) void dashboard.get().then((data) => { if (active) setState({ status: 'ready', data }); }, () => { if (active) setState({ status: 'error' }); });
    return () => { active = false; };
  }, [dashboard, attempt]);
  return <HomePage authenticated favorites={<>
    {state.status === 'loading' && <LoadingState message="Carregando seu dashboard…" />}
    {state.status === 'error' && <ErrorState message="Não foi possível carregar seu dashboard." onRetry={() => { setState({ status: 'loading' }); setAttempt((value) => value + 1); }} />}
    {state.status === 'ready' && <><FavoritesSections initialLists={state.data.favorites} /><FeedSection initialReviews={state.data.feed} /></>}
  </>} />;
}

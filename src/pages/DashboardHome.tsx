import { useEffect, useState, type ReactElement } from 'react';
import type { PersonalDashboard } from '../services/dashboardContracts';
import { useServices } from '../services/ServiceProvider';
import { HomePage } from './HomePage';
import { FeedSection } from '../components/FeedSection';
import { LoadingState, ErrorState, QueryRegion } from '../components/Feedback';
import { CatalogNotice } from '../components/CatalogNotice';
type State = { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: PersonalDashboard };
export function DashboardHome(): ReactElement {
  const { dashboard } = useServices();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    if (dashboard) void dashboard.get().then((data) => { if (active) setState({ status: 'ready', data }); }, () => { if (active) setState({ status: 'error' }); });
    return () => { active = false; };
  }, [dashboard, attempt]);
  return <HomePage authenticated feed={<QueryRegion label="Seu dashboard" busy={state.status === 'loading'}>
    {state.status === 'loading' && <LoadingState message="Carregando seu dashboard…" />}
    {state.status === 'error' && <ErrorState message="Não foi possível carregar seu dashboard." onRetry={() => { setState({ status: 'loading' }); setAttempt((value) => value + 1); }} />}
    {state.status === 'ready' && <><CatalogNotice paths={[[ 'dashboard' ]]} onRetry={() => { setState({ status: 'loading' }); setAttempt((value) => value + 1); }} /><FeedSection initialReviews={state.data.feed} /></>}
  </QueryRegion>} />;
}

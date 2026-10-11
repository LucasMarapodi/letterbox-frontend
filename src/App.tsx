import type { ReactElement } from 'react';
import { HomePage } from './pages/HomePage';

export function AppRoutes(): ReactElement {
  return <HomePage />;
}

export default function App(): ReactElement {
  return <AppRoutes />;
}

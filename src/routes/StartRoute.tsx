import type { ReactElement } from 'react';
import { Navigate } from 'react-router';
import { hasAppHistory } from '../lib/appHistory';
import { OverviewPage } from '../pages/OverviewPage';

/**
 * The address of the main page. Opening the app lands on today's page instead; from within
 * the app (the "ראשי" tab, back from a page) it is the main page.
 */
export function StartRoute(): ReactElement {
  return hasAppHistory() ? <OverviewPage /> : <Navigate to="/today" replace />;
}

import { createBrowserRouter, Navigate } from 'react-router';
import { DebtsPage } from '../pages/DebtsPage';
import { DonePage } from '../pages/DonePage';
import { EntityPage } from '../pages/EntityPage';
import { GoalsPage } from '../pages/GoalsPage';
import { IncompletePage } from '../pages/IncompletePage';
import { ItemPage } from '../pages/ItemPage';
import { LoginPage } from '../pages/LoginPage';
import { OnboardingPage } from '../pages/OnboardingPage';
import { OpenItemsPage } from '../pages/OpenItemsPage';
import { SettingsPage } from '../pages/SettingsPage';
import { ShoppingPage } from '../pages/ShoppingPage';
import { ShoppingRunPage } from '../pages/ShoppingRunPage';
import { RequireAuth } from './RequireAuth';
import { RequireHousehold } from './RequireHousehold';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      { path: '/onboarding', element: <OnboardingPage /> },
      {
        element: <RequireHousehold />,
        children: [
          { path: '/', element: <OpenItemsPage /> },
          { path: '/goals', element: <GoalsPage /> },
          { path: '/shopping', element: <ShoppingPage /> },
          { path: '/shopping/run/:runId', element: <ShoppingRunPage /> },
          { path: '/debts', element: <DebtsPage /> },
          { path: '/incomplete', element: <IncompletePage /> },
          { path: '/item/:itemId', element: <ItemPage /> },
          { path: '/entity/:entityId', element: <EntityPage /> },
          { path: '/settings', element: <SettingsPage /> },
          { path: '/done', element: <DonePage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);

import { createBrowserRouter, Navigate } from 'react-router';
import { IncompletePage } from '../pages/IncompletePage';
import { LoginPage } from '../pages/LoginPage';
import { OnboardingPage } from '../pages/OnboardingPage';
import { OpenItemsPage } from '../pages/OpenItemsPage';
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
          { path: '/incomplete', element: <IncompletePage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);

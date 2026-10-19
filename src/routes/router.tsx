import { createBrowserRouter, Navigate } from 'react-router';
import { AppointmentsPage } from '../pages/AppointmentsPage';
import { DebtsPage } from '../pages/DebtsPage';
import { DomainsPage } from '../pages/DomainsPage';
import { DonePage } from '../pages/DonePage';
import { EntityPage } from '../pages/EntityPage';
import { GoalsPage } from '../pages/GoalsPage';
import { TodayPage } from '../pages/TodayPage';
import { HomePage } from '../pages/HomePage';
import { IncompletePage } from '../pages/IncompletePage';
import { ItemPage } from '../pages/ItemPage';
import { LoginPage } from '../pages/LoginPage';
import { SearchPage } from '../pages/SearchPage';
import { SignUpPage } from '../pages/SignUpPage';
import { OnboardingPage } from '../pages/OnboardingPage';
import { NotesPage } from '../pages/NotesPage';
import { OpenItemsPage } from '../pages/OpenItemsPage';
import { SettingsPage } from '../pages/SettingsPage';
import { ShoppingPage } from '../pages/ShoppingPage';
import { AssistantPage } from '../pages/AssistantPage';
import { ShoppingDepartmentsPage } from '../pages/ShoppingDepartmentsPage';
import { ShoppingRunPage } from '../pages/ShoppingRunPage';
import { ShoppingStaplesPage } from '../pages/ShoppingStaplesPage';
import { RequireAuth } from './RequireAuth';
import { RequireHousehold } from './RequireHousehold';
import { StartRoute } from './StartRoute';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/signup', element: <SignUpPage /> },
  {
    element: <RequireAuth />,
    children: [
      { path: '/onboarding', element: <OnboardingPage /> },
      {
        element: <RequireHousehold />,
        children: [
          { path: '/', element: <StartRoute /> },
          { path: '/tasks', element: <OpenItemsPage /> },
          { path: '/appointments', element: <AppointmentsPage /> },
          { path: '/goals', element: <GoalsPage /> },
          { path: '/notes', element: <NotesPage /> },
          { path: '/shopping', element: <ShoppingPage /> },
          { path: '/shopping/run/:runId', element: <ShoppingRunPage /> },
          { path: '/shopping/departments', element: <ShoppingDepartmentsPage /> },
          { path: '/shopping/staples', element: <ShoppingStaplesPage /> },
          { path: '/debts', element: <DebtsPage /> },
          { path: '/incomplete', element: <IncompletePage /> },
          { path: '/today', element: <TodayPage /> },
          { path: '/home', element: <HomePage /> },
          { path: '/item/:itemId', element: <ItemPage /> },
          { path: '/entity/:entityId', element: <EntityPage /> },
          { path: '/domains', element: <DomainsPage /> },
          { path: '/settings', element: <SettingsPage /> },
          { path: '/done', element: <DonePage /> },
          { path: '/search', element: <SearchPage /> },
          { path: '/assistant', element: <AssistantPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);

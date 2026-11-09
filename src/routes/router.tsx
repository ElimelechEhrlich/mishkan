import type { ComponentType } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { RequireAuth } from './RequireAuth';
import { RequireHousehold } from './RequireHousehold';
import { StartRoute } from './StartRoute';

/** A page whose code loads when it is first opened. */
type LazyPage = { readonly Component: ComponentType };

/**
 * Each page's code loads when it is first opened (and is kept by the service worker), so the
 * app starts with the code of its first screen only. Home and sign-in come with the start.
 */
export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/signup',
    lazy: async (): Promise<LazyPage> => ({
      Component: (await import('../pages/SignUpPage')).SignUpPage,
    }),
  },
  {
    element: <RequireAuth />,
    children: [
      {
        path: '/onboarding',
        lazy: async (): Promise<LazyPage> => ({
          Component: (await import('../pages/OnboardingPage')).OnboardingPage,
        }),
      },
      {
        element: <RequireHousehold />,
        children: [
          { path: '/', element: <StartRoute /> },
          {
            path: '/tasks',
            lazy: async (): Promise<LazyPage> => ({
              Component: (await import('../pages/OpenItemsPage')).OpenItemsPage,
            }),
          },
          {
            path: '/appointments',
            lazy: async (): Promise<LazyPage> => ({
              Component: (await import('../pages/AppointmentsPage')).AppointmentsPage,
            }),
          },
          {
            path: '/goals',
            lazy: async (): Promise<LazyPage> => ({
              Component: (await import('../pages/GoalsPage')).GoalsPage,
            }),
          },
          {
            path: '/notes',
            lazy: async (): Promise<LazyPage> => ({
              Component: (await import('../pages/NotesPage')).NotesPage,
            }),
          },
          {
            path: '/shopping',
            lazy: async (): Promise<LazyPage> => ({
              Component: (await import('../pages/ShoppingPage')).ShoppingPage,
            }),
          },
          {
            path: '/shopping/run/:runId',
            lazy: async (): Promise<LazyPage> => ({
              Component: (await import('../pages/ShoppingRunPage')).ShoppingRunPage,
            }),
          },
          {
            path: '/shopping/departments',
            lazy: async (): Promise<LazyPage> => ({
              Component: (await import('../pages/ShoppingDepartmentsPage')).ShoppingDepartmentsPage,
            }),
          },
          {
            path: '/shopping/staples',
            lazy: async (): Promise<LazyPage> => ({
              Component: (await import('../pages/ShoppingStaplesPage')).ShoppingStaplesPage,
            }),
          },
          {
            path: '/debts',
            lazy: async (): Promise<LazyPage> => ({
              Component: (await import('../pages/DebtsPage')).DebtsPage,
            }),
          },
          {
            path: '/incomplete',
            lazy: async (): Promise<LazyPage> => ({
              Component: (await import('../pages/IncompletePage')).IncompletePage,
            }),
          },
          {
            path: '/today',
            lazy: async (): Promise<LazyPage> => ({
              Component: (await import('../pages/TodayPage')).TodayPage,
            }),
          },
          { path: '/home', element: <HomePage /> },
          {
            path: '/item/:itemId',
            lazy: async (): Promise<LazyPage> => ({
              Component: (await import('../pages/ItemPage')).ItemPage,
            }),
          },
          {
            path: '/entity/:entityId',
            lazy: async (): Promise<LazyPage> => ({
              Component: (await import('../pages/EntityPage')).EntityPage,
            }),
          },
          {
            path: '/domains',
            lazy: async (): Promise<LazyPage> => ({
              Component: (await import('../pages/DomainsPage')).DomainsPage,
            }),
          },
          {
            path: '/settings',
            lazy: async (): Promise<LazyPage> => ({
              Component: (await import('../pages/SettingsPage')).SettingsPage,
            }),
          },
          {
            path: '/done',
            lazy: async (): Promise<LazyPage> => ({
              Component: (await import('../pages/DonePage')).DonePage,
            }),
          },
          {
            path: '/search',
            lazy: async (): Promise<LazyPage> => ({
              Component: (await import('../pages/SearchPage')).SearchPage,
            }),
          },
          {
            path: '/assistant',
            lazy: async (): Promise<LazyPage> => ({
              Component: (await import('../pages/AssistantPage')).AssistantPage,
            }),
          },
          {
            path: '/google-calendar',
            lazy: async (): Promise<LazyPage> => ({
              Component: (await import('../pages/GoogleCalendarPage')).GoogleCalendarPage,
            }),
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);

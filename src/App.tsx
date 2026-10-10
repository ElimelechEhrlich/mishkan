import type { ReactElement } from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes/router';

export function App(): ReactElement {
  return <RouterProvider router={router} />;
}

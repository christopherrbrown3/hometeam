import { Navigate, Outlet, createHashRouter } from 'react-router'
import { ProtectedRoute } from './ProtectedRoute'
import { OtpRequestScreen } from '../features/auth/OtpRequestScreen'
import { OtpVerifyScreen } from '../features/auth/OtpVerifyScreen'
import { PublicOnly } from '../features/auth/PublicOnly'
import { AppShell } from './AppShell'

function AppLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}

function PlannedRoute({ title }: Readonly<{ title: string }>) {
  return (
    <main>
      <h1>{title}</h1>
      <p>This part of HomeTeam is being prepared.</p>
    </main>
  )
}

function InvitationRoute() {
  return <PlannedRoute title="Invitation" />
}

function NotFoundRoute() {
  return <PlannedRoute title="Page not found" />
}

export const router = createHashRouter([
  {
    Component: PublicOnly,
    children: [
      { path: 'login', Component: OtpRequestScreen },
      { path: 'verify', Component: OtpVerifyScreen },
    ],
  },
  {
    Component: ProtectedRoute,
    children: [
      {
        Component: AppLayout,
        children: [
          { index: true, element: <Navigate replace to="/today" /> },
          { path: 'invite/:token', Component: InvitationRoute },
          { path: 'today', element: <PlannedRoute title="Today" /> },
          { path: 'upcoming', element: <PlannedRoute title="Upcoming" /> },
          { path: 'tasks', element: <PlannedRoute title="Tasks" /> },
          { path: 'history', element: <PlannedRoute title="History" /> },
          { path: 'more/*', element: <PlannedRoute title="More" /> },
        ],
      },
    ],
  },
  {
    children: [
      { path: '*', Component: NotFoundRoute },
    ],
  },
])

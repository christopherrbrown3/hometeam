import { Navigate, Outlet, createHashRouter } from 'react-router'
import { ProtectedRoute } from './ProtectedRoute'
import { PasswordLoginScreen } from '../features/auth/PasswordLoginScreen'
import { SignUpScreen } from '../features/auth/SignUpScreen'
import { PublicOnly } from '../features/auth/PublicOnly'
import { AppShell } from './AppShell'
import { AccessGate } from '../features/access/AccessGate'
import { AccessStatusScreen } from '../features/access/AccessStatusScreen'
import { InvitationScreen } from '../features/households/InvitationScreen'
import { JoinHouseholdScreen } from '../features/households/JoinHouseholdScreen'
import { TodayRoute } from '../routes/TodayRoute'
import { UpcomingRoute } from '../routes/UpcomingRoute'
import { TasksRoute } from '../routes/TasksRoute'
import { HistoryRoute } from '../routes/HistoryRoute'
import { MoreRoute } from '../routes/MoreRoute'

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

function NotFoundRoute() {
  return <PlannedRoute title="Page not found" />
}

function routeShareInvite() {
  if (typeof window === 'undefined' || window.location.hash) return

  const token = new URLSearchParams(window.location.search).get('invite')
  if (!token) return

  window.history.replaceState(null, '', `${window.location.pathname}#/join/${encodeURIComponent(token)}`)
}

routeShareInvite()

export const router = createHashRouter([
  {
    Component: PublicOnly,
    children: [
      { path: 'login', Component: PasswordLoginScreen },
      { path: 'register', Component: SignUpScreen },
      { path: 'verify', element: <Navigate replace to="/login" /> },
    ],
  },
  {
    Component: ProtectedRoute,
    children: [
      {
        path: 'access',
        Component: AccessStatusScreen,
      },
      {
        path: 'admin/access',
        element: <AccessStatusScreen administratorOnly />,
      },
      {
        Component: AccessGate,
        children: [
          {
            Component: AppLayout,
            children: [
              { index: true, element: <Navigate replace to="/today" /> },
              { path: 'invite/:token', Component: InvitationScreen },
              { path: 'join/:token', Component: JoinHouseholdScreen },
              { path: 'today', Component: TodayRoute },
              { path: 'upcoming', Component: UpcomingRoute },
              { path: 'tasks', Component: TasksRoute },
              { path: 'history', Component: HistoryRoute },
              { path: 'more/*', Component: MoreRoute },
            ],
          },
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

import { Navigate, Outlet, createHashRouter } from 'react-router'

function AppLayout() {
  return <Outlet />
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
    Component: AppLayout,
    children: [
      { index: true, element: <Navigate replace to="/today" /> },
      { path: 'login', element: <PlannedRoute title="Sign in" /> },
      { path: 'verify', element: <PlannedRoute title="Verify your email" /> },
      { path: 'invite/:token', Component: InvitationRoute },
      { path: 'today', element: <PlannedRoute title="Today" /> },
      { path: 'upcoming', element: <PlannedRoute title="Upcoming" /> },
      { path: 'tasks', element: <PlannedRoute title="Tasks" /> },
      { path: 'history', element: <PlannedRoute title="History" /> },
      { path: 'more/*', element: <PlannedRoute title="More" /> },
      { path: '*', Component: NotFoundRoute },
    ],
  },
])

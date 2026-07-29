const intendedRouteStorageKey = 'hometeam.intended-route'

const defaultAuthenticatedRoute = '/today'

function isAllowedIntendedRoute(route: string) {
  return (
    route === '/today' ||
    route === '/upcoming' ||
    route === '/tasks' ||
    route === '/tasks?new=1' ||
    route === '/history' ||
    route === '/more' ||
    route.startsWith('/more/') ||
    /^\/invite\/[^/?#]+$/.test(route) ||
    /^\/join\/[^/?#]+$/.test(route)
  )
}

function canUseSessionStorage() {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined'
}

export function saveReturnLocation(pathname: string, search = '') {
  const route = `${pathname}${search}`

  if (canUseSessionStorage() && isAllowedIntendedRoute(route)) {
    window.sessionStorage.setItem(intendedRouteStorageKey, route)
  }
}

export function consumeReturnLocation() {
  if (!canUseSessionStorage()) {
    return defaultAuthenticatedRoute
  }

  const route = window.sessionStorage.getItem(intendedRouteStorageKey)
  window.sessionStorage.removeItem(intendedRouteStorageKey)

  return route && isAllowedIntendedRoute(route) ? route : defaultAuthenticatedRoute
}

export function peekReturnLocation() {
  if (!canUseSessionStorage()) return defaultAuthenticatedRoute
  const route = window.sessionStorage.getItem(intendedRouteStorageKey)
  return route && isAllowedIntendedRoute(route) ? route : defaultAuthenticatedRoute
}

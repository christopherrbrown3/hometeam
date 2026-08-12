export function buildHouseholdJoinLink(origin: string, pathname: string, token: string) {
  return `${origin}${pathname}#/join/${encodeURIComponent(token)}`
}

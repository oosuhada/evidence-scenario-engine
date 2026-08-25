export type RouteState =
  | { kind: 'home' }
  | { kind: 'decision'; decisionId: string; versionId?: string }
  | { kind: 'share'; token: string };

export function parseRoute(pathname: string): RouteState {
  const segments = pathname.split('/').filter(Boolean);
  if (segments[0] === 'share' && segments[1]) return { kind: 'share', token: segments[1] };
  if (segments[0] === 'decisions' && segments[1]) {
    if (segments[2] === 'versions' && segments[3]) return { kind: 'decision', decisionId: segments[1], versionId: segments[3] };
    return { kind: 'decision', decisionId: segments[1] };
  }
  return { kind: 'home' };
}

export function decisionPath(decisionId: string, versionId?: string) {
  return versionId
    ? `/decisions/${encodeURIComponent(decisionId)}/versions/${encodeURIComponent(versionId)}`
    : `/decisions/${encodeURIComponent(decisionId)}`;
}

export function sharePath(token: string) {
  return `/share/${encodeURIComponent(token)}`;
}

export function navigate(path: string, replace = false) {
  if (typeof window === 'undefined') return;
  if (replace) window.history.replaceState({}, '', path);
  else window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function isDebugMode() {
  const params = new URLSearchParams(window.location.search);
  return params.get('debug') === '1';
}

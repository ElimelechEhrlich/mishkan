/** Whether an earlier page of the app is behind this one (the router numbers its entries). */
export function hasAppHistory(): boolean {
  const state: unknown = window.history.state;
  return (
    typeof state === 'object' &&
    state !== null &&
    'idx' in state &&
    typeof state.idx === 'number' &&
    state.idx > 0
  );
}

import { startTransition, useOptimistic } from 'react';

/**
 * A text control that stays responsive while the rest of the editor catches up. The typed text shows at once; the
 * change itself goes to the store as a transition, so the heavy re-render of every readout and preview can be
 * interrupted by the next keystroke. When the store settles, the shown text is the stored value again, which is
 * how a discard or a shared field written elsewhere still reaches the control.
 */
export function useDeferredEdit(value: string, commit: (next: string) => void): [string, (next: string) => void] {
  const [shown, setShown] = useOptimistic(value);
  return [
    shown,
    (next) =>
      startTransition(() => {
        setShown(next);
        commit(next);
      }),
  ];
}

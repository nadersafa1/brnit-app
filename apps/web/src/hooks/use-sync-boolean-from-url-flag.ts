import { useEffect } from 'react'

/**
 * Keeps local boolean state aligned with a value derived from the URL (e.g. `?delete=1`).
 * Re-runs when the user navigates with back/forward so dialogs stay in sync with the address bar.
 */
export function useSyncBooleanFromUrlFlag(urlFlag: boolean, setOpen: (value: boolean) => void) {
  useEffect(() => {
    setOpen(urlFlag)
  }, [urlFlag, setOpen])
}

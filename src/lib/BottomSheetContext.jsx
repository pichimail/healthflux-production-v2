import { createContext, useContext, useState, useCallback } from 'react';

const BottomSheetContext = createContext({
  anySheetOpen: false,
  openSheet: () => {},
  closeSheet: () => {},
});

export function BottomSheetProvider({ children }) {
  const [openCount, setOpenCount] = useState(0);

  const openSheet = useCallback(() => setOpenCount(c => c + 1), []);
  const closeSheet = useCallback(() => setOpenCount(c => Math.max(0, c - 1)), []);

  return (
    <BottomSheetContext.Provider value={{ anySheetOpen: openCount > 0, openSheet, closeSheet }}>
      {children}
    </BottomSheetContext.Provider>
  );
}

export function useBottomSheet() {
  return useContext(BottomSheetContext);
}

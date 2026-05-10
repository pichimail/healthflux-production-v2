/**
 * FABContext — allows any page inside UserLayout to register a handler
 * for FAB quick-add actions. The Layout renders the FAB and dispatches
 * actions here; pages that want custom behaviour (e.g. Dashboard) register
 * a handler on mount and clean it up on unmount. Pages with no handler get
 * the fallback navigation defined in Layout.
 */
import { createContext, useContext, useCallback, useRef } from 'react';

/**
 * @typedef {(key: string, extra?: any) => void} FABHandler
 * @typedef {{
 *   registerHandler: (fn: FABHandler | null) => () => void,
 *   dispatch: (key: string, extra?: any) => boolean,
 * }} FABActionContextValue
 */

/** @type {import("react").Context<FABActionContextValue>} */
const FABActionContext = createContext(/** @type {FABActionContextValue} */ ({
  registerHandler: () => () => {},
  dispatch: () => false,
}));

/**
 * @param {{ children?: import("react").ReactNode }} props
 */
export function FABActionProvider({ children }) {
  /** @type {import("react").MutableRefObject<FABHandler | null>} */
  const handlerRef = useRef(null);

  /** @type {FABActionContextValue["registerHandler"]} */
  const registerHandler = useCallback((fn) => {
    handlerRef.current = fn;
    return () => {
      handlerRef.current = null;
    };
  }, []);

  /** Returns true if a page handler consumed the event, false for fallback. */
  /** @type {FABActionContextValue["dispatch"]} */
  const dispatch = useCallback((key, extra) => {
    if (handlerRef.current) {
      handlerRef.current(key, extra);
      return true;
    }
    return false;
  }, []);

  return (
    <FABActionContext.Provider value={{ registerHandler, dispatch }}>
      {children}
    </FABActionContext.Provider>
  );
}

export function useFABDispatch() {
  return useContext(FABActionContext);
}

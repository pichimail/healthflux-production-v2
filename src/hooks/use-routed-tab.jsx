import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

function getFallbackTab(defaultTab, validTabs) {
  return validTabs.includes(defaultTab) ? defaultTab : validTabs[0];
}

export function useRoutedTab({ storageKey, defaultTab, validTabs }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get("tab");
  const fallbackTab = useMemo(
    () => getFallbackTab(defaultTab, validTabs),
    [defaultTab, validTabs]
  );

  const initialTab = useMemo(() => {
    if (urlTab && validTabs.includes(urlTab)) {
      return urlTab;
    }

    const stored = storageKey ? localStorage.getItem(storageKey) : null;
    if (stored && validTabs.includes(stored)) {
      return stored;
    }

    return fallbackTab;
  }, [fallbackTab, storageKey, urlTab, validTabs]);

  const [activeTab, setActiveTabState] = useState(initialTab);

  useEffect(() => {
    // Only react when the URL itself changes.
    // If this also depends on `activeTab`, a local tab click can briefly render
    // the new state against the old `urlTab` and snap back before the router
    // finishes updating the query string.
    if (!urlTab || !validTabs.includes(urlTab)) {
      return;
    }

    setActiveTabState((currentTab) => (
      currentTab === urlTab ? currentTab : urlTab
    ));
  }, [urlTab, validTabs]);

  useEffect(() => {
    if (!validTabs.includes(activeTab) && fallbackTab && activeTab !== fallbackTab) {
      setActiveTabState(fallbackTab);
    }
  }, [activeTab, fallbackTab, validTabs]);

  useEffect(() => {
    if (!storageKey || !activeTab) {
      return;
    }

    localStorage.setItem(storageKey, activeTab);
  }, [activeTab, storageKey]);

  const setActiveTab = useCallback((value) => {
    if (!validTabs.includes(value) || value === activeTab) {
      return;
    }

    if (storageKey) {
      localStorage.setItem(storageKey, value);
    }

    setActiveTabState(value);

    const nextParams = new URLSearchParams(searchParams);
    if (value === fallbackTab) {
      nextParams.delete("tab");
    } else {
      nextParams.set("tab", value);
    }

    setSearchParams(nextParams, { replace: true });
  }, [activeTab, fallbackTab, searchParams, setSearchParams, storageKey, validTabs]);

  return [activeTab, setActiveTab];
}

export default useRoutedTab;

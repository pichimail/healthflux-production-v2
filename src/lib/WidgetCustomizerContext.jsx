import React, { createContext, useContext, useState } from 'react';

const WidgetCustomizerContext = createContext(null);

export function WidgetCustomizerProvider({ children }) {
  const [customizerNode, setCustomizerNode] = useState(null);

  return (
    <WidgetCustomizerContext.Provider value={{ customizerNode, setCustomizerNode }}>
      {children}
    </WidgetCustomizerContext.Provider>
  );
}

export function useWidgetCustomizer() {
  return useContext(WidgetCustomizerContext);
}
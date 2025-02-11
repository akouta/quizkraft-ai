import React, { createContext, useState } from 'react';

export const AppContext = createContext();

export function AppProvider({ children }) {
  const [quizResults, setQuizResults] = useState(null);

  return (
    <AppContext.Provider value={{ quizResults, setQuizResults }}>
      {children}
    </AppContext.Provider>
  );
}


import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

interface KeywordContextType {
  latestKeyword: string;
  setLatestKeyword: (keyword: string) => void;
}

const KeywordContext = createContext<KeywordContextType | undefined>(undefined);

export const KeywordProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize from localStorage or use default value
  const [latestKeyword, setLatestKeyword] = useState<string>(() => {
    const savedKeyword = localStorage.getItem('latest_keyword');
    return savedKeyword || '';
  });

  // Update localStorage when latestKeyword changes
  useEffect(() => {
    if (latestKeyword) {
      localStorage.setItem('latest_keyword', latestKeyword);
    }
  }, [latestKeyword]);

  return (
    <KeywordContext.Provider value={{ latestKeyword, setLatestKeyword }}>
      {children}
    </KeywordContext.Provider>
  );
};

export const useKeyword = (): KeywordContextType => {
  const context = useContext(KeywordContext);
  if (context === undefined) {
    throw new Error('useKeyword must be used within a KeywordProvider');
  }
  return context;
};

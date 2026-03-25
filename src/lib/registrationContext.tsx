import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type RegData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  professional: string;
};

type RegistrationContextType = {
  isRegistered: boolean;
  regData: RegData | null;
  register: (data: RegData) => void;
  logout: () => void;
};

const RegistrationContext = createContext<RegistrationContextType | null>(null);

const STORAGE_KEY = 'ozcta_registration';

export function RegistrationProvider({ children }: { children: ReactNode }) {
  const [regData, setRegData] = useState<RegData | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? (JSON.parse(stored) as RegData) : null;
    } catch {
      return null;
    }
  });

  const isRegistered = regData !== null;

  useEffect(() => {
    if (regData) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(regData));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [regData]);

  const register = (data: RegData) => setRegData(data);
  const logout = () => setRegData(null);

  return (
    <RegistrationContext.Provider value={{ isRegistered, regData, register, logout }}>
      {children}
    </RegistrationContext.Provider>
  );
}

export function useRegistration() {
  const ctx = useContext(RegistrationContext);
  if (!ctx) throw new Error('useRegistration must be used within RegistrationProvider');
  return ctx;
}

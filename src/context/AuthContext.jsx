import { createContext, useContext, useState, useCallback } from 'react';
import { loginUser } from '../api/api.js';

const AuthContext = createContext(null);

function loadUser() {
  try {
    const raw = localStorage.getItem('ssis_user');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem('ssis_user');
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadUser);

  const login = useCallback(async (student_number, password) => {
    const userData = await loginUser(student_number, password);
    setUser(userData);
    return userData;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('ssis_user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

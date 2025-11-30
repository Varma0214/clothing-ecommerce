import { createContext, useState, useEffect } from 'react';
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  useEffect(() => {
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    if (userInfo) setUser(userInfo);
  }, []);

  const login = (data) => {
    setUser(data);
    localStorage.setItem('userInfo', JSON.stringify(data));
  };
  const logout = () => {
    setUser(null);
    localStorage.removeItem('userInfo');
  };
  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
};
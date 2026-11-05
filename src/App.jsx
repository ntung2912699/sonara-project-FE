import { useCallback, useState } from 'react';
import { AuthScreen } from './features/auth/AuthScreen.jsx';
import { Dashboard } from './features/dashboard/Dashboard.jsx';
import { TOKEN_KEY, USER_KEY } from './common/utils/appData.js';

function App() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch {
      return null;
    }
  });

  const onAuthenticated = useCallback((session) => {
    localStorage.setItem(TOKEN_KEY, session.token);
    localStorage.setItem(USER_KEY, JSON.stringify(session.user));
    setUser(session.user);
    setToken(session.token);
  }, []);

  const onLogout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  return token
    ? <Dashboard token={token} user={user} setUser={setUser} onLogout={onLogout} />
    : <AuthScreen onAuthenticated={onAuthenticated} />;
}

export default App;

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { platformRequest } from '../../plans/services/plans.api.js';
import { canUseFeature } from '../../plans/plan.utils.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Se conserva la política existente: el token vive solo en memoria.
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [usage, setUsage] = useState(null);
  const [activeUsers, setActiveUsers] = useState(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [sessionError, setSessionError] = useState('');
  const tokenRef = useRef(null);
  const inFlight = useRef(null);

  const logout = useCallback(() => {
    tokenRef.current = null;
    inFlight.current = null;
    setUser(null); setToken(null); setTenant(null); setSubscription(null);
    setUsage(null); setActiveUsers(null); setSubscriptionLoading(false); setSessionError('');
  }, []);

  const login = useCallback(authData => {
    tokenRef.current = authData.token;
    setUser(authData.user); setToken(authData.token);
    setTenant(authData.tenant || null); setSubscription(authData.subscription || null);
    setUsage(null); setActiveUsers(null); setSessionError('');
    setSubscriptionLoading(authData.user?.role !== 'SUPER_ADMIN');
  }, []);

  // Validación automática: no requiere un botón en el panel.
  const refreshSession = useCallback(async () => {
    const currentToken = tokenRef.current;
    if (!currentToken) return;
    if (inFlight.current?.token === currentToken) return inFlight.current.promise;
    const promise = (async () => {
      try {
        const session = await platformRequest(currentToken, '/api/auth/me');
        if (tokenRef.current !== currentToken) return;
        setUser(session.user); setTenant(session.tenant || null);
        setSubscription(session.subscription || null);
        if (session.user.role !== 'SUPER_ADMIN') {
          const detail = await platformRequest(currentToken, '/api/subscription');
          if (tokenRef.current !== currentToken) return;
          setSubscription(detail.subscription || null); setTenant(detail.tenant || session.tenant || null);
          setUsage(detail.usage || null); setActiveUsers(detail.activeUsers ?? null);
        }
        setSessionError('');
      } catch (error) {
        if (tokenRef.current !== currentToken) return;
        // Los errores de licencia no invalidan la identidad: permiten consultar Mi plan.
        const licenseError = ['PLAN_REQUIRED', 'SUBSCRIPTION_EXPIRED', 'SUBSCRIPTION_NOT_STARTED', 'MODULE_NOT_INCLUDED'].includes(error.code);
        if (error.status === 401 || (error.status === 403 && !licenseError)) {
          logout();
          setSessionError(error.message || 'Tu sesión finalizó. Inicia sesión nuevamente.');
        } else {
          setSessionError(error.message || 'No pudimos consultar la sesión. Intenta de nuevo.');
        }
      } finally {
        if (tokenRef.current === currentToken) setSubscriptionLoading(false);
        if (inFlight.current?.token === currentToken) inFlight.current = null;
      }
    })();
    inFlight.current = { token: currentToken, promise };
    return promise;
  }, [logout]);

  useEffect(() => {
    if (!token) return;
    refreshSession();
    const check = () => { if (document.visibilityState === 'visible') refreshSession(); };
    const interval = window.setInterval(check, 30000);
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', check);
    };
  }, [token, refreshSession]);

  return <AuthContext.Provider value={{ user, token, tenant, subscription, usage, activeUsers,
    subscriptionLoading, sessionError, isAuthenticated: Boolean(token && user), login, logout, refreshSession,
    hasFeature: feature => canUseFeature(subscription, feature),
  }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe utilizarse dentro de AuthProvider');
  return context;
}

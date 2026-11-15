// Importa los ganchos (hooks) 'createContext', 'useContext' y 'useState' de React 
// para crear un contexto global y gestionar el estado de la sesión.
import {
  createContext,
  useContext,
  useState,
} from "react";

// 1. Creamos el contexto de autenticación con un valor inicial de 'null'.
const AuthContext = createContext(null);

// 2. Creamos y exportamos el componente proveedor (Provider) que envolverá a la aplicación 
// para compartir el estado de autenticación a través de sus componentes hijos ({children}).
export function AuthProvider({ children }) {
  // Define el estado 'user' para almacenar la información del usuario autenticado (inicia en 'null').
  const [user, setUser] = useState(null);
  // Define el estado 'token' para almacenar el token de sesión (inicia en 'null').
  const [token, setToken] = useState(null);

  // 3. Función para iniciar sesión: recibe los datos de autenticación (authData) 
  // y actualiza los estados del usuario y del token con la información recibida.
  function login(authData) {
    setUser(authData.user);
    setToken(authData.token);
  }

  // 4. Función para cerrar sesión: limpia los estados de usuario y token, reseteándolos a 'null'.
  function logout() {
    setUser(null);
    setToken(null);
  }

  // 5. Agrupa en un objeto 'value' toda la información y funciones que se compartirán globalmente,
  // incluyendo 'isAuthenticated', que evalúa a verdadero (true) solo si existen tanto el token como el usuario.
  const value = {
    user,
    token,
    isAuthenticated: Boolean(token && user),
    login,
    logout,
  };

  // Retorna el proveedor del contexto envolviendo a los hijos, inyectándoles el objeto 'value'.
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// 6. Hook personalizado ('useAuth') para consumir el contexto de manera sencilla en cualquier componente.
export function useAuth() {
  // Obtiene el valor actual del contexto utilizando 'useContext'.
  const context = useContext(AuthContext);

  // Validación de seguridad: si se intenta usar este hook fuera de un 'AuthProvider', 
  // lanza un error para avisar al desarrollador.
  if (!context) {
    throw new Error(
      "useAuth debe utilizarse dentro de AuthProvider"
    );
  }

  // Retorna el objeto con los datos y funciones del contexto si todo es correcto.
  return context;
}
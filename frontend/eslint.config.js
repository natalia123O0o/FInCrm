// Importa las reglas base recomendadas de JavaScript desde ESLint
import js from '@eslint/js';

// Importa el plugin para validar las reglas oficiales de los Hooks de React (useState, useEffect, etc.)
import reactHooks from 'eslint-plugin-react-hooks';

// Importa el plugin que asegura compatibilidad con Fast Refresh en Vite
import reactRefresh from 'eslint-plugin-react-refresh';

// Configuración en formato Flat Config (ESLint v9+)
export default [
  // Ignora la carpeta de compilación para producción para no analizar archivos generados
  { ignores: ['dist'] },

  // Configuración principal aplicable a todos los archivos JavaScript y JSX
  {
    // Define los patrones de archivos que evaluará este bloque
    files: ['**/*.{js,jsx}'],

    // Opciones del entorno de ejecución de JavaScript
    languageOptions: { 
      ecmaVersion: 2020, // Soporte para sintaxis de ECMAScript 2020 (operador opcional ?., etc.)
      sourceType: 'module', // Habilita el uso de módulos ES (import / export)
    },

    // Registra los plugins de React para usarlos en la sección de reglas
    plugins: { 
      'react-hooks': reactHooks, 
      'react-refresh': reactRefresh 
    },

    // Reglas activas para el linter
    rules: {
      // Aplica las reglas recomendadas para los Hooks de React (ej: verificar dependencias de useEffect)
      ...reactHooks.configs.recommended.rules,

      // Emite una advertencia si se exportan elementos que no son componentes de React en archivos JSX
      // (Previene que se rompa el Fast Refresh / Hot Reload de Vite)
      'react-refresh/only-export-components': 'warn',
    },
  },
];
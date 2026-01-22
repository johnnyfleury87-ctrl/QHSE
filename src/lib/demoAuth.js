/**
 * Auth Démo - Simulation session utilisateur
 * 
 * Gère l'authentification en mode démo:
 * - Login/Logout
 * - Session localStorage
 * - Pas de token JWT réel
 * - Validation contre mockData.users
 */

import { mockUsers } from '@/data/mockData';

const DEMO_SESSION_KEY = 'qhse_demo_session';

/**
 * Login démo
 * @param {string} email 
 * @param {string} password (non vérifié en démo, accepte n'importe quel mot de passe)
 * @returns {Object} { success: boolean, user?: Object, error?: string }
 */
export const demoLogin = (email, password) => {
  // Chercher user par email
  const user = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
  
  if (!user) {
    return {
      success: false,
      error: 'Utilisateur introuvable',
    };
  }
  
  if (user.status !== 'active') {
    return {
      success: false,
      error: 'Compte inactif',
    };
  }
  
  // En démo, on accepte n'importe quel mot de passe (pour simplifier)
  // Dans un vrai système, on vérifierait hash password
  
  // Créer session
  const session = {
    userId: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    loginAt: new Date().toISOString(),
  };
  
  // Stocker dans localStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(session));
  }
  
  return {
    success: true,
    user: session,
  };
};

/**
 * Logout démo
 */
export const demoLogout = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(DEMO_SESSION_KEY);
  }
};

/**
 * Récupérer session courante
 * @returns {Object|null} session ou null si pas connecté
 */
export const getDemoSession = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  
  const sessionData = localStorage.getItem(DEMO_SESSION_KEY);
  if (!sessionData) {
    return null;
  }
  
  try {
    return JSON.parse(sessionData);
  } catch (error) {
    console.error('[demoAuth] Session invalide:', error);
    localStorage.removeItem(DEMO_SESSION_KEY);
    return null;
  }
};

/**
 * Récupérer utilisateur courant (avec toutes les infos depuis mockData)
 * @returns {Object|null}
 */
export const getCurrentDemoUser = () => {
  const session = getDemoSession();
  if (!session) {
    return null;
  }
  
  // Enrichir avec données complètes depuis mockData
  const user = mockUsers.find(u => u.id === session.userId);
  return user || null;
};

/**
 * Vérifier si utilisateur est connecté
 * @returns {boolean}
 */
export const isDemoAuthenticated = () => {
  return getDemoSession() !== null;
};

/**
 * Vérifier si utilisateur a un rôle donné
 * @param {string|string[]} allowedRoles 
 * @returns {boolean}
 */
export const hasDemoRole = (allowedRoles) => {
  const session = getDemoSession();
  if (!session) {
    return false;
  }
  
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return roles.includes(session.role);
};

/**
 * Liste des users démo disponibles (pour page login démo)
 * @returns {Array} Liste des emails disponibles
 */
export const getDemoUsersList = () => {
  return mockUsers.map(u => ({
    email: u.email,
    name: `${u.firstName} ${u.lastName}`,
    role: u.role,
  }));
};

const demoAuth = {
  login: demoLogin,
  logout: demoLogout,
  getSession: getDemoSession,
  getCurrentUser: getCurrentDemoUser,
  isAuthenticated: isDemoAuthenticated,
  hasRole: hasDemoRole,
  getUsersList: getDemoUsersList,
};

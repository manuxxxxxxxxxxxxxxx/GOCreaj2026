import api from './apiClient';
import { storageGet, storageSet, storageRemove, KEYS } from '../utils/storage';
import { DEMO_USERS } from '../data/catalog';
import type { User, UserRole, AuthTokens } from '../types';

const DEFAULT_USER: User = {
  id: '',
  name: 'Mi perfil',
  email: '',
  phone: '',
  address: '',
  bio: '',
  avatar: null,
  role: 'buyer',
  status: 'verified',
  joinedAt: Date.now(),
};

export async function getStoredUser(): Promise<User> {
  const stored = await storageGet<Partial<User>>(KEYS.user);
  return { ...DEFAULT_USER, ...stored };
}

export async function saveUser(data: Partial<User>): Promise<void> {
  const current = await getStoredUser();
  await storageSet(KEYS.user, { ...current, ...data });
}

export async function isLoggedIn(): Promise<boolean> {
  const u = await getStoredUser();
  return !!(u.email && u.name && u.name !== 'Mi perfil');
}

export async function logout(): Promise<void> {
  await storageRemove(KEYS.user);
  await storageRemove(KEYS.accessToken);
  await storageRemove(KEYS.refreshToken);
}

async function getAllUsers(): Promise<User[]> {
  const stored = await storageGet<User[]>(KEYS.allUsers);
  if (stored) return stored;
  await storageSet(KEYS.allUsers, DEMO_USERS);
  return DEMO_USERS;
}

async function saveAllUsers(users: User[]): Promise<void> {
  await storageSet(KEYS.allUsers, users);
}

function findUserByEmail(users: User[], email: string): User | undefined {
  return users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
}

export async function login(
  email: string,
  password: string
): Promise<{ user: User; tokens?: AuthTokens } | { error: string }> {
  try {
    const res = await api.post('/auth/login', { email, password });
    const { user, accessToken, refreshToken } = res.data;
    await storageSet(KEYS.accessToken, accessToken);
    await storageSet(KEYS.refreshToken, refreshToken);
    const u: User = {
      id:     user.id,
      name:   user.name || email.split('@')[0],
      email:  user.email,
      role:   user.role,
      status: user.status,
      joinedAt: Date.now(),
    };
    await saveUser(u);
    return { user: u, tokens: { accessToken, refreshToken } };
  } catch (err: any) {
    if (!err.response) {
      return loginDemo(email);
    }
    const msg = err.response?.data?.error || 'Credenciales incorrectas.';
    return { error: msg };
  }
}

async function loginDemo(email: string): Promise<{ user: User } | { error: string }> {
  const users = await getAllUsers();
  const found = findUserByEmail(users, email);
  if (!found) return { error: 'Correo no registrado. Crea una cuenta primero.' };
  await saveUser(found);
  return { user: found };
}

export async function register(
  name: string,
  email: string,
  password: string,
  role: UserRole
): Promise<{ success: true; requiresVerification?: boolean } | { error: string }> {
  try {
    await api.post('/auth/register', { name, email, password, role, termsAccepted: 'true' });
    return { success: true, requiresVerification: true };
  } catch (err: any) {
    if (!err.response) {
      return registerDemo(name, email, role);
    }
    if (err.response.status === 409) return { error: 'Este correo ya está registrado.' };
    return { error: err.response?.data?.error || 'Error al crear la cuenta.' };
  }
}

async function registerDemo(
  name: string,
  email: string,
  role: UserRole
): Promise<{ success: true } | { error: string }> {
  const users = await getAllUsers();
  if (findUserByEmail(users, email)) return { error: 'Este correo ya está registrado. Inicia sesión.' };
  const newUser: User = {
    id:       `u${Date.now()}`,
    name,
    email,
    role,
    status:   'verified',
    joinedAt: Date.now(),
  };
  users.push(newUser);
  await saveAllUsers(users);
  await saveUser(newUser);
  return { success: true };
}

export async function forgotPassword(email: string): Promise<void> {
  try {
    await api.post('/auth/forgot-password', { email });
  } catch {}
}

export function getDashboardRoute(role: UserRole): string {
  const map: Record<string, string> = {
    seller:       'SellerDashboard',
    driver:       'DriverDashboard',
    admin:        'AdminDashboard',
    master_admin: 'AdminDashboard',
  };
  return map[role] ?? 'Home';
}

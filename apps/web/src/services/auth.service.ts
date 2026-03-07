import { account } from './appwrite.js';
import { ID } from 'appwrite';
import type { Models } from 'appwrite';

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends AuthCredentials {
  name: string;
}

export async function signUp(credentials: RegisterCredentials): Promise<Models.User<Models.Preferences>> {
  const user = await account.create(
    ID.unique(),
    credentials.email,
    credentials.password,
    credentials.name,
  );
  // Auto-login after registration
  await account.createEmailPasswordSession(credentials.email, credentials.password);
  return user;
}

export async function signIn(credentials: AuthCredentials): Promise<Models.Session> {
  return account.createEmailPasswordSession(credentials.email, credentials.password);
}

export async function signOut(): Promise<void> {
  await account.deleteSession('current');
}

export async function getCurrentUser(): Promise<Models.User<Models.Preferences> | null> {
  try {
    return await account.get();
  } catch {
    return null;
  }
}

export async function updateDisplayName(name: string): Promise<Models.User<Models.Preferences>> {
  return account.updateName(name);
}

export async function updatePreferences(
  prefs: Models.Preferences,
): Promise<Models.User<Models.Preferences>> {
  return account.updatePrefs(prefs);
}

import { account, storage } from './appwrite.js';
import { ID } from 'appwrite';
import type { Models } from 'appwrite';

const AVATAR_BUCKET_ID = import.meta.env.VITE_APPWRITE_AVATAR_BUCKET_ID || '';

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

export async function requestPasswordRecovery(email: string): Promise<void> {
  const url = `${window.location.origin}/auth/reset-password`;
  await account.createRecovery(email, url);
}

export async function completePasswordRecovery(data: {
  userId: string;
  secret: string;
  password: string;
}): Promise<void> {
  await account.updateRecovery(data.userId, data.secret, data.password);
}

export async function uploadAvatarFile(file: File): Promise<{ fileId: string; url: string }> {
  if (!AVATAR_BUCKET_ID) {
    throw new Error('Avatar bucket is not configured (VITE_APPWRITE_AVATAR_BUCKET_ID).');
  }

  if (!file.type.startsWith('image/')) {
    throw new Error('Avatar must be an image file.');
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Avatar must be 5MB or smaller.');
  }

  const created = await storage.createFile(AVATAR_BUCKET_ID, ID.unique(), file);
  const preview = storage.getFilePreview(AVATAR_BUCKET_ID, created.$id, 256, 256);

  return {
    fileId: created.$id,
    url: preview.toString(),
  };
}

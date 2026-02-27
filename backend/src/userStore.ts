import { randomUUID } from 'crypto';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
}

const users = new Map<string, User>(); // key: email (normalised)

export function createUser(email: string, passwordHash: string): User {
  const key = email.toLowerCase();
  if (users.has(key)) {
    throw new Error('email_taken');
  }
  const user: User = { id: randomUUID(), email: key, passwordHash };
  users.set(key, user);
  return user;
}

export function findUserByEmail(email: string): User | undefined {
  return users.get(email.toLowerCase());
}

export function resetUserStoreForTests(): void {
  users.clear();
}

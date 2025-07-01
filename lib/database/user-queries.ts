/**
 * User Database Query Functions
 * 
 * This module provides database query functions for user profile operations
 * used by the settings screen and user management features.
 */

import { eq } from 'drizzle-orm';
import { db } from '../../server/db';
import { users } from '../../shared/schema';
import type { User } from '../../shared/schema';

/**
 * Get user profile data by user ID
 * @param userId - The user ID from Replit Auth
 * @returns User profile data or null if not found
 */
export async function getUserProfile(userId: string): Promise<User | null> {
  try {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    return result[0] || null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw new Error('Failed to fetch user profile');
  }
}

/**
 * Update user name in the database
 * @param userId - The user ID from Replit Auth
 * @param name - The new name to set
 * @returns Updated user data
 */
export async function updateUserName(userId: string, name: string): Promise<User> {
  try {
    if (!name || name.trim().length === 0) {
      throw new Error('Name cannot be empty');
    }

    const result = await db
      .update(users)
      .set({ 
        name: name.trim(),
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    
    if (result.length === 0) {
      throw new Error('User not found');
    }
    
    return result[0];
  } catch (error) {
    console.error('Error updating user name:', error);
    throw error;
  }
}

/**
 * Create or update user profile (upsert operation)
 * Used when a user logs in and we need to ensure their profile exists
 * @param userData - User data from Replit Auth
 * @returns User profile data
 */
export async function upsertUserProfile(userData: {
  id: string;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
}): Promise<User> {
  try {
    const result = await db
      .insert(users)
      .values({
        id: userData.id,
        username: userData.username,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          username: userData.username,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          updatedAt: new Date(),
        },
      })
      .returning();
    
    return result[0];
  } catch (error) {
    console.error('Error upserting user profile:', error);
    throw new Error('Failed to create or update user profile');
  }
} 
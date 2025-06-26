import { clerkClient } from "@clerk/clerk-sdk-node";
import { auth } from "@clerk/nextjs";

export { clerkClient };

export function getCurrentUser() {
  const { userId } = auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  return userId;
}

export async function getUserMetadata(userId: string) {
  try {
    const user = await clerkClient.users.getUser(userId);
    return {
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      role: user.publicMetadata.role || 'social_worker',
    };
  } catch (error) {
    console.error('Error fetching user metadata:', error);
    throw error;
  }
}

export async function updateUserRole(userId: string, role: string) {
  try {
    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: { role }
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
} 
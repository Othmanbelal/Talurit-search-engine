import { compare, hash } from "bcryptjs";
import { AppError } from "../../utils/AppError";
import type { ChangePasswordInput, UpdateProfileInput } from "./profile.schemas";
import {
  findUserWithProfile,
  updateProfilePicture,
  updateUserPassword,
  upsertUserProfile,
} from "./profile.repository";

export async function getProfile(userId: string) {
  const user = await findUserWithProfile(userId);
  if (!user) throw new AppError("User not found.", 404);
  return serializeProfile(user);
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  const updated = await upsertUserProfile(userId, input);
  if (!updated) throw new AppError("User not found.", 404);
  return serializeProfile(updated);
}

export async function changePassword(userId: string, input: ChangePasswordInput) {
  const user = await findUserWithProfile(userId);
  if (!user || !user.passwordHash) throw new AppError("User not found.", 404);
  const valid = await compare(input.currentPassword, user.passwordHash);
  if (!valid) throw new AppError("Current password is incorrect.", 400);
  const newHash = await hash(input.newPassword, 12);
  await updateUserPassword(userId, newHash);
}

export async function uploadProfilePicture(userId: string, imageUrl: string) {
  await updateProfilePicture(userId, imageUrl);
  return { profilePictureUrl: imageUrl };
}

function serializeProfile(user: {
  id: string;
  email: string;
  name: string;
  role: string;
  profile: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string | null;
    profilePictureUrl: string | null;
  } | null;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    profile: user.profile ?? null,
  };
}

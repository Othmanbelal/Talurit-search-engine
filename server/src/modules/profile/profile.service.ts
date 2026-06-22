import { compare, hash } from "bcryptjs";
import { AppError } from "../../utils/AppError";
import type { ChangePasswordInput, UpdateProfileInput } from "./profile.schemas";
import { landingTargetExists, resolveLandingPath, type LandingType } from "./landing";
import {
  clearLandingPreference,
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
  // Validate a group/table landing target exists before persisting it.
  if ((input.landingType === "group" || input.landingType === "table") && input.landingTargetId) {
    const exists = await landingTargetExists(input.landingType, input.landingTargetId);
    if (!exists) throw new AppError("The selected landing destination no longer exists.", 400);
  }
  // Clearing the preference: normalize all three fields to null together.
  const data = input.landingType === null
    ? { ...input, landingPath: null, landingTargetId: null }
    : input;
  const updated = await upsertUserProfile(userId, data);
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

type ProfileRecord = {
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
    landingType: string | null;
    landingPath: string | null;
    landingTargetId: string | null;
  } | null;
};

async function serializeProfile(user: ProfileRecord) {
  const profile = user.profile;
  const { path, stale } = await resolveLandingPath({
    landingType: profile?.landingType ?? null,
    landingPath: profile?.landingPath ?? null,
    landingTargetId: profile?.landingTargetId ?? null,
  });
  // A target that was deleted is cleared so the UI resets to the default.
  if (stale) await clearLandingPreference(user.id);

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    profile: profile
      ? {
          ...profile,
          landingType: stale ? null : (profile.landingType as LandingType | null),
          landingPath: stale ? null : profile.landingPath,
          landingTargetId: stale ? null : profile.landingTargetId,
        }
      : null,
    landingResolvedPath: path,
  };
}

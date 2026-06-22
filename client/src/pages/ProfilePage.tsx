import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../components/feedback/ToastProvider";
import { getProfileRequest, type ProfileData } from "../services/profile.service";
import { AvatarSection } from "../components/profile/AvatarSection";
import { ProfileForm } from "../components/profile/ProfileForm";
import { PasswordForm } from "../components/profile/PasswordForm";
import { LandingPagePicker } from "../components/profile/LandingPagePicker";

export function ProfilePage() {
  const { refreshUser } = useAuth();
  const toast = useToast();
  const [profile, setProfile] = useState<ProfileData | null>(null);

  const loadProfile = useCallback(() => {
    getProfileRequest()
      .then((result) => setProfile(result.profile))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Could not load profile"));
  }, [toast]);

  useEffect(loadProfile, [loadProfile]);

  // After a save: reload the profile, refresh the auth user (landing path, avatar), and toast.
  const handleSaved = useCallback(async (message: string) => {
    loadProfile();
    await refreshUser();
    toast.success(message);
  }, [loadProfile, refreshUser, toast]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Account</p>
        <h1 className="mt-3 text-3xl font-semibold text-white md:text-4xl">Profile settings</h1>
        <p className="mt-2 text-sm text-slate-400">Manage your personal information, security, and landing page.</p>
      </header>

      {profile ? (
        <>
          <AvatarSection profile={profile} onUpdated={handleSaved} onError={toast.error} />
          <ProfileForm profile={profile} onSaved={handleSaved} />
          <PasswordForm onSaved={toast.success} onError={toast.error} />
          <LandingPagePicker profile={profile} onSaved={handleSaved} onError={toast.error} />
        </>
      ) : null}
    </div>
  );
}

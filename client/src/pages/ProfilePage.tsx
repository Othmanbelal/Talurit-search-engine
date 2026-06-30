import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../components/feedback/ToastProvider";
import { getProfileRequest, type ProfileData } from "../services/profile.service";
import { AvatarSection } from "../components/profile/AvatarSection";
import { ProfileForm } from "../components/profile/ProfileForm";
import { PasswordForm } from "../components/profile/PasswordForm";
import { LandingPagePicker } from "../components/profile/LandingPagePicker";
import { LanguagePicker } from "../components/profile/LanguagePicker";

export function ProfilePage() {
  const { refreshUser } = useAuth();
  const toast = useToast();
  const { t } = useTranslation("profile");
  const [profile, setProfile] = useState<ProfileData | null>(null);

  const loadProfile = useCallback(() => {
    getProfileRequest()
      .then((result) => setProfile(result.profile))
      .catch((err) => toast.error(err instanceof Error ? err.message : t("loadError")));
  }, [toast, t]);

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
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">{t("sectionLabel")}</p>
        <h1 className="mt-3 text-3xl font-semibold text-white md:text-4xl">{t("title")}</h1>
        <p className="mt-2 text-sm text-slate-400">{t("subtitle")}</p>
      </header>

      {profile ? (
        <>
          <AvatarSection profile={profile} onUpdated={handleSaved} onError={toast.error} />
          <ProfileForm profile={profile} onSaved={handleSaved} />
          <PasswordForm onSaved={toast.success} onError={toast.error} />
          <LandingPagePicker profile={profile} onSaved={handleSaved} onError={toast.error} />
          <LanguagePicker profile={profile} onSaved={handleSaved} onError={toast.error} />
        </>
      ) : null}
    </div>
  );
}

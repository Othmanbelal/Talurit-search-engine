import { Camera, User } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { uploadProfilePictureRequest, type ProfileData } from "../../services/profile.service";
import { buildApiUrl } from "../../services/http";
import { AvatarCropModal } from "./AvatarCropModal";

const MAX_BYTES = 3 * 1024 * 1024;

export function AvatarSection({ onUpdated, onError, profile }: {
  onUpdated: (message: string) => Promise<void> | void;
  onError: (message: string) => void;
  profile: ProfileData;
}) {
  const { t } = useTranslation("profile");
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const pictureUrl = profile.profile?.profilePictureUrl;

  function openFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { onError(t("avatar.error.invalidType")); return; }
    if (file.size > MAX_BYTES) { onError(t("avatar.error.tooLarge")); return; }
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleCropped(blob: Blob) {
    setUploading(true);
    try {
      const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
      await uploadProfilePictureRequest(file);
      setCropSrc(null);
      await onUpdated(t("avatar.saved"));
    } catch {
      onError(t("avatar.error.uploadFailed"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="rounded-lg border border-line bg-panel p-5">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">{t("avatar.heading")}</h2>
      <div
        className={`flex items-center gap-5 rounded-lg border border-dashed p-4 transition-colors ${dragging ? "border-accent bg-accent/5" : "border-transparent"}`}
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => { event.preventDefault(); setDragging(false); openFile(event.dataTransfer.files?.[0]); }}
      >
        <div className="relative">
          {pictureUrl ? (
            <img alt={t("avatar.alt")} className="h-20 w-20 rounded-full border border-line object-cover" src={buildApiUrl(pictureUrl)} />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-line bg-white/[0.06]">
              <User className="text-slate-400" size={32} />
            </div>
          )}
        </div>
        <div className="space-y-2">
          <button
            className="inline-flex items-center gap-2 rounded-md border border-line bg-white/5 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-accent hover:text-accent disabled:opacity-50"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            type="button"
          >
            <Camera size={15} /> {uploading ? t("avatar.uploading") : t("avatar.change")}
          </button>
          <p className="text-xs text-slate-500">{t("avatar.hint")}</p>
        </div>
        <input
          accept="image/*"
          className="hidden"
          onChange={(event) => { openFile(event.target.files?.[0]); event.target.value = ""; }}
          ref={fileRef}
          type="file"
        />
      </div>

      {cropSrc ? (
        <AvatarCropModal imageSrc={cropSrc} onCancel={() => setCropSrc(null)} onCropped={handleCropped} />
      ) : null}
    </section>
  );
}

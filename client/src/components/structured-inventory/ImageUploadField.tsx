import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { buildApiUrl } from "../../services/http";
import { uploadImageRequest } from "../../services/upload.service";

export function ImageUploadField({
  decodeQr = false,
  label,
  onChange,
  onDecodedText,
  previewAlt,
  previewClassName = "object-contain",
  value,
}: {
  decodeQr?: boolean;
  label: string;
  onChange: (value: string) => void;
  onDecodedText?: (value: string) => void;
  previewAlt: string;
  previewClassName?: string;
  value?: string | null;
}) {
  const { t } = useTranslation("inventory");
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);

  async function upload(file?: File) {
    if (!file) return;
    setIsUploading(true);
    setStatusMessage(null);
    try {
      const qrText = decodeQr ? await decodeQrImage(file) : null;
      const result = await uploadImageRequest(file);
      onChange(result.upload.url);
      if (decodeQr && onDecodedText) {
        if (qrText) {
          onDecodedText(qrText);
          setStatusMessage({ text: t("imageUpload.qrLinked"), isError: false });
        } else {
          // Do not clear the existing qrCodeId — the image uploaded fine but was unreadable.
          setStatusMessage({ text: t("imageUpload.qrUnreadable"), isError: false });
        }
      }
    } catch (err) {
      setStatusMessage({
        text: err instanceof Error ? err.message : t("imageUpload.uploadFailed"),
        isError: true,
      });
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div>
      <label className="block">
        <span className="mb-2 block text-xs font-medium uppercase text-slate-400">{label}</span>
        <input
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="w-full rounded-md border border-line bg-slate-950/70 px-3 py-2 text-sm text-white"
          disabled={isUploading}
          onChange={(event) => void upload(event.target.files?.[0])}
          type="file"
        />
      </label>
      {isUploading ? <p className="mt-2 text-sm text-slate-400">{t("imageUpload.uploading")}</p> : null}
      {statusMessage ? (
        <p className={`mt-2 text-xs ${statusMessage.isError ? "text-red-300" : "text-slate-400"}`}>
          {statusMessage.text}
        </p>
      ) : null}
      {value ? (
        <div className="mt-3">
          <img alt={previewAlt} className={`mt-2 h-48 w-full rounded-md border border-line bg-slate-100 object-contain p-2 ${previewClassName}`} src={buildApiUrl(value)} />
          <button
            className="mt-2 inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-400/30 bg-red-500/10 text-red-100"
            onClick={() => {
              if (!window.confirm(t("imageUpload.confirmRemove"))) return;
              onChange("");
              onDecodedText?.("");
            }}
            title={t("imageUpload.removeImage")}
            type="button"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ) : null}
    </div>
  );
}

async function decodeQrImage(file: File) {
  try {
    const { BrowserQRCodeReader } = await import("@zxing/browser");
    const reader = new BrowserQRCodeReader();
    const objectUrl = URL.createObjectURL(file);
    try {
      return (await reader.decodeFromImageUrl(objectUrl)).getText().trim() || null;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    return null;
  }
}

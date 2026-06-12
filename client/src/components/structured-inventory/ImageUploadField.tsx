import { useState } from "react";
import { Trash2 } from "lucide-react";
import { uploadImageRequest } from "../../services/upload.service";

export function ImageUploadField({
  label,
  onChange,
  previewAlt,
  previewClassName = "object-contain",
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  previewAlt: string;
  previewClassName?: string;
  value?: string | null;
}) {
  const [isUploading, setIsUploading] = useState(false);

  async function upload(file?: File) {
    if (!file) return;
    setIsUploading(true);
    try {
      const result = await uploadImageRequest(file);
      onChange(result.upload.url);
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
      {isUploading ? <p className="mt-2 text-sm text-slate-400">Uploading...</p> : null}
      {value ? (
        <div className="mt-3">
          <img alt={previewAlt} className={`h-36 rounded-md border border-line bg-white p-2 ${previewClassName}`} src={value} />
          <button className="mt-2 inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-400/30 bg-red-500/10 text-red-100" onClick={() => window.confirm("Remove this image?") && onChange("")} title="Remove image" type="button">
            <Trash2 size={14} />
          </button>
        </div>
      ) : null}
    </div>
  );
}

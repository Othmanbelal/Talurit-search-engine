import { apiRequest } from "./http";

export function uploadImageRequest(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  return apiRequest<{ upload: { url: string } }>("/api/uploads/images", {
    method: "POST",
    body: formData,
  });
}

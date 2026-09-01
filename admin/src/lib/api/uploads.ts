import { API_BASE_URL } from "./client";

export interface UploadResult {
  id: string;
  url: string;
  filename: string;
  size: number;
}

export const uploadsApi = {
  async image(file: File): Promise<UploadResult> {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_BASE_URL}/uploads`, {
      method: "POST",
      body: form,
      credentials: "include",
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.message || "Upload failed");
    return data as UploadResult;
  },
};

import type { Video } from "./types";

async function unwrap<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    if (typeof body?.error === "string") {
      throw new Error(body.error);
    }
    const fieldError = Object.values(body?.error?.fieldErrors ?? {}).flat()[0];
    throw new Error(fieldError ?? body?.error?.formErrors?.[0] ?? `Request failed (${res.status})`);
  }
  return res.json();
}

export async function fetchAdminVideos(): Promise<Video[]> {
  return unwrap(await fetch("/api/v1/videos?admin=true"));
}

export async function fetchVideos(): Promise<Video[]> {
  return unwrap(await fetch("/api/v1/videos"));
}

export async function fetchVideo(id: string): Promise<Video> {
  return unwrap(await fetch(`/api/v1/videos/${id}`));
}

export async function createVideo(formData: FormData): Promise<Video> {
  return unwrap(await fetch("/api/v1/videos", { method: "POST", body: formData }));
}

export type VideoUpdateInput = {
  title: string;
  description: string;
  categoryId?: string;
  youtubeUrl?: string;
  isPublished: boolean;
  isFeatured: boolean;
};

export async function updateVideo(id: string, input: VideoUpdateInput): Promise<Video> {
  return unwrap(
    await fetch(`/api/v1/videos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
}

export async function deleteVideo(id: string): Promise<void> {
  await unwrap(await fetch(`/api/v1/videos/${id}`, { method: "DELETE" }));
}

export async function fetchVideoStreamUrl(id: string): Promise<{ url: string; expiresAt: string }> {
  return unwrap(await fetch(`/api/v1/videos/${id}/stream`));
}

export async function replaceVideoThumbnail(id: string, file: File): Promise<Video> {
  const formData = new FormData();
  formData.set("thumbnail", file);
  return unwrap(await fetch(`/api/v1/videos/${id}/thumbnail`, { method: "POST", body: formData }));
}

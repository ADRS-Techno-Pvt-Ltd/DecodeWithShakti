import type { Banner } from "./types";

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

/** Published banners in display order — used by the public landing page carousel. */
export async function fetchPublishedBanners(): Promise<Banner[]> {
  return unwrap(await fetch("/api/v1/banners"));
}

/** Every banner (admin only). */
export async function fetchAllBanners(): Promise<Banner[]> {
  return unwrap(await fetch("/api/v1/banners?admin=true"));
}

export async function createBanner(formData: FormData): Promise<Banner> {
  return unwrap(await fetch("/api/v1/banners", { method: "POST", body: formData }));
}

export type BannerUpdateInput = {
  linkUrl?: string;
  altText?: string;
  isPublished?: boolean;
  sortOrder?: number;
};

export async function updateBanner(id: string, input: BannerUpdateInput): Promise<Banner> {
  return unwrap(
    await fetch(`/api/v1/banners/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
}

export async function deleteBanner(id: string): Promise<void> {
  await unwrap(await fetch(`/api/v1/banners/${id}`, { method: "DELETE" }));
}

export async function replaceBannerImage(id: string, file: File): Promise<Banner> {
  const formData = new FormData();
  formData.set("image", file);
  return unwrap(await fetch(`/api/v1/banners/${id}/image`, { method: "POST", body: formData }));
}

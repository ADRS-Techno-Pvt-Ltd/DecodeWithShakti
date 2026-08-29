export type User = {
  id: string;
  name: string;
  email: string;
  caRegistrationNumber: string | null;
  phone: string | null;
  role: string;
  createdAt: string;
  _count: {
    purchases: number;
  };
};

export async function fetchAllUsers(): Promise<User[]> {
  const res = await fetch("/api/v1/users");
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json();
}

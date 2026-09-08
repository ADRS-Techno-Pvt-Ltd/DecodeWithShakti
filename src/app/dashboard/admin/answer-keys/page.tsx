import { redirect } from "next/navigation";

export default async function AdminAnswerKeysPage() {
  redirect("/dashboard/admin/question-banks");
}
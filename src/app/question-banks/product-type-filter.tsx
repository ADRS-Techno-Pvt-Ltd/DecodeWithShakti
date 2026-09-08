"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "all";

const OPTIONS = [
  { value: ALL, label: "All products" },
  { value: "question_bank", label: "Question banks" },
  { value: "test_series", label: "Test series" },
] as const;

export function ProductTypeFilter({ value }: { value: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(next: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (!next || next === ALL) {
      params.delete("type");
    } else {
      params.set("type", next);
    }
    const qs = params.toString();
    router.push(qs ? `/question-banks?${qs}` : "/question-banks");
  }

  return (
    <Select value={value || ALL} onValueChange={handleChange}>
      <SelectTrigger className="w-56">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

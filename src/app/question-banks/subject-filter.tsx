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

export function SubjectFilter({
  subjects,
  value,
  disabled,
}: {
  subjects: { slug: string; name: string }[];
  value: string;
  disabled: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(next: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (!next || next === ALL) {
      params.delete("subject");
    } else {
      params.set("subject", next);
    }
    const qs = params.toString();
    router.push(qs ? `/question-banks?${qs}` : "/question-banks");
  }

  return (
    <Select value={value || ALL} onValueChange={handleChange} disabled={disabled}>
      <SelectTrigger className="w-56">
        <SelectValue
          className="capitalize"
          placeholder={disabled ? "Select a category first" : "All subjects"}
        />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>All subjects</SelectItem>
        {subjects.map((s) => (
          <SelectItem key={s.slug} value={s.slug} className="capitalize">
            {s.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

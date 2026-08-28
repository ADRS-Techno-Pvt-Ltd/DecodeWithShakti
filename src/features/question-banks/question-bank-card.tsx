"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { BookOpen, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function formatRupees(paise: number): string {
  return `₹${(paise / 100).toFixed(0)}`;
}

export function QuestionBankCard({
  slug,
  title,
  description,
  categoryName,
  price,
  effectivePrice,
  previewEnabled,
  thumbnailUrl,
}: {
  slug: string;
  title: string;
  description: string;
  categoryName: string;
  price: number;
  effectivePrice: number;
  previewEnabled: boolean;
  thumbnailUrl: string | null;
}) {
  const hasEarlyBird = effectivePrice < price;
  const href = `/question-banks/${slug}`;

  return (
    <Link href={href} className="block h-full">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        whileHover={{ y: -5 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="h-full"
      >
        <Card className="h-full transition-shadow hover:shadow-md">
          <CardContent className="p-5">
            <div className="mb-3 flex aspect-video items-center justify-center overflow-hidden rounded-[10px] bg-muted text-primary">
              {thumbnailUrl ? (
                <img src={thumbnailUrl} alt="" className="h-full w-full object-contain" />
              ) : (
                <BookOpen className="h-6 w-6" strokeWidth={1.5} />
              )}
            </div>
            <Badge variant="secondary">{categoryName}</Badge>
            <h3 className="font-heading mt-2.5 font-semibold">{title}</h3>
            <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{description}</p>
            <div className="mt-3 flex items-baseline gap-2">
              {hasEarlyBird && (
                <span className="text-sm text-muted-foreground line-through">
                  {formatRupees(price)}
                </span>
              )}
              <span className="font-mono text-lg font-semibold">
                {formatRupees(effectivePrice)}
              </span>
            </div>
            {previewEnabled ? (
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-sm">
                <Eye className="h-3.5 w-3.5" />
                Preview
              </div>
            ) : hasEarlyBird ? (
              <Badge className="mt-3 border-gold/40 bg-gold-pale text-gold-ink">Early bird</Badge>
            ) : null}
          </CardContent>
        </Card>
      </motion.div>
    </Link>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { toast } from "sonner";
import { BookOpen, Eye, ShoppingCart, Check, Download, FileCheck2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/stores/cart-store";
import type { ProductType } from "./types";
import type { PurchasedDownload } from "./purchased-downloads";

function formatRupees(paise: number): string {
  return `₹${(paise / 100).toFixed(0)}`;
}

export function QuestionBankCard({
  id,
  slug,
  title,
  description,
  categoryName,
  subjectName,
  price,
  effectivePrice,
  previewEnabled,
  thumbnailUrl,
  type,
  purchasedDownloads,
}: {
  id: string;
  slug: string;
  title: string;
  description: string;
  categoryName: string;
  subjectName: string | null;
  price: number;
  effectivePrice: number;
  previewEnabled: boolean;
  thumbnailUrl: string | null;
  type: ProductType;
  /** Set only when the signed-in student owns this product; replaces "Add to cart". */
  purchasedDownloads?: PurchasedDownload[];
}) {
  const hasEarlyBird = effectivePrice < price;
  const href = `/question-banks/${slug}`;
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const inCart = useCartStore((s) => s.has(id));

  function addToCart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    addItem({ questionBankId: id, title, price: effectivePrice, thumbnailPath: thumbnailUrl, type });
    toast.success("Added to cart.", {
      action: { label: "View cart", onClick: () => router.push("/cart") },
    });
  }

  // The card is one big <Link>, so downloads are click handlers, not nested anchors.
  function download(e: React.MouseEvent, url: string) {
    e.preventDefault();
    e.stopPropagation();
    window.location.href = url;
  }

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
          <CardContent className="flex flex-1 flex-col p-5">
            <div className="mb-3 flex aspect-video items-center justify-center overflow-hidden rounded-[10px] bg-muted text-primary">
              {thumbnailUrl ? (
                <img src={thumbnailUrl} alt="" className="h-full w-full object-contain" />
              ) : (
                <BookOpen className="h-6 w-6" strokeWidth={1.5} />
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="secondary">
                {type === "TEST_SERIES" ? "Test Series" : type === "MENTORSHIP" ? "Mentorship" : "Question Bank"}
              </Badge>
              <Badge variant="outline">{categoryName}</Badge>
              {subjectName && <Badge variant="outline">{subjectName}</Badge>}
            </div>
            <h3 className="font-heading mt-2.5 font-semibold">{title}</h3>
            <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{description}</p>
            {/* Price row + action sit in a bottom-pinned group so every card in a row lines up. */}
            <div className="mt-auto pt-3">
            <div className="flex min-h-8 items-center justify-between gap-2">
              <div className="flex items-baseline gap-2">
                {hasEarlyBird && (
                  <span className="text-sm text-muted-foreground line-through">
                    {formatRupees(price)}
                  </span>
                )}
                <span className="font-mono text-lg font-semibold">
                  {effectivePrice === 0 ? "Free" : formatRupees(effectivePrice)}
                </span>
              </div>
              {previewEnabled ? (
                <div className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1 text-xs font-medium shadow-sm">
                  <Eye className="h-3.5 w-3.5" />
                  Preview
                </div>
              ) : hasEarlyBird ? (
                <Badge className="border-gold/40 bg-gold-pale text-gold-ink">Early bird</Badge>
              ) : null}
            </div>
            {purchasedDownloads ? (
              <div className="mt-2.5 flex flex-wrap gap-2">
                <Badge className="border-success/40 bg-success/10 text-success">Purchased</Badge>
                {purchasedDownloads.map((d) => (
                  <Button
                    key={d.href}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => download(e, d.href)}
                    className="gap-1.5"
                  >
                    {d.kind === "answer-key" ? (
                      <FileCheck2 className="h-3.5 w-3.5" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    {d.label}
                  </Button>
                ))}
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addToCart}
                className="mt-2.5 w-full gap-1.5"
              >
                {inCart ? <Check className="h-3.5 w-3.5" /> : <ShoppingCart className="h-3.5 w-3.5" />}
                {inCart ? "In cart" : "Add to cart"}
              </Button>
            )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </Link>
  );
}

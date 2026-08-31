"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Video as VideoIcon, Play } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Video } from "./types";

export function VideoCard({ video }: { video: Video }) {
  return (
    <Link href={`/dashboard/student/videos/${video.id}`} className="block h-full">
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
            <div className="relative mb-3 flex aspect-video items-center justify-center overflow-hidden rounded-[10px] bg-muted text-primary">
              {video.thumbnailUrl ? (
                <img src={video.thumbnailUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <VideoIcon className="h-6 w-6" strokeWidth={1.5} />
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity hover:opacity-100">
                <div className="flex size-11 items-center justify-center rounded-full bg-white/90">
                  <Play className="h-5 w-5 fill-current text-black" />
                </div>
              </div>
            </div>
            {video.category && <Badge variant="secondary">{video.category.name}</Badge>}
            <h3 className="font-heading mt-2.5 font-semibold">{video.title}</h3>
            <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{video.description}</p>
          </CardContent>
        </Card>
      </motion.div>
    </Link>
  );
}

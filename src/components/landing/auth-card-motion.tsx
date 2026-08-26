"use client";

import { motion } from "motion/react";

/** Fades an auth card up into place on mount. */
export function AuthCardMotion({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      className="w-full max-w-xl"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

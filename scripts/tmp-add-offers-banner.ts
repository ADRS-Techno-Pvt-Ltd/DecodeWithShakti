import "dotenv/config";
import { readFile } from "node:fs/promises";
import { prisma } from "@/lib/prisma";
import { saveBannerImageFile } from "@/lib/storage";

async function main() {
  const bytes = await readFile("marketing-assets/homepage-offers-banner.png");

  const sortOrder =
    ((await prisma.banner.aggregate({ _max: { sortOrder: true } }))._max.sortOrder ?? -1) + 1;

  const banner = await prisma.banner.create({
    data: {
      imagePath: "",
      linkUrl: "/#offers",
      altText: "Test series, decode sheets and CA Final mentorship — priced separately, starting at ₹139",
      isPublished: true,
      sortOrder,
    },
  });

  const imagePath = await saveBannerImageFile(banner.id, bytes);
  const updated = await prisma.banner.update({ where: { id: banner.id }, data: { imagePath } });

  console.log("Created banner:", updated);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

import Link from "next/link";

const ASSETS = {
  lockup: { src: "/logo.png", width: 1000, height: 298 },
  mark: { src: "/logo-mark.png", width: 512, height: 510 },
} as const;

type BrandLogoProps = {
  /** Where the logo links to. Pass `null` to render a plain, non-linking image. */
  href?: string | null;
  /** `lockup` = full "Decode with Shakti" wordmark, `mark` = the DS icon only. */
  variant?: keyof typeof ASSETS;
  /** Classes for the wrapping element (link or span). */
  className?: string;
  /** Classes for the `<img>` — set the height here, width stays auto. */
  imgClassName?: string;
};

/**
 * Official "Decode with Shakti" logo (see `Logo/`). Use this instead of
 * hand-rolling the "D" badge + text lockup so the brand stays consistent
 * across the header, footer, auth, and dashboard.
 */
export function BrandLogo({
  href = "/",
  variant = "lockup",
  className = "",
  imgClassName = "h-8 w-auto",
}: BrandLogoProps) {
  const asset = ASSETS[variant];
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={asset.src}
      width={asset.width}
      height={asset.height}
      alt="Decode with Shakti"
      className={imgClassName}
    />
  );

  if (href === null) {
    return <span className={`inline-flex items-center ${className}`}>{img}</span>;
  }
  return (
    <Link
      href={href}
      aria-label="Decode with Shakti"
      className={`inline-flex items-center ${className}`}
    >
      {img}
    </Link>
  );
}

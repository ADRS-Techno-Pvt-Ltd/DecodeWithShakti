import Link from "next/link";
import { LegalLayout, LegalSection } from "@/components/landing/legal-layout";

export const metadata = {
  title: "Terms & Conditions — Decode with Shakti",
};

export default function TermsPage() {
  return (
    <LegalLayout title="Terms &amp; Conditions" updated="26 August 2026">
      <LegalSection heading="1. Acceptance of these terms">
        <p>
          These Terms &amp; Conditions govern your use of Decode with Shakti (&ldquo;the
          Platform&rdquo;), operated for CA Shakti Tiwari, and your purchase of downloadable
          question banks made available on it. By creating an account, browsing the catalog, or
          completing a purchase, you agree to be bound by these terms. If you do not agree, please
          do not use the Platform.
        </p>
      </LegalSection>

      <LegalSection heading="2. Who can use the Platform">
        <p>
          The Platform is intended for students preparing for CA Inter and Final
          exams, and for anyone else who finds our question banks useful. You must provide
          accurate information when registering and are responsible for keeping your login
          credentials confidential and for all activity under your account.
        </p>
      </LegalSection>

      <LegalSection heading="3. What you are buying">
        <p>
          Each question bank is a downloadable PDF file. Purchasing a question bank grants you a
          personal, non-exclusive, non-transferable license to download and use that file for your
          own exam preparation. It does not transfer any copyright or ownership in the content to
          you.
        </p>
        <p>
          A limited free preview (where enabled by the admin) is provided before purchase so you
          can judge the content and difficulty. The full file unlocks only after a successful
          purchase.
        </p>
      </LegalSection>

      <LegalSection heading="4. Pricing, early-bird offers, and coupons">
        <p>
          Prices are shown in Indian Rupees and may include a limited-time early-bird discount
          with a visible deadline — the price shown and charged at checkout is always the price in
          effect at the moment you complete payment. Coupon codes, where available, are subject to
          their own expiry date and usage limit and may be withdrawn or exhausted at any time
          without notice.
        </p>
      </LegalSection>

      <LegalSection heading="5. Payment">
        <p>
          Payments are processed through the Platform&apos;s payment provider. We do not store
          your card, UPI, or net-banking credentials. A purchase is confirmed, and your download
          unlocked, only once payment is successfully verified.
        </p>
      </LegalSection>

      <LegalSection heading="6. Refunds">
        <p>
          Because every question bank offers a free preview before purchase, and the full file is
          delivered digitally and instantly on payment, purchases are <strong>final and
          non-refundable</strong> once the download has been unlocked, except where a bank was
          materially misdescribed or the delivered file is genuinely defective — in either case,
          contact us and we will review the issue in good faith.
        </p>
      </LegalSection>

      <LegalSection heading="7. Watermarking and permitted use">
        <p>
          Every file you download is stamped with your registered email address on every page.
          This copy is licensed to you alone. You may not share, resell, redistribute, upload to
          public forums, or otherwise make your downloaded files available to anyone else. We may
          suspend or terminate accounts found to be in breach of this clause.
        </p>
      </LegalSection>

      <LegalSection heading="8. Intellectual property">
        <p>
          All question bank content, branding, and the Platform itself are the property of CA
          Shakti Tiwari and are protected by applicable copyright and
          intellectual property law. Nothing in these terms grants you rights beyond the personal
          license described in Section 3.
        </p>
      </LegalSection>

      <LegalSection heading="9. Account termination and deletion">
        <p>
          You may delete your own account at any time from{" "}
          <Link href="/dashboard/student/settings" className="font-semibold text-primary hover:underline">
            Account Settings
          </Link>
          . We may also suspend or terminate an account that violates these terms, in particular
          Section 7. Purchase and invoice records tied to a deleted account are retained in
          anonymized form as described in our{" "}
          <Link href="/privacy" className="font-semibold text-primary hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection heading="10. Limitation of liability">
        <p>
          The Platform and its content are provided &ldquo;as is&rdquo; for exam preparation
          purposes. While we take care to keep question banks accurate and relevant, we do not
          guarantee any particular exam outcome and are not liable for indirect or consequential
          losses arising from use of the Platform.
        </p>
      </LegalSection>

      <LegalSection heading="11. Changes to these terms">
        <p>
          We may update these terms from time to time to reflect changes to the Platform or
          applicable law. The &ldquo;Last updated&rdquo; date above reflects the most recent
          revision. Continued use of the Platform after a change constitutes acceptance of the
          updated terms.
        </p>
      </LegalSection>

      <LegalSection heading="12. Governing law">
        <p>
          These terms are governed by the laws of India, and any disputes will be subject to the
          jurisdiction of the courts of Madhya Pradesh, India.
        </p>
      </LegalSection>

      <LegalSection heading="13. Contact">
        <p>
          Questions about these terms can be sent to the support email listed in your invoice or
          account confirmation email.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}

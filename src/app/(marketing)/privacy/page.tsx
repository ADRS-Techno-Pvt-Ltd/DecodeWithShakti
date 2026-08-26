import Link from "next/link";
import { LegalLayout, LegalSection } from "@/components/landing/legal-layout";

export const metadata = {
  title: "Privacy Policy — Decode with Shakti",
};

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" updated="26 August 2026">
      <LegalSection heading="1. What this policy covers">
        <p>
          This policy explains what personal data Decode with Shakti collects when you register,
          browse, and purchase question banks, how we use it, and the choices you have — including
          how to delete your account.
        </p>
      </LegalSection>

      <LegalSection heading="2. Information we collect">
        <p>We collect the minimum needed to run the Platform:</p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li><strong>Account data</strong> — your name and email address, and a securely hashed copy of your password (we never store your raw password).</li>
          <li><strong>Purchase data</strong> — which question banks you bought, the price paid, any coupon applied, and payment/order status.</li>
          <li><strong>Files &amp; invoices</strong> — the question banks you&apos;ve purchased and the invoices generated for each order.</li>
          <li><strong>Support data</strong> — anything you send us directly, e.g. a password-reset request or a support email.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="3. How we use your information">
        <ul className="ml-5 list-disc space-y-1.5">
          <li>To create and secure your account, and to keep you signed in (via an encrypted session token).</li>
          <li>To process your purchases and generate invoices.</li>
          <li>
            To watermark your downloaded files with your registered email — this identifies your
            copy as yours and discourages unauthorized sharing.
          </li>
          <li>To send transactional emails, such as password-reset links.</li>
          <li>To show your purchase history and downloads on your student dashboard.</li>
        </ul>
        <p>We do not use your data for advertising, and we do not sell your personal data to anyone.</p>
      </LegalSection>

      <LegalSection heading="4. Cookies and sessions">
        <p>
          We use a single essential cookie to keep you signed in (an encrypted session token). We
          do not currently use third-party analytics or advertising trackers.
        </p>
      </LegalSection>

      <LegalSection heading="5. Who we share data with">
        <p>
          We share the minimum necessary data with the services that keep the Platform running:
          our payment provider (to process your purchase) and our email delivery provider (to send
          password-reset and account emails). We do not share your data with anyone else, and
          never for marketing purposes.
        </p>
      </LegalSection>

      <LegalSection heading="6. How long we keep your data">
        <p>
          We keep your account data for as long as your account is active. Purchase and invoice
          records are retained even after account deletion, in an anonymized form, because Indian
          tax and accounting rules require us to keep a record of completed transactions — see
          Section 7 for exactly what &ldquo;anonymized&rdquo; means in practice.
        </p>
      </LegalSection>

      <LegalSection heading="7. Deleting your account">
        <p>
          You can permanently delete your account at any time from{" "}
          <Link href="/dashboard/student/settings" className="font-semibold text-primary hover:underline">
            Account Settings
          </Link>{" "}
          — this immediately removes your name, email, and login credentials and signs you out.
        </p>
        <p>
          If you have no completed purchases, your account is deleted outright. If you have
          purchase history, your personal details are scrubbed and replaced with an anonymized
          placeholder, while the underlying purchase/invoice records are kept — unattached to any
          identifiable profile — solely to satisfy our financial record-keeping obligations. Once
          deleted, your account and downloads cannot be recovered, so download anything you need
          first.
        </p>
      </LegalSection>

      <LegalSection heading="8. Security">
        <p>
          Passwords are hashed (never stored in plain text). Your purchased files and invoices are
          only ever served through authenticated routes that verify you own the purchase — they
          are never publicly accessible.
        </p>
      </LegalSection>

      <LegalSection heading="9. Your rights">
        <p>
          You can review the personal data we hold about you from your dashboard, and you can
          delete your account at any time as described in Section 7. For any other request about
          your data, contact us using the details below.
        </p>
      </LegalSection>

      <LegalSection heading="10. Children&apos;s privacy">
        <p>
          The Platform is intended for exam aspirants and is not directed at children under 13. We
          do not knowingly collect personal data from children under 13.
        </p>
      </LegalSection>

      <LegalSection heading="11. Changes to this policy">
        <p>
          We may update this policy as the Platform evolves. The &ldquo;Last updated&rdquo; date
          above reflects the most recent revision.
        </p>
      </LegalSection>

      <LegalSection heading="12. Contact">
        <p>
          Questions about this policy or your data can be sent to the support email listed in your
          invoice or account confirmation email.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}

import React from 'react';
import { Box, Container, Link, Paper, Typography } from '@mui/material';
import { GLASS } from '../theme/glassTokens';

/**
 * Public privacy policy page served at both `/privacy` (canonical URL we
 * submit to Meta App Review) and `/privacy-policy` (legacy alias). All
 * copy is in English because this is the URL we share with Meta reviewers.
 */
const PrivacyPolicy: React.FC = () => {
  const lastUpdated = 'April 17, 2026';
  const contactEmail = 'marquessilva600@gmail.com';

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: 6 }}>
      <Container maxWidth="md">
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, md: 5 },
            background: GLASS.surface.bg,
            backdropFilter: `blur(${GLASS.surface.blur})`,
            border: `1px solid ${GLASS.border.outer}`,
            borderRadius: GLASS.radius.card,
            boxShadow: `${GLASS.shadow.card}, ${GLASS.shadow.cardInset}`,
          }}
        >
          <Typography variant="h4" component="h1" gutterBottom sx={{ color: GLASS.text.heading }}>
            Privacy Policy
          </Typography>
          <Typography variant="body2" sx={{ mb: 3, color: GLASS.text.muted }}>
            Last updated: {lastUpdated}
          </Typography>

          <Typography variant="body1" paragraph sx={{ color: GLASS.text.body }}>
            This Privacy Policy explains how Insyt (&ldquo;Insyt&rdquo;, &ldquo;we&rdquo;,
            &ldquo;our&rdquo;) collects, uses, stores and protects information when you use
            our content-scheduling platform for Instagram Business accounts. By using
            Insyt you agree to the practices described here.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ color: GLASS.text.heading }}>
            1. Who we are
          </Typography>
          <Typography variant="body1" paragraph sx={{ color: GLASS.text.body }}>
            Insyt is a software-as-a-service product that lets marketing agencies
            schedule, approve and publish posts and Reels to Instagram Business
            accounts they manage on behalf of their clients, and review
            engagement metrics returned by the Instagram Graph API.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ color: GLASS.text.heading }}>
            2. Information we collect
          </Typography>
          <Typography variant="body1" paragraph sx={{ color: GLASS.text.body }}>
            <strong>Account data</strong>: name, email address, organization name,
            subscription plan and role assigned inside the organization.
          </Typography>
          <Typography variant="body1" paragraph sx={{ color: GLASS.text.body }}>
            <strong>Instagram data (collected via Instagram Business Login)</strong>:
            Instagram account id, username, display name, account type, media
            count and profile picture. For each connected account we also store the
            long-lived access token we receive from Meta. With
            <em>instagram_business_manage_insights</em> we retrieve per-media metrics
            (reach, likes, comments, saves, total interactions) for the media the
            user decides to review inside the app. We do <strong>not</strong> request
            any permission that lets us read Direct Messages, comments authored by
            other users, or private information about followers.
          </Typography>
          <Typography variant="body1" paragraph sx={{ color: GLASS.text.body }}>
            <strong>Content you upload</strong>: images, videos, captions and schedule
            timestamps that you provide so we can publish them to the Instagram
            account you connected.
          </Typography>
          <Typography variant="body1" paragraph sx={{ color: GLASS.text.body }}>
            <strong>Operational data</strong>: minimal logs (timestamps, request ids,
            non-PII error traces) used to investigate failures and prevent abuse.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ color: GLASS.text.heading }}>
            3. How we use the information
          </Typography>
          <Typography variant="body1" paragraph sx={{ color: GLASS.text.body }}>
            We use the collected data to (a) authenticate you, (b) display the
            Instagram accounts you connected, (c) publish the content you scheduled
            to those accounts via the Instagram Graph API, (d) present engagement
            metrics you request, (e) provide support and keep the service secure,
            and (f) bill your subscription. We never sell personal data and we never
            use Instagram data for advertising targeting.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ color: GLASS.text.heading }}>
            4. Data sharing
          </Typography>
          <Typography variant="body1" paragraph sx={{ color: GLASS.text.body }}>
            We share data only with the infrastructure providers we need to run the
            product: our hosting provider (Vercel), our database and object-storage
            provider (Supabase), our automation runtime (n8n), our payment processor
            (Stripe) and Meta Platforms through the official Instagram Graph API.
            Each provider is bound by its own privacy commitments. We may also
            disclose data when required to comply with a lawful request.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ color: GLASS.text.heading }}>
            5. Retention
          </Typography>
          <Typography variant="body1" paragraph sx={{ color: GLASS.text.body }}>
            Account data is retained while your organization keeps an active Insyt
            account. Instagram tokens and metadata are retained while the connection
            remains active and are deleted on disconnect. Published-post records are
            retained for up to 24 months for historical reporting. Operational logs
            are retained for up to 90 days.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ color: GLASS.text.heading }}>
            6. Your choices and how to revoke access
          </Typography>
          <Typography variant="body1" paragraph sx={{ color: GLASS.text.body }}>
            You can disconnect an Instagram account at any time from inside Insyt,
            which deletes the access token and the Instagram metadata we stored for
            that client. You can also revoke Insyt&apos;s permission directly at
            {' '}
            <Link
              href="https://www.instagram.com/accounts/manage_access/"
              target="_blank"
              rel="noopener noreferrer"
              sx={{ color: GLASS.accent.orange }}
            >
              instagram.com → Apps and Websites
            </Link>
            . To request full account deletion, email us at{' '}
            <Link href={`mailto:${contactEmail}`} sx={{ color: GLASS.accent.orange }}>
              {contactEmail}
            </Link>{' '}
            or use our{' '}
            <Link href="/oauth/instagram/data-deletion" sx={{ color: GLASS.accent.orange }}>
              data-deletion endpoint
            </Link>
            . We honour the Meta-issued deauthorization and data-deletion callbacks,
            which wipe the associated tokens and Instagram records from our database.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ color: GLASS.text.heading }}>
            7. Security
          </Typography>
          <Typography variant="body1" paragraph sx={{ color: GLASS.text.body }}>
            We apply reasonable administrative and technical safeguards, including
            encryption in transit (HTTPS), encrypted backups, least-privilege access
            to production databases and scoped Instagram tokens. No method of
            transmission over the internet is 100% secure; we will notify affected
            users and regulators as required by law if a breach occurs.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ color: GLASS.text.heading }}>
            8. Children
          </Typography>
          <Typography variant="body1" paragraph sx={{ color: GLASS.text.body }}>
            Insyt is not directed at children under 13, and we do not knowingly
            collect personal data from children. If you believe a child provided us
            with personal data, please email{' '}
            <Link href={`mailto:${contactEmail}`} sx={{ color: GLASS.accent.orange }}>
              {contactEmail}
            </Link>{' '}
            and we will delete it.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ color: GLASS.text.heading }}>
            9. International transfers and legal basis
          </Typography>
          <Typography variant="body1" paragraph sx={{ color: GLASS.text.body }}>
            Data is processed in the regions operated by our hosting providers,
            which may be outside your country of residence. When GDPR or LGPD apply,
            our legal basis for processing is performance of the contract with you,
            our legitimate interests in operating the service, and your consent for
            optional processing.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ color: GLASS.text.heading }}>
            10. Changes to this policy
          </Typography>
          <Typography variant="body1" paragraph sx={{ color: GLASS.text.body }}>
            We may update this Privacy Policy from time to time. When we do, we will
            revise the &ldquo;Last updated&rdquo; date at the top of this page, and for
            material changes we will notify you inside the app.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ color: GLASS.text.heading }}>
            11. Contact
          </Typography>
          <Typography variant="body1" paragraph sx={{ color: GLASS.text.body }}>
            For privacy questions or to exercise your rights, contact{' '}
            <Link href={`mailto:${contactEmail}`} sx={{ color: GLASS.accent.orange }}>
              {contactEmail}
            </Link>
            .
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default PrivacyPolicy;

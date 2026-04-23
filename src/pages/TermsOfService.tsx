import React from 'react';
import { Box, Container, Link, Paper, Typography } from '@mui/material';
import { GLASS } from '../theme/glassTokens';

/**
 * Public terms-of-service page served at `/terms`. Shared with the Meta App
 * Review team as the canonical terms URL for the app.
 */
const TermsOfService: React.FC = () => {
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
            Terms of Service
          </Typography>
          <Typography variant="body2" sx={{ mb: 3, color: GLASS.text.muted }}>
            Last updated: {lastUpdated}
          </Typography>

          <Typography variant="body1" paragraph sx={{ color: GLASS.text.body }}>
            These Terms of Service (&ldquo;Terms&rdquo;) form a binding agreement between
            you or the entity you represent (&ldquo;you&rdquo;) and Insyt (&ldquo;Insyt&rdquo;,
            &ldquo;we&rdquo;, &ldquo;our&rdquo;) regarding access to and use of the Insyt
            platform. By creating an account or using the service you accept these Terms.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ color: GLASS.text.heading }}>
            1. The service
          </Typography>
          <Typography variant="body1" paragraph sx={{ color: GLASS.text.body }}>
            Insyt is a content-scheduling platform that lets marketing agencies
            schedule, approve and publish photos and Reels to Instagram Business
            accounts they manage, and read engagement metrics returned by the
            official Instagram Graph API. You are responsible for the content you
            upload and for the Instagram accounts you connect.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ color: GLASS.text.heading }}>
            2. Eligibility and accounts
          </Typography>
          <Typography variant="body1" paragraph sx={{ color: GLASS.text.body }}>
            You must be at least 18 years old and legally able to enter into a
            contract. You are responsible for keeping your credentials confidential
            and for all activity under your account. If you connect an Instagram
            account on behalf of a third party, you represent that you have the
            authority to do so.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ color: GLASS.text.heading }}>
            3. Acceptable use
          </Typography>
          <Typography variant="body1" paragraph sx={{ color: GLASS.text.body }}>
            You agree not to use Insyt to publish content that is unlawful, abusive,
            infringing, misleading or that violates Meta&apos;s policies, including
            the{' '}
            <Link
              href="https://help.instagram.com/581066165581870"
              target="_blank"
              rel="noopener noreferrer"
              sx={{ color: GLASS.accent.orange }}
            >
              Instagram Community Guidelines
            </Link>
            {' '}and the{' '}
            <Link
              href="https://developers.facebook.com/terms/"
              target="_blank"
              rel="noopener noreferrer"
              sx={{ color: GLASS.accent.orange }}
            >
              Meta Platform Terms
            </Link>
            . You agree not to attempt to circumvent rate limits, reverse engineer
            the service, or use it to harass other users.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ color: GLASS.text.heading }}>
            4. Instagram / Meta integration
          </Typography>
          <Typography variant="body1" paragraph sx={{ color: GLASS.text.body }}>
            When you connect an Instagram Business account using the Instagram
            Business Login, Meta issues us an access token with the scopes you
            approve in the consent dialog. We use that token only to deliver the
            features described in our Privacy Policy. Meta is not a party to this
            agreement, but your use of the Instagram integration is also subject to
            Meta&apos;s own terms and policies. You can revoke access at any time
            from inside Insyt or at{' '}
            <Link
              href="https://www.instagram.com/accounts/manage_access/"
              target="_blank"
              rel="noopener noreferrer"
              sx={{ color: GLASS.accent.orange }}
            >
              instagram.com → Apps and Websites
            </Link>
            .
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ color: GLASS.text.heading }}>
            5. Your content and intellectual property
          </Typography>
          <Typography variant="body1" paragraph sx={{ color: GLASS.text.body }}>
            You retain all rights to the content you upload. You grant Insyt a
            non-exclusive, worldwide, royalty-free license to host, store,
            reproduce, and transmit that content strictly for the purpose of
            providing the service (including publishing the content to the
            Instagram accounts you instruct us to publish to). Insyt and its
            trademarks, code and documentation remain our property.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ color: GLASS.text.heading }}>
            6. Subscriptions and payment
          </Typography>
          <Typography variant="body1" paragraph sx={{ color: GLASS.text.body }}>
            Paid plans are billed through Stripe. Subscriptions renew automatically
            until cancelled. Fees are non-refundable except where required by law or
            stated otherwise at checkout. We may change prices on future billing
            periods with reasonable prior notice.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ color: GLASS.text.heading }}>
            7. Termination
          </Typography>
          <Typography variant="body1" paragraph sx={{ color: GLASS.text.body }}>
            You may cancel your subscription and delete your account at any time.
            We may suspend or terminate access if you violate these Terms, if Meta
            revokes our app access, or for reasons of security or legal compliance.
            On termination, the obligations that by their nature should survive
            will survive (including Sections 5, 8, 9 and 10).
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ color: GLASS.text.heading }}>
            8. Disclaimers
          </Typography>
          <Typography variant="body1" paragraph sx={{ color: GLASS.text.body }}>
            The service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;,
            without warranties of any kind to the maximum extent permitted by law.
            We do not guarantee that publishing via third-party APIs will always
            succeed or that metrics returned by those APIs are complete or
            error-free.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ color: GLASS.text.heading }}>
            9. Limitation of liability
          </Typography>
          <Typography variant="body1" paragraph sx={{ color: GLASS.text.body }}>
            To the maximum extent permitted by law, Insyt&apos;s aggregate liability
            arising out of or related to these Terms will not exceed the amount you
            paid us in the twelve months preceding the event giving rise to the
            claim. In no event will we be liable for indirect, incidental or
            consequential damages.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ color: GLASS.text.heading }}>
            10. Governing law
          </Typography>
          <Typography variant="body1" paragraph sx={{ color: GLASS.text.body }}>
            These Terms are governed by the laws of the Federative Republic of
            Brazil. Any dispute arising out of the Terms will be submitted to the
            competent courts of São Paulo / SP, Brazil, unless an applicable
            consumer-protection law grants you a different jurisdiction.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ color: GLASS.text.heading }}>
            11. Changes to these Terms
          </Typography>
          <Typography variant="body1" paragraph sx={{ color: GLASS.text.body }}>
            We may update these Terms from time to time. Material changes will be
            notified inside the app or by email. Continued use of the service after
            the change date constitutes acceptance of the updated Terms.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ color: GLASS.text.heading }}>
            12. Contact
          </Typography>
          <Typography variant="body1" paragraph sx={{ color: GLASS.text.body }}>
            Questions about these Terms can be sent to{' '}
            <Link href={`mailto:${contactEmail}`} sx={{ color: GLASS.accent.orange }}>
              {contactEmail}
            </Link>
            .
          </Typography>

          <Typography variant="body2" sx={{ mt: 3, color: GLASS.text.muted }}>
            See also our{' '}
            <Link href="/privacy" sx={{ color: GLASS.accent.orange }}>
              Privacy Policy
            </Link>
            .
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default TermsOfService;

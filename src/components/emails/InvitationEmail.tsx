import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr,
  Preview,
} from '@react-email/components'

interface InvitationEmailProps {
  orgName: string
  inviterName: string
}

export function InvitationEmail({ orgName, inviterName }: InvitationEmailProps) {
  return (
    <Html lang="fr">
      <Head />
      <Preview>Vous êtes invité à rejoindre {orgName} sur CabinetPilot</Preview>
      <Body
        style={{
          backgroundColor: '#fafafa',
          fontFamily: "'DM Sans', system-ui, sans-serif",
          margin: 0,
        }}
      >
        <Container
          style={{
            maxWidth: '520px',
            margin: '40px auto',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e4e4e7',
            padding: '40px',
          }}
        >
          {/* Logo / Brand */}
          <Text
            style={{
              fontSize: '18px',
              fontWeight: 600,
              color: '#18181b',
              margin: '0 0 32px',
            }}
          >
            CabinetPilot
          </Text>

          {/* Heading */}
          <Text
            style={{
              fontSize: '22px',
              fontWeight: 600,
              color: '#18181b',
              margin: '0 0 16px',
            }}
          >
            Vous avez été invité à rejoindre {orgName}
          </Text>

          {/* Body copy */}
          <Text
            style={{
              fontSize: '16px',
              color: '#52525b',
              lineHeight: 1.5,
              margin: '0 0 24px',
            }}
          >
            {inviterName} vous invite à rejoindre {orgName} sur CabinetPilot — la plateforme
            de suivi des missions juridiques pour les cabinets comptables.
          </Text>

          {/* CTA Button */}
          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Button
              style={{
                backgroundColor: '#4f46e5',
                color: '#ffffff',
                borderRadius: '8px',
                padding: '14px 28px',
                fontSize: '16px',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              Rejoindre {orgName}
            </Button>
          </Section>

          {/* Expiry notice */}
          <Text
            style={{
              fontSize: '14px',
              color: '#71717a',
              margin: '0 0 8px',
            }}
          >
            Ce lien expirera dans 24 heures. Si vous n&apos;avez pas demandé cette invitation,
            vous pouvez ignorer cet e-mail.
          </Text>

          <Hr style={{ borderColor: '#e4e4e7', margin: '24px 0' }} />

          {/* Footer */}
          <Text style={{ fontSize: '12px', color: '#a1a1aa', margin: 0 }}>
            CabinetPilot · Pilotez vos missions juridiques en un coup d&apos;œil
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

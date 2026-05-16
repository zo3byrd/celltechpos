import { Link } from 'react-router-dom';

const NAVY = '#0f172a';
const TEAL = '#0d9488';

export default function PrivacyPolicy() {
  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: NAVY, minHeight: '100vh', color: '#e2e8f0' }}>
      {/* Nav */}
      <nav style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0 24px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 58 }}>
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 0 }}>
            <span style={{ fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>CELL</span>
            <span style={{ fontSize: 18, fontWeight: 900, color: '#2dd4bf', letterSpacing: '-0.5px' }}>TECH</span>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#38bdf8', marginLeft: 4, letterSpacing: '2px' }}>POS</span>
          </Link>
          <Link to="/" style={{ fontSize: 13, color: '#64748b', textDecoration: 'none' }}>← Back to Home</Link>
        </div>
      </nav>

      {/* Content */}
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '56px 24px 80px' }}>
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: 36, fontWeight: 900, color: '#fff', margin: '0 0 12px', letterSpacing: '-0.5px' }}>Privacy Policy</h1>
          <p style={{ color: '#64748b', fontSize: 14 }}>Last updated: May 15, 2026 · PC World Exchange LLC</p>
        </div>

        <div style={{ lineHeight: 1.8, color: '#cbd5e1', fontSize: 15 }}>

          <Section title="1. Introduction">
            PC World Exchange LLC ("we," "us," or "our") operates CellTechPOS, a point-of-sale and business management platform for cell phone repair shops and wireless retail stores, accessible at <a href="https://celltechpos.com" style={{ color: TEAL }}>celltechpos.com</a> (the "Service"). This Privacy Policy explains how we collect, use, disclose, and protect information when you use our Service.
          </Section>

          <Section title="2. Information We Collect">
            <Strong>Information you provide directly:</Strong>
            <List items={[
              'Business name, address, phone number, and email address',
              'Account credentials (email and password)',
              'Billing and payment information processed securely through Stripe',
              'Customer data you enter into the platform (names, phone numbers, repair history)',
            ]} />
            <Strong>Information collected automatically:</Strong>
            <List items={[
              'IP address, browser type, and device information',
              'Pages visited and features used within the platform',
              'Log data and usage analytics to improve the Service',
            ]} />
          </Section>

          <Section title="3. How We Use Your Information">
            We use the information we collect to:
            <List items={[
              'Provide, maintain, and improve the CellTechPOS platform',
              'Process payments and manage your subscription',
              'Send transactional SMS and email messages on your behalf to your customers (repair updates, appointment reminders, notifications)',
              'Respond to your support requests and communications',
              'Send you administrative and service-related notifications',
              'Comply with legal obligations',
            ]} />
          </Section>

          <Section title="4. SMS Messaging">
            CellTechPOS enables stores to send SMS messages to their customers. By using our messaging features:
            <List items={[
              'You agree to obtain proper consent from your customers before sending them SMS messages',
              'You are responsible for providing opt-out instructions (reply STOP) in every message',
              'SMS messages are delivered via Twilio and subject to their terms of service',
              'Message and data rates may apply to your customers',
              'We do not share customer phone numbers with third parties for marketing purposes',
            ]} />
          </Section>

          <Section title="5. Data Sharing and Disclosure">
            We do not sell your personal information. We may share information with:
            <List items={[
              'Service providers: Stripe (payments), Twilio (SMS), and hosting providers who assist in operating our platform under confidentiality agreements',
              'Legal requirements: When required by law, court order, or to protect our rights',
              'Business transfers: In connection with a merger, acquisition, or sale of assets',
            ]} />
          </Section>

          <Section title="6. Data Retention">
            We retain your account data for as long as your subscription is active. Customer data entered into the platform is retained for the duration of your account and for up to 90 days after account termination, after which it is permanently deleted unless a longer retention period is required by law.
          </Section>

          <Section title="7. Data Security">
            We implement industry-standard security measures including encrypted data transmission (HTTPS/TLS), secure password hashing, and access controls. However, no method of transmission over the internet is 100% secure and we cannot guarantee absolute security.
          </Section>

          <Section title="8. Your Rights">
            You have the right to:
            <List items={[
              'Access the personal information we hold about your business',
              'Request correction of inaccurate information',
              'Request deletion of your account and associated data',
              'Opt out of non-essential communications',
            ]} />
            To exercise these rights, contact us at <a href="mailto:support@celltechpos.com" style={{ color: TEAL }}>support@celltechpos.com</a>.
          </Section>

          <Section title="9. Cookies">
            We use essential cookies to maintain your login session and platform preferences. We do not use third-party tracking or advertising cookies.
          </Section>

          <Section title="10. Children's Privacy">
            The Service is not directed to children under 13. We do not knowingly collect personal information from children under 13.
          </Section>

          <Section title="11. Changes to This Policy">
            We may update this Privacy Policy from time to time. We will notify you of material changes by posting the new policy on this page and updating the "Last updated" date. Continued use of the Service after changes constitutes acceptance of the updated policy.
          </Section>

          <Section title="12. Contact Us">
            If you have questions about this Privacy Policy, please contact us at:
            <div style={{ marginTop: 12, padding: '16px 20px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontWeight: 700, color: '#fff' }}>PC World Exchange LLC</div>
              <div style={{ marginTop: 4 }}>Email: <a href="mailto:support@celltechpos.com" style={{ color: TEAL }}>support@celltechpos.com</a></div>
              <div>Website: <a href="https://celltechpos.com" style={{ color: TEAL }}>celltechpos.com</a></div>
            </div>
          </Section>
        </div>
      </div>

      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '20px 24px', textAlign: 'center', color: '#475569', fontSize: 13 }}>
        © 2026 PC World Exchange LLC · <Link to="/terms" style={{ color: '#475569' }}>Terms of Service</Link> · <Link to="/privacy" style={{ color: TEAL }}>Privacy Policy</Link>
      </footer>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', margin: '0 0 12px', paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>{title}</h2>
      <div>{children}</div>
    </div>
  );
}

function Strong({ children }) {
  return <p style={{ fontWeight: 600, color: '#f1f5f9', margin: '12px 0 4px' }}>{children}</p>;
}

function List({ items }) {
  return (
    <ul style={{ margin: '8px 0 12px', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {items.map((item, i) => <li key={i} style={{ color: '#94a3b8' }}>{item}</li>)}
    </ul>
  );
}

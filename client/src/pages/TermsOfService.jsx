import { Link } from 'react-router-dom';

const NAVY = '#0f172a';
const TEAL = '#0d9488';

export default function TermsOfService() {
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
          <h1 style={{ fontSize: 36, fontWeight: 900, color: '#fff', margin: '0 0 12px', letterSpacing: '-0.5px' }}>Terms of Service</h1>
          <p style={{ color: '#64748b', fontSize: 14 }}>Last updated: May 15, 2026 · PC World Exchange LLC</p>
        </div>

        <div style={{ lineHeight: 1.8, color: '#cbd5e1', fontSize: 15 }}>

          <Section title="1. Agreement to Terms">
            By accessing or using CellTechPOS ("Service"), operated by PC World Exchange LLC ("Company," "we," "us," or "our"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service. These terms apply to all users, including business owners, managers, and staff members who access the platform.
          </Section>

          <Section title="2. Description of Service">
            CellTechPOS is a subscription-based, cloud-hosted point-of-sale and business management platform designed for cell phone repair shops and wireless retail stores. Features include inventory management, repair ticketing, customer CRM, activations tracking, staff management, and SMS/email messaging tools.
          </Section>

          <Section title="3. Subscription Plans and Billing">
            <List items={[
              'CellTechPOS is offered on monthly subscription plans. Pricing is listed on our website.',
              'Billing is processed securely through Stripe. By providing payment information, you authorize us to charge your payment method on a recurring monthly basis.',
              'Subscriptions automatically renew unless cancelled before the renewal date.',
              'No refunds are issued for partial months. You may cancel at any time and retain access until the end of your billing period.',
              'We reserve the right to change pricing with 30 days written notice to your account email.',
            ]} />
          </Section>

          <Section title="4. Acceptable Use">
            You agree not to use the Service to:
            <List items={[
              'Violate any applicable laws or regulations',
              'Send unsolicited SMS messages (spam) or messages without proper customer consent',
              'Transmit or store illegal, harmful, or fraudulent content',
              'Attempt to gain unauthorized access to the Service or its systems',
              'Resell or sublicense access to the Service without written permission',
              'Interfere with the security or integrity of the platform',
            ]} />
          </Section>

          <Section title="5. SMS Messaging Terms">
            When using the SMS messaging features of CellTechPOS:
            <List items={[
              'Program name: CellTechPOS Customer Notifications',
              'Message frequency varies by store activity and customer interactions',
              'Message and data rates may apply to message recipients',
              'You are responsible for obtaining proper opt-in consent from your customers before sending SMS messages',
              'All messages must include opt-out instructions. Customers can reply STOP to unsubscribe at any time',
              'Customers can reply HELP for support information',
              'For support: support@celltechpos.com or (321) 382-5582',
              'We are not liable for carrier delays or failures in message delivery',
            ]} />
          </Section>

          <Section title="6. Customer Data">
            You retain ownership of all customer data you enter into the platform. By using the Service, you grant us a limited license to process this data solely to provide the Service. You are responsible for ensuring you have the legal right to collect and store your customers' information. We will not use your customer data for our own marketing purposes.
          </Section>

          <Section title="7. Account Termination">
            We may suspend or terminate your account if you:
            <List items={[
              'Violate these Terms of Service',
              'Fail to pay subscription fees after a grace period',
              'Engage in fraudulent or illegal activity',
            ]} />
            You may cancel your account at any time through the platform settings or by contacting support. Upon termination, your data will be retained for 90 days and then permanently deleted.
          </Section>

          <Section title="8. Intellectual Property">
            CellTechPOS, its logo, design, and underlying software are the exclusive property of PC World Exchange LLC. You are granted a limited, non-exclusive, non-transferable license to use the Service for your internal business purposes only. You may not copy, modify, distribute, or create derivative works of the Service.
          </Section>

          <Section title="9. Disclaimer of Warranties">
            THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR COMPLETELY SECURE.
          </Section>

          <Section title="10. Limitation of Liability">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, PC WORLD EXCHANGE LLC SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR BUSINESS GOODWILL, ARISING FROM YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE PRIOR 3 MONTHS.
          </Section>

          <Section title="11. Indemnification">
            You agree to indemnify and hold harmless PC World Exchange LLC and its officers, employees, and agents from any claims, damages, or expenses (including reasonable attorney fees) arising from your use of the Service, your violation of these Terms, or your violation of any third-party rights.
          </Section>

          <Section title="12. Governing Law">
            These Terms are governed by the laws of the State of Florida, without regard to its conflict of law principles. Any disputes shall be resolved in the courts located in Florida.
          </Section>

          <Section title="13. Changes to Terms">
            We reserve the right to modify these Terms at any time. We will notify you of material changes by email or through the platform. Continued use of the Service after changes constitutes acceptance of the updated Terms.
          </Section>

          <Section title="14. Contact Us">
            For questions about these Terms of Service:
            <div style={{ marginTop: 12, padding: '16px 20px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontWeight: 700, color: '#fff' }}>PC World Exchange LLC</div>
              <div style={{ marginTop: 4 }}>Email: <a href="mailto:support@celltechpos.com" style={{ color: TEAL }}>support@celltechpos.com</a></div>
              <div>Phone: <a href="tel:+13213825582" style={{ color: TEAL }}>(321) 382-5582</a></div>
              <div>Website: <a href="https://celltechpos.com" style={{ color: TEAL }}>celltechpos.com</a></div>
            </div>
          </Section>

        </div>
      </div>

      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '20px 24px', textAlign: 'center', color: '#475569', fontSize: 13 }}>
        © 2026 PC World Exchange LLC · <Link to="/terms" style={{ color: TEAL }}>Terms of Service</Link> · <Link to="/privacy" style={{ color: '#475569' }}>Privacy Policy</Link>
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

function List({ items }) {
  return (
    <ul style={{ margin: '8px 0 12px', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {items.map((item, i) => <li key={i} style={{ color: '#94a3b8' }}>{item}</li>)}
    </ul>
  );
}

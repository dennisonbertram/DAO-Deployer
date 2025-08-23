export const metadata = {
  title: 'Privacy Policy — DAO Deployer',
  description: 'How DAO Deployer handles data and privacy.'
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10 prose prose-slate dark:prose-invert">
      <h1>Privacy Policy</h1>
      <p>
        Last updated: {new Date().toLocaleDateString()}
      </p>

      <p>
        This Privacy Policy describes how DAO Deployer ("we", "our", or "us")
        collects, uses, and shares information in connection with your use of
        our non-custodial application for deploying and interacting with smart
        contracts (the "Service").
      </p>

      <h2>1. Summary</h2>
      <ul>
        <li>We are a non-custodial application: we do not control your wallet or funds.</li>
        <li>Public blockchain data (including your wallet address and transactions) is publicly accessible by design.</li>
        <li>We aim to collect only what is necessary to operate the Service and improve reliability.</li>
      </ul>

      <h2>2. Information We May Collect</h2>
      <ul>
        <li>
          Wallet information: your public wallet address and connected network.
          This is necessary to enable transactions and personalized views.
        </li>
        <li>
          Technical data: basic device/browser information, app version, and
          interaction events for debugging and security. We strive to limit this
          to what is necessary for operation.
        </li>
        <li>
          Support communications: information you voluntarily provide if you
          contact us for support or feedback.
        </li>
      </ul>

      <h2>3. Blockchain Data</h2>
      <p>
        Transactions you authorize are broadcast to public blockchains where
        they become part of a public ledger. This data, including your wallet
        address, balances, and transaction history, is publicly accessible and
        may be analyzed by third parties. We cannot remove or alter public
        blockchain records.
      </p>

      <h2>4. Cookies and Local Storage</h2>
      <p>
        We may use local storage or similar technologies to remember preferences
        (e.g., selected network) and maintain session state. We do not use these
        mechanisms to track you across unrelated sites.
      </p>

      <h2>5. How We Use Information</h2>
      <ul>
        <li>Operate, maintain, and improve the Service.</li>
        <li>Enable wallet connections and transactions you initiate.</li>
        <li>Provide support and respond to inquiries.</li>
        <li>Detect, prevent, and address security or technical issues.</li>
        <li>Comply with legal obligations where applicable.</li>
      </ul>

      <h2>6. Sharing of Information</h2>
      <ul>
        <li>
          Service providers: we may share limited information with vendors that
          help us operate the Service (e.g., error monitoring, hosting). These
          providers are bound by appropriate obligations.
        </li>
        <li>
          Legal: we may disclose information if required by law or to protect
          rights, safety, and the integrity of the Service.
        </li>
        <li>
          Aggregated/anonymized data: we may share non-identifying insights that
          do not reasonably identify you.
        </li>
      </ul>

      <h2>7. Data Retention</h2>
      <p>
        We retain information only as long as necessary for the purposes
        described in this Policy, to operate the Service, or as required by law.
        Public blockchain data is permanent and outside our control.
      </p>

      <h2>8. Your Choices</h2>
      <ul>
        <li>You may disconnect your wallet at any time.</li>
        <li>You can clear local storage and cookies via your browser.</li>
        <li>Do not share private keys or secrets with the Service.</li>
      </ul>

      <h2>9. Security</h2>
      <p>
        We implement reasonable measures to protect information we control.
        However, no method of transmission or storage is completely secure. You
        are responsible for securing your wallet and devices.
      </p>

      <h2>10. Children’s Privacy</h2>
      <p>
        The Service is not directed to individuals under 18. If you believe a
        minor has provided information, please contact us to request deletion of
        any information we control.
      </p>

      <h2>11. International Users</h2>
      <p>
        If you access the Service from outside your home jurisdiction, you
        consent to the processing and transfer of information in accordance with
        this Policy and applicable law.
      </p>

      <h2>12. Changes to this Policy</h2>
      <p>
        We may update this Policy from time to time. Material changes will be
        effective when posted. Your continued use of the Service after changes
        constitutes acceptance of the updated Policy.
      </p>

      <h2>13. Contact</h2>
      <p>
        Questions about this Policy? Contact us at <strong>[update-contact@example.com]</strong>.
      </p>
    </div>
  )
}


export const metadata = {
  title: 'Terms of Service — DAO Deployer',
  description: 'Terms governing use of the DAO Deployer application.'
}

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10 prose prose-slate dark:prose-invert">
      <h1>Terms of Service</h1>
      <p>
        Last updated: {new Date().toLocaleDateString()}
      </p>

      <p>
        These Terms of Service ("Terms") govern your access to and use of the
        DAO Deployer application and related materials (collectively, the
        "Service"). By accessing or using the Service, you agree to be bound by
        these Terms. If you do not agree, do not use the Service.
      </p>

      <h2>1. Overview</h2>
      <p>
        DAO Deployer is a non-custodial, self-service tool for deploying and
        interacting with smart contracts. You are solely responsible for your
        use of the Service, including any transactions you sign and submit on a
        blockchain network. On-chain actions are generally irreversible.
      </p>

      <h2>2. Eligibility</h2>
      <p>
        You represent that you are legally permitted to use the Service in your
        jurisdiction and that your use complies with all applicable laws and
        regulations. You are responsible for ensuring that your access is not
        prohibited or restricted.
      </p>

      <h2>3. Wallets and Authentication</h2>
      <ul>
        <li>You connect using a third-party wallet (e.g., MetaMask).</li>
        <li>Your wallet address serves as your identity within the Service.</li>
        <li>We do not control your wallet or private keys; you are responsible for their security.</li>
      </ul>

      <h2>4. No Custody; On-Chain Finality</h2>
      <ul>
        <li>The Service does not hold or transmit your funds.</li>
        <li>Transactions you authorize are broadcast to public networks and are irreversible once finalized.</li>
        <li>You are responsible for gas fees and any network costs.</li>
      </ul>

      <h2>5. Assumption of Risk</h2>
      <p>
        You acknowledge the inherent risks of blockchain technology, including
        smart contract bugs, volatile markets, regulatory changes, potential
        loss of funds, and irreversible actions. You assume full responsibility
        for all outcomes resulting from your use of the Service.
      </p>

      <h2>6. Prohibited Uses</h2>
      <p>In connection with the Service, you agree not to:</p>
      <ul>
        <li>Violate any laws or regulations.</li>
        <li>Use the Service for fraud, money laundering, or other illicit activity.</li>
        <li>Interfere with or disrupt the Service or underlying networks.</li>
        <li>Infringe or misappropriate intellectual property or privacy rights.</li>
      </ul>

      <h2>7. Intellectual Property</h2>
      <p>
        The Service may include software and documentation licensed under open
        source or proprietary terms. Your use of such materials is subject to
        the applicable licenses. We reserve all rights not expressly granted.
      </p>

      <h2>8. Feedback</h2>
      <p>
        If you provide feedback or suggestions, you grant us a non-exclusive,
        worldwide, royalty-free license to use, modify, and incorporate that
        feedback without obligation to you.
      </p>

      <h2>9. Disclaimers</h2>
      <p>
        THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES
        OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED
        WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
        NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE
        UNINTERRUPTED, SECURE, OR ERROR-FREE, OR THAT DEFECTS WILL BE CORRECTED.
      </p>

      <h2>10. Limitation of Liability</h2>
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT WILL WE BE LIABLE
        FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR
        PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, OR GOODWILL, ARISING OUT
        OF OR RELATED TO YOUR USE OF THE SERVICE, WHETHER BASED IN CONTRACT,
        TORT, STRICT LIABILITY, OR OTHERWISE, EVEN IF ADVISED OF THE POSSIBILITY
        OF SUCH DAMAGES.
      </p>

      <h2>11. Indemnification</h2>
      <p>
        You agree to indemnify and hold harmless the DAO Deployer team, its
        contributors, and affiliates from any claims, liabilities, damages,
        losses, and expenses (including reasonable attorneys’ fees) arising from
        or related to your use of the Service or violation of these Terms.
      </p>

      <h2>12. Third-Party Services</h2>
      <p>
        The Service may rely on or link to third-party services (e.g., RPC
        providers, wallets, libraries). We do not control and are not
        responsible for third-party services. Your use of them is governed by
        their terms and policies.
      </p>

      <h2>13. Changes to the Service</h2>
      <p>
        We may modify, suspend, or discontinue the Service at any time without
        notice. We may update these Terms from time to time; material changes
        will be effective when posted. Your continued use constitutes
        acceptance of the revised Terms.
      </p>

      <h2>14. Termination</h2>
      <p>
        We may suspend or terminate your access to the Service for any reason,
        including if we believe you have violated these Terms or applicable law.
      </p>

      <h2>15. Governing Law</h2>
      <p>
        These Terms will be governed by and construed in accordance with the
        laws applicable in the jurisdiction where the Service is operated,
        without regard to conflict of law principles. Any disputes will be
        resolved in the courts of that jurisdiction, unless otherwise required
        by applicable law.
      </p>

      <h2>16. Contact</h2>
      <p>
        Questions about these Terms? Contact us at <strong>[update-contact@example.com]</strong>.
      </p>
    </div>
  )
}


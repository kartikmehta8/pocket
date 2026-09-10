import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { FundStep, type FundStepProps } from './fund-step';

// The re-read button is a client component that reaches for the app router,
// which does not exist outside Next. Only its presence is under test here.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: () => undefined }),
}));

const ADDRESS = '0x74d4b0761C683C9A0038243dF16B238548C0D66C';
const ACCOUNT = '0.0.10459667';

/** Renders the funding step in one of its states. */
function fund(overrides: Partial<FundStepProps> = {}): string {
  return renderToStaticMarkup(
    <FundStep address={ADDRESS} accountId={null} balance="0" funded={false} {...overrides} />,
  );
}

/** Strips tags so an anchor's visible text can be matched. */
function text(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
}

/** The classes on whichever anchor carries `label`. */
function anchorClasses(html: string, label: string): string {
  for (const match of html.matchAll(/<a\b[^>]*class="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)) {
    if (text(match[2] ?? '').includes(label)) return match[1] ?? '';
  }
  throw new Error(`no anchor labelled ${label}`);
}

describe('FundStep', () => {
  it('asks for an agent before anything else', () => {
    expect(text(fund({ address: null }))).toContain('Register an agent first');
  });

  it('confirms the balance once funded', () => {
    const html = text(fund({ funded: true, balance: '5.00' }));
    expect(html).toContain('Funded with 5.00 USDC');
    expect(html).not.toContain('faucet');
  });

  describe('before the Hedera account exists', () => {
    it('leads with HBAR and says why it is needed', () => {
      const html = text(fund());
      expect(html).toContain('Send HBAR first');
      expect(html).toContain('no 0.0.x id');
    });

    it('makes the HBAR faucet the primary button', () => {
      const html = fund();
      expect(anchorClasses(html, 'Get testnet HBAR')).toContain('bg-primary');
      expect(anchorClasses(html, 'Circle faucet')).not.toContain('bg-primary');
    });

    it('does not offer an account id it does not have', () => {
      expect(text(fund())).not.toContain('Hedera account id');
    });

    it('says HBAR is not what the agent spends, so the point is not lost', () => {
      expect(text(fund())).toContain('HBAR is not what the agent spends');
    });
  });

  describe('once the Hedera account exists', () => {
    it('switches the lead to USDC', () => {
      const html = text(fund({ accountId: ACCOUNT }));
      expect(html).toContain('Now send USDC');
      expect(html).not.toContain('Send HBAR first');
    });

    it('makes Circle the primary button', () => {
      const html = fund({ accountId: ACCOUNT });
      expect(anchorClasses(html, 'Get testnet USDC')).toContain('bg-primary');
      expect(anchorClasses(html, 'HBAR faucet')).not.toContain('bg-primary');
    });

    it('shows the account id a faucet asks for', () => {
      expect(text(fund({ accountId: ACCOUNT }))).toContain(ACCOUNT);
    });
  });

  it('offers a re-read in every unfunded state', () => {
    expect(text(fund())).toContain('I have sent it');
    expect(text(fund({ accountId: ACCOUNT }))).toContain('I have sent it');
  });
});

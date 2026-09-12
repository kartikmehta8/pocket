/**
 * The funding step, and which faucet it leads with. The buttons are client
 * components that reach for the app router, which does not exist outside Next,
 * so only their presence is tested. The facilitator pays every fee, and saying
 * so stops operators hunting for an HBAR faucet they never needed. Circle
 * rate-limits and refuses accounts silently, so it has no business being the
 * first thing on a step that is already satisfied — but neither faucet is ever
 * withheld, because somebody who wants to stock a wallet before they need to
 * should not have to reach a particular state to be shown the link. A wallet
 * Pocket seeded holds USDC and nothing else, so the publish button without
 * that warning reads as an unexplained provider rejection. Why the treasury
 * did not pay is Pocket’s problem rather than something an operator can act
 * on, so the only useful thing to say is how to carry on.
 */

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { FundStep, type FundStepProps } from './fund-step';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: () => undefined }),
}));

const ADDRESS = '0x74d4b0761C683C9A0038243dF16B238548C0D66C';
const ACCOUNT = '0.0.10459667';

/** Renders the funding step in one of its states. */
function fund(overrides: Partial<FundStepProps> = {}): string {
  return renderToStaticMarkup(
    <FundStep
      address={ADDRESS}
      accountId={ACCOUNT}
      accountHollow={false}
      agentId="agent_1"
      balance="0.02"
      funded
      {...overrides}
    />,
  );
}

/** Strips tags so visible copy can be matched. */
function text(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
}

describe('FundStep', () => {
  it('asks for an agent before anything else', () => {
    expect(text(fund({ address: null }))).toContain('Register an agent first');
  });

  describe('a seeded agent, which is the ordinary case', () => {
    it('says it is ready rather than asking for money', () => {
      const html = text(fund());
      expect(html).toContain('Ready to spend, with 0.02 USDC');
      expect(html).toContain('nothing to do here');
    });

    it('credits Pocket, so the balance is not a mystery', () => {
      expect(text(fund())).toContain('Pocket funded this wallet');
    });

    it('says the agent needs no HBAR of its own', () => {
      expect(text(fund())).toContain('needs no HBAR');
    });

    it('points at the next step', () => {
      expect(text(fund())).toContain('budget and a policy');
    });

    it('offers topping up, and marks it optional', () => {
      const html = text(fund());
      expect(html).toContain('Adding more is optional');
      expect(html).toContain('testing beyond a few calls');
    });

    it('does not lead with a faucet', () => {
      const html = text(fund());
      expect(html.indexOf('Ready to spend')).toBeLessThan(html.indexOf('Circle'));
    });
  });

  describe('the faucets', () => {
    it.each([
      ['a keyed account', { accountId: ACCOUNT, accountHollow: false }],
      ['a hollow account', { accountId: ACCOUNT, accountHollow: true }],
      ['no account at all', { accountId: null, accountHollow: null }],
      ['an empty wallet', { funded: false, balance: '0' }],
    ])('offers both on %s', (_case, props) => {
      const html = text(fund(props));
      expect(html).toContain('Circle faucet, for USDC');
      expect(html).toContain('Hedera faucet, for HBAR');
    });

    it('names both of Circle’s traps wherever it is shown', () => {
      const html = text(fund());
      expect(html).toContain('Hedera Testnet');
      expect(html).toContain('rather than the address');
    });

    it('says HBAR is never spent, so nobody hunts for more of it', () => {
      expect(text(fund())).toContain('HBAR is never spent');
    });
  });

  describe('topping up a keyed account', () => {
    it('hands over the account id a faucet asks for', () => {
      expect(text(fund())).toContain(ACCOUNT);
    });
  });

  describe('topping up a hollow account', () => {
    const hollow = () => text(fund({ accountHollow: true }));

    it('explains that Circle refuses it, and silently', () => {
      expect(hollow()).toContain('never signed anything');
      expect(hollow()).toContain('silently');
    });

    it('offers the signature, and says it moves no money', () => {
      expect(hollow()).toContain('Publish the key');
      expect(hollow()).toContain('Moves no money');
    });

    it('warns that the signature itself needs HBAR for gas', () => {
      expect(hollow()).toContain('needs a little HBAR to pay for it');
    });

    it('withholds an id a faucet would refuse', () => {
      expect(hollow()).not.toContain(ACCOUNT);
    });
  });

  describe('topping up before an account exists', () => {
    it('explains that HBAR is what brings an account into existence', () => {
      const html = text(fund({ accountId: null }));
      expect(html).toContain('no account yet');
      expect(html).toContain('brings one into existence');
    });
  });

  describe('an unseeded agent, when the treasury is off or empty', () => {
    const empty = () => text(fund({ funded: false, balance: '0' }));

    it('says what to do rather than what went wrong inside Pocket', () => {
      expect(empty()).toContain('Add some USDC to get started');
      expect(empty()).not.toContain('treasury');
      expect(empty()).not.toContain('seeding');
    });

    it('still offers the faucet route, as the fallback it now is', () => {
      expect(empty()).toContain(ACCOUNT);
      expect(empty()).toContain('Circle faucet, for USDC');
    });

    it('offers a re-read, and reports what the balance says', () => {
      expect(empty()).toContain('I have sent it');
      expect(empty()).toContain('Balance reads 0 USDC');
    });

    it('admits when the balance could not be read', () => {
      expect(text(fund({ funded: false, balance: null }))).toContain('could not be read');
    });
  });
});

/**
 * The data the interface offers, and the small helpers that read it.
 *
 * Every list here is a contract the API also holds: a category the dashboard
 * offers but the API rejects is a form that fails on save, and a status with no
 * presentation is a row that renders blank. So each is checked against the
 * vocabulary rather than against itself.
 */

import { describe, expect, it } from 'vitest';

import { AGENT_BRANDS, ROTATE_MS } from './agent-brands';
import { CAPABILITIES, INTEGRATIONS } from './capabilities';
import { AGENT_STATUSES, CATEGORIES, PAYMENT_STATUSES, categoryLabel } from './catalog';
import { FAUCETS, faucetFor } from './faucets';
import { homeCta } from './home-cta';
import { readParam } from './search-params';
import {
  agentStatusPresentation,
  paymentStatusPresentation,
  severityTone,
  usageTone,
} from './status';

describe('categoryLabel', () => {
  it('gives every category a label', () => {
    for (const category of CATEGORIES) {
      expect(categoryLabel(category), category).toBeTruthy();
    }
  });

  it('overrides the ones sentence case would get wrong', () => {
    expect(categoryLabel('api')).toBe('API');
    expect(categoryLabel('agent-service')).toBe('Agent service');
  });
});

describe('status presentation', () => {
  it('presents every payment status the contract defines', () => {
    for (const status of PAYMENT_STATUSES) {
      const presented = paymentStatusPresentation(status);
      expect(presented.label, status).toBeTruthy();
      expect(presented.tone, status).toBeTruthy();
      expect(presented.Icon, status).toBeDefined();
    }
  });

  it('presents every agent status', () => {
    for (const status of AGENT_STATUSES) {
      const presented = agentStatusPresentation(status);
      expect(presented.label, status).toBeTruthy();
      expect(presented.hint, status).toBeTruthy();
    }
  });
});

describe('severityTone', () => {
  it('escalates with the severity, whatever case it arrives in', () => {
    expect(severityTone('HIGH')).toBe('danger');
    expect(severityTone('critical')).toBe('danger');
    expect(severityTone('Medium')).toBe('warning');
    expect(severityTone('low')).toBe('info');
  });

  it('treats an unknown severity as information rather than alarm', () => {
    expect(severityTone('whatever')).toBe('info');
  });
});

describe('usageTone', () => {
  it('escalates as headroom runs out', () => {
    expect(usageTone(0)).toBe('info');
    expect(usageTone(0.5)).toBe('info');
    expect(usageTone(0.75)).toBe('warning');
    expect(usageTone(0.95)).toBe('danger');
    expect(usageTone(1.5)).toBe('danger');
  });
});

describe('homeCta', () => {
  it('sends a signed-in reader to the dashboard and a stranger to sign-in', () => {
    expect(homeCta(true)).toEqual({ label: 'Open dashboard', href: '/dashboard' });
    expect(homeCta(false).href).toBe('/login');
  });
});

describe('readParam', () => {
  it('takes the first of a repeated parameter and empty for nothing', () => {
    expect(readParam('one')).toBe('one');
    expect(readParam(['one', 'two'])).toBe('one');
    expect(readParam(undefined)).toBe('');
    expect(readParam([])).toBe('');
  });
});

describe('faucetFor', () => {
  it('finds the faucet for each asset an agent wallet can run out of', () => {
    expect(faucetFor('USDC').name).toBe('Circle');
    expect(faucetFor('HBAR').name).toBe('Hedera');
  });

  it('offers a faucet for every asset it claims to cover', () => {
    for (const faucet of FAUCETS) {
      expect(faucetFor(faucet.asset)).toBe(faucet);
      expect(faucet.href.startsWith('https://'), faucet.asset).toBe(true);
      expect(faucet.purpose, faucet.asset).toBeTruthy();
    }
  });

  it('fails loudly rather than rendering a button that goes nowhere', () => {
    expect(() => faucetFor('ETH' as never)).toThrow(/No faucet is configured/);
  });
});

describe('the tool catalogue the capabilities screen shows', () => {
  it('marks exactly one tool as able to spend', () => {
    expect(CAPABILITIES.filter((entry) => entry.spends).map((entry) => entry.tool)).toEqual([
      'pocket_pay_for_resource',
    ]);
  });

  it('names and explains every tool', () => {
    for (const entry of CAPABILITIES) {
      expect(entry.tool.startsWith('pocket_'), entry.tool).toBe(true);
      expect(entry.title, entry.tool).toBeTruthy();
      expect(entry.summary.length, entry.tool).toBeGreaterThan(20);
      expect(entry.why.length, entry.tool).toBeGreaterThan(20);
    }
  });

  it('lists each tool once', () => {
    const names = CAPABILITIES.map((entry) => entry.tool);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('the integrations the marketing page names', () => {
  it('gives each one a mark and a line', () => {
    for (const integration of INTEGRATIONS) {
      expect(integration.name).toBeTruthy();
      expect(integration.logo.startsWith('/logos/'), integration.name).toBe(true);
    }
  });
});

describe('the agents the headline rotates through', () => {
  it('names each one and points at a mark that ships with the app', () => {
    for (const brand of AGENT_BRANDS) {
      expect(brand.name).toBeTruthy();
      expect(brand.logo.startsWith('/logos/'), brand.name).toBe(true);
    }
  });

  it('rotates slowly enough to be read', () => {
    expect(ROTATE_MS).toBeGreaterThan(1500);
  });
});

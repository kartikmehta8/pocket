/**
 * What the server tells the world it can do.
 *
 * The home route publishes this catalogue to anyone who asks, including the
 * people deciding whether to point an agent at it. The one claim on that page
 * worth being certain about is which tool can move money.
 */

import { describe, expect, it } from 'vitest';
import { toolCatalog } from '../src/tools.js';

describe('the published tool catalogue', () => {
  const tools = toolCatalog();

  it('lists every tool the server registers, once', () => {
    const names = tools.map((tool) => tool.name);
    expect(names).toEqual([
      'pocket_list_agents',
      'pocket_get_agent',
      'pocket_preview_payment',
      'pocket_pay_for_resource',
      'pocket_create_task_budget',
      'pocket_spend_summary',
      'pocket_list_payments',
      'pocket_audit_trail',
    ]);
    expect(new Set(names).size).toBe(names.length);
  });

  it('marks exactly one tool as able to spend', () => {
    const spenders = tools.filter((tool) => tool.spends);
    expect(spenders.map((tool) => tool.name)).toEqual(['pocket_pay_for_resource']);
  });

  it('never marks a spending tool read-only', () => {
    for (const tool of tools) {
      if (tool.spends) expect(tool.readOnly).toBe(false);
    }
  });

  it('describes every tool it lists', () => {
    for (const tool of tools) {
      expect(tool.title.length).toBeGreaterThan(0);
      expect(tool.description.length).toBeGreaterThan(20);
    }
  });
});

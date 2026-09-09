import defaultComponents from 'fumadocs-ui/mdx';
import { Callout } from 'fumadocs-ui/components/callout';
import { Card, Cards } from 'fumadocs-ui/components/card';
import { Step, Steps } from 'fumadocs-ui/components/steps';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import type { MDXComponents } from 'mdx/types';

import { Flow, Sequence } from './diagram/flow';

/**
 * Components every MDX page can use without importing them.
 *
 * Registered globally rather than imported per page: a docs set where half the
 * pages carry a block of imports at the top is a docs set nobody wants to edit.
 *
 * @param components Extra components supplied by the route.
 * @returns The merged component map.
 */
export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultComponents,
    Callout,
    Card,
    Cards,
    Step,
    Steps,
    Tab,
    Tabs,
    Flow,
    Sequence,
    ...components,
  };
}

import { ShieldCheck, TriangleAlert } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/cn';
import { humanize } from '@/lib/format';
import { severityTone } from '@/lib/status';
import type { SpendSummary } from '@/lib/types';

import { TONE_RULE } from '@/components/ui/tones';

/** Props for {@link AnomaliesPanel}. */
export interface AnomaliesPanelProps {
  anomalies: SpendSummary['anomalies'];
  /** Analytics adapter that produced them, e.g. `"the-graph"`. */
  source: string;
}

/**
 * Spend anomalies reported by the analytics adapter. Severity is carried by a
 * left rule *and* a labelled badge, so it never rests on colour alone.
 */
export function AnomaliesPanel({ anomalies, source }: AnomaliesPanelProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <div>
          <CardTitle>Anomalies</CardTitle>
          <CardDescription>Detected by {source}</CardDescription>
        </div>
        {anomalies.length > 0 ? (
          <Badge tone="warning" icon={TriangleAlert}>
            {anomalies.length}
          </Badge>
        ) : null}
      </CardHeader>
      <CardContent>
        {anomalies.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="Nothing unusual"
            description="Spend is tracking within the expected envelope."
            className="py-8"
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {anomalies.map((anomaly, index) => {
              const tone = severityTone(anomaly.severity);
              return (
                <li
                  key={`${anomaly.type}-${index}`}
                  className={cn('bg-ash-25 rounded-md border-l-2 px-3 py-2.5', TONE_RULE[tone])}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-text text-sm font-medium">{humanize(anomaly.type)}</p>
                    <Badge tone={tone} icon={TriangleAlert}>
                      {humanize(anomaly.severity)}
                    </Badge>
                  </div>
                  <p className="text-text-secondary mt-1 text-sm">{anomaly.description}</p>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

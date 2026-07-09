import type { CorrelationData } from '../../../lib/macrovol/api';
import { DataBadge } from '../DataBadge';
import { CollapsibleSection } from '../../terminal/CollapsibleSection';

export function CorrSection({ corr }: { corr: CorrelationData }) {
  if (!corr.matrix?.length) return null;

  return (
    <CollapsibleSection
      id="sec-corr"
      belowFold
      className="order-10"
      title="RATES CORRELATION MATRIX"
      apis={['yfinance']}
      defaultOpen={false}
      storageKey="rates.sec.corr"
      subtitle="Pearson on daily % changes · 30D window · 1Y lookback"
    >
      <div className="overflow-auto">
        <table className="border-collapse text-type-xs">
          <thead>
            <tr>
              <th className="p-1" />
              {corr.instruments.map((inst) => (
                <th key={inst} className="p-1 text-center font-normal text-muted-foreground">{inst}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {corr.matrix.map((row, i) => (
              <tr key={corr.instruments[i]}>
                <td className="p-1 pr-2 text-right text-muted-foreground">{corr.instruments[i]}</td>
                {row.map((v, j) => {
                  const a = Math.abs(v);
                  const bg =
                    v >= 0.9 ? '#1d4ed8'
                      : v >= 0.6 ? '#3b82f6'
                        : v >= 0.2 ? '#86efac'
                          : v >= 0 ? '#ecfdf5'
                            : '#fde68a';
                  const fg = a >= 0.85 ? '#fff' : '#1e3a5f';
                  return (
                    <td key={j} className="p-1 text-center font-medium" style={{ background: bg, color: fg, minWidth: 36 }}>
                      {v.toFixed(2)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <DataBadge asOf={corr.as_of} source={corr.source || 'FRED'} note={corr.note} className="mt-2" />
    </CollapsibleSection>
  );
}

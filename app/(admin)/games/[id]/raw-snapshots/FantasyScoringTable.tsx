type Rule = { label: string; points: string };

const NFL_RULES: Array<{ heading: string; rules: Rule[] }> = [
  {
    heading: 'Offense',
    rules: [
      { label: 'First appearance in game', points: '+18' },
      { label: 'Passing yards', points: '+12 / 10 yards' },
      { label: 'Rushing yards', points: '+12 / 4 yards' },
      { label: 'Receiving yards', points: '+12 / 4 yards' },
      { label: 'Reception', points: '+9' },
      { label: 'Passing touchdown', points: '+70' },
      { label: 'Rushing touchdown', points: '+105' },
      { label: 'Receiving touchdown', points: '+105' },
      { label: 'Field goal under 40 yards', points: '+52' },
      { label: 'Field goal, 40–49 yards', points: '+70' },
      { label: 'Field goal, 50+ yards', points: '+88' },
      { label: 'Extra point', points: '+6' },
      { label: 'Two-point conversion', points: '+35' },
    ],
  },
  {
    heading: 'Defence and returns',
    rules: [
      { label: 'Solo tackle', points: '+7' },
      { label: 'Assisted tackle', points: '+4' },
      { label: 'Return touchdown', points: '+175' },
      { label: 'Defensive touchdown', points: '+175' },
      { label: 'Safety', points: '+70' },
    ],
  },
  {
    heading: 'Penalties and bonuses',
    rules: [
      { label: 'Quarterback sacked', points: '−4' },
      { label: 'Interception thrown', points: '−40' },
      { label: 'Fumble lost', points: '−40' },
      { label: '100 rushing yards', points: '+53' },
      { label: '300 passing yards', points: '+53' },
      { label: '100 receiving yards', points: '+53' },
    ],
  },
];

const NHL_RULES: Array<{ heading: string; rules: Rule[] }> = [
  {
    heading: 'Skater scoring',
    rules: [
      { label: 'Goal', points: '+250' },
      { label: 'Assist', points: '+125' },
      { label: 'Shot on goal', points: '+50' },
      { label: 'Hit', points: '+25' },
      { label: 'Block / blocked shot', points: '+25' },
      { label: 'Giveaway', points: '−25' },
      { label: 'Penalty minute', points: '−25 / minute' },
      { label: 'Hat trick bonus', points: '+100' },
      { label: 'Ice time', points: '+35 / 5 minutes' },
    ],
  },
];

/**
 * A labelled reference for the score awarded by the live process-event
 * function. It is intentionally separate from the raw snapshot table: the
 * provider payload contains game statistics, while these are Ultimate Fan's
 * rules for turning those statistics into fantasy points.
 */
export default function FantasyScoringTable({ sport }: { sport: string | null }) {
  const isNhl = sport === 'NHL';
  const groups = isNhl ? NHL_RULES : NFL_RULES;

  return (
    <aside className="card p-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold text-gray-900">Current fantasy scoring</h2>
        <p className="text-xs text-secondary mt-0.5">
          {isNhl ? 'NHL' : 'NFL'} values applied when game events are scored.
        </p>
      </div>
      <div className="divide-y divide-border">
        {groups.map(group => (
          <section key={group.heading} className="px-4 py-3">
            <h3 className="text-[11px] uppercase tracking-wider font-semibold text-muted mb-1.5">{group.heading}</h3>
            <table className="w-full text-xs">
              <tbody>
                {group.rules.map(rule => (
                  <tr key={rule.label} className="border-b border-border last:border-0">
                    <td className="py-1.5 text-secondary">{rule.label}</td>
                    <td className="py-1.5 text-right font-mono font-medium text-gray-900 whitespace-nowrap">{rule.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>
    </aside>
  );
}

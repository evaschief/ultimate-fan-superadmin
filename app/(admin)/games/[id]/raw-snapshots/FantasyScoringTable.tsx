import { ScoringConfig } from '@/types';

type Rule = { label: string; points: string };
type RuleGroup = { heading: string; rules: Rule[] };
const signed = (value: number) => value >= 0 ? `+${value}` : `−${Math.abs(value)}`;

/**
 * A labelled reference for the score awarded by the live process-event
 * function. It is intentionally separate from the raw snapshot table: the
 * provider payload contains game statistics, while these are Ultimate Fan's
 * rules for turning those statistics into fantasy points.
 */
export default function FantasyScoringTable({
  sport,
  config,
}: {
  sport: string | null;
  config: ScoringConfig;
}) {
  const isNhl = sport === 'NHL';
  const groups: RuleGroup[] = isNhl ? [
    {
      heading: 'Skater scoring',
      rules: [
        { label: 'Goal', points: signed(config.hockey.goal) },
        { label: 'Assist', points: signed(config.hockey.assist) },
        { label: 'Shot on goal', points: signed(config.hockey.shotOnGoal) },
        { label: 'Hit', points: signed(config.hockey.hit) },
        { label: 'Block / blocked shot', points: signed(config.hockey.block) },
        { label: 'Giveaway', points: signed(config.hockey.giveaway) },
        { label: 'Penalty minute', points: `${signed(config.hockey.penaltyPerMin)} / minute` },
        { label: 'Hat trick bonus', points: signed(config.hockey.hatTrickBonus) },
        { label: 'Ice time', points: `${signed(config.hockey.iceTimePer5Min)} / 5 minutes` },
      ],
    },
  ] : [
    {
      heading: 'Offense',
      rules: [
        { label: 'First appearance in game', points: signed(config.football.gameParticipation) },
        { label: 'Passing yards', points: `${signed(config.football.passingYardsPer10)} / 10 yards` },
        { label: 'Rushing yards', points: `${signed(config.football.rushingYardsPer4)} / 4 yards` },
        { label: 'Receiving yards', points: `${signed(config.football.receivingYardsPer4)} / 4 yards` },
        { label: 'Reception', points: signed(config.football.reception) },
        { label: 'Passing touchdown', points: signed(config.football.passingTD) },
        { label: 'Rushing touchdown', points: signed(config.football.rushingTD) },
        { label: 'Receiving touchdown', points: signed(config.football.receivingTD) },
        { label: 'Field goal under 40 yards', points: signed(config.football.fieldGoal) },
        { label: 'Field goal, 40–49 yards', points: signed(config.football.fieldGoal40) },
        { label: 'Field goal, 50+ yards', points: signed(config.football.fieldGoal50) },
        { label: 'Extra point', points: signed(config.football.extraPoint) },
        { label: 'Two-point conversion', points: signed(config.football.twoPointConversion) },
      ],
    },
    {
      heading: 'Defence and returns',
      rules: [
        { label: 'Solo tackle', points: signed(config.football.tackle) },
        { label: 'Assisted tackle', points: signed(config.football.tackleAssisted) },
        { label: 'Return touchdown', points: signed(config.football.returnTD) },
        { label: 'Defensive touchdown', points: signed(config.football.defensiveTD) },
        { label: 'Safety', points: signed(config.football.safety) },
      ],
    },
    {
      heading: 'Penalties and bonuses',
      rules: [
        { label: 'Quarterback sacked', points: signed(config.football.qbSacked) },
        { label: 'Interception thrown', points: signed(config.football.interception) },
        { label: 'Fumble lost', points: signed(config.football.fumbleLost) },
        { label: '100 rushing yards', points: signed(config.football.milestone100Rush) },
        { label: '300 passing yards', points: signed(config.football.milestone300Pass) },
        { label: '100 receiving yards', points: signed(config.football.milestone100Rec) },
      ],
    },
  ];

  return (
    <aside className="card p-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold text-gray-900">Current fantasy scoring</h2>
        <p className="text-xs text-secondary mt-0.5">
          {isNhl ? 'NHL' : 'NFL'} values from the live scoring configuration.
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

export type BetCatalogEntry = {
  id: string;
  sport: 'NFL' | 'NHL';
  name: string;
  trigger: string;
  options: string;
  manualOpenable?: boolean;
};

// This is the catalog of bet types process-event can create. It does not run
// the game: the poller continues to open its own bets on normal triggers.
export const BET_CATALOG: BetCatalogEntry[] = [
  { id: 'who_wins_game', sport: 'NFL', name: 'Who wins the game?', trigger: 'Pregame / late-game choice', options: 'Home / away', manualOpenable: true },
  { id: 'scores_next', sport: 'NFL', name: 'Which team scores next?', trigger: 'Score or drive transition', options: 'Home / away', manualOpenable: true },
  { id: 'td_or_fg', sport: 'NFL', name: 'Next score: touchdown or field goal?', trigger: 'Scoring opportunity', options: 'TD / FG', manualOpenable: true },
  { id: 'first_score_type', sport: 'NFL', name: 'First score type', trigger: 'Before first score', options: 'TD / FG' },
  { id: 'first_score_q2', sport: 'NFL', name: 'First team to score in Q2', trigger: 'Start of Q2', options: 'Home / away' },
  { id: 'scores_first_2nd_half', sport: 'NFL', name: 'First team to score in second half', trigger: 'Start of Q3', options: 'Home / away' },
  { id: 'leads_after_q1', sport: 'NFL', name: 'Who leads after Q1?', trigger: 'During Q1', options: 'Home / away' },
  { id: 'leads_at_halftime', sport: 'NFL', name: 'Who leads at halftime?', trigger: 'During Q2', options: 'Home / away' },
  { id: 'leads_after_2', sport: 'NFL', name: 'Who leads after Q2?', trigger: 'During Q2', options: 'Home / away' },
  { id: 'q1_total_points', sport: 'NFL', name: 'Q1 total-points line', trigger: 'During Q1', options: 'Over / under' },
  { id: 'over_under_2nd_half', sport: 'NFL', name: 'Second-half total-points line', trigger: 'Halftime', options: 'Over / under' },
  { id: 'td_in_q1', sport: 'NFL', name: 'Touchdown in Q1?', trigger: 'Start of Q1', options: 'YES / NO' },
  { id: 'scores_in_quarter', sport: 'NFL', name: 'Will there be a score this quarter?', trigger: 'Quarter state', options: 'YES / NO' },
  { id: 'q2_turnover', sport: 'NFL', name: 'Turnover in Q2?', trigger: 'During Q2', options: 'YES / NO' },
  { id: 'two_min_drill', sport: 'NFL', name: 'Score before end of Q2?', trigger: 'Two-minute warning', options: 'YES / NO' },
  { id: 'will_go_ot', sport: 'NFL', name: 'Will this game go to overtime?', trigger: 'Late close game', options: 'YES / NO' },
  { id: 'ot_winner', sport: 'NFL', name: 'Who wins overtime?', trigger: 'Overtime', options: 'Home / away' },
  { id: 'will_trailing_team_tie', sport: 'NFL', name: 'Will trailing team tie or lead?', trigger: 'Late one-score game', options: 'YES / NO' },
  { id: 'will_defensive_td', sport: 'NFL', name: 'Defensive touchdown?', trigger: 'Game state', options: 'YES / NO' },
  { id: 'most_sacks', sport: 'NFL', name: 'Which QB gets sacked more?', trigger: 'Halftime', options: 'QB / QB' },
  { id: 'milestone_100_rush_yards', sport: 'NFL', name: '100 rushing yards milestone?', trigger: 'Player near milestone', options: 'YES / NO' },
  { id: 'milestone_100_rec_yards', sport: 'NFL', name: '100 receiving yards milestone?', trigger: 'Player near milestone', options: 'YES / NO' },
  { id: 'milestone_300_pass_yards', sport: 'NFL', name: '300 passing yards milestone?', trigger: 'Player near milestone', options: 'YES / NO' },
  { id: 'multi_touchdown_scorer', sport: 'NFL', name: 'Multiple-touchdown scorer?', trigger: 'Player near milestone', options: 'YES / NO' },
  { id: 'drive_first_play_type', sport: 'NFL', name: 'First play of drive', trigger: 'New drive', options: 'Run / pass' },
  { id: 'will_drive_score', sport: 'NFL', name: 'Will this drive score?', trigger: 'Active drive', options: 'YES / NO' },
  { id: 'will_drive_td', sport: 'NFL', name: 'Will this drive score a TD?', trigger: 'Active drive', options: 'YES / NO' },
  { id: 'drive_ends_turnover', sport: 'NFL', name: 'Will this drive end in turnover?', trigger: 'Active drive', options: 'YES / NO' },
  { id: 'drive_reaches_redzone', sport: 'NFL', name: 'Will this drive reach red zone?', trigger: 'Active drive', options: 'YES / NO' },
  { id: 'drive_play_count', sport: 'NFL', name: 'Drive play-count line', trigger: 'Active drive', options: 'Over / under' },
  { id: 'drive_yards_over_under', sport: 'NFL', name: 'Drive-yards line', trigger: 'Active drive', options: 'Over / under' },
  { id: 'first_down_conv', sport: 'NFL', name: 'Will this first down convert?', trigger: 'Down-and-distance state', options: 'YES / NO' },
  { id: 'red_zone_offense', sport: 'NFL', name: 'Red-zone outcome', trigger: 'Red zone', options: 'TD / no TD' },
  { id: 'hail_mary_attempt', sport: 'NFL', name: 'Hail Mary attempt?', trigger: 'Final-play situation', options: 'YES / NO' },
  { id: 'hail_mary_td', sport: 'NFL', name: 'Hail Mary touchdown?', trigger: 'Hail Mary attempt', options: 'YES / NO' },
  { id: 'who_wins_game', sport: 'NHL', name: 'Who wins the game?', trigger: 'Pregame / late-game choice', options: 'Home / away', manualOpenable: true },
  { id: 'scores_next', sport: 'NHL', name: 'Which team scores next?', trigger: 'Goal or stoppage', options: 'Home / away', manualOpenable: true },
  { id: 'power_play', sport: 'NHL', name: 'Power play — will they score?', trigger: 'Penalty', options: 'YES / NO' },
  { id: 'first_5_shots', sport: 'NHL', name: 'First 5 shots on goal', trigger: 'First shot', options: 'Home / away' },
  { id: 'shots_in_2nd', sport: 'NHL', name: 'Second-period shots line', trigger: 'Start of P2', options: 'Over / under' },
  { id: 'goal_in_1st', sport: 'NHL', name: 'Goal in first period?', trigger: 'Start of P1', options: 'YES / NO' },
  { id: 'first_score_q2', sport: 'NHL', name: 'First team to score in P2', trigger: 'Start of P2', options: 'Home / away' },
  { id: 'scores_first_2nd_half', sport: 'NHL', name: 'First team to score in P3', trigger: 'Start of P3', options: 'Home / away' },
  { id: 'will_go_ot', sport: 'NHL', name: 'Will this game go to overtime?', trigger: 'Late close game', options: 'YES / NO' },
  { id: 'goes_to_shootout', sport: 'NHL', name: 'Will this game go to a shootout?', trigger: 'Overtime', options: 'YES / NO' },
  { id: 'ot_winner', sport: 'NHL', name: 'Who wins overtime?', trigger: 'Overtime', options: 'Home / away' },
  { id: 'big_hitter', sport: 'NHL', name: 'Which team reaches 10 hits first?', trigger: 'Early game', options: 'Home / away' },
  { id: 'most_penalties', sport: 'NHL', name: 'Which team takes more penalties?', trigger: 'Game state', options: 'Home / away' },
  { id: 'pp_goal_in_2nd', sport: 'NHL', name: 'Power-play goal in P2?', trigger: 'P2 power play', options: 'YES / NO' },
  { id: 'will_penalty_shot_score', sport: 'NHL', name: 'Penalty shot — will they score?', trigger: 'Penalty shot', options: 'YES / NO' },
  { id: 'will_delayed_penalty_goal', sport: 'NHL', name: 'Delayed penalty — will they score?', trigger: 'Delayed penalty', options: 'YES / NO' },
  { id: 'will_shootout_goal', sport: 'NHL', name: 'Shootout attempt — goal or save?', trigger: 'Shootout attempt', options: 'GOAL / SAVE' },
  { id: 'hail_mary', sport: 'NHL', name: 'Will trailing team tie or lead?', trigger: 'Late one-goal game', options: 'YES / NO' },
];

export function catalogForSport(sport: string | null) {
  return BET_CATALOG.filter(entry => entry.sport === (sport === 'NHL' ? 'NHL' : 'NFL'));
}

export function manualCatalogEntry(sport: string | null, id: string) {
  return catalogForSport(sport).find(entry => entry.id === id && entry.manualOpenable);
}

/**
 * A transparent starting price for catalog rows that have not been offered in
 * this game. This is deliberately a display default, not a stored bet: when
 * the live flow opens a bet, process-event applies the current game state (or
 * BDL's moneyline for Game Winner) and persists the resulting pair instead.
 */
export function defaultMultiplierFor(entry: BetCatalogEntry): string {
  if (entry.id === 'who_wins_game') return 'BDL live / 1.85 fallback';

  const fixed: Record<string, string> = {
    power_play: '2.00 / 1.55',
    q2_turnover: '2.60 / 1.45',
    will_drive_td: '2.20 / 1.65',
    red_zone_offense: '1.70 / 2.50',
    drive_ends_turnover: '3.20 / 1.35',
    hail_mary_attempt: '3.50 / 1.15',
    hail_mary_td: '3.50 / 1.15',
    will_trailing_team_tie: '2.20 / 1.85',
    hail_mary: '2.20 / 1.85',
    ot_winner: '2.80 / 2.80',
  };
  if (fixed[entry.id]) return fixed[entry.id];

  const yesProbability: Record<string, number> = {
    will_go_ot: 0.17,
    will_defensive_td: 0.10,
    td_in_q1: 0.68,
    will_drive_score: 0.38,
    drive_reaches_redzone: 0.29,
    first_down_conv: 0.62,
    milestone_100_rush_yards: 0.34,
    milestone_100_rec_yards: 0.34,
    milestone_300_pass_yards: 0.27,
    multi_touchdown_scorer: 0.19,
    goal_in_1st: 0.78,
    goes_to_shootout: 0.08,
    will_penalty_shot_score: 0.31,
    will_delayed_penalty_goal: 0.12,
  };
  const decimal = (probability: number) => Math.max(1.1, Math.min(8, Math.round((0.92 / probability) * 100) / 100)).toFixed(2);

  if (entry.options === 'TD / FG') return '1.44 / 2.56';
  if (entry.options === 'GOAL / SAVE') return '2.97 / 1.33';
  if (entry.options === 'Home / away' || entry.options === 'QB / QB') return '1.77 / 1.92';
  if (entry.options === 'YES / NO' && yesProbability[entry.id] != null) {
    const yes = yesProbability[entry.id];
    return `${decimal(yes)} / ${decimal(1 - yes)}`;
  }
  // The v1 model treats remaining even choices as genuinely even until a
  // live state gives it a reason to move them.
  return '1.84 / 1.84';
}

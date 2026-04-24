/**
 * Default email templates for Big Tipping.
 * These are seeded for each tenant when they are created.
 * Placeholders use {{snake_case}} syntax.
 */

export interface TemplateDefault {
  templateKey: string;
  recipientRole: "admin" | "entrant";
  name: string;
  triggerDesc: string;
  subject: string;
  bodyHtml: string;
}

export const EMAIL_TEMPLATE_DEFAULTS: TemplateDefault[] = [
  // ── Admin Templates ────────────────────────────────────────────────────────

  {
    templateKey: "admin_round_starting",
    recipientRole: "admin",
    name: "Round Starting Soon",
    triggerDesc: "Sent 4 hours before the first match of the round",
    subject: "Round {{round_number}} starts soon – {{competition_name}}",
    bodyHtml: `
<h2 style="margin:0 0 16px;color:#1f2937;">Round {{round_number}} is about to start</h2>
<p>Hi {{user_name}},</p>
<p>Just a heads-up — the first game of <strong>Round {{round_number}}</strong> in <strong>{{competition_name}}</strong> kicks off in approximately 4 hours.</p>
<p>Here's a quick summary of where things stand:</p>
<ul>
  <li>Tips submitted so far: <strong>{{tips_submitted}}</strong> of {{active_entrants}} entrants</li>
  <li>Round closes: <strong>{{round_close_time}}</strong></li>
</ul>
<p>Log in to your admin dashboard to check the latest activity.</p>
<p style="margin-top:24px;">
  <a href="{{leaderboard_url}}" class="btn">View Dashboard</a>
</p>`,
  },

  {
    templateKey: "admin_round_scored",
    recipientRole: "admin",
    name: "Round Scored & Ladder Updated",
    triggerDesc: "Sent when round scoring is completed",
    subject: "Round {{round_number}} results are in – {{competition_name}}",
    bodyHtml: `
<h2 style="margin:0 0 16px;color:#1f2937;">Round {{round_number}} has been scored</h2>
<p>Hi {{user_name}},</p>
<p>Round {{round_number}} of <strong>{{competition_name}}</strong> has been scored and the leaderboard has been updated.</p>
<p>
  <a href="{{leaderboard_url}}" class="btn">View Leaderboard</a>
</p>`,
  },

  {
    templateKey: "admin_round_winner",
    recipientRole: "admin",
    name: "Round Winner Announcement",
    triggerDesc: "Sent when round scoring determines the weekly winner",
    subject: "Weekly winner for Round {{round_number}} – {{winner_name}}",
    bodyHtml: `
<h2 style="margin:0 0 16px;color:#1f2937;">🏆 Round {{round_number}} Winner</h2>
<p>Hi {{user_name}},</p>
<p>The weekly winner for <strong>Round {{round_number}}</strong> in <strong>{{competition_name}}</strong> is:</p>
<div style="background:#f9fafb;border-left:4px solid #F5A623;padding:16px 20px;border-radius:4px;margin:16px 0;">
  <p style="margin:0;font-size:20px;font-weight:700;color:#1f2937;">{{winner_name}}</p>
  <p style="margin:4px 0 0;color:#6b7280;">Score: {{winner_score}} correct tips &nbsp;|&nbsp; Margin: {{margin}}</p>
  <p style="margin:4px 0 0;color:#6b7280;">Prize: {{prize_description}}</p>
</div>
<p>Remember to arrange prize fulfilment with the winner. Their contact details are available in your admin dashboard.</p>
<p style="margin-top:24px;">
  <a href="{{leaderboard_url}}" class="btn">View Full Leaderboard</a>
</p>`,
  },

  {
    templateKey: "admin_draw_match",
    recipientRole: "admin",
    name: "Draw Match Impact",
    triggerDesc: "Sent when a game ends in a draw",
    subject: "Draw detected: {{team_a}} vs {{team_b}} – {{competition_name}}",
    bodyHtml: `
<h2 style="margin:0 0 16px;color:#1f2937;">Draw Alert – {{team_a}} vs {{team_b}}</h2>
<p>Hi {{user_name}},</p>
<p>The match between <strong>{{team_a}}</strong> and <strong>{{team_b}}</strong> in Round {{round_number}} of <strong>{{competition_name}}</strong> has ended in a <strong>draw</strong>.</p>
<p><strong>Impact on scoring:</strong> Tips for either team in this match will be marked as incorrect. No entrant will receive a point for this fixture.</p>
<p><strong>Impact on the weekly prize:</strong> The draw reduces the maximum possible score for this round. Please review the leaderboard to assess any impact on the current weekly prize standings.</p>
<p style="margin-top:24px;">
  <a href="{{leaderboard_url}}" class="btn">View Leaderboard</a>
</p>`,
  },

  {
    templateKey: "admin_weekly_digest",
    recipientRole: "admin",
    name: "Weekly Engagement Digest",
    triggerDesc: "Sent 24 hours after round scoring is completed, with real engagement stats",
    subject: "Big Tipping weekly digest – {{competition_name}}",
    bodyHtml: `
<h2 style="margin:0 0 16px;color:#1f2937;">Your weekly digest</h2>
<p>Hi {{user_name}},</p>
<p>Here's your engagement summary for <strong>{{competition_name}}</strong>:</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0;">
  <tr>
    <td style="padding:12px;background:#f9fafb;border-radius:4px;text-align:center;width:25%;">
      <div style="font-size:28px;font-weight:700;color:#2B4EAE;">{{active_entrants}}</div>
      <div style="font-size:12px;color:#6b7280;margin-top:4px;">Active Entrants</div>
    </td>
    <td style="width:4%;"></td>
    <td style="padding:12px;background:#f9fafb;border-radius:4px;text-align:center;width:25%;">
      <div style="font-size:28px;font-weight:700;color:#2B4EAE;">{{tips_submitted}}</div>
      <div style="font-size:12px;color:#6b7280;margin-top:4px;">Tips This Round</div>
    </td>
    <td style="width:4%;"></td>
    <td style="padding:12px;background:#f9fafb;border-radius:4px;text-align:center;width:25%;">
      <div style="font-size:28px;font-weight:700;color:#2B4EAE;">{{open_rate}}</div>
      <div style="font-size:12px;color:#6b7280;margin-top:4px;">Email Open Rate</div>
    </td>
    <td style="width:4%;"></td>
    <td style="padding:12px;background:#f9fafb;border-radius:4px;text-align:center;width:25%;">
      <div style="font-size:28px;font-weight:700;color:#C8521A;">{{bounce_rate}}</div>
      <div style="font-size:12px;color:#6b7280;margin-top:4px;">Bounce Rate</div>
    </td>
  </tr>
</table>
<p style="margin-top:24px;">
  <a href="{{leaderboard_url}}" class="btn">View Dashboard</a>
</p>`,
  },

  // ── Entrant Templates ──────────────────────────────────────────────────────

  {
    templateKey: "entrant_join_confirmation",
    recipientRole: "entrant",
    name: "Competition Join Confirmation",
    triggerDesc: "Sent immediately when an entrant joins a competition",
    subject: "Welcome to {{competition_name}}! 🎉",
    bodyHtml: `
<h2 style="margin:0 0 16px;color:#1f2937;">You're in! Welcome to {{competition_name}}</h2>
<p>Hi {{user_name}},</p>
<p>You've successfully joined <strong>{{competition_name}}</strong>. Get ready for a great season of tipping!</p>
<p>Here's what to expect:</p>
<ul>
  <li>Each round, you'll receive a reminder to submit your tips before the deadline</li>
  <li>After each round is scored, you'll get your results and updated leaderboard position</li>
  <li>Win prizes for topping the weekly leaderboard or achieving special milestones</li>
</ul>
<p>Head to the platform now to check out the current round and get your tips in early.</p>
<p style="margin-top:24px;">
  <a href="{{tips_url}}" class="btn">Submit My Tips</a>
</p>`,
  },

  {
    templateKey: "entrant_tips_closing_24h",
    recipientRole: "entrant",
    name: "Tips Closing Reminder (24 hours)",
    triggerDesc: "Sent 24 hours before the first game of the round",
    subject: "⏰ Round {{round_number}} tips close in 24 hours!",
    bodyHtml: `
<h2 style="margin:0 0 16px;color:#1f2937;">Round {{round_number}} tips close in 24 hours</h2>
<p>Hi {{user_name}},</p>
<p>Don't forget — your tips for <strong>Round {{round_number}}</strong> of <strong>{{competition_name}}</strong> must be submitted before the first game kicks off.</p>
<p><strong>Deadline:</strong> {{round_close_time}}</p>
<h3 style="margin:20px 0 12px;color:#374151;">This round's fixtures:</h3>
<p style="color:#6b7280;font-size:14px;">{{games_list}}</p>
<p style="margin-top:24px;">
  <a href="{{tips_url}}" class="btn">Submit My Tips Now</a>
</p>`,
  },

  {
    templateKey: "entrant_tips_closing_2h",
    recipientRole: "entrant",
    name: "Tips Closing Reminder (2 hours)",
    triggerDesc: "Sent 2 hours before the first game of the round — only to entrants who have not yet submitted tips",
    subject: "⚠️ Last chance! Round {{round_number}} tips close in 2 hours",
    bodyHtml: `
<h2 style="margin:0 0 16px;color:#C8521A;">⚠️ 2 hours left to submit your tips!</h2>
<p>Hi {{user_name}},</p>
<p>This is your final reminder — Round {{round_number}} of <strong>{{competition_name}}</strong> closes in approximately <strong>2 hours</strong>.</p>
<p>You haven't submitted your tips yet. Don't miss out!</p>
<p style="margin-top:24px;">
  <a href="{{tips_url}}" class="btn" style="background:#C8521A;">Submit My Tips Now</a>
</p>`,
  },

  {
    templateKey: "entrant_tips_closing_4h",
    recipientRole: "entrant",
    name: "Tips Closing Soon (4 hours)",
    triggerDesc: "Sent 4 hours before the first game — only if entrant has not yet submitted tips",
    subject: "⏳ Last chance – Round {{round_number}} tips close in 4 hours",
    bodyHtml: `
<h2 style="margin:0 0 16px;color:#C8521A;">Last chance to tip!</h2>
<p>Hi {{user_name}},</p>
<p>You haven't submitted your tips for <strong>Round {{round_number}}</strong> yet, and the first game is just 4 hours away.</p>
<p><strong>First game:</strong> {{team_a}} vs {{team_b}}</p>
<p><strong>Deadline:</strong> {{round_close_time}}</p>
<p style="margin-top:24px;">
  <a href="{{tips_url}}" class="btn" style="background:#C8521A;">Submit My Tips Now</a>
</p>`,
  },

  {
    templateKey: "entrant_round_results",
    recipientRole: "entrant",
    name: "Your Round Results",
    triggerDesc: "Sent when round scoring is completed",
    subject: "Your results for Round {{round_number}} – {{competition_name}}",
    bodyHtml: `
<h2 style="margin:0 0 16px;color:#1f2937;">Round {{round_number}} Results</h2>
<p>Hi {{user_name}},</p>
<p>Round {{round_number}} of <strong>{{competition_name}}</strong> has been scored. Here are your results:</p>
<div style="background:#f9fafb;border-radius:8px;padding:20px;margin:16px 0;text-align:center;">
  <div style="font-size:40px;font-weight:700;color:#2B4EAE;">{{score}}/{{total}}</div>
  <div style="color:#6b7280;margin-top:4px;">correct tips this round</div>
</div>
<table class="results">
  <thead>
    <tr>
      <th>Match</th>
      <th>Your Pick</th>
      <th>Result</th>
      <th></th>
    </tr>
  </thead>
  <tbody>
    {{results_table_rows}}
  </tbody>
</table>
<p style="margin-top:24px;">
  <a href="{{leaderboard_url}}" class="btn">View Leaderboard</a>
</p>`,
  },

  {
    templateKey: "entrant_weekly_winner",
    recipientRole: "entrant",
    name: "You're the Weekly Winner!",
    triggerDesc: "Sent when the entrant wins the weekly prize",
    subject: "🏆 Congratulations – you won the weekly prize!",
    bodyHtml: `
<h2 style="margin:0 0 16px;color:#F5A623;">🏆 You're this week's winner!</h2>
<p>Hi {{user_name}},</p>
<p>Congratulations — you've topped the leaderboard for <strong>Round {{round_number}}</strong> of <strong>{{competition_name}}</strong>!</p>
<div style="background:#fffbeb;border:2px solid #F5A623;border-radius:8px;padding:20px;margin:16px 0;text-align:center;">
  <div style="font-size:32px;font-weight:700;color:#1f2937;">{{score}}/{{total}}</div>
  <div style="color:#6b7280;margin-top:4px;">correct tips</div>
  <div style="margin-top:12px;font-size:16px;font-weight:600;color:#C8521A;">Prize: {{prize_description}}</div>
</div>
<p>The competition organiser will be in touch to arrange your prize. Well done!</p>
<p style="margin-top:24px;">
  <a href="{{leaderboard_url}}" class="btn">View Leaderboard</a>
</p>`,
  },

  {
    templateKey: "entrant_leaderboard_milestone",
    recipientRole: "entrant",
    name: "Leaderboard Milestone",
    triggerDesc: "Sent when entrant reaches a new rank milestone (Top 10, 20, 50)",
    subject: "You've reached {{rank}} place on the leaderboard! 🎯",
    bodyHtml: `
<h2 style="margin:0 0 16px;color:#1f2937;">You've hit a new milestone! 🎯</h2>
<p>Hi {{user_name}},</p>
<p>Great tipping! You've climbed to <strong>{{rank}} place</strong> on the <strong>{{competition_name}}</strong> leaderboard.</p>
<p>Keep it up — the top spot is within reach.</p>
<p style="margin-top:24px;">
  <a href="{{leaderboard_url}}" class="btn">View Leaderboard</a>
</p>`,
  },

  {
    templateKey: "entrant_perfect_round",
    recipientRole: "entrant",
    name: "Perfect Round Alert",
    triggerDesc: "Sent when entrant tips all games correctly in a round",
    subject: "🔥 Perfect round! You tipped every game correctly.",
    bodyHtml: `
<h2 style="margin:0 0 16px;color:#16a34a;">🔥 Perfect Round!</h2>
<p>Hi {{user_name}},</p>
<p>Incredible tipping — you got <strong>every single game correct</strong> in Round {{round_number}} of <strong>{{competition_name}}</strong>!</p>
<div style="background:#f0fdf4;border:2px solid #16a34a;border-radius:8px;padding:20px;margin:16px 0;text-align:center;">
  <div style="font-size:40px;font-weight:700;color:#16a34a;">{{score}}/{{total}}</div>
  <div style="color:#15803d;margin-top:4px;font-weight:600;">Perfect Score!</div>
</div>
<p>You've earned a perfect round bonus. Check the leaderboard to see your updated position.</p>
<p style="margin-top:24px;">
  <a href="{{leaderboard_url}}" class="btn">View Leaderboard</a>
</p>`,
  },

  {
    templateKey: "entrant_streak_milestone",
    recipientRole: "entrant",
    name: "Streak Milestone",
    triggerDesc: "Sent when entrant achieves a streak of 5, 10, or more correct tips in a row",
    subject: "Unstoppable! {{streak_count}} correct tips in a row 🔥",
    bodyHtml: `
<h2 style="margin:0 0 16px;color:#C8521A;">You're on fire! 🔥</h2>
<p>Hi {{user_name}},</p>
<p>You've just hit <strong>{{streak_count}} correct tips in a row</strong> in <strong>{{competition_name}}</strong>. That's an incredible streak!</p>
<p>Keep the momentum going — submit your tips for the next round and extend your streak even further.</p>
<p style="margin-top:24px;">
  <a href="{{tips_url}}" class="btn">Submit Next Round's Tips</a>
</p>`,
  },
];

/**
 * Available placeholders per template key — shown in the admin customise modal.
 */
export const TEMPLATE_PLACEHOLDERS: Record<string, string[]> = {
  admin_round_starting:    ["user_name", "competition_name", "round_number", "tips_submitted", "active_entrants", "round_close_time", "leaderboard_url"],
  admin_round_scored:      ["user_name", "competition_name", "round_number", "leaderboard_url"],
  admin_round_winner:      ["user_name", "competition_name", "round_number", "winner_name", "winner_score", "margin", "prize_description", "leaderboard_url"],
  admin_draw_match:        ["user_name", "competition_name", "round_number", "team_a", "team_b", "leaderboard_url"],
  admin_weekly_digest:     ["user_name", "competition_name", "active_entrants", "tips_submitted", "open_rate", "bounce_rate", "leaderboard_url"],
  entrant_join_confirmation: ["user_name", "competition_name", "tips_url"],
  entrant_tips_closing_24h:  ["user_name", "competition_name", "round_number", "round_close_time", "games_list", "tips_url"],
  entrant_tips_closing_2h:   ["user_name", "competition_name", "round_number", "tips_url"],
  entrant_tips_closing_4h:   ["user_name", "competition_name", "round_number", "round_close_time", "team_a", "team_b", "tips_url"],
  entrant_round_results:     ["user_name", "competition_name", "round_number", "score", "total", "results_table_rows", "leaderboard_url"],
  entrant_weekly_winner:     ["user_name", "competition_name", "round_number", "score", "total", "prize_description", "leaderboard_url"],
  entrant_leaderboard_milestone: ["user_name", "competition_name", "rank", "leaderboard_url"],
  entrant_perfect_round:     ["user_name", "competition_name", "round_number", "score", "total", "leaderboard_url"],
  entrant_streak_milestone:  ["user_name", "competition_name", "streak_count", "tips_url"],
};

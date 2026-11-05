# Moneyfi Gamification Plan

## Purpose

Encourage useful, sustainable financial habits and help users make progress toward their own goals. Gamification should make Moneyfi feel supportive, not competitive or judgmental.

## Product principles

- Reward planning, awareness, and consistency—not spending, account balances, or app opens.
- Keep participation optional. Users can dismiss prompts and use the core app without engaging with rewards.
- Celebrate progress without punishing missed days or setbacks.
- Keep achievements private by default; do not compare users or expose financial details.
- Respect currencies: show goals and progress in the goal's currency, and do not combine unlike currencies.
- Use clear, calm language. Avoid shame, pressure, and claims that Moneyfi provides financial advice.

## Proposed experience

### 1. Personal financial goals

Let a user create a goal with a name, target amount, currency, and optional target date. Show progress toward the target and allow the user to update progress when they update an account balance. Make clear that progress is based on user-entered information and is not an account transfer or a promise of future returns.

Examples include an emergency fund, a planned purchase, or a trip. A goal should be useful without requiring the user to connect a bank account.

### 2. Milestones and recognition

Show small, private acknowledgments for meaningful actions and milestones, such as:

- Creating a first budget or savings goal.
- Reviewing a goal or budget.
- Logging transactions consistently over time.
- Reaching a user-defined goal milestone.

Recognition should describe the action or progress, not judge the user's financial situation. Avoid streak resets, loss-aversion mechanics, leaderboards, and rewards based on spending less in isolation.

### 3. Optional, actionable prompts

Offer dismissible prompts that help users act on information already in Moneyfi, for example reviewing a category that is nearing its budget or checking an upcoming bill reminder. Do not send notifications unless the user explicitly opts in.

## Delivery plan

### Phase 1: Goals MVP

- Add optional personal goals with a name, target amount, currency, and optional target date.
- Show goal progress and a small set of user-defined milestones.
- Let users edit, pause, complete, or remove a goal.
- Keep goal progress separate from account balances; do not move money or imply that a goal is a separate account.
- Add basic privacy and data ownership protections consistent with existing personal finance data.

### Phase 2: Habit recognition

- Add a small set of private badges for deliberate planning and consistent record keeping.
- Make achievements informational and forgiving; never remove earned recognition after a missed day or a change in circumstances.
- Allow users to hide or disable the recognition UI.

### Phase 3: Helpful nudges

- Add optional in-app prompts for actionable budget, goal, and bill-reminder follow-ups.
- Provide dismiss, snooze, and opt-out controls.
- Consider push or email notifications only if users request them and notification preferences and delivery safeguards are designed.

### Phase 4: Evaluate and refine

- Gather opt-in user feedback and measure whether goals and prompts help users return to their plans.
- Review accessibility, privacy, and potential unintended pressure before expanding rewards.
- Remove mechanics that increase anxiety or engagement without helping users make informed progress.

## Success measures

- Goal creation and completion rates, interpreted alongside user feedback.
- Whether users return to update goals or review budgets over time.
- Prompt usefulness and dismissal/opt-out rates.
- User-reported clarity, motivation, and pressure.

Do not optimize for daily opens, time spent in the app, transaction volume, or reduced spending alone. Those measures can reward unhealthy or misleading behavior.

## Out of scope

- Public leaderboards or comparisons of balances, net worth, savings, or spending.
- Cash prizes, paid rewards, or financial incentives tied to transactions.
- Penalties, broken-streak messaging, or shame-based copy.
- Encouraging users to reduce necessary spending or take investment risks.
- Automatic transfers or account actions as part of a game mechanic.

## Recommended starting point

Build Phase 1 first: one optional, private savings-goal experience with clear progress and milestones. It addresses a meaningful gap in the current planning features and creates a sound foundation for any later recognition.

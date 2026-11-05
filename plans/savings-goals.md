# Savings Goals Plan

## Purpose

Help users plan for a future expense or savings target and see progress using the balances they track in Moneyfi, without implying that Moneyfi moves or holds their money.

## Current gap

Moneyfi tracks account balances, balance history, budgets, and recurring cashflows, but has no apparent personal savings-goal feature.

## Proposed experience

- Let a user create a goal with a name, target amount, currency, and optional target date.
- Show goal progress and milestones in the goal's currency.
- In the initial release, let the user manually record progress; associating account balances with goals is a later consideration.
- Support editing, pausing, completing, and deleting goals.
- Keep goals optional and private to their owner.

## MVP scope

- One or more user-owned goals.
- Target amount and currency, with optional target date.
- Manual progress updates and a clear progress display.
- User-defined milestones or a small set of simple percentage milestones.
- No automatic transfers, linked-account requirements, interest forecasts, or investment recommendations.

## Later considerations

- Progress allocation across multiple accounts.
- Goal history and completed-goal archive.
- Optional reminders to review a goal.
- Goal milestones that can be used by the separate gamification experience.

## Risks and safeguards

- Do not imply that goal progress represents cash set aside or funds protected from spending.
- Avoid combining amounts across currencies unless a transparent, user-selected exchange-rate approach exists.
- Do not shame users for missed dates or reduced balances.
- Protect goal data with the same user ownership and row-level access controls as other financial data.

## Success measures

- Goal creation and update rates.
- Percentage of users who return to review or update a goal.
- Goal completion and pause rates, interpreted with user feedback.
- User understanding of the difference between a tracked goal and a separate bank balance.

## Recommended first release

Start with simple, manually maintained goals that explain progress clearly and never trigger financial actions.

## Implementation status

The initial goal tracker is implemented in the Planning page with manual progress, percentage milestones, optional target dates, and active/paused/completed states. Apply the `010_savings_goals` Supabase migration before using it with the hosted project.

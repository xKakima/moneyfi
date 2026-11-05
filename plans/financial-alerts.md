# Financial Alerts Plan

## Purpose

Help users notice upcoming bills and budget thresholds in time to review them, without creating pressure or implying that Moneyfi can see activity it does not track.

## Current gap

Moneyfi stores recurring income and bill reminders and shows monthly budget progress. These are currently in-app planning features, not proactive notifications.

## MVP scope

- Add optional, dismissible in-app notices for upcoming recurring cashflows.
- Add optional in-app notices when a recorded category approaches or exceeds its monthly budget.
- Make thresholds and timing understandable, and avoid implying unrecorded transactions have been detected.
- Provide controls to dismiss notices and disable each alert type.
- Avoid external notifications in the initial release.

## Later considerations

- User-configurable lead times and thresholds.
- Opt-in email or push notifications, only after preference management and delivery safeguards are designed.
- Snooze controls and notification history.
- Timezone-aware scheduling if scheduled delivery is introduced.

## Risks and safeguards

- Never claim a bill has been paid or a budget is exceeded based on data that is not present.
- Avoid repeated, alarming, or shame-based messages.
- Respect opt-out and dismissal choices.
- Minimize sensitive details in lock-screen notifications if external channels are added.
- Account for multiple currencies and users' local dates.

## Success measures

- Alert usefulness ratings and action rates.
- Dismissal, snooze, and opt-out rates.
- Missed or duplicate alert reports.

## Recommended first release

Use low-frequency, in-app-only prompts for due bills and budget thresholds, with clear settings and no push or email.

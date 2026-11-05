# Moneyfi RPG Gamification Plan

## Vision

Make managing money feel like a personal, low-pressure adventure. The user is the hero; their real-life financial priorities are the story. Quests guide users toward useful actions in Moneyfi, while experience and cosmetic rewards make progress visible. The RPG layer is optional and never affects core finance features.

The experience should feel cozy and encouraging rather than competitive, grind-heavy, or designed to maximize app opens.

## Product principles

- Opt in from Settings; keep the existing default-off behavior.
- Reward intentional planning and understanding, never spending, income, balances, or the number of transactions.
- Keep all progress private. No leaderboards, public profiles, or social comparison in the first release.
- Never punish missed days, paused goals, financial setbacks, or turning the feature off.
- Do not require bank linking, notifications, or daily attendance.
- Use cosmetic rewards only. XP and levels have no cash value and cannot unlock financial products or change account behavior.
- Clearly distinguish self-reported goal progress from verified balances. Nothing in the game moves money or gives financial advice.
- Support reduced motion, keyboard navigation, screen readers, and clear text alternatives to game visuals.

## Player experience

### The setting

The user and a small original companion share a private garden that represents their financial journey. Both the character and companion gain their own XP and levels from mini-quests. The garden is the home for the RPG layer and can later grow through cosmetic items and story moments. Keep visuals lightweight and aligned with Moneyfi's existing design; avoid making the finance dashboard feel like a full-screen game. Use original names and artwork rather than recognizable characters from existing franchises.

### Core loop

1. The player opens the Garden and chooses a suggested quest or a personal quest tied to a goal.
2. The quest describes a concrete, helpful action and its expected effort.
3. Moneyfi recognizes completion only when it can reliably observe the action or the user explicitly confirms it.
4. The player and companion each receive modest XP and an encouraging message.
5. Separate XP tracks advance their levels; levels unlock cosmetic garden choices, not financial features.

Quests should be completable in a short session, have a clear finish state, and never require repeated app opens to maintain progress.

### Quest categories

**Story quests (one-time onboarding and learning)**

- Plant your first savings goal.
- Make a first budget for a category you choose.
- Add a recurring bill or income reminder.
- Explore how account balances and net worth are represented.

**Stewardship quests (optional, repeatable reviews)**

- Review this month's budget and adjust it if your plans changed.
- Check an upcoming bill reminder and confirm whether it is still accurate.
- Review recent transactions and correct a category if needed.
- Check a savings goal and update its self-reported progress if appropriate.

Repeatable review quests should be available on a weekly or monthly cadence, not every day. Repeating an action must not become a requirement for keeping XP or garden progress.

**Personal quests (user-defined intentions)**

- Let the user name a quest and optionally link it to an existing savings goal.
- Allow users to set a target date or no date, pause, edit, complete, or delete it.
- Personal quests may show progress from an existing goal but should not imply that Moneyfi verifies the underlying funds.

Do not create quests that ask users to buy something, avoid necessary spending, meet an arbitrary savings amount, enter more transactions, or connect a financial account.

## Progression and rewards

- Use separate character and companion XP as a simple, cumulative record of completed quests; do not remove XP.
- Award XP per completed quest, with a modest cap on repeatable quest rewards per period to limit farming.
- Show level thresholds and the next cosmetic reward clearly. Avoid opaque loot boxes, random paid rewards, or pay-to-progress mechanics.
- Level-ups can unlock garden decorations, plant varieties, color themes, or short narrative entries.
- Keep savings-goal percentage milestones distinct from RPG XP: goal progress reflects the user's entered amount, while XP reflects completed planning/review actions. Do not award extra XP for larger balances or contributions.
- Do not use streaks in the MVP. If a later experiment adds continuity indicators, they must never reset, remove rewards, or use guilt-based language.

## First release scope

### MVP: Quest board and dual progression

1. Keep Garden quests opt-in in Settings, default off, and account-persisted.
2. Add a small curated quest board with one story quest and weekly/monthly stewardship reviews.
3. Define eligibility, completion, reward, and repeat cadence for every curated quest.
4. Add private, separate XP totals and levels for the player's character and companion. Preserve progression when the user edits or pauses a financial goal.
5. Store quest state and XP changes in an auditable, owner-scoped way. Prevent duplicate completion awards, including retries and concurrent requests.
6. Let users hide/disable quests without losing progression; provide a separate way to delete game progress without deleting financial data.
7. Keep quest copy calm and specific; explain when completion is self-confirmed versus detected from app data.

### Later phases

**Phase 2: More story and customization**

- Add optional chapter themes and additional non-financial cosmetics.
- Let users choose between a small number of calm visual styles.
- Add user-created personal quests, with optional links to savings goals.
- Gather opt-in feedback before adding more mechanics.

**Phase 3: Carefully evaluated reminders**

- Consider in-app reminders for an incomplete, useful quest.
- Make reminders dismissible, snoozable, and separately controllable.
- Do not add push or email notifications without an explicit user setting and a clear delivery design.

Do not add social competition, paid items, cash rewards, penalties, or automated financial actions in these phases.

## Data and behavior design notes

The initial implementation already has an account-level `gamification_enabled` preference. The RPG board adds a character and companion with separate quest-earned XP and levels.

The first quest implementation uses a fixed catalog and server-side Supabase functions:

- The database verifies the signed-in user, opt-in preference, required underlying finance record, quest cadence, and fixed character/pet XP awards.
- Completion rows are owner-scoped and unique per quest period; the browser cannot write completions or arbitrary XP totals.
- Review quests are self-confirmed. The database checks that at least one relevant item exists, not that the user performed a particular review action.
- Quest copy and reward values are mirrored in the UI and database. Keep them synchronized when changing the catalog.
- Deleting game progress must not delete savings goals, budgets, or transactions.
- Turning the feature off hides the RPG UI and stops quest prompts; current behavior retains progress.

Future quest catalog changes should be versioned so tuning copy or rewards does not silently rewrite a user's completed history. User-facing controls to rename/customize characters and delete RPG progress remain future work.

## Success measures

Evaluate usefulness, not engagement for its own sake:

- Quest start-to-completion rate by quest type.
- Whether users report that quests helped them understand or manage their plans.
- Quest dismissal, opt-out, and game-progress deletion rates.
- Accessibility issues and reports of pressure, guilt, or confusion.

Do not optimize for daily opens, time in app, transaction count, spending reduction, amount saved, or account linking. Review the experience for unintended pressure before expanding it.

## Out of scope

- Public leaderboards, multiplayer competition, or sharing financial progress.
- Cash prizes, paid progression, loot boxes, or rewards tied to purchases.
- Streak loss, decay, negative XP, missed-day penalties, or shame-based copy.
- Quests based on spending less, investing, borrowing, or meeting a prescribed savings amount.
- Automatic transfers, bill payments, trading, or other money movement.
- Requiring daily engagement, transaction entry, push notifications, or connected accounts.

## Current implementation

- Savings goals are available in Planning, with manually tracked progress, optional target dates, and active/paused/completed states.
- Garden quests can be enabled from signed-in Settings; the setting is off by default and stored per account.
- The Overview adventure board shows an original player character and pet, with separate XP/level tracks.
- Mini quests cover creating a savings goal and reviewing budgets, reminders, or recent activity. Completion is self-confirmed and database-limited to one-time, monthly, or weekly periods; an eligible underlying item must exist.
- Quest completions and XP awards are stored through owner-checked Supabase functions, not writable directly from the browser.
- Cosmetic inventory, character customization, user-created quests, and extended story chapters remain future work.

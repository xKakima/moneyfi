# Collaborative Budgeting Plan

## Purpose

Let trusted people coordinate their finances in Moneyfi, extending the current revocable, read-only overview sharing into optional shared planning.

## Current gap

Moneyfi lets an owner create revocable read-only overview links and optionally show account details to signed-in viewers. It does not appear to support shared editing of budgets or transaction tracking.

## Discovery questions

- Is the primary use case couples, families, caregivers, or another group?
- Should members see all shared accounts or only selected budgets and categories?
- Who can invite members, edit shared budgets, and remove access?
- Should shared data coexist with each member's private data?

## Possible MVP scope

- Create an explicitly named household or shared workspace.
- Invite signed-in members with clear roles and consent.
- Share selected budgets first, rather than automatically exposing all accounts and transactions.
- Provide owner-controlled access revocation and an audit-friendly membership view.
- Keep private personal data private unless a member deliberately shares it.

## Later considerations

- Shared transaction entry and categorization.
- Workspace-level recurring bills and goals.
- Member activity history and conflict resolution for simultaneous edits.
- Multiple workspaces per user, if user research supports it.

## Risks and safeguards

- Do not broaden the existing read-only share link into write access implicitly.
- Use explicit, revocable membership and narrow access policies.
- Keep a clear boundary between personal and shared records.
- Consider safety and coercion risks in household financial sharing; access must be easy to understand and revoke.
- Avoid public sharing and financial comparisons between members.

## Success measures

- Workspace creation and invited-member acceptance.
- Shared budget adoption and retention.
- Access revocation success and member-permission clarity.
- User-reported trust, safety, and coordination value.

## Recommended first release

Validate the household use case before implementation. If supported, begin with a small shared-budget workspace and explicit member permissions, separate from read-only overview links.

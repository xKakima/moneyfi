# Data Export Plan

## Purpose

Give users a straightforward way to retrieve and keep a copy of the financial information they entered in Moneyfi.

## Current gap

Moneyfi offers account and transaction views, but no apparent user-initiated data export.

## MVP scope

- Allow an authenticated user to export their own transactions and accounts as CSV.
- Include useful fields such as date, amount, currency, category, notes, account name, and transaction type.
- Clearly distinguish account balances from transaction records and balance adjustments.
- Provide an export preview or a concise description of included data before download.
- Keep exports in a format usable by spreadsheet applications without executing untrusted formulas.

## Later considerations

- Export budgets, recurring cashflow reminders, balance history, and savings goals as separate files.
- Add JSON export for structured backups.
- Support date ranges and selected account filters.
- Add a user-requested full-data archive, with an explicit scope and lifecycle.

## Risks and safeguards

- Apply strict user ownership checks to every exported dataset.
- Avoid including share tokens, credentials, or data belonging to another user.
- Protect spreadsheet users from CSV formula injection by safely encoding untrusted text fields.
- Avoid logging exported financial content.
- Explain the date range, timezone, and fields included.

## Success measures

- Export completion and failure rates.
- User-reported ability to open and reuse the exported file.
- Support requests about missing, misformatted, or unexpected data.

## Recommended first release

Provide a simple authenticated CSV export for accounts and transactions, with clear scope and safe spreadsheet handling.

# Transaction Import Plan

## Purpose

Make it faster to start using Moneyfi and maintain accurate transaction history by importing transactions from files users already have.

## Current gap

Moneyfi supports manual transaction entry and history search, but no apparent transaction import. Bank connectivity is a separate, higher-complexity feature covered by [bank-sync.md](./bank-sync.md).

## MVP scope

- Import a documented CSV format with date, amount, transaction type, and optional category, notes, currency, and account.
- Provide a column-mapping and preview step before writing any data.
- Validate rows and show row-specific errors without silently discarding data.
- Let the user select an account or import transactions without an account.
- Require explicit confirmation before saving.
- Prevent accidental repeat imports where practical, and explain how duplicates are handled.

## Later considerations

- Templates for common bank export formats.
- OFX or other formats only after a clear user need and parser security review.
- Import rollback or a review queue for correcting imported rows.
- Reusable mapping profiles, stored only with clear user consent.

## Risks and safeguards

- Treat uploaded files as untrusted input; enforce file type and size limits and parse safely.
- Do not execute spreadsheet formulas or render untrusted cell contents as markup.
- Avoid silently changing dates, signs, currencies, or transaction types.
- Report rejected rows and import outcomes accurately.
- Never ask users to upload bank login credentials.

## Success measures

- Successful imports and row-level validation outcomes.
- Time to complete an import.
- Duplicate and correction rates.
- User-reported confidence that imported data was mapped correctly.

## Recommended first release

Support CSV only, with preview, explicit mapping, clear validation, and confirmation before data is saved.

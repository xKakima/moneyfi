# Financial Reports Plan

## Purpose

Help users understand their financial activity over time, extending Moneyfi's existing overview and balance-history views with useful, clear summaries.

## Current gap

Moneyfi already shows balances by account type, net worth, recent transactions, and balance movement. It has monthly category budgets, but no apparent dedicated reports for spending breakdowns, cashflow trends, or period comparisons.

## MVP scope

- Add a reports view for spending and income over a selected time period.
- Break down recorded expenses by user-entered category and currency.
- Compare the selected period with a comparable prior period.
- Make the data source and any exclusions visible; reports reflect only transactions entered in Moneyfi.
- Handle uncategorized transactions explicitly rather than hiding them.

## Later considerations

- Net-worth history by currency, using balance snapshots.
- Monthly cashflow summaries and recurring-versus-one-time breakdowns.
- Trends by account and category.
- Export a report after the data-export feature is available.

## Risks and safeguards

- Do not combine different currencies into one total without a transparent conversion method.
- Distinguish account balance changes from transaction-based income and spending.
- Explain that missing or manually entered data can make reports incomplete.
- Use accessible charts and provide equivalent tabular summaries.
- Avoid presenting descriptive summaries as financial advice.

## Success measures

- Report visits and use of time-period filters.
- User-reported clarity and usefulness.
- Data discrepancy reports and corrections.

## Recommended first release

Start with a monthly income-and-expense report by category and currency, with an optional comparison to the previous month.

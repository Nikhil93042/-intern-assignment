# Bugs found

Keep this file in the repo and **commit it** with your fixes.

---

## Bug 1

**Bug:** Expense list displays oldest expenses first instead of newest first.

**Reproduction:** Open the app. The expense list header says “Newest first”, but the first row shown is Wine (7 Mar) while Board game (15 Mar) is further down.

**Expected:** Newest expenses (e.g. 15 Mar) should appear at the top of the list.

**Actual:** Oldest expenses (7 Mar) appeared at the top because `ExpenseList` sorted ascending by date.

**Root cause:** `ExpenseList.jsx` sorted with `dateValue(a.date) - dateValue(b.date)` (ascending) rather than descending.

**Fix:** Changed sorting to descending order (`dateValue(b.date) - dateValue(a.date)`) and updated `dateValue` in `src/lib/format.js` to return numerical timestamps for both `Date` objects and ISO strings.

---

## Bug 2

**Bug:** Balances panel status labels and badge styling are inverted.

**Reproduction:** Inspect the Balances panel for members with positive net balances (e.g. Ben Okonkwo who paid more than consumed). The UI displays `owes $...` in red. Conversely, members with negative balances who owe money are displayed as `is owed $...` in green.

**Expected:** Positive balance means the group owes this member (`is owed $...` with green `.owed` style); negative balance means this member owes the group (`owes $...` with red `.owe` style).

**Actual:** Positive balances were labeled as "owes" (red) and negative balances as "is owed" (green).

**Root cause:** In `BalancesPanel.jsx`, the conditional logic was inverted (`bal > 0.005` assigned `"owe"` / `"owes"`, while `bal < -0.005` assigned `"owed"` / `"is owed"`).

**Fix:** Corrected the conditional checks in `src/components/BalancesPanel.jsx` so that `bal > 0.005` renders `is owed ${formatMoney(bal)}` with class `"owed"`, and `bal < -0.005` renders `owes ${formatMoney(-bal)}` with class `"owe"`.

---

## Bug 3

**Bug:** Payers outside the split are penalized with an unowed consumption deduction.

**Reproduction:** Add an expense where the payer is not part of the split (e.g., Diya pays $60 for an Uber shared only by Aisha and Ben, or Alice pays $1,000 for a cab used only by Bob and Charlie). Inspect the calculated balances.

**Expected:** The payer should be credited the full amount paid (e.g. Alice is owed $1,000; Diya is owed $60), and non-participating payers should have 0 consumption deducted. Total group balances must sum to 0.

**Actual:** Diya's balance was reduced by $30, leaving her with an incorrect balance and causing group balances to sum to -$30 instead of 0.

**Root cause:** In `src/lib/balances.js`, an erroneous conditional `if (!(exp.paidBy in shares)...)` subtracted `amount / splitWith.length` from the payer's balance even though the payer was not in `splitWith`.

**Fix:** Removed the incorrect deduction block from `src/lib/balances.js` and converted balance computations to integer cents so balances always sum to zero.

---

## Bug 4

**Bug:** Settlement suggestions skip transactions when debt exactly matches credit.

**Reproduction:** Create a scenario where one person's debt equals another person's credit (e.g. Alice owes $50 and Bob is owed $50). Open the Settle Up panel.

**Expected:** The app should suggest "Alice pays Bob $50.00", resolving all balances to $0.00.

**Actual:** The Settle Up panel displayed "Everyone is settled." with 0 suggested transfers, leaving both parties unsettled.

**Root cause:** In `src/lib/settle.js`, the `else` branch of the `while` loop (triggered when `d.amount === c.amount`) incremented both debtor and creditor indices (`i += 1; j += 1;`) without pushing a transfer into the `transfers` array.

**Fix:** Refactored `suggestSettlements` in `src/lib/settle.js` to compute `settleCents = Math.min(d.cents, c.cents)`, push the transfer whenever `settleCents > 0`, deduct from both parties, and advance pointers when each person reaches 0.

---

## Bug 5

**Bug:** Equal splitting drops or invents pennies due to naive independent rounding.

**Reproduction:** Split $100 equally among 3 people. Inspect the resulting shares ($33.33 each, totaling $99.99, losing $0.01). Split $999 among 7 people ($142.71 each, losing $0.03).

**Expected:** The sum of all participant shares must equal the original expense amount exactly.

**Actual:** Cents/paise were dropped due to naive `.toFixed(2)` rounding on each share independently.

**Root cause:** `splitEqual` computed `Number((amount / n).toFixed(2))` and assigned it to every participant without allocating remainder cents.

**Fix:** In `src/lib/money.js`, refactored `splitEqual` to calculate in integer cents (`Math.floor(totalCents / n)`) and distribute remainder cents (`totalCents % n`) across participants so that `sum(shares) === amount`.

---

## Bug 6

**Bug:** Percentage splitting produces rounding drift and rejects valid 100% totals.

**Reproduction:**
1. Enter custom percentages totaling 100% (e.g. 33.33%, 33.33%, 33.34% or 0.1%, 0.2%, 99.7%). The form sometimes rejects them with "Percentages must add to 100."
2. Create an expense of $20 with percentages 33.33%, 33.33%, 33.34%. The resulting shares ($6.67 + $6.67 + $6.67 = $20.01) invent $0.01.

**Expected:** Valid 100% percentage splits should be accepted, and the calculated dollar shares must sum to the original expense amount exactly.

**Actual:** Floating point addition failed equality checks, and individual share rounding produced discrepancies.

**Root cause:** `percentsSumTo100` used exact equality `=== 100` subject to IEEE-754 floating point errors (`0.1 + 0.2 + 99.7 = 100.00000000000004`), and `splitByPercent` did not reconcile total distributed cents.

**Fix:** In `src/lib/money.js`, added epsilon tolerance (`Math.abs(sum - 100) < 0.001`) in `percentsSumTo100` and reconciled distributed cents in `splitByPercent` to match total cents.

---

## Bug 7

**Bug:** Deleting or editing an expense while the list is sorted or filtered modifies the wrong expense.

**Reproduction:** Filter the list by category "Fun" or search for a specific expense. Click "Delete" on the displayed expense or edit its amount. Clear the filters and inspect the expense list.

**Expected:** Only the selected expense should be deleted or edited.

**Actual:** A completely different expense in `state.expenses` was deleted or updated.

**Root cause:** `ExpenseList` passed the filtered/sorted array index to `onDeleteAt(index)` and `onUpdateAt(index, patch)`. The reducer sliced/spliced `state.expenses` by that index. Since filtered/sorted order differs from `state.expenses`, operations targeted the wrong item. Also, `key={index}` caused React state desynchronization.

**Fix:**
- Updated reducer in `src/state/store.js` to target expenses by `id` (`action.id`).
- Updated `ExpenseList.jsx` to pass `expense.id` to `onDelete` and `onUpdate`, and keyed rows by `key={expense.id}`.
- Synchronized `draft` input state in `ExpenseRow` with `expense.amount`.

---

## Bug 8

**Bug:** "Paid by" filter filters out all expenses due to string/number type mismatch.

**Reproduction:** Select any person in the "Paid by" dropdown in the Filter card.

**Expected:** Only expenses paid by that person should be displayed.

**Actual:** All expenses disappeared and the list displayed "No expenses match these filters."

**Root cause:** In `App.jsx`, `<select>` provided string values (e.g. `"1"`), but `e.paidBy` is stored as a number (`1`). Strict inequality `e.paidBy !== paidBy` (`1 !== "1"`) evaluated to `true` for all items.

**Fix:** In `src/App.jsx`, updated the comparison to `Number(e.paidBy) !== Number(paidBy)`.

---

## Bug 9

**Bug:** `localStorage` hydration fails to convert ISO date strings to `Date` objects.

**Reproduction:** Reload the page after saving expenses in `localStorage`. Expense dates render as raw ISO strings ("2026-03-12" instead of "12 Mar 2026") and date comparisons fail.

**Expected:** Reloaded expenses should have proper `Date` objects and display localized date formats.

**Actual:** `loadState` returned `JSON.parse(raw)` directly without hydration.

**Root cause:** `loadState` in `src/state/store.js` only called `hydrate()` on seed data, bypassing hydration when reading cached data from `localStorage`.

**Fix:** Updated `loadState` in `src/state/store.js` to return `hydrate(JSON.parse(raw))`, and made `formatDate` / `dateValue` in `src/lib/format.js` resilient to both `Date` objects and date strings.

---

## Bug 10

**Bug:** Summary card "Paid so far" list does not recompute when a new member is added.

**Reproduction:** In the Summary card, enter a name under "Add member" and click "Add". Inspect the "Paid so far" list.

**Expected:** The new member should immediately appear with $0.00 paid.

**Actual:** The new member did not appear in "Paid so far" until an expense was created or modified.

**Root cause:** In `src/components/SummaryCards.jsx`, the `perPerson` `useMemo` dependency array was `[expenses]`, omitting `members`.

**Fix:** Updated the `useMemo` dependency array to `[members, expenses]`.

---

## Bug 11

**Bug:** `AddExpenseForm` does not clear input fields on submission.

**Reproduction:** Fill out description and amount in "Add expense", then click "Save expense".

**Expected:** The description and amount input fields should clear for the next entry.

**Actual:** Input fields remained populated, leading to accidental duplicate expense submissions.

**Root cause:** `submit` in `AddExpenseForm.jsx` dispatched `onAdd` but did not reset component state variables `description` and `amount`.

**Fix:** In `src/components/AddExpenseForm.jsx`, reset `description` to `""`, `amount` to `""`, and `error` to `""` upon successful submit.


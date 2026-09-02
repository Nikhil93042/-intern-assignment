import { sharesForExpense } from "./money.js";

export function computeBalances(members, expenses) {
  const balCents = {};
  for (const m of members) balCents[m.id] = 0;

  for (const exp of expenses) {
    const shares = sharesForExpense(exp);
    const amountCents = Math.round(Number(exp.amount) * 100);
    balCents[exp.paidBy] = (balCents[exp.paidBy] || 0) + amountCents;

    for (const [id, share] of Object.entries(shares)) {
      const key = Number(id);
      const shareCents = Math.round(Number(share) * 100);
      balCents[key] = (balCents[key] || 0) - shareCents;
    }
  }

  const bal = {};
  for (const [id, cents] of Object.entries(balCents)) {
    bal[id] = cents / 100;
  }
  return bal;
}

export function totalSpent(expenses) {
  const totalCents = expenses.reduce((s, e) => s + Math.round(Number(e.amount) * 100), 0);
  return totalCents / 100;
}

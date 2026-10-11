import React, { useMemo } from 'react';
import { translations } from '../utils/translations';

export default function Settlement({ members = [], expenses = [], onClear, currency, lang, settledPairs = [], toggleSettledPair }) {
  const t = translations[lang] || translations.en;

  const totalGroupSpend = useMemo(() => {
    return expenses.reduce((sum, exp) => {
      const base = parseFloat(exp.amount) || 0;
      const tip = parseFloat(exp.tipAmount) || 0;
      return sum + base + tip;
    }, 0);
  }, [expenses]);

  const settlements = useMemo(() => {
    let balances = {};
    members.forEach(m => balances[m] = 0);

    expenses.forEach(exp => {
      const tip = parseFloat(exp.tipAmount) || 0;
      const baseAmount = parseFloat(exp.amount) || 0;
      const totalExpense = baseAmount + tip;

      // Payer calculations
      if (exp.payerMode === 'multiple' && exp.payerAmounts) {
        Object.keys(exp.payerAmounts).forEach(payer => {
          if (balances[payer] !== undefined) {
            balances[payer] += parseFloat(exp.payerAmounts[payer]) || 0;
          }
        });
      } else {
        if (balances[exp.paidBy] !== undefined) {
          balances[exp.paidBy] += totalExpense;
        }
      }

      // Itemized calculations with units
      if (exp.splitMode === 'itemized' && exp.items && exp.items.length > 0) {
        exp.items.forEach(item => {
          const itemPrice = parseFloat(item.price) || 0;
          const units = item.participantUnits || {};
          const totalUnits = Object.values(units).reduce((a, b) => a + (parseFloat(b) || 0), 0);

          if (totalUnits > 0) {
            Object.keys(units).forEach(p => {
              const memberUnits = parseFloat(units[p]) || 0;
              if (balances[p] !== undefined && memberUnits > 0) {
                balances[p] -= (itemPrice * memberUnits) / totalUnits;
              }
            });
          }
        });
      } else {
        const participants = exp.participants || [];
        const share = participants.length > 0 ? baseAmount / participants.length : 0;
        participants.forEach(p => {
          if (balances[p] !== undefined) balances[p] -= share;
        });
      }

      // Tip calculations
      if (tip > 0) {
        const tipMode = exp.tipMode || 'all';
        const tipAssignees = exp.tipAssignees || [];

        if (tipMode === 'individual' && tipAssignees.length === 1) {
          const person = tipAssignees[0];
          if (balances[person] !== undefined) balances[person] -= tip;
        } else if (tipMode === 'two' && tipAssignees.length === 2) {
          const tipShare = tip / 2;
          tipAssignees.forEach(p => {
            if (balances[p] !== undefined) balances[p] -= tipShare;
          });
        } else if (tipMode === 'none') {
          if (balances[exp.paidBy] !== undefined) balances[exp.paidBy] -= tip;
        } else {
          const tipParticipants = exp.participants && exp.participants.length > 0 ? exp.participants : members;
          const tipShare = tipParticipants.length > 0 ? tip / tipParticipants.length : 0;
          tipParticipants.forEach(p => {
            if (balances[p] !== undefined) balances[p] -= tipShare;
          });
        }
      }
    });

    let debtors = [];
    let creditors = [];
    Object.keys(balances).forEach(person => {
      let amt = Math.round(balances[person] * 100) / 100;
      if (amt < -0.01) debtors.push({ person, amount: -amt });
      if (amt > 0.01) creditors.push({ person, amount: amt });
    });

    let results = [];
    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      let debtor = debtors[i];
      let creditor = creditors[j];
      let settleAmount = Math.min(debtor.amount, creditor.amount);

      results.push({ from: debtor.person, to: creditor.person, amount: settleAmount });

      debtor.amount -= settleAmount;
      creditor.amount -= settleAmount;

      if (debtor.amount < 0.01) i++;
      if (creditor.amount < 0.01) j++;
    }

    return results;
  }, [members, expenses]);

  return (
    <div className="card primary-card shadow-card">
      <div className="total-bill-summary-banner">
        <small>{t.totalBillAmount || 'Total Spending'}</small>
        <h2>{currency}{totalGroupSpend.toFixed(2)}</h2>
      </div>

      <h3 className="mt-3">⚡ Smart Settlement Visualization</h3>

      <div className="visual-settlement-list mt-3">
        {settlements.length === 0 ? (
          <div className="all-settled-card text-center p-4">
            <span style={{ fontSize: '2.5rem' }}>🎉</span>
            <h4 className="mt-2">{t.allSettled}</h4>
            <small>No pending transactions found.</small>
          </div>
        ) : (
          settlements.map((s, idx) => {
            const pairKey = `${s.from}->${s.to}`;
            const isPaid = settledPairs.includes(pairKey);

            return (
              <div key={idx} className={`flow-transfer-card ${isPaid ? 'status-paid' : 'status-pending'}`}>
                <div className="flow-nodes-container flex-row align-center justify-between">
                  <div className="flow-person-node debtor-node">
                    <div className="node-avatar">👤</div>
                    <span className="node-name">{s.from}</span>
                  </div>

                  <div className="flow-arrow-center">
                    <span className="flow-amount">{currency}{s.amount.toFixed(2)}</span>
                    <div className="arrow-line flex-row align-center">
                      <div className="line"></div>
                      <span className="arrow-head">➔</span>
                    </div>
                  </div>

                  <div className="flow-person-node creditor-node">
                    <div className="node-avatar">🏦</div>
                    <span className="node-name">{s.to}</span>
                  </div>
                </div>

                <div className="flow-card-footer mt-2 flex-row justify-between align-center">
                  <span className="flow-status-text">
                    {isPaid ? '✓ Transaction Completed' : '⌛ Pending Payment'}
                  </span>
                  <button 
                    className={`btn-settle-toggle ${isPaid ? 'btn-paid-active' : 'btn-settle-action'}`}
                    onClick={() => toggleSettledPair(pairKey)}
                  >
                    {isPaid ? `✓ ${t.paidStatus}` : t.settleBtn}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {settlements.length > 0 && (
        <button className="btn-outline-light full-width mt-3" onClick={onClear}>
          Reset / Mark All Settled
        </button>
      )}
    </div>
  );
}
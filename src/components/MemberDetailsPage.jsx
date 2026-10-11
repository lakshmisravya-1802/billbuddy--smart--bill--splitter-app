import React from 'react';

export default function MemberDetailsPage({
  member,
  data = { expenses: [], settledPairs: [], members: [], memberAvatars: {} },
  currency = '₹',
  onBack
}) {
  const expenses = data.expenses || [];
  const settledPairs = data.settledPairs || [];
  const memberAvatars = data.memberAvatars || {};

  // Retrieve the person's assigned avatar or default to standard icon
  const avatar = memberAvatars[member] || '👤';

  // 1. Calculate Total Paid Out-Of-Pocket by this member
  const totalPaid = expenses.reduce((sum, exp) => {
    if (exp.paidBy === member) {
      return sum + (exp.amount || 0);
    }
    if (exp.paidByDetails && exp.paidByDetails[member]) {
      return sum + (parseFloat(exp.paidByDetails[member]) || 0);
    }
    return sum;
  }, 0);

  // 2. Calculate Total Personal Share for this member across all expenses
  const totalShare = expenses.reduce((sum, exp) => {
    if (exp.shares && exp.shares[member] !== undefined) {
      return sum + (parseFloat(exp.shares[member]) || 0);
    }
    return sum;
  }, 0);

  // 3. Calculate Net Balance (Paid minus Share)
  const netBalance = totalPaid - totalShare;

  const totalOwedToOthers = netBalance < 0 ? Math.abs(netBalance) : 0;
  const totalOwedByOthers = netBalance > 0 ? netBalance : 0;

  // 4. Gather Pairwise Pending Debts/Credits for this member
  let pendingOwedToOthers = [];
  let pendingOwedToMe = [];

  expenses.forEach((exp) => {
    if (exp.debts && Array.isArray(exp.debts)) {
      exp.debts.forEach((debt) => {
        if (debt.from === member) {
          pendingOwedToOthers.push({ to: debt.to, amount: debt.amount, expenseName: exp.name });
        }
        if (debt.to === member) {
          pendingOwedToMe.push({ from: debt.from, amount: debt.amount, expenseName: exp.name });
        }
      });
    }
  });

  // Filter out manually settled pairs
  const activeOwedToOthers = pendingOwedToOthers.filter(
    (item) => !settledPairs.some((s) => s.from === member && s.to === item.to)
  );

  const activeOwedToMe = pendingOwedToMe.filter(
    (item) => !settledPairs.some((s) => s.from === item.from && s.to === member)
  );

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '20px',
        padding: '24px',
        boxShadow: '0 10px 25px rgba(15, 23, 42, 0.05)',
        border: '1px solid #e2e8f0',
        maxWidth: '800px',
        margin: '0 auto'
      }}
    >
      {/* Top Navigation */}
      <button
        type="button"
        onClick={onBack}
        style={{
          backgroundColor: '#f1f5f9',
          border: '1px solid #cbd5e1',
          borderRadius: '10px',
          padding: '8px 16px',
          fontSize: '0.88rem',
          fontWeight: 700,
          color: '#334155',
          cursor: 'pointer',
          marginBottom: '20px'
        }}
      >
        ← Back to Overview
      </button>

      {/* Member Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>{avatar}</span> {member}
        </h2>
        {netBalance > 0 && (
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#d97706', backgroundColor: '#fef3c7', padding: '4px 12px', borderRadius: '20px' }}>
            👑 The Big Spender
          </span>
        )}
      </div>

      {/* Financial Metrics Summary */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        <div>
          <span style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
            Total Paid Out-of-Pocket
          </span>
          <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
            {currency}{totalPaid.toFixed(2)}
          </span>
        </div>

        <div>
          <span style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
            Total Owed To Others
          </span>
          <span style={{ fontSize: '1.5rem', fontWeight: 800, color: totalOwedToOthers > 0 ? '#ef4444' : '#0f172a' }}>
            {currency}{totalOwedToOthers.toFixed(2)}
          </span>
        </div>

        {totalOwedByOthers > 0 && (
          <div>
            <span style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
              Total Owed By Others (To You)
            </span>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981' }}>
              {currency}{totalOwedByOthers.toFixed(2)}
            </span>
          </div>
        )}

        <div>
          <span style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
            Net Balance Status
          </span>
          <span
            style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              color: netBalance > 0 ? '#10b981' : netBalance < 0 ? '#ef4444' : '#64748b'
            }}
          >
            {netBalance > 0 ? `+${currency}${netBalance.toFixed(2)}` : `${currency}${netBalance.toFixed(2)}`}
          </span>
        </div>
      </div>

      {/* Pending Debts Section */}
      <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
        <h4 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
          💳 Pending Payments
        </h4>

        {activeOwedToOthers.length === 0 ? (
          <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748b', fontWeight: 600 }}>
            💳 No pending payments owed to anyone!
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {activeOwedToOthers.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                <span>Owe <strong>{item.to}</strong> ({item.expenseName}):</span>
                <strong style={{ color: '#ef4444' }}>{currency}{item.amount.toFixed(2)}</strong>
              </div>
            ))}
          </div>
        )}

        {activeOwedToMe.length > 0 && (
          <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
            <span style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#10b981', marginBottom: '6px' }}>
              📥 Money Owed To You By Others:
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {activeOwedToMe.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                  <span><strong>{item.from}</strong> owes you ({item.expenseName}):</span>
                  <strong style={{ color: '#10b981' }}>{currency}{item.amount.toFixed(2)}</strong>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Expenses Log */}
      <div>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
          📜 Expenses Log & Payment Methods
        </h3>

        {expenses.length === 0 ? (
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>No expenses logged yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {expenses.map((exp) => (
              <div
                key={exp.id || Math.random()}
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '14px 18px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                    {exp.name}
                  </h4>
                  <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
                    Paid by: {exp.paidBy || 'Multiple'} | Method: UPI
                  </span>
                </div>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                  {currency}{(exp.amount || 0).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import GroupMembers from './GroupMembers';

export default function Dashboard({
  data,
  updateData,
  currency = '₹',
  lang = 'en',
  groups = {},
  activeGroupId = 'default',
  switchGroup,
  createNewGroup,
  onSelectMember,
  onRemoveMember,
  onSettleUp,
  appMode = 'group',
  setAppMode,
  onOpenExpenseModal
}) {
  const [newGroupName, setNewGroupName] = useState('');
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showBillsModal, setShowBillsModal] = useState(false);
  const [selectedBillDetails, setSelectedBillDetails] = useState(null);
  const [hoveredDay, setHoveredDay] = useState(null);

  // QR Code & Payment States
  const [payModalData, setPayModalData] = useState(null);

  // Animated Celebration State
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationMsg, setCelebrationMsg] = useState('');

  const members = data?.members || [];
  const expenses = data?.expenses || [];
  const settledPairs = data?.settledPairs || [];
  const memberAvatars = data?.memberAvatars || {};

  const isGroupMode = appMode === 'group';
  const currentGroupName = isGroupMode
    ? groups[activeGroupId]?.groupName || 'My Groups'
    : 'Quick Non-Group Split';

  // Metrics Calculations
  const totalSpend = expenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
  const activeMembersCount = members.length;
  const billsLoggedCount = expenses.length;

  // Day-wise spending calculation (Mon - Sun)
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dailySpending = daysOfWeek.map((dayName, dayIdx) => {
    const targetDayIndex = (dayIdx + 1) % 7;
    const dayTotal = expenses.reduce((sum, exp) => {
      const expDate = exp.date ? new Date(exp.date) : new Date();
      if (expDate.getDay() === targetDayIndex) {
        return sum + (parseFloat(exp.amount) || 0);
      }
      return sum;
    }, 0);
    return { day: dayName, amount: dayTotal };
  });

  const maxDailySpend = Math.max(...dailySpending.map((d) => d.amount), 1);

  // Remove a specific expense by ID or reference
  const handleRemoveExpense = (expenseToRemove) => {
    const updatedExpenses = expenses.filter((e) => {
      if (expenseToRemove.id && e.id) return e.id !== expenseToRemove.id;
      return e !== expenseToRemove;
    });
    updateData({ expenses: updatedExpenses });
    if (selectedBillDetails === expenseToRemove) {
      setSelectedBillDetails(null);
    }
  };

  // Calculate "Who Pays Whom" Settlements without re-applying past settlements
  const calculateSettlements = () => {
    if (members.length === 0 || expenses.length === 0) return [];

    const balances = {};
    members.forEach((m) => (balances[m] = 0));

    expenses.forEach((exp) => {
      const totalAmount = parseFloat(exp.amount) || 0;

      if (exp.paidByDetails && typeof exp.paidByDetails === 'object') {
        Object.entries(exp.paidByDetails).forEach(([payer, paidAmt]) => {
          if (balances[payer] !== undefined) {
            balances[payer] += parseFloat(paidAmt) || 0;
          }
        });
      } else if (exp.paidBy && balances[exp.paidBy] !== undefined) {
        balances[exp.paidBy] += totalAmount;
      }

      if (exp.shares && typeof exp.shares === 'object') {
        Object.entries(exp.shares).forEach(([member, shareAmt]) => {
          if (balances[member] !== undefined) {
            balances[member] -= parseFloat(shareAmt) || 0;
          }
        });
      } else {
        const perPerson = members.length > 0 ? totalAmount / members.length : 0;
        members.forEach((m) => (balances[m] -= perPerson));
      }
    });

    // Apply completed settlements to adjust current active balances
    settledPairs.forEach((sp) => {
      if (balances[sp.from] !== undefined) balances[sp.from] += sp.amount;
      if (balances[sp.to] !== undefined) balances[sp.to] -= sp.amount;
    });

    const debtors = [];
    const creditors = [];

    Object.entries(balances).forEach(([member, net]) => {
      if (net < -0.01) debtors.push({ member, amount: -net });
      else if (net > 0.01) creditors.push({ member, amount: net });
    });

    const settlements = [];
    let i = 0, j = 0;

    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      const settledAmount = Math.min(debtor.amount, creditor.amount);

      settlements.push({
        from: debtor.member,
        to: creditor.member,
        amount: settledAmount
      });

      debtor.amount -= settledAmount;
      creditor.amount -= settledAmount;

      if (debtor.amount < 0.01) i++;
      if (creditor.amount < 0.01) j++;
    }

    return settlements;
  };

  const settlements = calculateSettlements();

  const handleMarkAsSettled = (s) => {
    if (onSettleUp) {
      onSettleUp(s);
    } else {
      const newSettled = [...settledPairs, s];
      updateData({ settledPairs: newSettled });
    }

    if (payModalData) setPayModalData(null);

    // Trigger celebration animation
    setCelebrationMsg(`${s.from} paid ${currency}${s.amount.toFixed(2)} to ${s.to}! 🎉`);
    setShowCelebration(true);
    setTimeout(() => {
      setShowCelebration(false);
    }, 2400);
  };

  // WhatsApp & System Summary Sharing
  const handleShareSummary = () => {
    const settlementText =
      settlements.length > 0
        ? settlements.map((s) => `• ${s.from} pays ${s.to}: ${currency}${s.amount.toFixed(2)}`).join('\n')
        : '🎉 All payments are settled up!';

    const summaryMessage =
      `🧾 *BillBuddy Expense Summary*\n` +
      `📌 Mode: ${isGroupMode ? 'Group Split (' + currentGroupName + ')' : 'Non-Group Split'}\n` +
      `💰 Total Spend: ${currency}${totalSpend.toFixed(2)}\n` +
      `👥 Participants (${activeMembersCount}): ${members.join(', ')}\n` +
      `📄 Total Bills: ${billsLoggedCount}\n\n` +
      `🤝 *Who Pays Whom:*\n${settlementText}\n\n` +
      `Shared via BillBuddy 👛`;

    if (navigator.share) {
      navigator.share({ title: `${currentGroupName} Summary`, text: summaryMessage }).catch(() => {});
    } else {
      const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(summaryMessage)}`;
      window.open(waUrl, '_blank');
    }
  };

  const handleCreateGroupSubmit = (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    if (createNewGroup) createNewGroup(newGroupName.trim());
    setNewGroupName('');
  };

  const handleAddMember = (newMember) => {
    const clean = newMember.trim();
    if (clean && !members.some((m) => m.toLowerCase() === clean.toLowerCase())) {
      updateData({ members: [...members, clean] });
    }
  };

  const handleRemoveMember = (memberToRemove) => {
    if (onRemoveMember) {
      onRemoveMember(memberToRemove);
    } else {
      updateData({ members: members.filter((m) => m !== memberToRemove) });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '80px', position: 'relative' }}>
      {/* Celebration Overlay */}
      {showCelebration && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            pointerEvents: 'none',
            zIndex: 999999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(15, 23, 42, 0.18)',
            backdropFilter: 'blur(2px)'
          }}
        >
          <style>{`
            @keyframes floatUp {
              0% { transform: translateY(20px) scale(0.6) rotate(0deg); opacity: 0; }
              40% { opacity: 1; }
              100% { transform: translateY(-130px) scale(1.3) rotate(360deg); opacity: 0; }
            }
            @keyframes popIn {
              0% { transform: scale(0.6); opacity: 0; }
              70% { transform: scale(1.08); opacity: 1; }
              100% { transform: scale(1); opacity: 1; }
            }
          `}</style>

          <div style={{ position: 'absolute', display: 'flex', gap: '24px', fontSize: '2.5rem' }}>
            <span style={{ animation: 'floatUp 1.8s ease-out infinite', animationDelay: '0s' }}>🎉</span>
            <span style={{ animation: 'floatUp 2.1s ease-out infinite', animationDelay: '0.2s' }}>✨</span>
            <span style={{ animation: 'floatUp 1.7s ease-out infinite', animationDelay: '0.4s' }}>🥳</span>
            <span style={{ animation: 'floatUp 2.2s ease-out infinite', animationDelay: '0.1s' }}>💵</span>
            <span style={{ animation: 'floatUp 1.9s ease-out infinite', animationDelay: '0.3s' }}>🎊</span>
          </div>

          <div
            style={{
              animation: 'popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
              backgroundColor: '#ffffff',
              border: '2px solid #10b981',
              boxShadow: '0 20px 50px rgba(16, 185, 129, 0.35)',
              borderRadius: '24px',
              padding: '24px 36px',
              textAlign: 'center',
              pointerEvents: 'auto'
            }}
          >
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: '8px' }}>🎉</span>
            <h3 style={{ margin: 0, color: '#065f46', fontSize: '1.4rem', fontWeight: 800 }}>
              Payment Marked as Settled!
            </h3>
            <p style={{ margin: '6px 0 0 0', color: '#047857', fontSize: '0.95rem', fontWeight: 700 }}>
              {celebrationMsg}
            </p>
          </div>
        </div>
      )}

      {/* Overview Card */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          padding: '24px 28px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.02)',
          border: '1px solid #f1f5f9'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 800,
                color: isGroupMode ? '#6366f1' : '#059669',
                backgroundColor: isGroupMode ? '#e0e7ff' : '#d1fae5',
                padding: '4px 10px',
                borderRadius: '8px',
                letterSpacing: '0.5px'
              }}
            >
              MODE: {isGroupMode ? '📁 Group Split' : '⚡ Non-Group Split'}
            </span>
            <h2 style={{ margin: '8px 0 0 0', fontSize: '1.75rem', fontWeight: 800, color: '#1e1b4b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              👛 BillBuddy Overview
            </h2>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={handleShareSummary}
              style={{
                backgroundColor: '#25d366',
                border: 'none',
                borderRadius: '12px',
                padding: '8px 16px',
                fontSize: '0.88rem',
                fontWeight: 800,
                color: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(37, 211, 102, 0.25)'
              }}
            >
              📲 Share Summary
            </button>

            {/* Switch Mode Toggle Button */}
            <button
              type="button"
              onClick={() => setAppMode && setAppMode(isGroupMode ? 'non-group' : 'group')}
              style={{
                backgroundColor: '#ffffff',
                border: '1.5px solid #cbd5e1',
                borderRadius: '12px',
                padding: '8px 16px',
                fontSize: '0.88rem',
                fontWeight: 700,
                color: '#334155',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              🔄 Switch to {isGroupMode ? 'Non-Group Split' : 'Group Split'}
            </button>
          </div>
        </div>

        {/* Metric Cards Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div style={{ backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px solid #f1f5f9', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
              💰
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#64748b' }}>TOTAL SPEND</span>
              <strong style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                {currency}{totalSpend.toFixed(2)}
              </strong>
            </div>
          </div>

          {/* Active Members Clickable */}
          <div
            onClick={() => setShowMembersModal(true)}
            style={{
              backgroundColor: '#f8fafc',
              borderRadius: '16px',
              border: '1px solid #e0e7ff',
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              cursor: 'pointer'
            }}
            title="Click to view active participants list"
          >
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
              👥
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#4f46e5' }}>
                ACTIVE MEMBERS 🔍
              </span>
              <strong style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                {activeMembersCount}
              </strong>
            </div>
          </div>

          {/* Bills Logged Clickable */}
          <div
            onClick={() => setShowBillsModal(true)}
            style={{
              backgroundColor: '#f8fafc',
              borderRadius: '16px',
              border: '1px solid #fbcfe8',
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              cursor: 'pointer'
            }}
            title="Click to view logged bills"
          >
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#fae8ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
              📄
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#db2777' }}>
                BILLS LOGGED 🔍
              </span>
              <strong style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                {billsLoggedCount}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Your Groups Card - RENDERED ONLY IN GROUP SPLIT MODE */}
      {isGroupMode ? (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '24px',
            padding: '24px 28px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.02)',
            border: '1px solid #f1f5f9'
          }}
        >
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.15rem', fontWeight: 800, color: '#1e1b4b', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📁 Your Groups
          </h3>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '18px' }}>
            {Object.entries(groups).map(([groupId, grp]) => {
              const isActive = groupId === activeGroupId;
              return (
                <button
                  key={groupId}
                  type="button"
                  onClick={() => switchGroup && switchGroup(groupId)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '12px',
                    border: 'none',
                    backgroundColor: isActive ? '#f1f5f9' : '#ffffff',
                    color: isActive ? '#0f172a' : '#64748b',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  📁 {grp.groupName || 'My Groups'}
                </button>
              );
            })}
          </div>

          <form onSubmit={handleCreateGroupSubmit} style={{ display: 'flex', gap: '10px', maxWidth: '520px' }}>
            <input
              type="text"
              placeholder="Enter Group Name (e.g. Weekend Trip)"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                fontSize: '0.92rem',
                backgroundColor: '#f8fafc',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              style={{
                background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '12px 22px',
                fontSize: '0.92rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              + Create Group
            </button>
          </form>
        </div>
      ) : (
        /* Non-Group Split Mode Info Banner */
        <div
          style={{
            backgroundColor: '#ecfdf5',
            borderRadius: '20px',
            padding: '16px 24px',
            border: '1px solid #a7f3d0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.5rem' }}>⚡</span>
            <div>
              <strong style={{ display: 'block', color: '#065f46', fontSize: '0.95rem' }}>
                Quick Non-Group Split Active
              </strong>
              <span style={{ fontSize: '0.82rem', color: '#047857' }}>
                Add participants and expenses directly without creating or saving groups.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
        <GroupMembers
          members={members}
          memberAvatars={memberAvatars}
          onAddMember={handleAddMember}
          onRemoveMember={handleRemoveMember}
          onSelectMember={onSelectMember}
          onUpdateAvatars={(updatedAvatars) => updateData({ memberAvatars: updatedAvatars })}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Day-Wise Spending Bar Graph */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '24px',
              padding: '24px 28px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.02)',
              border: '1px solid #f1f5f9'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#1e1b4b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📊 Weekly Spending Breakdown
              </h3>
              <span style={{ fontSize: '0.78rem', color: '#6366f1', fontWeight: 700 }}>Hover bars for details</span>
            </div>

            <div
              style={{
                backgroundColor: '#f8fafc',
                borderRadius: '20px',
                padding: '24px 16px 16px 16px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                height: '180px',
                position: 'relative'
              }}
            >
              {dailySpending.map((item, idx) => {
                const heightPercent = maxDailySpend > 0 ? (item.amount / maxDailySpend) * 100 : 0;
                const isHovered = hoveredDay === idx;

                return (
                  <div
                    key={item.day}
                    onMouseEnter={() => setHoveredDay(idx)}
                    onMouseLeave={() => setHoveredDay(null)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      flex: 1,
                      height: '100%',
                      justifyContent: 'flex-end',
                      position: 'relative',
                      cursor: 'pointer'
                    }}
                  >
                    {isHovered && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: `calc(${Math.max(heightPercent, 12)}% + 12px)`,
                          backgroundColor: '#0f172a',
                          color: '#ffffff',
                          padding: '6px 10px',
                          borderRadius: '8px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                          boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
                          zIndex: 10
                        }}
                      >
                        {item.day}: {currency}{item.amount.toFixed(2)}
                      </div>
                    )}

                    <div
                      style={{
                        width: '28px',
                        height: `${Math.max(heightPercent, 6)}%`,
                        background: item.amount > 0
                          ? 'linear-gradient(180deg, #818cf8 0%, #4f46e5 100%)'
                          : '#e2e8f0',
                        borderRadius: '12px 12px 6px 6px',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        transform: isHovered ? 'scaleY(1.06) translateY(-4px)' : 'none',
                        boxShadow: isHovered && item.amount > 0 ? '0 8px 20px rgba(79, 70, 229, 0.35)' : 'none'
                      }}
                    />

                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: isHovered ? '#4f46e5' : '#64748b', marginTop: '10px' }}>
                      {item.day}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Who Pays Whom Side Section */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '24px',
              padding: '24px 28px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.02)',
              border: '1px solid #f1f5f9'
            }}
          >
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.15rem', fontWeight: 800, color: '#1e1b4b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🤝 Who Pays Whom (Balances)
            </h3>

            {settlements.length === 0 ? (
              <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '14px', textAlign: 'center', color: '#059669', fontSize: '0.88rem', fontWeight: 700 }}>
                🎉 All settled up! No active debts.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {settlements.map((s, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e0e7ff',
                      padding: '12px 16px',
                      borderRadius: '14px',
                      flexWrap: 'wrap',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem', fontWeight: 700, color: '#334155' }}>
                      <span style={{ color: '#ef4444' }}>🔴 {memberAvatars[s.from] || '👤'} {s.from}</span>
                      <span style={{ color: '#94a3b8' }}>pays</span>
                      <span style={{ color: '#10b981' }}>🟢 {memberAvatars[s.to] || '👤'} {s.to}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#4f46e5', backgroundColor: '#e0e7ff', padding: '4px 10px', borderRadius: '8px' }}>
                        {currency}{s.amount.toFixed(2)}
                      </span>

                      {/* Pay QR Button */}
                      <button
                        type="button"
                        onClick={() => setPayModalData(s)}
                        style={{
                          backgroundColor: '#6366f1',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '6px 12px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        💳 Pay
                      </button>

                      {/* Mark Settle Button */}
                      <button
                        type="button"
                        onClick={() => handleMarkAsSettled(s)}
                        style={{
                          backgroundColor: '#10b981',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '6px 12px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        ✓ Settle
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 999 }}>
        <button
          type="button"
          onClick={onOpenExpenseModal}
          style={{
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '30px',
            padding: '14px 28px',
            fontSize: '1rem',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 10px 25px rgba(79, 70, 229, 0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          ➕ Add Expense
        </button>
      </div>

      {/* QR Code Payment Modal */}
      {payModalData && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999
          }}
          onClick={() => setPayModalData(null)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '24px',
              padding: '28px',
              width: '90%',
              maxWidth: '380px',
              textAlign: 'center',
              boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
              border: '1px solid #f1f5f9'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                💳 Scan & Pay
              </h3>
              <button
                type="button"
                onClick={() => setPayModalData(null)}
                style={{ border: 'none', background: '#f1f5f9', borderRadius: '50%', width: '32px', height: '32px', fontWeight: 800, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <p style={{ margin: '0 0 16px 0', fontSize: '0.92rem', color: '#475569', fontWeight: 600 }}>
              <strong>{memberAvatars[payModalData.from] || '👤'} {payModalData.from}</strong> paying <strong>{memberAvatars[payModalData.to] || '👤'} {payModalData.to}</strong>
            </p>

            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#4f46e5', marginBottom: '16px' }}>
              {currency}{payModalData.amount.toFixed(2)}
            </div>

            <div
              style={{
                backgroundColor: '#f8fafc',
                padding: '16px',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                display: 'inline-block',
                marginBottom: '20px'
              }}
            >
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                  `upi://pay?pa=${payModalData.to.toLowerCase()}@upi&pn=${encodeURIComponent(payModalData.to)}&am=${payModalData.amount.toFixed(2)}&cu=INR`
                )}`}
                alt="Payment QR Code"
                style={{ width: '190px', height: '190px', display: 'block', borderRadius: '8px' }}
              />
            </div>

            <button
              type="button"
              onClick={() => handleMarkAsSettled(payModalData)}
              style={{
                width: '100%',
                backgroundColor: '#10b981',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '12px',
                fontSize: '0.95rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
              }}
            >
              ✓ Done & Mark as Settled
            </button>
          </div>
        </div>
      )}

      {/* Active Members Modal with Avatar Display */}
      {showMembersModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999
          }}
          onClick={() => setShowMembersModal(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              padding: '24px',
              width: '90%',
              maxWidth: '420px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.15)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                👥 Active Members ({activeMembersCount})
              </h3>
              <button
                type="button"
                onClick={() => setShowMembersModal(false)}
                style={{ border: 'none', background: '#f1f5f9', borderRadius: '50%', width: '30px', height: '30px', fontWeight: 800, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
              {members.map((m, idx) => {
                const avatar = memberAvatars[m] || '👤';
                return (
                  <div key={m} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontWeight: 800, color: '#6366f1' }}>#{idx + 1}</span>
                    <span style={{ fontWeight: 700, color: '#1e293b' }}>{avatar} {m}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Logged Bills Modal */}
      {showBillsModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999
          }}
          onClick={() => setShowBillsModal(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              padding: '24px',
              width: '90%',
              maxWidth: '560px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.15)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                📄 Logged Bills ({billsLoggedCount})
              </h3>
              <button
                type="button"
                onClick={() => setShowBillsModal(false)}
                style={{ border: 'none', background: '#f1f5f9', borderRadius: '50%', width: '30px', height: '30px', fontWeight: 800, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '380px', overflowY: 'auto' }}>
              {expenses.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '0.9rem', textAlign: 'center', margin: '20px 0' }}>
                  No bills logged yet.
                </p>
              ) : (
                expenses.map((exp) => (
                  <div
                    key={exp.id || Math.random()}
                    onClick={() => setSelectedBillDetails(exp)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '14px 16px',
                      backgroundColor: '#f8fafc',
                      borderRadius: '14px',
                      border: '1px solid #e2e8f0',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong style={{ fontSize: '0.98rem', color: '#0f172a' }}>{exp.name}</strong>
                        <span style={{ fontSize: '0.72rem', color: '#6366f1', backgroundColor: '#e0e7ff', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                          🔍 Click to view details
                        </span>
                      </div>

                      <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block', marginTop: '3px' }}>
                        Paid by <strong>{memberAvatars[exp.paidBy] || '👤'} {exp.paidBy || 'Member'}</strong> • {exp.date}
                      </span>

                      {exp.taxAmount > 0 && (
                        <span style={{ display: 'block', fontSize: '0.74rem', color: '#6366f1', fontWeight: 700, marginTop: '2px' }}>
                          Base: {currency}{(exp.baseAmount || 0).toFixed(2)} + Tax: {currency}{exp.taxAmount.toFixed(2)}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontWeight: 800, fontSize: '1rem', color: '#4f46e5', backgroundColor: '#e0e7ff', padding: '6px 12px', borderRadius: '10px' }}>
                        {currency}{parseFloat(exp.amount || 0).toFixed(2)}
                      </span>

                      {/* Delete Bill Action Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveExpense(exp);
                        }}
                        style={{
                          backgroundColor: '#fee2e2',
                          color: '#ef4444',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '6px 10px',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          cursor: 'pointer'
                        }}
                        title="Delete bill"
                      >
                        🗑️ Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Individual Bill Detailed View Modal */}
      {selectedBillDetails && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999
          }}
          onClick={() => setSelectedBillDetails(null)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '24px',
              padding: '24px 28px',
              width: '90%',
              maxWidth: '480px',
              boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
              border: '1px solid #f1f5f9'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                📄 {selectedBillDetails.name} Details
              </h3>
              <button
                type="button"
                onClick={() => setSelectedBillDetails(null)}
                style={{ border: 'none', background: '#f1f5f9', borderRadius: '50%', width: '32px', height: '32px', fontWeight: 800, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Total Spend */}
            <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '16px', padding: '14px 18px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#166534' }}>Total Bill Amount</span>
              <strong style={{ fontSize: '1.3rem', fontWeight: 800, color: '#15803d' }}>
                {currency}{parseFloat(selectedBillDetails.amount || 0).toFixed(2)}
              </strong>
            </div>

            {/* Who Paid Section with Custom Avatars */}
            <div style={{ marginBottom: '16px', padding: '14px', backgroundColor: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
              <strong style={{ display: 'block', fontSize: '0.85rem', color: '#475569', marginBottom: '8px' }}>
                💳 WHO PAID
              </strong>
              {selectedBillDetails.paidByDetails && Object.keys(selectedBillDetails.paidByDetails).length > 0 ? (
                Object.entries(selectedBillDetails.paidByDetails).map(([payer, amt]) => (
                  <div key={payer} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.88rem', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{memberAvatars[payer] || '👤'}</span> {payer}
                    </span>
                    <span style={{ color: '#10b981' }}>{currency}{parseFloat(amt || 0).toFixed(2)}</span>
                  </div>
                ))
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.88rem', fontWeight: 700, color: '#1e293b' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{memberAvatars[selectedBillDetails.paidBy] || '👤'}</span> {selectedBillDetails.paidBy || 'Member'}
                  </span>
                  <span style={{ color: '#10b981' }}>{currency}{parseFloat(selectedBillDetails.amount || 0).toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Items Breakdown Section */}
            {selectedBillDetails.items && selectedBillDetails.items.length > 0 ? (
              <div style={{ marginBottom: '16px', padding: '14px', backgroundColor: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                <strong style={{ display: 'block', fontSize: '0.85rem', color: '#475569', marginBottom: '8px' }}>
                  🛒 ITEMS LIST
                </strong>
                {selectedBillDetails.items.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#334155', marginBottom: '4px' }}>
                    <span>• {item.name || `Item ${idx + 1}`}</span>
                    <strong style={{ color: '#0f172a' }}>{currency}{parseFloat(item.price || 0).toFixed(2)}</strong>
                  </div>
                ))}
              </div>
            ) : selectedBillDetails.taxAmount > 0 ? (
              <div style={{ marginBottom: '16px', padding: '14px', backgroundColor: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                <strong style={{ display: 'block', fontSize: '0.85rem', color: '#475569', marginBottom: '8px' }}>
                  🧾 PRICE BREAKDOWN
                </strong>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#334155', marginBottom: '4px' }}>
                  <span>Base Amount</span>
                  <strong>{currency}{(selectedBillDetails.baseAmount || 0).toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#334155' }}>
                  <span>Tax Amount</span>
                  <strong style={{ color: '#6366f1' }}>{currency}{(selectedBillDetails.taxAmount || 0).toFixed(2)}</strong>
                </div>
              </div>
            ) : null}

            {/* Debts Split Section with Avatars & Settlement Status */}
            <div style={{ marginBottom: '20px', padding: '14px', backgroundColor: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
              <strong style={{ display: 'block', fontSize: '0.85rem', color: '#475569', marginBottom: '8px' }}>
                🤝 SPLIT / WHO PAYS WHOM
              </strong>
              {selectedBillDetails.debts && selectedBillDetails.debts.length > 0 ? (
                selectedBillDetails.debts.map((d, idx) => {
                  const isSettled = settledPairs.some((s) => s.from === d.from && s.to === d.to && Math.abs(s.amount - d.amount) < 0.01);
                  return (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>🔴 {memberAvatars[d.from] || '👤'} {d.from}</span>
                        <span>→</span>
                        <span>🟢 {memberAvatars[d.to] || '👤'} {d.to}</span>
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: '#ef4444' }}>{currency}{parseFloat(d.amount || 0).toFixed(2)}</span>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: '6px',
                            backgroundColor: isSettled ? '#d1fae5' : '#fef3c7',
                            color: isSettled ? '#065f46' : '#92400e'
                          }}
                        >
                          {isSettled ? '✅ Settled' : '⏳ Pending'}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : selectedBillDetails.shares && Object.keys(selectedBillDetails.shares).length > 0 ? (
                Object.entries(selectedBillDetails.shares).map(([m, shareAmt]) => (
                  <div key={m} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: '#334155', marginBottom: '4px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{memberAvatars[m] || '👤'}</span> {m}'s Share
                    </span>
                    <strong style={{ color: '#4f46e5' }}>{currency}{parseFloat(shareAmt || 0).toFixed(2)}</strong>
                  </div>
                ))
              ) : (
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Equal split among members</span>
              )}
            </div>

            {/* Actions Footer */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => handleRemoveExpense(selectedBillDetails)}
                style={{
                  flex: 1,
                  backgroundColor: '#fee2e2',
                  color: '#ef4444',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px',
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                🗑️ Remove This Bill
              </button>
              <button
                type="button"
                onClick={() => setSelectedBillDetails(null)}
                style={{
                  flex: 1,
                  backgroundColor: '#f1f5f9',
                  color: '#334155',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px',
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
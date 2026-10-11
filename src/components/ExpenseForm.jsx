import React, { useState } from 'react';
import { createPortal } from 'react-dom';

const getFoodEmoji = (itemName = '') => {
  const name = itemName.toLowerCase();
  if (name.includes('burger')) return '🍔';
  if (name.includes('pizza')) return '🍕';
  if (name.includes('drink') || name.includes('coke') || name.includes('soda') || name.includes('coffee')) return '🥤';
  if (name.includes('fries') || name.includes('chip')) return '🍟';
  if (name.includes('pasta') || name.includes('noodle')) return '🍝';
  if (name.includes('dessert') || name.includes('cake') || name.includes('ice')) return '🍰';
  return '🍽️';
};

export default function ExpenseForm({
  members = ['a', 'b', 'c', 'd'],
  currency = '₹',
  onClose,
  closeModal,
  handleClose,
  setIsOpen,
  setShowModal,
  onSaveExpense
}) {
  const participantList = members.length > 0 ? members : ['a', 'b', 'c', 'd'];

  // Bill Input Mode: 'manual' vs 'upload'
  const [billInputMode, setBillInputMode] = useState('manual');
  const [billImage, setBillImage] = useState(null);
  const [billImagePreview, setBillImagePreview] = useState(null);

  // Form Basic Info
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [splitType, setSplitType] = useState('itemized');
  const [totalEqualAmount, setTotalEqualAmount] = useState('');

  // Payer State
  const [payerType, setPayerType] = useState('single');
  const [singlePayer, setSinglePayer] = useState(participantList[0] || '');
  const [multiplePayers, setMultiplePayers] = useState(
    participantList.reduce((acc, m) => ({ ...acc, [m]: '' }), {})
  );

  // Items State
  const [items, setItems] = useState([]);
  const [itemName, setItemName] = useState('');
  const [itemUnitPrice, setItemUnitPrice] = useState('');

  // Tax & GST State
  const [taxCalcType, setTaxCalcType] = useState('rate'); // 'rate' (%) | 'fixed' (Direct Amount)
  const [taxRate, setTaxRate] = useState('');
  const [fixedTaxAmount, setFixedTaxAmount] = useState('');

  // Tip State
  const [tipAmount, setTipAmount] = useState('');
  const [tipSplitMode, setTipSplitMode] = useState('equal');
  const [selectedTipMembers, setSelectedTipMembers] = useState(participantList);

  // Close Modal Handler
  const handleBackToOverview = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (typeof onClose === 'function') onClose();
    else if (typeof closeModal === 'function') closeModal();
    else if (typeof handleClose === 'function') handleClose();
    else if (typeof setIsOpen === 'function') setIsOpen(false);
    else if (typeof setShowModal === 'function') setShowModal(false);
  };

  // Bill Image Handlers
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBillImage(file);
      setBillImagePreview(URL.createObjectURL(file));
      if (!title.trim()) {
        const cleanFileName = file.name.replace(/\.[^/.]+$/, "");
        setTitle(cleanFileName.charAt(0).toUpperCase() + cleanFileName.slice(1));
      }
    }
  };

  const handleRemoveImage = () => {
    setBillImage(null);
    setBillImagePreview(null);
  };

  // Itemized Handlers
  const handleAddItem = (e) => {
    e.preventDefault();
    if (!itemName.trim() || !itemUnitPrice || parseFloat(itemUnitPrice) <= 0) return;

    const initialUnits = {};
    participantList.forEach((m) => { initialUnits[m] = 0; });

    setItems([
      ...items,
      {
        id: Date.now(),
        name: itemName.trim(),
        unitPrice: parseFloat(itemUnitPrice),
        units: initialUnits,
        isDone: false
      }
    ]);
    setItemName('');
    setItemUnitPrice('');
  };

  const handleUnitChange = (itemId, member, delta) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const currentUnits = item.units[member] || 0;
        return {
          ...item,
          units: { ...item.units, [member]: Math.max(0, currentUnits + delta) }
        };
      })
    );
  };

  const handleDirectUnitInput = (itemId, member, value) => {
    const parsedVal = Math.max(0, parseInt(value, 10) || 0);
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, units: { ...item.units, [member]: parsedVal } } : item))
    );
  };

  const toggleItemDone = (itemId, isDone) => {
    setItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, isDone } : item)));
  };

  const handleRemoveItem = (itemId) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const handleToggleTipMember = (member) => {
    if (selectedTipMembers.includes(member)) {
      if (selectedTipMembers.length === 1) return;
      setSelectedTipMembers(selectedTipMembers.filter((m) => m !== member));
    } else {
      setSelectedTipMembers([...selectedTipMembers, member]);
    }
  };

  // Cost & Tax Calculations
  const itemsSubtotal = items.reduce((sum, item) => {
    const totalUnits = Object.values(item.units).reduce((uSum, u) => uSum + u, 0);
    return sum + (totalUnits * item.unitPrice);
  }, 0);

  const baseTotalCost = splitType === 'equal' ? parseFloat(totalEqualAmount) || 0 : itemsSubtotal;
  const overallTotalItems = items.reduce((sum, item) => sum + Object.values(item.units).reduce((uSum, u) => uSum + u, 0), 0);

  // Dynamic GST/Tax Logic
  const parsedTaxRate = parseFloat(taxRate) || 0;
  const parsedFixedTax = parseFloat(fixedTaxAmount) || 0;

  const calculatedTaxAmount = taxCalcType === 'rate'
    ? (baseTotalCost * parsedTaxRate) / 100
    : parsedFixedTax;

  const effectiveTaxRate = taxCalcType === 'rate'
    ? parsedTaxRate
    : (baseTotalCost > 0 ? (parsedFixedTax / baseTotalCost) * 100 : 0);

  const parsedTip = parseFloat(tipAmount) || 0;
  const grandTotalCost = baseTotalCost + calculatedTaxAmount + parsedTip;

  // Save Expense
  const handleSave = () => {
    if (!title.trim()) {
      alert('Please enter a bill description.');
      return;
    }
    if (grandTotalCost <= 0) {
      alert('Please enter valid items or total bill amount.');
      return;
    }

    // 1. Paid Summary
    let paidBySummary = {};
    if (payerType === 'single') {
      participantList.forEach((m) => (paidBySummary[m] = m === singlePayer ? grandTotalCost : 0));
    } else {
      let paidSum = 0;
      participantList.forEach((m) => {
        const amt = parseFloat(multiplePayers[m]) || 0;
        paidBySummary[m] = amt;
        paidSum += amt;
      });
      if (Math.abs(paidSum - grandTotalCost) > 0.01) {
        alert(`Total paid (${currency}${paidSum.toFixed(2)}) must match grand bill total (${currency}${grandTotalCost.toFixed(2)}).`);
        return;
      }
    }

    // 2. Individual Base Shares
    let individualShares = {};
    participantList.forEach((m) => (individualShares[m] = 0));

    if (splitType === 'equal') {
      const perPersonBase = participantList.length > 0 ? baseTotalCost / participantList.length : 0;
      participantList.forEach((m) => (individualShares[m] += perPersonBase));
    } else {
      items.forEach((item) => {
        participantList.forEach((m) => {
          const qty = item.units[m] || 0;
          individualShares[m] += qty * item.unitPrice;
        });
      });
    }

    // Proportional Tax Allocation
    if (calculatedTaxAmount > 0) {
      participantList.forEach((m) => {
        const ratio = baseTotalCost > 0 ? individualShares[m] / baseTotalCost : 1 / participantList.length;
        individualShares[m] += calculatedTaxAmount * ratio;
      });
    }

    // Tip Allocation
    if (parsedTip > 0) {
      const tipTargets = tipSplitMode === 'equal' ? participantList : selectedTipMembers;
      const tipPerPerson = tipTargets.length > 0 ? parsedTip / tipTargets.length : 0;
      participantList.forEach((m) => {
        if (tipTargets.includes(m)) individualShares[m] += tipPerPerson;
      });
    }

    // 3. Debt Settlement Resolution Engine
    let netBalances = {};
    let debtors = [];
    let creditors = [];

    participantList.forEach((m) => {
      const paid = paidBySummary[m] || 0;
      const share = individualShares[m] || 0;
      const net = paid - share;
      netBalances[m] = net;

      if (net < -0.001) debtors.push({ member: m, amount: Math.abs(net) });
      else if (net > 0.001) creditors.push({ member: m, amount: net });
    });

    let debts = [];
    let owedSummary = {};
    participantList.forEach((m) => (owedSummary[m] = []));

    let dIdx = 0, cIdx = 0;
    while (dIdx < debtors.length && cIdx < creditors.length) {
      const debtor = debtors[dIdx];
      const creditor = creditors[cIdx];
      const transfer = Math.min(debtor.amount, creditor.amount);

      if (transfer > 0.001) {
        debts.push({ from: debtor.member, to: creditor.member, amount: transfer });
        owedSummary[debtor.member].push({ to: creditor.member, amount: transfer });
      }

      debtor.amount -= transfer;
      creditor.amount -= transfer;

      if (debtor.amount <= 0.001) dIdx++;
      if (creditor.amount <= 0.001) cIdx++;
    }

    if (onSaveExpense) {
      onSaveExpense({
        id: Date.now(),
        name: title.trim(),
        date,
        amount: grandTotalCost,
        baseAmount: baseTotalCost,
        taxRate: effectiveTaxRate,
        taxAmount: calculatedTaxAmount,
        tipAmount: parsedTip,
        totalItemsCount: overallTotalItems,
        splitType,
        billInputMode,
        receiptImage: billImagePreview,
        paidBy: payerType === 'single' ? singlePayer : 'Multiple Members',
        paidByDetails: paidBySummary,
        shares: individualShares,
        netBalances,
        debts,
        owedSummary,
        items,
        participants: participantList
      });
    }
    handleBackToOverview();
  };

  const modalJSX = (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(241, 245, 249, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
        padding: '16px',
        boxSizing: 'border-box'
      }}
      onClick={handleBackToOverview}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          width: '100%',
          maxWidth: '620px',
          maxHeight: '88vh',
          borderRadius: '20px',
          boxShadow: '0 20px 40px rgba(15, 23, 42, 0.14)',
          border: '1px solid #cbd5e1',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#ffffff' }}>
          <button type="button" onClick={handleBackToOverview} style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '8px 14px', fontSize: '0.85rem', fontWeight: 700, color: '#334155', cursor: 'pointer' }}>
            ← Back to Overview
          </button>
          <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>➕ Add New Expense</h3>
          <button type="button" onClick={handleBackToOverview} style={{ backgroundColor: '#f1f5f9', border: 'none', width: '32px', height: '32px', borderRadius: '50%', fontWeight: 800, color: '#64748b', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Scrollable Body */}
        <div style={{ padding: '18px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: '#f8fafc' }}>
          
          {/* Section 1: Bill Details */}
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>1. Bill Details</h4>

            <div style={{ display: 'flex', gap: '6px', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '12px', marginBottom: '14px' }}>
              <button
                type="button"
                onClick={() => setBillInputMode('manual')}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: billInputMode === 'manual' ? '#ffffff' : 'transparent',
                  color: billInputMode === 'manual' ? '#4f46e5' : '#64748b',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: billInputMode === 'manual' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                ✍️ Enter Manually
              </button>
              <button
                type="button"
                onClick={() => setBillInputMode('upload')}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: billInputMode === 'upload' ? '#ffffff' : 'transparent',
                  color: billInputMode === 'upload' ? '#4f46e5' : '#64748b',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: billInputMode === 'upload' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                📷 Upload Bill / Receipt
              </button>
            </div>

            {billInputMode === 'manual' ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>Bill Title / Description</label>
                  <input type="text" placeholder="e.g. Dinner at Olive Garden" value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>Date</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '20px', textAlign: 'center', backgroundColor: '#f8fafc', position: 'relative', cursor: 'pointer' }}>
                  <input type="file" accept="image/*" onChange={handleImageUpload} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                  {billImagePreview ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <img src={billImagePreview} alt="Receipt preview" style={{ maxHeight: '150px', borderRadius: '10px', objectFit: 'contain', border: '1px solid #e2e8f0' }} />
                      <div style={{ display: 'flex', gap: '8px', zIndex: 2 }}>
                        <span style={{ fontSize: '0.8rem', color: '#4f46e5', fontWeight: 700 }}>Click to replace photo</span>
                        <button type="button" onClick={(e) => { e.stopPropagation(); handleRemoveImage(); }} style={{ backgroundColor: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '6px', padding: '2px 8px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>✕ Remove</button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <span style={{ fontSize: '2.2rem', display: 'block', marginBottom: '6px' }}>📸</span>
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155', display: 'block' }}>Click or drag receipt photo to upload</span>
                      <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Supports PNG, JPG, JPEG</span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>Bill Title / Description</label>
                    <input type="text" placeholder="e.g. Dinner Receipt" value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>Date</label>
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Split Type */}
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>2. Split Type</h4>
              {splitType === 'itemized' && items.length > 0 && (
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4f46e5', backgroundColor: '#e0e7ff', padding: '3px 10px', borderRadius: '12px' }}>
                  📦 Total Items Taken: {overallTotalItems}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '6px', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
              <button
                type="button"
                onClick={() => setSplitType('equal')}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: splitType === 'equal' ? '#ffffff' : 'transparent',
                  color: splitType === 'equal' ? '#4f46e5' : '#64748b',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: splitType === 'equal' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                ⚖️ Equal Split
              </button>
              <button
                type="button"
                onClick={() => setSplitType('itemized')}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: splitType === 'itemized' ? '#ffffff' : 'transparent',
                  color: splitType === 'itemized' ? '#4f46e5' : '#64748b',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: splitType === 'itemized' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                🍕 Itemized Split
              </button>
            </div>

            {splitType === 'equal' ? (
              <div style={{ marginTop: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>Total Bill Amount ({currency})</label>
                <input type="number" placeholder="e.g. 1200" value={totalEqualAmount} onChange={(e) => setTotalEqualAmount(e.target.value)} style={{ width: '100%', maxWidth: '260px', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }} />
              </div>
            ) : (
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <form onSubmit={handleAddItem} style={{ display: 'flex', gap: '8px' }}>
                  <input type="text" placeholder="Item Name (e.g. Pizza)" value={itemName} onChange={(e) => setItemName(e.target.value)} style={{ flex: 2, padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }} />
                  <input type="number" placeholder={`Unit Price (${currency})`} value={itemUnitPrice} onChange={(e) => setItemUnitPrice(e.target.value)} style={{ flex: 1.2, padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }} />
                  <button type="submit" style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#ffffff', border: 'none', borderRadius: '10px', padding: '8px 16px', fontWeight: 700, cursor: 'pointer' }}>+ Add Item</button>
                </form>

                {items.length === 0 ? (
                  <span style={{ fontSize: '0.82rem', color: '#64748b' }}>No items added. Enter item name and price for 1 unit.</span>
                ) : (
                  items.map((item, idx) => {
                    const totalItemUnits = Object.values(item.units).reduce((a, b) => a + b, 0);
                    const totalItemCost = totalItemUnits * item.unitPrice;
                    const sharedBy = participantList.filter((m) => (item.units[m] || 0) > 0);

                    return (
                      <div key={item.id} style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <div>
                            <span>{getFoodEmoji(item.name)} </span>
                            <strong>#{idx + 1} {item.name}</strong>
                            <span style={{ marginLeft: '8px', backgroundColor: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '0.85rem' }}>
                              {currency}{item.unitPrice.toFixed(2)} / unit
                            </span>
                            {totalItemUnits > 0 && (
                              <span style={{ marginLeft: '6px', backgroundColor: '#e0e7ff', color: '#3730a3', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '0.85rem' }}>
                                Total: {currency}{totalItemCost.toFixed(2)}
                              </span>
                            )}
                          </div>
                          <button type="button" onClick={() => handleRemoveItem(item.id)} style={{ backgroundColor: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '6px', padding: '4px 8px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>✕ Remove</button>
                        </div>

                        {!item.isDone ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Enter quantity (units) taken by each person:</span>
                            {participantList.map((member) => {
                              const count = item.units[member] || 0;
                              return (
                                <div key={member} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.88rem' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <strong style={{ color: '#1e293b' }}>{member}</strong>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <button type="button" onClick={() => handleUnitChange(item.id, member, -1)} style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer', fontWeight: 700 }}>-</button>
                                    <input type="number" min="0" value={count} onChange={(e) => handleDirectUnitInput(item.id, member, e.target.value)} style={{ width: '44px', textAlign: 'center', padding: '4px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 700, fontSize: '0.88rem' }} />
                                    <button type="button" onClick={() => handleUnitChange(item.id, member, 1)} style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer', fontWeight: 700 }}>+</button>
                                    <span style={{ minWidth: '68px', textAlign: 'right', fontWeight: 700, color: '#4f46e5' }}>
                                      {currency}{(count * item.unitPrice).toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                            <button type="button" onClick={() => toggleItemDone(item.id, true)} style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '8px', fontWeight: 700, cursor: 'pointer', marginTop: '4px' }}>
                              ✓ Done (Total: {totalItemUnits} {totalItemUnits === 1 ? 'unit' : 'units'} = {currency}{totalItemCost.toFixed(2)})
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <div>
                              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', display: 'block' }}>
                                📦 Total Quantity: {totalItemUnits} ({currency}{totalItemCost.toFixed(2)})
                              </span>
                              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Taken by {sharedBy.length} member{sharedBy.length === 1 ? '' : 's'}</span>
                            </div>
                            <button type="button" onClick={() => toggleItemDone(item.id, false)} style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px 10px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>✏️ Edit Units</button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Section 3: Who Paid */}
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>3. Who Paid the Bill?</h4>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer' }}>
                <input type="radio" name="payerType" checked={payerType === 'single'} onChange={() => setPayerType('single')} /> Single Person
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer' }}>
                <input type="radio" name="payerType" checked={payerType === 'multiple'} onChange={() => setPayerType('multiple')} /> Multiple People
              </label>
            </div>

            {payerType === 'single' ? (
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>Select Payer</label>
                <select value={singlePayer} onChange={(e) => setSinglePayer(e.target.value)} style={{ width: '100%', maxWidth: '260px', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}>
                  {participantList.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {participantList.map((m) => (
                  <div key={m} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.88rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ color: '#1e293b' }}>{m}</strong>
                    </div>
                    <input type="number" placeholder={`Paid (${currency})`} value={multiplePayers[m] || ''} onChange={(e) => setMultiplePayers({ ...multiplePayers, [m]: e.target.value })} style={{ width: '110px', padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 4: GST / Tax & Tip Allocation */}
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>4. GST / Tax & Tip Allocation</h4>
            
            {/* Mode Switcher: Tax Rate (%) vs Fixed Tax Amount (₹) */}
            <div style={{ display: 'flex', gap: '6px', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '10px', marginBottom: '12px' }}>
              <button
                type="button"
                onClick={() => setTaxCalcType('rate')}
                style={{
                  flex: 1,
                  padding: '6px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: taxCalcType === 'rate' ? '#ffffff' : 'transparent',
                  color: taxCalcType === 'rate' ? '#4f46e5' : '#64748b',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                % Calculate Tax Rate
              </button>
              <button
                type="button"
                onClick={() => setTaxCalcType('fixed')}
                style={{
                  flex: 1,
                  padding: '6px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: taxCalcType === 'fixed' ? '#ffffff' : 'transparent',
                  color: taxCalcType === 'fixed' ? '#4f46e5' : '#64748b',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                {currency} Enter Tax Amount
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>
                  {taxCalcType === 'rate' ? 'GST / Tax Rate (%)' : `Fixed Tax Amount (${currency})`}
                </label>
                
                {taxCalcType === 'rate' ? (
                  <div>
                    <input
                      type="number"
                      placeholder="e.g. 5, 18"
                      value={taxRate}
                      onChange={(e) => setTaxRate(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
                    />
                    {/* GST Presets */}
                    <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                      {[5, 12, 18, 28].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setTaxRate(preset.toString())}
                          style={{
                            padding: '2px 8px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            backgroundColor: taxRate === preset.toString() ? '#e0e7ff' : '#ffffff',
                            color: taxRate === preset.toString() ? '#4f46e5' : '#475569',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          {preset}%
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <input
                    type="number"
                    placeholder="e.g. 120"
                    value={fixedTaxAmount}
                    onChange={(e) => setFixedTaxAmount(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  />
                )}

                {calculatedTaxAmount > 0 && (
                  <span style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 600, marginTop: '6px', display: 'block' }}>
                    + {currency}{calculatedTaxAmount.toFixed(2)} Tax
                  </span>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>Tip Amount ({currency})</label>
                <input type="number" placeholder="e.g. 50 (Optional)" value={tipAmount} onChange={(e) => setTipAmount(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }} />
              </div>
            </div>

            {parsedTip > 0 && (
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>Tip Split Method</label>
                <select value={tipSplitMode} onChange={(e) => setTipSplitMode(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}>
                  <option value="equal">Split All Members</option>
                  <option value="custom">Select Specific Members</option>
                </select>
              </div>
            )}

            {parsedTip > 0 && tipSplitMode === 'custom' && (
              <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {participantList.map((m) => {
                  const isSelected = selectedTipMembers.includes(m);
                  return (
                    <button key={m} type="button" onClick={() => handleToggleTipMember(m)} style={{ padding: '6px 12px', borderRadius: '20px', border: '1px solid #cbd5e1', backgroundColor: isSelected ? '#6366f1' : '#ffffff', color: isSelected ? '#ffffff' : '#334155', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
                      {isSelected ? '✓ ' : ''}{m}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer Bar */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid #f1f5f9', backgroundColor: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ display: 'block', fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>TOTAL EXPENSE COST</span>
            <h2 style={{ margin: 0, color: '#4f46e5', fontSize: '1.4rem', fontWeight: 800 }}>
              {currency}{grandTotalCost.toFixed(2)}
            </h2>
          </div>
          <button type="button" onClick={handleSave} style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#ffffff', border: 'none', borderRadius: '10px', padding: '12px 28px', fontSize: '0.98rem', fontWeight: 700, cursor: 'pointer' }}>
            💾 Save Expense
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalJSX, document.body);
}
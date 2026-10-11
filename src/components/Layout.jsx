import React from 'react';
import { translations } from '../utils/translations';

export default function Layout({ 
  children, 
  onOpenExpenseModal, 
  onGoHome, 
  lang, 
  setLang, 
  currency, 
  setCurrency 
}) {
  const languages = [
    { code: 'en', label: 'EN 🇬🇧' },
    { code: 'hi', label: 'HI 🇮🇳' },
    { code: 'es', label: 'ES 🇪🇸' },
    { code: 'fr', label: 'FR 🇫🇷' }
  ];

  const currencies = ['$', '₹', '€', '£', '¥'];

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '16px' }}>
      <header
        style={{
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <h1
          onClick={onGoHome}
          style={{
            background: 'var(--primary-gradient)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontSize: '28px',
            fontWeight: 800,
            cursor: 'pointer'
          }}
        >
          BillBuddy 💳
        </h1>

        <div className="flex-row gap-2 align-center">
          <select 
            value={lang} 
            onChange={(e) => setLang(e.target.value)}
            className="compact-select"
          >
            {languages.map(l => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>

          <select 
            value={currency} 
            onChange={(e) => setCurrency(e.target.value)}
            className="compact-select"
          >
            {currencies.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <button className="btn-primary" onClick={onOpenExpenseModal}>
            + Add Expense
          </button>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
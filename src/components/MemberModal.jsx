import React, { useState } from 'react';

export default function MemberModal({ isOpen, onClose, onAddMember }) {
  const [memberName, setMemberName] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (memberName.trim()) {
      onAddMember(memberName.trim());
      setMemberName('');
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginBottom: '16px' }}>Add New Participant</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontWeight: 600, fontSize: '14px' }}>Participant Name</label>
            <input
              type="text"
              placeholder="e.g. Alex"
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 18px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                background: 'transparent',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Add Member
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
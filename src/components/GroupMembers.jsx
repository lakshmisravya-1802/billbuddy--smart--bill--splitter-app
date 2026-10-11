import React, { useState } from 'react';

const AVATAR_COLORS = ['#4f46e5', '#0891b2', '#059669', '#d97706', '#dc2626', '#7c3aed', '#db2777', '#2563eb'];

// Expanded list of Human and Animal character avatars
const ANIMAL_AVATARS = ['🦊', '🦁', '🐼', '🐨', '🐯', '🐻', '🐰', '🐶', '🐱', '🐵', '🐸', '🐷', '🦄', '🐙'];
const HUMAN_AVATARS = ['🧔‍♂️', '👩‍🦰', '🧑‍💻', '👨‍🎨', '👩‍🚀', '👸', '🤴', '🦸‍♂️', '🧙‍♀️', '👨‍🎤', '🕵️‍♂️', '🥷'];

const ALL_EMOJI_OPTIONS = [...ANIMAL_AVATARS, ...HUMAN_AVATARS];

export default function GroupMembers({
  members = [],
  memberAvatars = {},
  onAddMember,
  onRemoveMember,
  onSelectMember,
  onUpdateAvatars
}) {
  const [newMemberInput, setNewMemberInput] = useState('');
  const [activeAvatarPicker, setActiveAvatarPicker] = useState(null);
  
  // Local avatar state backup to ensure selection updates immediately in the UI
  const [localAvatars, setLocalAvatars] = useState({});

  // Helper to get selected avatar with fallback
  const getAvatarForMember = (member, idx) => {
    return localAvatars[member] || memberAvatars[member] || ALL_EMOJI_OPTIONS[idx % ALL_EMOJI_OPTIONS.length];
  };

  const handleAdd = (e) => {
    e.preventDefault();
    const cleanName = newMemberInput.trim();
    if (!cleanName) return;

    if (onAddMember) {
      onAddMember(cleanName);
    }

    const assignedEmoji = ALL_EMOJI_OPTIONS[members.length % ALL_EMOJI_OPTIONS.length];
    
    // Update local state and parent state
    setLocalAvatars((prev) => ({ ...prev, [cleanName]: assignedEmoji }));
    if (onUpdateAvatars) {
      onUpdateAvatars({
        ...memberAvatars,
        ...localAvatars,
        [cleanName]: assignedEmoji
      });
    }

    setNewMemberInput('');
  };

  const handleSelectEmoji = (memberName, emoji) => {
    // 1. Immediately update local state so click registers instantly
    setLocalAvatars((prev) => ({
      ...prev,
      [memberName]: emoji
    }));

    // 2. Notify parent container
    if (onUpdateAvatars) {
      onUpdateAvatars({
        ...memberAvatars,
        ...localAvatars,
        [memberName]: emoji
      });
    }

    // Close the picker drawer
    setActiveAvatarPicker(null);
  };

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '20px',
        padding: '20px 24px',
        boxShadow: '0 10px 25px rgba(15, 23, 42, 0.05)',
        border: '1px solid #e2e8f0'
      }}
    >
      {/* Title Header */}
      <h3
        style={{
          margin: '0 0 16px 0',
          fontSize: '1.25rem',
          fontWeight: 800,
          color: '#0f172a',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        👥 Group Members
      </h3>

      {/* Add Member Form */}
      <form onSubmit={handleAdd} style={{ display: 'flex', gap: '10px', marginBottom: '18px' }}>
        <input
          type="text"
          placeholder="Participant Name (e.g. Alex)"
          value={newMemberInput}
          onChange={(e) => setNewMemberInput(e.target.value)}
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: '12px',
            border: '1px solid #cbd5e1',
            fontSize: '0.92rem',
            outline: 'none',
            backgroundColor: '#f8fafc'
          }}
        />
        <button
          type="submit"
          style={{
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '12px',
            padding: '10px 18px',
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)'
          }}
        >
          + Add Member
        </button>
      </form>

      {/* Member List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {members.map((member, idx) => {
          const currentEmoji = getAvatarForMember(member, idx);
          const bgColor = AVATAR_COLORS[idx % AVATAR_COLORS.length];
          const isPickerOpen = activeAvatarPicker === member;

          return (
            <div
              key={member}
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #f1f5f9',
                borderRadius: '14px',
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {/* Clickable Avatar & Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    onClick={() => setActiveAvatarPicker(isPickerOpen ? null : member)}
                    title="Click to choose character avatar"
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: bgColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.25rem',
                      cursor: 'pointer',
                      border: '2px solid #ffffff',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                    }}
                  >
                    {currentEmoji}
                  </div>
                  <span style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>{member}</span>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => onSelectMember && onSelectMember(member)}
                    style={{
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: '#6366f1',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      cursor: 'pointer'
                    }}
                  >
                    View details →
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveMember && onRemoveMember(member)}
                    style={{
                      backgroundColor: '#fee2e2',
                      color: '#991b1b',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '6px 12px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    ✕ Remove
                  </button>
                </div>
              </div>

              {/* Inline Character Avatar Picker Drawer */}
              {isPickerOpen && (
                <div
                  style={{
                    marginTop: '6px',
                    padding: '12px',
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #cbd5e1',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                  }}
                >
                  {/* Animals Section */}
                  <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', marginBottom: '6px' }}>
                    🐾 ANIMALS
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                    {ANIMAL_AVATARS.map((avatarEmoji) => (
                      <button
                        key={avatarEmoji}
                        type="button"
                        onClick={() => handleSelectEmoji(member, avatarEmoji)}
                        style={{
                          fontSize: '1.25rem',
                          padding: '6px 8px',
                          border: avatarEmoji === currentEmoji ? '2px solid #6366f1' : '1px solid #cbd5e1',
                          borderRadius: '8px',
                          backgroundColor: avatarEmoji === currentEmoji ? '#e0e7ff' : '#ffffff',
                          cursor: 'pointer'
                        }}
                      >
                        {avatarEmoji}
                      </button>
                    ))}
                  </div>

                  {/* Humans Section */}
                  <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', marginBottom: '6px' }}>
                    👤 HUMANS
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {HUMAN_AVATARS.map((avatarEmoji) => (
                      <button
                        key={avatarEmoji}
                        type="button"
                        onClick={() => handleSelectEmoji(member, avatarEmoji)}
                        style={{
                          fontSize: '1.25rem',
                          padding: '6px 8px',
                          border: avatarEmoji === currentEmoji ? '2px solid #6366f1' : '1px solid #cbd5e1',
                          borderRadius: '8px',
                          backgroundColor: avatarEmoji === currentEmoji ? '#e0e7ff' : '#ffffff',
                          cursor: 'pointer'
                        }}
                      >
                        {avatarEmoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
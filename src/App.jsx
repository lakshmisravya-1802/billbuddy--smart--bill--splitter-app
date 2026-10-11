import React, { useState } from 'react';
import LandingPage from './components/LandingPage';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import MemberDetailsPage from './components/MemberDetailsPage';
import MemberModal from './components/MemberModal';
import ExpenseForm from './components/ExpenseForm';
import { translations } from './utils/translations';

export default function App() {
  const [showLanding, setShowLanding] = useState(true);
  const [appMode, setAppMode] = useState('group'); // 'group' (Group Split) | 'non-group' (Non-Group Split)
  const [lang, setLang] = useState('en');
  const [currency, setCurrency] = useState('₹');
  const [activeGroupId, setActiveGroupId] = useState('default');
  const [selectedMember, setSelectedMember] = useState(null);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [isAddingExpense, setIsAddingExpense] = useState(false);

  const t = translations[lang] || translations.en;

  // Persistent groups for "Group Split" mode
  const [groups, setGroups] = useState({
    default: {
      groupName: 'My Groups',
      members: ['alex', 'sdf'],
      memberAvatars: {},
      expenses: [],
      settledPairs: []
    }
  });

  // Standalone ad-hoc state for "Non-Group Split" mode (No groups created)
  const [nonGroupData, setNonGroupData] = useState({
    members: ['Person 1', 'Person 2'],
    memberAvatars: {},
    expenses: [],
    settledPairs: []
  });

  // Select active data store based on active appMode
  const isGroupMode = appMode === 'group';
  const activeData = isGroupMode
    ? groups[activeGroupId] || { groupName: 'My Groups', members: [], memberAvatars: {}, expenses: [], settledPairs: [] }
    : nonGroupData;

  const updateActiveData = (updatedFields) => {
    if (isGroupMode) {
      setGroups((prev) => ({
        ...prev,
        [activeGroupId]: {
          ...prev[activeGroupId],
          ...updatedFields
        }
      }));
    } else {
      setNonGroupData((prev) => ({
        ...prev,
        ...updatedFields
      }));
    }
  };

  const createNewGroup = (groupName) => {
    const newId = `group_${Date.now()}`;
    setGroups((prev) => ({
      ...prev,
      [newId]: {
        groupName,
        members: [],
        memberAvatars: {},
        expenses: [],
        settledPairs: []
      }
    }));
    setActiveGroupId(newId);
  };

  const switchGroup = (groupId) => {
    setActiveGroupId(groupId);
    setSelectedMember(null);
    setIsAddingExpense(false);
  };

  const handleAddMember = (newMember) => {
    const cleanName = newMember.trim();
    if (cleanName && !activeData.members.some((m) => m.toLowerCase() === cleanName.toLowerCase())) {
      updateActiveData({ members: [...activeData.members, cleanName] });
    }
  };

  const handleRemoveMember = (memberToRemove) => {
    updateActiveData({
      members: activeData.members.filter((m) => m !== memberToRemove)
    });
    if (selectedMember === memberToRemove) {
      setSelectedMember(null);
    }
  };

  const handleAddExpense = (expenseData) => {
    // Dynamically sync any new participants or avatars created inside the ExpenseForm
    const currentMembers = activeData.members || [];
    const updatedMembers = [...currentMembers];

    if (expenseData.participants && Array.isArray(expenseData.participants)) {
      expenseData.participants.forEach((p) => {
        if (!updatedMembers.some((m) => m.toLowerCase() === p.toLowerCase())) {
          updatedMembers.push(p);
        }
      });
    }

    const updatedAvatars = {
      ...(activeData.memberAvatars || {}),
      ...(expenseData.memberAvatars || {})
    };

    updateActiveData({
      members: updatedMembers,
      memberAvatars: updatedAvatars,
      expenses: [...(activeData.expenses || []), expenseData]
    });
    setIsAddingExpense(false);
  };

  const handleSettleUp = (settlement) => {
    const newSettled = [...(activeData.settledPairs || []), settlement];
    updateActiveData({ settledPairs: newSettled });
  };

  if (showLanding) {
    return (
      <LandingPage
        onStart={() => setShowLanding(false)}
        appMode={appMode}
        setAppMode={setAppMode}
        lang={lang}
        setLang={setLang}
        currency={currency}
        setCurrency={setCurrency}
      />
    );
  }

  return (
    <Layout 
      onOpenExpenseModal={() => {
        setSelectedMember(null);
        setIsAddingExpense(true);
      }}
      onGoHome={() => {
        setIsAddingExpense(false);
        setSelectedMember(null);
        setShowLanding(true);
      }}
      lang={lang}
      setLang={setLang}
      currency={currency}
      setCurrency={setCurrency}
    >
      {selectedMember ? (
        <MemberDetailsPage
          member={selectedMember}
          data={activeData}
          settlements={activeData.settledPairs || []}
          currency={currency}
          lang={lang}
          onBack={() => setSelectedMember(null)}
        />
      ) : (
        <Dashboard
          data={activeData}
          updateData={updateActiveData}
          currency={currency}
          lang={lang}
          groups={groups}
          activeGroupId={activeGroupId}
          switchGroup={switchGroup}
          createNewGroup={createNewGroup}
          onSelectMember={(member) => setSelectedMember(member)}
          onRemoveMember={handleRemoveMember}
          onSettleUp={handleSettleUp}
          appMode={appMode}
          setAppMode={setAppMode}
          onOpenExpenseModal={() => setIsAddingExpense(true)}
        />
      )}

      {isAddingExpense && (
        <ExpenseForm
          members={activeData.members}
          memberAvatars={activeData.memberAvatars || {}}
          currency={currency}
          onClose={() => setIsAddingExpense(false)}
          onSaveExpense={handleAddExpense}
        />
      )}

      <MemberModal
        isOpen={isMemberModalOpen}
        onClose={() => setIsMemberModalOpen(false)}
        onAddMember={handleAddMember}
      />
    </Layout>
  );
}

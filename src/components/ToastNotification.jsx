import React, { useEffect } from 'react';

export default function ToastNotification({ message, type = 'success', onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);

  if (!message) return null;

  return (
    <div className={`toast-notification toast-${type} animate-slide-toast`}>
      <div className="toast-icon">✨</div>
      <div className="toast-message">{message}</div>
      <button className="toast-close-btn" onClick={onClose}>✕</button>
    </div>
  );
}
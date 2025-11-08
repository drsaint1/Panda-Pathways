import React, { useEffect } from 'react';
import './TransactionNotification.css';

export type NotificationType = 'success' | 'error' | 'info' | 'pending';

export interface TransactionNotificationProps {
  type: NotificationType;
  title: string;
  message: string;
  txHash?: string;
  onClose: () => void;
  autoClose?: boolean;
  duration?: number;
}

const TransactionNotification: React.FC<TransactionNotificationProps> = ({
  type,
  title,
  message,
  txHash,
  onClose,
  autoClose = true,
  duration = 5000,
}) => {
  useEffect(() => {
    if (autoClose && type !== 'pending') {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [autoClose, duration, onClose, type]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'info':
        return 'ℹ️';
      case 'pending':
        return '⏳';
      default:
        return 'ℹ️';
    }
  };

  return (
    <div className={`transaction-notification ${type}`}>
      <div className="notification-header">
        <span className="notification-icon">{getIcon()}</span>
        <h4 className="notification-title">{title}</h4>
        {type !== 'pending' && (
          <button className="notification-close" onClick={onClose}>
            ×
          </button>
        )}
      </div>
      <p className="notification-message">{message}</p>
      {txHash && (
        <a
          href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="notification-link"
        >
          View on Stellar Expert →
        </a>
      )}
      {type === 'pending' && (
        <div className="notification-loader">
          <div className="loader-spinner"></div>
        </div>
      )}
    </div>
  );
};

export default TransactionNotification;

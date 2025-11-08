import React, { useState } from 'react';
import useWalletStore from '../store/walletStore';
import './WalletConnect.css';

const WalletConnect: React.FC = () => {
  const { isConnected, publicKey, connect, disconnect } = useWalletStore();
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInstallHelp, setShowInstallHelp] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);
    setShowInstallHelp(false);

    try {
      await connect();
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to connect wallet';
      if (errorMessage.toLowerCase().includes('cancelled')) {
        setIsConnecting(false);
        return;
      }

      setError(errorMessage);
      console.error('Connection error:', err);

      if (
        errorMessage.includes('not detected') ||
        errorMessage.includes('failed to load') ||
        errorMessage.includes('No supported Stellar wallets detected')
      ) {
        setShowInstallHelp(true);
      }

      if (errorMessage.includes('\n')) {
        alert(errorMessage);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setError(null);
    setShowInstallHelp(false);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  if (isConnected && publicKey) {
    return (
      <div className="wallet-connected">
        <div className="wallet-info">
          <div className="wallet-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 18V19C21 20.1 20.1 21 19 21H5C3.89 21 3 20.1 3 19V5C3 3.9 3.89 3 5 3H19C20.1 3 21 3.9 21 5V6H12C10.89 6 10 6.9 10 8V16C10 17.1 10.89 18 12 18H21ZM12 16H22V8H12V16ZM16 13.5C15.17 13.5 14.5 12.83 14.5 12C14.5 11.17 15.17 10.5 16 10.5C16.83 10.5 17.5 11.17 17.5 12C17.5 12.83 16.83 13.5 16 13.5Z" fill="currentColor"/>
            </svg>
          </div>
          <span className="wallet-address">{formatAddress(publicKey)}</span>
        </div>
        <button className="disconnect-button" onClick={handleDisconnect}>
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="wallet-connect-container">
      <button
        className="connect-button"
        onClick={handleConnect}
        disabled={isConnecting}
        title="Connect a Stellar wallet"
      >
        {isConnecting ? (
          <>
            <span className="spinner"></span>
            Opening Stellar Wallet Kit...
          </>
        ) : (
          <>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 18V19C21 20.1 20.1 21 19 21H5C3.89 21 3 20.1 3 19V5C3 3.9 3.89 3 5 3H19C20.1 3 21 3.9 21 5V6H12C10.89 6 10 6.9 10 8V16C10 17.1 10.89 18 12 18H21ZM12 16H22V8H12V16ZM16 13.5C15.17 13.5 14.5 12.83 14.5 12C14.5 11.17 15.17 10.5 16 10.5C16.83 10.5 17.5 11.17 17.5 12C17.5 12.83 16.83 13.5 16 13.5Z" fill="currentColor"/>
            </svg>
            Connect Wallet
          </>
        )}
      </button>

      {error && (
        <div className="wallet-error">
          {error.split('\n')[0]}
        </div>
      )}

      {showInstallHelp && (
        <div className="wallet-install-help">
          <p><strong>Need a Stellar wallet?</strong></p>
          <ol>
            <li>Install a supported wallet like <a href="https://www.freighter.app/" target="_blank" rel="noopener noreferrer">Freighter</a> or <a href="https://xbull.app/" target="_blank" rel="noopener noreferrer">xBull</a></li>
            <li>Create or import your wallet</li>
            <li>Refresh this page and click "Connect Wallet"</li>
          </ol>
        </div>
      )}
    </div>
  );
};

export default WalletConnect;

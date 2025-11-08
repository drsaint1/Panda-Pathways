import React, { useState } from 'react';
import useWalletStore from '../store/walletStore';
import TransactionNotification, { NotificationType } from './TransactionNotification';
import './PandaStake.css';

interface Notification {
  type: NotificationType;
  title: string;
  message: string;
  txHash?: string;
}

const PandaStake: React.FC = () => {
  const {
    ownedPandaNFTs,
    stakedPandaNFTs,
    stakePandaNFT,
    unstakePandaNFT,
    isConnected,
  } = useWalletStore();
  const [notification, setNotification] = useState<Notification | null>(null);
  const [stakingId, setStakingId] = useState<number | null>(null);
  const [unstakingId, setUnstakingId] = useState<number | null>(null);

  const handleStake = async (pandaId: number) => {
    setNotification(null);
    setStakingId(pandaId);

    setNotification({
      type: 'pending',
      title: 'Staking Panda NFT',
      message: `Staking Panda #${pandaId}... Please confirm the transaction in your wallet.`
    });

    try {
      const txHash = await stakePandaNFT(pandaId);
      setNotification({
        type: 'success',
        title: 'Staking Successful! 🎉',
        message: `Panda #${pandaId} has been staked successfully. You can now earn future rewards!`,
        txHash
      });
    } catch (error: any) {
      setNotification({
        type: 'error',
        title: 'Staking Failed',
        message: error.message || 'Failed to stake Panda. Please try again.'
      });
    } finally {
      setStakingId(null);
    }
  };

  const handleUnstake = async (pandaId: number) => {
    setNotification(null);
    setUnstakingId(pandaId);

    setNotification({
      type: 'pending',
      title: 'Unstaking Panda NFT',
      message: `Unstaking Panda #${pandaId}... Please confirm the transaction in your wallet.`
    });

    try {
      const txHash = await unstakePandaNFT(pandaId);
      setNotification({
        type: 'success',
        title: 'Unstaking Successful! ✨',
        message: `Panda #${pandaId} has been unstaked successfully and is now available for use.`,
        txHash
      });
    } catch (error: any) {
      setNotification({
        type: 'error',
        title: 'Unstaking Failed',
        message: error.message || 'Failed to unstake Panda. Please try again.'
      });
    } finally {
      setUnstakingId(null);
    }
  };

  if (!isConnected) {
    return (
      <div className="stake-card empty-state">
        <h3>Connect your wallet</h3>
        <p>Connect a Stellar wallet to manage your Panda NFTs.</p>
      </div>
    );
  }

  return (
    <div className="stake-container">
      {notification && (
        <TransactionNotification
          type={notification.type}
          title={notification.title}
          message={notification.message}
          txHash={notification.txHash}
          onClose={() => setNotification(null)}
        />
      )}

      <div className="stake-overview">
        <div className="stake-stat">
          <span className="stat-label">Total Owned</span>
          <strong className="stat-value">{ownedPandaNFTs.length}</strong>
        </div>
        <div className="stake-stat">
          <span className="stat-label">Currently Staked</span>
          <strong className="stat-value">{stakedPandaNFTs.length}</strong>
        </div>
        <div className="stake-stat">
          <span className="stat-label">Available to Stake</span>
          <strong className="stat-value">
            {Math.max(ownedPandaNFTs.length - stakedPandaNFTs.length, 0)}
          </strong>
        </div>
      </div>

      {ownedPandaNFTs.length === 0 ? (
        <div className="stake-card empty-state">
          <h3>No Panda NFTs yet</h3>
          <p>Mint a Panda to start staking and earn future rewards.</p>
        </div>
      ) : (
        <div className="stake-grid">
          {ownedPandaNFTs.map((pandaId) => {
            const isStaked = stakedPandaNFTs.includes(pandaId);
            const isStaking = stakingId === pandaId;
            const isUnstaking = unstakingId === pandaId;
            const isLoading = isStaking || isUnstaking;

            return (
              <div key={pandaId} className={`stake-card ${isStaked ? 'staked' : ''}`}>
                <div className="stake-card-header">
                  <div>
                    <span className="stake-card-label">Panda #{pandaId}</span>
                    <h4>{isStaked ? 'Staked' : 'Ready to stake'}</h4>
                  </div>
                  <span className="stake-card-status">
                    {isStaked ? '🟢 Active' : '⚪ Idle'}
                  </span>
                </div>
                <p className="stake-card-copy">
                  {isStaked
                    ? 'Earning future rewards on Stellar.'
                    : 'Stake this Panda to boost on-chain rewards.'}
                </p>
                <div className="stake-card-actions">
                  {isStaked ? (
                    <button
                      className="secondary-button"
                      onClick={() => handleUnstake(pandaId)}
                      disabled={isLoading}
                    >
                      {isUnstaking ? 'Unstaking...' : 'Unstake'}
                    </button>
                  ) : (
                    <button
                      className="primary-button"
                      onClick={() => handleStake(pandaId)}
                      disabled={isLoading}
                    >
                      {isStaking ? 'Staking...' : 'Stake Panda'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PandaStake;

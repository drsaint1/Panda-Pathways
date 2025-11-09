import React from 'react';
import useWalletStore from '../store/walletStore';
import './PandaSelector.css';

interface PandaSelectorProps {
  selectedPandaId: number | null;
  onSelectPanda: (pandaId: number) => void;
  onStartGame: () => void;
}

const PandaSelector: React.FC<PandaSelectorProps> = ({
  selectedPandaId,
  onSelectPanda,
  onStartGame
}) => {
  const { ownedPandaNFTs, stakedPandaNFTs } = useWalletStore();

  // Filter out staked NFTs - only show available pandas
  const availablePandas = ownedPandaNFTs.filter(
    (pandaId) => !stakedPandaNFTs.includes(pandaId)
  );

  const handleStartGame = () => {
    if (!selectedPandaId) {
      alert('Please select a Panda NFT to play with!');
      return;
    }
    onStartGame();
  };

  return (
    <div className="panda-selector-container">
      <div className="panda-selector-content">
        <h2 className="selector-title">Choose Your Panda</h2>
        <p className="selector-description">
          Select which Panda NFT you want to use for this game session
        </p>

        {availablePandas.length === 0 ? (
          <div className="no-pandas-message">
            <div className="message-icon">🔒</div>
            <h3>All Pandas Are Staked!</h3>
            <p>
              You have {ownedPandaNFTs.length} Panda{ownedPandaNFTs.length !== 1 ? 's' : ''},
              but {ownedPandaNFTs.length === 1 ? 'it is' : 'they are all'} currently staked.
            </p>
            <p className="help-text">
              Go to the <strong>Stake NFTs</strong> tab to unstake a Panda before playing.
            </p>
          </div>
        ) : (
          <>
            <div className="pandas-grid">
              {availablePandas.map((pandaId) => (
                <div
                  key={pandaId}
                  className={`panda-card ${selectedPandaId === pandaId ? 'selected' : ''}`}
                  onClick={() => onSelectPanda(pandaId)}
                >
                  <div className="panda-card-header">
                    <div className="panda-id">Panda #{pandaId}</div>
                    {selectedPandaId === pandaId && (
                      <div className="selected-badge">✓ Selected</div>
                    )}
                  </div>
                  <div className="panda-visual">
                    <span className="panda-emoji">🐼</span>
                  </div>
                  <div className="panda-info">
                    <div className="panda-status available">
                      <span className="status-dot"></span>
                      Available
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {stakedPandaNFTs.length > 0 && (
              <div className="staked-info">
                <p>
                  ℹ️ {stakedPandaNFTs.length} Panda{stakedPandaNFTs.length !== 1 ? 's are' : ' is'} currently
                  staked and cannot be used for gameplay. Unstake them in the <strong>Stake NFTs</strong> tab.
                </p>
              </div>
            )}

            <div className="selector-actions">
              <button
                className="start-game-button"
                onClick={handleStartGame}
                disabled={!selectedPandaId}
              >
                {selectedPandaId ? '🎮 Start Game' : 'Select a Panda First'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PandaSelector;

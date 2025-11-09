import { useState } from 'react';
import useWalletStore from './store/walletStore';
import WalletConnect from './components/WalletConnect';
import PandaNFTMint from './components/PandaNFTMint';
import GameCanvas from './components/GameCanvas';
import PandaStake from './components/PandaStake';
import Leaderboard from './components/Leaderboard';
import PandaSelector from './components/PandaSelector';
import './App.css';

function App() {
  const { isConnected, pandaTokenBalance, ownedPandaNFTs } = useWalletStore();
  const [showMintModal, setShowMintModal] = useState(false);
  const [selectedPandaNFT, setSelectedPandaNFT] = useState<number | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [activeSection, setActiveSection] = useState<'play' | 'stake' | 'leaderboard'>('play');

  const handleStartGame = () => {
    if (!isConnected) {
      alert('Please connect your wallet first!');
      return;
    }

    if (ownedPandaNFTs.length === 0) {
      alert('Please mint a Panda NFT first to play!');
      setShowMintModal(true);
      return;
    }

    if (!selectedPandaNFT) {
      alert('Please select a Panda NFT first!');
      return;
    }

    setGameStarted(true);
  };

  const handleSelectPanda = (pandaId: number) => {
    setSelectedPandaNFT(pandaId);
  };

  const handleChangePanda = () => {
    setSelectedPandaNFT(null);
    setGameStarted(false);
  };

  const handlePlayAgain = () => {
    // Just restart the game with the same panda
    setGameStarted(false);
    setTimeout(() => setGameStarted(true), 100);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <div className="header-left">
            <h1 className="app-title">
              <span className="panda-icon">🐼</span>
              Panda Pathways
              <span className="stellar-badge">on Stellar</span>
            </h1>
            <nav className="app-nav">
              {[
                { id: 'play', label: 'Play & Earn' },
                { id: 'stake', label: 'Stake NFTs' },
                { id: 'leaderboard', label: 'Leaderboard' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  className={`nav-button ${activeSection === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveSection(tab.id as 'play' | 'stake' | 'leaderboard')}
                >
                  {tab.label}
                </button>
              ))}
              {isConnected && ownedPandaNFTs.length < 5 && (
                <button
                  className="nav-button mint-button"
                  onClick={() => setShowMintModal(true)}
                >
                  🎨 Mint NFT
                </button>
              )}
            </nav>
          </div>
          <div className="header-right">
            <div className="header-stats">
              {isConnected && (
                <>
                  <div className="stat-item">
                    <span className="stat-label">PANDA Tokens:</span>
                    <span className="stat-value">{parseFloat(pandaTokenBalance).toFixed(2)}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">My Pandas:</span>
                    <span className="stat-value">{ownedPandaNFTs.length}/5</span>
                  </div>
                </>
              )}
            </div>
            <WalletConnect />
          </div>
        </div>
      </header>

      <main className="app-main">
        {activeSection === 'play' ? (
          <>
            {!isConnected ? (
              <div className="welcome-screen">
                <div className="welcome-content">
                  <h2>Welcome to Panda Pathways</h2>
                  <p className="welcome-description">
                    Sprint through bamboo wilds, dodge obstacles, and earn PANDA tokens!
                  </p>
                  <div className="features-grid">
                    <div className="feature-card">
                      <div className="feature-icon">🎮</div>
                      <h3>Play & Earn</h3>
                      <p>Earn PANDA tokens with every game</p>
                    </div>
                    <div className="feature-card">
                      <div className="feature-icon">🎨</div>
                      <h3>Collect NFTs</h3>
                      <p>Mint up to 5 unique Panda NFTs</p>
                    </div>
                    <div className="feature-card">
                      <div className="feature-icon">🏆</div>
                      <h3>Compete</h3>
                      <p>Build combos for bigger rewards</p>
                    </div>
                    <div className="feature-card">
                      <div className="feature-icon">⚡</div>
                      <h3>Powered by Stellar</h3>
                      <p>Fast, secure blockchain gaming</p>
                    </div>
                  </div>
                  <p className="connect-prompt">Connect a Stellar wallet with the Wallet Kit to start playing!</p>
                </div>
              </div>
            ) : ownedPandaNFTs.length === 0 && !showMintModal ? (
              <div className="mint-prompt-screen">
                <div className="mint-prompt-content">
                  <h2>Mint Your First Panda! 🐼</h2>
                  <p>You need at least one Panda NFT to play the game.</p>
                  <button
                    className="primary-button large"
                    onClick={() => setShowMintModal(true)}
                  >
                    Mint Panda NFT
                  </button>
                </div>
              </div>
            ) : !selectedPandaNFT ? (
              <PandaSelector
                selectedPandaId={selectedPandaNFT}
                onSelectPanda={handleSelectPanda}
                onStartGame={handleStartGame}
              />
            ) : (
              <GameCanvas
                selectedPandaNFT={selectedPandaNFT}
                gameStarted={gameStarted}
                onPlayAgain={handlePlayAgain}
                onChangePanda={handleChangePanda}
              />
            )}

            {!gameStarted && isConnected && ownedPandaNFTs.length > 0 && selectedPandaNFT && (
              <div className="quick-actions">
                <button
                  className="action-button"
                  onClick={handleChangePanda}
                >
                  🔄 Change Selected Panda
                </button>
                <button
                  className="action-button"
                  onClick={() => setShowMintModal(true)}
                  disabled={ownedPandaNFTs.length >= 5}
                >
                  {ownedPandaNFTs.length >= 5
                    ? 'Max Pandas Minted'
                    : '➕ Mint Another Panda'}
                </button>
              </div>
            )}
          </>
        ) : activeSection === 'stake' ? (
          <PandaStake />
        ) : (
          <Leaderboard />
        )}
      </main>

      {showMintModal && (
        <PandaNFTMint
          onClose={() => setShowMintModal(false)}
          onMinted={() => {
            setShowMintModal(false);
          }}
          isFirstMint={ownedPandaNFTs.length === 0}
        />
      )}
    </div>
  );
}

export default App;

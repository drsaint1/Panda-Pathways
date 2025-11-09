import React, { useState, useEffect } from 'react';
import useWalletStore, { LeaderboardEntry } from '../store/walletStore';
import './Leaderboard.css';

const Leaderboard: React.FC = () => {
  const { fetchLeaderboard } = useWalletStore();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchLeaderboard();
      setLeaderboard(data);
    } catch (err: any) {
      console.error('Failed to load leaderboard:', err);
      setError('Failed to load leaderboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    if (address.length <= 12) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <div className="leaderboard-container">
      <header className="leaderboard-header">
        <div>
          <p className="leaderboard-label">Top runners</p>
          <h3>Panda Pathways Elite</h3>
        </div>
        <button className="leaderboard-chip refresh-button" onClick={loadLeaderboard}>
          🔄 Refresh
        </button>
      </header>

      <div className="leaderboard-table">
        <div className="leaderboard-row header">
          <span>#</span>
          <span>Player</span>
          <span>High Score</span>
          <span>Games Played</span>
          <span>PANDA Earned</span>
        </div>

        {isLoading ? (
          <div className="leaderboard-loading">
            <div className="loading-spinner"></div>
            <p>Loading leaderboard...</p>
          </div>
        ) : error ? (
          <div className="leaderboard-error">
            <p>{error}</p>
            <button onClick={loadLeaderboard}>Try Again</button>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="leaderboard-empty">
            <p>🎮 No scores yet! Be the first to play and set a record!</p>
          </div>
        ) : (
          leaderboard.map((entry, index) => (
            <div key={entry.player} className="leaderboard-row">
              <span className="rank">{index + 1}</span>
              <span className="player" title={entry.player}>
                {formatAddress(entry.player)}
              </span>
              <span>{entry.highScore.toLocaleString()}</span>
              <span>{entry.gamesPlayed}</span>
              <span>{entry.totalEarned.toFixed(2)} PANDA</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Leaderboard;

import { formatDistance } from './geo-utils.js';

const screens = {
  start: document.getElementById('screen-start'),
  question: document.getElementById('screen-question'),
  result: document.getElementById('screen-result'),
  final: document.getElementById('screen-final'),
  'multi-summary': document.getElementById('screen-multi-summary'),
  leaderboard: document.getElementById('screen-leaderboard')
};

const startForm = document.getElementById('start-form');
const playerNameInput = document.getElementById('player-name');
const roundCountSelect = document.getElementById('round-count');
const startError = document.getElementById('start-error');

const progressLabel = document.getElementById('progress-label');
const timerLabel = document.getElementById('timer-label');
const scoreLabel = document.getElementById('score-label');
const monumentImage = document.getElementById('monument-image');
const lockButton = document.getElementById('lock-guess');

const resultProgressLabel = document.getElementById('result-progress-label');
const resultScoreLabel = document.getElementById('result-score-label');
const resultMonumentName = document.getElementById('result-monument-name');
const resultMonumentCountry = document.getElementById('result-monument-country');
const resultDistance = document.getElementById('result-distance');
const resultPoints = document.getElementById('result-points');
const nextRoundButton = document.getElementById('next-round');

const finalSummary = document.getElementById('final-summary');
const finalBreakdownBody = document.querySelector('#final-breakdown tbody');
const playAgainButton = document.getElementById('play-again');
const viewLeaderboardButton = document.getElementById('view-leaderboard');

const leaderboardToggle = document.getElementById('leaderboard-toggle');
const leaderboardBack = document.getElementById('leaderboard-back');
const leaderboardRows = document.getElementById('leaderboard-rows');

const soloToggle = document.getElementById('solo-toggle');
const playerAddInput = document.getElementById('player-add-input');
const playerAddBtn = document.getElementById('player-add-btn');
const playerListEl = document.getElementById('player-list');
const singlePlayerSection = document.getElementById('single-player-section');
const playerListSection = document.getElementById('player-list-section');

const multiSummaryBody = document.querySelector('#multi-summary-table tbody');
const multiPlayAgainBtn = document.getElementById('multi-play-again');
const multiViewLeaderboardBtn = document.getElementById('multi-view-leaderboard');

const toast = document.getElementById('toast');

const PLACEHOLDER_IMAGE =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240" viewBox="0 0 400 240">' +
      '<rect width="400" height="240" fill="#334155"/>' +
      '<text x="50%" y="50%" fill="#94a3b8" font-family="sans-serif" font-size="18" text-anchor="middle" dominant-baseline="middle">Image unavailable</text>' +
      '</svg>'
  );

export function showScreen(name) {
  Object.entries(screens).forEach(([key, el]) => {
    el.classList.toggle('hidden', key !== name);
  });
}

export function showToast(message, durationMs = 4000) {
  toast.textContent = message;
  toast.classList.remove('hidden');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => toast.classList.add('hidden'), durationMs);
}

export function setStartError(message) {
  startError.textContent = message || '';
}

export function getStartFormValues() {
  return {
    playerName: playerNameInput.value.trim(),
    roundCount: Number(roundCountSelect.value)
  };
}

export function onStartSubmit(handler) {
  startForm.addEventListener('submit', (event) => {
    event.preventDefault();
    handler();
  });
}

export function renderQuestion(monument, index, total, score, playerName) {
  const prefix = playerName ? `${playerName} — ` : '';
  progressLabel.textContent = `${prefix}Manche ${index + 1} / ${total}`;
  scoreLabel.textContent = `Score : ${score}`;
  monumentImage.src = monument.imageUrl;
  monumentImage.alt = '?';
  monumentImage.onerror = () => {
    monumentImage.onerror = null;
    monumentImage.src = PLACEHOLDER_IMAGE;
  };
  setLockEnabled(false);
}

export function setTimerDisplay(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  timerLabel.textContent = `${m}:${s.toString().padStart(2, '0')}`;
  timerLabel.classList.toggle('timer-warning', seconds > 0 && seconds <= 10);
  timerLabel.classList.toggle('timer-expired', seconds <= 0);
}

export function setLockEnabled(enabled) {
  lockButton.disabled = !enabled;
}

export function onLockGuess(handler) {
  lockButton.addEventListener('click', handler);
}

export function onNextRound(handler) {
  nextRoundButton.addEventListener('click', handler);
}

export function renderResult(monument, index, total, score, distanceKm, points, playerName) {
  const prefix = playerName ? `${playerName} — ` : '';
  resultProgressLabel.textContent = `${prefix}Manche ${index + 1} / ${total}`;
  resultScoreLabel.textContent = `Score : ${score}`;
  resultMonumentName.textContent = monument.name;
  resultMonumentCountry.textContent = monument.country;
  resultDistance.textContent = formatDistance(distanceKm);
  resultPoints.textContent = `+${points}`;

  const isLastRound = index + 1 >= total;
  nextRoundButton.textContent = isLastRound ? 'Voir le score final' : 'Monument suivant';
}

export function renderFinal(playerName, totalScore, breakdown) {
  finalSummary.textContent = `${playerName}, ton score total est ${totalScore} points.`;
  finalBreakdownBody.innerHTML = '';
  breakdown.forEach((round, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${round.monumentName}</td>
      <td>${formatDistance(round.distanceKm)}</td>
      <td>${round.score}</td>
    `;
    finalBreakdownBody.appendChild(tr);
  });
}

export function onPlayAgain(handler) {
  playAgainButton.addEventListener('click', handler);
}

export function onViewLeaderboard(handler) {
  viewLeaderboardButton.addEventListener('click', handler);
}

export function onLeaderboardOpen(handler) {
  leaderboardToggle.addEventListener('click', handler);
}

export function onLeaderboardBack(handler) {
  leaderboardBack.addEventListener('click', handler);
}

export function renderLeaderboard(rows) {
  leaderboardRows.innerHTML = '';
  if (rows.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="5">Aucun score pour l\'instant. Soyez le premier&nbsp;!</td>';
    leaderboardRows.appendChild(tr);
    return;
  }
  rows.forEach((row, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${escapeHtml(row.playerName)}</td>
      <td>${row.bestScore}</td>
      <td>${row.gamesPlayed}</td>
      <td>${row.averageScore}</td>
    `;
    leaderboardRows.appendChild(tr);
  });
}

export function resetStartForm() {
  startForm.reset();
  roundCountSelect.value = '5';
  setStartError('');
}

export function onPlayerAdd(handler) {
  playerAddBtn.addEventListener('click', () => {
    const name = playerAddInput.value.trim();
    if (name) {
      handler(name);
      playerAddInput.value = '';
    }
  });
  playerAddInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const name = playerAddInput.value.trim();
      if (name) {
        handler(name);
        playerAddInput.value = '';
      }
    }
  });
}

export function onSoloToggle(handler) {
  soloToggle.addEventListener('click', handler);
}

export function setMode(mode) {
  const solo = mode === 'solo';
  soloToggle.classList.toggle('active', solo);
  singlePlayerSection.classList.toggle('hidden', !solo);
  playerListSection.classList.toggle('hidden', solo);
  playerNameInput.required = solo;
}

export function renderPlayerList(players, onRemove) {
  playerListEl.innerHTML = '';
  if (players.length === 0) {
    playerListEl.innerHTML = '<tr class="player-empty-row"><td colspan="3">Aucun joueur ajouté</td></tr>';
    return;
  }
  players.forEach((name, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${i + 1}</td><td>${escapeHtml(name)}</td><td></td>`;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'player-remove-btn';
    btn.textContent = '×';
    btn.addEventListener('click', () => onRemove(i));
    tr.lastElementChild.appendChild(btn);
    playerListEl.appendChild(tr);
  });
}

export function setFinalForMultiPlayer(nextPlayerName) {
  if (nextPlayerName) {
    playAgainButton.textContent = `Au tour de ${nextPlayerName} →`;
  } else {
    playAgainButton.textContent = 'Voir le récapitulatif';
  }
}

export function resetFinalButtons() {
  playAgainButton.textContent = 'Rejouer';
}

export function renderMultiSummary(results) {
  const sorted = [...results].sort((a, b) => b.totalScore - a.totalScore);
  multiSummaryBody.innerHTML = '';
  sorted.forEach((r, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${escapeHtml(r.playerName)}</td>
      <td>${r.totalScore}</td>
    `;
    multiSummaryBody.appendChild(tr);
  });
}

export function onMultiPlayAgain(handler) {
  multiPlayAgainBtn.addEventListener('click', handler);
}

export function onMultiViewLeaderboard(handler) {
  multiViewLeaderboardBtn.addEventListener('click', handler);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

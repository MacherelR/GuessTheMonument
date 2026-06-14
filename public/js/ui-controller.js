import { formatDistance } from './geo-utils.js';

const screens = {
  start: document.getElementById('screen-start'),
  question: document.getElementById('screen-question'),
  result: document.getElementById('screen-result'),
  final: document.getElementById('screen-final')
};

const startForm = document.getElementById('start-form');
const playerNameInput = document.getElementById('player-name');
const roundCountSelect = document.getElementById('round-count');
const startError = document.getElementById('start-error');

const progressLabel = document.getElementById('progress-label');
const scoreLabel = document.getElementById('score-label');
const monumentName = document.getElementById('monument-name');
const monumentCountry = document.getElementById('monument-country');
const monumentImage = document.getElementById('monument-image');
const imageAttribution = document.getElementById('image-attribution');
const lockButton = document.getElementById('lock-guess');

const resultProgressLabel = document.getElementById('result-progress-label');
const resultScoreLabel = document.getElementById('result-score-label');
const resultMonumentName = document.getElementById('result-monument-name');
const resultDistance = document.getElementById('result-distance');
const resultPoints = document.getElementById('result-points');
const nextRoundButton = document.getElementById('next-round');

const finalSummary = document.getElementById('final-summary');
const finalBreakdownBody = document.querySelector('#final-breakdown tbody');
const playAgainButton = document.getElementById('play-again');
const viewLeaderboardButton = document.getElementById('view-leaderboard');

const leaderboardPanel = document.getElementById('leaderboard-panel');
const leaderboardBackdrop = document.getElementById('leaderboard-backdrop');
const leaderboardRows = document.getElementById('leaderboard-rows');
const leaderboardToggle = document.getElementById('leaderboard-toggle');
const leaderboardClose = document.getElementById('leaderboard-close');

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

export function renderQuestion(monument, index, total, score) {
  progressLabel.textContent = `Round ${index + 1} / ${total}`;
  scoreLabel.textContent = `Score: ${score}`;
  monumentName.textContent = monument.name;
  monumentCountry.textContent = monument.country;
  monumentImage.src = monument.imageUrl;
  monumentImage.alt = monument.name;
  monumentImage.onerror = () => {
    monumentImage.onerror = null;
    monumentImage.src = PLACEHOLDER_IMAGE;
  };
  imageAttribution.textContent = monument.imageAttribution || '';
  setLockEnabled(false);
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

export function renderResult(monument, index, total, score, distanceKm, points) {
  resultProgressLabel.textContent = `Round ${index + 1} / ${total}`;
  resultScoreLabel.textContent = `Score: ${score}`;
  resultMonumentName.textContent = monument.name;
  resultDistance.textContent = formatDistance(distanceKm);
  resultPoints.textContent = `+${points}`;

  const isLastRound = index + 1 >= total;
  nextRoundButton.textContent = isLastRound ? 'See Final Score' : 'Next Monument';
}

export function renderFinal(playerName, totalScore, breakdown) {
  finalSummary.textContent = `${playerName}, your total score is ${totalScore}.`;
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

export function renderLeaderboard(rows) {
  leaderboardRows.innerHTML = '';
  if (rows.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="4">No scores yet. Be the first!</td>';
    leaderboardRows.appendChild(tr);
    return;
  }
  rows.forEach((row) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(row.playerName)}</td>
      <td>${row.bestScore}</td>
      <td>${row.gamesPlayed}</td>
      <td>${row.averageScore}</td>
    `;
    leaderboardRows.appendChild(tr);
  });
}

export function openLeaderboard() {
  leaderboardPanel.classList.remove('hidden');
  leaderboardBackdrop.classList.remove('hidden');
}

export function closeLeaderboard() {
  leaderboardPanel.classList.add('hidden');
  leaderboardBackdrop.classList.add('hidden');
}

export function onLeaderboardOpen(handler) {
  leaderboardToggle.addEventListener('click', handler);
}

export function onLeaderboardClose(handler) {
  leaderboardClose.addEventListener('click', handler);
  leaderboardBackdrop.addEventListener('click', handler);
}

export function resetStartForm() {
  startForm.reset();
  roundCountSelect.value = '7';
  setStartError('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

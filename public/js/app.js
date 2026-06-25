import { GameController } from './game-controller.js';
import { GuessMapController, ResultMapController } from './map-controller.js';
import { fetchLeaderboard, resetLeaderboard } from './data-store.js';
import * as ui from './ui-controller.js';

const TIME_LIMIT_SECONDS = 30;

const game = new GameController();
let guessMap = null;
let resultMap = null;
let pendingGuess = null;
let previousScreen = 'start';
let countdownTimer = null;
let remainingSeconds = 0;

let gameMode = 'multi';
let multiPlayerList = loadPlayers();
let multiPlayerIndex = 0;
let multiPlayerResults = [];
let multiPlayerRoundCount = 5;

ui.onStartSubmit(handleStart);
ui.onLockGuess(handleLockGuess);
ui.onNextRound(handleNextRound);
ui.onPlayAgain(handlePlayAgain);
ui.onViewLeaderboard(() => openLeaderboard('final'));
ui.onLeaderboardOpen(() => openLeaderboard(currentScreen()));
ui.onLeaderboardBack(() => ui.showScreen(previousScreen));
ui.onLeaderboardReset(handleResetLeaderboard);
ui.onMultiPlayAgain(handleMultiPlayAgain);
ui.onMultiViewLeaderboard(() => openLeaderboard('multi-summary'));

ui.onSoloToggle(() => {
  gameMode = gameMode === 'solo' ? 'multi' : 'solo';
  ui.setMode(gameMode);
  ui.setStartError('');
});

ui.onPlayerAdd((name) => {
  multiPlayerList.push(name);
  savePlayers();
  refreshPlayerList();
});

ui.onPlayerClear(() => {
  multiPlayerList = [];
  savePlayers();
  refreshPlayerList();
});

ui.showScreen('start');
refreshPlayerList();

function refreshPlayerList() {
  ui.renderPlayerList(multiPlayerList, handleRemovePlayer, handleRenamePlayer);
}

function handleRemovePlayer(index) {
  multiPlayerList.splice(index, 1);
  savePlayers();
  refreshPlayerList();
}

function handleRenamePlayer(index, newName) {
  multiPlayerList[index] = newName;
  savePlayers();
  refreshPlayerList();
}

function savePlayers() {
  try { localStorage.setItem('gtm_players', JSON.stringify(multiPlayerList)); } catch (e) {}
}

function loadPlayers() {
  try {
    const stored = localStorage.getItem('gtm_players');
    if (stored) return JSON.parse(stored);
  } catch (e) {}
  return [];
}

function currentScreen() {
  const names = ['start', 'question', 'result', 'final', 'multi-summary', 'leaderboard'];
  for (const name of names) {
    const el = document.getElementById(`screen-${name}`);
    if (el && !el.classList.contains('hidden')) return name;
  }
  return 'start';
}

function openLeaderboard(from) {
  previousScreen = from;
  ui.showScreen('leaderboard');
  loadLeaderboard();
}

function isMultiPlayer() {
  return gameMode === 'multi' && multiPlayerList.length > 0;
}

function currentPlayerName() {
  return isMultiPlayer() ? multiPlayerList[multiPlayerIndex] : null;
}

async function handleStart() {
  const { playerName, roundCount } = ui.getStartFormValues();

  if (gameMode === 'multi') {
    if (multiPlayerList.length === 0) {
      ui.setStartError('Ajoute au moins un joueur pour commencer.');
      return;
    }
    multiPlayerIndex = 0;
    multiPlayerResults = [];
    multiPlayerRoundCount = roundCount;
    ui.setStartError('');
    try {
      await game.start(multiPlayerList[0], roundCount);
      startQuestionRound();
    } catch (err) {
      ui.setStartError(err.message || 'Impossible de démarrer la partie. Réessaie.');
    }
  } else {
    if (!playerName || playerName.trim().length === 0) {
      ui.setStartError('Saisis ton prénom pour commencer.');
      return;
    }
    ui.setStartError('');
    try {
      await game.start(playerName, roundCount);
      startQuestionRound();
    } catch (err) {
      ui.setStartError(err.message || 'Impossible de démarrer la partie. Réessaie.');
    }
  }
}

function startTimer() {
  clearTimer();
  remainingSeconds = TIME_LIMIT_SECONDS;
  ui.setTimerDisplay(remainingSeconds);
  countdownTimer = setInterval(() => {
    remainingSeconds -= 1;
    ui.setTimerDisplay(remainingSeconds);
    if (remainingSeconds <= 0) {
      clearTimer();
      handleTimerExpired();
    }
  }, 1000);
}

function clearTimer() {
  clearInterval(countdownTimer);
  countdownTimer = null;
}

async function handleTimerExpired() {
  ui.setLockEnabled(false);
  const guess = pendingGuess ?? { lat: 0, lng: 0 };
  try {
    const result = await game.submitCurrentGuess(guess.lat, guess.lng);
    showRoundResult(result);
  } catch (err) {
    ui.showToast(err.message || 'Impossible de soumettre ta réponse.');
  }
}

function startQuestionRound() {
  ui.showScreen('question');
  pendingGuess = null;

  if (!guessMap) {
    guessMap = new GuessMapController('map');
  } else {
    guessMap.reset();
  }
  guessMap.onGuessChange = (lat, lng) => {
    pendingGuess = { lat, lng };
    ui.setLockEnabled(true);
  };
  guessMap.invalidateSize();

  ui.renderQuestion(game.currentMonument, game.currentIndex, game.roundCount, game.totalScore, currentPlayerName());
  startTimer();
}

async function handleLockGuess() {
  if (!pendingGuess) {
    ui.showToast('Place une épingle sur la carte avant de valider.');
    return;
  }

  ui.setLockEnabled(false);

  try {
    const result = await game.submitCurrentGuess(pendingGuess.lat, pendingGuess.lng);
    showRoundResult(result);
  } catch (err) {
    ui.showToast(err.message || 'Impossible de soumettre ta réponse. Réessaie.');
    ui.setLockEnabled(true);
  }
}

function showRoundResult(result) {
  clearTimer();
  ui.showScreen('result');

  if (!resultMap) {
    resultMap = new ResultMapController('result-map');
  }
  resultMap.invalidateSize();
  resultMap.reveal(
    { lat: result.guessLat, lng: result.guessLng },
    { lat: result.actualLat, lng: result.actualLng }
  );

  ui.renderResult(
    game.currentMonument,
    game.currentIndex,
    game.roundCount,
    game.totalScore,
    result.distanceKm,
    result.score,
    currentPlayerName()
  );
}

async function handleNextRound() {
  if (game.isLastRound) {
    try {
      const summary = await game.finish();
      ui.renderFinal(summary.playerName, summary.totalScore, summary.breakdown);

      if (isMultiPlayer()) {
        multiPlayerResults.push({
          playerName: summary.playerName,
          totalScore: summary.totalScore,
          breakdown: summary.breakdown
        });
        const isLastPlayer = multiPlayerIndex >= multiPlayerList.length - 1;
        const nextName = isLastPlayer ? null : multiPlayerList[multiPlayerIndex + 1];
        ui.setFinalForMultiPlayer(nextName);
      } else {
        ui.resetFinalButtons();
      }

      ui.showScreen('final');
    } catch (err) {
      ui.showToast(err.message || 'Impossible de sauvegarder ton score. Réessaie.');
    }
    return;
  }

  game.advance();
  startQuestionRound();
}

function handlePlayAgain() {
  if (isMultiPlayer()) {
    if (multiPlayerIndex < multiPlayerList.length - 1) {
      multiPlayerIndex++;
      startNextMultiPlayer();
    } else {
      ui.renderMultiSummary(multiPlayerResults);
      ui.showScreen('multi-summary');
    }
  } else {
    ui.resetStartForm();
    ui.showScreen('start');
  }
}

async function startNextMultiPlayer() {
  const playerName = multiPlayerList[multiPlayerIndex];
  try {
    await game.start(playerName, multiPlayerRoundCount);
    startQuestionRound();
  } catch (err) {
    ui.showToast(err.message || 'Impossible de démarrer la partie. Réessaie.');
  }
}

function handleMultiPlayAgain() {
  ui.resetStartForm();
  gameMode = 'multi';
  ui.setMode('multi');
  refreshPlayerList();
  ui.showScreen('start');
}

async function loadLeaderboard() {
  try {
    const data = await fetchLeaderboard();
    ui.renderLeaderboard(data.leaderboard);
  } catch (err) {
    ui.renderLeaderboard([]);
    ui.showToast('Impossible de charger le classement.');
  }
}

async function handleResetLeaderboard() {
  if (!confirm('Supprimer tous les scores ? Cette action est irréversible.')) return;
  try {
    await resetLeaderboard();
    ui.renderLeaderboard([]);
    ui.showToast('Classement réinitialisé.');
  } catch (err) {
    ui.showToast('Impossible de réinitialiser le classement.');
  }
}

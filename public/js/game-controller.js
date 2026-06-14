import { createSession, submitGuess, completeSession } from './data-store.js';

// Holds session state and orchestrates calls to the backend for one playthrough.
export class GameController {
  constructor() {
    this.sessionId = null;
    this.playerName = null;
    this.monuments = [];
    this.currentIndex = 0;
    this.totalScore = 0;
    this.lastResult = null;
  }

  async start(playerName, roundCount) {
    const data = await createSession(playerName, roundCount);
    this.sessionId = data.sessionId;
    this.playerName = data.playerName;
    this.monuments = data.monuments;
    this.currentIndex = 0;
    this.totalScore = 0;
    this.lastResult = null;
    return data;
  }

  get currentMonument() {
    return this.monuments[this.currentIndex];
  }

  get roundCount() {
    return this.monuments.length;
  }

  get isLastRound() {
    return this.currentIndex + 1 >= this.roundCount;
  }

  async submitCurrentGuess(lat, lng) {
    const result = await submitGuess(this.sessionId, this.currentMonument.id, lat, lng);
    this.totalScore += result.score;
    this.lastResult = result;
    return result;
  }

  advance() {
    this.currentIndex += 1;
  }

  async finish() {
    return completeSession(this.sessionId);
  }
}

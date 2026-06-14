async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
  } catch (err) {
    throw new Error('Network error. Please check your connection and try again.');
  }

  let body = null;
  try {
    body = await response.json();
  } catch (err) {
    body = null;
  }

  if (!response.ok) {
    const message = (body && body.error) || `Request failed with status ${response.status}.`;
    throw new Error(message);
  }

  return body;
}

export function createSession(playerName, roundCount) {
  return request('/api/sessions', {
    method: 'POST',
    body: JSON.stringify({ playerName, roundCount })
  });
}

export function submitGuess(sessionId, monumentId, lat, lng) {
  return request(`/api/sessions/${sessionId}/guess`, {
    method: 'POST',
    body: JSON.stringify({ monumentId, lat, lng })
  });
}

export function completeSession(sessionId) {
  return request(`/api/sessions/${sessionId}/complete`, {
    method: 'POST'
  });
}

export function fetchLeaderboard() {
  return request('/api/leaderboard');
}

const WORLD_BOUNDS = L.latLngBounds(L.latLng(-85, -180), L.latLng(85, 180));

// Pedzo mascot used as the player's guess pin.
const GUESS_ICON = L.icon({
  iconUrl: '/images/pedzo_sac.png',
  iconSize: [48, 64],
  iconAnchor: [24, 64]
});

// Standard Leaflet marker for the revealed actual location.
const ACTUAL_ICON = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

// Controls the question-screen map: click-to-place and drag-to-adjust guess marker.
export class GuessMapController {
  constructor(elementId) {
    this.map = L.map(elementId, {
      worldCopyJump: true,
      maxBounds: WORLD_BOUNDS.pad(0.5),
      minZoom: 2
    }).setView([20, 0], 2);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      noWrap: false
    }).addTo(this.map);

    this.marker = null;
    this.onGuessChange = null;

    this.map.on('click', (event) => {
      this.setGuess(event.latlng.lat, event.latlng.lng);
    });

    // Allow keyboard users to invalidate sizing once the screen becomes visible.
    setTimeout(() => this.map.invalidateSize(), 0);
  }

  setGuess(lat, lng) {
    const latlng = L.latLng(lat, lng);
    if (this.marker) {
      this.marker.setLatLng(latlng);
    } else {
      this.marker = L.marker(latlng, { icon: GUESS_ICON, draggable: true }).addTo(this.map);
      this.marker.on('dragend', () => {
        const pos = this.marker.getLatLng();
        if (this.onGuessChange) this.onGuessChange(pos.lat, pos.lng);
      });
    }
    if (this.onGuessChange) this.onGuessChange(lat, lng);
  }

  getGuess() {
    if (!this.marker) return null;
    const pos = this.marker.getLatLng();
    return { lat: pos.lat, lng: pos.lng };
  }

  reset() {
    if (this.marker) {
      this.map.removeLayer(this.marker);
      this.marker = null;
    }
    this.map.setView([20, 0], 2);
  }

  invalidateSize() {
    this.map.invalidateSize();
  }
}

// Controls the result-screen map: shows guess marker, actual marker, and a line between them.
export class ResultMapController {
  constructor(elementId) {
    this.map = L.map(elementId, {
      worldCopyJump: true,
      minZoom: 2
    }).setView([20, 0], 2);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      noWrap: false
    }).addTo(this.map);

    this.layers = [];
    setTimeout(() => this.map.invalidateSize(), 0);
  }

  reveal(guess, actual) {
    this.clear();

    const guessLatLng = L.latLng(guess.lat, guess.lng);
    const actualLatLng = L.latLng(actual.lat, actual.lng);

    const guessMarker = L.marker(guessLatLng, { icon: GUESS_ICON }).bindTooltip('Ta position', {
      permanent: true,
      direction: 'top'
    });
    const actualMarker = L.marker(actualLatLng, { icon: ACTUAL_ICON }).bindTooltip('Position réelle', {
      permanent: true,
      direction: 'bottom'
    });

    const line = L.polyline([guessLatLng, actualLatLng], {
      color: '#38bdf8',
      weight: 2,
      dashArray: '6 6'
    });

    [guessMarker, actualMarker, line].forEach((layer) => {
      layer.addTo(this.map);
      this.layers.push(layer);
    });

    const bounds = L.latLngBounds([guessLatLng, actualLatLng]);
    this.map.fitBounds(bounds, { padding: [40, 40], maxZoom: 8 });
  }

  clear() {
    this.layers.forEach((layer) => this.map.removeLayer(layer));
    this.layers = [];
  }

  invalidateSize() {
    this.map.invalidateSize();
  }
}

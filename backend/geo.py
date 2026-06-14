import math

EARTH_RADIUS_KM = 6371


def haversine_distance_km(lat1, lon1, lat2, lon2):
    """Great-circle distance between two lat/lng points, in kilometers."""
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return EARTH_RADIUS_KM * c


def score_from_distance(distance_km):
    """Continuous scoring curve: max(0, round(5000 * e^(-distanceKm / 2000)))."""
    return max(0, round(5000 * math.exp(-distance_km / 2000)))

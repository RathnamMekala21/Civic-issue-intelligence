import math
from typing import List, Dict, Optional

class SpatialDuplicateClusterer:
    """
    DBSCAN-inspired Spatial & Category Clustering Engine.
    Aggregates nearby civic issues within a 50-meter radius of the same category into a Master Ticket.
    """

    def __init__(self, radius_meters: float = 50.0):
        self.radius_meters = radius_meters

    def haversine_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        Calculates distance between two GPS coordinates in meters using Haversine formula.
        """
        R = 6371000.0  # Earth radius in meters
        phi1, phi2 = math.radians(lat1), math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)

        a = math.sin(delta_phi / 2.0) ** 2 + \
            math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2

        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        return R * c

    def find_duplicate_master_ticket(
        self,
        new_lat: float,
        new_lon: float,
        new_category: str,
        active_issues: List[Dict]
    ) -> Optional[Dict]:
        """
        Searches active issues to check if a master ticket exists within radius_meters for the same category.
        """
        for issue in active_issues:
            if issue.get("status") in ["Resolved", "Closed"]:
                continue

            if issue.get("category", "").lower() != new_category.lower():
                continue

            lat = issue.get("latitude")
            lon = issue.get("longitude")
            if lat is None or lon is None:
                continue

            dist = self.haversine_distance(new_lat, new_lon, lat, lon)
            if dist <= self.radius_meters:
                return {
                    "master_ticket_id": issue.get("ticket_id"),
                    "distance_meters": round(dist, 1),
                    "original_reporter": issue.get("citizen_name", "Anonymous"),
                    "master_issue_title": issue.get("title")
                }

        return None

clusterer = SpatialDuplicateClusterer(radius_meters=50.0)

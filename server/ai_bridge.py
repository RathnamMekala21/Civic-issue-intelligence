"""
AI Bridge: Bridges Node.js Express server to Python AI Models
(YOLOv8 Defect Detection, DBSCAN Spatial Clustering, OpenCV SSIM Verification).
Can be called via CLI: python ai_bridge.py <command>
Payload can be piped via stdin or passed as a JSON string argument.
"""
import sys
import os
import json

# Ensure project root is in sys.path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from ai_engine.yolo_detector import CivicAIDetector
from ai_engine.spatial_clustering import SpatialDuplicateClusterer
from ai_engine.ssim_verifier import AIResolutionVerifier

detector = CivicAIDetector()
clusterer = SpatialDuplicateClusterer(radius_meters=50.0)
verifier = AIResolutionVerifier(threshold=0.80)

def handle_detect(payload):
    image_path = payload.get("image_path", "")
    description = payload.get("description", "")
    return detector.detect_defect(image_path, description)

def handle_cluster(payload):
    lat = float(payload.get("latitude", 0.0))
    lon = float(payload.get("longitude", 0.0))
    category = payload.get("category", "")
    active_issues = payload.get("active_issues", [])
    return clusterer.find_duplicate_master_ticket(lat, lon, category, active_issues)

def handle_verify(payload):
    orig_path = payload.get("original_photo_path", "")
    comp_path = payload.get("completion_photo_path", "")
    return verifier.verify_resolution(orig_path, comp_path)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python ai_bridge.py <detect|cluster|verify> [json_payload]"}))
        sys.exit(1)

    cmd = sys.argv[1]
    
    # Read payload from CLI argument or stdin
    if len(sys.argv) >= 3:
        raw_payload = sys.argv[2]
    else:
        raw_payload = sys.stdin.read()

    try:
        payload = json.loads(raw_payload) if raw_payload.strip() else {}
    except Exception as e:
        print(json.dumps({"error": f"Invalid JSON payload: {str(e)}", "received": raw_payload[:100]}))
        sys.exit(1)

    try:
        if cmd == "detect":
            result = handle_detect(payload)
        elif cmd == "cluster":
            result = handle_cluster(payload)
        elif cmd == "verify":
            result = handle_verify(payload)
        else:
            result = {"error": f"Unknown command: {cmd}"}

        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

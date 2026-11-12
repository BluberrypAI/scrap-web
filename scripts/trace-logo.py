"""Build solid-mesh outlines from the original logo's alpha; never rewrite the PNG.
Optional authoring tool: Python + opencv-python-headless. Not a runtime dependency.
"""
import json
from pathlib import Path
import cv2
import numpy as np

root = Path(__file__).resolve().parents[1]
source = root / 'public/images/scrap-compass-3d.png'
image = cv2.imdecode(np.fromfile(source, dtype=np.uint8), cv2.IMREAD_UNCHANGED)
mask = (image[:, :, 3] >= 150).astype(np.uint8) * 255
contours, hierarchy = cv2.findContours(mask, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
hierarchy = hierarchy[0]

def points(index):
    return cv2.approxPolyDP(contours[index], 1.2, True).reshape(-1, 2).tolist()

parts = []
for index, contour in enumerate(contours):
    # Only visible major components; preserve their original internal holes.
    depth, parent = 0, int(hierarchy[index][3])
    while parent != -1:
        depth += 1
        parent = int(hierarchy[parent][3])
    if depth % 2 or cv2.contourArea(contour) < 120:
        continue
    holes = []
    child = int(hierarchy[index][2])
    while child != -1:
        if cv2.contourArea(contours[child]) > 70:
            holes.append(points(child))
        child = int(hierarchy[child][0])
    parts.append({'outline': points(index), 'holes': holes})

result = {'source': '/images/scrap-compass-3d.png', 'width': image.shape[1], 'height': image.shape[0], 'parts': parts}
target = root / 'src/pages/landing/compass-outline.json'
target.write_text(json.dumps(result, separators=(',', ':')), encoding='utf-8')
print(f'{len(parts)} solid parts, {sum(len(part["holes"]) for part in parts)} holes; {target.name}')

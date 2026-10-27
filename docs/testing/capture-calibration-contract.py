"""Execute the pinned backend's pure geometry module, without checkout or HTTP writes.

Run from the frontend repository:
python docs/testing/capture-calibration-contract.py --output docs/testing/calibration-contract-fixtures-2026-10-23.json

The sibling backend repository must contain the pinned Git object. This script
never fetches, installs dependencies, imports the backend app, or opens a database.
"""

import argparse
import copy
import hashlib
import json
import math
import subprocess
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REVISION = "279139d4c1ea795bd26578e3595f5e38b14b4712"
MODULE = "src/vetorthoplan/domain/planning/measurements.py"
SCHEMAS = [
    "PlanPoint", "PlanReferenceLineCalibration", "PlanReferenceCircleCalibration",
    "PlanCalibrationResult", "PlanDocument", "ImagePlanResponse", "SaveImagePlanRequest",
]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--backend-repo", type=Path, default=ROOT.parent / "vetorthoplan_backend")
    parser.add_argument("--output", type=Path)
    parser.add_argument("--openapi", type=Path, default=ROOT / "docs/openapi/clinical-api.duplicate-2026-10-23.openapi.json",
                        help="Preserved contract matching the pinned backend; defaults to the original calibration capture")
    options = parser.parse_args()
    backend = options.backend_repo.resolve()

    def read_git(path):
        return subprocess.check_output([
            "git", "-c", f"safe.directory={backend.as_posix()}", "-C", str(backend),
            "show", f"{REVISION}:{path}",
        ])

    # The current API can evolve independently. Reproduce this historical
    # geometry capture against its original contract, not a relabelled hash.
    reference_bytes = options.openapi.read_bytes()
    reference = json.loads(reference_bytes)
    backend_contract = json.loads(read_git("docs/openapi.json"))
    for name in SCHEMAS:
        assert reference["components"]["schemas"][name] == backend_contract["components"]["schemas"][name], name
    path = "/api/v1/images/{image_id}/plan"
    assert reference["paths"][path] == backend_contract["paths"][path]

    source = read_git(MODULE)
    namespace = {"__name__": "calibration_source_audit"}
    exec(compile(source.decode("utf-8"), f"{REVISION}:{MODULE}", "exec"), namespace)
    derive = namespace["derive_plan_measurements"]

    def line(start, end, known=50):
        return {"kind": "REFERENCE_LINE", "start": start, "end": end, "known_length_mm": known}

    def circle(edge):
        return {"kind": "REFERENCE_CIRCLE", "center": {"x": 0.5, "y": 0.5},
                "edge": edge, "known_diameter_mm": 20}

    horizontal = line({"x": 0.125, "y": 0.25}, {"x": 0.625, "y": 0.25})
    examples = [
        ("horizontal", 2000, 1000, horizontal, 1000),
        ("vertical", 2000, 1000, line({"x": 0.25, "y": 0.125}, {"x": 0.25, "y": 0.625}), 500),
        ("diagonal", 2000, 1000, line({"x": 0.125, "y": 0.125}, {"x": 0.625, "y": 0.625}), math.hypot(1000, 500)),
        ("full-width-edges", 2000, 1000, line({"x": 0, "y": 0.5}, {"x": 1, "y": 0.5}), 2000),
        ("circle-horizontal", 2000, 1000, circle({"x": 0.5625, "y": 0.5}), 250),
        ("circle-vertical", 2000, 1000, circle({"x": 0.5, "y": 0.625}), 250),
        ("changed-reference", 2000, 1000, {**horizontal, "known_length_mm": 100}, 1000),
        ("changed-source-dimensions", 4000, 2000, horizontal, 2000),
        ("missing-dimensions", None, 1000, horizontal, None),
        ("forged-client-result", 2000, 1000, {**horizontal, "result": {
            "calibration_id": "f" * 64, "reference_length_px": 1, "mm_per_pixel": 999,
        }}, 1000),
    ]
    records = []
    for name, width, height, calibration, expected_length in examples:
        document = {"schema_version": 1, "calibration": copy.deepcopy(calibration), "objects": []}
        before = copy.deepcopy(document)
        output = derive(document, width_px=width, height_px=height)
        assert document == before, "Backend derivation mutated its input"
        result = output["calibration"].get("result")
        if expected_length is None:
            assert result is None
        else:
            known = calibration.get("known_length_mm", calibration.get("known_diameter_mm"))
            assert math.isclose(result["reference_length_px"], expected_length, rel_tol=1e-12)
            assert math.isclose(result["mm_per_pixel"], known / expected_length, rel_tol=1e-12)
        records.append({"id": name, "widthPx": width, "heightPx": height,
                        "input": document, "output": output})

    by_id = {record["id"]: record for record in records}
    result = lambda name: by_id[name]["output"]["calibration"]["result"]
    assert result("forged-client-result") == result("horizontal")
    for changed in ["changed-reference", "changed-source-dimensions"]:
        assert result(changed)["calibration_id"] != result("horizontal")["calibration_id"]

    receipt = {
        "capturedAtUtc": datetime.now(timezone.utc).isoformat(),
        "backendRevision": REVISION,
        "backendSourceFile": MODULE,
        "backendSourceSha256": hashlib.sha256(source).hexdigest(),
        "openApiSha256": hashlib.sha256(reference_bytes).hexdigest(),
        "matchingSchemas": SCHEMAS,
        "verification": "Executed actual pinned backend pure geometry code; no HTTP, database or deployment validation.",
        "cases": records,
    }
    serialized = json.dumps(receipt, indent=2, ensure_ascii=False) + "\n"
    if options.output:
        destination = options.output.resolve()
        if not destination.is_relative_to(ROOT):
            raise ValueError("Output must remain inside the frontend repository")
        destination.write_text(serialized, encoding="utf-8")
        print(f"Verified {len(SCHEMAS)} schemas, GET/PUT contracts and {len(records)} backend geometry cases.")
    else:
        print(serialized, end="")


if __name__ == "__main__":
    main()

Import("env")

import json
import re
import subprocess
from pathlib import Path


repository_root = Path(env.subst("$PROJECT_DIR")).resolve().parents[1]
build_sha = subprocess.check_output(
    ["git", "-C", str(repository_root), "rev-parse", "HEAD"], text=True
).strip()
env.Append(CPPDEFINES=[("OPEN_RADIO_BUILD_SHA", f'\\"{build_sha}\\"')])

expected_commit = "d6184e08977c0f15f1b09eeee119b238ce562383"
environment_name = env.subst("$PIOENV")
mp3_environments = {
    "core2-public-candidate",
    "core2-hardware-lab",
    "core2-owner-production",
    "core2-local-speaker-fallback",
}
hls_environments = {"core2-hardware-lab"}
a2dp_environments = {
    "core2-public-candidate",
    "core2-hardware-lab",
    "core2-owner-production",
}
audio_dependency_dir = (
    Path(env.subst("$PROJECT_LIBDEPS_DIR"))
    / environment_name
    / "ESP8266Audio"
)
manifest_path = audio_dependency_dir / "library.json"

if environment_name in mp3_environments:
    if not manifest_path.exists():
        raise RuntimeError(f"missing pinned ESP8266Audio dependency: {manifest_path}")

    actual_commit = subprocess.check_output(
        ["git", "-C", str(audio_dependency_dir), "rev-parse", "HEAD"], text=True
    ).strip()
    if actual_commit != expected_commit:
        raise RuntimeError(
            f"ESP8266Audio commit mismatch: expected {expected_commit}, got {actual_commit}"
        )

    manifest = json.loads(manifest_path.read_text())
    source_filter = [
        "-<*>",
        "+<AudioFileSourceHTTPStream.cpp>",
        "+<AudioFileSourceICYStream.cpp>",
        "+<AudioGeneratorMP3.cpp>",
        "+<AudioLogger.cpp>",
        "+<libmad/*.c>",
    ]
    if environment_name in hls_environments:
        source_filter.extend([
            "+<AudioGeneratorAAC.cpp>",
            "+<libhelix-aac/*.c>",
        ])
    manifest["build"]["srcFilter"] = source_filter
    manifest_path.write_text(json.dumps(manifest, indent=4) + "\n")

    # The pinned ICY parser waits forever when a metadata block is truncated.
    # Apply a small, reproducible dependency-workspace patch: abort the socket
    # after 500 ms so the existing bounded reconnect path can recover and the
    # owner loop cannot freeze indefinitely.
    icy_source_path = audio_dependency_dir / "src" / "AudioFileSourceICYStream.cpp"
    icy_source = icy_source_path.read_text()
    deadline_declaration = (
        "        int mdSize;\n"
        "        const uint32_t metadataStartedAtMs = millis();"
    )
    if "metadataStartedAtMs" not in icy_source:
        icy_source = icy_source.replace(
            "        int mdSize;",
            deadline_declaration,
            1,
        )
        wait_pattern = re.compile(
            r"(?P<indent> +)if \(ret == 0\) \{\n"
            r"(?P=indent)    delay\(1\);\n"
            r"(?P=indent)    continue;\n"
            r"(?P=indent)\}"
        )

        def bound_metadata_wait(match):
            indent = match.group("indent")
            return (
                f"{indent}if (ret == 0) {{\n"
                f"{indent}    if (millis() - metadataStartedAtMs >= 500U) {{\n"
                f"{indent}        http.end();\n"
                f"{indent}        return read;\n"
                f"{indent}    }}\n"
                f"{indent}    delay(1);\n"
                f"{indent}    continue;\n"
                f"{indent}}}"
            )

        icy_source, replacements = wait_pattern.subn(
            bound_metadata_wait, icy_source
        )
        if replacements != 3:
            raise RuntimeError(
                f"unexpected ICY metadata wait-loop count: {replacements}"
            )
        icy_source_path.write_text(icy_source)
    patched_icy_source = icy_source_path.read_text()
    if ("metadataStartedAtMs" not in patched_icy_source or
            patched_icy_source.count(
                "millis() - metadataStartedAtMs >= 500U") != 3):
        raise RuntimeError("failed to bound pinned ICY metadata reads")

    # The pinned decoder's default PCM scratch fits AAC-LC but not the maximum
    # stereo SBR frame documented by Helix. Keep the upstream pin and apply the
    # minimal reproducible capacity correction in the build workspace.
    if environment_name in hls_environments:
        aac_source_path = audio_dependency_dir / "src" / "AudioGeneratorAAC.cpp"
        aac_source = aac_source_path.read_text()
        if "1024 * 2" in aac_source:
            aac_source = aac_source.replace("1024 * 2", "2048 * 2")
            aac_source_path.write_text(aac_source)
        if "1024 * 2" in aac_source_path.read_text():
            raise RuntimeError("failed to expand pinned AAC SBR output buffer")

a2dp_dependency_dir = (
    Path(env.subst("$PROJECT_LIBDEPS_DIR"))
    / environment_name
    / "ESP32-A2DP"
)
a2dp_manifest_path = a2dp_dependency_dir / "library.json"
a2dp_expected_commit = "b6da4744286ca15b6f1dee607c077a4747294dd4"
if environment_name in a2dp_environments:
    a2dp_actual_commit = subprocess.check_output(
        ["git", "-C", str(a2dp_dependency_dir), "rev-parse", "HEAD"], text=True
    ).strip()
    if a2dp_actual_commit != a2dp_expected_commit:
        raise RuntimeError(
            f"ESP32-A2DP commit mismatch: expected {a2dp_expected_commit}, got {a2dp_actual_commit}"
        )

    a2dp_manifest = (
        json.loads(a2dp_manifest_path.read_text())
        if a2dp_manifest_path.exists()
        else {
            "name": "ESP32-A2DP",
            "version": "1.8.11",
            "frameworks": "arduino",
            "platforms": "espressif32",
        }
    )
    a2dp_manifest.setdefault("build", {})["srcFilter"] = [
        "-<*>",
        "+<BluetoothA2DPCommon.cpp>",
        "+<BluetoothA2DPOutput.cpp>",
        "+<BluetoothA2DPSource.cpp>",
    ]
    a2dp_manifest_path.write_text(json.dumps(a2dp_manifest, indent=4) + "\n")

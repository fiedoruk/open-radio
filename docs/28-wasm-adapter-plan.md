# 28 — WASM adapter plan

## Decision

Do not install Emscripten or add a WASM build to S3. First stabilize the C++ API,
canonical framebuffer hash and generated fixture path with the local host
compiler. WASM becomes a later parity adapter, not a second renderer.

## Proposed adapter boundary

The adapter will expose a minimal C ABI around the existing C++ core:

- `radio_framebuffer_size()` returns `320 * 240 * 2`,
- `radio_framebuffer_data()` returns the linear RGB565 buffer address,
- `radio_load_fixture(id)` selects a generated test snapshot,
- `radio_render()` returns a stable numeric `RenderStatus`,
- `radio_hash()` returns the canonical 64-bit framebuffer hash.

JavaScript will copy or view the RGB565 buffer and convert it to Canvas RGBA for
display only. It must not reproduce layout, clipping, colors or text decisions.

## Proposed build

The future build may use pinned Emscripten with C++17, no filesystem, no sockets,
no exceptions crossing the C ABI and an explicit exported-function list. The
toolchain version and image/digest must be recorded before claiming reproducible
WASM output.

## Parity gate

For every shared fixture:

1. native host and WASM render independently,
2. both return `RenderStatus::ok`,
3. both expose the same canonical RGB565 hash,
4. browser conversion changes presentation only,
5. the existing Canvas prototype remains a comparison target, not source of truth.

## Deferred evidence

- pinned Emscripten version or container digest,
- native-versus-WASM hash matrix,
- browser adapter tests,
- memory growth and startup measurements,
- decision whether the Canvas prototype can be retired.

No WASM compiler, package or global toolchain was installed in S3.

---
name: protobuf
description: Protobuf usage in the AMC web repo — .proto sources, buf codegen (pnpm proto:generate), decoding binary streams with @bufbuild/protobuf fromBinary. Read before touching realtime binary data or .proto files.
---

# Protobuf (`@bufbuild/protobuf`)

- `.proto` definitions live in `src/lib/api/proto/` (e.g. `player_positions.proto`); generated `*_pb.ts` files in `src/lib/api/proto/generated/`.
- Regenerate with `pnpm proto:generate` (buf; config in root `buf.gen.yaml`). **Never hand-edit `generated/`.** The lefthook pre-commit pipeline also regenerates it.
- Decode binary messages with `fromBinary`:

```ts
import { fromBinary } from '@bufbuild/protobuf';
import { PlayerPositionsSchema } from '$lib/api/proto/generated/player_positions_pb';

const msg = fromBinary(PlayerPositionsSchema, new Uint8Array(arrayBuffer));
```

- Binary streams arrive over the visibility-aware WebSocket helper (`startVisibilityAwareWebSocket` in `src/lib/api/_api.ts`, subprotocol `['protobuf']`) — see [[api-layer]].
- Helper utilities alongside protos (e.g. `vehicleKeyUtils.ts`) are hand-written and live in `src/lib/api/proto/`, not `generated/`.

Related: [[api-layer]], [[git-hooks]]

# Connect Your Own Video API

Implement the provider connection in `src/lib/providers/custom.ts`. The interface, shot planner, and prompt builder are independent of any video vendor. The adapter translates internal requests into provider calls and converts responses into a shared `VideoJob` format.

## 1. Configure server-side environment variables

Copy the root `.env.example` file to `.env.local` and fill in:

```dotenv
VIDEO_API_BASE_URL=
VIDEO_API_KEY=
VIDEO_MODEL=
```

Do not prefix these variables with `NEXT_PUBLIC_`. The project's `.gitignore` excludes `.env.local`.

`ADAPTER_IMPLEMENTED` defaults to `false`. Environment variables alone do not enable generation; change the flag to `true` after completing all four adapter methods. If your provider uses different configuration fields, adjust the readiness check in `getStatus()` accordingly.

## 2. Declare model capabilities

Set `capabilities` to match the model you are connecting:

| Field | Meaning |
| --- | --- |
| `identityReference` | Supports a portrait as an identity reference |
| `audioReference` | Supports audio input that drives the vocal performance, not just sound generation |
| `aspectRatios` | Supported ratios: a subset of `9:16`, `16:9`, and `1:1` |
| `durationsSeconds` | Shot durations the provider accepts directly, in seconds |

Defaults are `false` or empty arrays. No provider capabilities are assumed. Both the frontend and the server check aspect ratio and duration before allowing an unsupported request.

Shot templates start at five seconds per shot; the editor allows durations from 1 to 20 seconds. If your model supports different fixed durations, adjust the shots or extend that range. Do not silently submit ten seconds while displaying a five-second request.

## 3. Implement media preparation: `prepareAssets`

The input type is defined in `src/lib/providers/types.ts`:

```ts
interface PrepareAssetsInput {
  portrait: File | null;
  audio: File | null;
  audioStartSeconds: number;
  durationSeconds: number;
}
```

The browser sends `multipart/form-data` to the same-origin `POST /api/video/jobs` endpoint. Missing files are `null`; assets that are not enabled for the request are not passed to the adapter.

The method should:

1. Upload files through the provider's upload endpoint or a storage service the provider can access.
2. Return a URL or media ID for each required asset.
3. Return an empty object, `{}`, when no assets are needed.

```ts
interface ProviderAssets {
  portraitReference?: string;
  audioReference?: string;
}
```

Browser-local `blob:` URLs cannot be used as provider-accessible media URLs. Temporary links must remain valid through queuing and generation.

The application accepts JPG, PNG, and WebP portraits up to 5 MB, and MP3, WAV, and M4A audio up to 15 MB. Apply additional validation if the provider has stricter requirements. For public deployments, also configure a request body size limit at the hosting platform or request gateway.

### Audio time windows

`audioStartSeconds` is the user's selected audio start point plus the shot's offset on the timeline. `durationSeconds` is the length of the shot.

The adapter must check the actual audio duration and use one of these approaches:

- Trim the requested audio segment before uploading it.
- Map the time window to the provider's native start and duration fields.

Reject an out-of-range segment before submitting generation. Sending the entire audio file for every shot does not align it to the timeline. This project passes the time window but does not include an audio trimming tool.

## 4. Implement generation submission: `submitJob`

Method signature:

```ts
submitJob(
  input: ShotRequest,
  assets: ProviderAssets,
  requestId: string
): Promise<VideoJob>
```

`ShotRequest` contains:

| Field | Purpose |
| --- | --- |
| `shotId` | Local shot identifier |
| `prompt` | Complete compiled prompt |
| `durationSeconds` | Target shot duration |
| `aspectRatio` | Output aspect ratio |
| `audioStartSeconds` | Segment start time in the original audio |
| `useIdentityReference` | Whether the request uses a portrait reference |
| `useAudioReference` | Whether the request uses an audio reference |

Read environment variables inside the server-side adapter, and map authentication and parameters according to the provider's documentation. These internal field names are not a universal video API request format.

### Request IDs and idempotency

The browser creates a `requestId` for each new generation attempt. If the provider supports idempotency keys, use this value as the key. Otherwise, persist a `requestId → taskId` mapping and handle duplicate submissions in your integration.

A timeout can occur after the provider has accepted the request. Do not unconditionally retry a POST inside `submitJob()`.

## 5. Normalize task results

```ts
interface VideoJob {
  id: string;
  status: 'queued' | 'processing' | 'succeeded' | 'failed';
  videoUrl?: string;
  error?: string;
}
```

| Status | Meaning |
| --- | --- |
| `queued` | The provider accepted the task and it is waiting to run |
| `processing` | Generation is in progress |
| `succeeded` | An accessible video result is available; `videoUrl` is required |
| `failed` | The provider explicitly reported a terminal failure |

`videoUrl` should be a browser-playable HTTPS URL. Local development also allows `http://localhost` and `http://127.0.0.1`. If the result requires authentication, provide an accessible temporary URL or a controlled media endpoint instead of putting provider credentials in the URL.

Error messages should be concise and suitable for display. Do not include keys, raw response bodies, or internal service addresses.

## 6. Implement status queries and submission recovery

### `getJob(taskId)`

Query the provider and return a normalized `VideoJob`. While the page is open, it queries active tasks every five seconds. A query error is not a generation failure; do not return a fabricated `failed` status.

### `findJobByRequestId(requestId)`

This method recovers a task after the POST response is lost:

- **Task found:** return its `VideoJob`.
- **Acceptance still uncertain:** return `null`; the interface keeps the submission unresolved.
- **Service unavailable:** throw an error so the interface can offer another query.

If the provider cannot look up tasks by request ID, store your own mapping. The project does not include a database or background queue; module-level variables cannot provide reliable recovery across server restarts.

Task state currently lives in page memory. Finding tasks after the page closes, or providing history across devices, requires persistent storage in your integration. Keep the page open while tasks are active. The task details in the interface expose request and task IDs for provider-side lookup.

## 7. Follow the error-handling contract

Use `ProviderRejectedError` only when the provider definitively rejected this new request. Connection failures, timeouts, and unrecognized response shapes do not prove that the request was rejected.

The server handles errors as follows:

- **Invalid input or failed media preparation:** generation has not been submitted; allow correction and retry.
- **Explicit rejection:** allow a new generation attempt.
- **Unknown error after submission starts:** return `SUBMISSION_UNKNOWN` and retain the original `requestId` in the interface.
- **Failed status query:** preserve the last known task state.

Set appropriate network timeouts inside the adapter. The browser stops waiting after 60 seconds for submission or 15 seconds for a status query; this does not cancel generation at the provider.

## 8. Understand the service boundary

The workspace sends media and generation requests only when the user chooses to generate a shot. Selecting files, editing the plan, copying prompts, and exporting plans do not call the video provider.

The server routes are intended for local use and do not include user authentication, quotas, or billing. Add access controls before exposing an instance with server-side credentials to multiple users.

The output is an individual video shot. Long-term media storage, video assembly, audio mixing, and background status synchronization are application-specific extensions.

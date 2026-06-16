# Verification

Date: 2026-06-16
Repo: /home/zhang/workspace/blog-semi
Task: Add xunqiu 64-bit client public-safe runtime screenshot

## Diff Summary

- Added one xunqiu 64-bit Android client runtime screenshot:
  - `public/images/projects/showcase/xunqiu-android64-runtime.png`
- Updated `src/App.tsx` so `/cases/xunqiu` includes the new evidence card.
- Updated `src/App.css` so this portrait runtime screenshot renders as a full 9:16 evidence card instead of being compressed into a 16:9 slot.
- Updated `docs/showcase-assets.md` to mark the xunqiu runtime screenshot gap as covered.
- Updated workflow artifacts for the xunqiu screenshot slice.

## Capture Evidence

- Source project was copied into a temporary capture directory before building.
- Reference/source xunqiu paths were kept read-only.
- Release signing config was removed only in the temporary copy so debug build did not read release keystore material.
- Minimal placeholder resources were generated only in the temporary copy to satisfy compilation of the migrated 64-bit client.
- The temporary debug APK was installed on the existing `xunqiu64_api36` emulator.
- App data was cleared before launch, and the screenshot was captured from the unauthenticated welcome screen.
- No real login, production service call, old 32-bit app screenshot, server data, account data, release artifact, or historical backend material was used for the public screenshot.

## Commands Run

| Command | Result | Notes |
| --- | --- | --- |
| `gradle.bat --no-daemon assembleDebug` in temporary xunqiu copy | pass | Used D drive Android64 JDK/Gradle toolchain; debug signing only. |
| `adb install -r app-debug.apk` | pass | Installed temporary APK on `xunqiu64_api36`. |
| `adb shell pm clear com.playlab.xunqiu64` | pass | Ensured unauthenticated welcome state. |
| `adb exec-out screencap -p` | pass | Captured public-safe welcome page PNG. |
| `file public/images/projects/showcase/xunqiu-android64-runtime.png` | pass | PNG image data, 1080 x 2400, RGBA. |
| sensitive/public wording scan | reviewed | Public changes do not include accounts, endpoints, signing material, hashes, release paths, or real business data. |
| `npm run lint` | pass | ESLint completed without errors in WSL. |
| `npm run build` | pass | TypeScript and Vite build completed. Existing lottie-web direct eval warning remains from dependency code. |
| Browser QA with system Chrome | pass | `/cases/xunqiu` checked at 1440x900 and 390x844 against the local dev server. The new PNG decodes at 1080x2400, renders as `case-image-portrait`, no console errors, no failed requests, no horizontal overflow, and no sensitive wording hits. |

## Public-Safety Review

- Screenshot shows only unauthenticated welcome UI: product name, public tagline, intro copy, and login button.
- Screenshot does not expose user data, real accounts, server addresses, API base URLs, database config, signing passwords, keystore paths, APK hashes, package release paths, or private validation paths.
- The xunqiu gap is now closed in `docs/showcase-assets.md`.

## Remaining Steps

## Ship Decision

Committed and pushed: b771852 Add xunqiu Android runtime evidence.

## Deployment QA

- Direct asset check:
  - `/images/projects/showcase/xunqiu-android64-runtime.png` returns 200 with content length 56934.
- Production browser QA at `https://biau.playlab.eu.cc`:
  - `/cases/xunqiu` loads with h1 `寻球移动端业务系统重构案例`.
  - The `64 位客户端欢迎页运行截图` evidence card is present.
  - `xunqiu-android64-runtime.png` decodes successfully at 1080x2400.
  - Desktop 1440x900 and mobile 390x844 both render the image as `case-image-portrait`, with no console errors, no failed requests, no horizontal overflow, and no sensitive wording hits.

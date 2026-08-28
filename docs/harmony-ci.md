# HarmonyOS CI runners

HarmonyOS validation runs on self-hosted macOS runners because GitHub-hosted runners do not
provide the required SDK. The PR job has labels `self-hosted`, `macos`, and `harmonyos-api12`; the
scheduled device job adds `harmonyos-device`.

Provision each runner with a pinned HarmonyOS Command Line Tools installation and a DevEco/Harmony
SDK compatible with API 12. Configure repository variables, not source-controlled paths:

- `HARMONY_CI_ENABLED`: set to `true` only after the corresponding self-hosted runners are online.
- `HARMONY_CLI_HOME`: command line tools root; it contains `bin/ohpm`, `bin/codelinter`, and Hvigor.
- `DEVECO_SDK_HOME`: compatible SDK root used by Hvigor.

`scripts/harmony-ci.sh verify` creates the ignored unsigned profile, installs both ohpm dependency
sets, runs codelinter errors as a gate, builds an unsigned debug HAP, and runs host Hypium tests.
The job only runs for branches in this repository: fork PRs never execute on the self-hosted runner.

The nightly/manual job runs `ohosTest` on a dedicated device or emulator. Its runner may hold only
the local debug signing configuration required to install test builds. Release certificates, private
keys, passwords, and AppGallery credentials belong on a separate protected release runner and must
never be added to a profile, repository variable, or build log.

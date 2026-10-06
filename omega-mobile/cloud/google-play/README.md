# OMEGA Google Play Developer Automation

The publisher uses Android Publisher v3 with Application Default Credentials.

Install its isolated dependencies:

```bash
python3 -m pip install -r cloud/google-play/requirements.txt
```

Validation-only internal-track example:

```bash
python3 cloud/google-play/google_play_publisher.py \
  --package com.example.app \
  --artifact app/build/outputs/bundle/release/app-release.aab \
  --track internal \
  --status completed
```

Commit the edit only when release authorization exists:

```bash
python3 cloud/google-play/google_play_publisher.py \
  --package com.example.app \
  --artifact app-release.aab \
  --track internal \
  --status completed \
  --commit
```

Production `completed` or staged `inProgress` releases additionally require `--allow-production`.

Never pass raw credentials on the command line. Use Workload Identity Federation or a protected `GOOGLE_APPLICATION_CREDENTIALS` file supplied by the CI provider.

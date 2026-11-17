# Lucky Store Mobile POS

Flutter staff POS app for catalog browsing, sales, offline synchronization,
inventory workflows, and device integrations. The app requires public Supabase
configuration supplied at runtime with `--dart-define`.

## Local development

Use the system Flutter SDK available on `PATH` (or `~/development/flutter`),
then run the commands below. If Flutter is installed only at
`~/development/flutter`, use `~/development/flutter/bin/flutter` in place of
`flutter` or add `~/development/flutter/bin` to `PATH` first:

```bash
~/development/flutter/bin/flutter pub get
~/development/flutter/bin/flutter run --dart-define=SUPABASE_URL=https://<project>.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=<anon-key>
```

For a web release build, export `SUPABASE_URL` and `SUPABASE_ANON_KEY` and run
`./build.sh`; the script forwards both values as Dart defines.

For general Flutter help:

- [Lab: Write your first Flutter app](https://docs.flutter.dev/get-started/codelab)
- [Cookbook: Useful Flutter samples](https://docs.flutter.dev/cookbook)

For help getting started with Flutter development, view the
[online documentation](https://docs.flutter.dev/), which offers tutorials,
samples, guidance on mobile development, and a full API reference.

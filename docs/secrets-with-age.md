# Secrets with age

boothub supports two paths for secrets in profiles:

1. `env_required: [...]` — declare what env vars the bundle needs; agent prompts the user to set them manually.
2. `secrets: { ENV_NAME: <age-encrypted-blob> }` — ship the secret encrypted; agent decrypts client-side if the user has the key.

This doc is about path 2.

## Why age?

[age](https://age-encryption.org) is a small, modern file encryption tool. Public/private keypair, no GPG complexity, works in any language with several solid implementations.

```bash
brew install age
```

## Generating your keypair

```bash
mkdir -p ~/.config/boothub
age-keygen -o ~/.config/boothub/age.key
chmod 600 ~/.config/boothub/age.key
grep '^# public key:' ~/.config/boothub/age.key
# → # public key: age1abc…
```

Put the public key in your profile repo at `secrets/age.pub`:

```bash
grep '^# public key:' ~/.config/boothub/age.key | cut -d' ' -f4 > path/to/boothub-profile/secrets/age.pub
```

The private key STAYS on your machines (and only your machines). Don't check it in.

## Encrypting a value

```bash
echo -n "$YOUR_TOKEN" | age -r "$(cat secrets/age.pub)" -a
```

Paste the resulting `-----BEGIN AGE ENCRYPTED FILE-----` block into your `MANIFEST.md` under the bundle's `secrets:` map:

```yaml
- id: claude-history
  kind: mcp
  mcp: { … }
  env_required:
    - CLAUDE_HISTORY_CLOUD_TOKEN
  secrets:
    CLAUDE_HISTORY_CLOUD_TOKEN: |
      -----BEGIN AGE ENCRYPTED FILE-----
      YWdlLWVuY3J5cHRpb24ub3JnL3YxCi0+IFgyNTUxOSBn…
      -----END AGE ENCRYPTED FILE-----
```

`env_required` stays as the fallback for users without your key.

## Decryption flow (agent side)

When the agent encounters a `secrets:` block:

1. Look for a private key at `~/.config/boothub/age.key` (default location).
2. If present: `age -d -i ~/.config/boothub/age.key` on each blob; show the user the decrypted env names (NOT values) and ask for approval before writing them anywhere.
3. If absent: fall back to `env_required` and prompt the user to set the env var manually.

## Why this only really makes sense for personal profiles

A public profile with `secrets:` blocks is only useful for **the profile owner re-bootstrapping their own machines**. Everyone else fetching the profile gets opaque text and the manual-env path. That's by design.

For shared team secrets, use a real secrets manager (AWS Secrets Manager, 1Password, etc.) and reference them via `env_required` — never check encrypted secrets a team needs into a public profile.

## Rotating your key

If the private key leaks, generate a new one and re-encrypt all secrets. Old encrypted blobs become unrecoverable for anyone (including you) without the old private key — that's the point.

```bash
age-keygen -o ~/.config/boothub/age.key  # overwrites
chmod 600 ~/.config/boothub/age.key
# update secrets/age.pub in your profile, re-encrypt all secrets, push
```

# Syncing between devices

Sprout Isle keeps your data in the browser. To use it on more than one device,
you can sync through a **secret GitHub Gist** in your own GitHub account. There
is no Sprout Isle server.

## Set it up

1. Open [Fine-grained personal access tokens](https://github.com/settings/personal-access-tokens/new) on GitHub.
2. Give the token a name (for example "Sprout Isle") and an expiry date.
3. Under **Account permissions**, set **Gists** to **Read and write**. Leave every other permission at No access.
4. Generate the token and copy it.
5. In Sprout Isle, open **You → Sync across devices**, paste the token and choose **Connect**.
6. Repeat step 5 on each device, using the same token or a separate one per device.

The first device creates a secret gist containing `sprout-isle.json`. Other
devices find that gist and download it.

## How syncing works

- The app syncs when it opens, about 5 seconds after you make a change, and when you switch away from it.
- Every change records a timestamp. At each sync the app compares this device's copy,
  the gist's copy, and the version both last agreed on:
  - only this device changed: upload
  - only the gist changed: download
  - both changed: you choose which copy to keep, and the other copy is replaced
- Downloaded data is validated before it replaces anything on the device.
- If the gist has been deleted, the next sync creates a new one from this device.

This is whole-dataset sync, not a line-by-line merge, so if you use two devices on
the same day, let one sync before you switch to the other.

## Security notes

- **The token is stored in this browser's localStorage.** Anyone with access to the browser
  profile, or any script that manages to run on the page, could read it. The app ships a
  strict Content Security Policy to reduce that risk. Only connect on devices you trust.
- **Scope the token to Gists only** and give it an expiry date, so a leaked token can't touch your repositories.
- **Secret gists are unlisted, not encrypted.** They don't appear on your profile or in search,
  but anyone with the gist's URL can read it.
- The token never appears in exported backups or CSV files.
- To stop syncing, choose **Disconnect**, then revoke the token at
  [github.com/settings/personal-access-tokens](https://github.com/settings/personal-access-tokens).
  You can delete the gist from [gist.github.com](https://gist.github.com) too.

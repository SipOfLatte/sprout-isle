# Syncing between devices

Sprout Isle keeps your data in the browser. If you use it on more than one device, you can sync through a secret gist in your own GitHub account. There's no Sprout Isle server involved.

## Set it up

1. Open [Fine-grained personal access tokens](https://github.com/settings/personal-access-tokens/new) on GitHub.
2. Give the token a name (for example "Sprout Isle") and an expiry date.
3. Under **Account permissions**, set **Gists** to **Read and write**. Leave every other permission at No access.
4. Generate the token and copy it.
5. In Sprout Isle, go to the You tab, find Sync across devices, paste the token and choose **Connect**.
6. Do step 5 on each device. You can reuse the token or make one per device.

The first device creates a secret gist with a file called `sprout-isle.json`. Other devices find that gist and download it.

## How syncing works

The app syncs when it opens, about 5 seconds after you change something, and when you switch away from it.

Every change is timestamped. When it syncs, the app compares three things: this device's copy, the gist's copy, and the last version both agreed on. If only this device changed, it uploads. If only the gist changed, it downloads. If both changed, it asks which copy you want to keep, and the other one is replaced. Anything downloaded is checked before it replaces what's on the device. If someone deleted the gist, the next sync makes a new one from this device.

It syncs the whole dataset at once and doesn't merge individual edits. If you use two devices on the same day, give one a moment to sync before you pick up the other.

## Security notes

The token is saved in this browser's localStorage. Anyone who can use the browser profile could read it, and so could a script that somehow ran on the page. The app's Content Security Policy makes that second case much harder, but it's still best to connect only on devices you trust.

Give the token access to gists and nothing else, and set an expiry date. That way a leaked token can't reach your repositories.

A secret gist is unlisted, not encrypted. It won't show up on your profile or in search, but anyone who has its URL can read it.

The token is never included in exported backups or CSV files.

To stop syncing, choose **Disconnect**, then revoke the token at [github.com/settings/personal-access-tokens](https://github.com/settings/personal-access-tokens). You can also delete the gist at [gist.github.com](https://gist.github.com).

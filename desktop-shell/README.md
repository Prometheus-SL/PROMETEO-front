# @prometeo-dashboard/desktop-shell

Electron shell to launch the PROMETEO dashboard from terminal with:

```bash
prometeo
```

## Install

```bash
npm install -g @prometeo-dashboard/desktop-shell
```

## Usage

```bash
prometeo
```

Optional runtime flags are forwarded to Electron:

```bash
prometeo --disable-gpu
```

## Environment

You can configure the target URL with `PROMETEO_DASHBOARD_URL`.

Example:

```bash
export PROMETEO_DASHBOARD_URL="https://prometeo.miguelprez.es/client"
prometeo
```

Or create your local `.env` from `.env.example` in the installed package folder if needed.

## Autostart on Raspberry Pi

On Linux, the shell checks whether it is configured to open automatically when you log in.

If autostart is not enabled, the app shows a native prompt with these options:

- Enable autostart now.
- Not now.
- Do not show this reminder again.

The shell uses an XDG autostart entry written to `~/.config/autostart/prometeo-dashboard.desktop`, which is the recommended approach for Raspberry Pi OS Desktop and other Linux desktop sessions.

### Notes

- This is session autostart, not a system boot service.
- It is intended for graphical login on Raspberry Pi OS.
- If you need to suppress the prompt, set `PROMETEO_DISABLE_AUTOSTART_PROMPT=1`.
- Cron and systemd are not used as the primary approach because Electron requires a graphical session.

## Automatic Updates

The shell checks for new versions from npm registry once every 24 hours. If a newer version is available, it shows a dialog with the option to update immediately or later.

Updates are installed via `npm install -g @prometeo-dashboard/desktop-shell@latest`, and you will be prompted to restart the application to use the new version.

### Notes

- The check is non-blocking and happens in the background.
- If you want to disable automatic update checks, set `PROMETEO_DISABLE_UPDATE_CHECK=1`.
- Manual updates can be triggered at any time with: `npm install -g @prometeo-dashboard/desktop-shell@latest`

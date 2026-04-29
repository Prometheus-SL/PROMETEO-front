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

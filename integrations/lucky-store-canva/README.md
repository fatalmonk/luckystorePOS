# Lucky Store Social Canva app

This app connects Canva to the Lucky Store catalog and Facebook publishing flow.

It supports two Canva intents:

- Design Editor: search live active Lucky Store products and insert product copy into a design.
- Content Publisher: publish a JPG design with a caption and optional storefront link to the connected Lucky Store Facebook page.

The Supabase Edge Function at `supabase/functions/canva-social` verifies Canva user tokens, resolves the linked Lucky Store staff identity, scopes catalog reads to that staff member's store, and records Facebook publication results in `social_posts`.

Before previewing, configure `CANVA_APP_ID=AAHOGP8N-Fw`, the development URL, the Content Publisher intent, the app authentication settings, and the Supabase function secrets. The Canva token and Facebook credentials must remain server-side.

After applying the migration, an authorized Lucky Store administrator must provision the corresponding `(canva_user_id, canva_brand_id, user_id, tenant_id, store_id)` row in `canva_social_identity_links` through a restricted service-role process before catalog reads or publishing are enabled. This repository does not yet include a self-service identity-linking flow; do not enable the app for staff until an approved provisioning path is in place.

For local REST batch generation, provide `CANVA_AUTOFILL_JOBS_JSON` or `CANVA_WEEKLY_JOBS_JSON`; template IDs and product data are deliberately supplied at runtime rather than committed as stale campaign claims.

This is a starting point for your app using your chosen template. The complete documentation for the platform is at [canva.dev/docs/apps](https://www.canva.dev/docs/apps/).

**Note:** This code and documentation assumes some experience with TypeScript and React.

## Requirements

- Node.js `v24`
- npm `v11`

**Note:** To make sure you're running the correct version of Node.js, we recommend using a version manager, such as [nvm](https://github.com/nvm-sh/nvm#intro). The [.nvmrc](./.nvmrc) file in this app's directory pins the version when you run `nvm install` from `integrations/lucky-store-canva`.

## Quick start

```bash
cd integrations/lucky-store-canva
nvm install
npm install
```

## Running your Canva App

### Step 1: Start the local development server

To start the boilerplate's development server, run the following command:

```bash
npm start
```

The server becomes available at <http://localhost:8080>.

The app entry point is `src/index.tsx`; the Design Editor UI is in `src/intents/design_editor/app.tsx`.

### Step 2: Preview the app

The local development server only exposes a JavaScript bundle, so you can't preview an app by visiting <http://localhost:8080>. You can only preview an app via the Canva editor.

To preview an app:

1. Create an app via the [Developer Portal](https://www.canva.com/developers/apps).
2. Select **App source > Development URL**.
3. In the **Development URL** field, enter the URL of the development server.
4. Click **Preview**. This opens the Canva editor (and the app) in a new tab.
5. Click **Open**. (This screen only appears when using an app for the first time.)

The app will appear in the side panel.

<details>
  <summary>Previewing apps in Safari</summary>

By default, the development server is not HTTPS-enabled. This is convenient, as there's no need for a security certificate, but it prevents apps from being previewed in Safari.

**Why Safari requires the development server to be HTTPS-enabled?**

Canva itself is served via HTTPS and most browsers prevent HTTPS pages from loading scripts via non-HTTPS connections. Chrome and Firefox make exceptions for local servers, such as `localhost`, but Safari does not, so if you're using Safari, the development server must be HTTPS-enabled.

To learn more, see [Loading mixed-content resources](https://developer.mozilla.org/en-US/docs/Web/Security/Mixed_content#loading_mixed-content_resources).

To preview apps in Safari:

1. Start the development server with HTTPS enabled:

```bash
npm start --use-https
```

2. Navigate to <https://localhost:8080>.
3. Bypass the invalid security certificate warning:
   1. Click **Show details**.
   2. Click **Visit website**.
4. In the Developer Portal, set the app's **Development URL** to <https://localhost:8080>.
5. Click preview (or refresh your app if it's already open).

You need to bypass the invalid security certificate warning every time you start the local server. A similar warning will appear in other browsers (and will need to be bypassed) whenever HTTPS is enabled.

</details>

### Step 3 (Optional): Enable Hot Module Replacement

By default, every time you make a change to an app, you have to reload the entire app to see the results of those changes. If you enable [Hot Module Replacement](https://webpack.js.org/concepts/hot-module-replacement/) (HMR), changes will be reflected without a full reload, which significantly speeds up the development loop.

**Note:** HMR does **not** work while running the development server in a Docker container.

To enable HMR:

1. Navigate to an app via the [Your apps](https://www.canva.com/developers/apps).
1. Select **Security** -> **Credentials** -> **.env file**.
1. Copy the `.env` file contents.
1. Paste the contents into the starter kit's `.env` file. For example:

   ```bash
   CANVA_APP_ORIGIN=https://app-aabbccddeeff.canva-apps.com
   CANVA_HMR_ENABLED=true
   ```

1. Restart the local development server.
1. Reload the app manually to ensure that HMR takes effect.

### Step 4 (Optional): Setup the Canva Dev MCP Server

If you're using AI coding tools, such as Cursor or Claude Code, you can connect to the Canva Dev MCP Server to supercharge your development workflow. See this [setup guide](https://www.canva.dev/docs/apps/mcp-server/) to get started.

## Backend configuration

This app uses the Supabase Edge Function at `supabase/functions/canva-social`; it does not include a local Express backend. Set `CANVA_BACKEND_HOST` to the HTTPS Supabase project URL (for example, `https://<project-ref>.supabase.co`). The app appends `/functions/v1/canva-social` to that host. Use the same HTTPS URL for local previews and published builds.

## Configure ngrok (optional)

If your app requires authentication with a third party service, your server needs to be exposed via a publicly available URL, so that Canva can send requests to it.
This step explains how to do this with [ngrok](https://ngrok.com/).

**Note:** ngrok is a useful tool, but it has inherent security risks, such as someone figuring out the URL of your server and accessing proprietary information. Be mindful of the risks, and if you're working as part of an organization, talk to your IT department.
You must replace ngrok urls with hosted API endpoints for production apps.

To use ngrok, you'll need to do the following:

1. Sign up for a ngrok account at <https://ngrok.com/>.
2. Locate your ngrok [authtoken](https://dashboard.ngrok.com/get-started/your-authtoken).
3. Set an environment variable for your authtoken, using the command line. Replace `<YOUR_AUTH_TOKEN>` with your actual ngrok authtoken:

   For macOS and Linux:

   ```bash
   export NGROK_AUTHTOKEN=<YOUR_AUTH_TOKEN>
   ```

   For Windows PowerShell:

   ```shell
   $Env:NGROK_AUTHTOKEN = "<YOUR_AUTH_TOKEN>"
   ```

This environment variable is available for the current terminal session, so the command must be re-run for each new session. Alternatively, you can add the variable to your terminal's default parameters.

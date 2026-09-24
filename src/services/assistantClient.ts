/**
 * Copilot Studio "Procurement Assistant" client.
 *
 * The agent runs on the GitHub Copilot harness with Entra (Microsoft) sign-in,
 * so it can't be embedded via the standard connector or an iframe. Instead we
 * talk to it directly with the Microsoft 365 Agents SDK
 * (`@microsoft/agents-copilotstudio-client`) and acquire a delegated user token
 * with MSAL, then render the replies in our own branded chat UI.
 *
 * Auth: MSAL popup (redirect is unreliable inside the Power Apps player iframe).
 * The app registration must expose the delegated permission
 * `Power Platform API -> CopilotStudio.Copilots.Invoke` with admin consent.
 */

import { PublicClientApplication, InteractionRequiredAuthError, BrowserAuthError } from '@azure/msal-browser';
import { runPopupRelay } from '@azure/msal-browser/popup-relay';
import { broadcastResponseToMainFrame } from '@azure/msal-browser/redirect-bridge';
import { ConnectionSettings, CopilotStudioClient } from '@microsoft/agents-copilotstudio-client';
import { Activity, ActivityTypes } from '@microsoft/agents-activity';

const APP_CLIENT_ID = 'YOUR_APP_CLIENT_ID';
const TENANT_ID = 'YOUR_TENANT_ID';
const ENVIRONMENT_ID = 'YOUR_ENVIRONMENT_ID';
const AGENT_SCHEMA_NAME = 'YOUR_AGENT_SCHEMA_NAME';
const AUTHORITY = `https://login.microsoftonline.com/${TENANT_ID}`;

/** A single agent reply rendered as a chat bubble. */
export interface AssistantReply {
  text: string;
  suggestedActions: string[];
}

let settings: ConnectionSettings | null = null;
function getSettings(): ConnectionSettings {
  settings ??= new ConnectionSettings({
    environmentId: ENVIRONMENT_ID,
    schemaName: AGENT_SCHEMA_NAME,
  });
  return settings;
}

let msal: PublicClientApplication | null = null;
let msalInit: Promise<void> | null = null;
let cachedRedirectUri: string | null = null;

/**
 * Same-origin redirect target for the MSAL popup.
 *
 * The popup must land on a page that returns 200 without a redirect, otherwise
 * the content host drops the auth fragment before MSAL can read it. Only the
 * app's exact served `…/storageproxy/<buildId>/index.html` qualifies (the
 * directory form returns an error). That URL exceeds Entra's 256-char limit and
 * its build id changes each publish, so the app registration uses a single
 * wildcard SPA redirect URI (`https://<host>/*`, allowed for single-tenant
 * apps) that matches every build.
 */
function computeRedirectUri(): string {
  cachedRedirectUri ??= `${window.location.origin}${window.location.pathname}`;
  return cachedRedirectUri;
}

/** The redirect URI that must be registered in the app registration. */
export function getRedirectUri(): string {
  return computeRedirectUri();
}

/** Removes an orphaned MSAL interaction flag left by a popup that was closed early. */
function clearStuckInteraction(): void {
  try {
    for (const store of [window.localStorage, window.sessionStorage]) {
      for (const key of Object.keys(store)) {
        if (key.toLowerCase().includes('interaction.status')) store.removeItem(key);
      }
    }
  } catch {
    /* storage may be unavailable; ignore */
  }
}

async function getMsal(): Promise<PublicClientApplication> {
  if (!msal) {
    const instance = new PublicClientApplication({
      auth: {
        clientId: APP_CLIENT_ID,
        authority: AUTHORITY,
        redirectUri: computeRedirectUri(),
        // Route the interactive popup through a same-origin, top-level relay
        // page. The app runs in the Power Apps iframe, where third-party storage
        // partitioning + COOP break the normal popup; the relay keeps its opener
        // link to the iframe and hands the raw auth response back to it.
        popupRelayUri: computeRedirectUri(),
      },
      cache: { cacheLocation: 'localStorage' },
    });
    msal = instance;
    msalInit = instance.initialize();
  }
  await msalInit;
  return msal;
}

// The app runs inside the Power Apps player iframe, where third-party storage
// partitioning and COOP break the standard MSAL popup. MSAL's popup-relay
// mechanism (auth.popupRelayUri) works around this: MSAL opens our page as a
// top-level relay popup, that page opens the IdP child popup and stays put (so
// its opener link to the iframe survives COOP), and the child's redirect page
// broadcasts the raw auth response back through the relay to the iframe. Our
// single served index.html plays all three roles, selected by URL markers.

/**
 * Renders a minimal "Continue" prompt on the relay popup. `runPopupRelay` opens
 * the IdP child popup when it runs, so it must be triggered by a user gesture or
 * the browser blocks it (popup_window_error).
 */
function renderRelayPrompt(): void {
  const root = document.getElementById('root') ?? document.body;
  root.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.style.cssText =
    'display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;gap:16px;font-family:"Segoe UI",system-ui,sans-serif;color:#1f2937;text-align:center;padding:24px;';
  const title = document.createElement('div');
  title.textContent = 'Sign in to Procurement Assistant';
  title.style.cssText = 'font-size:18px;font-weight:600;';
  const hint = document.createElement('div');
  hint.textContent = 'Continue to sign in with your Microsoft account.';
  hint.style.cssText = 'font-size:14px;color:#6b7280;';
  const button = document.createElement('button');
  button.textContent = 'Continue';
  button.style.cssText =
    'background:#e2372a;color:#fff;border:none;border-radius:9999px;padding:10px 28px;font-size:15px;font-weight:600;cursor:pointer;';
  button.onclick = () => {
    button.disabled = true;
    button.textContent = 'Signing in…';
    runPopupRelay();
  };
  wrap.append(title, hint, button);
  root.append(wrap);
}

/**
 * When this page load is the MSAL popup-relay page or the redirect bridge,
 * drives that step and returns true so the app is not rendered. Returns false
 * for a normal app load.
 */
export async function handleAuthBrokerPage(): Promise<boolean> {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const searchParams = new URLSearchParams(window.location.search);

  // Relay page: MSAL passes the IdP navigation in the `req` hash param.
  if (hashParams.has('req')) {
    renderRelayPrompt();
    return true;
  }

  // Redirect bridge: the IdP child popup returns here with the auth response,
  // which we broadcast back to the relay (and on to the iframe).
  const hasAuthResponse =
    hashParams.has('code') ||
    hashParams.has('error') ||
    searchParams.has('code') ||
    searchParams.has('error');
  if (hasAuthResponse) {
    await broadcastResponseToMainFrame().catch(() => undefined);
    return true;
  }

  return false;
}


async function acquireToken(): Promise<string> {
  const instance = await getMsal();
  const scopes = [CopilotStudioClient.scopeFromSettings(getSettings())];

  const existing = instance.getAllAccounts()[0];
  if (existing) {
    try {
      const silent = await instance.acquireTokenSilent({ scopes, account: existing });
      return silent.accessToken;
    } catch (error) {
      if (!(error instanceof InteractionRequiredAuthError)) throw error;
    }
  }

  clearStuckInteraction();
  try {
    const result = await instance.acquireTokenPopup({ scopes });
    return result.accessToken;
  } catch (error) {
    if (error instanceof BrowserAuthError && error.errorCode === 'interaction_in_progress') {
      clearStuckInteraction();
      const retry = await instance.acquireTokenPopup({ scopes });
      return retry.accessToken;
    }
    throw error;
  }
}

let clientPromise: Promise<CopilotStudioClient> | null = null;
async function getClient(): Promise<CopilotStudioClient> {
  clientPromise ??= (async () => {
    const token = await acquireToken();
    return new CopilotStudioClient(getSettings(), token);
  })();
  return clientPromise;
}

/** Forces a fresh sign-in + client on the next call (e.g. after a token error). */
export function resetAssistant(): void {
  clientPromise = null;
}

function toReply(activity: Activity): AssistantReply | null {
  if (activity.type !== ActivityTypes.Message || !activity.text) return null;
  const suggestedActions =
    activity.suggestedActions?.actions
      ?.map((action) => String(action.value ?? action.title ?? '').trim())
      .filter((value) => value.length > 0) ?? [];
  return { text: activity.text, suggestedActions };
}

/**
 * Opens a conversation with the agent, prompting for sign-in the first time.
 * @returns the conversation id and any greeting replies from the agent.
 */
export async function startConversation(): Promise<{ conversationId: string; replies: AssistantReply[] }> {
  const client = await getClient();
  const replies: AssistantReply[] = [];
  let conversationId = '';

  for await (const activity of client.startConversationStreaming({
    emitStartConversationEvent: true,
    locale: 'en-US',
  })) {
    conversationId = activity.conversation?.id ?? conversationId;
    const reply = toReply(activity);
    if (reply) replies.push(reply);
  }

  return { conversationId, replies };
}

/** Sends a user message and returns the agent's reply bubbles. */
export async function askAssistant(text: string, conversationId: string): Promise<AssistantReply[]> {
  const client = await getClient();
  const activity = new Activity('message');
  activity.text = text;
  if (conversationId) activity.conversation = { id: conversationId };

  const replies: AssistantReply[] = [];
  for await (const reply of client.sendActivityStreaming(activity)) {
    const parsed = toReply(reply);
    if (parsed) replies.push(parsed);
  }
  return replies;
}

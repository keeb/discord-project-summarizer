// Purge all messages from a Discord channel except the N most recent.
// Usage: DISCORD_BOT_TOKEN=xxx DISCORD_CHANNEL_ID=123 deno run --allow-net --allow-env scripts/purge-channel.ts

const BASE = "https://discord.com/api/v10";

const token = Deno.env.get("DISCORD_BOT_TOKEN");
const channelId = Deno.env.get("DISCORD_CHANNEL_ID");
const keepCount = parseInt(Deno.env.get("KEEP_COUNT") ?? "2", 10);

if (!token || !channelId) {
  console.error("Required env vars: DISCORD_BOT_TOKEN, DISCORD_CHANNEL_ID");
  Deno.exit(1);
}

const headers = {
  Authorization: `Bot ${token}`,
  "Content-Type": "application/json",
};

interface Message {
  id: string;
  timestamp: string;
}

async function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, { ...init, headers: { ...headers, ...init?.headers } });

  if (res.status === 429) {
    const retryAfter = parseFloat(res.headers.get("Retry-After") ?? "1");
    console.log(`Rate limited, waiting ${retryAfter}s...`);
    await sleep(retryAfter * 1000);
    return apiFetch(url, init);
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Discord API ${res.status}: ${body}`);
  }

  return res;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// Fetch all messages by paginating backwards
async function fetchAllMessages(): Promise<Message[]> {
  const all: Message[] = [];
  let before: string | undefined;

  while (true) {
    const url = new URL(`${BASE}/channels/${channelId}/messages`);
    url.searchParams.set("limit", "100");
    if (before) url.searchParams.set("before", before);

    const res = await apiFetch(url.toString());
    const batch: Message[] = await res.json();

    if (batch.length === 0) break;
    all.push(...batch);
    before = batch[batch.length - 1].id;
    console.log(`Fetched ${all.length} messages so far...`);

    if (batch.length < 100) break;
  }

  return all;
}

// Delete a single message
async function deleteMessage(msgId: string): Promise<void> {
  await apiFetch(`${BASE}/channels/${channelId}/messages/${msgId}`, {
    method: "DELETE",
  });
}

// Bulk delete messages (2-100 IDs, all must be < 14 days old)
async function bulkDelete(ids: string[]): Promise<void> {
  await apiFetch(`${BASE}/channels/${channelId}/messages/bulk-delete`, {
    method: "POST",
    body: JSON.stringify({ messages: ids }),
  });
}

// Main
const messages = await fetchAllMessages();
console.log(`Total messages in channel: ${messages.length}`);

// Sort newest first by snowflake ID (higher = newer)
messages.sort((a, b) => (BigInt(b.id) > BigInt(a.id) ? 1 : -1));

const toDelete = messages.slice(keepCount);
if (toDelete.length === 0) {
  console.log(`Only ${messages.length} message(s) found, nothing to delete.`);
  Deno.exit(0);
}

console.log(`Keeping ${keepCount}, deleting ${toDelete.length} messages...`);

// Split into bulk-eligible (< 14 days) and old (>= 14 days)
const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
const cutoff = Date.now() - fourteenDaysMs;

const bulkEligible: string[] = [];
const old: string[] = [];

for (const msg of toDelete) {
  if (new Date(msg.timestamp).getTime() >= cutoff) {
    bulkEligible.push(msg.id);
  } else {
    old.push(msg.id);
  }
}

// Bulk delete in batches of 100 (minimum 2 per call)
for (let i = 0; i < bulkEligible.length; i += 100) {
  const batch = bulkEligible.slice(i, i + 100);
  if (batch.length >= 2) {
    await bulkDelete(batch);
    console.log(`Bulk deleted ${batch.length} messages`);
  } else {
    // Single message can't use bulk delete
    await deleteMessage(batch[0]);
    console.log(`Deleted 1 message individually`);
  }
  await sleep(1000);
}

// Delete old messages one by one
for (let i = 0; i < old.length; i++) {
  await deleteMessage(old[i]);
  if ((i + 1) % 10 === 0 || i === old.length - 1) {
    console.log(`Deleted ${i + 1}/${old.length} old messages`);
  }
  await sleep(500);
}

console.log("Done! Channel purged.");

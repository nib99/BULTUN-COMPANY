const token = process.env.TELEGRAM_BOT_TOKEN;
const webhook = process.env.TELEGRAM_WEBHOOK_URL;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
if (!token || !webhook || !secret) {
  console.error("Set TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_URL and TELEGRAM_WEBHOOK_SECRET.");
  process.exit(1);
}
const api = async (method, body) => {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  });
  const json = await response.json();
  if (!json.ok) throw new Error(`${method}: ${JSON.stringify(json)}`);
  return json;
};
await api("setWebhook", { url: webhook, secret_token: secret, allowed_updates: ["message"] });
await api("setMyCommands", { commands: [
  { command: "start", description: "Open BULTUM COMPANY marketplace" },
  { command: "sell", description: "List a vehicle or machine" },
  { command: "help", description: "Get help" }
] });
console.log("Telegram webhook and commands configured.");

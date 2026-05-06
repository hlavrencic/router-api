#!/usr/bin/env node

const SagemcomClient = require("./sagemcom");

const args = process.argv.slice(2);

if (args.length < 2) {
  console.error("Uso: node reboot.js <username> <password>");
  process.exit(1);
}

const [username, password] = args;

async function main() {
  console.log("Conectando al router...");
  const client = new SagemcomClient(username, password);

  await client.login();
  console.log("Login OK.");

  await client.reboot();
  console.log("Reboot enviado. El router reiniciará en unos segundos.");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});

#!/usr/bin/env node
// Makes the certificate that `pnpm dev:https` serves with.
//
// A phone on the LAN reaches the dev server by IP, and a plain http origin is
// not a secure context. WebKit hides navigator.mediaDevices there, so the
// scanner has no camera to open. An https origin with a trusted certificate
// fixes it. mkcert signs one against a CA this machine already trusts.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { match } from "ts-pattern";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const certDir = join(webRoot, ".certs");
const certFile = join(certDir, "cert.pem");
const keyFile = join(certDir, "key.pem");
const hostsFile = join(certDir, "hosts.json");

/** Every address the phone can dial: the loopbacks, plus this machine on the LAN. */
function hostNames() {
  const lan = Object.values(networkInterfaces())
    .flat()
    .filter((row) => row && row.family === "IPv4" && !row.internal)
    .map((row) => row.address);

  return ["localhost", "127.0.0.1", "::1", ...new Set(lan)];
}

function mkcert(...args) {
  return execFileSync("mkcert", args, { encoding: "utf8" }).trim();
}

const hosts = hostNames();

if (!existsSync("/opt/homebrew/bin/mkcert") && !existsSync("/usr/local/bin/mkcert")) {
  console.error("mkcert is not installed. Run: brew install mkcert");
  process.exit(1);
}

const caRoot = mkcert("-CAROOT");
if (!existsSync(join(caRoot, "rootCA.pem"))) {
  console.error("The local certificate authority is missing. Run: mkcert -install");
  process.exit(1);
}

// The LAN address changes with the network, so the certificate is remade when
// the list of names no longer matches the one it was signed for.
const signedFor = match(existsSync(hostsFile))
  .with(true, () => JSON.parse(readFileSync(hostsFile, "utf8")))
  .otherwise(() => null);
const fresh = existsSync(certFile) && existsSync(keyFile);
const current = fresh && JSON.stringify(signedFor) === JSON.stringify(hosts);

if (!current) {
  mkdirSync(certDir, { recursive: true });
  mkcert("-cert-file", certFile, "-key-file", keyFile, ...hosts);
  writeFileSync(hostsFile, `${JSON.stringify(hosts, null, 2)}\n`);
  console.log(`Signed a certificate for: ${hosts.join(", ")}`);
}

const lan = hosts.find((host) => host !== "localhost" && host !== "127.0.0.1" && host !== "::1");

console.log("");
console.log(`  On this machine:  https://localhost:4321`);
if (lan) console.log(`  On your phone:    https://${lan}:4321`);
console.log("");
console.log("  The phone must trust the local authority once. Send it this file,");
console.log("  open it, then turn it on under Settings > General > About >");
console.log("  Certificate Trust Settings:");
console.log(`    ${join(caRoot, "rootCA.pem")}`);
console.log("");

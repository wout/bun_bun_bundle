import BunBunBundle from "./bun_bundle.js";

BunBunBundle.flags({
  debug: process.argv.includes("--debug"),
  dev: process.argv.includes("--dev"),
  prod: process.argv.includes("--prod"),
});

await BunBunBundle.bake();

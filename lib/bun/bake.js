import BunBunBundle from "./bun_bundle.js";

BunBunBundle.flags({
  dev: process.argv.includes("--dev"),
  prod: process.argv.includes("--prod"),
});

await BunBunBundle.bake();

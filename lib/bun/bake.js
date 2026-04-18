import BunBunBundle from "./bun_bundle.js";

BunBunBundle.flags(process.argv);

await BunBunBundle.bake();

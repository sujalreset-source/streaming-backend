import dotenv from "dotenv";
import development from "./development.js";
import staging from "./staging.js";
import production from "./production.js";

const env = process.env.NODE_ENV || "development";
console.log(`Running in ${env} mode`);

// ✅ Load correct .env file
dotenv.config({ path: `.env.${env}` });

const configs = { development, staging, production };
const config = configs[env];
console.log(config);

export default config;

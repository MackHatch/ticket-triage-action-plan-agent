import "dotenv/config";
import { buildServer } from "./server.js";

const PORT = parseInt(process.env.PORT ?? "3000", 10);

async function main(): Promise<void> {
  const app = await buildServer();

  await app.listen({ port: PORT, host: "0.0.0.0" });

  console.log(`API listening on http://localhost:${PORT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import { join } from "path";
import { registerRoutes } from "./routes.js";

const publicDir = join(process.cwd(), "public");

export async function buildServer(): Promise<ReturnType<typeof Fastify>> {
  const app = Fastify();

  await app.register(cors, { origin: true });

  await app.register(fastifyStatic, {
    root: publicDir,
    prefix: "/",
  });

  app.get("/", async (_, reply) => {
    return reply.sendFile("index.html");
  });

  await registerRoutes(app);

  return app;
}

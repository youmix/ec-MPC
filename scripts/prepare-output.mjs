import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

await mkdir(resolve(process.cwd(), "public"), { recursive: true });

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHash } from "node:crypto";
import { authMiddleware } from "@/lib/auth/middleware";
import { env } from "@/lib/env.server";

const kindSchema = z.enum(["image", "video"]);

function sign(params: Record<string, string>, secret: string) {
  const serialized = Object.entries(params)
    .filter(([, value]) => value !== "" && value !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  return createHash("sha1").update(serialized + secret).digest("hex");
}

export const createCloudinaryUpload = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ kind: kindSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const cloudName = env("CLOUDINARY_CLOUD_NAME");
    const apiKey = env("CLOUDINARY_API_KEY");
    const apiSecret = env("CLOUDINARY_API_SECRET");
    if (!cloudName || !apiKey || !apiSecret) throw new Error("media_not_configured");

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const folder = `bultum/listings/${context.userId}`;
    const signature = sign({ folder, timestamp }, apiSecret);
    return { cloudName, apiKey, timestamp, folder, signature, resourceType: data.kind };
  });

import { useState } from "react";
import { Film, ImagePlus, Loader2, Trash2, UploadCloud } from "lucide-react";
import { createCloudinaryUpload } from "@/lib/media/cloudinary";
import { btnGhost } from "./chrome";

export type UploadedMedia = { kind: "image" | "video"; url: string; publicId: string };

export function MediaUploader({ value, onChange }: { value: UploadedMedia[]; onChange: (items: UploadedMedia[]) => void }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setNote("");
    try {
      const current = [...value];
      for (const file of Array.from(files)) {
        const kind = file.type.startsWith("video/") ? "video" : file.type.startsWith("image/") ? "image" : null;
        if (!kind) continue;
        if (kind === "image" && file.size > 12 * 1024 * 1024) throw new Error("Images must be 12 MB or smaller.");
        if (kind === "video" && file.size > 100 * 1024 * 1024) throw new Error("Videos must be 100 MB or smaller.");
        if (kind === "video" && current.some((item) => item.kind === "video")) throw new Error("Only one video can be attached to a listing.");
        if (current.filter((item) => item.kind === "image").length >= 20 && kind === "image") throw new Error("A listing can contain up to 20 images.");

        const signed = await createCloudinaryUpload({ data: { kind } });
        const form = new FormData();
        form.append("file", file);
        form.append("api_key", signed.apiKey);
        form.append("timestamp", signed.timestamp);
        form.append("folder", signed.folder);
        form.append("signature", signed.signature);
        const response = await fetch(`https://api.cloudinary.com/v1_1/${signed.cloudName}/${signed.resourceType}/upload`, { method: "POST", body: form });
        if (!response.ok) throw new Error("Upload failed. Check Cloudinary configuration.");
        const uploaded = (await response.json()) as { secure_url?: string; public_id?: string };
        if (!uploaded.secure_url) throw new Error("Upload returned no secure URL.");
        current.push({ kind, url: uploaded.secure_url, publicId: uploaded.public_id ?? "" });
        onChange([...current]);
      }
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  function remove(index: number) {
    onChange(value.filter((_, itemIndex) => itemIndex !== index));
  }

  return (
    <section className="space-y-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#061A33] text-[#FFD33D]"><UploadCloud className="size-5" /></div>
        <div className="min-w-0"><h3 className="font-black">Photos & video</h3><p className="text-sm text-slate-500">Add up to 20 photos and one short vehicle/machinery video. Uploads go directly to secure Cloudinary storage.</p></div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label className={`${btnGhost} min-h-24 cursor-pointer flex-col gap-1 rounded-2xl border-dashed`}>
          <ImagePlus className="size-6" /><span className="text-xs">Add photos</span>
          <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => void addFiles(event.target.files)} disabled={busy} />
        </label>
        <label className={`${btnGhost} min-h-24 cursor-pointer flex-col gap-1 rounded-2xl border-dashed`}>
          <Film className="size-6" /><span className="text-xs">Add video</span>
          <input className="sr-only" type="file" accept="video/mp4,video/webm,video/quicktime" onChange={(event) => void addFiles(event.target.files)} disabled={busy} />
        </label>
        {busy ? <div className="col-span-2 flex min-h-24 items-center justify-center rounded-2xl border border-line-soft bg-white text-sm font-bold"><Loader2 className="mr-2 size-4 animate-spin" />Uploading…</div> : null}
      </div>
      {value.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{value.map((item, index) => <div key={`${item.publicId}-${index}`} className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white">{item.kind === "video" ? <video src={item.url} controls className="aspect-square h-full w-full object-cover" /> : <img src={item.url} alt={`Listing media ${index + 1}`} className="aspect-square h-full w-full object-cover" />}{index === 0 ? <span className="absolute left-2 top-2 rounded-full bg-[#061A33]/90 px-2 py-1 text-[10px] font-black text-white">Cover</span> : null}<button type="button" aria-label="Remove media" onClick={() => remove(index)} className="absolute right-2 top-2 grid size-9 place-items-center rounded-full bg-white/95 text-red-700 shadow"><Trash2 className="size-4" /></button></div>)}</div> : null}
      {note ? <p className="text-sm font-semibold text-red-700">{note}</p> : null}
    </section>
  );
}

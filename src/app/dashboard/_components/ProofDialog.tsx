"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { errorMessage } from "@/lib/api";
import { uploadImage } from "@/lib/upload";

/**
 * "Mark rescued" flow shared by the NGO dashboard and the driver portal:
 * pick/take a proof photo → compressed upload with progress → caller submits the resolution.
 */
export function ProofDialog({
  open,
  onOpenChange,
  onSubmit,
  title = "Mark animal safe",
  description = "Upload an \"after\" photo so the citizen can see the animal is in care.",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: { resolvedImageUrl: string; notes?: string }) => Promise<void>;
  title?: string;
  description?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setNotes("");
      setProgress(null);
      setPreview((p) => {
        if (p) URL.revokeObjectURL(p);
        return null;
      });
    }
  }, [open]);

  const pick = (f?: File) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast.error("Please choose an image file.");
    setFile(f);
    setPreview((p) => {
      if (p) URL.revokeObjectURL(p);
      return URL.createObjectURL(f);
    });
  };

  const submit = async () => {
    if (!file) return toast.warning("A proof photo is required.");
    setSubmitting(true);
    try {
      setProgress(0);
      const url = await uploadImage(file, setProgress);
      await onSubmit({ resolvedImageUrl: url, notes: notes.trim() || undefined });
      onOpenChange(false);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSubmitting(false);
      setProgress(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          {preview ? (
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
              <img src={preview} alt="Proof photo preview" className="size-full object-cover" />
              {!submitting && (
                <Button
                  type="button"
                  size="icon-sm"
                  variant="inverse"
                  className="absolute right-3 top-3"
                  aria-label="Remove photo"
                  onClick={() => {
                    setFile(null);
                    setPreview((p) => {
                      if (p) URL.revokeObjectURL(p);
                      return null;
                    });
                  }}
                >
                  <X />
                </Button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed bg-subtle text-muted-foreground transition hover:border-primary/60 hover:bg-primary-soft/40"
            >
              <span className="grid size-12 place-items-center rounded-2xl bg-card text-primary shadow-[var(--shadow-soft)]">
                <Camera className="size-5" />
              </span>
              <span className="text-sm font-medium text-foreground">Take or choose a photo</span>
              <span className="text-xs">JPEG/PNG · compressed before upload</span>
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(e) => pick(e.target.files?.[0])}
          />
          {progress !== null && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{progress < 100 ? "Uploading photo…" : "Saving…"}</span>
                <span className="font-mono">{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="proof-notes">Notes (optional)</Label>
            <Textarea
              id="proof-notes"
              placeholder="e.g. Treated for leg wound, moved to shelter"
              value={notes}
              maxLength={500}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-20"
            />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="success" onClick={submit} loading={submitting} disabled={!file}>
            {!submitting && (file ? <CheckCircle2 /> : <ImagePlus />)} Complete rescue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

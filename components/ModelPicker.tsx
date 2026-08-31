"use client";

import {
  MODELS,
  MODEL_IDS,
  formatContextWindow,
  formatRupiah,
  ratePer1kTokens,
  type ModelId,
} from "@/lib/pricing";

export default function ModelPicker({
  value,
  onChange,
  disabled,
}: {
  value: ModelId;
  onChange: (model: ModelId) => void;
  disabled?: boolean;
}) {
  const spec = MODELS[value];
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ModelId)}
        disabled={disabled}
        aria-label="Pilih model"
        className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-300 outline-none focus:border-orange-400 disabled:opacity-50"
      >
        {MODEL_IDS.map((id) => (
          <option key={id} value={id}>
            {MODELS[id].label} — {MODELS[id].tagline}
          </option>
        ))}
      </select>
      <span>
        {formatRupiah(ratePer1kTokens(value, "input"))}/1K masuk ·{" "}
        {formatRupiah(ratePer1kTokens(value, "output"))}/1K keluar ·{" "}
        {formatContextWindow(spec.contextTokens)} konteks
      </span>
    </div>
  );
}

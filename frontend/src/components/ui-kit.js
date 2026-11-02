export const inputCls =
  "w-full rounded-xl border border-[#E5E7E2] bg-white px-4 py-3 text-base outline-none transition-[border-color,box-shadow] focus:border-[#4A6B56] focus:ring-2 focus:ring-[#4A6B56]/30";

export const btnCls =
  "inline-flex items-center justify-center gap-2 rounded-full bg-[#4A6B56] px-6 py-3 font-semibold text-white transition-[background-color,transform] hover:bg-[#3C5745] active:scale-95 disabled:opacity-60";

export const cardCls = "rounded-2xl border border-black/5 bg-white p-6 sm:p-8 shadow-sm";

export const labelCls = "mb-2 block text-sm font-medium text-[#262D29]";

export function Stat({ label, value, testId }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white px-6 py-5 shadow-sm">
      <span className="text-[#69746D]">{label}</span>{" "}
      <span className="font-display text-2xl font-bold text-[#4A6B56]" data-testid={testId}>{value}</span>
    </div>
  );
}

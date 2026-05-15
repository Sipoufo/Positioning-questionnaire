// inputs.tsx
// Tailwind classes shared across text inputs / textareas / select. Centralized
// so visual changes propagate uniformly.

export const inputClass =
  'w-full rounded-md border border-hc-gray-mid bg-white px-3 py-2 text-base text-hc-gray-text placeholder:text-hc-gray-mid focus:border-hc-green-accent focus:outline-none focus:ring-2 focus:ring-hc-green-accent/40 disabled:bg-hc-gray-light aria-[invalid=true]:border-hc-red-alert aria-[invalid=true]:bg-hc-red-pale/40 aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-hc-red-alert/30 aria-[invalid=true]:focus:border-hc-red-alert aria-[invalid=true]:focus:ring-hc-red-alert/40';

export const textareaClass = `${inputClass} min-h-[110px] resize-y leading-relaxed`;

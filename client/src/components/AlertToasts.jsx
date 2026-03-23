import React from "react";
import { Bell, CircleAlert, CircleCheck, Info, X } from "lucide-react";

const toneMap = {
  success: {
    Icon: CircleCheck,
    border: "var(--gain)",
  },
  warning: {
    Icon: CircleAlert,
    border: "#d99e2b",
  },
  error: {
    Icon: CircleAlert,
    border: "var(--loss)",
  },
  info: {
    Icon: Info,
    border: "var(--accent)",
  },
};

function AlertToasts({ toasts, onDismiss }) {
  return (
    <div className="fixed right-4 top-4 z-[90] flex w-[min(92vw,22rem)] flex-col gap-3">
      {toasts.map((toast) => {
        const tone = toneMap[toast.tone] || toneMap.info;
        const Icon = tone.Icon || Bell;

        return (
          <div
            key={toast.id}
            className="fade-in-up rounded-xl border px-4 py-3 shadow-xl"
            style={{
              background: "var(--card-strong)",
              borderColor: tone.border,
              boxShadow: "var(--shadow)",
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="mt-1 rounded-full p-1.5"
                style={{ background: "var(--accent-soft)" }}
              >
                <Icon size={15} style={{ color: tone.border }} />
              </div>

              <div className="flex-1">
                <p
                  className="text-sm font-semibold"
                  style={{ color: "var(--text)" }}
                >
                  {toast.title}
                </p>
                <p
                  className="mt-1 text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  {toast.message}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                className="rounded-md p-1 transition-colors hover:bg-black/10 dark:hover:bg-white/10"
                aria-label="Dismiss alert"
              >
                <X size={14} style={{ color: "var(--text-muted)" }} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default AlertToasts;

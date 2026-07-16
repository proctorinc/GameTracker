import { type ReactNode } from "react";
import { getProfileColorSurfaceStyles } from "@/components/profile/profile-color-styles";
import { cn } from "@/lib/utils";

export function compareMetricValues(input: {
  current: number | null;
  comparison: number | null;
  lowerIsBetter?: boolean;
}) {
  if (input.current === null || input.comparison === null) {
    return { currentWins: false, comparisonWins: false };
  }

  if (input.current === input.comparison) {
    if (input.current === 0) {
      return { currentWins: false, comparisonWins: false };
    }

    return { currentWins: true, comparisonWins: true };
  }

  if (input.lowerIsBetter) {
    return {
      currentWins: input.current < input.comparison,
      comparisonWins: input.comparison < input.current,
    };
  }

  return {
    currentWins: input.current > input.comparison,
    comparisonWins: input.comparison > input.current,
  };
}

function ComparisonMetricValuePill(props: {
  value: string | number;
  highlighted: boolean;
  color: string;
}) {
  return (
    <span
      className={cn(
        "relative isolate inline-flex min-h-9 min-w-9 items-center justify-center overflow-hidden rounded-full px-3 py-1 ring-1 ring-slate-900/6 dark:ring-white/12",
        props.highlighted && "font-bold",
      )}
      style={
        props.highlighted
          ? getProfileColorSurfaceStyles(props.color)
          : undefined
      }
    >
      {props.highlighted ? (
        <>
          <span className="pointer-events-none absolute inset-[1px] rounded-full border border-[var(--profile-surface-ring)]" />
          <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_28%,var(--profile-surface-highlight)_0%,transparent_58%)] dark:bg-[radial-gradient(circle_at_30%_28%,rgba(15,23,42,0.18)_0%,transparent_58%)]" />
          <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,var(--profile-surface-shade)_100%)] dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.06)_0%,rgba(15,23,42,0.22)_100%)]" />
        </>
      ) : null}
      <span className="relative z-10">{props.value}</span>
    </span>
  );
}

export function ComparisonMetricRow(props: {
  label: string;
  currentValue: string | number;
  comparisonValue: string | number;
  currentWins: boolean;
  comparisonWins: boolean;
  currentColor: string;
  comparisonColor: string;
  className?: string;
  labelClassName?: string;
  currentSlot?: ReactNode;
  comparisonSlot?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-xl border border-border/70 bg-muted/30 px-4 py-3 text-sm",
        props.className,
      )}
    >
      <div
        className={cn(
          "flex items-center",
          props.currentWins
            ? "font-bold text-foreground"
            : "text-muted-foreground",
        )}
      >
        {props.currentSlot ?? (
          <ComparisonMetricValuePill
            value={props.currentValue}
            highlighted={props.currentWins}
            color={props.currentColor}
          />
        )}
      </div>
      <div className="text-center">
        <p
          className={cn(
            "text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground",
            props.labelClassName,
          )}
        >
          {props.label}
        </p>
      </div>
      <div
        className={cn(
          "flex items-center justify-end",
          props.comparisonWins
            ? "font-bold text-foreground"
            : "text-muted-foreground",
        )}
      >
        {props.comparisonSlot ?? (
          <ComparisonMetricValuePill
            value={props.comparisonValue}
            highlighted={props.comparisonWins}
            color={props.comparisonColor}
          />
        )}
      </div>
    </div>
  );
}

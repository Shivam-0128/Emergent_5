import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { api, errorText, last7Days } from "@/lib/api";
import { cardCls, Stat } from "@/components/ui-kit";
import { Comments } from "@/components/Comments";

function Last7Days({ habit, onToggle }) {
  const done = new Set(habit.completions);
  return (
    <section className={cardCls} data-testid="last-7-days">
      <h2 className="mb-5 text-lg font-bold tracking-tight">Last 7 days</h2>
      <ul className="grid gap-2 sm:grid-cols-2">
        {last7Days().map((d) => (
          <li key={d}>
            <label htmlFor={`day-${d}`} className={`flex items-center gap-3 rounded-xl border border-[#E5E7E2] px-4 py-3 transition-colors ${habit.is_owner ? "cursor-pointer hover:bg-[#F0F2ED]/60" : ""} ${done.has(d) ? "bg-[#F0F2ED]" : ""}`}>
              <input id={`day-${d}`} type="checkbox" className="tick" checked={done.has(d)} disabled={!habit.is_owner}
                onChange={(e) => onToggle(d, e.target.checked)} data-testid={`day-checkbox-${d}`} />
              <span className="font-mono text-sm">{d}</span>
            </label>
          </li>
        ))}
      </ul>
      {!habit.is_owner && <p className="mt-4 text-sm text-[#69746D]">Only {habit.owner_name} can tick these days.</p>}
    </section>
  );
}

export default function HabitPage() {
  const { id } = useParams();
  const [habit, setHabit] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get(`/habits/${id}`).then((r) => setHabit(r.data)).catch((e) => setError(errorText(e)));
  }, [id]);

  const toggle = async (date, done) => {
    try {
      const { data } = await api.put(`/habits/${id}/ticks`, { date, done });
      setHabit((h) => ({ ...h, ...data }));
    } catch (e) { toast.error(errorText(e)); }
  };

  if (error) return <p className="text-[#D95E5E]" data-testid="habit-error">{error}</p>;
  if (!habit) return <p className="text-[#69746D]">Loading…</p>;

  return (
    <div className="space-y-8">
      <div>
        <p className="mb-3 text-xs uppercase tracking-[0.2em] text-[#69746D]" data-testid="habit-meta">
          {habit.shared ? "Shared" : "Private"} · by {habit.owner_name}
        </p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl" data-testid="habit-name">{habit.name}</h1>
      </div>
      <section className={cardCls}>
        <h2 className="mb-2 text-xs uppercase tracking-[0.2em] text-[#69746D]">When I do it</h2>
        <p className="whitespace-pre-wrap leading-relaxed" data-testid="habit-when">{habit.when_i_do_it || "—"}</p>
      </section>
      <div className="grid gap-4 sm:grid-cols-2">
        <Stat label="Days done:" value={habit.days_done} testId="days-done" />
        <Stat label="Current streak:" value={habit.current_streak} testId="current-streak" />
      </div>
      <Last7Days habit={habit} onToggle={toggle} />
      {habit.shared && <Comments habitId={habit.id} initial={habit.comments} />}
    </div>
  );
}

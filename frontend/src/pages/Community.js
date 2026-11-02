import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { api, errorText } from "@/lib/api";

function SharedHabit({ habit, i }) {
  return (
    <li className="fade-up rounded-2xl border border-black/5 bg-white p-6 shadow-sm transition-[transform,box-shadow] hover:-translate-y-1 hover:shadow-md sm:p-8"
      style={{ animationDelay: `${i * 60}ms` }} data-testid={`community-habit-${habit.id}`}>
      <Link to={`/habits/${habit.id}`} className="font-display text-xl font-bold tracking-tight hover:text-[#4A6B56]" data-testid={`community-habit-link-${habit.id}`}>
        {habit.name}
      </Link>
      <p className="mt-1 text-sm text-[#69746D]">by <span className="font-medium text-[#262D29]" data-testid={`community-habit-owner-${habit.id}`}>{habit.owner_name}</span></p>
      <p className="mt-4 whitespace-pre-wrap leading-relaxed" data-testid={`community-habit-when-${habit.id}`}>{habit.when_i_do_it || "—"}</p>
      <p className="mt-4 text-sm">
        <span className="text-[#69746D]">Days done:</span>{" "}
        <span className="font-display font-bold text-[#4A6B56]" data-testid={`community-habit-days-${habit.id}`}>{habit.days_done}</span>
      </p>
    </li>
  );
}

export default function Community() {
  const [habits, setHabits] = useState(null);
  useEffect(() => { api.get("/habits/community").then((r) => setHabits(r.data)).catch((e) => toast.error(errorText(e))); }, []);

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl" data-testid="page-title">Community</h1>
        <p className="mt-3 text-[#69746D]">Habits members have chosen to share. Open one to ask a question or join the discussion.</p>
      </div>
      {habits === null ? <p className="text-[#69746D]">Loading…</p> : habits.length === 0 ? (
        <p className="text-[#69746D]" data-testid="no-shared-habits">No shared habits yet.</p>
      ) : (
        <ul className="space-y-6" data-testid="community-list">
          {habits.map((h, i) => <SharedHabit key={h.id} habit={h} i={i} />)}
        </ul>
      )}
    </div>
  );
}

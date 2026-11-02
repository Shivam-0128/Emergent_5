import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Lock, Globe } from "lucide-react";
import { api, errorText } from "@/lib/api";
import { inputCls, btnCls, labelCls, cardCls } from "@/components/ui-kit";

function AddHabitForm({ onAdded }) {
  const [name, setName] = useState("");
  const [when, setWhen] = useState("");
  const [shared, setShared] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post("/habits", { name, when_i_do_it: when, shared });
      onAdded(data);
      setName(""); setWhen(""); setShared(false);
      toast.success("Habit added");
    } catch (err) { toast.error(errorText(err)); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className={`${cardCls} space-y-5`} data-testid="add-habit-form">
      <div>
        <label htmlFor="habit-name" className={labelCls}>Habit name</label>
        <input id="habit-name" required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} data-testid="habit-name-input" />
      </div>
      <div>
        <label htmlFor="when-i-do-it" className={labelCls}>When I do it</label>
        <textarea id="when-i-do-it" rows={3} value={when} onChange={(e) => setWhen(e.target.value)} className={inputCls}
          placeholder="e.g. Right after my morning coffee, when the house is still quiet" data-testid="when-i-do-it-input" />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <label htmlFor="share-habit" className="flex cursor-pointer items-center gap-3 text-sm">
          <input id="share-habit" type="checkbox" className="tick sm" checked={shared} onChange={(e) => setShared(e.target.checked)} data-testid="share-with-community-checkbox" />
          Share with the community
        </label>
        <button type="submit" disabled={busy} className={btnCls} data-testid="add-habit-button"><Plus className="h-4 w-4" /> Add habit</button>
      </div>
    </form>
  );
}

function HabitItem({ habit, i }) {
  return (
    <li className="fade-up flex items-center justify-between gap-4 rounded-2xl border border-black/5 bg-white px-6 py-5 shadow-sm transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md"
      style={{ animationDelay: `${i * 50}ms` }} data-testid={`habit-item-${habit.id}`}>
      <Link to={`/habits/${habit.id}`} className="min-w-0 truncate font-display text-lg font-semibold hover:text-[#4A6B56]" data-testid={`habit-link-${habit.id}`}>
        {habit.name}
      </Link>
      <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${habit.shared ? "bg-[#E3A387]/20 text-[#9A5636]" : "bg-[#F0F2ED] text-[#69746D]"}`}
        data-testid={`habit-status-${habit.id}`}>
        {habit.shared ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
        {habit.shared ? "Shared" : "Private"}
      </span>
    </li>
  );
}

export default function MyHabits() {
  const [habits, setHabits] = useState(null);
  useEffect(() => { api.get("/habits/mine").then((r) => setHabits(r.data)).catch((e) => toast.error(errorText(e))); }, []);

  return (
    <div className="space-y-10">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl" data-testid="page-title">My habits</h1>
      <AddHabitForm onAdded={(h) => setHabits((hs) => [h, ...(hs || [])])} />
      {habits === null ? <p className="text-[#69746D]">Loading…</p> : habits.length === 0 ? (
        <p className="text-[#69746D]" data-testid="no-habits">No habits yet. Add your first one above.</p>
      ) : (
        <ul className="space-y-3" data-testid="my-habits-list">
          {habits.map((h, i) => <HabitItem key={h.id} habit={h} i={i} />)}
        </ul>
      )}
    </div>
  );
}

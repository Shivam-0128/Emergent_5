import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sprout } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { errorText } from "@/lib/api";
import { inputCls, btnCls, labelCls, cardCls } from "@/components/ui-kit";

function Field({ id, label, type = "text", value, onChange }) {
  return (
    <div>
      <label htmlFor={id} className={labelCls}>{label}</label>
      <input id={id} type={type} required value={value} onChange={(e) => onChange(e.target.value)}
        className={inputCls} data-testid={`${id}-input`} />
    </div>
  );
}

export default function AuthPage({ mode }) {
  const isUp = mode === "signup";
  const { authenticate } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ display_name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setBusy(true);
    try {
      const body = isUp ? form : { email: form.email, password: form.password };
      await authenticate(isUp ? "/auth/register" : "/auth/login", body);
      navigate("/my-habits");
    } catch (err) {
      setError(errorText(err));
    } finally { setBusy(false); }
  };

  return (
    <div className="flex min-h-screen items-center px-6 py-12">
      <div className="fade-up mx-auto w-full max-w-md">
        <div className="mb-8 flex items-center gap-2 font-display text-lg font-extrabold">
          <span className="grid h-9 w-9 place-content-center rounded-full bg-[#4A6B56] text-white"><Sprout className="h-4 w-4" /></span>
          Habit Circle
        </div>
        <h1 className="mb-2 text-4xl font-bold tracking-tight">{isUp ? "Sign up" : "Sign in"}</h1>
        <p className="mb-8 text-[#69746D]">Track your daily habits and share them with your group.</p>
        <form onSubmit={submit} className={`${cardCls} space-y-5`} data-testid={`${mode}-form`}>
          {isUp && <Field id="display-name" label="Display name" value={form.display_name} onChange={set("display_name")} />}
          <Field id="email" label="Email" type="email" value={form.email} onChange={set("email")} />
          <Field id="password" label="Password" type="password" value={form.password} onChange={set("password")} />
          {error && <p className="text-sm text-[#D95E5E]" data-testid="auth-error">{error}</p>}
          <button type="submit" disabled={busy} className={`${btnCls} w-full`} data-testid={`${mode}-submit-button`}>
            {isUp ? "Sign up" : "Sign in"}
          </button>
        </form>
        <p className="mt-6 text-sm text-[#69746D]">
          {isUp ? "Already have an account? " : "New here? "}
          <Link to={isUp ? "/signin" : "/signup"} className="font-semibold text-[#4A6B56] hover:underline" data-testid="auth-switch-link">
            {isUp ? "Sign in" : "Sign up"}
          </Link>
        </p>
      </div>
    </div>
  );
}

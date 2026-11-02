import { NavLink, useNavigate } from "react-router-dom";
import { Sprout, ListChecks, Users, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const links = [
  { to: "/my-habits", label: "My habits", icon: ListChecks },
  { to: "/community", label: "Community", icon: Users },
];

function NavItems({ place, onSignOut }) {
  return (
    <>
      {links.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          data-testid={`${place}-link-${to.slice(1)}`}
          className={({ isActive }) =>
            `flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors ${
              isActive ? "bg-[#F0F2ED] font-semibold text-[#262D29]" : "text-[#69746D] hover:bg-[#F0F2ED]/60 hover:text-[#262D29]"
            }`
          }
        >
          <Icon className="h-4 w-4" /> {label}
        </NavLink>
      ))}
      <button
        onClick={onSignOut}
        data-testid={`${place}-sign-out-button`}
        className="flex items-center gap-2 rounded-full px-4 py-2 text-sm text-[#69746D] transition-colors hover:bg-[#F0F2ED]/60 hover:text-[#D95E5E]"
      >
        <LogOut className="h-4 w-4" /> Sign out
      </button>
    </>
  );
}

const Brand = () => (
  <div className="flex items-center gap-2 font-display text-lg font-extrabold tracking-tight">
    <span className="grid h-8 w-8 place-content-center rounded-full bg-[#4A6B56] text-white"><Sprout className="h-4 w-4" /></span>
    Habit Circle
  </div>
);

export function Layout({ children }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const handleSignOut = async () => { await signOut(); navigate("/signin"); };

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-[#E5E7E2] bg-white p-6 md:flex" data-testid="sidebar">
        <Brand />
        <nav className="mt-10 flex flex-1 flex-col gap-1">
          <NavItems place="sidebar" onSignOut={handleSignOut} />
        </nav>
        <p className="text-xs text-[#69746D]" data-testid="sidebar-user-name">Signed in as {user.display_name}</p>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-[#E5E7E2] bg-white/70 backdrop-blur-xl" data-testid="top-nav">
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 sm:px-10">
            <div className="md:hidden"><Brand /></div>
            <nav className="ml-auto flex flex-wrap items-center gap-1">
              <NavItems place="top" onSignOut={handleSignOut} />
            </nav>
          </div>
        </header>
        <main className="fade-up w-full max-w-5xl flex-1 px-6 py-10 sm:px-10 lg:px-14 lg:py-14">{children}</main>
      </div>
    </div>
  );
}

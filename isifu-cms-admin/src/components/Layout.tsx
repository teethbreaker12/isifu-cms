import {
    BookOpen,
    ClipboardList,
    Database,
    FileText,
    Image,
    LayoutDashboard,
    LogOut,
    Menu,
    Settings,
    ShieldCheck,
    Users,
    X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";
import { clearTokens, revokeCurrentSession } from "../api/client";
import { isAdmin } from "../auth";
import { getLanguage, setLanguage, t } from "../i18n";
import { useTheme } from "../theme";
import { SelectField } from "./SelectField";
import { UserBadge } from "./UserBadge";

import config from "../../package.json";

export function Layout() {
    const navigate = useNavigate();
    const { theme, setTheme } = useTheme();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const links = [
        {
            to: "/",
            label: t("nav.dashboard"),
            icon: LayoutDashboard,
            adminOnly: false,
        },
        {
            to: "/entries",
            label: t("nav.entries"),
            icon: BookOpen,
            adminOnly: false,
        },
        {
            to: "/forms",
            label: t("nav.forms"),
            icon: ClipboardList,
            adminOnly: false,
        },
        {
            to: "/content-types",
            label: t("nav.models"),
            icon: Database,
            adminOnly: true,
        },
        {
            to: "/pages",
            label: t("nav.pages"),
            icon: FileText,
            adminOnly: false,
        },
        { to: "/media", label: t("nav.media"), icon: Image, adminOnly: false },
        { to: "/users", label: t("nav.users"), icon: Users, adminOnly: true },
        {
            to: "/settings",
            label: t("nav.settings"),
            icon: Settings,
            adminOnly: false,
        },
    ].filter((link) => !link.adminOnly || isAdmin());
    useEffect(() => {
        document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
        return () => {
            document.body.style.overflow = "";
        };
    }, [mobileMenuOpen]);

    const signOut = async () => {
        await revokeCurrentSession();
        clearTokens();
        setMobileMenuOpen(false);
        navigate("/login");
    };

    const sidebarContent = (
        <>
            <div className="px-4 py-4 pr-16 md:px-4 md:pr-4">
                <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-stone-950 text-sm font-semibold text-white">
                        IS
                    </div>
                    <div className="min-w-0">
                        <div className="truncate text-base font-semibold tracking-tight text-stone-950">
                            {t("app.name")}
                        </div>
                        <div className="text-xs text-stone-500">
                            v{config.version}
                        </div>
                    </div>
                </div>
            </div>
            <nav className="grid gap-1 px-3" aria-label="Workspace navigation">
                {links.map(({ to, label, icon: Icon }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={to === "/"}
                        onClick={() => setMobileMenuOpen(false)}
                        className={({ isActive }) =>
                            `group relative flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
                                isActive
                                    ? "accent-soft"
                                    : "text-stone-600 hover:bg-stone-100 hover:text-stone-950"
                            }`
                        }
                    >
                        <Icon size={18} />
                        <span className="min-w-0 truncate">{label}</span>
                    </NavLink>
                ))}
            </nav>
            <div className="mt-auto grid gap-3 border-t border-stone-200 px-3 pb-4 pt-4">
                <UserBadge compact />
                <div className="grid grid-cols-2 gap-2">
                    <SelectField
                        className="min-w-0"
                        buttonClassName="px-2 py-2 text-xs font-medium"
                        value={getLanguage()}
                        options={[
                            { value: "en", label: "English" },
                            { value: "pl", label: "Polski" },
                            { value: "es", label: "Español" },
                        ]}
                        onChange={setLanguage}
                        ariaLabel="Language"
                    />
                    <SelectField
                        className="min-w-0"
                        buttonClassName="px-2 py-2 text-xs font-medium"
                        value={theme}
                        options={[
                            { value: "system", label: t("theme.system") },
                            { value: "light", label: t("theme.light") },
                            { value: "dark", label: t("theme.dark") },
                        ]}
                        onChange={(next) => setTheme(next as "light" | "dark" | "system")}
                        ariaLabel="Theme"
                    />
                </div>
                <button
                    className="flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100"
                    onClick={signOut}
                >
                    <LogOut size={18} />
                    {t("nav.signOut")}
                </button>
            </div>
        </>
    );

    return (
        <div className="app-shell min-h-screen">
            <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-stone-200 bg-white/92 backdrop-blur md:flex">
                {sidebarContent}
            </aside>

            <div className="sticky top-0 z-20 flex min-h-16 items-center justify-between border-b border-stone-200 bg-white/92 px-4 backdrop-blur md:hidden">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-lg bg-stone-950 text-xs font-semibold text-white">
                        IS
                    </div>
                    <div className="truncate text-base font-semibold tracking-tight text-stone-950">
                        {t("app.name")}
                    </div>
                </div>
                <button
                    type="button"
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-stone-300 text-stone-700"
                    onClick={() => setMobileMenuOpen(true)}
                    aria-label="Open navigation"
                    aria-expanded={mobileMenuOpen}
                >
                    <Menu size={22} />
                </button>
            </div>

            {mobileMenuOpen && (
                <div className="fixed inset-0 z-40 md:hidden">
                    <button
                        type="button"
                        className="absolute inset-0 h-full w-full bg-stone-950/40"
                        onClick={() => setMobileMenuOpen(false)}
                        aria-label="Close navigation"
                    />
                    <aside className="absolute inset-y-0 left-0 flex w-[min(20rem,86vw)] flex-col overflow-y-auto border-r border-stone-200 bg-white shadow-xl">
                        <button
                            type="button"
                            className="absolute right-3 top-4 z-10 grid h-10 w-10 place-items-center rounded-md border border-stone-300 bg-white text-stone-700"
                            onClick={() => setMobileMenuOpen(false)}
                            aria-label="Close navigation"
                        >
                            <X size={20} />
                        </button>
                        {sidebarContent}
                    </aside>
                </div>
            )}

            <main className="min-w-0 md:pl-72">
                <div className="sticky top-0 z-10 hidden border-b border-stone-200 bg-white/76 backdrop-blur md:block">
                    <div className="mx-auto flex min-h-14 max-w-7xl items-center justify-end gap-4 px-5 lg:px-6 xl:px-8">
                        <div className="flex items-center gap-3">
                            <div className="accent-soft hidden items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-semibold lg:flex">
                                <ShieldCheck size={14} />
                                {t("dashboard.apiOnline")}
                            </div>
                            <button
                                type="button"
                                className="grid h-8 w-8 place-items-center rounded-md border border-stone-300 bg-white text-stone-700"
                                onClick={() => navigate("/settings")}
                                aria-label={t("dashboard.commandSettings")}
                                title={t("dashboard.commandSettings")}
                            >
                                <Settings size={15} />
                            </button>
                        </div>
                    </div>
                </div>
                <div className="mx-auto min-w-0 max-w-7xl px-3 py-4 sm:px-5 md:py-6 lg:px-6 xl:px-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}

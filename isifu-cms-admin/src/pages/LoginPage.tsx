import { useState } from "react";
import { useNavigate } from "react-router";
import { Lock, ShieldCheck } from "lucide-react";
import { api, setCurrentUser, setTokens } from "../api/client";
import { t } from "../i18n";

export function LoginPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [totpCode, setTotpCode] = useState("");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [needsTwoFactor, setNeedsTwoFactor] = useState(false);

    async function submit(event: React.FormEvent) {
        event.preventDefault();
        setError("");
        setIsSubmitting(true);
        try {
            const result = await api.login({
                email: email.trim(),
                password,
                totpCode: totpCode || undefined,
            });
            if ("requiresTwoFactor" in result) {
                setNeedsTwoFactor(true);
                setTotpCode("");
                return;
            }
            setTokens(result.accessToken, result.refreshToken);
            setCurrentUser(result.user);
            navigate("/");
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Login failed");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="app-shell grid min-h-[100dvh] place-items-center px-4 py-8">
            <form
                onSubmit={submit}
                className="quiet-reveal app-panel w-full max-w-sm rounded-lg p-6"
            >
                <div className="mb-6 flex items-start justify-between gap-4 border-b border-stone-200 pb-5">
                    <div className="min-w-0">
                        <div className="app-label">isifu CMS</div>
                        <h1 className="mt-1 text-xl font-semibold tracking-tight text-stone-950">
                            {t("login.title")}
                        </h1>
                        <p className="mt-1 text-sm leading-5 text-stone-500">
                            {t("login.subtitle")}
                        </p>
                    </div>
                    <div className="accent-bg grid h-10 w-10 shrink-0 place-items-center rounded-md">
                        <Lock size={20} />
                    </div>
                </div>
                <label className="mb-3 grid gap-1 text-sm font-medium text-stone-700">
                    {t("login.email")}
                    <input
                        id="email"
                        name="username"
                        className="rounded-md border border-stone-300 px-3 py-2 font-normal focus-ring"
                        required
                        type="email"
                        autoComplete="username"
                        autoCapitalize="none"
                        autoCorrect="off"
                        placeholder={t("login.emailPlaceholder")}
                        value={email}
                        readOnly={needsTwoFactor}
                        onChange={(event) => setEmail(event.target.value)}
                    />
                </label>
                <label className="mb-3 grid gap-1 text-sm font-medium text-stone-700">
                    {t("login.password")}
                    <input
                        id="password"
                        name="password"
                        className="rounded-md border border-stone-300 px-3 py-2 font-normal focus-ring"
                        required
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        readOnly={needsTwoFactor}
                        onChange={(event) => setPassword(event.target.value)}
                    />
                </label>
                {needsTwoFactor && (
                    <label className="mb-4 grid gap-1 text-sm font-medium text-stone-700">
                        <span className="inline-flex items-center gap-2">
                            <ShieldCheck size={15} />
                            {t("login.twoFactorCode")}
                        </span>
                        <input
                            id="one-time-code"
                            name="one-time-code"
                            className="rounded-md border border-stone-300 px-3 py-2 font-normal focus-ring"
                            required
                            autoFocus
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            pattern="[0-9\\s-]*"
                            maxLength={12}
                            placeholder={t("users.twoFactorCodePlaceholder")}
                            value={totpCode}
                            onChange={(event) =>
                                setTotpCode(event.target.value)
                            }
                        />
                    </label>
                )}
                {error && (
                    <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                        {error}
                    </div>
                )}
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="accent-bg w-full rounded-md px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:bg-stone-400"
                >
                    {isSubmitting
                        ? t("login.signingIn")
                        : needsTwoFactor
                          ? t("login.verifyCode")
                          : t("login.signIn")}
                </button>
                {needsTwoFactor && (
                    <button
                        type="button"
                        className="mt-3 w-full rounded-md border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700"
                        onClick={() => {
                            setNeedsTwoFactor(false);
                            setTotpCode("");
                        }}
                    >
                        {t("login.differentAccount")}
                    </button>
                )}
            </form>
        </div>
    );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import { api, setCurrentUser, setTokens } from "../api/client";
import { t } from "../i18n";

export function LoginPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("admin@example.com");
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
        <div className="grid min-h-screen place-items-center bg-[#f7f7f4] px-4">
            <form
                onSubmit={submit}
                className="w-full max-w-sm rounded-lg border border-stone-200 bg-white p-6 shadow-sm"
            >
                <div className="mb-6 flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-md bg-blue-600 text-white">
                        <Lock size={20} />
                    </div>
                    <div>
                        <h1 className="text-lg font-semibold text-stone-950">
                            {t("login.title")}
                        </h1>
                        <p className="text-sm text-stone-500">
                            {t("login.subtitle")}
                        </p>
                    </div>
                </div>
                <label className="mb-3 grid gap-1 text-sm font-medium text-stone-700">
                    {t("login.email")}
                    <input
                        className="rounded-md border border-stone-300 px-3 py-2 font-normal focus-ring"
                        required
                        placeholder={t("login.emailPlaceholder")}
                        onChange={(event) => setEmail(event.target.value)}
                    />
                </label>
                <label className="mb-3 grid gap-1 text-sm font-medium text-stone-700">
                    {t("login.password")}
                    <input
                        className="rounded-md border border-stone-300 px-3 py-2 font-normal focus-ring"
                        required
                        type="password"
                        value={password}
                        disabled={needsTwoFactor}
                        onChange={(event) => setPassword(event.target.value)}
                    />
                </label>
                {needsTwoFactor && (
                    <label className="mb-4 grid gap-1 text-sm font-medium text-stone-700">
                        {t("login.twoFactorCode")}
                        <input
                            className="rounded-md border border-stone-300 px-3 py-2 font-normal focus-ring"
                            required
                            autoFocus
                            inputMode="numeric"
                            autoComplete="one-time-code"
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
                    className="w-full rounded-md bg-stone-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-stone-400"
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

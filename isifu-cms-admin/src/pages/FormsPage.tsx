import { useEffect, useMemo, useState } from "react";
import { Mail, Pencil, Plus, Trash2, X } from "lucide-react";
import { api } from "../api/client";
import { isAdmin } from "../auth";
import { Panel } from "../components/Panel";
import { t } from "../i18n";
import type {
    ContactForm,
    FormField,
    FormFieldType,
    FormSubmission,
} from "../types/cms";

const emptyField: FormField = {
    label: "",
    key: "",
    type: "text",
    required: false,
};
const fieldTypes: FormFieldType[] = [
    "text",
    "email",
    "phone",
    "date",
    "textarea",
    "select",
    "checkbox",
    "hidden",
];

export function FormsPage() {
    const [forms, setForms] = useState<ContactForm[]>([]);
    const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
    const [selectedKey, setSelectedKey] = useState("");
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [name, setName] = useState("");
    const [key, setKey] = useState("");
    const [description, setDescription] = useState("");
    const [recipientEmail, setRecipientEmail] = useState("");
    const [notificationSubject, setNotificationSubject] = useState("");
    const [responderEnabled, setResponderEnabled] = useState(false);
    const [responderEmailField, setResponderEmailField] = useState("");
    const [responderSubject, setResponderSubject] = useState("");
    const [responderMessage, setResponderMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [fields, setFields] = useState<FormField[]>([{ ...emptyField }]);
    const [error, setError] = useState("");
    const admin = isAdmin();
    const selected = forms.find((form) => form.key === selectedKey);
    const emailFields = useMemo(
        () => fields.filter((field) => field.type === "email"),
        [fields],
    );

    const load = async () => {
        const result = await api.forms();
        setForms(result);
        setSelectedKey((current) => current || result[0]?.key || "");
    };

    useEffect(() => {
        void load();
    }, []);

    useEffect(() => {
        if (selectedKey) api.formSubmissions(selectedKey).then(setSubmissions);
        else setSubmissions([]);
    }, [selectedKey]);

    async function submit(event: React.FormEvent) {
        event.preventDefault();
        setError("");
        try {
            const body = {
                name,
                key,
                description,
                recipientEmail,
                notificationSubject,
                responderEnabled,
                responderEmailField: responderEnabled
                    ? responderEmailField
                    : undefined,
                responderSubject,
                responderMessage,
                successMessage,
                fields,
            };
            if (editingKey) await api.updateForm(editingKey, body);
            else await api.createForm(body);
            resetForm();
            await load();
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Save failed");
        }
    }

    function edit(form: ContactForm) {
        setEditingKey(form.key);
        setName(form.name);
        setKey(form.key);
        setDescription(form.description || "");
        setRecipientEmail(form.recipientEmail);
        setNotificationSubject(form.notificationSubject || "");
        setResponderEnabled(Boolean(form.responderEnabled));
        setResponderEmailField(form.responderEmailField || "");
        setResponderSubject(form.responderSubject || "");
        setResponderMessage(form.responderMessage || "");
        setSuccessMessage(form.successMessage || "");
        setFields(
            form.fields.map(
                ({
                    label,
                    key: fieldKey,
                    type,
                    required,
                    settings,
                    order,
                }) => ({
                    label,
                    key: fieldKey,
                    type,
                    required,
                    settings,
                    order,
                }),
            ),
        );
    }

    function resetForm() {
        setEditingKey(null);
        setName("");
        setKey("");
        setDescription("");
        setRecipientEmail("");
        setNotificationSubject("");
        setResponderEnabled(false);
        setResponderEmailField("");
        setResponderSubject("");
        setResponderMessage("");
        setSuccessMessage("");
        setFields([{ ...emptyField }]);
        setError("");
    }

    async function remove(keyToDelete: string) {
        if (!window.confirm(t("forms.deleteConfirm"))) return;
        await api.deleteForm(keyToDelete);
        if (editingKey === keyToDelete) resetForm();
        await load();
    }

    const setField = (index: number, patch: Partial<FormField>) => {
        setFields(
            fields.map((field, fieldIndex) =>
                fieldIndex === index ? { ...field, ...patch } : field,
            ),
        );
    };

    return (
        <div className="grid gap-5">
            <h1 className="text-2xl font-semibold tracking-tight text-stone-950">
                {t("forms.title")}
            </h1>

            {admin && (
                <Panel
                    title={editingKey ? t("forms.edit") : t("forms.create")}
                    action={
                        editingKey ? (
                            <button
                                type="button"
                                className="inline-flex items-center gap-2 rounded-md border border-stone-300 px-3 py-2 text-sm"
                                onClick={resetForm}
                            >
                                <X size={16} />
                                {t("common.cancel")}
                            </button>
                        ) : null
                    }
                >
                    <form onSubmit={submit} className="grid gap-4">
                        <div className="grid gap-3 lg:grid-cols-2">
                            <input
                                className="rounded-md border border-stone-300 px-3 py-2"
                                placeholder={t("forms.name")}
                                value={name}
                                onChange={(event) =>
                                    setName(event.target.value)
                                }
                            />
                            <input
                                className="rounded-md border border-stone-300 px-3 py-2 disabled:bg-stone-100"
                                disabled={Boolean(editingKey)}
                                placeholder={t("forms.key")}
                                value={key}
                                onChange={(event) => setKey(event.target.value)}
                            />
                            <input
                                className="rounded-md border border-stone-300 px-3 py-2"
                                placeholder={t("forms.description")}
                                value={description}
                                onChange={(event) =>
                                    setDescription(event.target.value)
                                }
                            />
                            <input
                                className="rounded-md border border-stone-300 px-3 py-2"
                                type="email"
                                placeholder={t("forms.recipientEmail")}
                                value={recipientEmail}
                                onChange={(event) =>
                                    setRecipientEmail(event.target.value)
                                }
                            />
                            <input
                                className="rounded-md border border-stone-300 px-3 py-2 lg:col-span-2"
                                placeholder={t("forms.notificationSubject")}
                                value={notificationSubject}
                                onChange={(event) =>
                                    setNotificationSubject(event.target.value)
                                }
                            />
                        </div>

                        <div className="grid gap-3">
                            {fields.map((field, index) => (
                                <div
                                    key={index}
                                    className="grid gap-3 rounded-md border border-stone-200 p-3"
                                >
                                    <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_150px_120px_44px]">
                                        <input
                                            className="rounded-md border border-stone-300 px-3 py-2"
                                            placeholder={t("forms.fieldLabel")}
                                            value={field.label}
                                            onChange={(event) =>
                                                setField(index, {
                                                    label: event.target.value,
                                                })
                                            }
                                        />
                                        <input
                                            className="rounded-md border border-stone-300 px-3 py-2"
                                            placeholder={t("forms.fieldKey")}
                                            value={field.key}
                                            onChange={(event) =>
                                                setField(index, {
                                                    key: event.target.value,
                                                })
                                            }
                                        />
                                        <select
                                            className="rounded-md border border-stone-300 px-3 py-2"
                                            value={field.type}
                                            onChange={(event) =>
                                                setField(index, {
                                                    type: event.target
                                                        .value as FormFieldType,
                                                })
                                            }
                                        >
                                            {fieldTypes.map((type) => (
                                                <option key={type} value={type}>
                                                    {t(`formFields.${type}`)}
                                                </option>
                                            ))}
                                        </select>
                                        <label className="flex items-center gap-2 text-sm text-stone-600">
                                            <input
                                                type="checkbox"
                                                checked={Boolean(
                                                    field.required,
                                                )}
                                                onChange={(event) =>
                                                    setField(index, {
                                                        required:
                                                            event.target
                                                                .checked,
                                                    })
                                                }
                                            />
                                            {t("common.required")}
                                        </label>
                                        <button
                                            type="button"
                                            title={t("forms.removeField")}
                                            className="grid h-10 w-10 place-items-center rounded-md border border-stone-300 text-red-600 hover:bg-red-50"
                                            onClick={() =>
                                                setFields(
                                                    fields.length > 1
                                                        ? fields.filter(
                                                              (_, fieldIndex) =>
                                                                  fieldIndex !==
                                                                  index,
                                                          )
                                                        : [{ ...emptyField }],
                                                )
                                            }
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                    {field.type === "select" && (
                                        <input
                                            className="rounded-md border border-stone-300 px-3 py-2 text-sm"
                                            placeholder={t("forms.options")}
                                            value={String(
                                                field.settings?.options ?? "",
                                            )}
                                            onChange={(event) =>
                                                setField(index, {
                                                    settings: {
                                                        ...(field.settings ??
                                                            {}),
                                                        options:
                                                            event.target.value,
                                                    },
                                                })
                                            }
                                        />
                                    )}
                                </div>
                            ))}
                            <button
                                type="button"
                                className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-stone-300 px-3 py-2 text-sm sm:w-fit"
                                onClick={() =>
                                    setFields([...fields, { ...emptyField }])
                                }
                            >
                                <Plus size={16} />
                                {t("forms.addField")}
                            </button>
                        </div>

                        <div className="grid gap-3 rounded-md border border-stone-200 p-3">
                            <label className="flex items-center gap-2 text-sm font-medium text-stone-700">
                                <input
                                    type="checkbox"
                                    checked={responderEnabled}
                                    onChange={(event) =>
                                        setResponderEnabled(
                                            event.target.checked,
                                        )
                                    }
                                />
                                {t("forms.responderEnabled")}
                            </label>
                            <div className="grid gap-3 lg:grid-cols-2">
                                <select
                                    className="rounded-md border border-stone-300 px-3 py-2 disabled:bg-stone-100"
                                    disabled={!responderEnabled}
                                    value={responderEmailField}
                                    onChange={(event) =>
                                        setResponderEmailField(
                                            event.target.value,
                                        )
                                    }
                                >
                                    <option value="">
                                        {t("forms.emailField")}
                                    </option>
                                    {emailFields.map((field) => (
                                        <option
                                            key={field.key}
                                            value={field.key}
                                        >
                                            {field.label}
                                        </option>
                                    ))}
                                </select>
                                <input
                                    className="rounded-md border border-stone-300 px-3 py-2 disabled:bg-stone-100"
                                    disabled={!responderEnabled}
                                    placeholder={t("forms.responderSubject")}
                                    value={responderSubject}
                                    onChange={(event) =>
                                        setResponderSubject(event.target.value)
                                    }
                                />
                                <textarea
                                    className="min-h-28 rounded-md border border-stone-300 px-3 py-2 disabled:bg-stone-100 lg:col-span-2"
                                    disabled={!responderEnabled}
                                    placeholder={t("forms.responderMessage")}
                                    value={responderMessage}
                                    onChange={(event) =>
                                        setResponderMessage(event.target.value)
                                    }
                                />
                            </div>
                            <input
                                className="rounded-md border border-stone-300 px-3 py-2"
                                placeholder={t("forms.successMessage")}
                                value={successMessage}
                                onChange={(event) =>
                                    setSuccessMessage(event.target.value)
                                }
                            />
                        </div>

                        {error && (
                            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                                {error}
                            </div>
                        )}
                        <button className="w-full rounded-md bg-stone-950 px-4 py-2 text-sm font-semibold text-white sm:w-fit">
                            {editingKey
                                ? t("common.update")
                                : t("common.create")}
                        </button>
                    </form>
                </Panel>
            )}

            <Panel title={t("forms.existing")}>
                <div className="grid gap-3">
                    {forms.map((form) => (
                        <div
                            key={form.id}
                            className="flex flex-col gap-3 rounded-md border border-stone-200 p-4 lg:flex-row lg:items-center lg:justify-between"
                        >
                            <button
                                className="min-w-0 text-left"
                                onClick={() => setSelectedKey(form.key)}
                            >
                                <div className="font-semibold text-stone-950">
                                    {form.name}
                                </div>
                                <div className="text-sm text-stone-500">
                                    /forms/{form.key}/submit -{" "}
                                    {form.fields.length}{" "}
                                    {t("forms.fieldsCount")}
                                </div>
                            </button>
                            <div className="flex flex-wrap gap-2">
                                {admin && (
                                    <button
                                        className="inline-flex items-center gap-2 rounded-md border border-stone-300 px-3 py-2 text-sm"
                                        onClick={() => edit(form)}
                                    >
                                        <Pencil size={16} />
                                        {t("common.edit")}
                                    </button>
                                )}
                                {admin && (
                                    <button
                                        className="inline-flex items-center gap-2 rounded-md border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50"
                                        onClick={() => remove(form.key)}
                                    >
                                        <Trash2 size={16} />
                                        {t("common.delete")}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </Panel>

            <Panel
                title={
                    selected
                        ? `${t("forms.submissions")}: ${selected.name}`
                        : t("forms.submissions")
                }
            >
                {!selected && (
                    <p className="text-sm text-stone-500">
                        {t("forms.noForm")}
                    </p>
                )}
                {selected && (
                    <div className="grid gap-3">
                        <div className="flex min-w-0 items-center gap-2 rounded-md bg-stone-50 px-3 py-2 text-sm text-stone-600">
                            <Mail size={16} />
                            <span className="min-w-0 break-all">
                                {t("forms.publicEndpoint")}: /api/forms/
                                {selected.key}/submit
                            </span>
                        </div>
                        {submissions.map((submission) => (
                            <div
                                key={submission.id}
                                className="grid gap-2 rounded-md border border-stone-200 p-3 text-sm"
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2 text-stone-500">
                                    <span>
                                        {new Date(
                                            submission.createdAt,
                                        ).toLocaleString()}
                                    </span>
                                    <span>
                                        {submission.notificationSent
                                            ? t("forms.notificationSent")
                                            : t(
                                                  "forms.notificationFailed",
                                              )}{" "}
                                        /{" "}
                                        {submission.responseSent
                                            ? t("forms.responseSent")
                                            : t("forms.responseNotSent")}
                                    </span>
                                </div>
                                <pre className="overflow-auto rounded-md bg-stone-50 p-3 text-xs text-stone-700">
                                    {JSON.stringify(submission.data, null, 2)}
                                </pre>
                            </div>
                        ))}
                        {submissions.length === 0 && (
                            <p className="text-sm text-stone-500">
                                {t("forms.noSubmissions")}
                            </p>
                        )}
                    </div>
                )}
            </Panel>
        </div>
    );
}

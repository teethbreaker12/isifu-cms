import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Braces, List, Mail, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { api } from "../api/client";
import { isAdmin } from "../auth";
import { IconButton } from "../components/IconButton";
import { Modal } from "../components/Modal";
import { Panel } from "../components/Panel";
import { SelectField } from "../components/SelectField";
import { useToast } from "../components/Toast";
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

function formatSubmissionValue(value: unknown) {
    if (value === null || value === undefined || value === "") return "—";
    if (typeof value === "boolean") return value ? "true" : "false";
    if (typeof value === "string" || typeof value === "number") return String(value);
    return JSON.stringify(value, null, 2);
}

export function FormsPage() {
    const { notify } = useToast();
    const [forms, setForms] = useState<ContactForm[]>([]);
    const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
    const [selectedKey, setSelectedKey] = useState("");
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [creatingForm, setCreatingForm] = useState(false);
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
    const [deleteKey, setDeleteKey] = useState<string | null>(null);
    const [submissionView, setSubmissionView] = useState<"pretty" | "json">("pretty");
    const admin = isAdmin();
    const selected = forms.find((form) => form.key === selectedKey);
    const isEditing = creatingForm || Boolean(editingKey);
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
            notify(editingKey ? t("forms.updated") : t("forms.created"));
            resetForm();
            await load();
        } catch (caught) {
            const message = caught instanceof Error ? caught.message : "Save failed";
            setError(message);
            notify(message, "error");
        }
    }

    function edit(form: ContactForm) {
        setEditingKey(form.key);
        setCreatingForm(false);
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

    function startCreate() {
        resetForm();
        setCreatingForm(true);
    }

    function resetForm() {
        setEditingKey(null);
        setCreatingForm(false);
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
        try {
            await api.deleteForm(keyToDelete);
            setDeleteKey(null);
            if (editingKey === keyToDelete) resetForm();
            await load();
            notify(t("forms.deleted"));
        } catch (caught) {
            notify(caught instanceof Error ? caught.message : "Delete failed", "error");
        }
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
            <div>
                <h1 className="page-title">{t("forms.title")}</h1>
                <p className="page-subtitle mt-1">{t("forms.subtitle")}</p>
            </div>

            {admin && (
                <Panel
                    title={t("forms.editor")}
                    action={
                        isEditing ? (
                            <button
                                type="button"
                                className="inline-flex items-center gap-2 rounded-md border border-stone-300 px-3 py-2 text-sm"
                                onClick={resetForm}
                            >
                                <X size={16} />
                                {t("common.cancel")}
                            </button>
                        ) : (
                            <button
                                type="button"
                                className="inline-flex items-center gap-2 rounded-md bg-stone-950 px-3 py-2 text-sm font-medium text-white"
                                onClick={startCreate}
                            >
                                <Plus size={16} />
                                {t("forms.create")}
                            </button>
                        )
                    }
                >
                    {!isEditing ? (
                        <p className="text-sm leading-6 text-stone-600">{t("forms.editorHint")}</p>
                    ) : (
                    <form onSubmit={submit} className="grid gap-5">
                        <section className="grid gap-3 rounded-lg border border-stone-200 bg-stone-50/70 p-4">
                            <div>
                                <h3 className="text-sm font-semibold text-stone-950">{t("forms.metaTitle")}</h3>
                                <p className="mt-1 text-xs leading-5 text-stone-500">{t("forms.metaHelp")}</p>
                            </div>
                            <div className="grid gap-3 lg:grid-cols-2">
                                <label className="grid gap-1 text-sm font-medium text-stone-700">
                                    <span>{t("forms.nameLabel")}</span>
                                    <input
                                        className="rounded-md border border-stone-300 px-3 py-2 font-normal"
                                        placeholder={t("forms.name")}
                                        value={name}
                                        onChange={(event) =>
                                            setName(event.target.value)
                                        }
                                    />
                                </label>
                                <label className="grid gap-1 text-sm font-medium text-stone-700">
                                    <span>{t("forms.keyLabel")}</span>
                                    <input
                                        className="rounded-md border border-stone-300 px-3 py-2 font-mono text-sm font-normal disabled:bg-stone-100"
                                        disabled={Boolean(editingKey)}
                                        placeholder={t("forms.key")}
                                        value={key}
                                        onChange={(event) => setKey(event.target.value)}
                                    />
                                </label>
                                <label className="grid gap-1 text-sm font-medium text-stone-700 lg:col-span-2">
                                    <span>{t("forms.descriptionLabel")}</span>
                                    <input
                                        className="rounded-md border border-stone-300 px-3 py-2 font-normal"
                                        placeholder={t("forms.description")}
                                        value={description}
                                        onChange={(event) =>
                                            setDescription(event.target.value)
                                        }
                                    />
                                </label>
                            </div>
                        </section>

                        <section className="grid gap-3 rounded-lg border border-stone-200 bg-stone-50/70 p-4">
                            <div>
                                <h3 className="text-sm font-semibold text-stone-950">{t("forms.deliveryTitle")}</h3>
                                <p className="mt-1 text-xs leading-5 text-stone-500">{t("forms.deliveryHelp")}</p>
                            </div>
                            <div className="grid gap-3 lg:grid-cols-2">
                                <label className="grid gap-1 text-sm font-medium text-stone-700">
                                    <span>{t("forms.recipientEmailLabel")}</span>
                                    <input
                                        className="rounded-md border border-stone-300 px-3 py-2 font-normal"
                                        type="email"
                                        placeholder={t("forms.recipientEmail")}
                                        value={recipientEmail}
                                        onChange={(event) =>
                                            setRecipientEmail(event.target.value)
                                        }
                                    />
                                </label>
                                <label className="grid gap-1 text-sm font-medium text-stone-700">
                                    <span>{t("forms.notificationSubjectLabel")}</span>
                                    <input
                                        className="rounded-md border border-stone-300 px-3 py-2 font-normal"
                                        placeholder={t("forms.notificationSubject")}
                                        value={notificationSubject}
                                        onChange={(event) =>
                                            setNotificationSubject(event.target.value)
                                        }
                                    />
                                </label>
                            </div>
                        </section>

                        <section className="grid gap-3">
                            <div>
                                <h3 className="text-sm font-semibold text-stone-950">{t("forms.fieldsTitle")}</h3>
                                <p className="mt-1 text-xs leading-5 text-stone-500">{t("forms.fieldsHelp")}</p>
                            </div>
                            {fields.map((field, index) => (
                                <div
                                    key={index}
                                    className="grid gap-3 rounded-lg border border-stone-200 bg-stone-50/70 p-4"
                                >
                                    <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_170px_130px_44px]">
                                        <label className="grid gap-1 text-sm font-medium text-stone-700">
                                            <span>{t("forms.fieldLabelLabel")}</span>
                                            <input
                                                className="rounded-md border border-stone-300 px-3 py-2 font-normal"
                                                placeholder={t("forms.fieldLabel")}
                                                value={field.label}
                                                onChange={(event) =>
                                                    setField(index, {
                                                        label: event.target.value,
                                                    })
                                                }
                                            />
                                        </label>
                                        <label className="grid gap-1 text-sm font-medium text-stone-700">
                                            <span>{t("forms.fieldKeyLabel")}</span>
                                            <input
                                                className="rounded-md border border-stone-300 px-3 py-2 font-mono text-sm font-normal"
                                                placeholder={t("forms.fieldKey")}
                                                value={field.key}
                                                onChange={(event) =>
                                                    setField(index, {
                                                        key: event.target.value,
                                                    })
                                                }
                                            />
                                        </label>
                                        <div className="grid gap-1 text-sm font-medium text-stone-700">
                                            <span>{t("forms.fieldTypeLabel")}</span>
                                            <SelectField
                                                value={field.type}
                                                options={fieldTypes.map((type) => ({
                                                    value: type,
                                                    label: t(`formFields.${type}`),
                                                }))}
                                                onChange={(next) =>
                                                    setField(index, {
                                                        type: next as FormFieldType,
                                                    })
                                                }
                                            />
                                        </div>
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
                                        <label className="grid gap-1 text-sm font-medium text-stone-700">
                                            <span>{t("forms.optionsLabel")}</span>
                                            <input
                                                className="rounded-md border border-stone-300 px-3 py-2 text-sm font-normal"
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
                                        </label>
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
                        </section>

                        <section className="grid gap-3 rounded-lg border border-stone-200 bg-stone-50/70 p-4">
                            <div>
                                <h3 className="text-sm font-semibold text-stone-950">{t("forms.responderTitle")}</h3>
                                <p className="mt-1 text-xs leading-5 text-stone-500">{t("forms.responderHelp")}</p>
                            </div>
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
                                <label className="grid gap-1 text-sm font-medium text-stone-700">
                                    <span>{t("forms.emailFieldLabel")}</span>
                                    <SelectField
                                        disabled={!responderEnabled}
                                        value={responderEmailField}
                                        options={[
                                            { value: "", label: t("forms.emailField") },
                                            ...emailFields.map((field) => ({
                                                value: field.key,
                                                label: field.label,
                                            })),
                                        ]}
                                        onChange={setResponderEmailField}
                                    />
                                </label>
                                <label className="grid gap-1 text-sm font-medium text-stone-700">
                                    <span>{t("forms.responderSubjectLabel")}</span>
                                    <input
                                        className="rounded-md border border-stone-300 px-3 py-2 font-normal disabled:bg-stone-100"
                                        disabled={!responderEnabled}
                                        placeholder={t("forms.responderSubject")}
                                        value={responderSubject}
                                        onChange={(event) =>
                                            setResponderSubject(event.target.value)
                                        }
                                    />
                                </label>
                                <label className="grid gap-1 text-sm font-medium text-stone-700 lg:col-span-2">
                                    <span>{t("forms.responderMessageLabel")}</span>
                                    <textarea
                                        className="min-h-28 rounded-md border border-stone-300 px-3 py-2 font-normal leading-6 disabled:bg-stone-100"
                                        disabled={!responderEnabled}
                                        placeholder={t("forms.responderMessage")}
                                        value={responderMessage}
                                        onChange={(event) =>
                                            setResponderMessage(event.target.value)
                                        }
                                    />
                                </label>
                            </div>
                            <label className="grid gap-1 text-sm font-medium text-stone-700">
                                <span>{t("forms.successMessageLabel")}</span>
                                <input
                                    className="rounded-md border border-stone-300 px-3 py-2 font-normal"
                                    placeholder={t("forms.successMessage")}
                                    value={successMessage}
                                    onChange={(event) =>
                                        setSuccessMessage(event.target.value)
                                    }
                                />
                            </label>
                        </section>

                        {error && (
                            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                                {error}
                            </div>
                        )}
                        <div className="flex flex-col-reverse gap-2 border-t border-stone-200 pt-4 sm:flex-row sm:justify-end">
                            <button type="button" className="w-full rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 sm:w-fit" onClick={resetForm}>
                                {t("common.cancel")}
                            </button>
                            <button className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-stone-950 px-4 py-2 text-sm font-semibold text-white sm:w-fit">
                                <Save size={16} />
                                {editingKey
                                    ? t("common.update")
                                    : t("common.create")}
                            </button>
                        </div>
                    </form>
                    )}
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
                                    <IconButton label={t("common.edit")} icon={<Pencil size={16} />} onClick={() => edit(form)} />
                                )}
                                {admin && (
                                    <IconButton label={t("common.delete")} icon={<Trash2 size={16} />} tone="danger" onClick={() => setDeleteKey(form.key)} />
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
                        <div className="flex flex-col gap-3 rounded-lg border border-stone-200 bg-stone-50/70 p-3 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex min-w-0 items-center gap-2 text-sm text-stone-600">
                                <Mail size={16} className="shrink-0" />
                                <span className="min-w-0 break-all">
                                    {t("forms.publicEndpoint")}: /api/forms/
                                    {selected.key}/submit
                                </span>
                            </div>
                            <div className="inline-flex w-full rounded-md border border-stone-200 bg-white p-1 sm:w-fit">
                                <button
                                    type="button"
                                    className={`inline-flex min-h-9 flex-1 items-center justify-center gap-2 rounded px-3 text-sm font-medium sm:flex-none ${
                                        submissionView === "pretty" ? "accent-soft" : "text-stone-600 hover:bg-stone-50"
                                    }`}
                                    onClick={() => setSubmissionView("pretty")}
                                >
                                    <List size={15} />
                                    {t("forms.viewPretty")}
                                </button>
                                <button
                                    type="button"
                                    className={`inline-flex min-h-9 flex-1 items-center justify-center gap-2 rounded px-3 text-sm font-medium sm:flex-none ${
                                        submissionView === "json" ? "accent-soft" : "text-stone-600 hover:bg-stone-50"
                                    }`}
                                    onClick={() => setSubmissionView("json")}
                                >
                                    <Braces size={15} />
                                    JSON
                                </button>
                            </div>
                        </div>
                        {submissions.map((submission) => (
                            <div
                                key={submission.id}
                                className="grid gap-3 rounded-lg border border-stone-200 bg-white p-4 text-sm"
                            >
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="min-w-0">
                                        <div className="font-semibold text-stone-950">
                                            {new Date(
                                                submission.createdAt,
                                            ).toLocaleString()}
                                        </div>
                                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                                            <span className={`inline-flex rounded-md border px-2 py-1 font-semibold ${
                                                submission.notificationSent
                                                    ? "border-[color:var(--app-accent-border)] bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent)]"
                                                    : "border-red-200 bg-red-50 text-red-700"
                                            }`}>
                                                {submission.notificationSent
                                                    ? t("forms.notificationSent")
                                                    : t("forms.notificationFailed")}
                                            </span>
                                            <span className={`inline-flex rounded-md border px-2 py-1 font-semibold ${
                                                submission.responseSent
                                                    ? "border-[color:var(--app-accent-border)] bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent)]"
                                                    : "border-stone-200 bg-stone-50 text-stone-600"
                                            }`}>
                                                {submission.responseSent
                                                    ? t("forms.responseSent")
                                                    : t("forms.responseNotSent")}
                                            </span>
                                        </div>
                                    </div>
                                    {!submission.notificationSent && (
                                        <div className="flex max-w-full items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-800 lg:max-w-sm">
                                            <AlertTriangle size={17} className="mt-0.5 shrink-0" />
                                            <div className="min-w-0">
                                                <div className="font-semibold">{t("forms.smtpAlertTitle")}</div>
                                                <div className="mt-0.5 text-xs leading-5 text-red-700">{t("forms.smtpAlertText")}</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {submissionView === "json" ? (
                                    <pre className="max-h-96 overflow-auto rounded-md bg-stone-50 p-3 text-xs leading-5 text-stone-700">
                                        {JSON.stringify(submission.data, null, 2)}
                                    </pre>
                                ) : (
                                    <dl className="grid overflow-hidden rounded-md border border-stone-200 bg-stone-50/70 sm:grid-cols-[minmax(10rem,16rem)_minmax(0,1fr)]">
                                        {Object.entries(submission.data).map(([fieldKey, value]) => (
                                            <div key={fieldKey} className="contents">
                                                <dt className="border-b border-stone-200 px-3 py-2 font-mono text-xs font-semibold text-stone-500 last:border-b-0 sm:border-r">
                                                    {fieldKey}
                                                </dt>
                                                <dd className="min-w-0 whitespace-pre-wrap border-b border-stone-200 bg-white px-3 py-2 text-stone-800 [overflow-wrap:anywhere] last:border-b-0">
                                                    {formatSubmissionValue(value)}
                                                </dd>
                                            </div>
                                        ))}
                                    </dl>
                                )}
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
            {deleteKey && (
                <Modal
                    title={t("forms.deleteTitle")}
                    description={`/forms/${deleteKey}/submit`}
                    onClose={() => setDeleteKey(null)}
                    footer={
                        <>
                            <button type="button" className="rounded-md border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700" onClick={() => setDeleteKey(null)}>
                                {t("common.cancel")}
                            </button>
                            <button type="button" className="rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50" onClick={() => void remove(deleteKey)}>
                                {t("common.delete")}
                            </button>
                        </>
                    }
                >
                    <p className="text-sm leading-6 text-stone-600">{t("forms.deleteConfirm")}</p>
                </Modal>
            )}
        </div>
    );
}

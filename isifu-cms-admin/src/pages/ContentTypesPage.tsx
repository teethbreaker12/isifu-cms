import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "../api/client";
import { IconButton, InfoTooltip } from "../components/IconButton";
import { Modal } from "../components/Modal";
import { Panel } from "../components/Panel";
import { PublishActions, StatusBadge, StatusSummary } from "../components/PublishControls";
import { SelectField } from "../components/SelectField";
import { useToast } from "../components/Toast";
import { t } from "../i18n";
import type { ContentField, ContentType, FieldType, PublishStatus } from "../types/cms";

const emptyField: ContentField = {
    label: "",
    key: "",
    type: "text",
    required: false,
};
const contentFieldTypes: FieldType[] = [
    "text",
    "textarea",
    "richtext",
    "image",
    "lucideIcon",
    "boolean",
    "date",
    "select",
    "repeater",
];

const configurableFieldTypes = new Set<FieldType>(["image", "select"]);

export function ContentTypesPage() {
    const { notify } = useToast();
    const [items, setItems] = useState<ContentType[]>([]);
    const [name, setName] = useState("");
    const [key, setKey] = useState("");
    const [status, setStatus] = useState<PublishStatus>("draft");
    const [fields, setFields] = useState<ContentField[]>([{ ...emptyField }]);
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [modelModalOpen, setModelModalOpen] = useState(false);
    const [deleteKey, setDeleteKey] = useState<string | null>(null);

    const load = () => api.contentTypes().then(setItems);
    useEffect(() => void load(), []);

    async function save(nextStatus: PublishStatus) {
        setError("");
        try {
            if (editingKey) {
                await api.updateContentType(editingKey, { name, status: nextStatus, fields });
            } else {
                await api.createContentType({ name, key, status: nextStatus, fields });
            }
            resetForm();
            await load();
            notify(nextStatus === "published" ? t("models.published") : t("models.saved"));
        } catch (caught) {
            const message = caught instanceof Error ? caught.message : "Save failed";
            setError(message);
            notify(message, "error");
        }
    }

    function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
        void save(submitter?.value === "publish" ? "published" : "draft");
    }

    function edit(item: ContentType) {
        setEditingKey(item.key);
        setName(item.name);
        setKey(item.key);
        setStatus(item.status ?? "draft");
        setFields(
            item.fields.map(
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
        setModelModalOpen(true);
    }

    function resetForm() {
        setName("");
        setKey("");
        setStatus("draft");
        setFields([{ ...emptyField }]);
        setEditingKey(null);
        setError("");
        setModelModalOpen(false);
    }

    async function remove(keyToDelete: string) {
        try {
            await api.deleteContentType(keyToDelete);
            setDeleteKey(null);
            if (editingKey === keyToDelete) resetForm();
            await load();
            notify(t("models.deleted"));
        } catch (caught) {
            notify(caught instanceof Error ? caught.message : "Delete failed", "error");
        }
    }

    function updateField(index: number, next: Partial<ContentField>) {
        setFields((current) =>
            current.map((field, fieldIndex) =>
                fieldIndex === index ? { ...field, ...next } : field,
            ),
        );
    }

    function changeFieldType(index: number, type: FieldType) {
        updateField(index, {
            type,
            settings: configurableFieldTypes.has(type) ? fields[index]?.settings : undefined,
        });
    }

    function updateFieldSettings(index: number, settings: Record<string, unknown>) {
        updateField(index, {
            settings: {
                ...(fields[index]?.settings ?? {}),
                ...settings,
            },
        });
    }

    return (
        <div className="grid gap-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="page-title">
                    {t("models.title")}
                </h1>
                <button
                    type="button"
                    className="accent-bg inline-flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold sm:w-fit"
                    onClick={() => {
                        resetForm();
                        setModelModalOpen(true);
                    }}
                >
                    <Plus size={16} />
                    {t("models.new")}
                </button>
            </div>
            {modelModalOpen && (
            <Modal
                title={editingKey ? t("models.editor") : t("models.new")}
                description={t("models.modalText")}
                onClose={resetForm}
                size="wide"
            >
                <form onSubmit={submit} className="grid gap-5">
                    <section className="grid gap-3 rounded-lg border border-stone-200 bg-stone-50/70 p-4">
                        <div>
                            <h3 className="text-sm font-semibold text-stone-950">{t("models.basicData")}</h3>
                            <p className="mt-1 text-xs leading-5 text-stone-500">{t("models.basicDataHelp")}</p>
                        </div>
                        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_280px]">
                            <label className="grid gap-1 text-sm font-medium text-stone-700">
                                <span>{t("models.nameLabel")}</span>
                                <input
                                    className="rounded-md border border-stone-300 px-3 py-2 font-normal"
                                    placeholder={t("models.namePlaceholder")}
                                    value={name}
                                    onChange={(event) => setName(event.target.value)}
                                />
                            </label>
                            <label className="grid gap-1 text-sm font-medium text-stone-700">
                                <span>{t("models.keyLabel")}</span>
                                <input
                                    className="rounded-md border border-stone-300 px-3 py-2 font-normal disabled:bg-stone-100"
                                    disabled={Boolean(editingKey)}
                                    placeholder={t("models.keyPlaceholder")}
                                    value={key}
                                    onChange={(event) => setKey(event.target.value)}
                                />
                            </label>
                            <div className="grid gap-1 text-sm font-medium text-stone-700">
                                <span>{t("common.status")}</span>
                                <StatusSummary status={status} />
                            </div>
                        </div>
                    </section>

                    <section className="grid gap-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <h3 className="text-sm font-semibold text-stone-950">{t("models.fieldsTitle")}</h3>
                                <p className="mt-1 text-xs leading-5 text-stone-500">{t("models.fieldsHelp")}</p>
                            </div>
                            <button
                                type="button"
                                className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-stone-300 px-3 py-2 text-sm font-medium sm:w-fit"
                                onClick={() => setFields([...fields, { ...emptyField }])}
                            >
                                <Plus size={16} />
                                {t("models.addField")}
                            </button>
                        </div>

                        <div className="grid gap-3">
                            {fields.map((field, index) => (
                                <div
                                    key={index}
                                    className="grid gap-4 rounded-lg border border-stone-200 bg-white p-4"
                                >
                                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="rounded-md bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-600">
                                                    {t("models.field")} {index + 1}
                                                </span>
                                                <span className="min-w-0 truncate text-sm font-semibold text-stone-950">
                                                    {field.label || t("models.unnamedField")}
                                                </span>
                                                {field.required && (
                                                    <span className="rounded-md border border-stone-200 px-2 py-1 text-xs font-medium text-stone-600">
                                                        {t("common.required")}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="mt-2">
                                                <InfoTooltip label={t(`fields.help.${field.type}`)} />
                                            </div>
                                        </div>
                                        <IconButton
                                            label={t("models.removeField")}
                                            icon={<Trash2 size={16} />}
                                            tone="danger"
                                            className="w-full md:w-10"
                                            onClick={() =>
                                                setFields(
                                                    fields.length > 1
                                                        ? fields.filter((_, i) => i !== index)
                                                    : [{ ...emptyField }],
                                                )
                                            }
                                        />
                                    </div>

                                    <div className="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_220px_150px]">
                                        <label className="grid gap-1 text-sm font-medium text-stone-700">
                                            <span>{t("models.fieldLabel")}</span>
                                            <input
                                                className="rounded-md border border-stone-300 px-3 py-2 font-normal"
                                                placeholder={t("models.fieldLabelPlaceholder")}
                                                value={field.label}
                                                onChange={(event) => updateField(index, { label: event.target.value })}
                                            />
                                        </label>
                                        <label className="grid gap-1 text-sm font-medium text-stone-700">
                                            <span>{t("models.fieldKey")}</span>
                                            <input
                                                className="rounded-md border border-stone-300 px-3 py-2 font-normal"
                                                placeholder={t("models.fieldKeyPlaceholder")}
                                                value={field.key}
                                                onChange={(event) => updateField(index, { key: event.target.value })}
                                            />
                                        </label>
                                        <div className="grid gap-1 text-sm font-medium text-stone-700">
                                            <span>{t("models.fieldType")}</span>
                                            <SelectField
                                                value={field.type}
                                                options={contentFieldTypes.map((type) => ({
                                                    value: type,
                                                    label: t(`fields.${type}`),
                                                }))}
                                                onChange={(next) => changeFieldType(index, next as FieldType)}
                                            />
                                        </div>
                                        <label className="flex min-h-10 items-center gap-2 self-end rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-medium text-stone-700">
                                            <input
                                                type="checkbox"
                                                checked={field.required}
                                                onChange={(event) => updateField(index, { required: event.target.checked })}
                                            />
                                            {t("common.required")}
                                        </label>
                                    </div>

                                    {field.type === "image" && (
                                        <div className="grid gap-3 rounded-md bg-stone-50 p-3 lg:grid-cols-[220px_220px_minmax(0,1fr)]">
                                            <label className="flex min-h-10 items-center gap-2 text-sm font-medium text-stone-700">
                                                <input
                                                    type="checkbox"
                                                    checked={Boolean(field.settings?.multiple)}
                                                    onChange={(event) => updateFieldSettings(index, { multiple: event.target.checked })}
                                                />
                                                {t("models.allowMultipleImages")}
                                            </label>
                                            <label className="grid gap-1 text-sm font-medium text-stone-700">
                                                <span>{t("models.maxImages")}</span>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    className="rounded-md border border-stone-300 px-3 py-2 font-normal"
                                                    value={String(field.settings?.maxItems ?? "")}
                                                    onChange={(event) =>
                                                        updateFieldSettings(index, {
                                                            maxItems: Number(event.target.value) || undefined,
                                                        })
                                                    }
                                                />
                                            </label>
                                            <p className="self-end text-xs leading-5 text-stone-500">{t("models.imageSettingsHelp")}</p>
                                        </div>
                                    )}

                                    {field.type === "select" && (
                                        <div className="grid gap-2 rounded-md bg-stone-50 p-3">
                                            <label className="grid gap-1 text-sm font-medium text-stone-700">
                                                <span>{t("models.selectOptionsLabel")}</span>
                                                <textarea
                                                    className="min-h-28 rounded-md border border-stone-300 px-3 py-2 font-mono text-xs font-normal leading-5"
                                                    placeholder={t("models.options")}
                                                    value={String(field.settings?.options ?? "")}
                                                    onChange={(event) => updateFieldSettings(index, { options: event.target.value })}
                                                />
                                            </label>
                                            <p className="text-xs leading-5 text-stone-500">{t("models.selectOptionsHelp")}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>

                    {error && (
                        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                            {error}
                        </div>
                    )}
                    <PublishActions status={status} onCancel={resetForm} />
                </form>
            </Modal>
            )}
            <Panel title={t("models.existing")}>
                <div className="grid gap-3">
                    {items.map((item) => (
                        <div
                            key={item.id}
                            className="flex flex-col gap-3 rounded-md border border-stone-200 p-4 md:flex-row md:items-center md:justify-between"
                        >
                            <div>
                                <div className="font-semibold text-stone-950">
                                    {item.name}
                                </div>
                                <div className="text-sm text-stone-500">
                                    /{item.key} - {item.fields.length} fields
                                </div>
                                <div className="mt-2">
                                    <StatusBadge status={item.status ?? "draft"} />
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <IconButton
                                    label={t("common.edit")}
                                    icon={<Pencil size={16} />}
                                    onClick={() => edit(item)}
                                />
                                <IconButton
                                    label={t("common.delete")}
                                    icon={<Trash2 size={16} />}
                                    tone="danger"
                                    onClick={() => setDeleteKey(item.key)}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </Panel>
            {deleteKey && (
                <Modal
                    title={t("models.deleteTitle")}
                    description={`/${deleteKey}`}
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
                    <p className="text-sm leading-6 text-stone-600">{t("models.deleteConfirm")}</p>
                </Modal>
            )}
        </div>
    );
}

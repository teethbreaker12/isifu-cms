import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "../api/client";
import { Modal } from "../components/Modal";
import { Panel } from "../components/Panel";
import { useToast } from "../components/Toast";
import { t } from "../i18n";
import type { ContentField, ContentType, FieldType } from "../types/cms";

const emptyField: ContentField = {
    label: "",
    key: "",
    type: "text",
    required: false,
};

export function ContentTypesPage() {
    const { notify } = useToast();
    const [items, setItems] = useState<ContentType[]>([]);
    const [name, setName] = useState("");
    const [key, setKey] = useState("");
    const [fields, setFields] = useState<ContentField[]>([{ ...emptyField }]);
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [modelModalOpen, setModelModalOpen] = useState(false);
    const [deleteKey, setDeleteKey] = useState<string | null>(null);

    const load = () => api.contentTypes().then(setItems);
    useEffect(() => void load(), []);

    async function submit(event: React.FormEvent) {
        event.preventDefault();
        setError("");
        try {
            if (editingKey) {
                await api.updateContentType(editingKey, { name, fields });
            } else {
                await api.createContentType({ name, key, fields });
            }
            resetForm();
            await load();
            notify(editingKey ? t("models.updated") : t("models.created"));
        } catch (caught) {
            const message = caught instanceof Error ? caught.message : "Save failed";
            setError(message);
            notify(message, "error");
        }
    }

    function edit(item: ContentType) {
        setEditingKey(item.key);
        setName(item.name);
        setKey(item.key);
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
            >
                <form onSubmit={submit} className="grid gap-4">
                    <div className="grid gap-3 lg:grid-cols-2">
                        <input
                            className="rounded-md border border-stone-300 px-3 py-2"
                            placeholder={t("models.namePlaceholder")}
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                        />
                        <input
                            className="rounded-md border border-stone-300 px-3 py-2 disabled:bg-stone-100"
                            disabled={Boolean(editingKey)}
                            placeholder={t("models.keyPlaceholder")}
                            value={key}
                            onChange={(event) => setKey(event.target.value)}
                        />
                    </div>
                    {fields.map((field, index) => (
                        <div
                            key={index}
                            className="grid gap-3 rounded-md border border-stone-200 p-3"
                        >
                            <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_160px_110px_44px]">
                                <input
                                    className="rounded-md border border-stone-300 px-3 py-2"
                                    placeholder={t(
                                        "models.fieldLabelPlaceholder",
                                    )}
                                    value={field.label}
                                    onChange={(event) =>
                                        setFields(
                                            fields.map((item, i) =>
                                                i === index
                                                    ? {
                                                          ...item,
                                                          label: event.target
                                                              .value,
                                                      }
                                                    : item,
                                            ),
                                        )
                                    }
                                />
                                <input
                                    className="rounded-md border border-stone-300 px-3 py-2"
                                    placeholder={t(
                                        "models.fieldKeyPlaceholder",
                                    )}
                                    value={field.key}
                                    onChange={(event) =>
                                        setFields(
                                            fields.map((item, i) =>
                                                i === index
                                                    ? {
                                                          ...item,
                                                          key: event.target
                                                              .value,
                                                      }
                                                    : item,
                                            ),
                                        )
                                    }
                                />
                                <select
                                    className="rounded-md border border-stone-300 px-3 py-2"
                                    value={field.type}
                                    onChange={(event) =>
                                        setFields(
                                            fields.map((item, i) =>
                                                i === index
                                                    ? {
                                                          ...item,
                                                          type: event.target
                                                              .value as FieldType,
                                                          settings:
                                                              event.target
                                                                  .value ===
                                                              "image"
                                                                  ? item.settings
                                                                  : undefined,
                                                      }
                                                    : item,
                                            ),
                                        )
                                    }
                                >
                                    {(
                                        [
                                            "text",
                                            "textarea",
                                            "richtext",
                                            "image",
                                            "lucideIcon",
                                            "boolean",
                                            "date",
                                            "repeater",
                                        ] as FieldType[]
                                    ).map((type) => (
                                        <option key={type} value={type}>
                                            {t(`fields.${type}`)}
                                        </option>
                                    ))}
                                </select>
                                <label className="flex items-center gap-2 text-sm text-stone-600">
                                    <input
                                        type="checkbox"
                                        checked={field.required}
                                        onChange={(event) =>
                                            setFields(
                                                fields.map((item, i) =>
                                                    i === index
                                                        ? {
                                                              ...item,
                                                              required:
                                                                  event.target
                                                                      .checked,
                                                          }
                                                        : item,
                                                ),
                                            )
                                        }
                                    />
                                    {t("common.required")}
                                </label>
                                <button
                                    type="button"
                                    title={t("models.removeField")}
                                    className="grid h-10 w-10 place-items-center rounded-md border border-stone-300 text-red-600 hover:bg-red-50"
                                    onClick={() =>
                                        setFields(
                                            fields.length > 1
                                                ? fields.filter(
                                                      (_, i) => i !== index,
                                                  )
                                                : [{ ...emptyField }],
                                        )
                                    }
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            {field.type === "image" && (
                                <div className="grid gap-2 rounded-md bg-stone-50 p-3 lg:grid-cols-[180px_160px]">
                                    <label className="flex items-center gap-2 text-sm text-stone-600">
                                        <input
                                            type="checkbox"
                                            checked={Boolean(
                                                field.settings?.multiple,
                                            )}
                                            onChange={(event) =>
                                                setFields(
                                                    fields.map((item, i) =>
                                                        i === index
                                                            ? {
                                                                  ...item,
                                                                  settings: {
                                                                      ...(item.settings ??
                                                                          {}),
                                                                      multiple:
                                                                          event
                                                                              .target
                                                                              .checked,
                                                                  },
                                                              }
                                                            : item,
                                                    ),
                                                )
                                            }
                                        />
                                        {t("models.allowMultipleImages")}
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        className="rounded-md border border-stone-300 px-3 py-2 text-sm"
                                        placeholder={t("models.maxImages")}
                                        value={String(
                                            field.settings?.maxItems ?? "",
                                        )}
                                        onChange={(event) =>
                                            setFields(
                                                fields.map((item, i) =>
                                                    i === index
                                                        ? {
                                                              ...item,
                                                              settings: {
                                                                  ...(item.settings ??
                                                                      {}),
                                                                  maxItems:
                                                                      Number(
                                                                          event
                                                                              .target
                                                                              .value,
                                                                      ) ||
                                                                      undefined,
                                                              },
                                                          }
                                                        : item,
                                                ),
                                            )
                                        }
                                    />
                                </div>
                            )}
                        </div>
                    ))}
                    {error && (
                        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                            {error}
                        </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-md border border-stone-300 px-3 py-2 text-sm"
                            onClick={() =>
                                setFields([...fields, { ...emptyField }])
                            }
                        >
                            <Plus size={16} />
                            {t("models.addField")}
                        </button>
                        <button className="rounded-md bg-stone-950 px-4 py-2 text-sm font-semibold text-white">
                            {editingKey
                                ? t("common.update")
                                : t("common.create")}
                        </button>
                    </div>
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
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    className="inline-flex items-center gap-2 rounded-md border border-stone-300 px-3 py-2 text-sm"
                                    onClick={() => edit(item)}
                                >
                                    <Pencil size={16} />
                                    {t("common.edit")}
                                </button>
                                <button
                                    className="inline-flex items-center gap-2 rounded-md border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50"
                                    onClick={() => setDeleteKey(item.key)}
                                >
                                    <Trash2 size={16} />
                                    {t("common.delete")}
                                </button>
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

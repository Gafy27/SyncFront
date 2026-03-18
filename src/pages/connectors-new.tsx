import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft, Search, Plus, X, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { bridges as bridgesApi, API_BASE_URL, getAuthToken } from "@/lib/api";
import { useOrganization } from "@/providers/organization-provider";
import { getConnectorIconUrl } from "@/utils/connectorIcons";

type TopicEntry = { name: string; decoder: string };
type FieldValue = string | number | boolean | TopicEntry[];

interface ConnectorVariable {
  name: string;
  type: string;
  label: string;
  required?: boolean;
  default?: any;
}

interface ConnectorTemplate {
  id: string;
  name: string;
  slug: string;
  type?: string;
  version?: string;
  is_active?: boolean;
  icon?: string | null;
  variables: ConnectorVariable[];
  description?: string | null;
}

function getInputType(variable: ConnectorVariable): string {
  if (variable.type === "integer" || variable.type === "number" || variable.type === "port") return "number";
  if (
    variable.type === "password" ||
    variable.type === "secret" ||
    variable.name.toLowerCase().includes("password") ||
    variable.name.toLowerCase().includes("token")
  )
    return "password";
  return "text";
}

function TopicsEditor({
  topics,
  onChange,
}: {
  topics: TopicEntry[];
  onChange: (topics: TopicEntry[]) => void;
}) {
  const addTopic = () => onChange([...topics, { name: "", decoder: "" }]);
  const removeTopic = (i: number) =>
    onChange(topics.filter((_, idx) => idx !== i));
  const updateTopic = (i: number, field: "name" | "decoder", value: string) =>
    onChange(topics.map((t, idx) => (idx === i ? { ...t, [field]: value } : t)));

  return (
    <div className="space-y-2">
      {topics.map((topic, i) => (
        <div key={i} className="flex gap-2 items-center">
          <Input
            value={topic.name}
            onChange={(e) => updateTopic(i, "name", e.target.value)}
            placeholder="topic name"
            className="font-mono text-sm flex-1"
          />
          <Input
            value={topic.decoder}
            onChange={(e) => updateTopic(i, "decoder", e.target.value)}
            placeholder="decoder path"
            className="font-mono text-sm flex-1"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => removeTopic(i)}
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addTopic}>
        <Plus className="w-3 h-3 mr-1" />
        Agregar topic
      </Button>
    </div>
  );
}

function VariableFields({
  variables,
  values,
  onChange,
  placeholder,
}: {
  variables: ConnectorVariable[];
  values: Record<string, FieldValue>;
  onChange: (key: string, value: FieldValue) => void;
  placeholder?: string;
}) {
  if (!variables || variables.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay variables configurables.</p>;
  }
  return (
    <div className="space-y-4">
      {variables.map((v) => {
        const label =
          v.label || v.name.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

        if (v.type === "array") {
          const topics = Array.isArray(values[v.name])
            ? (values[v.name] as TopicEntry[])
            : [];
          return (
            <div key={v.name} className="space-y-2">
              <Label>
                {label}
                {v.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              <div className="flex gap-2 mb-1 text-xs text-muted-foreground font-medium px-0.5">
                <span className="flex-1">Topic name</span>
                <span className="flex-1">Decoder</span>
                <span className="w-8" />
              </div>
              <TopicsEditor topics={topics} onChange={(val) => onChange(v.name, val)} />
            </div>
          );
        }

        if (v.type === "boolean") {
          const checked = values[v.name] === true || values[v.name] === "true";
          return (
            <div key={v.name} className="flex items-center gap-3">
              <Switch
                id={`field-${v.name}`}
                checked={checked}
                onCheckedChange={(val) => onChange(v.name, val)}
              />
              <Label htmlFor={`field-${v.name}`} className="cursor-pointer">
                {label}
                {v.required && <span className="text-destructive ml-1">*</span>}
              </Label>
            </div>
          );
        }

        const inputType = getInputType(v);
        return (
          <div key={v.name} className="space-y-2">
            <Label htmlFor={`field-${v.name}`}>
              {label}
              {v.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={`field-${v.name}`}
              type={inputType}
              value={typeof values[v.name] === "string" || typeof values[v.name] === "number" ? String(values[v.name]) : ""}
              onChange={(e) => onChange(v.name, e.target.value)}
              placeholder={placeholder ?? (v.default != null ? String(v.default) : "")}
            />
          </div>
        );
      })}
    </div>
  );
}

export default function NewBridge() {
  const [, setLocation] = useLocation();
  const [, paramsSelect] = useRoute<{ templateId: string }>("/bridges/new/:templateId");
  const { toast } = useToast();
  const { selectedOrg } = useOrganization();

  // Step 1: template selection
  const [searchQuery, setSearchQuery] = useState("");

  // Step 2: form state
  const [name, setName] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [baseFields, setBaseFields] = useState<Record<string, FieldValue>>({});
  const [variantEnvs, setVariantEnvs] = useState<string[]>(["dev", "prod"]);
  const [variantFields, setVariantFields] = useState<Record<string, Record<string, FieldValue>>>({
    dev: {},
    prod: {},
  });
  const [activeTab, setActiveTab] = useState("base");
  const [newEnvName, setNewEnvName] = useState("");
  const [showAddEnv, setShowAddEnv] = useState(false);

  const templateId = paramsSelect?.templateId;

  const { data: connectorTemplates = [], isLoading } = useQuery<ConnectorTemplate[]>({
    queryKey: ["/api/connector-templates"],
    queryFn: async () => {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE_URL}/api/connector-templates`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to fetch connector templates");
      const data = await res.json();
      if (Array.isArray(data)) return data;
      if (data?.items && Array.isArray(data.items)) return data.items;
      return [];
    },
  });

  const filteredTemplates = useMemo(() => {
    const nonDrivers = connectorTemplates.filter(
      (t) => t.type?.toUpperCase() !== "DRIVER" && t.type?.toUpperCase() !== "SELECT"
    );
    if (!searchQuery.trim()) return nonDrivers;
    const query = searchQuery.toLowerCase();
    return nonDrivers.filter(
      (t) =>
        t.name?.toLowerCase().includes(query) ||
        t.slug?.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query)
    );
  }, [connectorTemplates, searchQuery]);

  const selectedTemplate: ConnectorTemplate | undefined = templateId
    ? connectorTemplates.find((tpl) => tpl.id === templateId)
    : undefined;

  useEffect(() => {
    if (selectedTemplate) {
      setName("");
      setIsDefault(false);
      setBaseFields({});
      setVariantEnvs(["dev", "prod"]);
      setVariantFields({ dev: {}, prod: {} });
      setActiveTab("base");
    }
  }, [selectedTemplate?.id]);

  const createBridgeMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      if (!selectedOrg) throw new Error("Organization ID is required");
      return bridgesApi.create(selectedOrg, data);
    },
    onSuccess: () => {
      toast({ title: "Bridge creado", description: "El bridge se ha creado exitosamente." });
      queryClient.invalidateQueries({ queryKey: ["organizations", selectedOrg, "bridges"] });
      setLocation("/bridges");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el bridge.",
        variant: "destructive",
      });
    },
  });

  const handleTemplateSelect = (id: string) => {
    setLocation(`/bridges/new/${id}`);
  };

  const handleBaseChange = (key: string, value: FieldValue) => {
    setBaseFields((prev) => ({ ...prev, [key]: value }));
  };

  const handleVariantChange = (env: string, key: string, value: FieldValue) => {
    setVariantFields((prev) => ({
      ...prev,
      [env]: { ...(prev[env] ?? {}), [key]: value },
    }));
  };

  const handleAddEnv = () => {
    const env = newEnvName.trim().toLowerCase();
    if (!env || variantEnvs.includes(env)) return;
    setVariantEnvs((prev) => [...prev, env]);
    setVariantFields((prev) => ({ ...prev, [env]: {} }));
    setNewEnvName("");
    setShowAddEnv(false);
    setActiveTab(env);
  };

  const handleRemoveEnv = (env: string) => {
    setVariantEnvs((prev) => prev.filter((e) => e !== env));
    setVariantFields((prev) => {
      const next = { ...prev };
      delete next[env];
      return next;
    });
    if (activeTab === env) setActiveTab("base");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate || !selectedOrg) return;

    // Strip empty values (keep booleans and non-empty strings/arrays)
    const isEmpty = (v: FieldValue) =>
      Array.isArray(v) ? v.length === 0 : typeof v === "boolean" ? false : v === "";

    const base: Record<string, any> = {};
    Object.entries(baseFields).forEach(([k, v]) => {
      if (!isEmpty(v)) base[k] = v;
    });

    const variants: Record<string, Record<string, any>> = {};
    variantEnvs.forEach((env) => {
      const envFields: Record<string, any> = {};
      Object.entries(variantFields[env] ?? {}).forEach(([k, v]) => {
        if (!isEmpty(v)) envFields[k] = v;
      });
      if (Object.keys(envFields).length > 0) {
        variants[env] = envFields;
      }
    });

    createBridgeMutation.mutate({
      name: name || selectedTemplate.name,
      type: selectedTemplate.slug,
      template_id: templateId,
      is_default: isDefault,
      is_enabled: true,
      base,
      variants,
    });
  };

  // ── Configuration form ──────────────────────────────────────────────────────
  if (templateId && selectedTemplate) {
    return (
      <div className="p-10 max-w-3xl">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => setLocation("/bridges/new")} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a conectores
          </Button>
          <h1 className="text-3xl font-semibold mb-1">Configurar Bridge</h1>
          <p className="text-muted-foreground">
            {selectedTemplate.name}
            {selectedTemplate.slug && (
              <span className="ml-1 text-xs">({selectedTemplate.slug})</span>
            )}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name + default */}
          <Card>
            <CardHeader>
              <CardTitle>General</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bridge-name">Nombre del Bridge *</Label>
                <Input
                  id="bridge-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ej: emqx, main, analytics"
                  className="font-mono"
                  required
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="is-default"
                  checked={isDefault}
                  onCheckedChange={setIsDefault}
                />
                <Label htmlFor="is-default" className="flex items-center gap-2 cursor-pointer">
                  <Star className="w-4 h-4 text-yellow-500" />
                  Marcar como default
                  <span className="text-xs text-muted-foreground font-normal">
                    — Syncore usará este bridge como fuente de verdad para su tipo
                  </span>
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Base + Variants tabs */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Configuración</CardTitle>
                <div className="flex items-center gap-2">
                  {showAddEnv ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={newEnvName}
                        onChange={(e) => setNewEnvName(e.target.value)}
                        placeholder="nombre env"
                        className="h-8 w-32 text-sm font-mono"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { e.preventDefault(); handleAddEnv(); }
                          if (e.key === "Escape") { setShowAddEnv(false); setNewEnvName(""); }
                        }}
                        autoFocus
                      />
                      <Button type="button" size="sm" variant="outline" onClick={handleAddEnv}>
                        Agregar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => { setShowAddEnv(false); setNewEnvName(""); }}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setShowAddEnv(true)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Variante
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Los campos de <strong>Base</strong> son comunes a todos los entornos. Los campos de
                cada variante sobreescriben la base para ese entorno.
              </p>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4 flex-wrap h-auto gap-1">
                  <TabsTrigger value="base">Base</TabsTrigger>
                  {variantEnvs.map((env) => (
                    <div key={env} className="flex items-center">
                      <TabsTrigger value={env} className="capitalize pr-1">
                        {env}
                      </TabsTrigger>
                      {variantEnvs.length > 1 && (
                        <button
                          type="button"
                          className="ml-0.5 text-muted-foreground hover:text-destructive transition-colors"
                          onClick={() => handleRemoveEnv(env)}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </TabsList>

                <TabsContent value="base">
                  <VariableFields
                    variables={selectedTemplate.variables}
                    values={baseFields}
                    onChange={handleBaseChange}
                    placeholder="valor común a todos los entornos"
                  />
                </TabsContent>

                {variantEnvs.map((env) => (
                  <TabsContent key={env} value={env}>
                    <div className="mb-3">
                      <Badge variant="outline" className="capitalize text-xs">{env}</Badge>
                      <span className="text-xs text-muted-foreground ml-2">
                        Solo completa los campos que difieren de la base para este entorno.
                      </span>
                    </div>
                    <VariableFields
                      variables={selectedTemplate.variables}
                      values={variantFields[env] ?? {}}
                      onChange={(k, v) => handleVariantChange(env, k, v)}
                      placeholder="dejar vacío para usar el valor base"
                    />
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button type="submit" disabled={createBridgeMutation.isPending}>
              {createBridgeMutation.isPending ? "Creando..." : "Crear Bridge"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setLocation("/bridges/new")}>
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    );
  }

  // ── Template selection ──────────────────────────────────────────────────────
  return (
    <div className="p-10">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => setLocation("/bridges")} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a Bridges
        </Button>
        <h1 className="text-3xl font-semibold mb-2">Nuevo Bridge</h1>
        <p className="text-muted-foreground">Selecciona un conector base para configurar</p>
      </div>

      {isLoading ? (
        <div className="text-center py-10">Cargando conectores...</div>
      ) : (
        <>
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar conectores..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredTemplates.map((template) => (
              <Card
                key={template.id}
                className="hover-elevate cursor-pointer"
                onClick={() => handleTemplateSelect(template.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-6">
                    <div className="w-24 h-24 flex items-center justify-center bg-gray-100 dark:bg-gray-100 rounded-lg flex-shrink-0">
                      <img
                        src={
                          template.icon?.startsWith("http")
                            ? template.icon
                            : getConnectorIconUrl(template.name, template.slug)
                        }
                        alt={template.name}
                        className="w-20 h-20 object-contain"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                          const fallback = target.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = "flex";
                        }}
                      />
                      <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center text-base font-semibold hidden">
                        {template.name.slice(0, 2).toUpperCase()}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base truncate">{template.name}</h3>
                      <span className="text-xs text-muted-foreground">{template.slug}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {filteredTemplates.length === 0 && searchQuery && (
            <div className="text-center py-10 text-muted-foreground">
              No se encontraron conectores para "{searchQuery}"
            </div>
          )}
        </>
      )}
    </div>
  );
}

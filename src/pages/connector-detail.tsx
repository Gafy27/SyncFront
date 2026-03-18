import { useRoute, useLocation } from "wouter";
import { ArrowLeft, Plus, X, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { bridges as bridgesApi } from "@/lib/api";
import { useState, useEffect } from "react";
import { useOrganization } from "@/providers/organization-provider";
import type { Bridge } from "@/lib/types";

type TopicEntry = { name: string; decoder: string };

function isTopicsArray(val: unknown): val is TopicEntry[] {
  return (
    Array.isArray(val) &&
    val.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        ("name" in item || "decoder" in item)
    )
  );
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

function FieldsEditor({
  fields,
  onChange,
}: {
  fields: Record<string, unknown>;
  onChange: (fields: Record<string, unknown>) => void;
}) {
  const update = (key: string, value: unknown) =>
    onChange({ ...fields, [key]: value });

  return (
    <div className="space-y-4">
      {Object.entries(fields).map(([key, value]) => {
        const label = key
          .replace(/_/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase());

        if (isTopicsArray(value)) {
          return (
            <div key={key} className="space-y-2">
              <Label>{label}</Label>
              <div className="flex gap-2 mb-1 text-xs text-muted-foreground font-medium px-0.5">
                <span className="flex-1">Topic name</span>
                <span className="flex-1">Decoder</span>
                <span className="w-8" />
              </div>
              <TopicsEditor
                topics={value}
                onChange={(v) => update(key, v)}
              />
            </div>
          );
        }

        return (
          <div key={key} className="space-y-2">
            <Label htmlFor={`field-${key}`}>{label}</Label>
            <Input
              id={`field-${key}`}
              value={value != null ? String(value) : ""}
              onChange={(e) => {
                const raw = e.target.value;
                const asNum = Number(raw);
                update(key, typeof value === "number" && !isNaN(asNum) ? asNum : raw);
              }}
              type={
                key.toLowerCase().includes("password") ||
                key.toLowerCase().includes("token")
                  ? "password"
                  : typeof value === "number"
                  ? "number"
                  : "text"
              }
              className="font-mono"
            />
          </div>
        );
      })}
      {Object.keys(fields).length === 0 && (
        <p className="text-sm text-muted-foreground">
          No hay campos configurados.
        </p>
      )}
    </div>
  );
}

export default function BridgeDetail() {
  const [, params] = useRoute<{ bridgeId: string }>("/bridges/:bridgeId");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { selectedOrg } = useOrganization();

  const bridgeId = params?.bridgeId;

  const [bridgeName, setBridgeName] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [baseFields, setBaseFields] = useState<Record<string, unknown>>({});
  const [variantEnvs, setVariantEnvs] = useState<string[]>([]);
  const [variantFields, setVariantFields] = useState<
    Record<string, Record<string, unknown>>
  >({});
  const [activeTab, setActiveTab] = useState("base");
  const [newEnvName, setNewEnvName] = useState("");
  const [showAddEnv, setShowAddEnv] = useState(false);

  const {
    data: bridge,
    isLoading,
    error,
  } = useQuery<Bridge>({
    queryKey: ["organizations", selectedOrg, "bridges", bridgeId],
    queryFn: () => bridgesApi.get(selectedOrg!, bridgeId!),
    enabled: !!selectedOrg && !!bridgeId,
  });

  useEffect(() => {
    if (bridge) {
      setBridgeName(bridge.name);
      setIsDefault(bridge.is_default ?? false);
      setBaseFields((bridge.base as Record<string, unknown>) ?? {});
      const envs = Object.keys(bridge.variants ?? {});
      setVariantEnvs(envs);
      setVariantFields(
        (bridge.variants as Record<string, Record<string, unknown>>) ?? {}
      );
    }
  }, [bridge]);

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Bridge>) =>
      bridgesApi.update(selectedOrg!, bridgeId!, data),
    onSuccess: () => {
      toast({ title: "Bridge actualizado" });
      queryClient.invalidateQueries({
        queryKey: ["organizations", selectedOrg, "bridges", bridgeId],
      });
      queryClient.invalidateQueries({
        queryKey: ["organizations", selectedOrg, "bridges"],
      });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

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
    if (!bridge) return;

    const variants: Record<string, Record<string, unknown>> = {};
    variantEnvs.forEach((env) => {
      if (variantFields[env] && Object.keys(variantFields[env]).length > 0) {
        variants[env] = variantFields[env];
      }
    });

    updateMutation.mutate({
      name: bridgeName,
      is_default: isDefault,
      base: baseFields,
      variants,
    });
  };

  if (isLoading) {
    return <div className="p-10 text-center">Cargando bridge...</div>;
  }

  if (error || !bridge) {
    return (
      <div className="p-10 text-center">
        <p className="text-destructive">Error al cargar el bridge</p>
        <Button onClick={() => setLocation("/bridges")} className="mt-4">
          Volver a Bridges
        </Button>
      </div>
    );
  }

  return (
    <div className="p-10 max-w-3xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => setLocation("/bridges")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a Bridges
        </Button>
        <h1 className="text-3xl font-semibold mb-2">Editar Bridge</h1>
        <p className="text-muted-foreground">
          {bridge.name}
          {bridge.type ? ` — ${bridge.type}` : ""}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* General */}
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bridge-name">Nombre del Bridge *</Label>
              <Input
                id="bridge-name"
                value={bridgeName}
                onChange={(e) => setBridgeName(e.target.value)}
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
              <Label
                htmlFor="is-default"
                className="flex items-center gap-2 cursor-pointer"
              >
                <Star className="w-4 h-4 text-yellow-500" />
                Marcar como default
                <span className="text-xs text-muted-foreground font-normal">
                  — Syncore usará este bridge como fuente de verdad para su tipo
                </span>
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Base + Variants */}
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
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddEnv();
                        }
                        if (e.key === "Escape") {
                          setShowAddEnv(false);
                          setNewEnvName("");
                        }
                      }}
                      autoFocus
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleAddEnv}
                    >
                      Agregar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setShowAddEnv(false);
                        setNewEnvName("");
                      }}
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
              Los campos de <strong>Base</strong> son comunes a todos los
              entornos. Los campos de cada variante sobreescriben la base para
              ese entorno.
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
                <FieldsEditor fields={baseFields} onChange={setBaseFields} />
              </TabsContent>

              {variantEnvs.map((env) => (
                <TabsContent key={env} value={env}>
                  <div className="mb-3">
                    <Badge variant="outline" className="capitalize text-xs">
                      {env}
                    </Badge>
                    <span className="text-xs text-muted-foreground ml-2">
                      Solo completa los campos que difieren de la base para
                      este entorno.
                    </span>
                  </div>
                  <FieldsEditor
                    fields={variantFields[env] ?? {}}
                    onChange={(f) =>
                      setVariantFields((prev) => ({ ...prev, [env]: f }))
                    }
                  />
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Guardando..." : "Guardar Cambios"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setLocation("/bridges")}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}

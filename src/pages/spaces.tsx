import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOrganization } from "@/providers/organization-provider";
import { spaces as spacesApi } from "@/lib/api";
import type { Space, SQLExample } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, Trash2, BrainCircuit, Code2, Save, Settings } from "lucide-react";

// ─── SQL Example row ──────────────────────────────────────────────────────────

function SQLExampleRow({
  example,
  index,
  onChange,
  onRemove,
}: {
  example: SQLExample;
  index: number;
  onChange: (i: number, field: keyof SQLExample, value: string) => void;
  onRemove: (i: number) => void;
}) {
  return (
    <div className="rounded-lg border border-border/50 bg-card/40 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Example {index + 1}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-destructive"
          onClick={() => onRemove(index)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Description</Label>
        <Input
          value={example.description}
          onChange={(e) => onChange(index, "description", e.target.value)}
          placeholder="What does this query do?"
          className="h-8 text-sm"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">SQL</Label>
        <Textarea
          value={example.sql}
          onChange={(e) => onChange(index, "sql", e.target.value)}
          placeholder="SELECT ..."
          className="font-mono text-xs min-h-[80px] resize-y"
        />
      </div>
    </div>
  );
}

// ─── Space editor ─────────────────────────────────────────────────────────────

function SpaceEditor({
  space,
  orgId,
  onSaved,
}: {
  space: Space;
  orgId: string;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [name, setName] = useState(space.name);
  const [description, setDescription] = useState(space.description ?? "");
  const [instructions, setInstructions] = useState(space.instructions);
  const [sqlExamples, setSqlExamples] = useState<SQLExample[]>(space.sql_examples ?? []);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset when space changes
  useEffect(() => {
    setName(space.name);
    setDescription(space.description ?? "");
    setInstructions(space.instructions);
    setSqlExamples(space.sql_examples ?? []);
    setSaveStatus("idle");
  }, [space.id]);

  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof spacesApi.update>[2]) =>
      spacesApi.update(orgId, space.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations", orgId, "spaces"] });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
      onSaved();
    },
    onError: (err: Error) => {
      setSaveStatus("idle");
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const save = () => {
    setSaveStatus("saving");
    updateMutation.mutate({ name, description: description || undefined, instructions, sql_examples: sqlExamples });
  };

  const scheduleAutoSave = () => {
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(save, 1500);
  };

  const handleExampleChange = (i: number, field: keyof SQLExample, value: string) => {
    setSqlExamples((prev) => prev.map((ex, idx) => idx === i ? { ...ex, [field]: value } : ex));
    scheduleAutoSave();
  };

  const addExample = () => {
    setSqlExamples((prev) => [...prev, { description: "", sql: "" }]);
  };

  const removeExample = (i: number) => {
    setSqlExamples((prev) => prev.filter((_, idx) => idx !== i));
    scheduleAutoSave();
  };

  return (
    <Tabs defaultValue="config" className="flex flex-col h-full overflow-hidden">
      {/* Tab bar + save status */}
      <div className="border-b border-border bg-card/30 px-4 flex items-center justify-between shrink-0">
        <TabsList className="bg-transparent h-12">
          <TabsTrigger value="config" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-none h-12 border-b-2 border-transparent data-[state=active]:border-primary px-6">
            <Settings className="h-4 w-4 mr-2" /> Configuration
          </TabsTrigger>
          <TabsTrigger value="instructions" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-none h-12 border-b-2 border-transparent data-[state=active]:border-primary px-6">
            <BrainCircuit className="h-4 w-4 mr-2" /> Instructions
          </TabsTrigger>
          <TabsTrigger value="sql" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-none h-12 border-b-2 border-transparent data-[state=active]:border-primary px-6">
            <Code2 className="h-4 w-4 mr-2" /> SQL Examples
          </TabsTrigger>
        </TabsList>
        <div className="flex items-center gap-2">
          {saveStatus === "saving" && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Saving...
            </span>
          )}
          {saveStatus === "saved" && <span className="text-xs text-green-500">Saved</span>}
          <Button size="sm" variant="outline" onClick={save} disabled={saveStatus === "saving"} className="h-7 text-xs gap-1.5">
            <Save className="h-3.5 w-3.5" /> Save
          </Button>
        </div>
      </div>

      {/* Configuration tab */}
      <TabsContent value="config" className="flex-1 m-0 overflow-auto">
        <div className="max-w-2xl px-6 py-6 space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="space-name">Name</Label>
            <Input
              id="space-name"
              value={name}
              onChange={(e) => { setName(e.target.value); scheduleAutoSave(); }}
              placeholder="e.g. Production DB"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="space-desc">Description</Label>
            <Input
              id="space-desc"
              value={description}
              onChange={(e) => { setDescription(e.target.value); scheduleAutoSave(); }}
              placeholder="Optional description"
            />
          </div>
        </div>
      </TabsContent>

      {/* Instructions tab */}
      <TabsContent value="instructions" className="flex-1 m-0 overflow-hidden">
        <div className="h-full flex flex-col px-6 py-4 gap-2">
          <p className="text-xs text-muted-foreground shrink-0">
            Domain context injected into the agent's system prompt when this space is active.
          </p>
          <Textarea
            value={instructions}
            onChange={(e) => { setInstructions(e.target.value); scheduleAutoSave(); }}
            placeholder="Describe the data model, conventions, and domain knowledge the agent should know..."
            className="flex-1 resize-none text-sm leading-relaxed font-mono"
          />
        </div>
      </TabsContent>

      {/* SQL Examples tab */}
      <TabsContent value="sql" className="flex-1 m-0 overflow-auto">
        <div className="px-6 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Reference queries shown to the agent to help it generate correct SQL.
            </p>
            <Button variant="outline" size="sm" onClick={addExample} className="h-7 text-xs gap-1.5 shrink-0">
              <Plus className="h-3.5 w-3.5" /> Add example
            </Button>
          </div>
          {sqlExamples.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/60 py-16 text-center">
              <Code2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground/20" />
              <p className="text-xs text-muted-foreground/60">No SQL examples yet. Add one to guide the agent.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sqlExamples.map((ex, i) => (
                <SQLExampleRow
                  key={i}
                  example={ex}
                  index={i}
                  onChange={handleExampleChange}
                  onRemove={removeExample}
                />
              ))}
            </div>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SpacesPage() {
  const { selectedOrg } = useOrganization();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["organizations", selectedOrg, "spaces"],
    queryFn: () => spacesApi.list(selectedOrg!),
    enabled: !!selectedOrg,
  });

  const spacesList = data?.items ?? [];

  const selectedSpace = spacesList.find((s) => s.id === selectedId) ?? null;

  // Auto-select first space
  useEffect(() => {
    if (!selectedId && spacesList.length > 0) setSelectedId(spacesList[0].id);
  }, [spacesList, selectedId]);

  const createMutation = useMutation({
    mutationFn: (name: string) =>
      spacesApi.create(selectedOrg!, { name, instructions: "", sql_examples: [] }),
    onSuccess: (space) => {
      queryClient.invalidateQueries({ queryKey: ["organizations", selectedOrg, "spaces"] });
      setSelectedId(space.id);
      setNewName("");
      setIsCreating(false);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => spacesApi.delete(selectedOrg!, id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["organizations", selectedOrg, "spaces"] });
      if (selectedId === id) setSelectedId(null);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const handleCreate = () => {
    if (!newName.trim()) return;
    createMutation.mutate(newName.trim());
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card/30 flex flex-col shrink-0">
        <div className="p-4 border-b border-border/50">
          <h1 className="font-semibold text-base">Agent Spaces</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Context spaces for agent sessions</p>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/40" />
            </div>
          ) : spacesList.length === 0 && !isCreating ? (
            <p className="px-3 py-4 text-xs text-muted-foreground/50 text-center">No spaces yet</p>
          ) : (
            spacesList.map((s) => (
              <div
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className={`group flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-colors text-sm ${
                  selectedId === s.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <BrainCircuit className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                  <span className="truncate">{s.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 opacity-0 group-hover:opacity-100 hover:text-destructive shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete space "${s.name}"?`)) deleteMutation.mutate(s.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))
          )}
        </div>

        {/* Create */}
        <div className="p-3 border-t border-border/50">
          {isCreating ? (
            <div className="space-y-2">
              <Input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                  if (e.key === "Escape") setIsCreating(false);
                }}
                placeholder="Space name..."
                className="h-8 text-sm"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleCreate} disabled={createMutation.isPending} className="flex-1 h-7 text-xs">
                  {createMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Create"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setIsCreating(false)} className="h-7 text-xs">
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs gap-1.5"
              onClick={() => setIsCreating(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              New Space
            </Button>
          )}
        </div>
      </aside>

      {/* Editor area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {selectedSpace ? (
          <SpaceEditor
            key={selectedSpace.id}
            space={selectedSpace}
            orgId={selectedOrg!}
            onSaved={() => queryClient.invalidateQueries({ queryKey: ["organizations", selectedOrg, "spaces"] })}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
            <BrainCircuit className="h-12 w-12 opacity-20" />
            <p className="text-sm">Select a space or create a new one</p>
          </div>
        )}
      </main>
    </div>
  );
}

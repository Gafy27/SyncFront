import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ReactFlow,
    Node,
    Edge,
    Background,
    Controls,
    useNodesState,
    useEdgesState,
    MarkerType,
    Position,
    Handle,
    type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { Database, Cpu, Zap, Code2 } from 'lucide-react';
import { cn } from "@/lib/utils";

function hslVarToHex(varName: string): string {
    if (typeof document === 'undefined') return '#94a3b8';
    const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    if (!value) return '#94a3b8';
    const el = document.createElement('div');
    el.style.cssText = `position:absolute;visibility:hidden;background:hsl(${value})`;
    document.body.appendChild(el);
    const rgb = getComputedStyle(el).backgroundColor;
    document.body.removeChild(el);
    const m = rgb.match(/[\d.]+/g);
    if (m && m.length >= 3) {
        const r = Math.round(Number(m[0])).toString(16).padStart(2, '0');
        const g = Math.round(Number(m[1])).toString(16).padStart(2, '0');
        const b = Math.round(Number(m[2])).toString(16).padStart(2, '0');
        return `#${r}${g}${b}`;
    }
    return '#94a3b8';
}

function TableNode({ data, selected }: NodeProps) {
    const d = data as { label?: string; isSelected?: boolean; type?: string; memory?: boolean; publish?: boolean };
    const active = selected || d.isSelected;
    // const isFunction = d.type === 'function' || !!d.type; // Simple check for now - removed as per instruction

    return (
        <div className="relative group">
            <Handle
                type="target"
                position={Position.Left}
                className="!w-2.5 !h-2.5 !border-2 !bg-[#d1d5db] !border-[#d1d5db] !-left-1.25"
            />
            <div
                className="rounded-lg min-w-[200px] border transition-all duration-200 shadow-sm overflow-hidden"
                style={{
                    background: active ? 'hsl(var(--card))' : 'hsl(var(--card))',
                    borderColor: active ? 'hsl(var(--primary))' : 'hsl(var(--border))',
                    boxShadow: active ? '0 0 0 1px hsl(var(--primary))' : 'none',
                }}
            >
                {/* Header */}
                <div className={cn(
                    "px-3 py-2 flex items-center gap-2 border-b",
                    active ? "bg-primary/5 border-primary/20" : "bg-muted/30 border-border/50"
                )}>
                    {d.memory ? (
                        <Zap className={cn("w-3.5 h-3.5", active ? "text-primary" : "text-muted-foreground")} />
                    ) : (
                        <Database className={cn("w-3.5 h-3.5", active ? "text-primary" : "text-muted-foreground")} />
                    )}
                    <span className={cn(
                        "text-xs font-semibold truncate",
                        active ? "text-primary" : "text-foreground"
                    )}>
                        {d.label ?? 'Untitled'}
                    </span>
                </div>

                {/* Body */}
                <div className="px-3 py-2 flex flex-col gap-1.5 bg-card">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Type</span>
                        <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded text-foreground/80">{d.type ?? 'SQL'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Status</span>
                        <div className="flex items-center gap-1.5">
                            {d.publish !== false ? (
                                <>
                                    <span className="text-[10px] text-foreground/70">Published</span>
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                                </>
                            ) : (
                                <>
                                    <span className="text-[10px] text-foreground/50">Draft</span>
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500/50" />
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <Handle
                type="source"
                position={Position.Right}
                className="!w-2.5 !h-2.5 !border-2 !bg-[#d1d5db] !border-[#d1d5db] !-right-1.25"
            />
        </div>
    );
}

const nodeTypes = { tableNode: TableNode } as const;

function escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Helper to layout elements using dagre
const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    const nodeWidth = 220;
    const nodeHeight = 85;

    dagreGraph.setGraph({ rankdir: 'LR', nodesep: 50, ranksep: 100 }); // Left to Right layout

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const layoutedNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        return {
            ...node,
            position: {
                x: nodeWithPosition.x - nodeWidth / 2,
                y: nodeWithPosition.y - nodeHeight / 2,
            },
        };
    });

    return { nodes: layoutedNodes, edges };
};

interface TableForGraph {
    id: string;
    name?: string;
    definition?: string;
    type?: string;
    memory?: boolean;
    publish?: boolean;
    function?: { definition?: string; type?: string };
}

function getSqlDefinition(t: TableForGraph): string {
    return t.definition ?? t.function?.definition ?? '';
}

interface DependencyGraphProps {
    tables: TableForGraph[];
    onNodeClick: (tableId: string) => void;
    selectedTableId?: string;
}

export function DependencyGraph({ tables, onNodeClick, selectedTableId }: DependencyGraphProps) {
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const [accentColor, setAccentColor] = useState(() => hslVarToHex('--border'));

    // Parse SQL to find table references (FROM, JOIN, table names in definitions)
    const dependencies = useMemo(() => {
        const deps: { source: string; target: string }[] = [];
        const seen = new Set<string>();

        tables.forEach(targetTable => {
            const sql = getSqlDefinition(targetTable).toLowerCase();
            if (!sql) return;

            tables.forEach(sourceTable => {
                if (sourceTable.id === targetTable.id) return;

                const sourceName = (sourceTable.name ?? '').toLowerCase().replace(/\s+/g, '');
                if (!sourceName) return;

                const key = `${sourceTable.id}-${targetTable.id}`;
                if (seen.has(key)) return;

                const regex = new RegExp(`\\b${escapeRegex(sourceName)}\\b`, 'i');
                if (regex.test(sql)) {
                    seen.add(key);
                    deps.push({ source: sourceTable.id, target: targetTable.id });
                }
            });
        });
        return deps;
    }, [tables]);

    const [gridColor, setGridColor] = useState(() => hslVarToHex('--border'));

    useEffect(() => {
        const sync = () => {
            const c = hslVarToHex('--border');
            setGridColor(c);
            setAccentColor(c);
        };
        sync();
        const observer = new MutationObserver(sync);
        observer.observe(document.documentElement, { attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const selected = selectedTableId != null ? String(selectedTableId) : undefined;
        const initialNodes: Node[] = tables.map((t) => {
            const tid = String(t.id);
            const isSelected = selected !== undefined && tid === selected;
            return {
                id: tid,
                type: 'tableNode',
                data: {
                    label: t.name,
                    isSelected: isSelected,
                    type: t.function?.type ?? t.type ?? 'SQL',
                    memory: t.memory,
                    publish: t.publish
                },
                position: { x: 0, y: 0 },
                sourcePosition: Position.Right,
                targetPosition: Position.Left,
            };
        });

        const initialEdges: Edge[] = dependencies.map((dep) => ({
            id: `e${dep.source}-${dep.target}`,
            source: String(dep.source),
            target: String(dep.target),
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed, color: accentColor },
            style: { stroke: accentColor, strokeWidth: 1.5 },
        }));

        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
            initialNodes,
            initialEdges
        );

        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
    }, [tables, dependencies, selectedTableId, accentColor, setNodes, setEdges]);

    const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
        onNodeClick(node.id);
    }, [onNodeClick]);

    return (
        <div className="h-full w-full bg-background rounded-lg border border-border overflow-hidden relative">
            <style>
                {`
                .react-flow__controls {
                    display: flex;
                    flex-direction: column;
                    gap: 1px;
                    border: 1px solid hsl(var(--border));
                    border-radius: 6px;
                    overflow: hidden;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                    background: hsl(var(--border) / 0.2);
                }
                .react-flow__controls-button {
                    background: hsl(var(--card)) !important;
                    border: none !important;
                    border-bottom: 1px solid hsl(var(--border) / 0.5) !important;
                    color: hsl(var(--foreground)) !important;
                    fill: hsl(var(--foreground)) !important;
                    transition: all 0.2s;
                    width: 28px !important;
                    height: 28px !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                }
                .react-flow__controls-button:last-child {
                    border-bottom: none !important;
                }
                .react-flow__controls-button:hover {
                    background: hsl(var(--accent)) !important;
                }
                .react-flow__controls-button svg {
                    width: 12px !important;
                    height: 12px !important;
                    fill: currentColor !important;
                }
                `}
            </style>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={handleNodeClick}
                fitView
                className="bg-background"
            >
                <Background gap={16} size={1} color={gridColor} />
                <Controls showInteractive={false} className="!bg-transparent !border-none !shadow-none !m-4" />
            </ReactFlow>
        </div>
    );
}

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
    const d = data as { label?: string; isSelected?: boolean };
    const active = selected || d.isSelected;
    return (
        <>
            <Handle type="target" position={Position.Left} className="!w-2 !h-2 !border-2 !bg-card" />
            <div
                className="px-3 py-2 text-sm rounded-md min-w-[160px] text-center"
                style={{
                    background: active ? 'hsl(var(--primary))' : 'hsl(var(--card))',
                    color: active ? 'hsl(var(--primary-foreground))' : 'hsl(var(--card-foreground))',
                    border: active ? '2px solid hsl(var(--primary))' : '1px solid hsl(var(--border))',
                    fontWeight: active ? 'bold' : 'normal',
                }}
            >
                {d.label ?? ''}
            </div>
            <Handle type="source" position={Position.Right} className="!w-2 !h-2 !border-2 !bg-card" />
        </>
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

    const nodeWidth = 200;
    const nodeHeight = 60;

    dagreGraph.setGraph({ rankdir: 'LR' }); // Left to Right layout

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
    function?: { definition?: string };
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
                data: { label: t.name, isSelected: isSelected },
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
                <Controls className="fill-foreground bg-card border-border" />
            </ReactFlow>
        </div>
    );
}

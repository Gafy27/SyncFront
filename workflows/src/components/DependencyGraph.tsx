import { useCallback, useEffect, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import { Table } from '@shared/schema';

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

interface DependencyGraphProps {
  tables: Table[];
  onNodeClick: (tableId: number) => void;
  selectedTableId?: number;
}

export function DependencyGraph({ tables, onNodeClick, selectedTableId }: DependencyGraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Parse SQL to find dependencies
  // NOTE: This is a simplistic regex-based parser for demonstration.
  // Real-world SQL parsing requires a proper parser.
  const dependencies = useMemo(() => {
    const deps: { source: number; target: number }[] = [];
    const tableNames = new Map(tables.map(t => [t.name.toLowerCase(), t.id]));

    tables.forEach(targetTable => {
      const sql = targetTable.definition.toLowerCase();
      // Simple regex to find "FROM tablename" or "JOIN tablename"
      // This is not robust but works for basic visualization
      tables.forEach(sourceTable => {
        if (sourceTable.id === targetTable.id) return; // Ignore self-reference for now
        
        const sourceName = sourceTable.name.toLowerCase();
        // Check if sourceName appears in targetTable's SQL definition
        // We look for whole word matches to avoid partial matches
        const regex = new RegExp(`\\b${sourceName}\\b`, 'i');
        
        if (regex.test(sql)) {
          deps.push({ source: sourceTable.id, target: targetTable.id });
        }
      });
    });
    return deps;
  }, [tables]);

  useEffect(() => {
    const initialNodes: Node[] = tables.map((t) => ({
      id: t.id.toString(),
      data: { label: t.name },
      position: { x: 0, y: 0 },
      style: { 
        background: t.id === selectedTableId ? 'hsl(var(--primary))' : 'hsl(var(--card))',
        color: t.id === selectedTableId ? 'hsl(var(--primary-foreground))' : 'hsl(var(--card-foreground))',
        border: t.id === selectedTableId ? '2px solid hsl(var(--primary))' : '1px solid hsl(var(--border))',
        width: 180,
        fontWeight: t.id === selectedTableId ? 'bold' : 'normal',
      },
    }));

    const initialEdges: Edge[] = dependencies.map((dep, idx) => ({
      id: `e${dep.source}-${dep.target}`,
      source: dep.source.toString(),
      target: dep.target.toString(),
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
      style: { stroke: '#94a3b8', strokeWidth: 1.5 },
    }));

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      initialNodes,
      initialEdges
    );

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [tables, dependencies, selectedTableId, setNodes, setEdges]);

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    onNodeClick(parseInt(node.id));
  }, [onNodeClick]);

  return (
    <div className="h-full w-full bg-background/50 rounded-lg border border-border overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        fitView
        className="bg-zinc-950"
      >
        <Background gap={16} size={1} color="#334155" />
        <Controls className="fill-foreground bg-card border-border" />
      </ReactFlow>
    </div>
  );
}

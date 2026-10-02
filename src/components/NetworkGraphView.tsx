import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Play,
  Pause,
  Download,
  Filter,
  Maximize2,
  Info,
  Layers,
  Search,
  Sliders,
} from 'lucide-react';
import { SubgraphData, GraphNode, GraphEdge, MuleLayer } from '../types/forensics';
import { formatINR, maskAccount } from '../utils/bankLookup';

interface NetworkGraphViewProps {
  subgraph: SubgraphData | null;
  onSelectNode: (account: string) => void;
  selectedAccountId: string | null;
  maskAccounts: boolean;
}

interface SimNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export const NetworkGraphView: React.FC<NetworkGraphViewProps> = ({
  subgraph,
  onSelectNode,
  selectedAccountId,
  maskAccounts,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Simulation state
  const nodesRef = useRef<SimNode[]>([]);
  const edgesRef = useRef<GraphEdge[]>([]);
  const animFrameRef = useRef<number | null>(null);

  // Transform / Camera
  const [transform, setTransform] = useState<{ x: number; y: number; k: number }>({ x: 0, y: 0, k: 1 });
  const transformRef = useRef<{ x: number; y: number; k: number }>({ x: 0, y: 0, k: 1 });
  transformRef.current = transform;

  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [hoveredNode, setHoveredNode] = useState<SimNode | null>(null);
  const [isDraggingNode, setIsDraggingNode] = useState<boolean>(false);
  const draggedNodeRef = useRef<SimNode | null>(null);
  const isPanningRef = useRef<boolean>(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Filter state
  const [minAmountFilter, setMinAmountFilter] = useState<number>(0);
  const [selectedLayerFilter, setSelectedLayerFilter] = useState<string>('ALL');
  const [searchAccountQuery, setSearchAccountQuery] = useState<string>('');
  const [isolateSelected, setIsolateSelected] = useState<boolean>(false);

  // Pulse particles for animated fund flow
  const particlesRef = useRef<{ edgeIndex: number; progress: number; speed: number }[]>([]);

  // Node Layer Color Palette (Cyber Forensics SOC Theme)
  const getNodeColor = (layer: MuleLayer, isSelected: boolean) => {
    if (isSelected) return '#ffffff';
    switch (layer) {
      case 'Victim':
        return '#00f0ff'; // Neon Cyan
      case 'Potential L1 Collector':
        return '#f59e0b'; // Amber Gold
      case 'Potential L2 Distributor':
        return '#a855f7'; // Purple
      case 'Potential L3 Terminal':
        return '#ef4444'; // Red
      default:
        return '#10b981'; // Emerald
    }
  };

  // Initialize or update nodes when subgraph changes
  useEffect(() => {
    if (!subgraph || subgraph.nodes.length === 0) return;

    const width = containerRef.current?.clientWidth || 900;
    const height = containerRef.current?.clientHeight || 600;

    // Center coordinates
    const cx = width / 2;
    const cy = height / 2;

    // Distribute nodes in concentric layer rings based on hop level
    const newSimNodes: SimNode[] = subgraph.nodes.map((node, idx) => {
      const hop = node.hopLevel;
      const radiusDist = hop === 0 ? 0 : hop * 140 + (idx % 3) * 30;
      const angle = (idx * 2.4) + (hop * 1.2);
      
      const x = hop === 0 ? cx : cx + Math.cos(angle) * radiusDist + (Math.random() - 0.5) * 40;
      const y = hop === 0 ? cy : cy + Math.sin(angle) * radiusDist + (Math.random() - 0.5) * 40;

      const nodeRadius = hop === 0 ? 24 : node.layer === 'Potential L3 Terminal' ? 18 : 14;

      return {
        ...node,
        x,
        y,
        vx: 0,
        vy: 0,
        radius: nodeRadius,
      };
    });

    nodesRef.current = newSimNodes;
    edgesRef.current = subgraph.edges;

    // Initialize flow particles along edges
    particlesRef.current = subgraph.edges.map((_, i) => ({
      edgeIndex: i,
      progress: (i * 0.17) % 1,
      speed: 0.006 + Math.random() * 0.008,
    }));

    // Reset camera centered
    setTransform({ x: 0, y: 0, k: 1 });
    setIsSimulating(true);
  }, [subgraph]);

  // Main Canvas Render & Force Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let iteration = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Cyber Grid Background Pattern
      ctx.save();
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.6)';
      ctx.lineWidth = 1;
      const gridSize = 40 * transformRef.current.k;
      const offsetX = transformRef.current.x % gridSize;
      const offsetY = transformRef.current.y % gridSize;

      ctx.beginPath();
      for (let x = offsetX; x < width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = offsetY; y < height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();
      ctx.restore();

      // Apply transform matrix
      ctx.save();
      ctx.translate(transformRef.current.x, transformRef.current.y);
      ctx.scale(transformRef.current.k, transformRef.current.k);

      const nodes = nodesRef.current;
      const edges = edgesRef.current;
      const nodeMap = new Map<string, SimNode>();
      for (const n of nodes) nodeMap.set(n.id, n);

      // Force Physics Step (if running and not paused)
      if (isSimulating && iteration < 400) {
        iteration++;
        const kRepel = 2400;
        const kSpring = 0.04;
        const damping = 0.88;

        // Repulsion between nodes
        for (let i = 0; i < nodes.length; i++) {
          const n1 = nodes[i];
          if (n1 === draggedNodeRef.current) continue;

          for (let j = i + 1; j < nodes.length; j++) {
            const n2 = nodes[j];
            const dx = n2.x - n1.x;
            const dy = n2.y - n1.y;
            const distSq = dx * dx + dy * dy + 1;
            const dist = Math.sqrt(distSq);

            if (dist < 400) {
              const f = kRepel / distSq;
              const fx = (dx / dist) * f;
              const fy = (dy / dist) * f;

              n1.vx -= fx;
              n1.vy -= fy;
              n2.vx += fx;
              n2.vy += fy;
            }
          }
        }

        // Spring attraction along edges
        for (const edge of edges) {
          const s = nodeMap.get(edge.source);
          const t = nodeMap.get(edge.target);
          if (!s || !t) continue;

          const dx = t.x - s.x;
          const dy = t.y - s.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const desiredDist = 130;
          const f = (dist - desiredDist) * kSpring;
          const fx = (dx / dist) * f;
          const fy = (dy / dist) * f;

          if (s !== draggedNodeRef.current && !s.isVictim) {
            s.vx += fx;
            s.vy += fy;
          }
          if (t !== draggedNodeRef.current) {
            t.vx -= fx;
            t.vy -= fy;
          }
        }

        // Center gravity towards canvas center
        const cx = (width / 2);
        const cy = (height / 2);
        for (const n of nodes) {
          if (n === draggedNodeRef.current) continue;
          if (n.isVictim) {
            // Keep victim near center
            n.x += (cx - n.x) * 0.05;
            n.y += (cy - n.y) * 0.05;
            continue;
          }
          n.vx += (cx - n.x) * 0.0015;
          n.vy += (cy - n.y) * 0.0015;

          n.vx *= damping;
          n.vy *= damping;
          n.x += n.vx;
          n.y += n.vy;
        }
      }

      // Filter check helper
      const isNodeVisible = (node: SimNode) => {
        if (selectedLayerFilter !== 'ALL' && node.layer !== selectedLayerFilter) return false;
        if (searchAccountQuery.trim() && !node.id.toLowerCase().includes(searchAccountQuery.toLowerCase())) return false;
        if (isolateSelected && selectedAccountId) {
          if (node.id === selectedAccountId) return true;
          // check if connected
          const connected = edges.some(e => 
            (e.source === selectedAccountId && e.target === node.id) ||
            (e.target === selectedAccountId && e.source === node.id)
          );
          if (!connected) return false;
        }
        return true;
      };

      // 1. Draw Edges
      for (let i = 0; i < edges.length; i++) {
        const edge = edges[i];
        if (edge.amount < minAmountFilter) continue;
        const s = nodeMap.get(edge.source);
        const t = nodeMap.get(edge.target);
        if (!s || !t) continue;
        if (!isNodeVisible(s) || !isNodeVisible(t)) continue;

        const isHighlighted =
          selectedAccountId === edge.source ||
          selectedAccountId === edge.target ||
          (hoveredNode && (hoveredNode.id === edge.source || hoveredNode.id === edge.target));

        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);

        if (isHighlighted) {
          ctx.strokeStyle = 'rgba(0, 240, 255, 0.85)';
          ctx.lineWidth = 2.5;
        } else {
          ctx.strokeStyle = 'rgba(71, 85, 105, 0.45)';
          ctx.lineWidth = 1.2;
        }
        ctx.stroke();

        // Draw directional arrow on edge
        const dx = t.x - s.x;
        const dy = t.y - s.y;
        const angle = Math.atan2(dy, dx);
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Arrow placed at 75% along the path
        const arrowDist = dist - t.radius - 8;
        const arrowX = s.x + Math.cos(angle) * arrowDist;
        const arrowY = s.y + Math.sin(angle) * arrowDist;
        const arrowHead = 7;

        ctx.beginPath();
        ctx.fillStyle = isHighlighted ? '#00f0ff' : 'rgba(100, 116, 139, 0.7)';
        ctx.moveTo(arrowX, arrowY);
        ctx.lineTo(
          arrowX - arrowHead * Math.cos(angle - Math.PI / 6),
          arrowY - arrowHead * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          arrowX - arrowHead * Math.cos(angle + Math.PI / 6),
          arrowY - arrowHead * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
      }

      // 2. Animate Stolen Fund Flow Particles along edges
      for (const p of particlesRef.current) {
        p.progress += p.speed;
        if (p.progress > 1) p.progress = 0;

        const edge = edges[p.edgeIndex];
        if (!edge || edge.amount < minAmountFilter) continue;
        const s = nodeMap.get(edge.source);
        const t = nodeMap.get(edge.target);
        if (!s || !t || !isNodeVisible(s) || !isNodeVisible(t)) continue;

        const px = s.x + (t.x - s.x) * p.progress;
        const py = s.y + (t.y - s.y) * p.progress;

        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#00f0ff';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      }

      // 3. Draw Nodes
      for (const node of nodes) {
        if (!isNodeVisible(node)) continue;

        const isSelected = selectedAccountId === node.id;
        const isHovered = hoveredNode?.id === node.id;
        const baseColor = getNodeColor(node.layer, isSelected);

        // Radiant halo for high-risk / victim nodes
        if (isSelected || node.isVictim || node.riskScore >= 70) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + (isSelected ? 8 : 5), 0, Math.PI * 2);
          ctx.fillStyle = node.isVictim
            ? 'rgba(0, 240, 255, 0.25)'
            : node.riskScore >= 70
              ? 'rgba(239, 68, 68, 0.25)'
              : 'rgba(245, 158, 11, 0.2)';
          ctx.fill();
        }

        // Main node circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#09101d';
        ctx.fill();
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.strokeStyle = baseColor;
        ctx.stroke();

        // Node Inner Icon / Core
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * 0.45, 0, Math.PI * 2);
        ctx.fillStyle = baseColor;
        ctx.fill();

        // Text Label below node
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillStyle = isSelected ? '#ffffff' : '#94a3b8';
        ctx.textAlign = 'center';
        const displayLabel = maskAccount(node.id, !maskAccounts);
        ctx.fillText(displayLabel, node.x, node.y + node.radius + 14);

        // Hop / Risk tag
        if (transformRef.current.k >= 0.7) {
          ctx.font = '9px "JetBrains Mono", monospace';
          ctx.fillStyle = node.riskScore >= 70 ? '#f87171' : '#38bdf8';
          const subText = node.isVictim ? 'VICTIM' : `L${node.hopLevel} • ${node.riskScore}`;
          ctx.fillText(subText, node.x, node.y + node.radius + 25);
        }
      }

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isSimulating, selectedAccountId, hoveredNode, minAmountFilter, selectedLayerFilter, searchAccountQuery, isolateSelected, maskAccounts]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current || !containerRef.current) return;
      canvasRef.current.width = containerRef.current.clientWidth;
      canvasRef.current.height = containerRef.current.clientHeight;
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Mouse Interaction Handlers (Pan, Zoom, Drag, Click)
  const getCanvasMousePos = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const getSimPos = (mousePos: { x: number; y: number }) => {
    return {
      x: (mousePos.x - transformRef.current.x) / transformRef.current.k,
      y: (mousePos.y - transformRef.current.y) / transformRef.current.k,
    };
  };

  const findNodeAtPos = (simPos: { x: number; y: number }) => {
    for (let i = nodesRef.current.length - 1; i >= 0; i--) {
      const n = nodesRef.current[i];
      const dx = n.x - simPos.x;
      const dy = n.y - simPos.y;
      if (dx * dx + dy * dy <= (n.radius + 6) * (n.radius + 6)) {
        return n;
      }
    }
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const mousePos = getCanvasMousePos(e);
    const simPos = getSimPos(mousePos);
    const clickedNode = findNodeAtPos(simPos);

    if (clickedNode) {
      draggedNodeRef.current = clickedNode;
      setIsDraggingNode(true);
      onSelectNode(clickedNode.id);
    } else {
      isPanningRef.current = true;
      lastMousePosRef.current = mousePos;
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const mousePos = getCanvasMousePos(e);
    const simPos = getSimPos(mousePos);

    if (isDraggingNode && draggedNodeRef.current) {
      draggedNodeRef.current.x = simPos.x;
      draggedNodeRef.current.y = simPos.y;
      draggedNodeRef.current.vx = 0;
      draggedNodeRef.current.vy = 0;
    } else if (isPanningRef.current) {
      const dx = mousePos.x - lastMousePosRef.current.x;
      const dy = mousePos.y - lastMousePosRef.current.y;
      setTransform((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
      lastMousePosRef.current = mousePos;
    } else {
      const hit = findNodeAtPos(simPos);
      setHoveredNode(hit);
    }
  };

  const handleMouseUp = () => {
    setIsDraggingNode(false);
    draggedNodeRef.current = null;
    isPanningRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const mousePos = getCanvasMousePos(e);
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    const newK = Math.max(0.2, Math.min(4, transformRef.current.k * zoomFactor));

    setTransform((prev) => ({
      k: newK,
      x: mousePos.x - (mousePos.x - prev.x) * (newK / prev.k),
      y: mousePos.y - (mousePos.y - prev.y) * (newK / prev.k),
    }));
  };

  const handleZoom = (direction: 'in' | 'out') => {
    const factor = direction === 'in' ? 1.25 : 0.8;
    const width = canvasRef.current?.width || 800;
    const height = canvasRef.current?.height || 600;
    const cx = width / 2;
    const cy = height / 2;
    const newK = Math.max(0.2, Math.min(4, transform.k * factor));

    setTransform((prev) => ({
      k: newK,
      x: cx - (cx - prev.x) * (newK / prev.k),
      y: cy - (cy - prev.y) * (newK / prev.k),
    }));
  };

  const handleResetFit = () => {
    setTransform({ x: 0, y: 0, k: 1 });
  };

  const handleExportPNG = () => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `investigation_graph_${subgraph?.victimAccount || 'network'}_${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="space-y-3 flex flex-col h-[calc(100vh-140px)] min-h-[650px]">
      {/* Top Toolbar Controls */}
      <div className="bg-[#0a101b] border border-slate-800 rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
        {/* Left: Search & Filter */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <input
              type="text"
              placeholder="Search Account in Graph..."
              value={searchAccountQuery}
              onChange={(e) => setSearchAccountQuery(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-cyan-200 placeholder-slate-400 focus:outline-none focus:border-cyan-500 w-48"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1.5" />
          </div>

          <div className="flex items-center space-x-1.5 pl-2 border-l border-slate-800">
            <span className="text-slate-400 text-[11px]">LAYER:</span>
            <select
              value={selectedLayerFilter}
              onChange={(e) => setSelectedLayerFilter(e.target.value)}
              className="bg-slate-900 text-slate-200 text-xs rounded border border-slate-700 px-2 py-1 outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Layers</option>
              <option value="Victim">Victim Root</option>
              <option value="Potential L1 Collector">L1 Collectors</option>
              <option value="Potential L2 Distributor">L2 Distributors</option>
              <option value="Potential L3 Terminal">L3 Terminals</option>
            </select>
          </div>

          <div className="flex items-center space-x-1.5 pl-2 border-l border-slate-800">
            <button
              onClick={() => setIsolateSelected(!isolateSelected)}
              className={`px-2.5 py-1 rounded text-xs border transition-all ${
                isolateSelected
                  ? 'bg-cyan-950 text-cyan-300 border-cyan-500 font-bold'
                  : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
            >
              {isolateSelected ? 'Sub-Graph Isolated' : 'Isolate 1-Hop'}
            </button>
          </div>
        </div>

        {/* Right: Simulation & Zoom Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsSimulating(!isSimulating)}
            title={isSimulating ? 'Pause physics layout' : 'Resume physics layout'}
            className={`p-1.5 rounded border ${
              isSimulating ? 'bg-cyan-950/60 text-cyan-300 border-cyan-700' : 'bg-slate-900 text-slate-400 border-slate-700'
            }`}
          >
            {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => handleZoom('in')}
            title="Zoom In"
            className="p-1.5 rounded bg-slate-900 text-slate-300 hover:text-cyan-300 border border-slate-700"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleZoom('out')}
            title="Zoom Out"
            className="p-1.5 rounded bg-slate-900 text-slate-300 hover:text-cyan-300 border border-slate-700"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleResetFit}
            title="Fit to Center"
            className="p-1.5 rounded bg-slate-900 text-slate-300 hover:text-cyan-300 border border-slate-700"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleExportPNG}
            title="Export Graph Image (PNG)"
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>EXPORT PNG</span>
          </button>
        </div>
      </div>

      {/* Main Canvas Container */}
      <div
        ref={containerRef}
        className="relative flex-1 bg-[#05080e] border border-slate-800/90 rounded-lg overflow-hidden select-none cursor-grab active:cursor-grabbing"
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          className="w-full h-full block"
        />

        {/* Legend Overlay */}
        <div className="absolute bottom-3 left-3 bg-[#0a101bd0] backdrop-blur-md border border-slate-800 rounded-md p-2.5 font-mono text-[10px] space-y-1.5 shadow-lg pointer-events-none">
          <div className="text-slate-400 uppercase tracking-wider font-bold">Node Legend</div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00f0ff] shadow-[0_0_6px_#00f0ff]" />
            <span className="text-slate-200">Victim Account (Hop 0)</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
            <span className="text-slate-200">Potential L1 Collector</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#a855f7]" />
            <span className="text-slate-200">Potential L2 Distributor</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
            <span className="text-slate-200">Potential L3 Terminal / Cash-Out</span>
          </div>
        </div>

        {/* Hovered Node Tooltip HUD */}
        {hoveredNode && (
          <div className="absolute top-3 right-3 bg-[#080d17e6] backdrop-blur-md border border-cyan-600/60 rounded-md p-3 font-mono text-xs shadow-2xl max-w-xs space-y-1.5 pointer-events-none">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1">
              <span className="text-cyan-400 font-bold">{maskAccount(hoveredNode.id, !maskAccounts)}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700">
                Hop {hoveredNode.hopLevel}
              </span>
            </div>
            <div className="text-slate-300 text-[11px]">{hoveredNode.layer}</div>
            <div className="text-slate-400 text-[10px]">
              <div>Bank: {hoveredNode.bankName} ({hoveredNode.ifsc})</div>
              <div>Received: <strong className="text-emerald-400">{formatINR(hoveredNode.totalReceived)}</strong></div>
              <div>Risk Score: <strong className={hoveredNode.riskScore >= 70 ? 'text-red-400' : 'text-amber-400'}>{hoveredNode.riskScore}/100</strong></div>
            </div>
            <div className="text-[10px] text-cyan-300/80 pt-0.5 italic">Click node to inspect deep intelligence</div>
          </div>
        )}
      </div>
    </div>
  );
};

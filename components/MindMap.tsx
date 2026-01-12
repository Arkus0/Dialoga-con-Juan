import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { ConceptNode, ConceptLink, RelationType } from '../types';
import { ZoomIn, ZoomOut, Expand, Clock, Network } from 'lucide-react';

interface MindMapProps {
  nodes: ConceptNode[];
  links: ConceptLink[];
  onNodeClick: (node: ConceptNode) => void;
  onNodeExpand: (node: ConceptNode) => void;
}

const RELATION_COLORS: Record<RelationType, string> = {
  'CRITIQUES': '#ef4444', // Red
  'OPPOSES': '#f97316',   // Orange
  'EXPANDS_UPON': '#10b981', // Emerald
  'INFLUENCED_BY': '#a855f7', // Purple
  'RELATES_TO': '#475569' // Slate
};

const MindMap: React.FC<MindMapProps> = ({ nodes, links, onNodeClick, onNodeExpand }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [viewMode, setViewMode] = useState<'network' | 'timeline'>('network');

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (wrapperRef.current) {
        setDimensions({
          width: wrapperRef.current.clientWidth,
          height: wrapperRef.current.clientHeight,
        });
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // D3 Logic
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous render

    const { width, height } = dimensions;

    // --- Timeline Scale ---
    // Map years 1800-2025 to svg width
    const timeScale = d3.scaleLinear()
      .domain([1800, 2025])
      .range([-width / 2 + 50, width / 2 - 50]);

    // --- Simulation Setup ---
    const simulation = d3.forceSimulation(nodes as d3.SimulationNodeDatum[])
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(180))
      .force("charge", d3.forceManyBody().strength(-500))
      .force("collide", d3.forceCollide().radius(70));

    // Dynamic Forces based on View Mode
    if (viewMode === 'timeline') {
       simulation
         .force("x", d3.forceX((d: any) => timeScale(d.year || 2000)).strength(0.8))
         .force("y", d3.forceY(0).strength(0.3)); // Keep them roughly vertically centered
    } else {
       simulation
         .force("center", d3.forceCenter(width / 2, height / 2))
         .force("x", d3.forceX(width/2).strength(0.01))
         .force("y", d3.forceY(height/2).strength(0.01));
    }

    // Container group for Zoom
    const g = svg.append("g");
    
    // Initial centering logic for zoom
    const initialTransform = viewMode === 'timeline' 
        ? d3.zoomIdentity.translate(width / 2, height / 2).scale(1) 
        : d3.zoomIdentity;
        
    if (viewMode === 'timeline') {
        g.attr("transform", initialTransform.toString());
    }

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);
    if (viewMode === 'timeline') {
        svg.call(zoom.transform, initialTransform);
    }

    // --- Time Axis (Only for Timeline) ---
    if (viewMode === 'timeline') {
       const axisGroup = g.append("g")
         .attr("class", "axis")
         .attr("transform", `translate(0, ${height / 2 - 50})`) // Position near bottom
         .style("opacity", 0.5);

       const axis = d3.axisBottom(timeScale)
         .ticks(10)
         .tickFormat(d3.format("d")); // No comma in years

       axisGroup.call(axis)
         .selectAll("text")
         .style("fill", "#94a3b8")
         .style("font-family", "Inter")
         .style("font-size", "12px");
         
       axisGroup.selectAll("path, line").style("stroke", "#475569");
    }

    // Links
    const link = g.append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", (d) => RELATION_COLORS[d.relation] || '#475569')
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", (d) => d.relation === 'RELATES_TO' ? 1.5 : 2.5)
      .attr("marker-end", (d) => `url(#arrow-${d.relation})`);

    // Define Arrow markers
    const defs = svg.append("defs");
    Object.keys(RELATION_COLORS).forEach(rel => {
       defs.append("marker")
        .attr("id", `arrow-${rel}`)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 38)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", RELATION_COLORS[rel as RelationType]);
    });

    // Nodes Group
    const nodeGroup = g.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .call(d3.drag<any, any>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended)
      );

    // Node Circles
    nodeGroup.append("circle")
      .attr("r", (d) => d.type === 'root' ? 40 : 30)
      .attr("fill", (d) => {
        if (d.type === 'root') return '#d4af37'; // Gold
        if (d.mastery > 80) return '#10b981'; // Emerald
        if (d.type === 'person') return '#f43f5e'; // Rose
        return '#3b82f6'; // Blue
      })
      .attr("stroke", "#1e293b")
      .attr("stroke-width", 2)
      .attr("cursor", "pointer")
      .on("click", (event, d) => {
        event.stopPropagation();
        onNodeClick(d);
      });

    // Node Labels
    nodeGroup.append("text")
      .text(d => d.label)
      .attr("x", 0)
      .attr("y", (d) => (d.type === 'root' ? 55 : 45))
      .attr("text-anchor", "middle")
      .attr("fill", "#e2e8f0")
      .attr("font-size", "12px")
      .attr("font-family", "Inter, sans-serif")
      .attr("font-weight", "500")
      .style("pointer-events", "none")
      .style("text-shadow", "0px 2px 4px rgba(0,0,0,0.8)");

    // Year Label (Timeline Mode)
    if (viewMode === 'timeline') {
       nodeGroup.append("text")
         .text(d => d.year || "?")
         .attr("x", 0)
         .attr("y", -40)
         .attr("text-anchor", "middle")
         .attr("fill", "#94a3b8")
         .attr("font-size", "10px")
         .style("font-family", "monospace");
    }

    // Mastery Ring
    nodeGroup.append("circle")
      .attr("r", (d) => (d.type === 'root' ? 44 : 34))
      .attr("fill", "none")
      .attr("stroke", (d) => d.mastery > 0 ? `rgba(255,255,255, ${d.mastery / 100})` : "none")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "4 2");
      
    // Simulation Tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      nodeGroup
        .attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      // In timeline mode, limit Y dragging, X is loosely constrained by force but user can pull
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [nodes, links, dimensions, viewMode]);

  return (
    <div ref={wrapperRef} className="w-full h-full relative overflow-hidden bg-slate-900 shadow-inner rounded-xl border border-slate-800">
      <svg ref={svgRef} className="w-full h-full block" width={dimensions.width} height={dimensions.height} />
      
      {/* View Switcher */}
      <div className="absolute top-4 left-4 z-10 flex bg-slate-800/90 rounded-lg p-1 border border-slate-700 backdrop-blur">
          <button 
             onClick={() => setViewMode('network')}
             className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition-colors ${viewMode === 'network' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
             <Network size={14} /> Network
          </button>
          <button 
             onClick={() => setViewMode('timeline')}
             className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition-colors ${viewMode === 'timeline' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
             <Clock size={14} /> Timeline
          </button>
      </div>
      
      {/* Legend */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 pointer-events-none">
        <div className="bg-slate-800/80 p-3 rounded-lg text-xs text-slate-300 backdrop-blur-sm border border-slate-700 shadow-xl pointer-events-auto">
           <p className="font-bold mb-2 text-white border-b border-slate-600 pb-1">Taxonomy</p>
           
           <div className="space-y-1.5">
             <div className="flex items-center gap-2"><span className="w-3 h-0.5 bg-red-500"></span> Critiques</div>
             <div className="flex items-center gap-2"><span className="w-3 h-0.5 bg-emerald-500"></span> Expands Upon</div>
             <div className="flex items-center gap-2"><span className="w-3 h-0.5 bg-purple-500"></span> Influenced By</div>
             <div className="flex items-center gap-2"><span className="w-3 h-0.5 bg-slate-500"></span> Relates To</div>
           </div>
           
           <p className="font-bold mt-3 mb-1 text-white border-b border-slate-600 pb-1">Nodes</p>
           <div className="space-y-1.5">
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500"></span> Concept</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-rose-500"></span> Theorist</div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default MindMap;
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { ConceptNode, ConceptLink } from '../types';
import { ZoomIn, ZoomOut, Expand } from 'lucide-react';

interface MindMapProps {
  nodes: ConceptNode[];
  links: ConceptLink[];
  onNodeClick: (node: ConceptNode) => void;
  onNodeExpand: (node: ConceptNode) => void;
}

const MindMap: React.FC<MindMapProps> = ({ nodes, links, onNodeClick, onNodeExpand }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

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

    // Simulation setup
    const simulation = d3.forceSimulation(nodes as d3.SimulationNodeDatum[])
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(150))
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(60));

    // Container group for Zoom
    const g = svg.append("g");

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    // Links
    const link = g.append("g")
      .attr("stroke", "#475569")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", 1.5);

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

    // Mastery Ring (Optional visual flair)
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
  }, [nodes, links, dimensions]); // Re-run when graph data changes

  return (
    <div ref={wrapperRef} className="w-full h-full relative overflow-hidden bg-slate-900 shadow-inner rounded-xl border border-slate-800">
      <svg ref={svgRef} className="w-full h-full block" width={dimensions.width} height={dimensions.height} />
      
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <div className="bg-slate-800/80 p-2 rounded-lg text-xs text-slate-300 backdrop-blur-sm border border-slate-700">
           <p className="font-bold mb-1">Legend</p>
           <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500"></span> Concept</div>
           <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-rose-500"></span> Theorist</div>
           <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> Mastered</div>
        </div>
      </div>
    </div>
  );
};

export default MindMap;
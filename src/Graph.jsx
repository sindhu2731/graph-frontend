import { useEffect, useRef } from "react";
import Graph from "graphology";
import Sigma from "sigma";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default function GraphView({ center = 0, depth = 2 }) {
  const containerRef = useRef(null);
  const sigmaRef = useRef(null);
  const graphRef = useRef(null);

  if (!graphRef.current) {
    graphRef.current = new Graph();
  }

  useEffect(() => {
    if (!containerRef.current || sigmaRef.current) return;

    sigmaRef.current = new Sigma(graphRef.current, containerRef.current);

    return () => {
      sigmaRef.current.kill();
      sigmaRef.current = null;
    };
  }, []);

  useEffect(() => {
    fetchSubgraph(center, depth);
  }, [center, depth]);

  const fetchSubgraph = async (center, depth) => {
    try {
      const res = await axios.get(
        `${API_URL}/subgraph?center=${center}&depth=${depth}`
      );

      const data = res.data;
      const graph = graphRef.current;

      graph.clear();

      data.nodes.forEach((node) => {
        let color = "#999"; 

        if (node.depth === 0) color = "#ff4d4d"; 
        else if (node.depth < data.depth) color = "#4da6ff"; 
        else color = "#bfbfbf"; 
        graph.addNode(node.id, {
          label: `Node ${node.id}`,
          x: node.x,
          y: node.y,
          size: node.depth === 0 ? 12 : 5,
          color,
        });
      });

      
      data.edges.forEach((edge, i) => {
        if (!graph.hasEdge(edge.source, edge.target)) {
          graph.addEdge(edge.source, edge.target, {
            color: "#e0e0e0",
            size: 0.8,
          });
        }
      });
    } catch (err) {
      console.error("Error loading subgraph:", err);
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100vh",
        background: "#ffffff",
      }}
    />
  );
}

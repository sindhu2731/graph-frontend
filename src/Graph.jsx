import React, { useEffect, useRef } from "react";
import axios from "axios";
import Sigma from "sigma";
import Graph from "graphology";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function GraphView() {
  const containerRef = useRef(null);

  useEffect(() => {
    let sigmaInstance = null;

    axios.get(`${API_URL}/graph`)
      .then((response) => {
        const data = response.data;
        const graph = new Graph();

        data.nodes.forEach((node) => {
          graph.addNode(node.id, {
            label: node.label,
            x: node.x,
            y: node.y,
            size: node.size,
            color: node.color,
          });
        });

        data.edges.forEach((edge) => {
          graph.addEdge(edge.source, edge.target);
        });

        sigmaInstance = new Sigma(graph, containerRef.current);
      })
      .catch((error) => {
        console.error("Error fetching graph:", error);
      });

    return () => sigmaInstance?.kill();
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width: "100vw", height: "100vh" }}
    />
  );
}

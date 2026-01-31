import React, { useEffect, useRef } from "react";
import axios from "axios";
import Sigma from "sigma";
import Graph from "graphology";

const API_URL =
  process.env.REACT_APP_API_URL || "http://localhost:8000";

export default function GraphView() {
  const containerRef = useRef(null);

  useEffect(() => {
    let sigmaInstance = null;

    axios
      .get(`${API_URL}/graph`)
      .then((response) => {
        const data = response.data;
        const graph = new Graph();

        // Add nodes
        data.nodes.forEach((node) => {
          graph.addNode(node.id, {
            label: node.label,
            x: node.x,
            y: node.y,
            size: node.size,
            color: node.color,
          });
        });

        // Add edges
        data.edges.forEach((edge) => {
          graph.addEdge(edge.source, edge.target, {
            id: edge.id,
          });
        });

        sigmaInstance = new Sigma(graph, containerRef.current);
      })
      .catch((error) => {
        console.error("Error fetching graph:", error);
      });

    return () => {
      if (sigmaInstance) {
        sigmaInstance.kill();
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width: "100vw", height: "100vh" }}
    />
  );
}

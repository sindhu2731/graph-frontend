import { useEffect, useRef, useState } from "react";
import Graph from "graphology";
import Sigma from "sigma";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default function GraphView({ initialCenter = 0, depth = 2 }) {
  const containerRef = useRef(null);
  const sigmaRef = useRef(null);
  const graphRef = useRef(new Graph());

  const [center, setCenter] = useState(String(initialCenter));
  const [status, setStatus] = useState("Idle");
  const [sampleNode, setSampleNode] = useState(null);
  const fetchingRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || sigmaRef.current) return;

    sigmaRef.current = new Sigma(graphRef.current, containerRef.current, {
      minCameraRatio: 0.5,
      maxCameraRatio: 10,
    });

    sigmaRef.current.on("clickNode", ({ node }) => {
      const attrs = graphRef.current.getNodeAttributes(node);
      if (attrs && attrs.isBoundary) {
        setCenter(node);
      }
    });

    return () => {
      sigmaRef.current?.kill();
      sigmaRef.current = null;
    };
  }, []);

  useEffect(() => {
    const resize = () => sigmaRef.current?.refresh();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);


  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!cancelled) {
        await fetchSubgraph(center, depth);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [center, depth]);


  const fetchSubgraph = async (center, depth) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setStatus(`Fetching /subgraph?center=${center}&depth=${depth}`);

    try {
      const res = await axios.get(
        `${API_URL}/subgraph?center=${center}&depth=${depth}`
      );

      const { nodes, edges } = res.data;
      setSampleNode(nodes?.[0] ?? null);
      setStatus(`Fetched ${nodes?.length ?? 0} nodes, ${edges?.length ?? 0} edges`);
      console.debug("Fetched subgraph:", {
        requestedCenter: center,
        requestedDepth: depth,
        nodesCount: nodes?.length,
        edgesCount: edges?.length,
        sampleNode: nodes?.[0],
      });

      const graph = graphRef.current;
      graph.clear();

      nodes.forEach((node) => {
        const id = String(node.id);

        let color = "#2b7cff";
        if (node.depth === 0) color = "#ff4d4d";
        else if (!node.is_boundary) color = "#4da6ff";

        graph.addNode(id, {
          label: `Node ${id}`,
          x: node.x,
          y: node.y,
          size: node.depth === 0 ? 18 : 7,
          color,
          isBoundary: node.is_boundary,
        });
      });

      edges.forEach((e) => {
        const source = String(e.source);
        const target = String(e.target);
        const key = `e-${source}-${target}`;

        if (
          !graph.hasEdge(key) &&
          graph.hasNode(source) &&
          graph.hasNode(target)
        ) {
          graph.addEdgeWithKey(key, source, target, {
            color: "#e0e0e0",
            size: 0.8,
          });
        }
      });

      sigmaRef.current?.refresh();

      requestAnimationFrame(() => {
        if (!sigmaRef.current) {
          console.debug("Sigma not ready yet");
          return;
        }

        let minX = Infinity,
          maxX = -Infinity,
          minY = Infinity,
          maxY = -Infinity;

        graph.forEachNode((_, a) => {
          if (typeof a.x === "number" && isFinite(a.x)) {
            minX = Math.min(minX, a.x);
            maxX = Math.max(maxX, a.x);
          }
          if (typeof a.y === "number" && isFinite(a.y)) {
            minY = Math.min(minY, a.y);
            maxY = Math.max(maxY, a.y);
          }
        });

        if (minX === Infinity || minY === Infinity) {
          console.debug("No valid node positions to fit");
          setStatus("No valid node positions to fit");
          return;
        }

        const width = Math.max(maxX - minX, 1);
        const height = Math.max(maxY - minY, 1);

        const container = sigmaRef.current.getContainer();
        console.debug("Renderer ready:", {
          nodeCount: graph.order,
          edgeCount: graph.size,
        });
        console.debug("BBox:", { minX, minY, maxX, maxY, width, height });
        console.debug("Container:", {
          w: container.offsetWidth,
          h: container.offsetHeight,
        });

        const ratioX = width / Math.max(container.offsetWidth, 1);
        const ratioY = height / Math.max(container.offsetHeight, 1);

        const padding = 1.15;
        let ratio = Math.max(ratioX, ratioY) * padding;
        if (!isFinite(ratio) || ratio <= 0) ratio = 1;
        ratio = Math.min(Math.max(ratio, 0.5), 10);

        const nodeAttrs = graph.getNodeAttributes(String(center)) || {};
        let x = Number(nodeAttrs.x);
        let y = Number(nodeAttrs.y);

        const boxCenterX = (minX + maxX) / 2;
        const boxCenterY = (minY + maxY) / 2;

        if (!isFinite(x)) x = boxCenterX;
        if (!isFinite(y)) y = boxCenterY;

        x = Math.min(maxX, Math.max(minX, x));
        y = Math.min(maxY, Math.max(minY, y));

        console.debug("Camera target:", { x, y, ratio });
        setStatus(prev => `${prev} — Camera: ${x.toFixed(3)},${y.toFixed(3)} r=${ratio.toFixed(3)}`);

        const cam = sigmaRef.current.getCamera();
        cam.setState({ x, y, ratio });
        sigmaRef.current.refresh();
      });
    } catch (err) {
      console.error("Subgraph load failed:", err);
      setStatus(`Load failed: ${err.message}`);
    } finally {
      fetchingRef.current = false;
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100vh",
        background: "#ffffff",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 8,
          left: 8,
          zIndex: 999,
          background: "rgba(0,0,0,0.7)",
          color: "#fff",
          padding: "6px 8px",
          borderRadius: 4,
          fontSize: 12,
          pointerEvents: "none",
        }}
      >
        <div><strong>Status:</strong> {status}</div>
        {sampleNode && (
          <div style={{ marginTop: 4 }}>
            <strong>Sample:</strong> id={sampleNode.id} x={sampleNode.x.toFixed(3)} y={sampleNode.y.toFixed(3)}
          </div>
        )}
      </div>
    </div>
  );
}
import React, { Component, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useReducedMotion } from "framer-motion";
import { Globe } from "lucide-react";
import { Vector3, Quaternion, QuadraticBezierCurve3 } from "three";
class GlobeBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="soc-globe-fallback">
        <Globe size={96} />
        <p>3D unavailable. Select an event below.</p>
      </div>
    ) : (
      this.props.children
    );
  }
}
function SignalNode({
  position,
  incident,
  selected,
  onSelect,
  frame,
  reduced,
}) {
  const orientation = useMemo(
    () =>
      new Quaternion().setFromUnitVectors(
        new Vector3(0, 0, 1),
        new Vector3(...position).normalize(),
      ),
    [position],
  );
  const color =
    incident.severity === "Safe" || incident.severity === "Low"
      ? "#00FF9D"
      : incident.severity === "Critical"
        ? "#FF007F"
        : "#FFB800";
  const pulse = reduced ? 0.45 : (frame % 20) / 20;
  return (
    <group position={position}>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onSelect(incident);
        }}
        scale={selected ? 1.6 : 1}
      >
        <sphereGeometry args={[0.065, 12, 12]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {selected &&
        [0, 0.5].map((offset) => {
          const phase = (pulse + offset) % 1;
          return (
            <mesh
              key={offset}
              quaternion={orientation}
              scale={1 + phase * 3}
              raycast={() => null}
            >
              <ringGeometry args={[0.09, 0.104, 48]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={(1 - phase) * 0.75}
                depthWrite={false}
                side={2}
              />
            </mesh>
          );
        })}
    </group>
  );
}
function SignalLink({ start, end, frame, reduced }) {
  const curve = useMemo(() => {
    const a = new Vector3(...start),
      b = new Vector3(...end);
    const mid = a
      .clone()
      .add(b)
      .multiplyScalar(0.5)
      .normalize()
      .multiplyScalar(2.45);
    return new QuadraticBezierCurve3(a, mid, b);
  }, [start, end]);
  const point = curve.getPoint(reduced ? 0.5 : (frame % 40) / 40);
  return (
    <group>
      <mesh raycast={() => null}>
        <tubeGeometry args={[curve, 32, 0.007, 5, false]} />
        <meshBasicMaterial color="#00F0FF" transparent opacity={0.35} />
      </mesh>
      <mesh position={point} raycast={() => null}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshBasicMaterial color="#00F0FF" />
      </mesh>
    </group>
  );
}
function Radar({
  incidents,
  selectedId,
  onSelect,
  reduced,
  frame = 0,
  playing = false,
}) {
  const group = useRef();
  const points = useMemo(() => {
    const values = [];
    for (let n = 0; n < 1300; n++) {
      const y = 1 - (n / 1299) * 2,
        radius = Math.sqrt(1 - y * y),
        theta = Math.PI * (3 - Math.sqrt(5)) * n;
      values.push(
        Math.cos(theta) * radius * 1.8,
        y * 1.8,
        Math.sin(theta) * radius * 1.8,
      );
    }
    return new Float32Array(values);
  }, []);
  useFrame(() => {
    if (group.current) group.current.rotation.y = reduced ? 0 : frame * 0.006;
  });
  const visible = incidents.slice(0, 8);
  const activeIncident = incidents.find(
    (incident) => incident.id === selectedId,
  );
  if (activeIncident && !visible.some((incident) => incident.id === selectedId))
    visible[7] = activeIncident;
  const nodes = visible.map((incident, index) => {
    const angle = index * 2.4,
      y = 1.25 - index * 0.34,
      radius = Math.sqrt(1.84 ** 2 - y * y);
    return {
      incident,
      position: [Math.sin(angle) * radius, y, Math.cos(angle) * radius],
    };
  });
  const selected = nodes.find((node) => node.incident.id === selectedId);
  return (
    <group ref={group} rotation={[0.15, 0, 0.12]}>
      <mesh>
        <sphereGeometry args={[1.76, 36, 24]} />
        <meshBasicMaterial color="#08151e" />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.8, 28, 18]} />
        <meshBasicMaterial
          color="#125167"
          wireframe
          transparent
          opacity={0.24}
        />
      </mesh>
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={points.length / 3}
            array={points}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.017}
          color="#00F0FF"
          transparent
          opacity={0.7}
        />
      </points>
      {nodes.map(({ incident, position }) => (
        <SignalNode
          key={incident.id}
          position={position}
          incident={incident}
          selected={selectedId === incident.id}
          onSelect={onSelect}
          frame={frame}
          reduced={reduced}
        />
      ))}
      {selected &&
        frame > 0 &&
        nodes
          .filter((node) => node.incident.id !== selectedId)
          .slice(0, 3)
          .map((node) => (
            <SignalLink
              key={node.incident.id}
              start={selected.position}
              end={node.position}
              frame={frame}
              reduced={reduced}
            />
          ))}
    </group>
  );
}
export default function ThreatGlobe(props) {
  const reduced = useReducedMotion();
  return (
    <GlobeBoundary>
      <Canvas
        camera={{ position: [0, 0, 5.5], fov: 46 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        fallback={
          <div className="soc-globe-fallback">
            3D unavailable. Use the event stream.
          </div>
        }
      >
        <Radar {...props} reduced={reduced} />
      </Canvas>
    </GlobeBoundary>
  );
}

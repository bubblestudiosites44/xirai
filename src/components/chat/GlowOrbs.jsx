import React from "react";

export default function GlowOrbs() {
  return (
    <>
      <div
        className="glow-orb"
        style={{
          width: 400,
          height: 400,
          top: "16%",
          right: "4%",
          background: "radial-gradient(circle, hsl(160 84% 45% / 0.4), transparent 70%)",
        }}
      />
      <div
        className="glow-orb"
        style={{
          width: 300,
          height: 300,
          bottom: "-2%",
          right: "6%",
          background: "radial-gradient(circle, hsl(176 90% 48% / 0.32), transparent 72%)",
        }}
      />
      <div
        className="glow-orb"
        style={{
          width: 360,
          height: 360,
          bottom: "-10%",
          left: "-8%",
          background: "radial-gradient(circle, rgba(232,255,247,0.34), transparent 70%)",
        }}
      />
    </>
  );
}

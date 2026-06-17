import React from "react";

export default function GlowOrbs() {
  return (
    <>
      <div
        className="glow-orb"
        style={{
          width: 400,
          height: 400,
          top: "10%",
          right: "-5%",
          background: "radial-gradient(circle, hsl(160 84% 45% / 0.4), transparent 70%)",
        }}
      />
      <div
        className="glow-orb"
        style={{
          width: 300,
          height: 300,
          bottom: "15%",
          right: "10%",
          background: "radial-gradient(circle, hsl(170 70% 40% / 0.25), transparent 70%)",
        }}
      />
      <div
        className="glow-orb"
        style={{
          width: 250,
          height: 250,
          top: "40%",
          left: "-3%",
          background: "radial-gradient(circle, hsl(160 84% 45% / 0.15), transparent 70%)",
        }}
      />
    </>
  );
}
import React from "react";

export const AnimatedFFLogo = ({
  size = 100,
  color = "black",
  className = "",
}) => {
  const viewBoxWidth = 200;
  const viewBoxHeight = 120;

  return (
    <div className={className}>
      <svg
        width={size}
        height={size * (viewBoxHeight / viewBoxWidth)}
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Left F */}
        <path fill={color}>
          <animate
            attributeName="d"
            dur="6s"
            repeatCount="indefinite"
            attributeType="XML"
            values="
              M95 50 H75 V70 H95 V50;
              M85 50 H65 V70 H85 V50;
              M85 20 H65 V120 H85 V20;
              M85 20 H65 V40 H65 V60 H65 V80 H65 V120 H85 V20;
              M85 20 H25 V40 H65 V60 H35 V80 H65 V120 H85 V20;
              M85 20 H25 V40 H65 V60 H35 V80 H65 V120 H85 V20;
              M85 20 H65 V40 H65 V60 H65 V80 H65 V120 H85 V20;
              M85 20 H65 V120 H85 V20;
              M85 50 H65 V70 H85 V50;
              M95 50 H75 V70 H95 V50
            "
            keyTimes="0;0.05;0.1;0.15;0.2;0.7;0.75;0.8;0.9;1"
            calcMode="spline"
            keySplines="
              0.4 0 0.2 1;
              0.4 0 0.2 1;
              0.4 0 0.2 1;
              0.25 0.1 0.25 1;
              0.25 0.1 0.25 1;
              0.4 0 0.2 1;
              0.4 0 0.2 1;
              0.4 0 0.2 1;
              0.4 0 0.2 1
            "
          />
        </path>

        {/* Right F */}
        <path fill={color}>
          <animate
            attributeName="d"
            dur="6s"
            repeatCount="indefinite"
            attributeType="XML"
            values="
              M95 50 H115 V70 H95 V50;
              M105 50 H125 V70 H105 V50;
              M105 20 H125 V120 H105 V20;
              M105 20 H125 V40 H125 V60 H125 V80 H125 V120 H105 V20;
              M105 20 H165 V40 H125 V60 H155 V80 H125 V120 H105 V20;
              M105 20 H165 V40 H125 V60 H155 V80 H125 V120 H105 V20;
              M105 20 H125 V40 H125 V60 H125 V80 H125 V120 H105 V20;
              M105 20 H125 V120 H105 V20;
              M105 50 H125 V70 H105 V50;
              M95 50 H115 V70 H95 V50
            "
            keyTimes="0;0.05;0.1;0.15;0.2;0.7;0.75;0.8;0.9;1"
            calcMode="spline"
            keySplines="
              0.4 0 0.2 1;
              0.4 0 0.2 1;
              0.4 0 0.2 1;
              0.25 0.1 0.25 1;
              0.25 0.1 0.25 1;
              0.4 0 0.2 1;
              0.4 0 0.2 1;
              0.4 0 0.2 1;
              0.4 0 0.2 1
            "
          />
        </path>
      </svg>
    </div>
  );
};

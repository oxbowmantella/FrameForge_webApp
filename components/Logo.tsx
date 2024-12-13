import React from "react";

const FFLogo = ({ size = 100, color = "black", className = "" }) => {
  // Calculate viewBox values based on original proportions
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
        {/* Mirrored F (left side) */}
        <path
          d="
            M85 20
            H25
            V40
            H65
            V60
            H35
            V80
            H65
            V120
            H85
            V20
          "
          fill={color}
        />

        {/* Regular F (right side) */}
        <path
          d="
            M105 20
            H165
            V40
            H125
            V60
            H155
            V80
            H125
            V120
            H105
            V20
          "
          fill={color}
        />
      </svg>
    </div>
  );
};

export default FFLogo;

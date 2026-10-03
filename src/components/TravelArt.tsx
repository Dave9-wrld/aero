export function RouteGlobe() {
  return (
    <div className="globe-scene" aria-hidden="true">
      <span className="globe-caption">A WORLD OF POSSIBILITIES</span>
      <svg className="route-globe" viewBox="0 0 520 420" fill="none">
        <defs>
          <radialGradient id="globe-fill" cx=".35" cy=".25" r=".8">
            <stop stopColor="#eef0dd" />
            <stop offset="1" stopColor="#d2dece" />
          </radialGradient>
          <clipPath id="globe-clip">
            <circle cx="260" cy="207" r="165" />
          </clipPath>
        </defs>
        <circle
          cx="260"
          cy="207"
          r="192"
          stroke="#d7ddcc"
          strokeDasharray="2 8"
        />
        <ellipse
          cx="260"
          cy="374"
          rx="121"
          ry="15"
          fill="#b7c7b2"
          opacity=".25"
        />
        <circle cx="260" cy="207" r="165" fill="url(#globe-fill)" />
        <g
          clipPath="url(#globe-clip)"
          stroke="#9eaf97"
          strokeWidth=".8"
          opacity=".45"
        >
          <ellipse cx="260" cy="207" rx="67" ry="165" />
          <ellipse cx="260" cy="207" rx="127" ry="165" />
          <ellipse cx="260" cy="207" rx="165" ry="63" />
          <ellipse cx="260" cy="207" rx="165" ry="123" />
          <path d="M260 42v330M95 207h330" />
        </g>
        <g clipPath="url(#globe-clip)" fill="#91ab87" opacity=".7">
          <path d="m98 151 30-28 24-19 30 4 16 17-10 15-24 3-5 19-16 4-12 24-25-5-8-34ZM155 201l25 3 21 21-4 32-14 19-3 30-12 24-11-31-13-23 5-24-15-31 21-20Z" />
          <path d="m228 112 17-14 23 7 13-11 27 12 12 20-11 17-27-2-10 9-9-11-15 3-9-17-11-13Zm9 46 25-11 31 9 18 22-4 24-17 18-10 34-18 21-16-9-9-29-17-20-4-27 21-32Z" />
          <path d="m302 108 39-17 33 13 22-3 46 34-13 39-23-4-9 19-25-3-13-26-27 7-21-13-19-22 10-24Zm68 140 26-7 27 11 18 28-19 12-31-4-25-17 4-23Z" />
        </g>
        <path
          d="M257 187Q172 75 252 94"
          stroke="#174e47"
          strokeWidth="2"
          strokeDasharray="6 5"
          className="flight-path"
        />
        <circle
          cx="257"
          cy="187"
          r="5"
          fill="#174e47"
          stroke="#fff"
          strokeWidth="3"
        />
        <circle
          cx="252"
          cy="94"
          r="5"
          fill="#174e47"
          stroke="#fff"
          strokeWidth="3"
        />
        <g transform="translate(211 115) rotate(-18)">
          <path
            d="m0 0 22-7-7 22-4-11L0 0Z"
            fill="#174e47"
            stroke="#f3f5eb"
            strokeWidth="2"
          />
        </g>
        <circle cx="260" cy="207" r="165" stroke="#cad5c1" />
      </svg>
      <div className="map-pin map-pin-london">
        <span className="status-dot" />
        <div>
          <strong>London</strong>
          <span>Your next chapter</span>
        </div>
        <span className="pin-code">LHR</span>
      </div>
      <div className="map-pin map-pin-lagos">
        <span className="pin-circle">↗</span>
        <div>
          <strong>Lagos</strong>
          <span>Where it begins</span>
        </div>
        <span className="pin-code">LOS</span>
      </div>
      <span className="globe-footnote">
        A change of scenery changes everything.
      </span>
    </div>
  );
}

export function DestinationArt({
  city,
}: {
  city: "London" | "Dubai" | "New York" | "Cape Town";
}) {
  const palette = {
    London: ["#e0e6da", "#758c72"],
    Dubai: ["#f0e2cf", "#ae865d"],
    "New York": ["#dce7e9", "#76989d"],
    "Cape Town": ["#e4e5da", "#8b997c"],
  }[city];
  return (
    <svg
      viewBox="0 0 360 220"
      className="destination-art"
      role="img"
      aria-label={`Illustration of ${city}`}
    >
      <rect width="360" height="220" fill={palette[0]} />
      <circle cx="280" cy="56" r="26" fill="#fff8dd" opacity=".8" />
      <path
        d="M0 181Q85 160 181 181t179-3v42H0Z"
        fill={palette[1]}
        opacity=".16"
      />
      {city === "London" && (
        <g fill={palette[1]}>
          <path d="M73 188V80h30v108Zm-4-108 19-23 19 23ZM84 57V31h8v26ZM65 188V115H32v73Zm44 0V131h32v57Zm35 0v-43h41v43Z" />
          <circle cx="88" cy="100" r="10" fill={palette[0]} />
          <path
            d="M88 92v9l6 4"
            fill="none"
            stroke={palette[1]}
            strokeWidth="2"
          />
          <circle
            cx="259"
            cy="125"
            r="50"
            fill="none"
            stroke={palette[1]}
            strokeWidth="3"
          />
          <path
            d="m259 125-37 63h74l-37-63Zm0-50v100m-50-50h100m-85-35 70 70m-70 0 70-70"
            fill="none"
            stroke={palette[1]}
            strokeWidth="2"
          />
        </g>
      )}
      {city === "Dubai" && (
        <g fill={palette[1]}>
          <path d="M165 189V111h9V76h7V46h5V17h3v29h5v30h7v35h9v78Zm-66 0V90h29v99Zm-45 0v-66h27v66Zm177 0V110h33v79Zm49 0V81h36v108Z" />
          <path
            d="m101 111 20-13m-20 32 20-13m-20 32 20-13m-20 32 20-13m68-77v100m-14-34h31m-31-15h31m-27-15h23"
            stroke={palette[0]}
            strokeWidth="2"
          />
          <path d="M33 189h297" stroke={palette[1]} strokeWidth="3" />
        </g>
      )}
      {city === "New York" && (
        <g fill={palette[1]}>
          <path d="M35 190V101h35v89Zm45 0V78h40v112Zm50 0V124h28v66Zm38 0V66h12V45h12V19h3v26h12v21h12v124Zm59 0V95h38v95Zm47 0V118h35v72Zm41 0V151h20v39Z" />
          <path
            d="M45 115h15m-15 16h15m-15 16h15m31-51h17m-17 16h17m-17 16h17m-17 16h17m76-56h18m-18 18h18m-18 18h18m-18 18h18m37-29h19m-19 18h19m-19 18h19"
            stroke={palette[0]}
            strokeWidth="3"
          />
        </g>
      )}
      {city === "Cape Town" && (
        <g>
          <path
            d="m0 160 52-25 34-59h134l43 72 49-8 48 36v44H0Z"
            fill={palette[1]}
            opacity=".65"
          />
          <path
            d="m0 194 70-26 73 15 62-20 69 17 86-8v48H0Z"
            fill={palette[1]}
          />
          <path
            d="M17 206q65-23 130-2t197-4"
            stroke={palette[0]}
            strokeWidth="3"
            fill="none"
          />
          <path
            d="m85 76 21 29 25-20 48 10 30-19"
            stroke={palette[0]}
            strokeWidth="2"
            fill="none"
            opacity=".5"
          />
        </g>
      )}
      <path d="M23 39h42m-21-10v20" stroke={palette[1]} opacity=".35" />
      <path d="m43 28 12-5-4 12-2-7-6 0Z" fill={palette[1]} opacity=".55" />
    </svg>
  );
}

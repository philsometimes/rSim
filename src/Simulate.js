/** @jsxImportSource theme-ui */
import { useEffect, useState } from "react";
import * as math from "mathjs";

// const UI = () => {
//   const
// }

const magnitude = (vecAsArray) => {
  const mag = math.sqrt(
    math.add(math.square(vecAsArray[0]), math.square(vecAsArray[1]))
  );
  return mag;
};

const unitVec = (vecAsArray) => {
  const mag = magnitude(vecAsArray);
  const unitVec = math.divide(vecAsArray, mag);
  return unitVec;
};

const Simulation = () => {
  const rX = math.unit("0.1 m");
  const rY = math.unit("0.1 m");
  const limbL = math.unit("0.1 m");
  const shoulderOffsetTheta = math.unit(45, "deg");
  const retractionTheta = math.unit(0, "deg"); //in degrees, from straight out
  const adductionTheta = math.unit(0, "deg"); //in degrees, from horizontal
  const grfTheta = math.unit(0, "deg"); //deg
  const zoom = 1000;

  //constants and units
  const gravity = math.gravity;
  const tissueDensity = math.unit("997 kg / m^3");
  const newtonPixScale = 10; //1 Newton equals 10 pixels
  const specificTension = math.unit("200 kPa"); //200 kPa (https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4968477/) = 200000 N m^2
  const aspectRatio = math.divide(rX, rY);
  const xSectionA = math.multiply(math.pi, rX, rY);
  const circleEquivalentR = math.sqrt(math.divide(xSectionA, math.pi));
  const volume = math.multiply(xSectionA, circleEquivalentR);
  const mass = math.multiply(tissueDensity, volume);
  const weight = math.multiply(mass, gravity);
  const grfY = math.divide(weight, -4);
  const grfX = math.multiply(grfY, math.tan(grfTheta));
  const grf = [grfX, grfY];

  // conversions
  const rXpx = rX.toNumber("mm");
  const rYpx = rY.toNumber("mm");
  const limbLpx = limbL.toNumber("mm");

  // positioning
  const zero = { x: zoom / 2, y: zoom / 2 };
  const shoulder = {
    x: zero.x + rXpx * math.cos(shoulderOffsetTheta),
    y: zero.y + rYpx * math.sin(shoulderOffsetTheta),
    ghostX: zero.x - rXpx * math.cos(shoulderOffsetTheta)
  };
  const elbow = {
    x:
      shoulder.x +
      limbLpx * math.cos(adductionTheta) * math.cos(retractionTheta),
    y: shoulder.y + limbLpx * math.sin(adductionTheta),
    ghostX:
      shoulder.ghostX -
      limbLpx * math.cos(adductionTheta) * math.cos(retractionTheta)
  };
  const wrist = {
    x: elbow.x,
    y: elbow.y + limbLpx,
    ghostX: elbow.ghostX
  };

  // get moment arm
  const unitGRF = unitVec(grf);
  const wristPos = [wrist.x, wrist.y];
  const shoulderPos = [shoulder.x, shoulder.y];
  const aMinusP = math.subtract(wristPos, shoulderPos);
  const aMinusPDotN = math.dot(aMinusP, unitGRF);
  const aMinusPDotNTimesN = math.multiply(aMinusPDotN, unitGRF);
  const momentArm = math.subtract(aMinusP, aMinusPDotNTimesN);
  const moment = math.unit(
    math.norm(
      math.cross(
        [momentArm[0], momentArm[1], 0],
        [grf[0].value, grf[1].value, 0]
      )
    ),
    "N*m"
  );
  const momentArmM = math.unit(math.norm(momentArm), "mm");

  return (
    <div sx={{ height: "100vh", width: "100vw" }}>
      <svg viewBox={`0 0 ${zoom} ${zoom}`}>
        <defs>
          <marker
            id="arrowHeadOrange"
            viewBox="0 0 10 10"
            refX="1"
            refY="5"
            markerUnits="strokeWidth"
            markerWidth="4"
            markerHeight="5"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="orange" />
          </marker>
          <marker
            id="arrowHeadGreen"
            viewBox="0 0 10 10"
            refX="1"
            refY="5"
            markerUnits="strokeWidth"
            markerWidth="4"
            markerHeight="5"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="green" />
          </marker>
        </defs>
        <Torso zero={zero} rXpx={rXpx} rYpx={rYpx} />
        <LiveLimb
          shoulder={shoulder}
          elbow={elbow}
          wrist={wrist}
          limbL={limbL}
        />
        <GhostLimb shoulder={shoulder} elbow={elbow} wrist={wrist} />
        <Forces
          shoulder={shoulder}
          elbow={elbow}
          wrist={wrist}
          grf={grf}
          moment={moment}
          momentArm={momentArmM}
        />
        <Labels
          zero={zero}
          shoulder={shoulder}
          elbow={elbow}
          wrist={wrist}
          rX={rX}
          rY={rY}
          mass={mass}
          limbL={limbL}
          adductionTheta={adductionTheta}
        />
      </svg>
    </div>
  );
};

const Forces = ({ shoulder, elbow, wrist, grf, moment, momentArm }) => {
  const grfMag = magnitude(grf);
  const x1 = wrist.x;
  const y1 = wrist.y;
  const x2 = wrist.x + grf[0].toNumeric("dN");
  const y2 = wrist.y + grf[1].toNumeric("dN");
  return (
    <>
      <line
        x1={`${shoulder.x}`}
        y1={`${shoulder.y}`}
        x2={`${elbow.x}`}
        y2={`${shoulder.y}`}
        stroke="red"
        strokeWidth="2"
        strokeDasharray="3,2"
      />
      <text
        x={`${(shoulder.x + wrist.x) / 2}`}
        y={shoulder.y * 0.98}
        fill="red"
        textAnchor="middle"
      >
        {momentArm.format({ notation: "fixed", precision: 2 })}
      </text>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        markerEnd="url(#arrowHeadOrange)"
        stroke="orange"
        strokeWidth="3"
      />
      <text x={`${wrist.x * 1.02}`} y={wrist.y} fill="orange">
        {grfMag.format({ notation: "fixed", precision: 2 })}
      </text>
      <path
        d={`M ${shoulder.x + 20} ${shoulder.y} a 20 20 0 0 1 -40 0
           a 20 20 0 0 1 20 -20`}
        markerEnd="url(#arrowHeadGreen)"
        stroke="green"
        strokeWidth="3"
        fill="none"
      />
      <text
        x={`${shoulder.x - 25}`}
        y={`${shoulder.y + 25}`}
        fill="green"
        textAnchor="end"
      >
        {moment.format({ notation: "fixed", precision: 2 })}
      </text>
    </>
  );
};

const Labels = ({
  zero,
  shoulder,
  elbow,
  wrist,
  rX,
  rY,
  mass,
  limbL,
  adductionTheta
}) => {
  return (
    <>
      <text
        x={`${zero.x}`}
        y={`${zero.y + rY.toNumeric("mm") / 2}`}
        textAnchor="middle"
      >
        {mass.format({ notation: "fixed", precision: 2 })}
      </text>
      <text
        x={`${zero.x + rX.toNumeric("mm") / 2}`}
        y={`${zero.y * 0.98}`}
        textAnchor="middle"
      >
        {rX.value} m
      </text>
      <text
        x={`${zero.x * 1.02}`}
        y={`${zero.y - rY.toNumeric("mm") / 2}`}
        textAnchor="start"
      >
        {rY.value} m
      </text>
      <text
        x={`${elbow.x * 1.02}`}
        y={`${elbow.y + limbL.toNumeric("mm") / 2}`}
        textAnchor="start"
      >
        {limbL.value} m
      </text>
    </>
  );
};

const Torso = ({ zero, rXpx, rYpx }) => {
  return (
    <>
      <ellipse
        cx={`${zero.x}`}
        cy={`${zero.y}`}
        rx={`${rXpx}`}
        ry={`${rYpx}`}
        fill="pink"
      />
      <circle cx={`${zero.x}`} cy={`${zero.y}`} r="5" fill="black" />
      <line
        x1={`${zero.x}`}
        y1={`${zero.y}`}
        x2={`${zero.x + rXpx}`}
        y2={`${zero.y}`}
        stroke="black"
        strokeWidth="1"
        strokeDasharray="3,5"
      />
      <line
        x1={`${zero.x}`}
        y1={`${zero.y}`}
        x2={`${zero.x}`}
        y2={`${zero.y - rYpx}`}
        stroke="black"
        strokeWidth="1"
        strokeDasharray="3,5"
      />
    </>
  );
};

const GhostLimb = ({ shoulder, elbow, wrist }) => {
  return (
    <>
      <line
        x1={`${shoulder.ghostX}`}
        y1={`${shoulder.y}`}
        x2={`${elbow.ghostX}`}
        y2={`${elbow.y}`}
        stroke="#EAEAEA"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <line
        x1={`${elbow.ghostX}`}
        y1={`${elbow.y}`}
        x2={`${wrist.ghostX}`}
        y2={`${wrist.y}`}
        stroke="#EAEAEA"
        strokeWidth="10"
        strokeLinecap="round"
      />
    </>
  );
};

const LiveLimb = ({ shoulder, elbow, wrist, limbL }) => {
  return (
    <>
      <line
        x1={`${shoulder.x}`}
        y1={`${shoulder.y}`}
        x2={`${elbow.x}`}
        y2={`${elbow.y}`}
        stroke="black"
        strokeWidth="10"
      />
      <line
        x1={`${elbow.x}`}
        y1={`${elbow.y}`}
        x2={`${wrist.x}`}
        y2={`${wrist.y}`}
        stroke="black"
        strokeWidth="10"
      />
      <circle
        cx={`${shoulder.x}`}
        cy={`${shoulder.y}`}
        r="8"
        stroke="black"
        strokeWidth="2"
        fill="white"
      />
      <circle cx={`${shoulder.x}`} cy={`${shoulder.y}`} r="4" fill="black" />
      <circle
        cx={`${elbow.x}`}
        cy={`${elbow.y}`}
        r="8"
        stroke="black"
        strokeWidth="2"
        fill="white"
      />
      <circle cx={`${elbow.x}`} cy={`${elbow.y}`} r="4" fill="black" />
      <circle cx={`${wrist.x}`} cy={`${wrist.y}`} r="5" fill="black" />
    </>
  );
};

export default Simulation;

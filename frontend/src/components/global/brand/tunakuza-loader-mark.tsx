import { cn } from "@/lib/global/class-names";

type TunakuzaLoaderMarkProps = {
  className?: string;
};

function TunakuzaLoaderMark({ className }: TunakuzaLoaderMarkProps) {
  return (
    <svg
      aria-hidden="true"
      className={cn("tunakuza-loader-mark", className)}
      focusable="false"
      viewBox="50 85 110 122"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g transform="matrix(0.76993374,0,0,0.76993374,29.853609,56.92057)">
        <path
          className="tunakuza-loader-section tunakuza-loader-blue"
          d="m 103.96312,98.906234 v 91.973006 a 63.124462,76.217551 0 0 0 54.68128,-75.53256 l -0.002,-0.39841 a 63.124462,76.217551 0 0 0 -1.48483,-16.042036 z"
          fill="#1565c0"
        />
        <path
          className="tunakuza-loader-section tunakuza-loader-green"
          d="m 33.94536,98.5599 a 63.124462,76.217551 0 0 0 -1.549739,16.98581 63.124462,76.217551 0 0 0 55.525145,75.46415 V 98.906234 Z"
          fill="#2e7d32"
        />
        <path
          className="tunakuza-loader-section tunakuza-loader-red"
          d="M 95.00125,44.285376 A 63.124462,67.711673 0 0 0 35.661028,89.64848 H 154.83589 A 63.124462,67.711673 0 0 0 95.00125,44.285376 Z"
          fill="#e53935"
        />
      </g>
    </svg>
  );
}

export { TunakuzaLoaderMark };
export type { TunakuzaLoaderMarkProps };

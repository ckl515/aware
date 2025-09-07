import { useEffect } from "react";
import DropdownCard from "../components/DropdownCard";
import Badge from "../components/NumberBadge";
import Button from "../components/Button";
import type { AxeResults } from "axe-core";

interface Props {
  onRunAxe: () => void;
  axeResults: AxeResults;
}

const ResultsPage = ({ onRunAxe, axeResults }: Props) => {
  const popUpIcon = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="size-4 fill-white"
    >
      <path
        fillRule="evenodd"
        d="M4.755 10.059a7.5 7.5 0 0 1 12.548-3.364l1.903 1.903h-3.183a.75.75 0 1 0 0 1.5h4.992a.75.75 0 0 0 .75-.75V4.356a.75.75 0 0 0-1.5 0v3.18l-1.9-1.9A9 9 0 0 0 3.306 9.67a.75.75 0 1 0 1.45.388Zm15.408 3.352a.75.75 0 0 0-.919.53 7.5 7.5 0 0 1-12.548 3.364l-1.902-1.903h3.183a.75.75 0 0 0 0-1.5H2.984a.75.75 0 0 0-.75.75v4.992a.75.75 0 0 0 1.5 0v-3.18l1.9 1.9a9 9 0 0 0 15.059-4.035.75.75 0 0 0-.53-.918Z"
        clipRule="evenodd"
      />
    </svg>
  );

  useEffect(() => {
    document.body.classList.add("bg-slate-100");

    return () => {
      document.body.classList.remove("bg-slate-100");
    };
  });

  const numViolations: number =
    axeResults?.violations?.reduce(
      (sum, violation) => sum + (violation?.nodes?.length ?? 0),
      0
    ) ?? 0;

  return (
    <div className="flex justify-center items-center mt-10">
      <div className="flex flex-col gap-10 justify-items-center-safe justify-center min-w-xs w-9/10 max-w-lg">
        <div className="flex flex-row gap-5">
          <div className="flex-none">
            <Badge number={numViolations} />
          </div>
          <div className="flex flex-col justify-center gap-3">
            <h1 className="text-sm select-none">
              <span className="font-bold">
                {numViolations} accessibility-related issues
              </span>
              {" have been detected within this webpage."}
            </h1>
            <div className="flex flex-row">
              <Button
                colour="bg-red-800"
                hoverColour="hover:bg-red-600"
                icon={popUpIcon}
                text="Re-run Test"
                textColour="text-white"
                onClick={onRunAxe}
              />
            </div>
          </div>
        </div>
        <div className="overflow-auto flex flex-col gap-2 pb-5">
          {axeResults?.violations.map((violation) => {
            return violation.nodes.map((node, index) => (
              <DropdownCard
                key={`${violation.id}-${index}`}
                heading={violation.help}
                description={violation.description}
                helpUrl={violation.helpUrl}
                nodeViolation={node}
                llmOutput="in progress"
              />
            ));
          })}
        </div>
      </div>
    </div>
  );
};

export default ResultsPage;

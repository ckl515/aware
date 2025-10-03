import Button from "../components/Button";

interface Props {
  onRunAxe: () => void;
  onTestMode: () => void;
}

const FrontPage = ({ onRunAxe, onTestMode }: Props) => {
  return (
    <div className="flex flex-col gap-4 p-4">
      <Button
        colour={"bg-sky-700"}
        hoverColour={"hover:bg-sky-500"}
        text={"Run Test"}
        textColour={"text-white"}
        onClick={onRunAxe}
      />
      <Button
        colour={"bg-orange-600"}
        hoverColour={"hover:bg-orange-400"}
        text={"Test Mode (Demo Violations)"}
        textColour={"text-white"}
        onClick={onTestMode}
      />
    </div>
  );
};

export default FrontPage;

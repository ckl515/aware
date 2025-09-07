import Button from "../components/Button";

interface Props {
  onRunAxe: () => void;
}

const FrontPage = ({ onRunAxe }: Props) => {
  return (
    <Button
      colour={"bg-sky-700"}
      hoverColour={"hover:bg-sky-500"}
      text={"Run Test"}
      textColour={"text-white"}
      onClick={onRunAxe}
    />
  );
};

export default FrontPage;

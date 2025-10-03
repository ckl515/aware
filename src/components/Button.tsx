import type { ReactNode } from "react";

interface Props {
  colour: string;
  hoverColour: string;
  icon?: ReactNode;
  text: string;
  textColour: string;
  onClick: () => void;
}

function Button({
  colour,
  hoverColour,
  icon,
  text,
  textColour,
  onClick,
}: Props) {
  return (
    <button
      className={`${colour} transition-all duration-100 ${hoverColour} p-2 pl-3 pr-3 text-sm rounded-sm flex flex-row gap-2 items-center cursor-pointer`}
      onClick={onClick}
    >
      {icon}
      <p className={`${textColour} font-bold`}>{text}</p>
    </button>
  );
}

export default Button;

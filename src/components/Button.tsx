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
      className={`${colour} transition-all duration-200 ${hoverColour} py-3 px-4 text-sm rounded-lg flex flex-row gap-2 items-center justify-center cursor-pointer w-full font-semibold shadow-sm hover:shadow-md`}
      onClick={onClick}
    >
      {icon}
      <p className={`${textColour}`}>{text}</p>
    </button>
  );
}

export default Button;

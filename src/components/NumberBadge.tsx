interface Props {
  number: number;
}

function NumberBadge({ number }: Props) {
  return (
    <div className="w-30 h-30 rounded-full bg-red-600 place-content-center-safe select-none">
      <p className="text-white font-bold text-5xl flex justify-center">
        {number > 99 ? (
          <>
            <div className="flex items-center gap-1/2">
              99 <span className="text-3xl">+</span>
            </div>
          </>
        ) : (
          number
        )}
      </p>
    </div>
  );
}

export default NumberBadge;

interface Props {
  step: string;
}

function Step({ step }: Props) {

  return (
      <div>
         <input type="checkbox" checked /> {step}
      </div>
  );
}

export default Step;

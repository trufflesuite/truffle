interface Props {
  name: string;
  completed: boolean;
}

function Step({ name, completed }: Props) {

  return (
      <div>
         <input type="checkbox" checked={completed} /> {name}
      </div>
  );
}

export default Step;

interface Parameters {
  name: string;
  internalType: string;
  type: string;
}

interface Props {
  parameters: Parameters[];
  functionParams: string[];
  setFunctionParameters: any;
}

function TextField({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: any;
}) {
  return (
    <label className="block">
      <span>{label}</span>
      <input
        value={value || ""}
        type="text"
        className="block px-4 py-3  w-2/4 max-w-4xl focus:outline-truffle-brown focus:ring-truffle-brown focus:border-truffle-brown"
        onChange={onChange}
      ></input>
    </label>
  );
}

function ContractMethodParams({
  parameters,
  functionParams,
  setFunctionParameters
}: Props) {
  function handleParameterChange(index: number) {
    return (e: any) => {
      const value = e.target.value;

      setFunctionParameters(value, index);
    };
  }
  return (
    <div>
      {parameters.map((param, index) => {
        return (
          <TextField
            key={index}
            label={param.name}
            value={functionParams[index]}
            //@ts-ignore
            onChange={handleParameterChange(index)}
          />
        );
      })}
    </div>
  );
}

export default ContractMethodParams;

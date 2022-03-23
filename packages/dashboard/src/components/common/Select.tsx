interface Props {
  onChange: any;
  label: string;
  options: string[];
}

function Select({ onChange, label, options }: Props) {
  return (
    <label className="block">
      <span>{label}</span>
      <select
        className="form-select block px-4 py-3 w-1/4 max-w-4xl focus:outline-truffle-brown focus:ring-truffle-brown focus:border-truffle-brown"
        onChange={onChange}
      >
        {options.map((option, index) => {
          return (
            <option value={option} key={index}>
              {option}
            </option>
          );
        })}
      </select>
    </label>
  );
}

export default Select;

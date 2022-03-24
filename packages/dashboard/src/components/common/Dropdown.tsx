import type { ReactNode } from "react";

interface Props {
    networkOne?: string | ReactNode;
    networkTwo?: string | ReactNode;
    networkThree?: string | ReactNode;

}

function Dropdown({ networkOne, networkTwo, networkThree }: Props) {

    const networkOneOrNull = networkOne && (
        <option value="networkOne">{networkOne}</option>
    );
    const networkTwoOrNull = networkTwo && (
        <option value="networkTwo">{networkTwo}</option>
    );
    const networkThreeOrNull = networkTwo && (
        <option value="networkThree">{networkThree}</option>
    );

    return (
        <div className="border-grey border rounded bg-white" style={{ paddingLeft: "10px" }}>
                <div className="block">
                <select className="form-select block px-4 py-3 w-1/4 max-w-4xl focus:outline-truffle-brown focus:ring-truffle-brown focus:border-truffle-brown">
                    {networkOneOrNull}
                    {networkTwoOrNull}
                    {networkThreeOrNull}
                </select>
                </div>
        </div>
    );
}

export default Dropdown;

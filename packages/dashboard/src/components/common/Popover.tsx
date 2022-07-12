import { Popover } from "@headlessui/react";
import SettingsIcon from "./SettingsIcon";
import AnalyticsToggle from "./AnalyticsToggle";

export default function SettingsPopover() {
  return (
    <Popover>
      <Popover.Button className="absolute bottom-2 right-2">
        {" "}
        <SettingsIcon analyticsSet={false} />
      </Popover.Button>
      <Popover.Overlay className="bg-black opacity-30 fixed inset-0" />
      <Popover.Panel className="absolute z-10 bottom-14 right-2 mb-2">
        <div className="bg-truffle-light border-2 mb-4 block z-50 font-normal leading-normal text-lg max-w-xs no-underline break-words rounded-lg">
          <div className="bg-truffle-blue border-2 text-center text-truffle-brown font-semibold p-3 mb-2 uppercase rounded-t-lg">
            Help Improve Truffle!
          </div>
          <div className="bg-truffle-light text-truffle-brown m-2">
            You can help us improve Truffle by allowing us to track how you use
            our tools. Would you like to allow tracking? You can always return
            to this menu if you change your mind. View the Truffle Analytics
            Policy <a href="https://trufflesuite.com/analytics/">here.</a>
            <AnalyticsToggle />
          </div>
        </div>
      </Popover.Panel>
    </Popover>
  );
}

import { MdSettings } from "react-icons/md";
// import PopoverRender from "./SettingsPopover";
interface Props {
  analyticsSet: boolean;
  // onClick: typeof PopoverRender;
}

function SettingsIcon({ analyticsSet }: Props) {
  return (
    <div>
      <button className="absolute bottom-2 right-2"><MdSettings size={56} />
        {!analyticsSet &&
          (
            <span id="settings-button" className="animate-pulse absolute bg-red-600 h-4 w-4 rounded-full -top-0 -right-0" />
          )}
      </button>
    </div>
  );
}

export default SettingsIcon;

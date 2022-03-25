import { Switch } from '@headlessui/react';
import { useState } from 'react';

export default function AnalyticsToggle() {
  const [enabled, setEnabled] = useState(false);

  return (
    <Switch.Group>
      <div className="flex justify-center mt-4">
        <span className="pr-3 float-left">Disabled</span>
        <Switch
          checked={enabled}
          onChange={setEnabled}
          className={`${enabled ? 'bg-truffle-blue' : 'bg-truffle-brown'
            } relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-truffle-blue`}
        >
          <span
            className={`${enabled ? 'translate-x-6' : 'translate-x-1'
              } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
          />
        </Switch>
        <span className="pl-3 float-right">Enabled</span>
      </div>
    </Switch.Group>
  );
}

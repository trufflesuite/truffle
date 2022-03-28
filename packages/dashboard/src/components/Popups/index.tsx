import {FC} from 'react';

import PopupItem from './PopupItem';
import {useActivePopups} from "src/state/popups/hooks";

const Popups: FC = () => {
  const activePopups = useActivePopups();
  if (activePopups.length === 0) return <span/>;

  return (
    <>
      <div
        className={'hidden md:block fixed top-20 right-6 max-w-4/12 z-30 flex flex-col'}
      >
        {activePopups.map((item) => (
          <PopupItem key={item.key} content={item.content} popKey={item.key} removeAfterMs={item.removeAfterMs}/>
        ))}
      </div>
      <div className="fixed md:hidden left-4 right-4 top-88 fit-content mb-[20px]">
        <div
          className="h-[99%] overflow-x-auto overflow-y-hidden flex flex-col gap-4"
          style={{WebkitOverflowScrolling: 'touch'}}
        >
          {activePopups // reverse so new items up front
            .slice(0)
            .reverse()
            // @ts-ignore TYPE NEEDS FIXING
            .map((item) => (
              <PopupItem key={item.key} content={item.content} popKey={item.key} removeAfterMs={item.removeAfterMs}/>
            ))}
        </div>
      </div>
    </>
  );
};

export default Popups;

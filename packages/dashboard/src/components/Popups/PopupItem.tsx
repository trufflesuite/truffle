import {XIcon} from '@heroicons/react/outline';
import {useCallback, useEffect} from 'react';
import {useRemovePopup} from "src/context/popups/hooks";
import {PopupContent} from "src/context/popups/types";
import TransactionPopup from './TransactionPopup';

const AnimatedFader = ({duration}: { duration: number }) => (
  <div className="h-1 bg-white w-full bg-opacity-40">
    <style jsx>{`
      .animation {
        animation-duration: ${duration}ms;
        animation-name: fader;
        animation-timing-function: linear;
        animation-fill-mode: forwards;
      }
      @keyframes fader {
        from {
          width: 100%;
        }

        to {
          width: 0%;
        }
      }
    `}</style>
    <div className="animation h-1 bg-truffle-blue"/>
  </div>
);

export default function PopupItem({
                                    removeAfterMs,
                                    content,
                                    popKey,
                                  }: {
  removeAfterMs: number | null
  content: PopupContent
  popKey: string
}) {
  console.log("Got popup", {removeAfterMs, content, popKey});
  const removePopup = useRemovePopup();
  const removeThisPopup = useCallback(() => removePopup(popKey), [popKey, removePopup]);
  useEffect(() => {
    if (removeAfterMs === null) return undefined;

    const timeout = setTimeout(() => {
      removeThisPopup();
    }, removeAfterMs);

    return () => {
      clearTimeout(timeout);
    };
  }, [removeAfterMs, removeThisPopup]);

  let popupContent;
  if ('txn' in content) {
    const {
      txn: {hash, success, summary},
    } = content;
    popupContent = <TransactionPopup hash={hash} success={success} summary={summary}/>;
  }

  return (
    <div className="mb-4">
      <div className="relative w-full overflow-hidden rounded bg-dark-700 bg-opacity-90">
        <div className="flex flex-row p-4">
          {popupContent}
          <div className="cursor-pointer hover:text-white">
            <XIcon width={24} height={24} onClick={removeThisPopup}/>
          </div>
        </div>
        {removeAfterMs !== null ? <AnimatedFader duration={removeAfterMs}/> : null}
      </div>
    </div>
  );
}

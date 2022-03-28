// get the list of active popups
import { PopupList } from "./types";
import { useCallback, useMemo } from "react";

export function useActivePopups(): PopupList {
  const list: PopupList = [
    // {
    //   key: "1",
    //   show: true,
    //   content: {
    //     txn: {
    //       hash: "somehash",
    //       success: true,
    //       summary: "you rippah!"
    //     }
    //   },
    //   removeAfterMs: 4000
    // },
    // {
    //   key: "2",
    //   show: true,
    //   content: {
    //     txn: {
    //       hash: "failz",
    //       success: false,
    //       summary: "gutted cuz..."
    //     }
    //   },
    //   removeAfterMs: 4000
    // }
  ];

  return useMemo(() => list.filter(item => item.show), [list]);
}

export function useRemovePopup(): (key: string) => void {
  // const dispatch = useDispatch()
  return useCallback((key: string) => {
    console.log("removePopup", { key });
    // dispatch(removePopup({ key }))
  }, []);
}

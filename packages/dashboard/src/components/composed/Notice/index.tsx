import { Center } from "@mantine/core";
import Loading from "src/components/composed/Notice/content/Loading";
import Connect from "src/components/composed/Notice/content/Connect";
import ConfirmChain from "src/components/composed/Notice/content/ConfirmChain";
import type noticeContentType from "src/components/composed/Notice/noticeContentType";

type NoticeProps = {
  contentType: noticeContentType;
};

function Notice({ contentType }: NoticeProps): JSX.Element {
  let content: JSX.Element;
  switch (contentType) {
    case "LOADING":
      content = <Loading />;
      break;
    case "CONNECT":
      content = <Connect />;
      break;
    case "CONFIRM_CHAIN":
      content = <ConfirmChain />;
      break;
    default:
      content = <div>Undefined notice</div>;
      break;
  }

  return (
    <Center pb="xl" sx={{ height: "100%" }}>
      {content}
    </Center>
  );
}

export default Notice;

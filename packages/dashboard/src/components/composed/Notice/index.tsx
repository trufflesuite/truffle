import { Center } from "@mantine/core";
import Loading from "src/components/composed/Notice/content/Loading";
import Connect from "src/components/composed/Notice/content/Connect";
import type noticeContentType from "src/components/composed/Notice/noticeContentType";

type NoticeProps = {
  contentType: noticeContentType;
};

function Notice({ contentType }: NoticeProps): JSX.Element {
  const content =
    contentType === "LOADING" ? (
      <Loading />
    ) : contentType === "CONNECT" ? (
      <Connect />
    ) : contentType === "CONFIRM_SWITCH" ? (
      <div>Are you sure?</div>
    ) : (
      <div>Notice</div>
    );

  return (
    <Center pb="xl" sx={{ height: "100%" }}>
      {content}
    </Center>
  );
}

export default Notice;

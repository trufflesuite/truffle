import {
  Stack,
  Anchor,
  Space,
  createStyles,
  Accordion,
  Switch,
  Grid
} from "@mantine/core";
import { ExternalLink } from "react-feather";
import { useDash } from "src/hooks";
import { useState, useEffect } from "react";
import { analyticsNotifications } from "src/utils/notifications";
import { showNotification } from "@mantine/notifications";

const useStyles = createStyles((_theme, _params, _getRef) => ({
  maxSize: {
    width: "100%",
    height: "100%"
  },
  docsAnchor: {
    display: "inline-flex",
    alignItems: "center"
  }
}));

function Analytics(): JSX.Element {
  const {
    state: { analyticsConfig },
    operations: { updateAnalyticsConfig }
  } = useDash()!;
  const analyticsValue = analyticsConfig.enableAnalytics ? true : false;

  const [checked, setChecked] = useState(analyticsValue);

  const { classes } = useStyles();

  useEffect(() => {
    setChecked(analyticsConfig.enableAnalytics ? true : false);
  }, [analyticsConfig]);
  return (
    <Stack>
      <Accordion radius="md" defaultValue="Telemetry">
        <Accordion.Item value="telemetry">
          <Accordion.Control>Telemetry</Accordion.Control>

          <Grid grow>
            <Grid.Col span={8}>
              <Accordion.Panel>
                You can help us improve Truffle by allowing us to track how you
                use our tools. Would you like to share anonymous telemetry? View
                the Truffle Analytics policy&nbsp;
                <Anchor
                  href="https://trufflesuite.com/analytics/"
                  target="_blank"
                  color="truffle-beige"
                  inherit
                  className={classes.docsAnchor}
                >
                  here
                  <Space w={3} />
                  <ExternalLink size={12} />
                </Anchor>
              </Accordion.Panel>
            </Grid.Col>
            <Grid.Col span={1}>
              <Accordion.Panel>
                <Switch
                  size="lg"
                  onLabel="YES"
                  offLabel="NO"
                  checked={checked}
                  onChange={async event => {
                    setChecked(event.currentTarget.checked);
                    updateAnalyticsConfig(event.currentTarget.checked);
                    if (event.currentTarget.checked) {
                      showNotification(analyticsNotifications["thank"]());
                    }
                  }}
                />
              </Accordion.Panel>
            </Grid.Col>
          </Grid>
        </Accordion.Item>
      </Accordion>
    </Stack>
  );
}

export default Analytics;

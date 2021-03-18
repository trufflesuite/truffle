import { tests } from "./buckets.fixture";
import { preserveToBucketsWithEvents } from "./utils/preserve";

jest.setTimeout(200000);

// There's no local test environment for buckets, so this test can be run on
// production only
describe.skip("preserve", () => {
  for (const { name, target, events } of tests) {
    it(`${name}: should emit the correct events`, async () => {
      const environment = {
        key: "BUCKET_KEY",
        secret: "BUCKET_SECRET",
        bucketName: "TEST_BUCKET",
      };

      const emittedEvents = await preserveToBucketsWithEvents(target, environment);

      expect(emittedEvents).toEqual(events);
    });
  }
});

import * as Preserve from "@truffle/preserve";

export interface Test {
  name: string;
  target: Preserve.Targets.Stringified.Target;
  events: (Preserve.Control.Event & any)[];
}

export const tests: Test[] = [
  {
    name: "nested-directories",
    target: {
      source: {
        entries: [
          {
            path: "a",
            source: {
              entries: [
                {
                  path: "a",
                  source: "a/a"
                },
                {
                  path: "b",
                  source: "a/b"
                }
              ]
            }
          },
          {
            path: "b",
            source: "b"
          }
        ]
      }
    },
    events: [
      { type: 'begin', scope: [ '@truffle/preserve-to-buckets' ] },
      {
        type: 'log',
        message: 'Preserving to Textile Buckets...',
        scope: [ '@truffle/preserve-to-buckets' ]
      },
      {
        type: 'step',
        message: 'Connecting to Textile Bucket with name TEST_BUCKET...',
        scope: [
          '@truffle/preserve-to-buckets',
          'Connecting to Textile Bucket with name TEST_BUCKET...'
        ]
      },
      {
        type: 'succeed',
        result: expect.any(String),
        message: expect.any(String),
        scope: [
          '@truffle/preserve-to-buckets',
          'Connecting to Textile Bucket with name TEST_BUCKET...'
        ]
      },
      {
        type: 'step',
        message: 'Clearing existing bucket contents...',
        scope: [
          '@truffle/preserve-to-buckets',
          'Clearing existing bucket contents...'
        ]
      },
      {
        type: 'succeed',
        scope: [
          '@truffle/preserve-to-buckets',
          'Clearing existing bucket contents...'
        ]
      },
      {
        type: 'step',
        message: 'Uploading...',
        scope: [ '@truffle/preserve-to-buckets', 'Uploading...' ]
      },
      {
        type: 'declare',
        message: 'Root CID',
        scope: [ '@truffle/preserve-to-buckets', 'Uploading...', 'Root CID' ]
      },
      {
        type: 'declare',
        message: 'a/a',
        scope: [
          '@truffle/preserve-to-buckets',
          'Uploading...',
          'Root CID',
          'a/a'
        ]
      },
      {
        type: 'declare',
        message: 'a/b',
        scope: [
          '@truffle/preserve-to-buckets',
          'Uploading...',
          'Root CID',
          'a/b'
        ]
      },
      {
        type: 'declare',
        message: 'b',
        scope: [ '@truffle/preserve-to-buckets', 'Uploading...', 'Root CID', 'b' ]
      },
      {
        type: 'resolve',
        resolution: { cid: expect.any(Object) },
        payload: 'bafkreiabms4clc7g2np6gghxxxjiqc36q3w7foorqkaehjesxesaboe6ba',
        scope: [
          '@truffle/preserve-to-buckets',
          'Uploading...',
          'Root CID',
          'a/a'
        ]
      },
      {
        type: 'resolve',
        resolution: { cid: expect.any(Object) },
        payload: 'bafkreigbjto4am7wjoo6vahkm5opfafacxtheulascswez4bcu64nd7kce',
        scope: [
          '@truffle/preserve-to-buckets',
          'Uploading...',
          'Root CID',
          'a/b'
        ]
      },
      {
        type: 'resolve',
        resolution: { cid: expect.any(Object) },
        payload: 'bafkreib6epubmabzlffdhckpmvsodmjuro6xuaei2qwevs3t52xnlhaatu',
        scope: [ '@truffle/preserve-to-buckets', 'Uploading...', 'Root CID', 'b' ]
      },
      {
        type: 'resolve',
        resolution: { cid: expect.any(Object) },
        payload: 'bafk7kb4ek445xrlpxvw2stnns67ejzveedyiojmm7hkrdodugmwxsvy',
        scope: [ '@truffle/preserve-to-buckets', 'Uploading...', 'Root CID' ]
      },
      {
        type: 'succeed',
        scope: [ '@truffle/preserve-to-buckets', 'Uploading...' ]
      },
      {
        type: 'succeed',
        result: { "ipfs-cid": expect.any(Object) },
        scope: [ '@truffle/preserve-to-buckets' ]
      }
    ]
  }
];

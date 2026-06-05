// Minimal ambient declarations for the untyped ephemeris vendors. The Alkhemia
// source treats the horoscope objects as `any`; we preserve that contract here
// so the engine ports cleanly without pulling UI-side type shims.
declare module 'circular-natal-horoscope-js/dist/index.js' {
  // CommonJS module — consumed via default import + destructure under NodeNext.
  const lib: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Origin: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Horoscope: any
  }
  export default lib
}

declare module 'tz-lookup' {
  const tzLookup: (latitude: number, longitude: number) => string
  export default tzLookup
}

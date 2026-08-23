import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.justintime.app",
  appName: "Just In Time",
  webDir: "dist",
  server: {
    // Both platforms default to different local schemes (capacitor://localhost
    // on iOS, https://localhost on Android). Pinning both to the same
    // https://localhost origin matters mainly for Google Sign-In: that's the
    // origin you register in Google Cloud Console as an authorized JS origin.
    androidScheme: "https",
    iosScheme: "https",
    hostname: "localhost",

    // Uncomment during development to live-reload from your Vite dev server
    // instead of the last `npm run build` output — point it at your machine's
    // LAN IP (not localhost/127.0.0.1, which means "the device itself" from
    // inside the emulator/phone), matching whatever `npm run dev` prints.
    // url: "http://192.168.1.23:5173",
    // cleartext: true, // only needed for plain http:// during dev
  },
};

export default config;
